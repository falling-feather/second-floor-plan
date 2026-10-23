import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createLayout} from '../src/space.ts';

test('GLB可回读，完整构件尺寸及米制坐标与设计数据一致',async()=>{
  const bytes=readFileSync(new URL('../output/design/community-reading-room.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  assert.equal(gltf.scenes.length,1);
  assert.equal(gltf.scene.children[0].userData.units,'metres');
  assert.equal(gltf.scene.children[0].userData.fictionalSite,true);
  const slab=gltf.scene.getObjectByName('Floor_slab');assert.ok(slab);
  assert.ok(Math.abs(new Box3().setFromObject(slab).max.y+.008)<1e-6,'基层与8mm面层分离，避免两张共面的表面互相遮挡');
  const layout=createLayout();
  for(const id of ['shared-table','window-desk','column-1','wall-east','east-shelf','wc-door-leaf','north-lintel']){
    const source=layout.components.find(c=>c.id===id),object=gltf.scene.getObjectByName(id);
    assert.ok(object,id);assert.deepEqual(object.userData.dimensionsMm,[source.w,source.h,source.height]);
    const bounds=new Box3().setFromObject(object),size=bounds.getSize(new Vector3());
    for(const [a,b] of [[size.x,source.w/1000],[size.y,source.height/1000],[size.z,source.h/1000],[bounds.min.x,source.x/1000],[bounds.min.y,source.base/1000],[bounds.min.z,source.y/1000]])assert.ok(Math.abs(a-b)<1e-5,id);
  }
  assert.ok(gltf.scene.getObjectByName('Ceiling_-_hide_for_interior_inspection'));
});
