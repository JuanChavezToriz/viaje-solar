import { Engine } from '@babylonjs/core/Engines/engine';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
const assetBase = import.meta.env.BASE_URL;
function withTimeout<T>(operation:Promise<T>,duration:number) {
  let timer:number;
  const timeout=new Promise<never>((_resolve,reject)=>{timer=window.setTimeout(()=>reject(new Error('Graphics adapter timed out')),duration);});
  return Promise.race([operation,timeout]).finally(()=>clearTimeout(timer));
}
export async function createEngine(original: HTMLCanvasElement) {
  let canvas = original;
  const forceWebGL = new URLSearchParams(location.search).get('renderer') === 'webgl';
  if (!forceWebGL && 'gpu' in navigator) {
    let candidate: WebGPUEngine | undefined;
    try {
      if (await withTimeout(WebGPUEngine.IsSupportedAsync,5000)) {
        candidate = new WebGPUEngine(canvas, {
          antialias: true, adaptToDeviceRatio: false,
          glslangOptions: { jsPath:`${assetBase}assets/runtime/glslang/glslang.js`, wasmPath:`${assetBase}assets/runtime/glslang/glslang.wasm` },
          twgslOptions: { jsPath:`${assetBase}assets/runtime/twgsl/twgsl.js`, wasmPath:`${assetBase}assets/runtime/twgsl/twgsl.wasm` }
        });
        await withTimeout(candidate.initAsync(),15000);
        return { engine: candidate, canvas, backend: 'WebGPU' as const };
      }
    } catch (error) {
      console.warn('WebGPU initialization failed; using WebGL.', error);
      try {candidate?.dispose();} catch { /* Context may have failed before initialization. */ }
      const replacement = canvas.cloneNode(false) as HTMLCanvasElement;
      canvas.replaceWith(replacement);
      canvas = replacement;
    }
  }
  if (!Engine.IsSupported) throw new Error('Este navegador no tiene un contexto 3D disponible.');
  return { engine: new Engine(canvas, true, { preserveDrawingBuffer:false, stencil:true, powerPreference:'high-performance' }, false), canvas, backend:'WebGL' as const };
}
