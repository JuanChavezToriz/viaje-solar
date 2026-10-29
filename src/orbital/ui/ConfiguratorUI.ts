import { PAINTS,INTERIORS } from '../car/CarMaterials';
import type { WheelStyle } from '../car/Car';
import type { SceneManager } from '../core/SceneManager';
import type { IntroFrame } from '../animation/Timeline';
import { phase } from '../utils/math';
const element=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
export class ConfiguratorUI {
  private stage=element('orbital-config');private skip=element<HTMLButtonElement>('orbital-skip');
  private story=element('orbital-story');private status=element('config-status');
  private complete=false;private abort=new AbortController();
  constructor(private manager:SceneManager) {
    this.swatches('paint-options','paint',PAINTS,id=>{manager.configurator.setPaint(id);element('paint-name').textContent=PAINTS.find(p=>p.id===id)!.name;this.announce();});
    this.swatches('interior-options','interior',INTERIORS,id=>{manager.configurator.setInterior(id);element('interior-name').textContent=INTERIORS.find(p=>p.id===id)!.name;this.announce();});
    const signal=this.abort.signal;
    document.querySelectorAll<HTMLInputElement>('input[name="wheels"]').forEach(input=>{input.disabled=!manager.car.wheelSets[input.value as WheelStyle].length;input.addEventListener('change',()=>{manager.configurator.setWheels(input.value as WheelStyle);this.announce();},{signal});});
    this.skip.addEventListener('click',()=>manager.skip(),{signal});
    element('orbital-replay').addEventListener('click',()=>manager.replay(),{signal});
    element('reset-car').addEventListener('click',()=>manager.controller.reset(),{signal});
    element('car-zoom-in').addEventListener('click',()=>manager.controller.adjustZoom(.9),{signal});
    element('car-zoom-out').addEventListener('click',()=>manager.controller.adjustZoom(1.1),{signal});
    element('car-left').addEventListener('click',()=>manager.controller.rotate(-1),{signal});
    element('car-right').addEventListener('click',()=>manager.controller.rotate(1),{signal});
    element('motion-toggle').addEventListener('click',()=>this.motionState(manager.toggleMotion()),{signal});
    this.motionState(manager.motionPaused);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!this.complete)manager.skip();},{signal});
    document.querySelectorAll<HTMLButtonElement>('[data-config-tab]').forEach(button=>button.addEventListener('click',()=>this.selectTab(button.dataset.configTab!),{signal}));
    const dialog=element<HTMLDialogElement>('orbital-credits');
    element('credits-open').addEventListener('click',()=>dialog.showModal(),{signal});
    element('credits-close').addEventListener('click',()=>dialog.close(),{signal});
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();},{signal});
    this.selectTab('exterior');
  }
  private swatches(container:string,name:string,choices:readonly {id:string;name:string;hex:string}[],change:(id:string)=>void) {
    choices.forEach((choice,index)=> {
      const label=document.createElement('label');label.className='swatch';label.title=choice.name;
      const input=document.createElement('input');input.type='radio';input.name=name;input.value=choice.id;input.checked=index===0;input.setAttribute('aria-label',choice.name);
      const chip=document.createElement('span');chip.className='swatch-color';chip.style.backgroundColor=choice.hex;chip.setAttribute('aria-hidden','true');
      label.append(input,chip);element(container).append(label);
      input.addEventListener('change',()=>change(choice.id),{signal:this.abort.signal});
    });
  }
  private announce() {
    const config=this.manager.configurator;
    this.status.textContent=`Pintura ${PAINTS.find(p=>p.id===config.paintId)?.name}, rines ${config.wheel}, interior ${config.interiorId}.`;
  }
  private motionState(paused:boolean) {
    const button=element<HTMLButtonElement>('motion-toggle');button.setAttribute('aria-pressed',String(paused));
    button.textContent=paused?'Activar movimiento':'Pausar movimiento';
  }
  private selectTab(tab:string) {
    this.stage.dataset.tab=tab;
    document.querySelectorAll<HTMLButtonElement>('[data-config-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.configTab===tab)));
  }
  update(frame:IntroFrame) {
    this.skip.hidden=frame.complete;
    document.body.style.setProperty('--config-reveal',String(frame.ui));
    this.stage.inert=!frame.complete;
    element('orbital-controls').inert=!frame.complete;
    document.body.classList.toggle('config-visible',frame.ui>.001);
    if(frame.complete!==this.complete) {
      this.complete=frame.complete;this.skip.hidden=frame.complete;document.body.classList.toggle('config-ready',frame.complete);
      if(frame.complete&&document.activeElement===this.skip)this.manager.canvas.focus({preventScroll:true});
    }
    let text='El viaje empieza<br>en silencio.',opacity=phase(frame.time,.2,1.2)*(1-phase(frame.time,2.8,3.6));
    if(frame.time>=3.6&&frame.time<7.1){text='Diseñado para<br>ir más lejos.';opacity=phase(frame.time,3.6,4.4)*(1-phase(frame.time,6.5,7.1));}
    if(frame.time>=7.1){text='Más allá<br>del asfalto.';opacity=phase(frame.time,7.1,8)*(1-phase(frame.time,8.8,9.5));}
    if(this.story.innerHTML!==text)this.story.innerHTML=text;
    this.story.style.opacity=String(opacity);
  }
  dispose(){this.abort.abort();}
}
