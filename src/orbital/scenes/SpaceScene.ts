import { Scene } from '@babylonjs/core/scene';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { CinematicCamera } from '../camera/CinematicCamera';
import { SpaceLighting } from '../lighting/SpaceLighting';
import { StarField } from './StarField';
import { createNebula } from './Nebula';
export class SpaceScene {
  scene:Scene;camera:CinematicCamera;lighting:SpaceLighting;stars:StarField;nebula:ReturnType<typeof createNebula>;
  constructor(engine:AbstractEngine,starCount:number) {
    this.scene=new Scene(engine);this.scene.useRightHandedSystem=true;
    this.scene.clearColor=new Color4(.002,.004,.008,1);this.scene.skipPointerMovePicking=true;
    this.camera=new CinematicCamera(this.scene);this.scene.activeCamera=this.camera.camera;
    this.lighting=new SpaceLighting(this.scene);this.stars=new StarField(this.scene,starCount);this.nebula=createNebula(this.scene);
  }
}
