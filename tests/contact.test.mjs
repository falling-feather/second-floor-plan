import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLayout} from '../dist/src/space.js';
import {makeSpace,disposeSpace} from '../dist/src/space-model.js';
import {inspectContacts} from '../dist/src/contact-study.js';

test('洗手盆可触台面含盆口，不能用台板800掩盖高出目标的盆沿',()=>{
 const scene=makeSpace(createLayout());scene.updateMatrixWorld(true);
 const sink=scene.getObjectByName('sink');
 const tops=sink.children.filter(o=>['Basin counter','Basin inset','Basin rim'].includes(o.name)).map(o=>new THREE.Box3().setFromObject(o).max.y*1000);
 assert.ok(Math.max(...tops)<=800.01,`actual rim ${Math.max(...tops)}mm`);disposeSpace(scene);
});

test('现状服务台保留站立与封闭柜体，改造后低位段开放台下，不能把相同构件当改造',()=>{
 const before=createLayout('existing').components.find(c=>c.id==='low-counter');
 const after=createLayout().components.find(c=>c.id==='low-counter');
 assert.ok(before.height>850);assert.equal(before.openBelow,false);
 assert.equal(after.height,740);assert.equal(after.openBelow,true);
});


test('台下净空检查读取真实网格，五处目标体积没有桌脚、柜体或邻近构件侵入',()=>{
 const layout=createLayout(),scene=makeSpace(layout),checks=inspectContacts(layout,scene);
 assert.equal(checks.length,5);
 for(const c of checks){assert.equal(c.clear,true,c.name+': '+c.collisions.join(','));assert.equal(c.surfaceWithinTarget,true,c.name);}
 const original=checks.find(c=>c.id==='table-west');
 const blocker=new THREE.Mesh(new THREE.BoxGeometry(.1,.2,.1),new THREE.MeshBasicMaterial());blocker.name='Unexpected bracket';
 blocker.position.set((original.volume.x+200)/1000,.3,(original.volume.y+300)/1000);scene.add(blocker);
 assert.equal(inspectContacts(layout,scene).find(c=>c.id==='table-west').clear,false);disposeSpace(scene);
});

test('现状柜台和洗手台的台下封闭体会被检查识别，不因路径到达而显示可用',()=>{
 const layout=createLayout('existing'),scene=makeSpace(layout),checks=inspectContacts(layout,scene);
 assert.equal(checks.find(c=>c.id==='service').clear,false);
 assert.equal(checks.find(c=>c.id==='service').surfaceWithinTarget,false);
 assert.equal(checks.find(c=>c.id==='wash').clear,false);disposeSpace(scene);
});


test('坐便器座圈上缘为450，抓杆水平中心750，两侧类型与概念节点一致',()=>{
 const layout=createLayout(),scene=makeSpace(layout);scene.updateMatrixWorld(true);
 const wc=scene.getObjectByName('toilet');
 const ring=wc.children.find(o=>o.geometry?.type==='TorusGeometry');
 assert.ok(Math.abs(new THREE.Box3().setFromObject(ring).max.y*1000-450)<.01);
 const fixed=scene.getObjectByName('wc-rail-fixed');
 const arm=fixed.getObjectByName('L rail horizontal arm'),box=new THREE.Box3().setFromObject(arm);
 assert.ok(Math.abs((box.min.y+box.max.y)*500-750)<.01);
 assert.ok(Math.abs(new THREE.Box3().setFromObject(fixed).max.y*1000-1500)<.01);
 assert.equal(layout.components.filter(c=>c.kind==='rail').length,2);disposeSpace(scene);
});


test('壁挂盆、镜面与上翻抓杆连接到保留墙面，不能悬在未建模的空隙中',()=>{
 const layout=createLayout(),sink=layout.components.find(c=>c.id==='sink'),mirror=layout.components.find(c=>c.id==='wc-mirror'),rail=layout.components.find(c=>c.id==='wc-rail-fold');
 const east=layout.components.find(c=>c.id==='wall-east'),back=layout.components.find(c=>c.id==='wet-partition');
 assert.equal(sink.x+sink.w,east.x);assert.equal(mirror.x+mirror.w,east.x);assert.equal(rail.y+rail.h,back.y);
});
