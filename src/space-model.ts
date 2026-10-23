import * as THREE from 'three';
import {ROOM,MATERIALS,DETAILS,parkingRect,floorPanels} from './space.js';
import type {Layout,Component,Material} from './space.js';
import {lightParts} from './fixtures.js';
const unitBox=new THREE.BoxGeometry(1,1,1);
export function disposeSpace(group:THREE.Group){
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  group.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){if(o.geometry!==unitBox)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
export function makeSpace(layout:Layout,cutaway=false):THREE.Group{
  const group=new THREE.Group();group.name=`SecondPlan_${layout.scheme}_${layout.mode}`;
  group.userData={units:'metres',source:'src/space.ts',scheme:layout.scheme,mode:layout.mode,fictionalSite:true};
  const mats=new Map<string,THREE.MeshStandardMaterial>();
  function material(key:Material|'book',color?:string){const id=key+(color??'');let m=mats.get(id);if(!m){m=new THREE.MeshStandardMaterial({color:color??MATERIALS[key as Material]?.color??'#b6b29b',roughness:key==='metal'?.55:.86,metalness:key==='metal'?.25:0,transparent:key==='sheer',opacity:key==='sheer'?.52:1,side:key==='sheer'?THREE.DoubleSide:THREE.FrontSide});m.name=`Finish_${id}`;mats.set(id,m);}return m;}
  function box(parent:THREE.Object3D,name:string,x:number,y:number,w:number,d:number,height:number,base:number,mat:THREE.Material){
    const mesh=new THREE.Mesh(unitBox,mat);mesh.name=name;mesh.scale.set(w/1000,height/1000,d/1000);mesh.position.set((x+w/2)/1000,(base+height/2)/1000,(y+d/2)/1000);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function roundedPrism(w:number,d:number,thickness:number,radius:number){
    const width=w/1000,depth=d/1000,r=Math.min(radius,w/2,d/2)/1000,shape=new THREE.Shape();
    shape.moveTo(r,0);shape.lineTo(width-r,0);shape.absarc(width-r,r,r,-Math.PI/2,0,false);shape.lineTo(width,depth-r);shape.absarc(width-r,depth-r,r,0,Math.PI/2,false);shape.lineTo(r,depth);shape.absarc(r,depth-r,r,Math.PI/2,Math.PI,false);shape.lineTo(0,r);shape.absarc(r,r,r,Math.PI,Math.PI*1.5,false);
    return new THREE.ExtrudeGeometry(shape,{depth:thickness/1000,bevelEnabled:false,curveSegments:12});
  }
  function roundedBox(parent:THREE.Object3D,name:string,x:number,y:number,w:number,d:number,height:number,base:number,radius:number,mat:THREE.Material){
    if(radius<=0)return box(parent,name,x,y,w,d,height,base,mat);
    const geometry=roundedPrism(w,d,height,radius);geometry.rotateX(-Math.PI/2);
    const mesh=new THREE.Mesh(geometry,mat);mesh.name=name;mesh.position.set(x/1000,base/1000,(y+d)/1000);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  box(group,'Floor slab',-ROOM.wall,-ROOM.wall,ROOM.width+ROOM.wall*2,ROOM.depth+ROOM.wall*2,ROOM.floorSlab,-ROOM.floorSlab-ROOM.floorFinish,material('stone'));
  for(const [i,r] of floorPanels(layout).entries())box(group,`Floor finish panel ${i}`,r.x,r.y,r.w,r.h,ROOM.floorFinish,-ROOM.floorFinish,material('stone'));
  if(!cutaway)box(group,'Ceiling - hide for interior inspection',-200,-200,15400,12400,120,3200,material('plaster'));
  // A cutaway is an explicitly labelled display operation; exported models use full heights.
  for(const c of layout.components){
    const node=new THREE.Group();node.name=c.id;node.userData={component:c.id,name:c.name,dimensionsMm:[c.w,c.h,c.height]};group.add(node);
    if(cutaway&&['baffle','light','mirror'].includes(c.kind))continue;
    const mat=material(c.material),cutHeight=cutaway&&['wall','partition','curtain'].includes(c.kind)?Math.min(c.height,1450-c.base):c.height;
    if(cutHeight<=0&&cutaway)continue;
    const lift=layout.platform&&c.y<ROOM.platformDepth?ROOM.platformHeight:0;
    const top=c.base+lift;
    if(['wall','column','beam'].includes(c.kind)){
      box(node,c.name,c.x,c.y,c.w,c.h,cutHeight,c.base,mat);
      if(cutaway&&c.height>cutHeight)box(node,'Section cap',c.x,c.y,c.w,c.h,15,cutHeight+c.base,material('clay','#857a68'));
    }else if(c.kind==='partition'){
      const glazing=new THREE.MeshStandardMaterial({color:MATERIALS.glass.color,transparent:true,opacity:.22,roughness:.12,metalness:0,side:THREE.DoubleSide,depthWrite:false});
      glazing.name='Glazing_internal';
      const pane=box(node,'Acoustic boundary glazing - product to be verified',c.x,c.y+(c.h-12)/2,c.w,12,cutHeight,c.base,glazing);pane.castShadow=false;
      const frame=material('oak');
      for(const yy of [c.base,c.base+cutHeight-40])box(node,'Glazing horizontal frame',c.x,c.y,c.w,c.h,40,yy,frame);
      const bays=Math.ceil(c.w/1350);for(let i=0;i<=bays;i++)box(node,'Glazing vertical frame',c.x+(c.w-40)*i/bays,c.y,40,c.h,cutHeight,c.base,frame);
    }else if(c.kind==='light'){
      const lit=new THREE.MeshStandardMaterial({color:'#fff4d9',emissive:'#fff1cc',emissiveIntensity:3});lit.name='Luminaire_emission';
      for(const p of lightParts(c))box(node,p.name,p.x,p.y,p.w,p.h,p.height,p.base,p.role==='diffuser'?lit:mat);
      const point=new THREE.PointLight('#fff1d7',18,7,2);point.position.set((c.x+c.w/2)/1000,(c.base+DETAILS.lightRecess-2)/1000,(c.y+c.h/2)/1000);node.add(point);
    }else if(c.kind==='mirror'){
      const finish=new THREE.MeshStandardMaterial({color:'#c6c9bc',metalness:1,roughness:.08});finish.name='Mirror_polished';box(node,'Mirror surface',c.x,c.y,c.w,c.h,c.height,c.base,finish);
    }else if(c.kind==='rail'){
      const radius=DETAILS.grabDiameter/2;
      const tube=(name:string,a:[number,number,number],b:[number,number,number])=>{const start=new THREE.Vector3(a[0]/1000,a[2]/1000,a[1]/1000),end=new THREE.Vector3(b[0]/1000,b[2]/1000,b[1]/1000),delta=end.clone().sub(start);
        const pipe=new THREE.Mesh(new THREE.CylinderGeometry(radius/1000,radius/1000,delta.length(),16),mat);pipe.name=name;pipe.position.copy(start).add(end).multiplyScalar(.5);pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());pipe.castShadow=true;node.add(pipe);
        for(const point of [start,end]){const cap=new THREE.Mesh(new THREE.SphereGeometry(radius/1000,12,8),mat);cap.name='Rounded grab rail joint';cap.position.copy(point);node.add(cap);}
      };
      const x=c.x+(c.railForm==='fold-up'?c.w/2:radius),z=c.railForm==='fold-up'?c.base+c.height/2:c.base+radius;
      if(c.railForm==='fold-up'){
        tube('Fold-up rail horizontal arm',[x,c.y+radius,z],[x,c.y+c.h-40,z]);
        box(node,'Hinge mounting plate - product to be verified',c.x,c.y+c.h-40,c.w,40,c.height,c.base,mat);
      }else{
        tube('L rail horizontal arm',[x,c.y+radius,z],[x,c.y+c.h-radius,z]);
        tube('L rail vertical arm',[x,c.y+radius,z],[x,c.y+radius,c.base+c.height-radius]);
        for(const [y,height] of [[c.y+radius,c.base+c.height-30],[c.y+c.h-45,z]] as const)tube('Rail wall standoff',[x,y,height],[c.x+c.w-radius,y,height]);
        box(node,'Upper wall mounting plate',c.x+c.w-35,c.y,35,90,100,c.base+c.height-100,mat);
        box(node,'Lower wall mounting plate',c.x+c.w-35,c.y+c.h-90,35,90,70,c.base,mat);
      }
    }else if(c.kind==='wc'){
      const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.27,.19,.40,32),mat);bowl.scale.z=1.15;bowl.position.set((c.x+c.w/2)/1000,.23,(c.y+330)/1000);node.add(bowl);
      box(node,'Cistern',c.x+40,c.y+c.h-180,c.w-80,160,650,0,mat);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.215,.010,8,32),material('plaster','#f5f2e8'));ring.rotation.x=Math.PI/2;ring.scale.y=1.15;ring.position.set((c.x+c.w/2)/1000,.44,(c.y+330)/1000);node.add(ring);
    }else if(c.kind==='sink'){
      const west=c.facing==='west',width=west?c.h:c.w,depth=west?c.w:c.h;
      const sinkBox=(name:string,u:number,v:number,w:number,d:number,h:number,z:number,m:THREE.Material)=>box(node,name,c.x+(west?v:u),c.y+(west?u:c.h-v-d),west?d:w,west?w:d,h,z,m);
      // A real opening in the slab keeps the basin recessed without coplanar faces.
      for(const [u,v,w,d] of [[0,0,150,depth],[width-150,0,150,depth],[150,0,width-300,80],[150,depth-80,width-300,80]])sinkBox('Basin counter',u!,v!,w!,d!,60,740,mat);
      if(c.openBelow)for(const u of [50,width-75])sinkBox('Recessed basin bracket',u,depth-60,25,60,100,640,material('metal'));
      else sinkBox('Basin cabinet',50,50,width-100,depth-100,680,40,material('oak'));
      const ceramic=material('plaster','#f6f5ec');
      sinkBox('Basin inset',150,80,width-300,depth-160,14,686,ceramic);
      for(const [u,v,w,d] of [[150,80,20,depth-160],[width-170,80,20,depth-160],[170,80,width-340,20],[170,depth-100,width-340,20]])sinkBox('Basin rim',u!,v!,w!,d!,100,700,ceramic);
      sinkBox('Tap stem',width/2-15,depth-50,30,30,180,800,material('metal'));sinkBox('Tap spout',width/2-15,depth-180,30,140,25,955,material('metal'));
    }else if(c.kind==='table'){
      roundedBox(node,'Tabletop',c.x,c.y,c.w,c.h,30,top+c.height-30,c.cornerRadius??0,mat);
      for(const y of c.h>=500?[70,c.h-100]:[70])box(node,'Underframe',c.x+70,c.y+y,c.w-140,30,30,top+c.height-60,material('metal'));
      const legs=c.id==='window-desk'?[200,2600,3800,6400,8800,10000]:c.w<1000?[50,c.w-100]:[500,c.w-550];
      if(c.id==='shared-table')for(const x of legs)box(node,'Transverse frame',c.x+x,c.y+70,55,c.h-140,30,top+c.height-60,material('metal'));
      for(const x of legs)for(const y of c.h<500?[40,c.h-95]:[120,c.h-175])box(node,'Leg',c.x+x,c.y+y,55,55,c.height-30,top,material('metal'));
    }else if(c.kind==='folded'){
      const panel=new THREE.Mesh(roundedPrism(c.w,c.height,30,c.cornerRadius??0),mat);panel.name='Folded tabletop';panel.position.set(c.x/1000,top/1000,(c.y+180)/1000);panel.castShadow=true;panel.receiveShadow=true;node.add(panel);
      for(const x of [300,c.w-350])box(node,'Folding base',c.x+x,c.y,50,c.h,80,top,material('metal'));
    }else if(c.kind==='chair'){
      const child=c.height<700,seat=child?320:450,leg=child?32:40;
      roundedBox(node,'Seat',c.x,c.y,c.w,c.h,65,top+seat-65,55,mat);
      const side=c.facing==='east'||c.facing==='west',back=new THREE.Mesh(roundedPrism((side?c.h:c.w)-60,c.height-seat,40,40),mat);back.name='Back';
      if(side){back.rotation.y=Math.PI/2;back.position.set((c.x+(c.facing==='west'?c.w-40:0))/1000,(top+seat)/1000,(c.y+c.h-30)/1000);}
      else back.position.set((c.x+30)/1000,(top+seat)/1000,(c.y+(c.facing==='south'?0:c.h-40))/1000);
      back.castShadow=true;back.receiveShadow=true;node.add(back);
      for(const x of [40,c.w-40-leg])for(const y of [40,c.h-40-leg])box(node,'Chair leg',c.x+x,c.y+y,leg,leg,seat-65,top,material('oak'));
      if(c.w>=700)for(const edge of [35,(side?c.h:c.w)-70]){
        roundedBox(node,'Armrest',c.x+(side?50:edge),c.y+(side?edge:50),side?c.w-100:35,side?35:c.h-100,30,top+seat+180,12,material('oak'));
        box(node,'Arm support',c.x+(side?100:edge),c.y+(side?edge:100),35,35,180,top+seat,material('oak'));
      }
    }else if(c.kind==='bench'){
      const count=c.seats??2,gap=14,width=(c.w-80-gap*(count-1))/count;
      for(let i=0;i<count;i++){
        const x=c.x+40+i*(width+gap);roundedBox(node,'Bench cushion',x,c.y+25,width,c.h-125,100,top+350,45,mat);
        const back=new THREE.Mesh(roundedPrism(width,c.height-525,70,40),mat);back.name='Bench back cushion';back.position.set(x/1000,(top+450)/1000,(c.y+c.h-90)/1000);back.castShadow=true;node.add(back);
      }
      box(node,'Bench back rail',c.x+40,c.y+c.h-90,c.w-80,70,60,top+c.height-60,material('oak'));
      for(const x of [40,c.w-80]){box(node,'Armrest',c.x+x,c.y,40,c.h,55,top+620,material('oak'));box(node,'Bench support',c.x+x,c.y+100,40,c.h-200,350,top,material('oak'));}
    }else if(c.kind==='shelf'){
      const vertical=c.h>c.w,length=Math.max(c.w,c.h),depth=Math.min(c.w,c.h),doubleSided=c.height<=1200;
      const localBox=(name:string,x:number,y:number,w:number,d:number,h:number,z:number,m:THREE.Material)=>box(node,name,c.x+(vertical?y:x),c.y+(vertical?x:y),vertical?d:w,vertical?w:d,h,z,m);
      for(const x of [0,length-35])localBox('Shelf end',x,0,35,depth,c.height,top,mat);
      localBox('Shelf spine',0,doubleSided?depth/2-12:depth-25,length,25,c.height,top,mat);
      const levels=Math.max(2,Math.floor(c.height/360));
      for(let level=0;level<levels;level++){
        const yy=top+80+level*(c.height-120)/levels;localBox('Shelf board',0,0,length,depth,25,yy,mat);
        for(let i=0;i<Math.min(70,Math.floor((length-100)/95));i++){
          const colors=['#b9af92','#7e8e7b','#c0b7aa','#a27960','#d2cbb8'];
          for(const side of doubleSided?[30,depth/2+25]:[45])localBox('Book',65+i*95,side,40+(i%3)*12,doubleSided?depth/2-60:depth-100,180+(i%4)*20,yy+25,material('book',colors[(i+level)%colors.length]));
        }
      }
    }else if(c.kind==='counter'){
      roundedBox(node,'Countertop',c.x,c.y,c.w,c.h,30,top+c.height-30,c.cornerRadius??0,mat);
      if(c.openBelow)for(const x of [0,c.w-40])box(node,'Open low counter side',c.x+x,c.y+70,40,c.h-70,c.height-60,top,mat);
      else {box(node,'Counter front',c.x,c.y+20,c.w,40,c.height-30,top,mat);box(node,'Cabinet carcass',c.x+30,c.y+40,c.w-60,c.h-60,c.height-80,top+40,mat);}
    }else if(c.kind==='curtain'){
      const positions:number[]=[],indices:number[]=[],segments=64;
      for(let j=0;j<2;j++)for(let i=0;i<=segments;i++){const t=i/segments;positions.push((c.x+c.w/2+Math.sin(t*Math.PI*16)*c.w/2)/1000,(c.base+j*cutHeight)/1000,(c.y+t*c.h)/1000);}
      for(let i=0;i<segments;i++){const a=i,b=i+1,d=i+segments+1,e=d+1;indices.push(a,d,b,b,d,e);}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
      const mesh=new THREE.Mesh(geometry,mat);mesh.name='Sheer side-light filter - illustrative';mesh.castShadow=false;mesh.receiveShadow=true;node.add(mesh);
    }else if(c.kind==='book'){
      roundedBox(node,'Book lower cover',c.x,c.y,c.w,c.h,2,top,c.cornerRadius??0,mat);
      roundedBox(node,'Book pages',c.x+3,c.y+3,c.w-6,c.h-6,c.height-4,top+2,c.cornerRadius??0,material('plaster','#ebe6d8'));
      roundedBox(node,'Book upper cover',c.x,c.y,c.w,c.h,2,top+c.height-2,c.cornerRadius??0,mat);
    }else if(c.kind==='rug'){box(node,'Flush floor finish',c.x,c.y,c.w,c.h,c.height,c.base,mat);}
    else box(node,c.name,c.x,c.y,c.w,c.h,c.height,top,mat);
  }
  if(layout.platform)box(group,'Existing nonstructural platform',0,0,15000,3600,180,0,material('oak'));
  const glass=new THREE.MeshStandardMaterial({color:'#b6c9c4',transparent:true,opacity:.17,roughness:.25,depthWrite:false,side:THREE.DoubleSide});
  glass.name='Glazing_external';
  for(let i=0;i<5;i++){
    const x=300+i*3000;box(group,'North glazing',x,-90,2700,30,cutaway?550:1700,900,glass);
    box(group,'North mullion',x,-110,45,65,cutaway?550:1700,900,material('metal'));
  }
  for(let i=0;i<4;i++){
    const y=350+i*2900;box(group,'West glazing',-90,y,30,2550,cutaway?550:1700,900,glass);
    box(group,'West mullion',-110,y,65,45,cutaway?550:1700,900,material('metal'));
  }
  // Datum markers show the three integrated parking positions without claiming human trials.
  if(cutaway)for(const p of layout.reserved){const r=parkingRect(p),outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(r.w/1000,.008,r.h/1000)),new THREE.LineBasicMaterial({color:'#a97955',transparent:true,opacity:.65}));outline.position.set(p.x/1000,.025,p.y/1000);outline.name=`Reserved position ${p.facing} 900x1200`;group.add(outline);}
  const figureMat=material('linen','#777f72');
  function figure(x:number,z:number,height:number,seated=false){
    const g=new THREE.Group();g.name='Scale reference - not observed user';g.position.set(x/1000,layout.platform&&z<3600?.18:0,z/1000);
    const scale=height/1650,seat=seated?(height<1400?.32:.45):0,hip=seated?seat:.75*scale;
    const torsoHeight=.6*scale;
    const torso=new THREE.Mesh(new THREE.CylinderGeometry(.16*scale,.14*scale,torsoHeight,9),figureMat);torso.position.y=hip+torsoHeight/2;torso.castShadow=true;g.add(torso);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.055*scale,.055*scale,.08*scale,8),figureMat);neck.position.y=hip+torsoHeight+.04*scale;g.add(neck);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.11*scale,12,8),material('linen','#c6b9a3'));head.position.y=hip+torsoHeight+.19*scale;head.castShadow=true;g.add(head);
    for(const xx of [-.09,.09]){const legLength=seated?seat:.75*scale;const leg=new THREE.Mesh(new THREE.CylinderGeometry(.045*scale,.035*scale,legLength,7),figureMat);leg.position.set(xx*scale,legLength/2,0);g.add(leg);}
    group.add(g);
  }
  figure(8100,9400,1650);figure(1350,7750,1650,true);figure(1600,6500,1050,true);
  if(layout.scheme==='proposed'){
    figure(5600,1800,1650,true);
    const chair=new THREE.Group();chair.position.set(5.6,0,1.8);chair.name='Wheelchair scale reference - no kinematic model';
    box(chair,'Reference seat',-240,-200,480,480,60,390,material('linen','#888f7e'));
    box(chair,'Reference back',-240,240,480,50,400,450,material('linen','#888f7e'));
    for(const x of [-.33,.33]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.30,.30,.035,20),material('metal'));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.31,.10);chair.add(wheel);}
    group.add(chair);
  }
  return group;
}
