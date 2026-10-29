import { clamp, phase } from '../utils/math';
export const INTRO_DURATION = 10.8;
export function sampleIntro(time: number) {
  const t = clamp(time, 0, INTRO_DURATION);
  return {
    time: t,
    deep: phase(t,.25,2.5), mid: phase(t,.65,3.0), foreground: phase(t,1.0,3.8),
    earth: phase(t,1.8,4.3), car: phase(t,4.0,7.2),
    rim: phase(t,3.6,6.4), reveal: phase(t,5.6,9.1),
    headlights: phase(t,7.7,9.5), ui: phase(t,9.3,10.8),
    camera: phase(t,0,10.8), complete: t >= INTRO_DURATION
  };
}
export type IntroFrame = ReturnType<typeof sampleIntro>;
export class IntroSequence {
  elapsed = 0;
  playing = false;
  constructor(public reducedMotion: boolean) {}
  start() { this.elapsed = this.reducedMotion ? INTRO_DURATION : 0; this.playing = !this.reducedMotion; }
  skip() { this.elapsed = INTRO_DURATION; this.playing = false; }
  restart() { this.start(); }
  update(dt: number) {
    if (this.playing) this.elapsed = Math.min(INTRO_DURATION, this.elapsed + dt);
    const frame = sampleIntro(this.elapsed);
    if (frame.complete) this.playing = false;
    return frame;
  }
}
