import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
export type Quality = 'high' | 'medium' | 'low';
export const QUALITY = {
  high: { dpr: 2, stars: 6200, earthSegments: 80, environmentSize: 256, bloom: true, ao: true, samples: 4 },
  medium: { dpr: 1.5, stars: 3600, earthSegments: 56, environmentSize: 128, bloom: true, ao: false, samples: 2 },
  low: { dpr: 1, stars: 1700, earthSegments: 36, environmentSize: 64, bloom: false, ao: false, samples: 1 }
} as const;
export function initialQuality({ mobile, memory, cores, gpu }: {mobile: boolean; memory: number; cores: number; gpu: boolean}): Quality {
  if (memory <= 4 || cores <= 4) return 'low';
  return mobile || !gpu ? 'medium' : 'high';
}
export class PerformanceManager {
  quality: Quality;
  private seconds = 0;
  private frames = 0;
  private cooldown = 0;
  onChange?: (quality: Quality) => void;
  constructor(private engine: AbstractEngine, gpu: boolean) {
    const device = navigator as Navigator & { deviceMemory?: number };
    const forced = new URLSearchParams(location.search).get('quality');
    this.quality = ['high','medium','low'].includes(forced || '') ? forced as Quality : initialQuality({mobile: matchMedia('(max-width: 700px)').matches, memory: device.deviceMemory || 8, cores: navigator.hardwareConcurrency || 8, gpu});
    this.apply();
  }
  get profile() { return QUALITY[this.quality]; }
  apply() {
    const max = Math.min(this.profile.dpr, innerWidth < 700 ? 1.5 : 2);
    this.engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio || 1, max));
  }
  update(dt: number) {
    if (document.hidden || dt <= 0) return;
    const duration = Math.min(dt, .5);
    this.cooldown += duration;
    this.seconds += duration;
    this.frames++;
    if (this.seconds < 3) return;
    const fps = this.frames / this.seconds;
    this.seconds = this.frames = 0;
    if (this.cooldown < 5 || fps >= 34 || this.quality === 'low') return;
    this.quality = this.quality === 'high' ? 'medium' : 'low';
    this.cooldown = 0;
    this.apply();
    this.onChange?.(this.quality);
  }
}
