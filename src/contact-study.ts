import * as THREE from 'three';
import {CONTACT_DIMENSIONS,PARKING_POSITIONS,ROOM} from './space.js';
import type {Layout,Component} from './space.js';
import type {Rect,Point} from './model.js';

export interface ContactBox extends Rect {base:number;height:number}
export interface ContactTarget {
  id:string;name:string;componentId:string;inward:'north'|'south'|'east'|'west';front:Point;
  volume:ContactBox;surfaceMin?:number;surfaceMax:number;
}
export interface ContactCheck extends ContactTarget {
  clear:boolean;surfaceHeight:number;surfaceWithinTarget:boolean;
  collisions:string[];parts:{name:string;bounds:ContactBox;projection:{cross:number;depth:number;width:number;depthSize:number;base:number;height:number}}[];
}

export function contactTargets(layout:Layout):ContactTarget[]{
  const {width,depth,tableClearHeight,basinClearHeight}=CONTACT_DIMENSIONS;
  const get=(id:string)=>{const c=layout.components.find(c=>c.id===id);if(!c)throw new Error(`缺少接触节点 ${id}`);return c;};
  const floor=(c:Component)=>layout.platform&&c.y<ROOM.platformDepth?ROOM.platformHeight:0;
  const window=get('window-desk'),counter=get('low-counter'),sink=get('sink'),table=get('shared-table');
  const targets:ContactTarget[]=[
    {id:'window',name:'临窗桌',componentId:window.id,inward:'north',front:{x:PARKING_POSITIONS[0].x,y:window.y+window.h},volume:{x:PARKING_POSITIONS[0].x-width/2,y:window.y+window.h-depth,w:width,h:depth,base:floor(window),height:tableClearHeight},surfaceMin:700,surfaceMax:850},
    {id:'service',name:'借阅服务台',componentId:counter.id,inward:'south',front:{x:counter.x+counter.w/2,y:counter.y},volume:{x:counter.x+(counter.w-width)/2,y:counter.y,w:width,h:depth,base:0,height:tableClearHeight},surfaceMin:700,surfaceMax:850},
  ];
  if(table.kind==='table')for(const east of [false,true]){
    const x=east?table.x+table.w:table.x;
    targets.push({id:east?'table-east':'table-west',name:east?'共享桌东端':'共享桌西端',componentId:table.id,inward:east?'west':'east',front:{x,y:table.y+table.h/2},volume:{x:east?x-depth:x,y:table.y+(table.h-width)/2,w:depth,h:width,base:0,height:tableClearHeight},surfaceMin:700,surfaceMax:850});
  }
  const west=sink.facing==='west';
  targets.push({id:'wash',name:'洗手台',componentId:sink.id,inward:west?'east':'north',front:{x:west?sink.x:sink.x+sink.w/2,y:west?sink.y+sink.h/2:sink.y+sink.h},volume:west?{x:sink.x,y:sink.y+(sink.h-width)/2,w:depth,h:width,base:0,height:basinClearHeight}:{x:sink.x+(sink.w-width)/2,y:sink.y+sink.h-depth,w:width,h:depth,base:0,height:basinClearHeight},surfaceMax:800});
  return targets;
}

/** Check the rendered meshes, including neighbouring objects, rather than their intent labels. */
export function inspectContacts(layout:Layout,model:THREE.Object3D):ContactCheck[]{
  model.updateMatrixWorld(true);
  const meshes:{name:string;box:THREE.Box3;componentId?:string}[]=[];
  model.traverse(o=>{if(!(o instanceof THREE.Mesh))return;let parent:THREE.Object3D|null=o;while(parent&&!parent.userData.component)parent=parent.parent;
    meshes.push({name:o.name,box:new THREE.Box3().setFromObject(o),componentId:parent?.userData.component as string|undefined});
  });
  const epsilon=1e-6;
  return contactTargets(layout).map(target=>{
    const v=target.volume,volume=new THREE.Box3(new THREE.Vector3(v.x/1000,v.base/1000,v.y/1000),new THREE.Vector3((v.x+v.w)/1000,(v.base+v.height)/1000,(v.y+v.h)/1000));
    const collisions=meshes.filter(({box:b})=>Math.min(b.max.x,volume.max.x)-Math.max(b.min.x,volume.min.x)>epsilon&&Math.min(b.max.y,volume.max.y)-Math.max(b.min.y,volume.min.y)>epsilon&&Math.min(b.max.z,volume.max.z)-Math.max(b.min.z,volume.min.z)>epsilon).map(m=>m.name);
    const parts=meshes.filter(m=>m.componentId===target.componentId).map(({name,box:b})=>{
      const bounds={x:b.min.x*1000,y:b.min.z*1000,w:(b.max.x-b.min.x)*1000,h:(b.max.z-b.min.z)*1000,base:b.min.y*1000,height:(b.max.y-b.min.y)*1000};
      const acrossY=target.inward==='east'||target.inward==='west';
      const depth=target.inward==='east'?bounds.x-target.front.x:target.inward==='west'?target.front.x-bounds.x-bounds.w:target.inward==='north'?target.front.y-bounds.y-bounds.h:bounds.y-target.front.y;
      return {name,bounds,projection:{cross:acrossY?bounds.y-target.front.y:bounds.x-target.front.x,width:acrossY?bounds.h:bounds.w,depth,depthSize:acrossY?bounds.w:bounds.h,base:bounds.base-v.base,height:bounds.height}};
    });
    const topParts=parts.filter(p=>['Tabletop','Countertop','Basin counter','Basin inset','Basin rim'].includes(p.name));
    if(!topParts.length)throw new Error(`缺少实际台面 ${target.componentId}`);
    const surfaceHeight=Math.max(...topParts.map(p=>p.bounds.base+p.bounds.height))-v.base;
    return {...target,clear:collisions.length===0,surfaceHeight,surfaceWithinTarget:surfaceHeight<=target.surfaceMax+.001&&(target.surfaceMin===undefined||surfaceHeight>=target.surfaceMin-.001),collisions,parts};
  });
}
