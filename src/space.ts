import type { Point, Rect } from './model.js';
export type Scheme='existing'|'proposed';
export type UseMode='reading'|'gathering';
export type Material='plaster'|'concrete'|'oak'|'linen'|'sage'|'clay'|'metal'|'glass'|'stone'|'sheer';
export type DesignNode='floor'|'quiet'|'shelf'|'table'|'service';
export interface Component extends Rect {
  id:string; name:string; kind:'wall'|'column'|'beam'|'shelf'|'table'|'folded'|'chair'|'bench'|'counter'|'sink'|'wc'|'rug'|'plant'|'partition'|'baffle'|'light'|'mirror'|'rail'|'envelope'|'curtain'|'book';
  height:number; base:number; material:Material; solid:boolean; seats?:number; public?:boolean; facing?:'north'|'south'|'east'|'west'; openBelow?:boolean; railForm?:'fold-up'|'lshape';cornerRadius?:number;designNode?:DesignNode;housingHeight?:number;
}
export interface Zone extends Rect {id:string;name:string;purpose:string;color:string}
export interface Parking extends Point {id:string;facing:'north'|'east'|'west'}
export interface Layout {scheme:Scheme;mode:UseMode;components:Component[];platform:Rect|null;doorWidth:number;reserved:Parking[]}
export function parkingRect(p:Parking):Rect{const w=p.facing==='north'?900:1200,h=p.facing==='north'?1200:900;return{x:p.x-w/2,y:p.y-h/2,w,h};}
export const ROOM={width:15000,depth:12000,height:3200,wall:200,area:180,floorSlab:160,floorFinish:8,platformHeight:180,platformDepth:3600,
  entrance:{x:6000,y:11200},sectionX:8100,sectionY:6000,grid:200};
