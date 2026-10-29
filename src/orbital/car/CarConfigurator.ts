import { Color3 } from '@babylonjs/core/Maths/math.color';
import { PAINTS, INTERIORS } from './CarMaterials';
import { easeInOutCubic,clamp } from '../utils/math';
import { Car,type WheelStyle } from './Car';
export class CarConfigurator {
  paintId:string='rosso';interiorId:string='black';wheel:WheelStyle='sport';
  private paintTime=1;private interiorTime=1;
  private fromPaint:Color3[]=[];private fromInterior:Color3[]=[];
  private paint=PAINTS[0] as typeof PAINTS[number];
  private interior=INTERIORS[0] as typeof INTERIORS[number];
  private wheelVisibility:Record<WheelStyle,number>={sport:1,racing:0,carbon:0};
  constructor(private car:Car) {}
  setPaint(id:string) {
    const paint=PAINTS.find(item=>item.id===id);if(!paint) return;
    this.paint=paint;this.paintId=id;this.paintTime=0;
    this.fromPaint=this.car.materials.paint.map(material=>material.albedoColor.clone());
  }
  setInterior(id:string) {
    const interior=INTERIORS.find(item=>item.id===id);if(!interior)return;
    this.interior=interior;this.interiorId=id;this.interiorTime=0;
    this.fromInterior=this.car.materials.interior.map(material=>material.albedoColor.clone());
  }
  setWheels(style:WheelStyle) { this.wheel=style; }
  update(dt:number) {
    if(this.paintTime<1) {
      this.paintTime=clamp(this.paintTime+dt/.65);const t=easeInOutCubic(this.paintTime);
      const target=Color3.FromHexString(this.paint.hex).toLinearSpace();
      this.car.materials.paint.forEach((material,index)=> {
        material.albedoColor=Color3.Lerp(this.fromPaint[index],target,t);
        material.metallic=this.paint.metallic;material.roughness=this.paint.roughness;
      });
    }
    if(this.interiorTime<1) {
      this.interiorTime=clamp(this.interiorTime+dt/.55);const t=easeInOutCubic(this.interiorTime);
      const target=Color3.FromHexString(this.interior.hex).toLinearSpace();
      this.car.materials.interior.forEach((material,index)=>material.albedoColor=Color3.Lerp(this.fromInterior[index],target,t));
    }
    for(const style of ['sport','racing','carbon'] as const) {
      const target=style===this.wheel?1:0;
      const value=this.wheelVisibility[style]+(target-this.wheelVisibility[style])*(1-Math.exp(-dt*7));
      this.wheelVisibility[style]=Math.abs(value-target)<.001?target:value;
      this.car.setWheelBlend(style,this.wheelVisibility[style]);
    }
  }
}
