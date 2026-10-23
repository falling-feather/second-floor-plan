import * as THREE from 'three';
import {createLayout,destinationPoint,withOccupiedParking,COMPANION_LEDGE,EDGE_RADII,SHARED_TABLE,DETAILS} from './space.ts';
import type {Layout,DesignNode,DestinationId} from './space.ts';
import type {Point} from './model.ts';
import {spaceRoute} from './space-analysis.ts';

export interface HeightPoint extends Point {height:number}
export const FAMILY_SIGHTLINE={
  from:{x:8100,y:9400,height:1550},to:{x:1600,y:6500,height:850},
  note:'公共厅至亲子角的假设观察线。眼高为设计样本，不代表所有人；可见联系不替代近距离照护。',
} as const;
export function sightline(layout:Layout,from:HeightPoint,to:HeightPoint){
  const origin=new THREE.Vector3(from.x,from.height,from.y),end=new THREE.Vector3(to.x,to.height,to.y),direction=end.clone().sub(origin),length=direction.length();
  if(length===0)throw new Error('视线两点不能重合');
  const ray=new THREE.Ray(origin,direction.normalize());
  const hits=layout.components.filter(c=>c.solid&&c.material!=='glass').flatMap(c=>{
    const box=new THREE.Box3(new THREE.Vector3(c.x,c.base,c.y),new THREE.Vector3(c.x+c.w,c.base+c.height,c.y+c.h));
    const p=ray.intersectBox(box,new THREE.Vector3());if(!p)return[];
    const distance=origin.distanceTo(p);return distance>1e-5&&distance<length-1e-5?[{id:c.id,name:c.name,distance,point:{x:p.x,y:p.z,height:p.y}}]:[];
  }).sort((a,b)=>a.distance-b.distance);
  return {from,to,clear:hits.length===0,hits,length};
}
export function sightlineStudy(){const {from,to,note}=FAMILY_SIGHTLINE;return {note,before:sightline(createLayout('existing'),from,to),after:sightline(createLayout(),from,to)};}
export function companionStudy(){
  const after=createLayout(),before={...after,components:after.components.filter(c=>!['family-ledge','family-book'].includes(c.id))},point=destinationPoint(after,'family');
  return {point,addedEnvelopeArea:COMPANION_LEDGE.w*COMPANION_LEDGE.h/1e6,before:{layout:before,route:spaceRoute(withOccupiedParking(before,point),point,900)},after:{layout:after,route:spaceRoute(withOccupiedParking(after,point),point,900)},note:'增加的0.30㎡为托台包围范围。未增加席位或承诺无障碍工作位；到达结果仍为离散圆形包络模型。'};
}

type SceneCamera={kind:'perspective';position:readonly [number,number,number];target:readonly [number,number,number];fov:number}|{kind:'orthographic';position:readonly [number,number,number];target:readonly [number,number,number];verticalSpan:number;minHorizontalSpan:number;renderHeight:number};
export interface LivingScene {id:'quiet'|'family'|'shared'|'service';label:string;title:string;action:string;judgment:string;node:DesignNode;destination:DestinationId;camera:SceneCamera}
/** Camera coordinates use metres; physical components and analysis remain in millimetres. */
export const LIVING_SCENES:readonly LivingScene[]=[
  {id:'quiet',label:'临窗静读',title:'在窗边读完一页',action:'选择安静阅读，同时保留与公共厅的可见联系。',judgment:'可闭合玻璃界面与局部侧光过滤是环境意向，隔声和眩光性能尚未计算。',node:'quiet',destination:'window',camera:{kind:'perspective',position:[12,1.55,2.65],target:[4.7,1.15,1.1],fov:51}},
  {id:'family',label:'亲子陪伴',title:'陪孩子，也能放下自己的书',action:`${DETAILS.childTableHeight}mm儿童桌旁，陪伴座椅接出${COMPANION_LEDGE.height}mm手边托台。`,judgment:'增加0.30㎡托台包围范围，保留席位与通路；照护仍在近处进行。',node:'shelf',destination:'family',camera:{kind:'perspective',position:[4.3,1.55,9.6],target:[1.85,.95,6.2],fov:55}},
  {id:'shared',label:'并肩共读',title:'同桌停靠，旁人仍能经过',action:'沿同一木质桌边共读，停靠位置退出主通行带。',judgment:`R${EDGE_RADII.shared}端角保留${SHARED_TABLE.h-EDGE_RADII.shared*2}mm端部直边；退入的钢框与桌脚另核台下体积，未验证产品荷载。`,node:'table',destination:'table',camera:{kind:'perspective',position:[6.8,1.55,7.6],target:[8.9,1.1,5.2],fov:48}},
  {id:'service',label:'借阅服务',title:'坐姿与站姿共享服务界面',action:'740mm低位台与900mm站立段相邻，台下保持开放。',judgment:'台前到达与容膝容脚目标分开检查；局部正视图不代表真实器具适配。',node:'service',destination:'service',camera:{kind:'orthographic',position:[8.95,.675,9.85],target:[8.95,.675,10.4],verticalSpan:1.35,minHorizontalSpan:3,renderHeight:640}},
];
