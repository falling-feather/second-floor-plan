import test from 'node:test';
import assert from 'node:assert/strict';
import {createLayout,ROOM,ZONES,DESTINATIONS,layoutFacts,availableDestinations,floorPanels,parkingRect,destinationPoint,withOccupiedParking} from '../src/space.ts';
import {spaceRoute,clearSegment} from '../src/space-analysis.ts';

test('180平方米功能分区无重叠且覆盖完整场地',()=>{
  assert.equal(ZONES.reduce((s,r)=>s+r.w*r.h,0),ROOM.width*ROOM.depth);
  for(let i=0;i<ZONES.length;i++)for(let j=i+1;j<ZONES.length;j++){
    const a=ZONES[i],b=ZONES[j];assert.ok(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y));
  }
});
test('改造前后保留框架和湿区位置，不虚构建筑扩大',()=>{
  const a=createLayout('existing'),b=createLayout();
  for(const id of ['column-1','column-2','beam','wet-n','wet-partition'])assert.deepEqual(a.components.find(x=>x.id===id),b.components.find(x=>x.id===id));
  assert.equal(layoutFacts(b).seats,24);assert.equal(layoutFacts(b).reserved,3);
});
test('原状地台阻断临窗位，改造统一标高后可达',()=>{
  assert.equal(spaceRoute(createLayout('existing'),destinationPoint(createLayout(),'window'),900).reached,false);
  assert.equal(spaceRoute(createLayout(),destinationPoint(createLayout(),'window'),900).reached,true);
});
test('卫生间门口800mm与1100mm分别影响900mm包络路径',()=>{
  assert.equal(spaceRoute(createLayout('existing'),destinationPoint(createLayout(),'wc'),900).reached,false);
  assert.equal(spaceRoute(createLayout(),destinationPoint(createLayout(),'wc'),900).reached,true);
});
test('所有设计目的地的路径实际到达且不穿墙柱家具',()=>{
  const l=createLayout();
  for(const target of DESTINATIONS){const point=destinationPoint(l,target.id),r=spaceRoute(l,point,900);assert.equal(r.reached,true,target.name);
    assert.deepEqual(r.path.at(-1),point);let length=0;
    for(let i=1;i<r.path.length;i++){assert.equal(clearSegment(r.path[i-1],r.path[i],l,450),true);length+=Math.hypot(r.path[i].x-r.path[i-1].x,r.path[i].y-r.path[i-1].y);}
    assert.ok(Math.abs(length-r.length)<1e-6);
  }
});
test('家具未越界或穿入保留柱，预留停靠位置在本几何模型内可用',()=>{
  for(const mode of ['reading','gathering']){const l=createLayout('proposed',mode),columns=l.components.filter(x=>x.kind==='column');
    for(const f of l.components.filter(x=>!['wall','column','beam'].includes(x.kind))){assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=ROOM.width&&f.y+f.h<=ROOM.depth,f.id);
      for(const c of columns)assert.ok(!(f.x<c.x+c.w&&f.x+f.w>c.x&&f.y<c.y+c.h&&f.y+f.h>c.y),f.id+' overlaps column');}
  }
  const l=createLayout();for(const p of l.reserved)assert.equal(clearSegment(p,p,l,450),true);
});
test('活动模式保留实际家具，桌组收拢后仍能到达核心空间',()=>{
  const l=createLayout('proposed','gathering');assert.equal(l.components.find(x=>x.id==='shared-table').kind,'folded');
  assert.equal(spaceRoute(l,destinationPoint(createLayout(),'wc'),900).reached,true);assert.equal(spaceRoute(l,destinationPoint(createLayout(),'window'),900).reached,true);
});
test('活动模式的收纳椅不计入可同时使用的实体席位',()=>{
  const layout=createLayout('proposed','gathering');assert.equal(layoutFacts(layout).seats,18);
  assert.equal(availableDestinations(layout).some(d=>d.id==='table'),false);
  assert.equal(availableDestinations(createLayout()).some(d=>d.id==='table'),true);
});
test('现状没有收拢方案，布局模式始终反映日常状态',()=>{
  assert.equal(createLayout('existing','gathering').mode,'reading');
});
test('静读区有独立界面且门口保留1500mm，使用模式不取消该界面',()=>{
  for(const mode of ['reading','gathering']){
    const layout=createLayout('proposed',mode),screens=layout.components.filter(c=>c.id.startsWith('quiet-screen'));
    assert.equal(screens.length,2);assert.equal(screens[1].x-(screens[0].x+screens[0].w),1500);
    assert.ok(screens.every(c=>c.height===3200&&c.solid));
  }
});
test('桌端停靠方向与窗边不同，朝向信息不会在模型图纸中丢失',()=>{
  assert.deepEqual(createLayout().reserved.map(p=>p.facing),['north','east','west']);
});
test('平接地材与主地坪不重叠，拼接后覆盖相同面积',()=>{
  const layout=createLayout(),finish=layout.components.find(c=>c.kind==='rug'),panels=floorPanels(layout);
  assert.equal(panels.reduce((sum,r)=>sum+r.w*r.h,finish.w*finish.h),(ROOM.width+ROOM.wall*2)*(ROOM.depth+ROOM.wall*2));
  for(const r of panels)assert.ok(!(r.x<finish.x+finish.w&&r.x+r.w>finish.x&&r.y<finish.y+finish.h&&r.y+r.h>finish.y));
});
test('洗手台前另有可达位置，不能只用卫生间门口到达代替设施可用',()=>{
  const layout=createLayout();assert.equal(spaceRoute(layout,destinationPoint(layout,'wash'),900).reached,true);
});
test('共享桌西端停靠位与保留柱之间留出至少1200mm通行，不能把预留位画在主通道里',()=>{
  const layout=createLayout(),parking=parkingRect(layout.reserved.find(p=>p.id==='table-west')),column=layout.components.find(c=>c.id==='column-1');
  assert.ok(parking.x-(column.x+column.w)>=1200);
});
test('使用目的不变，台前目的地随移动后的设施更新',()=>{
  const before=createLayout('existing'),after=createLayout();
  assert.deepEqual(destinationPoint(before,'table'),{x:5800,y:5200});assert.deepEqual(destinationPoint(after,'table'),{x:7100,y:5200});
  assert.equal(spaceRoute(before,destinationPoint(before,'table'),900).reached,true);
  assert.deepEqual(destinationPoint(before,'wash'),{x:14400,y:9350});assert.deepEqual(destinationPoint(after,'wash'),{x:13800,y:8700});
});
test('其他停靠位置按占用检查时仍可到达，临窗主通行不因停靠明显绕行',()=>{
  const layout=createLayout();
  for(const target of availableDestinations(layout)){
    const point=destinationPoint(layout,target.id),occupied=withOccupiedParking(layout,point),r=spaceRoute(occupied,point,900);
    assert.equal(r.reached,true,target.name);
    for(let i=1;i<r.path.length;i++)assert.equal(clearSegment(r.path[i-1],r.path[i],occupied,450),true);
    if(target.id==='window')assert.ok(r.length<=spaceRoute(layout,point,900).length+ROOM.grid);
  }
  assert.equal(layout.components.some(c=>c.kind==='envelope'),false);
});
