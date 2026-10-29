import { Color3 } from '@babylonjs/core/Maths/math.color';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Material } from '@babylonjs/core/Materials/material';
import type { Scene } from '@babylonjs/core/scene';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
export const PAINTS = [
  { id:'rosso',name:'Rosso',hex:'#a61d28',metallic:.55,roughness:.23 },
  { id:'midnight',name:'Midnight Black',hex:'#171d25',metallic:.65,roughness:.22 },
  { id:'arctic',name:'Arctic White',hex:'#e3e3dd',metallic:.24,roughness:.24 },
  { id:'electric',name:'Electric Blue',hex:'#245d9a',metallic:.65,roughness:.21 },
  { id:'titanium',name:'Titanium Silver',hex:'#8b9296',metallic:.85,roughness:.26 }
] as const;
export const INTERIORS = [{id:'black',name:'Black',hex:'#242326'},{id:'red',name:'Red',hex:'#7d2428'},{id:'tan',name:'Tan',hex:'#a47d55'}] as const;
export class CarMaterials {
  paint:PBRMaterial[] = [];
  interior:PBRMaterial[] = [];
  headlights:PBRMaterial[] = [];
  tailLights:PBRMaterial[] = [];
  sport:PBRMaterial;
  racing:PBRMaterial;
  carbon:PBRMaterial;
  constructor(container:AssetContainer,scene:Scene) {
    this.sport = this.metal('Orbital polished alloy',scene,.92,.22,'#a6afb7');
    this.racing = this.metal('Orbital forged alloy',scene,1,.20,'#bdc5cc');
    this.carbon = this.metal('Orbital carbon composite',scene,.55,.34,'#292f34');
    for(const material of container.materials) {
      if(!(material instanceof PBRMaterial)) continue;
      if(/^Paint [12]/.test(material.name)) {
        material.clearCoat.isEnabled=true;material.clearCoat.intensity=1;material.clearCoat.roughness=.065;
        material.metallic=.55;material.roughness=.23;
        if(material.bumpTexture) material.bumpTexture.level=.30;
        this.paint.push(material);
      }
      if(/^Interior 3/.test(material.name)) { material.metallic=0;material.roughness=.68;this.interior.push(material); }
      if(material.name==='Glass') {
        material.subSurface.isRefractionEnabled=false;
        material.albedoColor=Color3.FromHexString('#202d38').toLinearSpace();material.metallic=0;material.roughness=.08;
        material.alpha=.29;material.transparencyMode=Material.MATERIAL_ALPHABLEND;material.backFaceCulling=false;
        material.clearCoat.isEnabled=true;material.clearCoat.intensity=1;material.clearCoat.roughness=.025;
      }
      if(/^Tire/.test(material.name)) { material.albedoColor=new Color3(.028,.032,.038);material.roughness=.88;material.metallic=0; }
      if(material.name==='Headlight') { this.headlights.push(material);material.emissiveColor=new Color3(.78,.89,1); }
      if(material.name==='Brakelight') { this.tailLights.push(material);material.emissiveColor=new Color3(1,.025,.012); }
      if(material.name==='Rim1'||material.name==='Rim2') { material.metallic=1;material.roughness=.25; }
    }
    for(const material of this.paint) material.albedoColor=Color3.FromHexString(PAINTS[0].hex).toLinearSpace();
    for(const material of this.interior) material.albedoColor=Color3.FromHexString(INTERIORS[0].hex).toLinearSpace();
    this.setLights(0);
  }
  private metal(name:string,scene:Scene,metallic:number,roughness:number,hex:string) {
    const material=new PBRMaterial(name,scene);material.metallic=metallic;material.roughness=roughness;
    material.albedoColor=Color3.FromHexString(hex).toLinearSpace();return material;
  }
  setLights(level:number) {
    for(const light of this.headlights) light.emissiveIntensity=level*3.2;
    for(const light of this.tailLights) light.emissiveIntensity=level*.8;
  }
}
