import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { SpaceScene } from '../scenes/SpaceScene';
import { Earth } from '../scenes/Earth';
import { Car } from '../car/Car';
import { CarConfigurator } from '../car/CarConfigurator';
import { CarAnimations } from '../car/CarAnimations';
import { CameraController } from '../camera/CameraController';
import { IntroSequence,sampleIntro,type IntroFrame } from '../animation/Timeline';
import { AssetManager } from './AssetManager';
import { PerformanceManager } from './PerformanceManager';
import { AudioManager } from './AudioManager';
import { PostProcessing } from '../effects/PostProcessing';
export class SceneManager {
  space:SpaceScene;performance:PerformanceManager;sequence:IntroSequence;
  car!:Car;configurator!:CarConfigurator;controller!:CameraController;earth!:Earth;
  private animations!:CarAnimations;private post!:PostProcessing;
  private ambientTime=0;private ready=false;private abort=new AbortController();
  motionPaused:boolean;audio=new AudioManager();
  onFrame?:(frame:IntroFrame)=>void;
  constructor(public engine:AbstractEngine,public canvas:HTMLCanvasElement,public backend:string,public reducedMotion:boolean) {
    this.performance=new PerformanceManager(engine,backend==='WebGPU');
    this.space=new SpaceScene(engine,this.performance.profile.stars);
    this.sequence=new IntroSequence(reducedMotion);this.motionPaused=reducedMotion;
  }
  async load(report:(progress:number,label:string)=>void) {
    const {scene}=this.space,assets=new AssetManager(scene,report),quality=this.performance.quality;
    const [container,day,night,clouds,environment]=await Promise.all([
      assets.car(quality),assets.texture('day',quality),assets.texture('night',quality),assets.texture('clouds',quality),assets.environment(this.performance.profile.environmentSize)
    ]);
    scene.environmentTexture=environment;scene.environmentIntensity=.8;
    this.car=new Car(container,scene);this.configurator=new CarConfigurator(this.car);
    this.earth=new Earth(scene,{day,night,clouds},this.performance.profile.earthSegments);
    this.animations=new CarAnimations(this.car,this.reducedMotion);
    this.controller=new CameraController(this.canvas,this.space.camera,this.car,this.reducedMotion);
    this.car.rotationRoot.rotation.y=.10;
    this.post=new PostProcessing(scene,this.space.camera.camera,quality);
    this.performance.onChange=tier=> {this.space.stars.setCount(this.performance.profile.stars);this.post.setQuality(tier);};
    this.engine.runRenderLoop(()=>this.render());
    assets.progress('shaders',.15,'Preparando la luz');
    await scene.whenReadyAsync(true);
    await Promise.all(scene.meshes.filter(mesh=>mesh.getTotalVertices()>0&&mesh.material).map(mesh=>mesh.material!.forceCompilationAsync(mesh)));
    assets.progress('shaders',1,'Todo listo');
    window.addEventListener('resize',()=>{this.performance.apply();this.controller.resize();this.engine.resize();},{signal:this.abort.signal});
    document.addEventListener('visibilitychange',()=> {
      if(document.hidden) {this.engine.stopRenderLoop();void this.audio.suspend();}
      else this.engine.runRenderLoop(()=>this.render());
    },{signal:this.abort.signal});
  }
  start() {this.ready=true;this.sequence.start();this.render();}
  skip() {this.sequence.skip();}
  replay() {this.controller.active=false;this.controller.reset();this.sequence.restart();}
  toggleMotion() {this.motionPaused=!this.motionPaused;return this.motionPaused;}
  private render() {
    const raw=Math.max(.001,this.engine.getDeltaTime()/1000),dt=Math.min(raw,.05);
    const frame=this.ready?this.sequence.update(dt):sampleIntro(10.8);
    if(!this.motionPaused)this.ambientTime+=dt;
    this.space.camera.resize();
    this.controller.active=this.ready&&frame.complete;
    if(this.controller.active)this.controller.update(dt);else this.space.camera.update(frame.time);
    this.animations.update(frame,this.ambientTime);
    this.earth.update(frame,this.ambientTime,this.motionPaused);
    this.space.lighting.update(frame);
    this.space.scene.environmentIntensity=.045+frame.reveal*.78;
    this.space.stars.update(frame,this.ambientTime,this.motionPaused);
    this.space.nebula.update(frame.deep);
    this.configurator.update(dt);
    if(this.ready)this.onFrame?.(frame);
    this.space.scene.render();
    if(this.ready)this.performance.update(raw);
  }
  dispose() {this.abort.abort();this.controller?.dispose();this.audio.dispose();this.engine.stopRenderLoop();this.post?.dispose();this.space.scene.dispose();this.engine.dispose();}
}
