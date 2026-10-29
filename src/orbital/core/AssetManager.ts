import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
import type { Scene } from '@babylonjs/core/scene';
import type { Quality } from './PerformanceManager';
const assetBase = import.meta.env.BASE_URL;
export class AssetManager {
  private parts = new Map<string,{value:number;weight:number}>();
  constructor(private scene: Scene, private report:(progress:number,label:string)=>void) {
    for (const [key,weight] of [['car',65],['day',7],['night',6],['clouds',6],['environment',10],['shaders',6]] as const) this.parts.set(key,{value:0,weight});
  }
  progress(key:string,value:number,label:string) {
    const item = this.parts.get(key);
    if (item) item.value = Math.max(item.value,Math.min(1,value));
    this.report([...this.parts.values()].reduce((sum,part)=>sum+part.value*part.weight,0),label);
  }
  texture(kind:'day'|'night'|'clouds',quality:Quality) {
    const names = {day:'daymap',night:'nightmap',clouds:'clouds'};
    const low = quality === 'low' ? '-1k' : '';
    return new Promise<Texture>((resolve,reject)=> {
      const texture = new Texture(`${assetBase}assets/earth/${names[kind]}${low}.jpg`,this.scene,false,true,Texture.TRILINEAR_SAMPLINGMODE,
        ()=>{this.progress(kind,1,'Preparando la Tierra');resolve(texture);},
        (_message,error)=>reject(error || new Error(`No se pudo cargar ${kind}`)));
      texture.anisotropicFilteringLevel = quality === 'low' ? 2 : 8;
    });
  }
  environment(size:number) {
    return new Promise<HDRCubeTexture>((resolve,reject)=> {
      const texture = new HDRCubeTexture(`${assetBase}assets/environment/orbital-studio.hdr`,this.scene,size,false,true,false,true,
        ()=>{this.progress('environment',1,'Afinando los reflejos');resolve(texture);},
        (_message,error)=>reject(error || new Error('No se pudo preparar la iluminación')));
    });
  }
  async car(quality:Quality) {
    const file = quality === 'low' ? 'concept-car-low.glb' : 'concept-car.glb';
    const container = await LoadAssetContainerAsync(`${assetBase}assets/car/${file}`,this.scene,{pluginOptions:{gltf:{useOpenPBR:false,extensionOptions:{KHR_materials_transmission:{enabled:false},KHR_materials_variants:{enabled:false}}}},onProgress:event=> {
      if(event.lengthComputable && event.total) this.progress('car',event.loaded/event.total,'Preparando la carrocería');
    }});
    this.progress('car',1,'Preparando los materiales');
    return container;
  }
}
