import test from 'node:test';
import assert from 'node:assert/strict';
import {rectangleUnionArea,studyResults,modeStudy,tablePositionStudy} from '../src/space-study.ts';
import {createLayout,withSharedTablePosition,SHARED_TABLE} from '../src/space.ts';
test('空间占地以矩形并集计算，重叠不重复计量',()=>assert.equal(rectangleUnionArea([{x:0,y:0,w:2,h:2},{x:1,y:0,w:2,h:2}]),6));
test('比较方案保留实际代价，不给失去亲子设施的方案伪造目的地',()=>{
  const [seats,open,balanced]=studyResults();assert.equal(seats.facts.seats,31);assert.equal(seats.family,false);assert.ok(!seats.routes.some(r=>r.id==='family'));
  assert.equal(open.facts.seats,24);assert.equal(open.glazedArea,0);assert.equal(balanced.facts.seats,24);assert.ok(balanced.glazedArea>40);assert.ok(balanced.routes.every(r=>r.reached));
});
test('活动转换释放的4.38平方米来自同一批桌椅的真实移动',()=>assert.ok(Math.abs(modeStudy().freedFootprint-4.38)<1e-8));
test('局部推敲只移动桌组与使用位置，保留建筑、灯具和原状态',()=>{
  const before=createLayout(),moved=withSharedTablePosition(before,6400);
  for(const id of ['quiet-screen-west','column-1','sink','light-table'])assert.deepEqual(before.components.find(c=>c.id===id),moved.components.find(c=>c.id===id));
  assert.equal(before.components.find(c=>c.id==='shared-table').x,SHARED_TABLE.x);
  assert.equal(moved.reserved.find(p=>p.id==='table-west').x,5800);
  assert.throws(()=>withSharedTablePosition(before,6300));assert.throws(()=>withSharedTablePosition(createLayout('proposed','gathering'),7000));
});
test('单变量移桌实验在相同边界下比较占用路径，深化桌位减少绕行',()=>{
  const samples=tablePositionStudy();assert.equal(samples[0].aisleWidthMm,0);assert.equal(samples.at(-1).aisleWidthMm,1300);
  assert.ok(samples.every(s=>s.empty.reached&&s.occupied.reached));assert.ok(samples[0].occupied.length>samples.at(-1).occupied.length+500);
});
