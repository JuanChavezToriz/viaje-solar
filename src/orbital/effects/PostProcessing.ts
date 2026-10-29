import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import type { Scene } from '@babylonjs/core/scene';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import { QUALITY,type Quality } from '../core/PerformanceManager';
export class PostProcessing {
  pipeline:DefaultRenderingPipeline;private ao?:SSAO2RenderingPipeline;
  constructor(private scene:Scene,private camera:Camera,quality:Quality) {
    this.pipeline=new DefaultRenderingPipeline('Orbital finish',true,scene,[camera]);
    this.pipeline.fxaaEnabled=true;this.pipeline.bloomThreshold=1.15;this.pipeline.bloomWeight=.14;this.pipeline.bloomKernel=32;this.pipeline.bloomScale=.5;
    const image=scene.imageProcessingConfiguration;
    image.toneMappingEnabled=true;image.toneMappingType=ImageProcessingConfiguration.TONEMAPPING_ACES;image.exposure=1.08;image.contrast=1.10;
    image.vignetteEnabled=true;image.vignetteWeight=.65;image.vignetteStretch=.15;
    this.setQuality(quality);
  }
  setQuality(quality:Quality) {
    const profile=QUALITY[quality];
    this.pipeline.samples=profile.samples;this.pipeline.bloomEnabled=profile.bloom;
    if(!profile.ao&&this.ao) {this.ao.dispose();this.ao=undefined;}
    if(profile.ao&&!this.ao&&SSAO2RenderingPipeline.IsSupported) {
      this.ao=new SSAO2RenderingPipeline('Orbital ambient occlusion',this.scene,{ssaoRatio:.5,blurRatio:.5},[this.camera]);
      this.ao.samples=8;this.ao.totalStrength=.25;this.ao.radius=.35;this.ao.expensiveBlur=false;
    }
  }
  dispose() {this.ao?.dispose();this.pipeline.dispose();}
}
