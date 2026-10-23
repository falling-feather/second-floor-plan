import {rectDistance2,shortestPaths} from './model.ts';
import type {Point,Rect} from './model.ts';
import {ROOM,availableDestinations,destinationPoint} from './space.ts';
import type {Layout} from './space.ts';
export interface SpaceRoute {reached:boolean;path:Point[];length:number;checked:number;diameter:number;reason:string}
function obstacles(layout:Layout):Rect[]{
  const result:Rect[]=layout.components.filter(c=>c.solid&&c.base<2000&&c.height>0);
  if(layout.platform)result.push({x:0,y:ROOM.platformDepth-1,w:ROOM.width,h:2});
  return result;
}
export function clearSegment(a:Point,b:Point,layout:Layout,radius:number):boolean{
  if([a,b].some(p=>p.x<radius-1e-6||p.x>ROOM.width-radius+1e-6||p.y<radius-1e-6||p.y>ROOM.depth-radius+1e-6))return false;
  return obstacles(layout).every(o=>rectDistance2(a,b,o)+1e-6>=radius*radius);
}
const cache=new Map<string,ReturnType<typeof buildGraph>>();
function buildGraph(layout:Layout,diameter:number){
  const r=diameter/2,obs=obstacles(layout),targetPoints=[ROOM.entrance,...availableDestinations(layout).map(d=>destinationPoint(layout,d.id)),...layout.reserved];
  const unique=(a:number[],max:number)=>[...new Set(a.filter(v=>v>=r&&v<=max-r))].sort((a,b)=>a-b);
  const xs=unique([...Array.from({length:76},(_,i)=>i*ROOM.grid),...targetPoints.map(p=>p.x),...obs.flatMap(o=>[o.x-r,o.x+o.w+r,o.x+r,o.x+o.w-r])],ROOM.width);
  const ys=unique([...Array.from({length:61},(_,i)=>i*ROOM.grid),...targetPoints.map(p=>p.y),...obs.flatMap(o=>[o.y-r,o.y+o.h+r,o.y+r,o.y+o.h-r])],ROOM.depth);
  const nx=xs.length,n=nx*ys.length,valid=new Uint8Array(n),known=new Uint8Array(n),edges=new Uint8Array(n);
  const point=(i:number):Point=>({x:xs[i%nx]!,y:ys[Math.floor(i/nx)]!});
  const clear=(a:Point,b:Point)=>obs.every(o=>rectDistance2(a,b,o)+1e-6>=r*r);
  for(let i=0;i<n;i++){const p=point(i);if(clear(p,p))valid[i]=1;}
  const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]] as const;
  const neighbors=(i:number)=>{
    const out:{id:number;cost:number}[]=[],x=i%nx,y=Math.floor(i/nx),p=point(i);
    for(let k=0;k<8;k++){const [dx,dy]=dirs[k]!,xx=x+dx,yy=y+dy,j=yy*nx+xx;
      if(xx<0||xx>=nx||yy<0||yy>=ys.length||!valid[j])continue;const q=point(j);
      if(!known[i]&&clear(p,q))edges[i]!|=1<<k;
      if(edges[i]!&(1<<k))out.push({id:j,cost:Math.hypot(q.x-p.x,q.y-p.y)});
    }known[i]=1;return out;
  };
  const idOf=(p:Point)=>{const x=xs.indexOf(p.x),y=ys.indexOf(p.y);return x<0||y<0?-1:y*nx+x;};
  const {distances,parents}=shortestPaths(n,idOf(ROOM.entrance),valid,neighbors);
  return {point,idOf,distances,parents,checked:valid.reduce((a,b)=>a+b,0),n};
}
export function spaceRoute(layout:Layout,target:Point,diameter=900):SpaceRoute{
  if(!Number.isFinite(diameter)||diameter<=0)throw new Error('包络直径必须为正数');
  const key=JSON.stringify([layout.scheme,layout.mode,diameter,obstacles(layout)]);
  let graph=cache.get(key);if(!graph){graph=buildGraph(layout,diameter);cache.set(key,graph);if(cache.size>8)cache.delete(cache.keys().next().value!);}
  let id=graph.idOf(target);const reached=id>=0&&Number.isFinite(graph.distances[id]);
  if(!reached){let best=Infinity;id=-1;for(let i=0;i<graph.n;i++)if(Number.isFinite(graph.distances[i])){const p=graph.point(i),d=Math.hypot(p.x-target.x,p.y-target.y);if(d<best){id=i;best=d;}}}
  const length=id>=0?graph.distances[id]!:0,path:Point[]=[];
  for(let i=id;i>=0;i=graph.parents[i]!)path.push(graph.point(i));path.reverse();
  const simple:Point[]=[];for(const p of path){while(simple.length>=2){const a=simple.at(-2)!,b=simple.at(-1)!;if(Math.abs((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x))>1e-6)break;simple.pop();}simple.push(p);}
  return {reached,path:simple,length,checked:graph.checked,diameter,reason:reached?'所选圆形包络在图示路网中到达':layout.platform&&target.y<ROOM.platformDepth?'180mm地台阻断了连续通行':target.x>11500&&layout.doorWidth<diameter?'门口小于所选包络直径':'本几何路网中未找到完整连接'};
}
