import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLayout,layoutFacts,destinationPoint,withOccupiedParking} from '../src/space.ts';
import {makeSpace,disposeSpace} from '../dist/src/space-model.js';
import {planSVG} from '../dist/src/drawings.js';
import {spaceRoute} from '../src/space-analysis.ts';

test('共读桌、临窗桌与低位服务采用有尺寸的圆角边，图纸读取同一半径',()=>{
 const layout=createLayout();
 const shared=layout.components.find(c=>c.id==='shared-table');
 assert.equal(shared.cornerRadius,160);
 for(const id of ['window-desk','low-counter','child-table'])assert.ok(layout.components.find(c=>c.id===id).cornerRadius>0,id);
 assert.ok(planSVG(layout).includes('rx="160"'));
});

test('桌面圆角落实到实际网格，端角退让而中央停靠界面保留',()=>{
 const layout=createLayout(),c=layout.components.find(c=>c.id==='shared-table'),scene=makeSpace(layout);scene.updateMatrixWorld(true);
 const top=scene.getObjectByName('shared-table').getObjectByName('Tabletop');
 const hits=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x/1000,2,z/1000),new THREE.Vector3(0,-1,0)).intersectObject(top).length;
 assert.equal(hits(c.x+20,c.y+20),0);
 assert.equal(hits(c.x+44,c.y+44),0,'R160应为圆弧，不用二次曲线替代不同轮廓');
 assert.ok(hits(c.x+50,c.y+50)>0);
 assert.ok(hits(c.x+20,c.y+c.h/2)>0);disposeSpace(scene);
});

test('陪伴托台占用0.30平方米，实体席位与已有停靠数量不被虚增',()=>{
 const layout=createLayout(),ledge=layout.components.find(c=>c.id==='family-ledge');assert.ok(ledge);
 assert.equal(ledge.w*ledge.h/1e6,.3);assert.equal(ledge.height,740);assert.equal(ledge.seats,undefined);
 assert.deepEqual([layoutFacts(layout).seats,layoutFacts(layout).reserved],[24,3]);
 const p=destinationPoint(layout,'family');assert.equal(spaceRoute(withOccupiedParking(layout,p),p,900).reached,true);
});

test('活动收拢保留同一块R160桌面，圆角随桌面竖起而非改变储存底座',()=>{
 const layout=createLayout('proposed','gathering'),c=layout.components.find(c=>c.id==='shared-table'),scene=makeSpace(layout);scene.updateMatrixWorld(true);
 const top=scene.getObjectByName('shared-table').getObjectByName('Folded tabletop');
 const hits=(x,height)=>new THREE.Raycaster(new THREE.Vector3((c.x+x)/1000,height/1000,(c.y-100)/1000),new THREE.Vector3(0,0,1)).intersectObject(top).length;
 assert.equal(hits(20,20),0);assert.ok(hits(1200,600)>0);assert.ok(!planSVG(layout).match(/data-component="shared-table"><rect[^>]+rx="160"/));disposeSpace(scene);
});
