import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CinematicCamera } from './CinematicCamera';
import { Car } from '../car/Car';
import { clamp,damp } from '../utils/math';
export class CameraController {
  active=false;private yaw=.10;private pitch=0;private renderedYaw=.10;private renderedPitch=0;private vx=0;private vy=0;private zoom=1;private desiredZoom=1;
  private pointers=new Map<number,{x:number;y:number}>();private pinch=0;
  private abort=new AbortController();
  constructor(private canvas:HTMLCanvasElement,private rig:CinematicCamera,private car:Car,private reduced:boolean) {
    const signal=this.abort.signal;
    canvas.addEventListener('pointerdown',event=> {
      if(!this.active||event.button>0)return;
      canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});
      this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});this.vx=this.vy=0;canvas.classList.add('is-dragging');
      if(this.pointers.size===2)this.pinch=this.distance();
    },{signal});
    canvas.addEventListener('pointermove',event=> {
      const previous=this.pointers.get(event.pointerId);if(!previous||!this.active)return;
      const dx=event.clientX-previous.x,dy=event.clientY-previous.y;
      this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(this.pointers.size===2) {
        const next=this.distance();if(this.pinch>0)this.desiredZoom=clamp(this.desiredZoom*this.pinch/next,.70,1.6);this.pinch=next;
      } else {
        this.yaw+=dx*.006;this.pitch=clamp(this.pitch+dy*.003,-.22,.22);
        this.vx=clamp(dx*.24,-1.2,1.2);this.vy=clamp(dy*.12,-.5,.5);
      }
    },{signal});
    const release=(event:PointerEvent)=>{this.pointers.delete(event.pointerId);this.pinch=0;if(!this.pointers.size)canvas.classList.remove('is-dragging');};
    canvas.addEventListener('pointerup',release,{signal});canvas.addEventListener('pointercancel',release,{signal});
    canvas.addEventListener('lostpointercapture',release,{signal});
    canvas.addEventListener('wheel',event=> {
      if(!this.active)return;event.preventDefault();this.desiredZoom=clamp(this.desiredZoom*Math.exp(clamp(event.deltaY,-100,100)*.0013),.70,1.6);
    },{signal,passive:false});
    canvas.addEventListener('keydown',event=> {
      if(!this.active)return;
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','0','Escape'].includes(event.key))event.preventDefault();
      if(event.key==='ArrowLeft')this.yaw-=.12;if(event.key==='ArrowRight')this.yaw+=.12;
      if(event.key==='ArrowUp')this.pitch=clamp(this.pitch-.06,-.22,.22);if(event.key==='ArrowDown')this.pitch=clamp(this.pitch+.06,-.22,.22);
      if(event.key==='+'||event.key==='=')this.adjustZoom(.9);if(event.key==='-')this.adjustZoom(1.1);
      if(event.key==='0'||event.key==='Escape')this.reset();
    },{signal});
  }
  private distance() { const [a,b]=[...this.pointers.values()];return Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)); }
  adjustZoom(factor:number) { this.desiredZoom=clamp(this.desiredZoom*factor,.70,1.6); }
  rotate(direction:number) { this.yaw+=direction*.25; }
  reset() { this.yaw=.10;this.pitch=0;this.vx=this.vy=0;this.desiredZoom=1; }
  resize() { this.rig.resize(); }
  update(dt:number) {
    if(!this.active)return;
    if(!this.pointers.size&&!this.reduced) {this.yaw+=this.vx*dt;this.pitch=clamp(this.pitch+this.vy*dt,-.22,.22);}
    this.vx=damp(this.vx,0,6,dt);this.vy=damp(this.vy,0,6,dt);this.zoom=damp(this.zoom,this.desiredZoom,6,dt);
    this.renderedYaw=this.pointers.size?this.yaw:damp(this.renderedYaw,this.yaw,9,dt);
    this.renderedPitch=this.pointers.size?this.pitch:damp(this.renderedPitch,this.pitch,9,dt);
    this.car.rotationRoot.rotation.set(this.renderedPitch,this.renderedYaw,0);
    const hero=this.rig.hero(),direction=hero.position.subtract(hero.target);
    this.rig.camera.position.copyFrom(hero.target.add(direction.scale(this.zoom)));this.rig.camera.setTarget(hero.target);
  }
  dispose() {this.abort.abort();}
}
