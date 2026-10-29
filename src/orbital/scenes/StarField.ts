import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { IntroFrame } from '../animation/Timeline';
export class StarField {
  private layers:{system:ParticleSystem;opacity:number;target:number;ratio:number}[]=[];
  private time=0;private reduced=false;
  constructor(scene:Scene,count:number) {
    const size=64,data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
      const r=Math.hypot(x/(size-1)-.5,y/(size-1)-.5)*2,index=(y*size+x)*4;
      data[index]=data[index+1]=data[index+2]=255;data[index+3]=Math.round(Math.max(0,Math.exp(-6*r*r)*(1-r*r))*255);
    }
    const sprite=RawTexture.CreateRGBATexture(data,size,size,scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);
    for(const [index,ratio,radius] of [[0,.55,220],[1,.30,115],[2,.15,58]]) {
      const capacity=Math.ceil(count*ratio),system=new ParticleSystem(`Stars · depth ${index}`,capacity,scene);
      const layer={system,opacity:0,target:capacity,ratio};this.layers.push(layer);
      system.particleTexture=sprite;system.emitter=Vector3.Zero();system.emitRate=0;system.manualEmitCount=capacity;
      system.minLifeTime=system.maxLifeTime=1e8;system.minSize=.08+index*.008;system.maxSize=.19+index*.015;
      system.minEmitPower=system.maxEmitPower=0;system.blendMode=ParticleSystem.BLENDMODE_ADD;
      system.color1=new Color4(.67,.78,1,1);system.color2=new Color4(1,.91,.78,1);
      system.startPositionFunction=(_matrix,position,particle)=> {
        const theta=Math.random()*Math.PI*2,z=Math.random()*2-1,r=radius*(.8+Math.random()*.4),s=Math.sqrt(1-z*z);
        position.set(Math.cos(theta)*s*r,z*r,Math.sin(theta)*s*r);
        particle.age=Math.random()*100;
      };
      system.updateFunction=particles=> {
        if(particles.length>layer.target)particles.length=layer.target;
        for(const particle of particles) {
          const phase=particle.position.x*.31+particle.position.z*.17;
          particle.color.a=layer.opacity*(.82+.18*Math.sin(this.time*(.27+index*.06)+phase));
        }
      };
      system.start();
    }
  }
  update(frame:IntroFrame,time:number,reduced:boolean) {
    this.time=time;this.reduced=reduced;
    const opacities=[frame.deep*.72,frame.mid*.82,frame.foreground*.72];
    this.layers.forEach((layer,i)=> {layer.opacity=opacities[i];layer.system.worldOffset.set(Math.sin(time*(.011+i*.003))*i*.6,Math.cos(time*.009+i)*i*.24,0);});
  }
  setCount(count:number) {for(const layer of this.layers)layer.target=Math.min(layer.system.getCapacity(),Math.ceil(count*layer.ratio));}
}
