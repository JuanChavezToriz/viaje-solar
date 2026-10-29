import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import type { Scene } from '@babylonjs/core/scene';
export function createNebula(scene:Scene) {
  const mesh=MeshBuilder.CreatePlane('Distant nebula',{width:200,height:140,sideOrientation:Mesh.DOUBLESIDE},scene);
  mesh.position.set(30,12,-160);mesh.isPickable=false;
  const material=new ShaderMaterial('Quiet nebula',scene,{vertexSource:`precision highp float;attribute vec3 position;attribute vec2 uv;uniform mat4 worldViewProjection;varying vec2 vUV;void main(){vUV=uv;gl_Position=worldViewProjection*vec4(position,1.);}`,
    fragmentSource:`precision highp float;varying vec2 vUV;uniform float opacity;void main(){vec2 p=vUV-.5;float band=exp(-pow((p.y+.13*sin(p.x*7.))/.13,2.))*exp(-dot(p,p)*7.);float wisps=.5+.5*sin(p.x*23.+sin(p.y*17.));gl_FragColor=vec4(vec3(.06,.10,.23),band*(.5+wisps*.5)*opacity);}`},
    {attributes:['position','uv'],uniforms:['worldViewProjection','opacity'],needAlphaBlending:true});
  material.setFloat('opacity',0);material.disableDepthWrite=true;mesh.material=material;
  return { update(reveal:number){material.setFloat('opacity',reveal*.14);} };
}
