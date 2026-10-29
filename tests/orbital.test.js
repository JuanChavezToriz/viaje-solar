import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import ts from 'typescript';

// Execute the TypeScript scene components against Babylon's actual NullEngine.
// This validates geometry/state/render commands; it cannot validate GPU shading.
registerHooks({
  resolve(specifier,context,next) {
    if(specifier.startsWith('@babylonjs/')&&!specifier.endsWith('.js'))return next(`${specifier}.js`,context);
    if(specifier.startsWith('.')&&context.parentURL&&!specifier.endsWith('.js')&&!specifier.endsWith('.ts')) {
      const typed=new URL(`${specifier}.ts`,context.parentURL);
      if(existsSync(typed))return next(typed.href,context);
    }
    return next(specifier,context);
  },
  load(url,context,next) {
    if(url.endsWith('.ts'))return {format:'module',source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText,shortCircuit:true};
    return next(url,context);
  }
});
const api=await import('./helpers/orbital-api.ts');
globalThis.innerWidth=1440;globalThis.innerHeight=900;

function glb(path) {
  const bytes=readFileSync(path);assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const jsonSize=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonSize).toString());
  return {json,bin:bytes.subarray(20+jsonSize+8)};
}
const high=glb('public/assets/car/concept-car.glb'),low=glb('public/assets/car/concept-car-low.glb');
function accessor(index) {
  const item=high.json.accessors[index],view=high.json.bufferViews[item.bufferView];
  const count={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[item.type],size={5126:4,5125:4,5123:2,5121:1}[item.componentType];
  const read={5126:'readFloatLE',5125:'readUInt32LE',5123:'readUInt16LE',5121:'readUInt8'}[item.componentType];
  return Array.from({length:item.count*count},(_,i)=>high.bin[read]((view.byteOffset||0)+(item.byteOffset||0)+Math.floor(i/count)*(view.byteStride||size*count)+(i%count)*size));
}
const engine=new api.NullEngine({renderWidth:1440,renderHeight:900,textureSize:512,deterministicLockstep:false,lockstepMaxSteps:4});
const scene=new api.Scene(engine);scene.useRightHandedSystem=true;
const container=new api.AssetContainer(scene),root=new api.Mesh('__root__',scene);container.meshes.push(root);
const materials=high.json.materials.map(item=>new api.PBRMaterial(item.name,scene));container.materials.push(...materials);
const nodes=high.json.nodes.map(item=> {
  const node=new api.TransformNode(item.name||'node',scene);node.parent=root;
  if(item.matrix)api.Matrix.FromArray(item.matrix).decompose(node.scaling,node.rotationQuaternion=new api.Quaternion(),node.position);
  if(item.translation)node.position.copyFrom(api.Vector3.FromArray(item.translation));
  if(item.scale)node.scaling.copyFrom(api.Vector3.FromArray(item.scale));
  if(item.rotation)node.rotationQuaternion=api.Quaternion.FromArray(item.rotation);
  return node;
});container.transformNodes.push(...nodes);
high.json.nodes.forEach((item,i)=>{for(const child of item.children||[])nodes[child].parent=nodes[i];});
high.json.nodes.forEach((item,i)=> {
  if(item.mesh===undefined)return;
  const source=high.json.meshes[item.mesh];
  source.primitives.forEach((primitive,p)=> {
    const mesh=new api.Mesh(`${item.name||source.name}_primitive${p}`,scene),data=new api.VertexData();
    data.positions=accessor(primitive.attributes.POSITION);
    data.normals=primitive.attributes.NORMAL===undefined?undefined:accessor(primitive.attributes.NORMAL);
    data.indices=accessor(primitive.indices);data.applyToMesh(mesh);
    mesh.material=materials[primitive.material];mesh.parent=nodes[i];container.meshes.push(mesh);
  });
});
container.removeAllFromScene();
const car=new api.Car(container,scene),config=new api.CarConfigurator(car),rig=new api.CinematicCamera(scene);
rig.update(10.8);scene.activeCamera=rig.camera;
after(()=>{scene.dispose();engine.dispose();});

test('the real GLB geometry loads, normalizes and supplies all three wheel sets',async()=> {
  const bounds=car.rotationRoot.getHierarchyBoundingVectors(true);
  assert.ok(Math.abs((bounds.max.z-bounds.min.z)-4.8)<.05);
  assert.equal(car.wheelSets.racing.length,4);assert.equal(car.wheelSets.carbon.length,4);assert.ok(car.wheelSets.sport.length>=4);
  await scene.whenReadyAsync();scene.render();assert.ok(scene.getActiveIndices()>500000,`real vehicle geometry is submitted to the renderer (${scene.getActiveIndices()} indices)`);
});
test('paint blends continuously, preserves clearcoat and handles rapid changes',()=> {
  const material=car.materials.paint[0],initial=material.albedoColor.clone();
  config.setPaint('electric');config.update(.15);const partial=material.albedoColor.clone();
  assert.notDeepEqual(partial,initial);assert.equal(material.clearCoat.intensity,1);
  config.setPaint('arctic');assert.deepEqual(material.albedoColor,partial,'a new choice does not snap the material');
  config.update(1);assert.ok(material.albedoColor.r>.6);assert.equal(material.clearCoat.isEnabled,true);
});
test('wheel variants crossfade and retain the original tires and brakes',()=> {
  config.setWheels('racing');config.update(.10);
  assert.ok(car.wheelSets.racing[0].visibility>0&&car.wheelSets.racing[0].visibility<1);
  assert.ok(car.wheelSets.sport[0].visibility>0&&car.wheelSets.sport[0].visibility<1);
  for(let frame=0;frame<150;frame++)config.update(1/60);
  assert.equal(car.wheelSets.racing[0].visibility,1);assert.equal(car.wheelSets.sport[0].isEnabled(),false);
  assert.ok(scene.meshes.some(mesh=>/^Tire/i.test(mesh.material?.name||'')&&mesh.isEnabled()));
});
test('interior changes independently from body paint',()=> {
  const body=car.materials.paint[0].albedoColor.clone();config.setInterior('red');config.update(1);
  assert.deepEqual(car.materials.paint[0].albedoColor,body);
  assert.ok(car.materials.interior[0].albedoColor.r>car.materials.interior[0].albedoColor.b);
});
test('intro staging reveals stars, Earth, silhouette, lights and UI in order',()=> {
  assert.equal(api.sampleIntro(0).car,0);assert.equal(api.sampleIntro(3).car,0);assert.ok(api.sampleIntro(3).earth>0);
  assert.equal(api.sampleIntro(5).headlights,0);assert.equal(api.sampleIntro(8).ui,0);
  let previous=0;for(let t=7.7;t<9.5;t+=.1){const level=api.sampleIntro(t).headlights;assert.ok(level>=previous);previous=level;}
  const animations=new api.CarAnimations(car,true);animations.update(api.sampleIntro(10.8),30);
  assert.equal(car.root.position.x,0);assert.equal(car.materials.headlights[0].emissiveIntensity,3.2);
});
test('skip, replay and reduced motion keep a coherent final scene',()=> {
  const timeline=new api.IntroSequence(false);timeline.start();timeline.update(4.2);timeline.skip();assert.equal(timeline.update(.01).complete,true);
  timeline.restart();assert.equal(timeline.elapsed,0);assert.equal(timeline.playing,true);
  const reduced=new api.IntroSequence(true);reduced.start();assert.equal(reduced.update(.01).complete,true);
});
test('the Earth projects to the lower left and the car retains the hero position',()=> {
  scene.updateTransformMatrix(true);
  const viewport=rig.camera.viewport.toGlobal(1440,900),transform=scene.getTransformMatrix();
  const earth=api.Vector3.Project(api.earthPosition(false),api.Matrix.Identity(),transform,viewport);
  const body=api.Vector3.Project(api.Vector3.Zero(),api.Matrix.Identity(),transform,viewport);
  assert.ok(earth.x<1440*.4&&earth.y>900*.65);
  assert.ok(body.x>1440*.5&&body.x<1440*.75);
});
test('low assets are self-contained, logo-free and limited to 1K textures',()=> {
  assert.equal(low.json.meshes.length,high.json.meshes.length);assert.equal(low.json.materials.length,high.json.materials.length);
  for(const image of low.json.images){assert.equal(image.uri,undefined);const view=low.json.bufferViews[image.bufferView],bytes=low.bin.subarray(view.byteOffset,view.byteOffset+view.byteLength);assert.ok(bytes.readUInt32BE(16)<=1024&&bytes.readUInt32BE(20)<=1024);}
  assert.ok(!low.json.images.some(image=>/Khronos|3DCommerce/i.test(image.name||'')));
  assert.equal(low.json.extensionsRequired,undefined);
});
test('quality profiles respect hardware limits and degrade after sustained low FPS',()=> {
  assert.equal(api.initialQuality({mobile:true,memory:2,cores:4,gpu:false}),'low');
  assert.equal(api.initialQuality({mobile:false,memory:8,cores:8,gpu:true}),'high');
  assert.ok(api.QUALITY.low.dpr<=1.5&&api.QUALITY.high.dpr<=2);
  globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};globalThis.location={search:''};globalThis.matchMedia=()=>({matches:false});globalThis.devicePixelRatio=2;
  Object.defineProperty(navigator,'hardwareConcurrency',{value:8,configurable:true});Object.defineProperty(navigator,'deviceMemory',{value:8,configurable:true});
  const manager=new api.PerformanceManager({setHardwareScalingLevel(){}},true),changes=[];manager.onChange=tier=>changes.push(tier);
  for(let frame=0;frame<400;frame++)manager.update(.05);
  assert.equal(manager.quality,'low');assert.deepEqual(changes,['medium','low']);
  const stalled=new api.PerformanceManager({setHardwareScalingLevel(){}},true);
  for(let frame=0;frame<70;frame++)stalled.update(.3);
  assert.equal(stalled.quality,'low','severely slow devices must still trigger a quality reduction');
});
