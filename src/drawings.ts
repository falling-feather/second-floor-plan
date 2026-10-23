import {ROOM,ZONES,MATERIALS,DETAILS,CONTACT_DIMENSIONS,INTERVENTIONS,parkingRect,destinationPoint} from './space.js';
import type {Layout,Component} from './space.js';
import type {SpaceRoute} from './space-analysis.js';
import type {ContactCheck} from './contact-study.js';
import {lightParts} from './fixtures.js';
import {sightlineStudy,companionStudy} from './living-study.js';
const ink='#353b34',muted='#7c8273',accent='#a96340';
const text=(x:number,y:number,value:string,size=220,color=ink,anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${value}</text>`;
const rect=(x:number,y:number,w:number,h:number,fill:string,stroke='none',sw=12,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const line=(x:number,y:number,xx:number,yy:number,color=ink,sw=12,dash='')=>`<path d="M${x} ${y}L${xx} ${yy}" stroke="${color}" stroke-width="${sw}" fill="none" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
function dim(x:number,y:number,xx:number,yy:number,label:string,vertical=false){return `<g>${line(x,y,xx,yy,'#959c8d',10)}${vertical?line(x-70,y,x+70,y,'#959c8d',10)+line(xx-70,yy,xx+70,yy,'#959c8d',10):line(x,y-70,x,y+70,'#959c8d',10)+line(xx,yy-70,xx,yy+70,'#959c8d',10)}${vertical?`<text transform="translate(${x-170} ${(y+yy)/2}) rotate(-90)" text-anchor="middle" font-size="180" fill="#858e7b">${label}</text>`:text((x+xx)/2,y-100,label,180,'#858e7b','middle')}</g>`;}
export function planBody(layout:Layout,route?:SpaceRoute,zones=false,pins=false){
  let s=rect(0,0,ROOM.width,ROOM.depth,'#f5f2e9','#747b6a',28);
  if(zones)for(const z of ZONES)s+=rect(z.x,z.y,z.w,z.h,z.color);
  if(layout.platform)s+=rect(0,0,ROOM.width,ROOM.platformDepth,'#ded2b7')+line(0,3600,15000,3600,accent,24,'95 55')+text(12000,3450,'原地台 +180',200,accent);
  for(const c of layout.components){
    if(c.kind==='beam'||c.base>=2000)continue;
    if(c.kind==='rail'){
      const d=DETAILS.grabDiameter,x=c.x+(c.railForm==='fold-up'?c.w/2:d/2);
      s+=`<g data-component="${c.id}">${line(x,c.y+d/2,x,c.y+c.h-d/2,ink,d)}`;
      if(c.railForm==='lshape')for(const y of [c.y+d/2,c.y+c.h-45])s+=line(x,y,c.x+c.w-d/2,y,ink,d);
      else s+=rect(c.x,c.y+c.h-40,c.w,40,'#737e69');
      s+='</g>';continue;
    }
    const color=c.kind==='column'?ink:c.kind==='wall'?(c.height>1200?'#646b5d':'#bbc3b3'):c.kind==='partition'?'#cddbd3':c.kind==='envelope'?'#dcc4ad':c.kind==='rug'?'#c5ceb9':c.kind==='shelf'?'#c9b99c':'#fdfbf5';
    s+=`<g data-component="${c.id}">${rect(c.x,c.y,c.w,c.h,color,c.kind==='rug'?'#a4af93':'#8a907e',c.kind==='wall'?5:13,c.kind==='chair'?55:['table','counter','book'].includes(c.kind)?c.cornerRadius??0:0)}`;
    if(c.kind==='shelf')for(let i=1;i<Math.floor(c.w/450);i++)s+=line(c.x+i*450,c.y,c.x+i*450,c.y+c.h,'#a59576',8);
    if(c.kind==='table'||c.kind==='counter')s+=rect(c.x+40,c.y+40,c.w-80,c.h-80,'none','#b9b29e',8,Math.max(0,(c.cornerRadius??0)-40));
    if(c.kind==='bench')s+=line(c.x,c.y+c.h-110,c.x+c.w,c.y+c.h-110,'#b6af97',35);
    if(c.kind==='chair'){const side=c.facing==='east'||c.facing==='west';s+=side?line(c.x+(c.facing==='east'?70:c.w-70),c.y+40,c.x+(c.facing==='east'?70:c.w-70),c.y+c.h-40,'#939b88',30):line(c.x+40,c.y+(c.facing==='south'?70:c.h-70),c.x+c.w-40,c.y+(c.facing==='south'?70:c.h-70),'#939b88',30);}
    if(c.kind==='envelope')s+=text(c.x+c.w/2,c.y+c.h/2+50,'占用假设',150,accent,'middle');
    s+='</g>';
  }
  const d0=9200-layout.doorWidth/2,d1=9200+layout.doorWidth/2;
  s+=`<path d="M11500 ${d0}A${layout.doorWidth} ${layout.doorWidth} 0 0 0 ${11500-layout.doorWidth} ${d1}" fill="none" stroke="#87917d" stroke-width="10" stroke-dasharray="55 40"/>`;
  for(const p of layout.reserved){const r=parkingRect(p),dx=p.facing==='east'?1:p.facing==='west'?-1:0,dy=p.facing==='north'?-1:0;
    s+=`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#b76b3d" fill-opacity="0.03" stroke="${accent}" stroke-width="15" stroke-dasharray="90 55"/>`;
    s+=line(p.x-dx*100,p.y-dy*100,p.x+dx*330,p.y+dy*330,accent,15)+line(p.x+dx*330,p.y+dy*330,p.x+dx*200-dy*90,p.y+dy*200+dx*90,accent,15)+line(p.x+dx*330,p.y+dy*330,p.x+dx*200+dy*90,p.y+dy*200-dx*90,accent,15);
  }
  if(layout.components.some(c=>c.id==='quiet-screen-west'))s+=dim(4850,4000,6350,4000,'1 500')+text(10600,4050,'可闭合静读界面',185,muted);
  if(layout.scheme==='proposed')s+=`<circle cx="12500" cy="9200" r="${DETAILS.turnDiameter/2}" fill="none" stroke="#9ba58a" stroke-width="14" stroke-dasharray="70 50"/>`;
  if(route&&route.path.length)s+=`<polyline points="${route.path.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="#fffdf6" stroke-width="95" stroke-linejoin="round"/><polyline points="${route.path.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${route.reached?'#526d59':accent}" stroke-width="42" stroke-linejoin="round"/><circle cx="${route.path.at(-1)!.x}" cy="${route.path.at(-1)!.y}" r="95" fill="#fffdf6" stroke="${route.reached?'#526d59':accent}" stroke-width="25"/>`;
  for(const [x,y,label] of [[7000,2750,'临窗阅读'],[2700,8600,'亲子共读'],[7700,8100,'共读 / 交流'],[13100,7700,'活动收纳'],[4550,11200,'入口 / 借阅 / 休息'],[13200,10150,'卫生间'],[13200,11500,'储藏']] as const)s+=text(x,y,label,205,'#69735f','middle');
  if(pins)for(const p of INTERVENTIONS){const point=p.id==='table'&&layout.scheme==='proposed'&&layout.mode==='reading'?destinationPoint(layout,'table'):p.point;s+=`<g class="plan-pin" data-pin="${p.id}" role="button" tabindex="0" aria-label="查看节点${p.number}：${p.title}"><circle cx="${point.x}" cy="${point.y}" r="235" fill="${accent}"/><text x="${point.x}" y="${point.y+80}" text-anchor="middle" font-size="230" fill="#fffaf0">${p.number}</text></g>`;}
  s+=line(ROOM.sectionX,-450,ROOM.sectionX,12450,'#9c6b4e',12,'140 70')+text(ROOM.sectionX+120,-500,'A',220,accent)+text(ROOM.sectionX+120,12700,'A',220,accent);
  s+=line(-300,ROOM.sectionY,15300,ROOM.sectionY,'#9c6b4e',10,'140 70')+text(-500,ROOM.sectionY-120,'B',220,accent)+text(15400,ROOM.sectionY-120,'B',220,accent);
  s+=dim(0,-600,15000,-600,'15 000')+dim(-600,0,-600,12000,'12 000',true);
  s+=line(14700,-1200,14700,-650,ink,16)+text(14700,-1350,'N',210,ink,'middle');
  s+=text(6000,12550,'主入口 1800',190,muted,'middle')+text(10400,12550,'次出口 1200',180,muted,'middle');
  return s;
}
const wrapper=(body:string,viewBox:string)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" font-family="Microsoft YaHei, sans-serif">${body}</svg>`;
export const planSVG=(layout:Layout,route?:SpaceRoute,zones=false,pins=false)=>wrapper(planBody(layout,route,zones,pins),'-1250 -1650 17500 15000');
export function sectionSVG(layout:Layout,axis:'aa'|'bb'='aa'){
  const aa=axis==='aa',length=aa?ROOM.depth:ROOM.width,cut=aa?ROOM.sectionX:ROOM.sectionY;
  let s=rect(0,0,length,3200,'#f3f0e7','#89917e',18)+rect(0,3200,length,180,'#b9b9ac');
  s+=line(0,0,length,0,ink,24)+line(0,3200,length,3200,ink,30);
  if(layout.platform&&aa)s+=rect(0,3020,3600,180,'#c4ac84');
  for(const c of layout.components){const a=aa?c.x:c.y,b=a+(aa?c.w:c.h);if(cut<a||cut>b||c.kind==='rug')continue;
    const u=aa?c.y:c.x,w=aa?c.h:c.w,lift=layout.platform&&c.y<ROOM.platformDepth?180:0;
    if(c.kind==='light'){
      for(const p of lightParts(c)){const pa=aa?p.x:p.y,pb=pa+(aa?p.w:p.h);if(cut<pa||cut>pb)continue;s+=rect(aa?p.y:p.x,3200-p.base-p.height,aa?p.h:p.w,p.height,p.role==='diffuser'?'#e7ca86':'#737c6a',ink,6);}
    }else if(c.kind==='table')s+=rect(u,3200-lift-c.height,w,30,'#bfa37b',ink,10)+rect(u+100,3200-lift-c.height+30,45,c.height-30,'#8b8f80');
    else if(c.kind==='counter'&&c.openBelow)s+=rect(u,3200-c.height,w,30,'#bfa37b',ink,10);
    else if(c.kind==='chair'){const seat=c.height<700?320:450;s+=rect(u,3200-lift-seat,w,65,'#b3ad98')+rect(u+w-55,3200-lift-c.height,55,c.height-seat,'#b3ad98');}
    else s+=rect(u,3200-lift-c.base-c.height,w,c.height,c.kind==='partition'?'#d4ded7':MATERIALS[c.material].color,ink,12);
  }
  s+=dim(-450,0,-450,3200,'顶面标高 3 200',true)+dim(0,3800,length,3800,aa?'12 000':'15 000');
  s+=text(0,-450,`${aa?'A—A':'B—B'} 剖面 · ${aa?'X':'Y'} = ${cut}mm`,240,ink)+text(0,4550,aa?'统一地坪 / 可闭合静读界面 / 共享桌 / 服务台':'框架柱至梁底 2900 / 梁顶与顶面 3200 / 顶面按梁柱分段',205,accent);
  return wrapper(s,`-1800 -1000 ${length+3500} 6200`);
}
export function ceilingSVG(layout:Layout){
  let s=rect(0,0,ROOM.width,ROOM.depth,'#f7f4eb','#737d6a',25);
  for(const c of layout.components.filter(c=>['wall','column','partition','beam','baffle','light'].includes(c.kind))){
    const fill=c.kind==='baffle'?'#d7cebb':c.kind==='light'?'#d6b16c':c.kind==='beam'?'#a2a79c':c.kind==='column'?'#59634f':'none';
    s+=rect(c.x,c.y,c.w,c.h,fill,'#8b9580',c.kind==='light'?20:12);
    if(c.kind==='baffle')s+=text(c.x+c.w/2,c.y+c.h/2,`板底 +${(c.base/1000).toFixed(2)}`,180,muted,'middle');
    if(c.kind==='light')s+=text(c.x+c.w/2,c.y+410,`灯底 +${(c.base/1000).toFixed(3)}`,170,accent,'middle');
  }
  s+=dim(0,-600,15000,-600,'15 000')+dim(-600,0,-600,12000,'12 000',true)+text(0,12800,'顶面与照明意向 / 未进行照度或声学性能计算',210,accent);
  return wrapper(s,'-1250 -1250 17500 15000');
}
export function serviceElevationSVG(layout:Layout){
  const counters=layout.components.filter(c=>c.kind==='counter'),left=Math.min(...counters.map(c=>c.x));let s=line(-200,1300,3000,1300,ink,12);
  for(const c of counters){const x=c.x-left;s+=rect(x,1300-c.height,c.w,30,'#bea078',ink,10);
    if(c.openBelow)for(const xx of [x,x+c.w-40])s+=rect(xx,1300-(c.height-60),40,c.height-60,'#b8a07c',ink,6);
    else s+=rect(x,1300-c.height+30,c.w,c.height-30,'#c2ab89',ink,9);
    s+=dim(x,1550,x+c.w,1550,String(c.w))+dim(x-140,1300-c.height,x-140,1300,String(c.height),true);
  }
  s+=text(0,-100,'借阅服务台立面意向',160,ink)+text(0,1870,`低位段下方保持开放 / 台下净高目标 ${DETAILS.tableClearHeight}`,115,accent);
  return wrapper(s,'-500 -350 3900 2500');
}
export function nodeSVG(layout:Layout){
  let s=text(40,45,'三个需要在空间中落实的节点',24)+text(40,80,'尺寸来自当前方案；下图为设计校核目标，不等于施工图或完整规范审查。',13,muted);
  s+=text(45,130,'A / 门口与回转',19,accent);
  s+=`<g transform="translate(-650 -370) scale(.065)">${layout.components.filter(c=>c.id.startsWith('wet-')||c.id==='wc-door-leaf'||c.kind==='sink'||c.kind==='wc').map(c=>rect(c.x,c.y,c.w,c.h,c.kind==='wall'?'#7c8473':'#e4e3d7',ink,16)).join('')}<circle cx="12500" cy="9200" r="750" fill="none" stroke="${accent}" stroke-width="20" stroke-dasharray="100 55"/></g>`;
  s+=text(45,325,'净开口 1100 · 向外开启',14)+text(45,350,'内部回转预留 Ø1500',14)+text(45,378,'门扇和内部预留分别检查',12,muted);
  s+=text(435,130,'B / 共同使用的桌端',19,accent);
  s+=rect(455,205,255,12,'#bca276',ink,1)+line(505,217,505,305,ink,4)+line(655,217,655,305,ink,4);
  s+=line(440,305,730,305,ink,1)+text(465,185,'桌面 740',13,muted)+text(530,270,'净高目标 680',13,accent)+text(435,350,'桌端 / 窗边预留 900×1200',14)+text(435,378,'以实际桌具与器具进一步验证',12,muted);
  s+=text(830,130,'C / 把高差退出来',19,accent);
  s+=rect(845,215,125,20,'#bea67e')+line(970,235,1100,235,ink,2)+text(845,190,'现状设定 +180',13,muted);
  s+=line(845,295,1100,295,accent,3)+text(845,328,'改造建议 ±0.000',14,accent)+text(830,378,'非承重木地台拆除，基层待核实',12,muted);
  return wrapper(s,'0 0 1200 440');
}

export function contactSVG(checks:ContactCheck[]){
  const chosen=['window','table-west','service','wash'].map(id=>checks.find(c=>c.id===id)).filter((c):c is ContactCheck=>!!c);
  const description=checks.map(c=>`${c.name}，台面${Math.round(c.surfaceHeight)}毫米，${c.clear?'目标净空内无构件':'台下有构件占用'}，${c.surfaceWithinTarget?'台面在目标范围':'台面超出目标范围'}`).join('；');
  let s=`<title>台下几何检查</title><desc>${description}。这些结果不是完整产品或规范验证。</desc>`+text(34,35,'台前到达之后，继续核对台下空间',25)+text(34,65,'线框来自实际模型构件投影；淡绿为台下目标体积。这里只检查图示几何。',14,muted);
  for(const [i,c] of chosen.entries()){
    const x=25+(i%2)*680,y=96+Math.floor(i/2)*355,scale=.16,ground=y+247,acrossY=c.inward==='east'||c.inward==='west',volumeWidth=acrossY?c.volume.h:c.volume.w,volumeDepth=acrossY?c.volume.w:c.volume.h;
    s+=`<g>`+rect(x,y,665,336,'#faf8ef','#d8ddce',1)+text(x+18,y+31,c.name,20,accent)+text(x+18,y+57,`可触台面 ${Math.round(c.surfaceHeight)}mm · ${c.clear?'目标净空内无构件':'台下有构件占用'}${c.surfaceWithinTarget?'':' · 台面超出目标范围'}`,13,c.clear&&c.surfaceWithinTarget?'#546e4f':accent);
    for(const side of [false,true]){
      const dx=x+(side?367:173),clip=`contact-${c.id}-${side?'s':'f'}`,left=side?dx-5:dx-118,width=side?236:240;
      s+=`<defs><clipPath id="${clip}">${rect(left,y+74,width,174,'white')}</clipPath></defs><g clip-path="url(#${clip})">`;
      for(const p of c.parts){const b=p.projection;if(side&&(b.cross>=volumeWidth/2||b.cross+b.width<=-volumeWidth/2))continue;const px=side?b.depth:b.cross,w=side?b.depthSize:b.width;s+=rect(dx+px*scale,ground-(b.base+b.height)*scale,w*scale,b.height*scale,'#e2ddcd','#7a8372',.8);}
      s+=`<rect x="${dx+(side?0:-volumeWidth/2)*scale}" y="${ground-c.volume.height*scale}" width="${(side?volumeDepth:volumeWidth)*scale}" height="${c.volume.height*scale}" fill="#b5c5ac" fill-opacity="0.28" stroke="#617b56" stroke-width="1.2" stroke-dasharray="5 3"/></g>`;
      s+=line(left,ground,left+width,ground,ink,1)+text(dx+(side?42:0),y+272,side?`进深目标 ${volumeDepth}`:`宽度目标 ${volumeWidth}`,13,muted,'middle');
      s+=text(side?dx:dx-75,y+291,side?`中间${volumeWidth}宽切片`:'正面局部投影',11,muted);
    }
    s+=text(x+18,y+317,`台下高度目标 ${c.volume.height}mm；未含人体动作、荷载及完整产品系统验证。`,12,muted)+'</g>';
  }
  s+=text(34,835,'借阅低位台与洗手盆：参考GB 55019-2021第3.6.4、3.1.10条的选读尺寸。共享桌沿用同一空间目标推敲。',13,muted)+text(34,860,`本图采用整块${CONTACT_DIMENSIONS.width}宽×${CONTACT_DIMENSIONS.depth}进深的目标体积，台下高度按图示目标检查；条文适用性及产品安装需进一步核对。`,13,muted);
  return wrapper(s,'0 0 1400 885');
}

export function livingEvidenceSVG(before:Layout,after:Layout){
  const study=sightlineStudy(),ledge=companionStudy();
  let s=text(40,40,'从公共厅到亲子角：同一条假设观察线',25)+text(40,73,'起点眼高1550 → 终点高度850mm；只检查不透明构件包围范围，不能替代近处照护。',14,muted);
  for(const [i,layout] of [before,after].entries()){
    const result=i?study.after:study.before,x=55+i*600,hit=result.hits[0],end=hit?.point??result.to;
    s+=text(x,113,i?'改造：撤除中部高架':'现状设定：中部高架遮挡',20,i?'#526d59':accent);
    s+=`<g transform="translate(${x+35} 175) scale(.031)">${planBody(layout)}`;
    if(hit)s+=line(end.x,end.y,result.to.x,result.to.y,'#a4a79b',45,'100 75');
    s+=line(result.from.x,result.from.y,end.x,end.y,i?'#526d59':accent,65);
    for(const p of [result.from,result.to])s+=`<circle cx="${p.x}" cy="${p.y}" r="115" fill="#fffaf0" stroke="${accent}" stroke-width="25"/>`;
    if(hit)s+=`<circle cx="${hit.point.x}" cy="${hit.point.y}" r="145" fill="${accent}"/>`;
    s+='</g>'+text(x,590,result.clear?'该观察线内无不透明构件':'首次遮挡：'+(hit?.name??''),16,i?'#526d59':accent);
  }
  s+=line(40,620,1160,620,'#d3d8c8',1)+text(40,652,`另一个小取舍：托台增加${ledge.addedEnvelopeArea.toFixed(2)}㎡包围范围，不增加席位；有／无托台的占用通路均到达亲子区。`,16)+text(40,684,'虚构概念场地；眼高、使用位置与占用均为设计假设。圆角家具通行仍按包围矩形保守计算。',13,muted);
  return wrapper(s,'0 0 1200 710');
}

export function touchNodesSVG(layout:Layout){
  const table=layout.components.find(c=>c.id==='shared-table'&&c.kind==='table')!,child=layout.components.find(c=>c.id==='child-table')!,ledge=layout.components.find(c=>c.id==='family-ledge')!,bench=layout.components.find(c=>c.id==='family-bench')??layout.components.find(c=>c.kind==='bench'&&c.designNode==='shelf');
  const scale=.15,r=table.cornerRadius??0;
  let s=text(40,40,'同一木质桌边，回应不同的身体尺度',25)+text(40,73,'圆角来自实际构件；钢框、桌脚与台下目标体积另行核对。产品荷载和连接件仍需深化。',14,muted);
  s+=text(45,124,'01 / 共读桌的平面与桌端',20,accent);
  s+=`<g transform="translate(100 185) scale(${scale})">${rect(0,0,table.w,table.h,'#e1d2b5',ink,9,r)}`;
  for(const y of [70,table.h-100])s+=line(70,y+15,table.w-70,y+15,'#7c8975',30,'55 30');
  for(const x of [500,table.w-550])s+=line(x+27.5,70,x+27.5,table.h-70,'#7c8975',55,'55 30');
  s+=dim(0,-220,table.w,-220,String(table.w))+dim(table.w+240,0,table.w+240,table.h,String(table.h),true);
  s+=line(0,r,0,table.h-r,accent,20)+`</g>`;
  s+=text(45,420,`R${r}端角 · 端部保留${table.h-r*2}mm直边`,18)+text(45,454,'内退钢框将接触边与支撑分开',16,muted)+text(45,484,'虚线为台下构件平面投影；具体净空见台下检查图。',13,muted);
  s+=text(680,124,'02 / 近处陪伴与手边托台',20,accent);
  const gy=385,k=.18;
  s+=line(680,gy,1150,gy,ink,1);
  s+=rect(700,gy-child.height*k,child.w*k,30*k,'#d4bd94',ink,1)+line(740,gy-(child.height-30)*k,740,gy,ink,4)+text(700,gy-child.height*k-16,`儿童桌 +${child.height}`,16,accent);
  s+=rect(1000,gy-ledge.height*k,ledge.w*k,30*k,'#d4bd94',ink,1)+line(1015,gy-(ledge.height-30)*k,1015,gy,ink,4)+line(1095,gy-(ledge.height-30)*k,1095,gy,ink,4)+text(995,gy-ledge.height*k-16,`托台 +${ledge.height}`,16,accent);
  s+=text(680,420,'标高对读 / 家具展开示意',14,muted)+text(680,454,`托台${ledge.w}×${ledge.h}mm，R${ledge.cornerRadius}`,17)+text(680,485,`0.30㎡包围范围；${bench?'与陪伴座椅相邻':'原有座椅保持'}，不增加席位`,14,muted);
  s+=line(40,530,1160,530,'#d3d8c8',1)+text(40,567,'从临窗R120、儿童R80到共读R160：圆角随用途调整，木质边缘保持连续。',18)+text(40,605,'740mm固定桌高提供同桌参与的设计目标；不能据此承诺适配全部身体与器具。',14,muted)+text(40,643,'灯具同样拆分为实体外壳、内退12mm扩散面与吊杆，图纸和模型读取同一组部件。',14,muted);
  return wrapper(s,'0 0 1200 680');
}
