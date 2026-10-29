import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import { clamp,easeInOutCubic } from '../utils/math';
export class CinematicCamera {
  camera:FreeCamera;
  target=Vector3.Zero();
  constructor(scene:Scene) {
    this.camera=new FreeCamera('Orbital camera',new Vector3(7,3,12),scene);
    this.camera.minZ=.05;this.camera.maxZ=1200;this.camera.inputs.clear();this.resize();
  }
  get mobile() { return innerWidth<700; }
  hero() { return { position:new Vector3(6.6,2.4,8.8).scale(this.mobile?1.55:1),target:new Vector3(this.mobile?0:-1.0,this.mobile?-1.15:.05,0) }; }
  resize() { this.camera.fov=(this.mobile?42:36)*Math.PI/180; }
  update(time:number) {
    const hero=this.hero(),factor=this.mobile?1.55:1;
    const frames=[
      {t:0,p:new Vector3(10,4,17).scale(factor),target:new Vector3(this.mobile?0:-2.2,this.mobile?-1.1:-.2,0)},
      {t:3.4,p:new Vector3(9.2,3.3,14).scale(factor),target:new Vector3(this.mobile?0:-1.8,this.mobile?-1.15:-.1,0)},
      {t:7.0,p:new Vector3(7.4,2.6,10.4).scale(factor),target:new Vector3(this.mobile?0:-1.3,this.mobile?-1.15:0,0)},
      {t:10.8,p:hero.position,target:hero.target}
    ];
    let index=frames.findIndex((frame,i)=>i<frames.length-1&&time<=frames[i+1].t);if(index<0)index=frames.length-2;
    const a=frames[index],b=frames[index+1],t=easeInOutCubic(clamp((time-a.t)/(b.t-a.t)));
    this.camera.position.copyFrom(Vector3.Lerp(a.p,b.p,t));this.target.copyFrom(Vector3.Lerp(a.target,b.target,t));
    this.camera.setTarget(this.target);
  }
}
