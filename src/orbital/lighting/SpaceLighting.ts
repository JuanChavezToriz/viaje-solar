import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { IntroFrame } from '../animation/Timeline';
export const SUN_DIRECTION=new Vector3(-.55,.45,.80).normalize();
export class SpaceLighting {
  key:DirectionalLight;rim:SpotLight;bounce:PointLight;
  constructor(scene:Scene) {
    this.key=new DirectionalLight('Sun · key',SUN_DIRECTION.negate(),scene);this.key.diffuse=new Color3(1,.94,.84);this.key.intensity=.08;
    this.rim=new SpotLight('Silhouette · rim',new Vector3(-4,4,-6),new Vector3(4,-4,6).normalize(),Math.PI/1.8,2,scene);
    this.rim.diffuse=new Color3(.63,.77,1);this.rim.intensity=0;this.rim.range=25;
    this.bounce=new PointLight('Earth · bounce',new Vector3(-7,-4,1),scene);this.bounce.diffuse=new Color3(.16,.40,.82);this.bounce.intensity=.35;this.bounce.range=20;
    const fill=new HemisphericLight('Weak sky fill',new Vector3(0,1,0),scene);fill.intensity=.10;fill.diffuse=new Color3(.60,.70,.86);fill.groundColor=new Color3(.025,.035,.055);
  }
  update(frame:IntroFrame) {
    this.key.intensity=.055+frame.reveal*2.0;this.rim.intensity=frame.rim*16;
    const angle=frame.reveal*.9;
    this.rim.position.set(-4+Math.sin(angle)*5,4, -6+Math.cos(angle)*2);
    this.rim.direction.copyFrom(this.rim.position.negate().normalize());
    this.bounce.intensity=.15+frame.earth*.5;
  }
}
