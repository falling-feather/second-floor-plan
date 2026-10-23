import test from 'node:test';
import assert from 'node:assert/strict';
import {createLayout} from '../src/space.ts';
import {sightline,sightlineStudy,companionStudy,FAMILY_SIGHTLINE,LIVING_SCENES} from '../src/living-study.ts';

test('公共厅到亲子角的同一假设视线：高架阻断，退边后保留可见联系',()=>{
 const s=sightlineStudy();assert.equal(s.before.clear,false);assert.equal(s.before.hits[0].id,'blocking-shelf');assert.equal(s.after.clear,true);
 assert.deepEqual(s.before.from,s.after.from);assert.deepEqual(s.before.to,s.after.to);
});
test('视线检查区分平面位置和高度，新增屏风会产生真实阻挡',()=>{
 const layout=createLayout(),screen={};
 Object.assign(screen,{id:'test-screen',name:'测试屏风',kind:'wall',x:4500,y:7500,w:400,h:600,base:0,height:2000,solid:true,material:'plaster'});
 layout.components.push(screen);assert.equal(sightline(layout,FAMILY_SIGHTLINE.from,FAMILY_SIGHTLINE.to).clear,false);
 screen.base=2000;screen.height=500;assert.equal(sightline(layout,FAMILY_SIGHTLINE.from,FAMILY_SIGHTLINE.to).clear,true);
});
test('托台取舍只增删托台及其物件，通路仍在占用条件下到达',()=>{
 const s=companionStudy();assert.equal(s.addedEnvelopeArea,.3);assert.equal(s.before.route.reached,true);assert.equal(s.after.route.reached,true);
 assert.equal(s.after.layout.components.length-s.before.layout.components.length,2);
 for(const c of s.before.layout.components)assert.deepEqual(s.after.layout.components.find(a=>a.id===c.id),c);
 assert.equal(LIVING_SCENES.length,4);
});
