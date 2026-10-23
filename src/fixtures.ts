import {DETAILS} from './space.ts';
import type {Component} from './space.ts';
export interface FixturePart {name:string;role:'housing'|'diffuser'|'hanger';x:number;y:number;w:number;h:number;base:number;height:number}
/** Millimetre boxes shared by the model, drawings and exported booklet input. */
export function lightParts(c:Component):FixturePart[]{
  if(c.kind!=='light')throw new Error('只接受灯具构件');
  const housing=c.housingHeight??c.height,side=DETAILS.lightCheek;
  if(housing>c.height||housing<DETAILS.lightRecess+6)throw new Error('灯具外包与内退尺寸冲突');
  const part=(name:string,role:FixturePart['role'],x:number,y:number,w:number,h:number,base:number,height:number):FixturePart=>({name,role,x,y,w,h,base,height});
  const result=[
    part('Luminaire top plate','housing',c.x,c.y,c.w,c.h,c.base+housing-6,6),
    part('Luminaire north cheek','housing',c.x,c.y,c.w,side,c.base,housing),
    part('Luminaire south cheek','housing',c.x,c.y+c.h-side,c.w,side,c.base,housing),
    part('Luminaire west cap','housing',c.x,c.y,15,c.h,c.base,housing),
    part('Luminaire east cap','housing',c.x+c.w-15,c.y,15,c.h,c.base,housing),
    part('Luminaire diffuser','diffuser',c.x+15,c.y+side,c.w-30,c.h-side*2,c.base+DETAILS.lightRecess,6),
  ];
  if(c.height>housing){const inset=Math.min(200,c.w/4);for(const x of [c.x+inset,c.x+c.w-inset-8])result.push(part('Luminaire hanger','hanger',x,c.y+c.h/2-4,8,8,c.base+housing,c.height-housing));}
  return result;
}
