import './orbital.css';
import { createEngine } from './core/Engine';
import { SceneManager } from './core/SceneManager';
import { ConfiguratorUI } from './ui/ConfiguratorUI';
const loader=document.querySelector<HTMLElement>('#orbital-loader')!;
const label=document.querySelector<HTMLElement>('#loading-label')!;
const progress=document.querySelector<HTMLProgressElement>('#orbital-progress')!;
const percent=document.querySelector<HTMLElement>('#loading-percent')!;
let manager:SceneManager|undefined,ui:ConfiguratorUI|undefined;
async function start() {
  try {
    const runtime=await createEngine(document.querySelector<HTMLCanvasElement>('#orbital-canvas')!);
    manager=new SceneManager(runtime.engine,runtime.canvas,runtime.backend,matchMedia('(prefers-reduced-motion: reduce)').matches);
    await manager.load((value,text)=>{progress.value=value;percent.textContent=`${Math.floor(value)}%`;label.textContent=text;});
    ui=new ConfiguratorUI(manager);manager.onFrame=frame=>ui!.update(frame);
    manager.start();
    loader.classList.add('is-finished');
    await new Promise(resolve=>setTimeout(resolve,750));
    loader.hidden=true;document.body.classList.add('experience-running');
    if(new URLSearchParams(location.search).get('debug')==='1')setupDiagnostics(manager);
  } catch(error) {
    console.error('Orbital experience initialization failed:',error);
    manager?.dispose();loader.classList.remove('is-finished');loader.hidden=false;
    document.querySelector<HTMLElement>('#loading-title')!.textContent='Podemos intentarlo de nuevo.';
    label.textContent='La escena 3D no pudo prepararse en este navegador.';
    document.querySelector<HTMLElement>('#loading-actions')!.hidden=false;progress.hidden=true;percent.hidden=true;
  }
}
function setupDiagnostics(app:SceneManager) {
  const output=document.createElement('output');output.className='orbital-diagnostics';output.setAttribute('aria-label','Diagnóstico de renderizado');document.body.append(output);
  const timer=setInterval(()=> {
    output.textContent=`${app.backend} · ${app.performance.quality}\n${Math.round(app.engine.getFps())} FPS · ${app.engine.getRenderWidth()} × ${app.engine.getRenderHeight()}\n${app.space.scene.getActiveMeshes().length} meshes · ${Math.round(app.space.scene.getActiveIndices()/3).toLocaleString('es-MX')} triángulos`;
  },500);
  window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
window.addEventListener('pagehide',()=>{ui?.dispose();manager?.dispose();},{once:true});
void start();
