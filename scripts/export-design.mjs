import {mkdirSync,writeFileSync,readFileSync,copyFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createLayout,ROOM,ZONES,DETAILS,MATERIALS,DESTINATIONS,INTERVENTIONS,layoutFacts,destinationPoint,parkingRect,withOccupiedParking} from '../dist/src/space.js';
import {planSVG,sectionSVG,nodeSVG,ceilingSVG,serviceElevationSVG,contactSVG,livingEvidenceSVG,touchNodesSVG} from '../dist/src/drawings.js';
import {makeSpace,disposeSpace} from '../dist/src/space-model.js';
import {inspectContacts} from '../dist/src/contact-study.js';
import {spaceRoute} from '../dist/src/space-analysis.js';
import {studyResults,modeStudy,occupancyStudy,tablePositionStudy} from '../dist/src/space-study.js';
import {sightlineStudy,companionStudy,LIVING_SCENES} from '../dist/src/living-study.js';
import {lightParts} from '../dist/src/fixtures.js';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'output','design'),assets=path.join(root,'dist','assets');
mkdirSync(out,{recursive:true});mkdirSync(assets,{recursive:true});
const before=createLayout('existing'),after=createLayout(),gathering=createLayout('proposed','gathering');
const contactModels={existing:makeSpace(before),proposed:makeSpace(after)};
const contacts={existing:inspectContacts(before,contactModels.existing),proposed:inspectContacts(after,contactModels.proposed)};
Object.values(contactModels).forEach(disposeSpace);
const files={
 'existing-plan.svg':planSVG(before), 'proposed-plan.svg':planSVG(after), 'program-plan.svg':planSVG(after,undefined,true),
 'section-aa.svg':sectionSVG(after),'section-bb.svg':sectionSVG(after,'bb'),'ceiling-plan.svg':ceilingSVG(after),'service-elevation.svg':serviceElevationSVG(after),'design-nodes.svg':nodeSVG(after),'gathering-plan.svg':planSVG(gathering),
 'contact-checks.svg':contactSVG(contacts.proposed),
 'living-evidence.svg':livingEvidenceSVG(before,after),'touch-nodes.svg':touchNodesSVG(after),
};
for(const [name,content] of Object.entries(files))writeFileSync(path.join(out,name),content,'utf8');
const routes=DESTINATIONS.map(d=>({id:d.id,name:d.name,beforePoint:destinationPoint(before,d.id),afterPoint:destinationPoint(after,d.id),before:spaceRoute(before,destinationPoint(before,d.id),900),after:spaceRoute(after,destinationPoint(after,d.id),900)}));
const studies=studyResults();
const tableStudy=tablePositionStudy();
for(const item of studies){const name=`study-${item.id}.svg`;files[name]=planSVG(item.layout);writeFileSync(path.join(out,name),files[name],'utf8');}
for(const item of studies.filter(s=>s.id!=='seats')){const name=`occupied-${item.id}.svg`,point=destinationPoint(item.layout,'window'),route=item.routes.find(r=>r.id==='window').occupied;files[name]=planSVG(withOccupiedParking(item.layout,point),route);writeFileSync(path.join(out,name),files[name],'utf8');}
for(const item of tableStudy){const name=`table-study-${item.x}.svg`,point=destinationPoint(item.layout,'window');files[name]=planSVG(withOccupiedParking(item.layout,point),item.occupied);writeFileSync(path.join(out,name),files[name],'utf8');}
const serializeLayout=layout=>({...layout,reserved:layout.reserved.map(p=>({...p,rect:parkingRect(p)}))});
const data={title:'第二张平面图｜社区共享阅读空间包容性改造',concept:'同一桌边的不同日常',date:'2026-10-22',status:'概念场地／深化稿',fictional:true,units:'mm',room:ROOM,details:DETAILS,zones:ZONES,materials:MATERIALS,interventions:INTERVENTIONS,schemes:{existing:serializeLayout(before),proposed:serializeLayout(after),gathering:serializeLayout(gathering)},facts:layoutFacts(after),routes,studies:studies.map(s=>({...s,layout:serializeLayout(s.layout)})),tableStudy:tableStudy.map(s=>({...s,layout:serializeLayout(s.layout)})),modeStudy:modeStudy(),occupancy:occupancyStudy()};
data.contacts=contacts;
const companion=companionStudy();
data.living={scenes:LIVING_SCENES,cameraUnits:'metres',sightline:sightlineStudy(),companion:{...companion,before:{...companion.before,layout:serializeLayout(companion.before.layout)},after:{...companion.after,layout:serializeLayout(companion.after.layout)}}};
data.fixtureParts=Object.fromEntries(after.components.filter(c=>c.kind==='light').map(c=>[c.id,lightParts(c)]));
writeFileSync(path.join(out,'design-data.json'),JSON.stringify(data,null,2),'utf8');
if(!globalThis.FileReader){globalThis.FileReader=class{
 result=null;onloadend=null;onerror=null;
 readAsArrayBuffer(blob){blob.arrayBuffer().then(data=>{this.result=data;this.onloadend?.();},error=>{if(this.onerror)this.onerror(error);else throw error;});}
};}
const models={'community-reading-room.glb':makeSpace(after,false),'community-reading-room-cutaway.glb':makeSpace(after,true),'community-reading-room-gathering.glb':makeSpace(gathering,true)};
let modelBytes=0;
for(const [name,model] of Object.entries(models)){
  const annotations=[];model.traverse(o=>{if(o.isLine)annotations.push(o);});annotations.forEach(o=>o.removeFromParent());
  const binary=await new GLTFExporter().parseAsync(model,{binary:true});modelBytes+=binary.byteLength;writeFileSync(path.join(out,name),Buffer.from(binary));
}
const license=readFileSync(path.join(root,'node_modules','three','LICENSE'),'utf8');writeFileSync(path.join(out,'THREE-LICENSE.txt'),license,'utf8');
for(const name of [...Object.keys(files),'design-data.json',...Object.keys(models),'THREE-LICENSE.txt'])copyFileSync(path.join(out,name),path.join(assets,name));
console.log(JSON.stringify({output:'output/design',drawings:Object.keys(files).length,modelBytes,seats:data.facts.seats,reserved:data.facts.reserved,studies:studies.map(s=>({name:s.name,seats:s.facts.seats,glazedArea:s.glazedArea})),modeStudy:data.modeStudy,routes:routes.map(r=>({name:r.name,before:r.before.reached,after:r.after.reached,lengthMm:Math.round(r.after.length)}))}));
