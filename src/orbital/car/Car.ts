import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Scene } from '@babylonjs/core/scene';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import { CarMaterials } from './CarMaterials';
export type WheelStyle='sport'|'racing'|'carbon';
export class Car {
  root:TransformNode;
  rotationRoot:TransformNode;
  materials:CarMaterials;
  wheelSets:Record<WheelStyle,AbstractMesh[]>={sport:[],racing:[],carbon:[]};
  constructor(container:AssetContainer,scene:Scene) {
    this.root=new TransformNode('Orbital · floating chassis',scene);
    this.rotationRoot=new TransformNode('Orbital · user rotation',scene);this.rotationRoot.parent=this.root;
    const normalizer=new TransformNode('Orbital · model normalization',scene);normalizer.parent=this.rotationRoot;
    const roots=container.meshes.filter(mesh=>!mesh.parent);
    container.addAllToScene();
    for(const mesh of roots) mesh.parent=normalizer;
    normalizer.computeWorldMatrix(true);
    for(const mesh of container.meshes) mesh.computeWorldMatrix(true);
    const bounds=normalizer.getHierarchyBoundingVectors(true);
    const center=bounds.min.add(bounds.max).scale(.5), length=bounds.max.z-bounds.min.z;
    const scale=4.8/length;
    normalizer.scaling.setAll(scale);normalizer.position.copyFrom(center.scale(-scale));
    normalizer.computeWorldMatrix(true);
    for(const mesh of container.meshes) { mesh.computeWorldMatrix(true);mesh.isPickable=false; }
    this.materials=new CarMaterials(container,scene);
    this.wheelSets.sport=container.meshes.filter(mesh=>/^Rim[12]$/.test(mesh.material?.name||'')&&mesh.getTotalVertices()>0);
    this.buildWheels(scene,'racing');this.buildWheels(scene,'carbon');
    this.setWheelBlend('sport',1);
  }
  private buildWheels(scene:Scene,style:'racing'|'carbon') {
    for(const group of ['WheelFrontL','WheelFrontR','WheelRearL','WheelRearR']) {
      const source=this.wheelSets.sport.filter(mesh=>mesh.name.startsWith(group));
      if(!source.length) continue;
      const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);
      for(const mesh of source) {
        const box=mesh.getBoundingInfo().boundingBox;
        min.minimizeInPlace(box.minimumWorld);max.maximizeInPlace(box.maximumWorld);
      }
      const center=min.add(max).scale(.5),radius=Math.max(max.y-min.y,max.z-min.z)*.5;
      center.x += Math.sign(center.x)*.018;
      const pieces:Mesh[]=[];
      const ring=MeshBuilder.CreateTorus(`${group} ${style} hoop`,{diameter:radius*1.94,thickness:radius*.11,tessellation:48},scene);
      ring.rotation.z=Math.PI/2;ring.position.copyFrom(center);pieces.push(ring);
      const spokes=style==='racing'?10:5;
      for(let i=0;i<spokes;i++) {
        const angle=i/spokes*Math.PI*2;
        const spoke=MeshBuilder.CreateBox(`${style} spoke`,{width:radius*.12,height:radius*.85,depth:radius*(style==='carbon'?.26:.10)},scene);
        spoke.position.copyFrom(center).addInPlace(new Vector3(0,Math.cos(angle)*radius*.48,Math.sin(angle)*radius*.48));
        spoke.rotation.x=angle;pieces.push(spoke);
      }
      const hub=MeshBuilder.CreateCylinder(`${style} hub`,{diameter:radius*.39,height:radius*.15,tessellation:32},scene);
      hub.rotation.z=Math.PI/2;hub.position.copyFrom(center);pieces.push(hub);
      for(const piece of pieces) piece.material=this.materials[style];
      const wheel=Mesh.MergeMeshes(pieces,true,true);
      if(wheel) { wheel.name=`${group} · ${style}`;wheel.parent=this.rotationRoot;wheel.isPickable=false;wheel.setEnabled(false);this.wheelSets[style].push(wheel); }
    }
  }
  setWheelBlend(style:WheelStyle,visibility:number) {
    for(const mesh of this.wheelSets[style]) {
      mesh.setEnabled(visibility>.001);mesh.visibility=visibility;
    }
  }
}
