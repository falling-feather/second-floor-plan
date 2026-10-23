import {createLayout,createStudy,layoutFacts,availableDestinations,destinationPoint,withOccupiedParking,parkingRect,withSharedTablePosition,ORIGINAL_SHARED_TABLE,SHARED_TABLE} from './space.ts';
import type {Layout,StudyOption} from './space.js';
import type {Rect} from './model.js';
import {spaceRoute} from './space-analysis.ts';

export function rectangleUnionArea(rectangles:Rect[]):number{
  const xs=[...new Set(rectangles.flatMap(r=>[r.x,r.x+r.w]))].sort((a,b)=>a-b);let area=0;
  for(let i=1;i<xs.length;i++){
    const left=xs[i-1]!,right=xs[i]!,ys=rectangles.filter(r=>r.x<right&&r.x+r.w>left).map(r=>[r.y,r.y+r.h] as const).sort((a,b)=>a[0]-b[0]);
    let end=-Infinity,length=0;for(const [a,b] of ys){length+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}area+=(right-left)*length;
  }return area;
}
export const CENTRAL_AREA:Rect={x:5300,y:3900,w:6000,h:4700};
export function occupiedCentralArea(layout:Layout):number{
  const region=CENTRAL_AREA,rects:Rect[]=[];
  for(const c of layout.components.filter(c=>c.solid&&c.base<2000)){
    const x=Math.max(c.x,region.x),y=Math.max(c.y,region.y),right=Math.min(c.x+c.w,region.x+region.w),bottom=Math.min(c.y+c.h,region.y+region.h);
    if(right>x&&bottom>y)rects.push({x,y,w:right-x,h:bottom-y});
  }return rectangleUnionArea(rects)/1e6;
}
export const STUDY_OPTIONS:{id:StudyOption;name:string;reason:string}[]=[
  {id:'seats',name:'A  排式阅读',reason:'增加固定席位，亲子共读和陪伴设施退出；静读与交流仍处于开放空间。'},
  {id:'open',name:'B  开放共读',reason:'保留亲子与活动转换，减少新增界面；桌端停靠占用主通行线，使用后需绕行。'},
  {id:'balanced',name:'C  分区共享',reason:'保留24席和3处相邻停靠，加入静读界面；增加玻璃门窗的制作与维护。'},
];
export function columnSideAisle(layout:Layout):number|null{const p=layout.reserved.find(p=>p.id==='table-west'),column=layout.components.find(c=>c.id==='column-1');return p&&column?Math.max(0,parkingRect(p).x-column.x-column.w):null;}
export function studySummaries(){return STUDY_OPTIONS.map(option=>{const layout=createStudy(option.id);return {...option,facts:layoutFacts(layout),family:layout.components.some(c=>c.id==='child-table'),quietBoundary:layout.components.some(c=>c.kind==='partition'),glazedArea:layout.components.filter(c=>c.kind==='partition').reduce((s,c)=>s+c.w*c.height/1e6,0),aisleWidthMm:columnSideAisle(layout),layout};});}
export function studyResults(){return studySummaries().map(summary=>({...summary,routes:availableDestinations(summary.layout).map(d=>{const point=destinationPoint(summary.layout,d.id),occupied=withOccupiedParking(summary.layout,point);return{id:d.id,name:d.name,...spaceRoute(summary.layout,point,900),occupied:spaceRoute(occupied,point,900),occupiedRects:occupied.components.filter(c=>c.kind==='envelope').map(c=>({x:c.x,y:c.y,w:c.w,h:c.h}))};})}));}
export function occupancyStudy(){const layout=createLayout();return availableDestinations(layout).map(d=>{const point=destinationPoint(layout,d.id);return{id:d.id,name:d.name,empty:spaceRoute(layout,point,900),occupied:spaceRoute(withOccupiedParking(layout,point),point,900)};});}
export function tablePositionStudy(){return [ORIGINAL_SHARED_TABLE.x,7000,SHARED_TABLE.x].map(x=>{
  const layout=withSharedTablePosition(createLayout(),x),point=destinationPoint(layout,'window'),occupied=withOccupiedParking(layout,point);
  return{x,aisleWidthMm:columnSideAisle(layout),layout,empty:spaceRoute(layout,point,900),occupied:spaceRoute(occupied,point,900),occupiedRects:occupied.components.filter(c=>c.kind==='envelope').map(c=>({x:c.x,y:c.y,w:c.w,h:c.h}))};
});}
export function modeStudy(){const reading=createLayout(),gathering=createLayout('proposed','gathering');return {region:CENTRAL_AREA,readingOccupied:occupiedCentralArea(reading),gatheringOccupied:occupiedCentralArea(gathering),freedFootprint:occupiedCentralArea(reading)-occupiedCentralArea(gathering),note:'家具与柱的平面包围范围并集，未计设备转向和活动净距，不是可核定容量。'};}