export const DETAILS={turnDiameter:1500,tableHeight:740,childTableHeight:540,tableClearHeight:680,parkingWidth:900,parkingDepth:1200,grabDiameter:35,lightBase:2644,lightHousingHeight:51,lightRecess:12,lightCheek:8};
export const EDGE_RADII={shared:160,window:120,child:80,service:80,companion:80};
export const COMPANION_LEDGE={x:2400,y:7400,w:600,h:500,height:DETAILS.tableHeight};
export const CONTACT_DIMENSIONS={width:750,depth:450,tableClearHeight:680,basinClearHeight:650};
export const SHARED_TABLE={x:7700,y:4600,w:2400,h:1200,height:DETAILS.tableHeight};
export const ORIGINAL_SHARED_TABLE={...SHARED_TABLE,x:6400};
export const PARKING_POSITIONS=[
  {id:'window',x:5600,y:1700,facing:'north'},
  {id:'table-west',x:SHARED_TABLE.x-DETAILS.parkingDepth/2,y:SHARED_TABLE.y+SHARED_TABLE.h/2,facing:'east'},
  {id:'table-east',x:SHARED_TABLE.x+SHARED_TABLE.w+DETAILS.parkingDepth/2,y:SHARED_TABLE.y+SHARED_TABLE.h/2,facing:'west'},
] as const satisfies readonly Parking[];
export const MATERIALS:Record<Material,{color:string;name:string;note:string}>={
  plaster:{color:'#e5e2d8',name:'暖白矿物涂层',note:'保留明亮界面，靠墙标识与墙面形成对比'},
  concrete:{color:'#a9aaa4',name:'原有混凝土框架',note:'墙柱与梁位置保留，概念场地假设'},
  oak:{color:'#b89a6e',name:'浅橡木饰面',note:'桌面与低书架采用同一材料系统'},
  linen:{color:'#c5bda8',name:'暖灰织物',note:'坐垫采用可拆洗织物，扶手保留木质触点'},
  sage:{color:'#8f9d85',name:'灰绿软木与织物',note:'亲子区使用低饱和识别色，边界平接地面'},
  clay:{color:'#b57254',name:'陶土色导向',note:'用于改造节点与方向信息，不铺满空间'},
  metal:{color:'#50594f',name:'深灰金属',note:'细框、桌脚及标识，控制眩光'},
  glass:{color:'#c4d6d1',name:'窗与静读玻璃界面',note:'静读与共读相邻可见；隔声需具体门窗系统验证'},
  stone:{color:'#d4d1c5',name:'浅灰防滑地材',note:'统一主要地坪，材料性能与节点需后续专业核对'},
  sheer:{color:'#e6dfcf',name:'透光织物',note:'亲子区西侧柔化侧光的意向；透射、防火与安装待产品核对'},
};
export const ZONES:Zone[]=[
  {id:'quiet',name:'临窗安静阅读',purpose:'独处、较长时间阅读；共享桌与窗边位之间保持连续联系',x:0,y:0,w:15000,h:3600,color:'#dce3d7'},
  {id:'family',name:'亲子共读',purpose:'低书架维持照看视线，靠近入口和家长座位',x:0,y:3600,w:4800,h:5200,color:'#e8ddca'},
  {id:'commons',name:'共读与社区交流',purpose:'桌组日常阅读；活动时收拢，保留在场而非隔离的停靠位',x:4800,y:3600,w:6700,h:5200,color:'#e6ded3'},
  {id:'collection',name:'书籍与活动收纳',purpose:'高位藏书靠边布置；活动家具在同一空间内收纳',x:11500,y:3600,w:3500,h:4400,color:'#e3e5d8'},
  {id:'arrival',name:'入口、借阅与休息',purpose:'入场、咨询、短时等候；服务台设置较低段',x:0,y:8800,w:11500,h:3200,color:'#eee8dd'},
  {id:'service',name:'卫生与储藏',purpose:'保留湿区位置，扩大门口并核对内部回转预留',x:11500,y:8000,w:3500,h:4000,color:'#dddeda'},
];
export const DESTINATIONS=[
  {id:'window',name:'临窗阅读位',note:'同一条阅读桌中预留停靠位'},
  {id:'table',name:'共享共读桌',note:'桌端预留与普通座位相邻的位置'},
  {id:'family',name:'亲子陪伴区',note:'靠近低书架与家长座位'},
  {id:'wc',name:'卫生间入口及回转区',note:'门口与内部预留分别核对'},
  {id:'service',name:'低位服务台',note:'坐姿与站姿共享同一服务界面'},
  {id:'wash',name:'洗手台前',note:'设施前的到达与台下净空分别核对'},
] as const;
export type DestinationId=typeof DESTINATIONS[number]['id'];
export const INTERVENTIONS=[
  {id:'floor',number:'01',title:'把高差退出公共流线',point:{x:7600,y:3500},short:'拆除非承重架空木地台，主要地坪统一标高。',detail:'现状设定的北侧木地台高180mm。改造优先去掉非必要高差，避免另铺一段占地坡道；拆除方式和基层条件仍需真实场地核实。'},
  {id:'quiet',number:'02',title:'静读与交流各有边界',point:{x:10800,y:3550},short:'北侧静读室与公共厅以可见的玻璃界面相邻。',detail:'静读区增加可闭合界面，门口留1500mm通行开口。通行计算采用门开启状态；关闭后的隔声效果仍需实际玻璃、门缝及顶面系统核对。公共厅设置软质顶面，避免仅用低书架承诺安静。'},
  {id:'shelf',number:'03',title:'陪孩子读书，也能放下自己的书',point:{x:2700,y:7650},short:'540mm儿童桌、陪伴座椅与740mm侧托台相邻。',detail:'托台占用0.30㎡，为陪伴者提供手边的书本和临时物件位置；没有把它计成新增席位或无障碍工作位。低架退边保留公共厅与亲子区的可见联系，照护仍需近距离进行。'},
  {id:'table',number:'04',title:'同桌停靠，同时保留通行',point:{x:PARKING_POSITIONS[1].x,y:PARKING_POSITIONS[1].y},short:'共享桌向东调整，停靠位与主通行线分开。',detail:'西端停靠包络与保留柱之间留出1300mm通行带。日常六张普通椅与两个端部位置共用同桌，并检查其他预留位置被占用时的路线。桌面740mm、台下680mm为设计目标，实际器具与产品仍需适配。'},
  {id:'service',number:'05',title:'让借阅与卫生服务连续',point:{x:11600,y:9200},short:'服务台设置低位段，卫生间门口扩大并外开。',detail:'湿区保留在东南角。门口净开口由800mm设定改为1100mm，并预留直径1500mm回转空间；这不是完整卫生间合规审查。'},
] as const;
const component=(id:string,name:string,kind:Component['kind'],x:number,y:number,w:number,h:number,height:number,material:Material,extra:Partial<Component>={}):Component=>({id,name,kind,x,y,w,h,height,base:0,material,solid:true,...extra});
export function structure(doorWidth:number):Component[]{
  const d0=9200-doorWidth/2,d1=9200+doorWidth/2;
  return [
    component('wall-nw','北侧窗下墙','wall',0,-200,15000,200,900,'plaster'),
    component('wall-west','西侧窗下墙','wall',-200,0,200,12000,900,'plaster'),
    component('north-lintel','北侧窗上墙','wall',0,-200,15000,200,600,'plaster',{base:2600,solid:false}),
    component('west-lintel','西侧窗上墙','wall',-200,0,200,12000,600,'plaster',{base:2600,solid:false}),
    component('wall-east','东侧外墙','wall',15000,0,200,12000,3200,'plaster'),
    component('wall-s1','南侧保留墙','wall',0,12000,5100,200,3200,'plaster'),
    component('wall-s2','入口与次出口间墙','wall',6900,12000,2900,200,3200,'plaster'),
    component('wall-s3','南侧服务墙','wall',11000,12000,4000,200,3200,'plaster'),
    component('column-1','保留框架柱C1','column',4800,5800,400,400,2900,'concrete'),
    component('column-2','保留框架柱C2','column',9800,5800,400,400,2900,'concrete'),
    component('beam','保留框架梁','beam',0,5800,15000,400,300,'concrete',{base:2900,solid:false}),
    component('wet-n','湿区北隔墙','wall',11500,8000,3500,100,2800,'plaster'),
    component('wet-w1','卫生间西隔墙上段','wall',11500,8100,100,d0-8100,2800,'plaster'),
    component('wet-w2','卫生间西隔墙下段','wall',11500,d1,100,10400-d1,2800,'plaster'),
    component('wc-door-leaf','外开门扇开启状态','wall',11500-doorWidth,d1-40,doorWidth,40,2100,'oak'),
    component('wet-partition','卫生及储藏隔墙','wall',11500,10400,3500,100,2800,'plaster'),
    component('store-w1','储藏西墙上段','wall',11500,10500,100,400,2800,'plaster'),
    component('store-w2','储藏西墙下段','wall',11500,11800,100,200,2800,'plaster'),
  ];
}
const chair=(id:string,x:number,y:number,child=false,facing:Component['facing']='north'):Component=>component(id,child?'儿童椅':'阅读椅','chair',x,y,child?360:500,child?360:500,child?580:820,child?'sage':'linen',{seats:1,public:true,facing});
export function createLayout(scheme:Scheme='proposed',mode:UseMode='reading'):Layout{
  if(scheme==='existing')mode='reading';
  const proposed=scheme==='proposed',items=structure(proposed?1100:800);
  items.push(component('window-desk','临窗阅读长桌','table',600,500,10200,600,DETAILS.tableHeight,'oak',{cornerRadius:proposed?EDGE_RADII.window:0,designNode:'quiet'}));
  for(const [i,x] of [1050,2150,3250,4350,6550,7650,8750,9850].entries())items.push(chair(`window-chair-${i}`,x,1300));
  items.push(component('east-shelf','靠边高位藏书','shelf',14550,800,450,6600,2100,'oak'));
  items.push(component('quiet-chair-a','安静阅读扶手椅','chair',12400,2000,700,700,900,'linen',{seats:1,public:true,facing:'east'}),component('quiet-chair-b','安静阅读扶手椅','chair',13700,2000,700,700,900,'linen',{seats:1,public:true,facing:'west'}));
  items.push(component('quiet-side-table','扶手椅间小边几','table',13250,2200,300,300,450,'oak'));
  items.push(component('family-bench','家长陪伴座椅','bench',600,7400,1800,650,850,'linen',{seats:2,public:true}));
  items.push(component('rest-bench','入口短时休息长椅','bench',700,10100,2400,650,850,'linen',{seats:3,public:true}));
  items.push(component('child-table','亲子共读矮桌','table',1300,5400,1400,700,DETAILS.childTableHeight,'oak',{cornerRadius:proposed?EDGE_RADII.child:0,designNode:'shelf'}));
  for(const [i,p] of [{x:1450,y:6300},{x:2200,y:6300},{x:700,y:5500}].entries())items.push(chair(`child-${i}`,p.x,p.y,true,i===2?'east':'north'));
  items.push(component('rug','平接地面的亲子区材质','rug',500,4900,3800,3500,8,'sage',{solid:false,base:-8}));
  items.push(component('low-counter',proposed?'借阅服务低位段':'借阅服务站立柜台','counter',7600,10100,1000,650,proposed?DETAILS.tableHeight:900,'oak',{openBelow:proposed,cornerRadius:proposed?EDGE_RADII.service:0,designNode:'service'}),component('counter','借阅服务站立及收纳段','counter',8600,10100,1700,650,900,'oak',{openBelow:false}));
  items.push(component('sink','卫生间洗手台及龙头','sink',proposed?ROOM.width-550:13900,8200,proposed?550:1000,proposed?1000:550,980,'stone',{facing:proposed?'west':'south',openBelow:proposed}),component('toilet','坐便器及水箱示意','wc',14000,9450,600,750,650,'plaster'));
  items.push(component('storage','储藏柜','shelf',14200,10700,600,1100,2100,'oak'));
  if(proposed){
    const ledge=COMPANION_LEDGE;
    items.push(component('family-ledge','陪伴者手边托台','table',ledge.x,ledge.y,ledge.w,ledge.h,ledge.height,'oak',{cornerRadius:EDGE_RADII.companion,designNode:'shelf'}));
    items.push(component('family-book','陪伴者的书本示意','book',2470,7480,220,300,18,'sage',{base:ledge.height,solid:false,cornerRadius:8,designNode:'shelf'}));
    items.push(component('window-book','窗边阅读物件示意','book',6300,650,240,300,18,'sage',{base:DETAILS.tableHeight,solid:false,cornerRadius:8,designNode:'quiet'}));
    items.push(component('family-sheer','亲子区透光帘意向','curtain',40,4800,30,3200,1700,'sheer',{base:900,solid:false,designNode:'shelf'}));
    items.push(component('family-shelf','亲子区低书架','shelf',700,4000,3400,350,1200,'oak'));
    items.push(component('middle-shelf','静读室低书架','shelf',6500,3000,2600,350,1200,'oak'));
    items.push(component('quiet-screen-west','静读室西段玻璃界面','partition',0,3550,4850,100,3200,'glass'),component('quiet-screen-east','静读室东段玻璃界面','partition',6350,3550,8650,100,3200,'glass'));
    items.push(component('quiet-door-open','静读室推拉门开启位置','partition',6350,3480,1500,50,2600,'glass'),component('quiet-transom','静读门上方玻璃','partition',4850,3550,1500,100,600,'glass',{base:2600,solid:false}));
    items.push(component('family-ceiling','亲子区软质顶面意向','baffle',700,4800,3400,3200,50,'linen',{base:2800,solid:false}),component('commons-ceiling-n','共读厅北段软质顶面','baffle',7600,4300,2700,1400,50,'linen',{base:2800,solid:false}),component('commons-ceiling-s','共读厅南段软质顶面','baffle',7600,6300,2700,1000,50,'linen',{base:2800,solid:false}));
    for(const [id,x,y,w] of [['window',1000,800,9000],['table',SHARED_TABLE.x,5150,SHARED_TABLE.w],['family',1300,5700,1400],['service',7600,10300,2700],['wash',13500,8500,1200]] as const){
      const attach=id==='table'?items.find(c=>c.id==='commons-ceiling-n')!.base:id==='family'?items.find(c=>c.id==='family-ceiling')!.base:ROOM.height;
      items.push(component(`light-${id}`,'内退漫射条光与吊杆意向','light',x,y,w,70,attach-DETAILS.lightBase,'metal',{base:DETAILS.lightBase,housingHeight:DETAILS.lightHousingHeight,solid:false}));
    }
    const backWall=items.find(c=>c.id==='wet-partition')!;
    items.push(component('wc-mirror','洗手台镜面意向','mirror',ROOM.width-20,8200,20,1000,800,'metal',{base:950,solid:false}),component('wc-rail-fold','坐便器近侧上翻抓杆意向','rail',13925,9425,50,backWall.y-9425,100,'metal',{base:700,solid:false,railForm:'fold-up'}),component('wc-rail-fixed','坐便器远侧L形抓杆意向','rail',14650,9250,350,1000,767.5,'metal',{base:732.5,solid:false,railForm:'lshape'}));
  }else{
    items.push(component('blocking-shelf','中部连续高书架','shelf',4300,3900,500,4700,1900,'oak'));
    items.push(component('middle-shelf','横向高书架','shelf',6500,3200,2600,500,1900,'oak'));
  }
  if(mode==='gathering'&&proposed){
    items.push(component('shared-table','折叠后收纳桌组','folded',11600,6600,2400,450,1200,'oak',{cornerRadius:EDGE_RADII.shared,designNode:'table'}));
    for(let i=0;i<6;i++)items.push({...chair(`shared-chair-${i}`,11800+(i%3)*750,5000+Math.floor(i/3)*750),public:false});
  }else{
    const table=proposed?SHARED_TABLE:ORIGINAL_SHARED_TABLE,pitch=proposed?700:800;
    items.push(component('shared-table','共享共读桌','table',table.x,table.y,table.w,table.h,table.height,'oak',{cornerRadius:proposed?EDGE_RADII.shared:0,designNode:'table'}));
    if(proposed)items.push(component('shared-book','共享阅读物件示意','book',table.x+900,table.y+400,240,300,18,'sage',{base:table.height,solid:false,cornerRadius:8,designNode:'table'}));
    for(let i=0;i<3;i++){items.push(chair(`shared-chair-n-${i}`,table.x+150+i*pitch,table.y-700,false,'south'));items.push(chair(`shared-chair-s-${i}`,table.x+150+i*pitch,table.y+table.h+250));}
  }
  items.sort((a,b)=>Number(a.kind!=='rug')-Number(b.kind!=='rug'));
  return {scheme,mode,components:items,platform:proposed?null:{x:0,y:0,w:15000,h:3600},doorWidth:proposed?1100:800,
    reserved:proposed?PARKING_POSITIONS.map(p=>({...p})):[]};
}
export function destinationPoint(layout:Layout,id:DestinationId):Point{
  const requireComponent=(key:string)=>{const c=layout.components.find(c=>c.id===key);if(!c)throw new Error(`当前布置没有${key}`);return c;};
  switch(id){
    case 'window':return{x:PARKING_POSITIONS[0].x,y:PARKING_POSITIONS[0].y};
    case 'table':{const c=requireComponent('shared-table');if(c.kind!=='table')throw new Error('当前桌组已收拢');return{x:c.x-DETAILS.parkingDepth/2,y:c.y+c.h/2};}
    case 'family':return{x:3300,y:7000};
    case 'wc':return{x:12500,y:9200};
    case 'service':{const c=requireComponent('low-counter');return{x:c.x+c.w/2,y:c.y-700};}
    case 'wash':{const c=requireComponent('sink');return c.facing==='west'?{x:c.x-650,y:c.y+c.h/2}:{x:c.x+c.w/2,y:c.y+c.h+600};}
  }
}
export function withOccupiedParking(layout:Layout,target:Point):Layout{
  return {...layout,components:[...layout.components,...layout.reserved.filter(p=>p.x!==target.x||p.y!==target.y).map(p=>{const r=parkingRect(p);return component(`occupied-${p.id}`,'停靠位占用假设包络','envelope',r.x,r.y,r.w,r.h,1200,'clay');})]};
}
export function withSharedTablePosition(layout:Layout,x:number):Layout{
  if(!Number.isFinite(x)||x<ORIGINAL_SHARED_TABLE.x||x>SHARED_TABLE.x)throw new Error('桌组位置超出本轮推敲范围');
  const table=layout.components.find(c=>c.id==='shared-table');if(!table||table.kind!=='table')throw new Error('桌组收拢时不能调整日常桌位');
  const dx=x-table.x;
  return {...layout,components:layout.components.map(c=>c.id==='shared-table'||c.id==='shared-book'||c.kind==='chair'&&c.id.startsWith('shared-chair-')?{...c,x:c.x+dx}:c),reserved:layout.reserved.map(p=>p.id.startsWith('table-')?{...p,x:p.x+dx}:p)};
}
export type StudyOption='seats'|'open'|'balanced';
export function createStudy(option:StudyOption):Layout{
  const layout=createLayout();if(option==='balanced')return layout;
  layout.components=layout.components.filter(c=>c.kind!=='partition'&&c.kind!=='baffle');
  for(const c of layout.components)if(c.kind==='light')c.height=ROOM.height-c.base;
  if(option==='open'){
    const dx=ORIGINAL_SHARED_TABLE.x-SHARED_TABLE.x;
    for(const c of layout.components)if(c.id==='shared-table'||c.id==='shared-book'||c.id==='light-table')c.x+=dx;
    for(let i=0;i<3;i++)for(const side of ['n','s'])layout.components.find(c=>c.id===`shared-chair-${side}-${i}`)!.x=ORIGINAL_SHARED_TABLE.x+150+i*800;
    layout.reserved=layout.reserved.map(p=>p.id.startsWith('table-')?{...p,x:p.x+dx}:p);
  }
  if(option==='seats'){
    layout.components=layout.components.filter(c=>!['family-bench','child-table','family-shelf','family-ledge','family-book','family-sheer','rug'].includes(c.id)&&!c.id.startsWith('child-'));
    for(const [row,y] of [4600,7400].entries()){
      layout.components.push(component(`study-table-${row}`,'排式阅读桌','table',700,y,2400,700,740,'oak'));
      for(let i=0;i<3;i++)for(const [side,cy] of [['n',y-800],['s',y+900]] as const)layout.components.push(chair(`study-chair-${row}-${side}-${i}`,850+i*800,cy));
    }
  }
  return layout;
}
export function availableDestinations(layout:Layout){return DESTINATIONS.filter(d=>(d.id!=='table'||layout.components.some(c=>c.id==='shared-table'&&c.kind==='table'))&&(d.id!=='family'||layout.components.some(c=>c.id==='child-table')));}
export function floorPanels(layout:Layout):Rect[]{
  let panels:Rect[]=[{x:-ROOM.wall,y:-ROOM.wall,w:ROOM.width+ROOM.wall*2,h:ROOM.depth+ROOM.wall*2}];
  for(const finish of layout.components.filter(c=>c.kind==='rug')){
    panels=panels.flatMap(r=>{const x=Math.max(r.x,finish.x),y=Math.max(r.y,finish.y),right=Math.min(r.x+r.w,finish.x+finish.w),bottom=Math.min(r.y+r.h,finish.y+finish.h);
      if(x>=right||y>=bottom)return[r];
      return [{x:r.x,y:r.y,w:r.w,h:y-r.y},{x:r.x,y:bottom,w:r.w,h:r.y+r.h-bottom},{x:r.x,y,w:x-r.x,h:bottom-y},{x:right,y,w:r.x+r.w-right,h:bottom-y}].filter(r=>r.w>0&&r.h>0);
    });
  }return panels;
}
export function layoutFacts(layout:Layout){return {area:ROOM.area,seats:layout.components.reduce((sum,c)=>sum+(c.public?(c.seats??0):0),0),reserved:layout.reserved.length,doorWidth:layout.doorWidth,levelChange:layout.platform?ROOM.platformHeight:0};}
