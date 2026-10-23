import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLayout,DETAILS,ROOM} from '../src/space.ts';
import {makeSpace,disposeSpace} from '../dist/src/space-model.js';

test('条光漫射面内退12mm，吊杆连接顶面或软质板底，图示不再是悬空整块',()=>{
 const layout=createLayout(),scene=makeSpace(layout);scene.updateMatrixWorld(true);
 for(const light of layout.components.filter(c=>c.kind==='light')){
  const object=scene.getObjectByName(light.id),diffuser=object.getObjectByName('Luminaire diffuser');
  assert.ok(Math.abs(new THREE.Box3().setFromObject(diffuser).min.y*1000-light.base-DETAILS.lightRecess)<.01);
  assert.ok(object.children.filter(o=>o.name==='Luminaire hanger').length===2);
  const top=(light.id==='light-table'||light.id==='light-family')?2800:ROOM.height;
  assert.ok(Math.abs(new THREE.Box3().setFromObject(object).max.y*1000-top)<.01);
 }
 disposeSpace(scene);
});
