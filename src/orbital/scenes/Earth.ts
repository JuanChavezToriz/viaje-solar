import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Material } from '@babylonjs/core/Materials/material';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import { SUN_DIRECTION } from '../lighting/SpaceLighting';
import type { IntroFrame } from '../animation/Timeline';
const vertex=`precision highp float;
attribute vec3 position;attribute vec3 normal;attribute vec2 uv;
uniform mat4 world;uniform mat4 worldViewProjection;
varying vec3 vNormal;varying vec3 vWorld;varying vec2 vUV;
void main(){vec4 p=world*vec4(position,1.0);vWorld=p.xyz;vNormal=normalize(mat3(world)*normal);vUV=uv;gl_Position=worldViewProjection*vec4(position,1.0);}`;
export function earthPosition(mobile:boolean) {return mobile?new Vector3(-21,-12,-19):new Vector3(-24,-13.5,-10);}
export class Earth {
  root:TransformNode;private surface;private clouds;private atmosphere;
  constructor(scene:Scene,textures:{day:Texture;night:Texture;clouds:Texture},segments:number) {
    this.root=new TransformNode('Earth · orbital background',scene);
    this.surface=MeshBuilder.CreateSphere('Earth · surface',{diameter:16.4,segments},scene);this.surface.parent=this.root;
    const material=new ShaderMaterial('Earth · day terminator night',scene,{vertexSource:vertex,fragmentSource:`precision highp float;
      varying vec3 vNormal;varying vec3 vWorld;varying vec2 vUV;uniform vec3 cameraPosition;uniform vec3 sunDirection;
      uniform sampler2D dayMap;uniform sampler2D nightMap;
      void main(){vec3 n=normalize(vNormal),v=normalize(cameraPosition-vWorld);float light=dot(n,sunDirection);
      vec3 day=pow(texture2D(dayMap,vUV).rgb,vec3(2.2));vec3 night=pow(texture2D(nightMap,vUV).rgb,vec3(2.2));
      float terminator=smoothstep(-.12,.18,light);float ocean=smoothstep(.02,.12,day.b-day.r);
      float spec=pow(max(0.0,dot(reflect(-sunDirection,n),v)),100.0)*ocean*.28;
      vec3 color=day*(max(light,0.0)*1.12+.016)+night*(1.0-terminator)*1.7+vec3(.6,.75,1.)*spec;
      gl_FragColor=vec4(color,1.);}`},{attributes:['position','normal','uv'],uniforms:['world','worldViewProjection','cameraPosition','sunDirection'],samplers:['dayMap','nightMap']});
    material.setTexture('dayMap',textures.day);material.setTexture('nightMap',textures.night);material.setVector3('sunDirection',SUN_DIRECTION);
    this.surface.material=material;
    this.clouds=MeshBuilder.CreateSphere('Earth · clouds',{diameter:16.48,segments},scene);this.clouds.parent=this.root;
    const clouds=new ShaderMaterial('Earth · cloud layer',scene,{vertexSource:vertex,fragmentSource:`precision highp float;
      varying vec3 vNormal;varying vec2 vUV;uniform vec3 sunDirection;uniform sampler2D cloudMap;
      void main(){float c=texture2D(cloudMap,vUV).r;float day=max(dot(normalize(vNormal),sunDirection),0.0);gl_FragColor=vec4(vec3(.75,.82,.91)*(day+.035),smoothstep(.13,.80,c)*.48);}`},{attributes:['position','normal','uv'],uniforms:['world','worldViewProjection','sunDirection'],samplers:['cloudMap'],needAlphaBlending:true});
    clouds.setTexture('cloudMap',textures.clouds);clouds.setVector3('sunDirection',SUN_DIRECTION);clouds.backFaceCulling=true;clouds.disableDepthWrite=true;
    this.clouds.material=clouds;
    this.atmosphere=MeshBuilder.CreateSphere('Earth · thin atmosphere',{diameter:16.73,segments},scene);this.atmosphere.parent=this.root;
    const air=new ShaderMaterial('Earth · blue limb',scene,{vertexSource:vertex,fragmentSource:`precision highp float;
      varying vec3 vNormal;varying vec3 vWorld;uniform vec3 cameraPosition;uniform vec3 sunDirection;
      void main(){vec3 n=normalize(vNormal),v=normalize(cameraPosition-vWorld);float rim=pow(1.0-abs(dot(n,v)),4.4);float day=.35+.65*max(dot(n,sunDirection),0.0);gl_FragColor=vec4(vec3(.08,.32,.85),rim*day*.38);}`},{attributes:['position','normal','uv'],uniforms:['world','worldViewProjection','cameraPosition','sunDirection'],needAlphaBlending:true});
    air.setVector3('sunDirection',SUN_DIRECTION);air.alphaMode=Material.MATERIAL_ALPHABLEND;air.disableDepthWrite=true;air.backFaceCulling=false;
    this.atmosphere.material=air;
    this.root.position.copyFrom(earthPosition(innerWidth<700));
    for(const mesh of [this.surface,this.clouds,this.atmosphere])mesh.isPickable=false;
  }
  update(frame:IntroFrame,time:number,reduced:boolean) {
    this.root.setEnabled(frame.earth>.001);
    this.root.position.copyFrom(earthPosition(innerWidth<700));this.root.position.x-=(1-frame.earth)*14;
    this.surface.rotation.y=.4+time*.007;
    this.clouds.rotation.y=.4+time*.0085;
  }
}
