export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface SceneState { bench: Point; ramp: { enabled: boolean; ratio: number } }
export interface Conditions { minWidth: number; stepFree: boolean; rest: boolean; restLimit: number }
export interface Route {
  reached: boolean; geometric: boolean; path: Point[]; length: number;
  legs: number[]; maxLeg: number; stops: Point[];
  reason: 'ok' | 'width' | 'step' | 'rest' | 'geometry';
}
export interface Analysis {
  route: Route; minWidth: number; ramp: ReturnType<typeof checkRamp>;
  benchAccess: Point; accessibleSeat: boolean; explored: Point[]; nodeCount: number;
}
type Segment = [Point, Point];
const EPS = 1e-6;
export const SCENE = {
  width: 18000, clearWidth: 1600, rise: 180, stepX: 12000,
  benchWidth: 1800, benchDepth: 550, landing: 1500, resolution: 100,
  start: { x: 800, y: 800 }, goal: { x: 17200, y: 800 },
  floors: [
    { x: 0, y: 0, w: 18000, h: 1600 },
    { x: 6200, y: -2400, w: 3200, h: 2400 },
    { x: 14400, y: -2400, w: 3000, h: 2400 },
  ] satisfies Rect[],
};
export const walls: Segment[] = [
  [{x:0,y:0},{x:6200,y:0}], [{x:9400,y:0},{x:14400,y:0}], [{x:17400,y:0},{x:18000,y:0}],
  [{x:0,y:0},{x:0,y:1600}], [{x:18000,y:0},{x:18000,y:1600}], [{x:0,y:1600},{x:18000,y:1600}],
  [{x:6200,y:0},{x:6200,y:-2400}], [{x:6200,y:-2400},{x:9400,y:-2400}], [{x:9400,y:-2400},{x:9400,y:0}],
  [{x:14400,y:0},{x:14400,y:-2400}], [{x:14400,y:-2400},{x:17400,y:-2400}], [{x:17400,y:-2400},{x:17400,y:0}],
];
export const initialState = (): SceneState => ({ bench: { x: 4800, y: 0 }, ramp: { enabled: false, ratio: 12 } });
export const defaultConditions = (): Conditions => ({ minWidth: 1200, stepFree: true, rest: true, restLimit: 12000 });
export const cloneState = (s: SceneState): SceneState => ({ bench: {...s.bench}, ramp: {...s.ramp} });
export const benchRect = (s: SceneState): Rect => ({ ...s.bench, w: SCENE.benchWidth, h: SCENE.benchDepth });
const inside = (p: Point, r: Rect) => p.x >= r.x-EPS && p.x <= r.x+r.w+EPS && p.y >= r.y-EPS && p.y <= r.y+r.h+EPS;
export const inFloor = (p: Point) => SCENE.floors.some(r => inside(p, r));
const overlap = (a: Rect, b: Rect) => a.x < b.x+b.w-EPS && a.x+a.w > b.x+EPS && a.y < b.y+b.h-EPS && a.y+a.h > b.y+EPS;
const dist2 = (a: Point, b: Point) => (a.x-b.x)**2 + (a.y-b.y)**2;
function pointSegment2(p: Point, a: Point, b: Point): number {
  const dx=b.x-a.x, dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1)));
  return (p.x-a.x-t*dx)**2+(p.y-a.y-t*dy)**2;
}
const cross = (a: Point, b: Point, c: Point) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export function segmentDistance2(a: Point,b: Point,c: Point,d: Point): number {
  if (Math.min(a.x,b.x)<=Math.max(c.x,d.x)+EPS && Math.max(a.x,b.x)>=Math.min(c.x,d.x)-EPS &&
      Math.min(a.y,b.y)<=Math.max(c.y,d.y)+EPS && Math.max(a.y,b.y)>=Math.min(c.y,d.y)-EPS &&
      cross(a,b,c)*cross(a,b,d)<=EPS && cross(c,d,a)*cross(c,d,b)<=EPS) return 0;
  return Math.min(pointSegment2(a,c,d),pointSegment2(b,c,d),pointSegment2(c,a,b),pointSegment2(d,a,b));
}
export function rectDistance2(a: Point,b: Point,r: Rect): number {
  if (inside(a,r)||inside(b,r)) return 0;
  const p={x:r.x,y:r.y},q={x:r.x+r.w,y:r.y},u={x:r.x+r.w,y:r.y+r.h},v={x:r.x,y:r.y+r.h};
  return Math.min(segmentDistance2(a,b,p,q),segmentDistance2(a,b,q,u),segmentDistance2(a,b,u,v),segmentDistance2(a,b,v,p));
}
export function checkRamp(s: SceneState) {
  const run=SCENE.rise*s.ramp.ratio;
  const start=SCENE.stepX-run, footprint=run+2*SCENE.landing;
  const area: Rect={x:start-SCENE.landing,y:0,w:footprint,h:SCENE.clearWidth};
  const occupied=overlap(benchRect(s),area);
  return { run, start, footprint, area, occupied,
    pass:s.ramp.enabled && s.ramp.ratio>=12 && area.x>=0 && area.x+area.w<=SCENE.width && !occupied,
    message:!s.ramp.enabled?'180mm 阶差，尚无连续连接':s.ramp.ratio<12?'坡段过陡，需要延长':occupied?'座椅占用了坡道或平台':'所选坡段、平台与净宽条件通过',
  };
}
function barrier(s: SceneState,c: Conditions): Rect | null {
  if (!c.stepFree || checkRamp(s).pass) return null;
  return s.ramp.enabled ? { x:checkRamp(s).start,y:0,w:SCENE.rise*s.ramp.ratio,h:SCENE.clearWidth } : {x:SCENE.stepX-1,y:0,w:2,h:SCENE.clearWidth};
}
function wallClear(a: Point,b: Point,radius: number): boolean {
  return inFloor(a)&&inFloor(b)&&walls.every(([p,q])=>segmentDistance2(a,b,p,q)+EPS>=radius*radius);
}
export function isClearSegment(a: Point,b: Point,s: SceneState,c: Conditions): boolean {
  const radius=c.minWidth/2, blocked=barrier(s,c);
  return wallClear(a,b,radius) && rectDistance2(a,b,benchRect(s))+EPS>=radius*radius &&
    (!blocked || rectDistance2(a,b,blocked)+EPS>=radius*radius);
}
export function moveBench(s: SceneState,p: Point): { valid: boolean; state: SceneState; reason: string } {
  if (![p.x,p.y].every(Number.isFinite)) return {valid:false,state:cloneState(s),reason:'位置数据无效'};
  const r={...p,w:SCENE.benchWidth,h:SCENE.benchDepth};
  const xs=[r.x,r.x+r.w,...SCENE.floors.flatMap(f=>[f.x,f.x+f.w]).filter(x=>x>r.x&&x<r.x+r.w)].sort((a,b)=>a-b);
  const ys=[r.y,r.y+r.h,...SCENE.floors.flatMap(f=>[f.y,f.y+f.h]).filter(y=>y>r.y&&y<r.y+r.h)].sort((a,b)=>a-b);
  for(let x=1;x<xs.length;x++) for(let y=1;y<ys.length;y++) {
    if (!inFloor({x:(xs[x-1]!+xs[x]!)/2,y:(ys[y-1]!+ys[y]!)/2})) return {valid:false,state:cloneState(s),reason:'座椅需要完整放在现有空间内'};
  }
  if (r.x<SCENE.stepX&&r.x+r.w>SCENE.stepX) return {valid:false,state:cloneState(s),reason:'座椅不能跨越两个标高'};
  if (s.ramp.enabled&&overlap(r,checkRamp(s).area)) return {valid:false,state:cloneState(s),reason:'请留出坡道与上下平台'};
  return { valid:true,state:{...cloneState(s),bench:{...p}},reason:'' };
}
export function narrowestSection(s: SceneState): number {
  const b=benchRect(s);
  const xs=[0,SCENE.width,b.x,b.x+b.w,...SCENE.floors.flatMap(f=>[f.x,f.x+f.w])].filter(x=>x>=0&&x<=SCENE.width).sort((a,b)=>a-b);
  let minimum=Infinity;
  for(let i=1;i<xs.length;i++) {
    if (xs[i]!-xs[i-1]!<EPS) continue;
    const x=(xs[i]!+xs[i-1]!)/2;
    let top=Math.min(...SCENE.floors.filter(f=>x>=f.x&&x<=f.x+f.w).map(f=>f.y));
    let free=SCENE.clearWidth-top;
    if (x>b.x&&x<b.x+b.w&&b.y<SCENE.clearWidth&&b.y+b.h>top) free=Math.max(Math.max(0,b.y-top),Math.max(0,SCENE.clearWidth-b.y-b.h));
    minimum=Math.min(minimum,free);
  }
  return minimum;
}

