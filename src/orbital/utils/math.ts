export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const easeInOutCubic = (t: number) => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
export const easeOutQuart = (t: number) => 1 - Math.pow(1-clamp(t),4);
export const easeInOutQuart = (t: number) => t < .5 ? 8*t*t*t*t : 1 - Math.pow(-2*t+2,4)/2;
export const phase = (time: number, start: number, end: number) => easeInOutCubic(clamp((time-start)/(end-start)));
export const damp = (value: number, target: number, rate: number, dt: number) => value + (target-value)*(1-Math.exp(-rate*dt));
