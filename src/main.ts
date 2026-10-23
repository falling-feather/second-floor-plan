import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createLayout,ROOM,ZONES,MATERIALS,DESTINATIONS,INTERVENTIONS,layoutFacts,availableDestinations,destinationPoint,withOccupiedParking,withSharedTablePosition,SHARED_TABLE,ORIGINAL_SHARED_TABLE} from './space.js';
import type {Scheme,UseMode} from './space.js';
import {makeSpace,disposeSpace} from './space-model.js';
import {planSVG,sectionSVG,nodeSVG,contactSVG} from './drawings.js';
import {inspectContacts} from './contact-study.js';
import {spaceRoute} from './space-analysis.js';
import type {SpaceRoute} from './space-analysis.js';
import {studySummaries,modeStudy,columnSideAisle} from './space-study.js';
import {LIVING_SCENES,FAMILY_SIGHTLINE,sightline} from './living-study.js';
import type {LivingScene,HeightPoint} from './living-study.js';
function el<T extends HTMLElement=HTMLElement>(id:string):T{const e=document.getElementById(id);if(!e)throw new Error(`Missing ${id}`);return e as T;}
let scheme:Scheme='proposed',mode:UseMode='reading',zones=false,nodeId='table',view='axon';
let targetIndex=0,diameter=900,occupiedParking=true,showAnalysis=true;
let tableX:number=SHARED_TABLE.x,positionFrame:number|undefined,activeLiving:LivingScene['id']|null=null;
let sceneCamera:LivingScene['camera']|null=null,currentRoute:SpaceRoute|undefined,currentAnalysisLayout:ReturnType<typeof createLayout>|undefined;
function currentLayout(which:Scheme=scheme){const layout=createLayout(which,mode);return which==='proposed'&&mode==='reading'?withSharedTablePosition(layout,tableX):layout;}
function tablePositionLabel(){const table=currentLayout().components.find(c=>c.id==='shared-table')!;return table.kind==='table'?table.x:'folded';}
const stage=el('model-stage'),canvas=el<HTMLCanvasElement>('space-canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene(),sky=new THREE.HemisphereLight('#fff8e5','#9f9e8f',2);scene.add(sky);
const sun=new THREE.DirectionalLight('#fff3dc',3.4);sun.position.set(-4,17,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-17;sun.shadow.camera.right=17;sun.shadow.camera.top=17;sun.shadow.camera.bottom=-17;sun.shadow.normalBias=.02;sun.shadow.bias=-.0002;scene.add(sun);sun.target.position.set(7,0,6);scene.add(sun.target);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.ShadowMaterial({color:'#5e614e',opacity:.17}));ground.rotation.x=-Math.PI/2;ground.position.set(7.5,-.165,6);ground.receiveShadow=true;scene.add(ground);
let camera:THREE.OrthographicCamera|THREE.PerspectiveCamera=new THREE.OrthographicCamera(-12,12,9,-9,.1,200);
let controls=new OrbitControls(camera,canvas),model=new THREE.Group(),analysis=new THREE.Group();scene.add(model,analysis);
let initialized=false;
function frame(){
 const layout=currentLayout();
 for(const b of el('model-pins').querySelectorAll<HTMLButtonElement>('button')){const p=INTERVENTIONS.find(p=>p.id===b.dataset.node)!,point=p.id==='table'&&scheme==='proposed'&&mode==='reading'?destinationPoint(layout,'table'):p.point;const v=new THREE.Vector3(point.x/1000,.35,point.y/1000).project(camera);b.style.left=`${(v.x+1)*50}%`;b.style.top=`${(1-v.y)*50}%`;b.hidden=view==='eye'||view==='scene'||Math.abs(v.x)>.97||Math.abs(v.y)>.95;}
 renderer.render(scene,camera);
}
function size(){
 const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);
 if(camera instanceof THREE.OrthographicCamera){
  if(view==='scene'&&sceneCamera?.kind==='orthographic'){const hh=Math.max(sceneCamera.verticalSpan,sceneCamera.minHorizontalSpan*h/w)/2;camera.left=-hh*w/h;camera.right=hh*w/h;camera.top=hh;camera.bottom=-hh;}
  else {
   camera.updateMatrixWorld(true);model.updateMatrixWorld(true);const projected=new THREE.Box3();
   model.traverse(object=>{if(!(object instanceof THREE.Mesh))return;if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();const box=object.geometry.boundingBox!;
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])projected.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(object.matrixWorld).applyMatrix4(camera.matrixWorldInverse));
   });
   const center=projected.getCenter(new THREE.Vector3()),hh=Math.max((projected.max.y-projected.min.y)*.56,(projected.max.x-projected.min.x)*.56/(w/h));
   camera.left=center.x-hh*w/h;camera.right=center.x+hh*w/h;camera.top=center.y+hh;camera.bottom=center.y-hh;
  }
 }else camera.aspect=w/h;
 camera.updateProjectionMatrix();frame();
}
function rebuildModel(){scene.remove(model);disposeSpace(model);model=makeSpace(currentLayout(),view==='axon'||view==='top');scene.add(model);frame();}
function preset(next:string){
 view=next;controls.dispose();const aspect=stage.clientWidth/stage.clientHeight;
 if(next==='scene'){
  if(!sceneCamera)throw new Error('生活场景缺少视点');
  camera=sceneCamera.kind==='perspective'?new THREE.PerspectiveCamera(sceneCamera.fov,aspect,.05,150):new THREE.OrthographicCamera(-2,2,1,-1,.05,150);
  camera.position.fromArray(sceneCamera.position);controls=new OrbitControls(camera,canvas);controls.target.fromArray(sceneCamera.target);controls.maxPolarAngle=Math.PI*.65;
 }else if(next==='eye'){camera=new THREE.PerspectiveCamera(62,aspect,.08,150);camera.position.set(6,1.65,10.9);controls=new OrbitControls(camera,canvas);controls.target.set(7.4,1.1,3.4);controls.maxPolarAngle=Math.PI*.6;}
 else {camera=new THREE.OrthographicCamera(-9*aspect,9*aspect,9,-9,.1,200);camera.position.set(next==='top'?7.5:24,next==='top'?34:23,next==='top'?6.01:27);controls=new OrbitControls(camera,canvas);controls.target.set(7.5,.6,6);controls.maxPolarAngle=Math.PI/2.05;}
 controls.minZoom=.7;controls.maxZoom=3;controls.enableDamping=false;controls.addEventListener('change',frame);controls.update();
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 el('view-description').textContent=next==='scene'?(sceneCamera?.kind==='orthographic'?'节点正投影 / 概念视点':'生活近景 / 概念视点'):next==='eye'?'人视透视 / 图示光照':next==='top'?'俯视剖切 / 同源几何':'剖切轴测 / 同源几何';rebuildModel();size();
}
function updateSceneStrip(){
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-living]')){const active=b.dataset.living===activeLiving;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
 const living=LIVING_SCENES.find(s=>s.id===activeLiving);el('living-status').textContent=living?`${scheme==='existing'?'现状对读':'生活设定'} / ${living.label}`:'整体空间 / 概念场地';
}
function setNode(id:string){
 nodeId=id;const item=INTERVENTIONS.find(p=>p.id===id);if(!item)throw new Error('未知设计节点');
 const living=LIVING_SCENES.find(s=>s.id===activeLiving&&s.node===id);
 el('node-number').textContent=item.number;el('node-title').textContent=living?living.title:item.title;
 el('node-short').textContent=scheme==='existing'?'现状几何对读；改造尺寸与设计边界见说明。':living?living.action:mode==='gathering'&&id==='table'?'桌组与六张椅子收纳到东侧，保留中央活动范围。':item.short;
 const detail=id==='table'&&scheme==='proposed'&&mode==='reading'&&tableX!==SHARED_TABLE.x?`当前为临时桌位推敲。柱侧独立带${columnSideAisle(currentLayout())}mm，建筑界面和灯具不动。深化桌位${SHARED_TABLE.x}mm。`:item.detail;
 el('node-detail').textContent=(living?living.judgment+'\n\n':'')+detail;el('node-detail-title').textContent=el('node-title').textContent;
 document.querySelectorAll<HTMLButtonElement>('[data-node]').forEach(b=>b.classList.toggle('active',b.dataset.node===id));
}
function chooseNode(id:string){activeLiving=null;if(view==='scene'||view==='eye')preset('axon');updateSceneStrip();setNode(id);refreshAnalysis();}
const heightVector=(p:HeightPoint)=>new THREE.Vector3(p.x/1000,p.height/1000,p.y/1000);
function clearAnalysis(){scene.remove(analysis);disposeSpace(analysis);analysis=new THREE.Group();analysis.name='Analysis overlays - not physical furniture';scene.add(analysis);}
function refreshAnalysis(){
 clearAnalysis();
 if(showAnalysis&&currentRoute&&currentAnalysisLayout){
  const color=currentRoute.reached?'#466651':'#a46543';
  if(currentRoute.path.length>1){const positions=currentRoute.path.map(p=>new THREE.Vector3(p.x/1000,.018,p.y/1000));const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(positions),new THREE.LineBasicMaterial({color}));line.name='Computed route centreline';analysis.add(line);}
  for(const c of currentAnalysisLayout.components.filter(c=>c.kind==='envelope')){
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(c.w/1000,c.h/1000),new THREE.MeshBasicMaterial({color:'#a46543',transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set((c.x+c.w/2)/1000,.008,(c.y+c.h/2)/1000);analysis.add(mesh);
   const pts=[[c.x,c.y],[c.x+c.w,c.y],[c.x+c.w,c.y+c.h],[c.x,c.y+c.h],[c.x,c.y]].map(([x,z])=>new THREE.Vector3(x!/1000,.012,z!/1000));analysis.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#a46543'})));
  }
  const end=currentRoute.path.at(-1);if(end){const mark=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),new THREE.MeshBasicMaterial({color}));mark.position.set(end.x/1000,.035,end.y/1000);analysis.add(mark);}
  if(activeLiving==='family'){
   const result=sightline(currentLayout(),FAMILY_SIGHTLINE.from,FAMILY_SIGHTLINE.to),start=heightVector(result.from),end=heightVector(result.to),hit=result.hits[0];
   analysis.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([start,hit?heightVector(hit.point):end]),new THREE.LineBasicMaterial({color:result.clear?'#887545':'#a46543'})));
   if(hit){const rest=new THREE.Line(new THREE.BufferGeometry().setFromPoints([heightVector(hit.point),end]),new THREE.LineDashedMaterial({color:'#9b9b8c',dashSize:.09,gapSize:.08}));rest.computeLineDistances();analysis.add(rest);}
  }
 }
 el('analysis-caption').textContent=!showAnalysis?'仅空间模型 / 图示光照':!currentRoute?'桌位预览 / 松开后重算':activeLiving==='family'?'中心路径＋1.55→0.85m假设视线':'中心路径＋停靠占用假设';frame();
}
function updateRoutes(){
 const target=DESTINATIONS[targetIndex]!;
 for(const which of ['existing','proposed'] as const){const base=currentLayout(which),point=destinationPoint(base,target.id),layout=occupiedParking?withOccupiedParking(base,point):base,route=spaceRoute(layout,point,diameter),prefix=which==='existing'?'before':'after';
  el(`${prefix}-route`).innerHTML=planSVG(layout,route);el(`${prefix}-result`).textContent=route.reached?`模型到达 · ${(route.length/1000).toFixed(2)}m`:`可行前段 · ${(route.length/1000).toFixed(2)}m`;
  el(`${prefix}-result`).classList.toggle('reached',route.reached);el(`${prefix}-explanation`).textContent=route.reason+'。'+(route.reached?'图示圆形包络结果；圆角家具仍按包围矩形保守检查。':'折线未到达目标。');
  if(which===scheme)el('table-route-status').textContent=`${target.name} ${(route.length/1000).toFixed(2)}m · ${which==='existing'?'现状／无预留位':occupiedParking?'其他位占用':'预留位空置'} · ${route.reached?'模型到达':'可行前段'}`;
  if(which===scheme){currentRoute=route;currentAnalysisLayout=layout;}
 }
 updateRouteContext(true);refreshAnalysis();
}
function updateRouteContext(ready:boolean){
 el('route-context').textContent=ready?`${mode==='reading'?'日常共读':'活动收拢'} · ${DESTINATIONS[targetIndex]!.name} · ${diameter}mm圆形包络 · ${occupiedParking?'改造停靠位按占用，目标留空':'改造预留位空置'} · ${mode==='reading'?`改造桌位${tableX}mm`:'改造桌组已收拢'}`:'桌位正在预览，松开后重算；旧路线已清除。';
 document.querySelectorAll<HTMLButtonElement>('[data-open-route]').forEach(b=>b.disabled=!ready);
}
function render(routes=true){
 const layout=currentLayout(),facts=layoutFacts(layout);rebuildModel();
 el('master-plan').innerHTML=planSVG(layout,undefined,zones,true);el('section-drawing').innerHTML=sectionSVG(layout);el('node-drawing').innerHTML=nodeSVG(createLayout('proposed',mode));el('contact-drawing').innerHTML=contactSVG(inspectContacts(layout,model));
 el('seat-count').textContent=`${facts.seats}个实体座位 · ${facts.reserved}个预留停靠位`;
 el('mode-note').textContent=scheme==='existing'?'现状布置 / 概念场地设定':mode==='reading'?'日常共读 / 同桌使用与独立通行':'活动收拢 / 六张收纳椅退出同时使用席位';
 document.querySelectorAll<HTMLButtonElement>('[data-scheme]').forEach(b=>b.classList.toggle('active',b.dataset.scheme===scheme));
 document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.disabled=scheme==='existing';});
 document.querySelectorAll<HTMLButtonElement>('[data-zones]').forEach(b=>b.classList.toggle('active',b.dataset.zones===String(zones)));
 const available=availableDestinations(createLayout('proposed',mode));if(!available.some(d=>d.id===DESTINATIONS[targetIndex]!.id))targetIndex=0;
 const select=el<HTMLSelectElement>('destination-select');for(const option of select.options)option.disabled=!available.some(d=>d.id===DESTINATIONS[Number(option.value)]!.id);select.value=String(targetIndex);
 const position=el<HTMLInputElement>('table-position');position.value=String(tableX);position.disabled=scheme==='existing'||mode==='gathering';el<HTMLButtonElement>('reset-table').disabled=position.disabled;
 const width=columnSideAisle(currentLayout('proposed'));el('table-position-value').textContent=position.disabled?'当前模式不调整日常桌位':`${tableX}mm · ${width?`柱侧带${width}mm`:'与通行带重叠'}${tableX===SHARED_TABLE.x?' · 深化位置':' · 临时推敲'}`;
 document.querySelectorAll<HTMLButtonElement>('[data-light]').forEach(b=>b.disabled=scheme==='existing');if(scheme==='existing')setLighting('day');
 updateSceneStrip();setNode(nodeId);
 if(routes)updateRoutes();else{currentRoute=undefined;currentAnalysisLayout=undefined;for(const prefix of ['before','after']){el(`${prefix}-route`).innerHTML='';el(`${prefix}-result`).textContent='松开滑杆后更新';el(`${prefix}-explanation`).textContent='位置预览，尚未检查此桌位。';}el('table-route-status').textContent='位置预览，松开后重算';updateRouteContext(false);refreshAnalysis();}
 frame();if(initialized)el('announcement').textContent=`${scheme==='existing'?'现状设定':'改造方案'}，${mode==='reading'?'日常共读':'活动收拢'}。`;
}
function selectLiving(id:string){
 const living=LIVING_SCENES.find(s=>s.id===id);if(!living)throw new Error('未知生活场景');
 activeLiving=living.id;sceneCamera=living.camera;nodeId=living.node;targetIndex=DESTINATIONS.findIndex(d=>d.id===living.destination);
 if(mode!=='reading'){mode='reading';render();}
 preset('scene');el<HTMLSelectElement>('destination-select').value=String(targetIndex);updateSceneStrip();setNode(nodeId);updateRoutes();
}
function setLighting(intent:string){if(!['day','evening'].includes(intent))throw new Error('未知光环境');const evening=intent==='evening';sky.intensity=evening?.28:2;sun.intensity=evening?.08:3.4;renderer.toneMappingExposure=evening?1.2:1.05;document.querySelectorAll<HTMLButtonElement>('[data-light]').forEach(b=>b.classList.toggle('active',b.dataset.light===intent));frame();}
el('program-list').innerHTML=ZONES.map(z=>`<div><span style="background:${z.color}"></span><p><b>${z.name}</b><small>${z.purpose}</small></p><em>${(z.w*z.h/1e6).toFixed(1)}㎡</em></div>`).join('');
el('material-list').innerHTML=(['concrete','plaster','oak','linen','sage','sheer','stone'] as const).map(key=>`<article><span class="material-swatch ${key}" style="background:${MATERIALS[key].color}"></span><h3>${MATERIALS[key].name}</h3><p>${MATERIALS[key].note}</p></article>`).join('');
el('destination-select').innerHTML=DESTINATIONS.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('');
el('living-scenes').innerHTML=LIVING_SCENES.map(s=>`<button data-living="${s.id}" aria-label="查看生活场景：${s.label}" aria-pressed="false">${s.label}</button>`).join('');
const studies=studySummaries();el('study-plans').innerHTML=studies.map(item=>`<figure><figcaption><b>${item.name}</b><span>${item.facts.seats}个实体席位</span></figcaption>${planSVG(item.layout)}<p>${item.reason}</p></figure>`).join('');
el('study-table').innerHTML=`<thead><tr><th>比较内容</th>${studies.map(s=>`<th>${s.name}</th>`).join('')}</tr></thead><tbody>${[
 ['亲子共读与陪伴',...studies.map(s=>s.family?'保留':'撤出')],['可闭合静读界面',...studies.map(s=>s.quietBoundary?'设置':'未设置')],['相邻停靠位置',...studies.map(s=>`${s.facts.reserved}处`)],['柱侧独立通行带',...studies.map(s=>s.aisleWidthMm?`${s.aisleWidthMm}mm`:'与停靠重叠')],['新增玻璃界面',...studies.map(s=>`${s.glazedArea.toFixed(0)}㎡`)]
].map(row=>`<tr>${row.map((cell,i)=>`<${i?'td':'th'}>${cell}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody>`;
el('mode-study').textContent=`收拢移出中央区域的家具包围范围为${modeStudy().freedFootprint.toFixed(2)}㎡，不推算活动人数。`;
el('node-index').innerHTML=INTERVENTIONS.map(p=>`<button data-node="${p.id}" aria-label="查看节点${p.number}：${p.title}"><span>${p.number}</span></button>`).join('');
el('model-pins').innerHTML=INTERVENTIONS.map(p=>`<button data-node="${p.id}" aria-label="模型节点${p.number}：${p.title}">${p.number}</button>`).join('');
document.addEventListener('click',event=>{if(!(event.target instanceof Element))return;const b=event.target.closest<HTMLButtonElement>('button');if(!b)return;
 if(b.hasAttribute('data-open-route'))el<HTMLDialogElement>('route-dialog').showModal();
 if(b.dataset.scheme){scheme=b.dataset.scheme as Scheme;if(scheme==='existing')mode='reading';render();}
 if(b.dataset.mode){mode=b.dataset.mode as UseMode;activeLiving=null;if(view!=='axon')preset('axon');render();}
 if(b.dataset.view)preset(b.dataset.view);if(b.dataset.node)chooseNode(b.dataset.node);if(b.dataset.living)selectLiving(b.dataset.living);if(b.dataset.light)setLighting(b.dataset.light);
 if(b.dataset.zones){zones=b.dataset.zones==='true';render();}
});
function selectPlanNode(target:EventTarget|null){if(!(target instanceof Element))return false;const id=target.closest('[data-pin]')?.getAttribute('data-pin');if(!id)return false;chooseNode(id);el<HTMLDialogElement>('node-detail-dialog').showModal();return true;}
el('master-plan').addEventListener('click',event=>selectPlanNode(event.target));el('master-plan').addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&selectPlanNode(event.target))event.preventDefault();});
el('reset-view').addEventListener('click',()=>preset('axon'));
el('node-detail-open').addEventListener('click',()=>el<HTMLDialogElement>('node-detail-dialog').showModal());el('node-detail-close').addEventListener('click',()=>el<HTMLDialogElement>('node-detail-dialog').close());
el('close-route').addEventListener('click',()=>el<HTMLDialogElement>('route-dialog').close());
el('export-render').addEventListener('click',()=>{frame();const data=canvas.toDataURL('image/png');el<HTMLImageElement>('render-image').src=data;const a=el<HTMLAnchorElement>('render-download');a.href=data;a.download=`second-plan-${scheme}-${mode}-${view}-${tablePositionLabel()}.png`;el<HTMLDialogElement>('render-preview').showModal();});
el('close-render').addEventListener('click',()=>el<HTMLDialogElement>('render-preview').close());
el('destination-select').addEventListener('change',()=>{targetIndex=Number(el<HTMLSelectElement>('destination-select').value);activeLiving=null;updateSceneStrip();setNode(nodeId);updateRoutes();});
el('diameter-select').addEventListener('change',()=>{diameter=Number(el<HTMLSelectElement>('diameter-select').value);updateRoutes();});
el('occupied-parking').addEventListener('change',()=>{occupiedParking=el<HTMLInputElement>('occupied-parking').checked;updateRoutes();});
el('show-analysis').addEventListener('change',()=>{showAnalysis=el<HTMLInputElement>('show-analysis').checked;refreshAnalysis();});
const position=el<HTMLInputElement>('table-position');position.min=String(ORIGINAL_SHARED_TABLE.x);position.max=String(SHARED_TABLE.x);position.step='100';
position.addEventListener('input',()=>{tableX=Number(position.value);targetIndex=0;nodeId='table';activeLiving=null;if(view!=='axon'&&view!=='top')preset('axon');if(positionFrame!==undefined)return;positionFrame=requestAnimationFrame(()=>{positionFrame=undefined;render(false);});});
position.addEventListener('change',()=>{if(positionFrame!==undefined)cancelAnimationFrame(positionFrame);positionFrame=undefined;tableX=Number(position.value);targetIndex=0;nodeId='table';activeLiving=null;render();});
el('reset-table').addEventListener('click',()=>{tableX=SHARED_TABLE.x;targetIndex=0;nodeId='table';activeLiving=null;if(view!=='axon'&&view!=='top')preset('axon');render();});
el('export-plan').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([planSVG(currentLayout(),undefined,zones,true)],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=url;a.download=`second-plan-${scheme}-${mode}-${tablePositionLabel()}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
let down={x:0,y:0};canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointerup',e=>{if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;const r=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.x)/r.width*2-1,-(e.clientY-r.y)/r.height*2+1),camera);
 for(const hit of ray.intersectObject(model,true)){let o:THREE.Object3D|null=hit.object;while(o&&!o.userData.component)o=o.parent;const c=currentLayout().components.find(c=>c.id===o?.userData.component);if(!c)continue;chooseNode(c.designNode??(c.kind==='partition'||c.id.startsWith('quiet-')?'quiet':c.kind==='shelf'?'shelf':c.id.includes('shared')?'table':['sink','wc','counter','mirror','rail'].includes(c.kind)||c.id.startsWith('wet-')||c.id==='wc-door-leaf'?'service':'floor'));break;}
});
new ResizeObserver(size).observe(stage);preset('axon');render();initialized=true;