class MinHeap {
  private values: { id:number; cost:number }[]=[];
  push(id:number,cost:number) {
    const a=this.values; a.push({id,cost}); let i=a.length-1;
    while(i>0) {const p=(i-1)>>1; if(a[p]!.cost<=cost) break; a[i]=a[p]!;i=p;} a[i]={id,cost};
  }
  pop(): {id:number;cost:number}|undefined {
    const a=this.values,first=a[0],last=a.pop(); if(!a.length) return first;
    let i=0; while(true) {let c=i*2+1;if(c>=a.length)break;if(c+1<a.length&&a[c+1]!.cost<a[c]!.cost)c++;
      if(a[c]!.cost>=last!.cost)break;a[i]=a[c]!;i=c;}a[i]=last!;return first;
  }
}
export function shortestPaths(n:number,startId:number,valid:Uint8Array,adjacent:(id:number)=>{id:number;cost:number}[]){
  const distances=new Float64Array(n).fill(Infinity),parents=new Int32Array(n).fill(-1),heap=new MinHeap();
  if(startId>=0&&valid[startId]){distances[startId]=0;heap.push(startId,0);}
  while(true){const next=heap.pop();if(!next)break;if(next.cost>distances[next.id]!+EPS)continue;
    for(const e of adjacent(next.id)){const cost=next.cost+e.cost;if(cost+EPS<distances[e.id]!){distances[e.id]=cost;parents[e.id]=next.id;heap.push(e.id,cost);}}
  }
  return {distances,parents};
}
const unique=(xs:number[],min:number,max:number)=>[...new Set(xs.filter(x=>x>=min-EPS&&x<=max+EPS))].sort((a,b)=>a-b);
function createGraph(s:SceneState,c:Conditions,seat:Point) {
  const radius=c.minWidth/2,b=benchRect(s),blocked=barrier(s,c);
  // Critical offsets supplement the 100mm grid so equality at a narrow section is represented.
  const xs=unique([...Array.from({length:181},(_,i)=>i*100),SCENE.start.x,SCENE.goal.x,seat.x,
    ...[...walls.flat(),{x:b.x,y:b.y},{x:b.x+b.w,y:b.y+b.h}].flatMap(p=>[p.x-radius,p.x+radius])],0,18000);
  const ys=unique([...Array.from({length:41},(_,i)=>i*100-2400),800,seat.y,b.y-radius,b.y+b.h+radius,
    ...walls.flat().flatMap(p=>[p.y-radius,p.y+radius])],-2400,1600);
  const nx=xs.length,n=nx*ys.length,valid=new Uint8Array(n),known=new Uint8Array(n),edges=new Uint8Array(n);
  const point=(id:number):Point=>({x:xs[id%nx]!,y:ys[Math.floor(id/nx)]!});
  for(let id=0;id<n;id++) {
    const p=point(id);
    if (wallClear(p,p,radius)&&rectDistance2(p,p,b)+EPS>=radius*radius&&(!blocked||rectDistance2(p,p,blocked)+EPS>=radius*radius))valid[id]=1;
  }
  const directions=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]] as const;
  const adjacent=(id:number): {id:number;cost:number}[] => {
    const ix=id%nx,iy=Math.floor(id/nx),p=point(id),result:{id:number;cost:number}[]=[];
    for(let d=0;d<8;d++) {
      const [dx,dy]=directions[d]!,x=ix+dx,y=iy+dy,next=y*nx+x;
      if(x<0||x>=nx||y<0||y>=ys.length||!valid[next])continue;
      const q=point(next);
      if(!known[id] && isClearSegment(p,q,s,c))edges[id]!|=1<<d;
      if(edges[id]!&(1<<d))result.push({id:next,cost:Math.sqrt(dist2(p,q))});
    } known[id]=1;return result;
  };
  const idOf=(p:Point)=>{const x=xs.indexOf(p.x),y=ys.indexOf(p.y);return x<0||y<0?-1:y*nx+x;};
  const search=(start:Point)=>{
    const {distances,parents}=shortestPaths(n,idOf(start),valid,adjacent);
    const pathTo=(end:Point)=>{const endId=idOf(end);if(endId<0||!Number.isFinite(distances[endId]))return [];
      const path:Point[]=[];for(let id=endId;id>=0;id=parents[id]!)path.push(point(id));return path.reverse();};
    return { distances,parents,pathTo };
  };
  return { point,idOf,valid,n,search };
}
function simplify(path:Point[]):Point[] {
  const result:Point[]=[];
  for(const p of path){while(result.length>=2&&Math.abs(cross(result[result.length-2]!,result.at(-1)!,p))<EPS)result.pop();result.push(p);}return result;
}
export function analyze(s:SceneState,c:Conditions):Analysis {
  if(![s.bench.x,s.bench.y,s.ramp.ratio,c.minWidth,c.restLimit].every(Number.isFinite)||c.minWidth<=0||c.restLimit<=0||s.ramp.ratio<=0) throw new Error('几何及条件参数必须为有效正数');
  const benchAccess={x:s.bench.x+SCENE.benchWidth/2,y:s.bench.y+SCENE.benchDepth+c.minWidth/2+50};
  const graph=createGraph(s,c,benchAccess),fromStart=graph.search(SCENE.start),goalId=graph.idOf(SCENE.goal),seatId=graph.idOf(benchAccess);
  const geometric=Number.isFinite(fromStart.distances[goalId]);
  const explored:Point[]=[];let closest=graph.idOf(SCENE.start),closestD=Infinity;
  for(let id=0;id<graph.n;id++)if(Number.isFinite(fromStart.distances[id])){const p=graph.point(id);explored.push(p);const d=dist2(p,SCENE.goal);if(d<closestD){closestD=d;closest=id;}}
  let path=geometric?fromStart.pathTo(SCENE.goal):closest>=0?fromStart.pathTo(graph.point(closest)):[];
  let length=geometric?fromStart.distances[goalId]!:closest>=0?fromStart.distances[closest]!:0;
  if(!Number.isFinite(length))length=0;
  let legs=[length],stops:Point[]=[],reached=geometric;
  const minWidth=narrowestSection(s),ramp=checkRamp(s),accessibleSeat=seatId>=0&&!!graph.valid[seatId];
  let reason:Route['reason']=geometric?'ok':minWidth+EPS<c.minWidth?'width':c.stepFree&&!ramp.pass?'step':'geometry';
  if(geometric&&c.rest&&length>c.restLimit+EPS){
    if(accessibleSeat&&Number.isFinite(fromStart.distances[seatId])) {
      const fromSeat=graph.search(benchAccess),a=fromStart.distances[seatId]!,b=fromSeat.distances[goalId]!;
      if(Number.isFinite(b)&&Math.max(a,b)<length){path=[...fromStart.pathTo(benchAccess),...fromSeat.pathTo(SCENE.goal).slice(1)];legs=[a,b];length=a+b;stops=[benchAccess];}
    }
    reached=Math.max(...legs)<=c.restLimit+EPS;reason=reached?'ok':'rest';
  }
  return {route:{reached,geometric,path:simplify(path),length,legs,maxLeg:Math.max(...legs),stops,reason},
    minWidth,ramp,benchAccess,accessibleSeat,explored,nodeCount:graph.valid.reduce((a,b)=>a+b,0)};
}
