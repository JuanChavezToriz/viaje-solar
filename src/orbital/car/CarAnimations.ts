import { Car } from './Car';
import type { IntroFrame } from '../animation/Timeline';
import { easeOutQuart } from '../utils/math';
export class CarAnimations {
  constructor(private car:Car,private reduced:boolean) {}
  update(frame:IntroFrame,elapsed:number) {
    this.car.root.setEnabled(frame.car>0);
    this.car.root.position.x=(1-easeOutQuart(frame.car))*13;
    this.car.root.position.y=this.reduced?0:Math.sin(elapsed*.29)*.032;
    this.car.root.rotation.y=(1-frame.car)*-.22+(this.reduced?0:Math.sin(elapsed*.19)*.035);
    this.car.root.rotation.x=this.reduced?0:Math.sin(elapsed*.23+.7)*.018;
    this.car.root.rotation.z=(1-frame.car)*-.045+(this.reduced?0:Math.sin(elapsed*.17+1.4)*.012);
    this.car.materials.setLights(frame.headlights);
  }
}
