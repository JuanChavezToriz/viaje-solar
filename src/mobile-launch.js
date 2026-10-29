import { createLaunchMeteors } from './launch-meteors.js';

export function createMobileLaunch({ onStart, onSkip = () => {}, onComplete = () => {}, reducedMotion = false }) {
  const screen = document.querySelector('#mobile-launch');
  const button = document.querySelector('#discover');
  const logo = screen.querySelector('.launch-logo');
  const backdrop = screen.querySelector('.launch-backdrop');
  const flare = screen.querySelector('#launch-flare');
  const meteors = createLaunchMeteors(screen.querySelector('#launch-dust'), { reducedMotion });
  const status = screen.querySelector('[role="status"]');
  let waiting = document.documentElement.classList.contains('launch-pending');
  let ready = false;
  let playing = false;
  let version = 0;
  let frame = 0;
  let sceneStarted = false;
  const previousInert = new Map();

  function isolate(active) {
    if (active) {
      for (const element of document.body.children) {
        if (element === screen || element.tagName === 'SCRIPT') continue;
        if (!previousInert.has(element)) previousInert.set(element, element.inert);
        element.inert = true;
      }
    } else {
      for (const [element, value] of previousInert) element.inert = value;
      previousInert.clear();
    }
  }

  function finish() {
    playing = waiting = false;
    screen.hidden = true;
    document.documentElement.classList.remove('launch-pending');
    document.body.dataset.launch = 'done';
    meteors.stop();
    isolate(false);
    const skip = document.querySelector('#skip-intro');
    const next = skip?.closest('[hidden]') ? document.querySelector('.journey-cue') : skip;
    next?.focus({ preventScroll: true });
    onComplete();
  }

  function light(token) {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const size = 360;
    flare.width = flare.height = size * ratio;
    const context = flare.getContext('2d');
    context.scale(ratio, ratio);
    const start = performance.now();
    return new Promise(resolve => {
      const tick = now => {
        if (token !== version) { resolve(); return; }
        const p = Math.max(0, Math.min(1, (now - start) / 1400));
        const intensity = Math.sin(Math.PI * p) ** 1.5;
        context.clearRect(0, 0, size, size);
        context.globalCompositeOperation = 'lighter';
        const radius = 8 + 115 * intensity;
        const glow = context.createRadialGradient(180, 180, 0, 180, 180, radius);
        glow.addColorStop(0, `rgba(255,255,250,${intensity})`);
        glow.addColorStop(.12, `rgba(255,234,194,${intensity * .7})`);
        glow.addColorStop(.42, `rgba(214,175,120,${intensity * .14})`);
        glow.addColorStop(1, 'rgba(214,175,120,0)');
        context.fillStyle = glow;
        context.fillRect(0, 0, size, size);
        for (const [horizontal, length] of [[true, 120], [false, 210]]) {
          const ray = horizontal
            ? context.createLinearGradient(180 - length / 2, 0, 180 + length / 2, 0)
            : context.createLinearGradient(0, 180 - length / 2, 0, 180 + length / 2);
          ray.addColorStop(0, 'rgba(255,243,220,0)');
          ray.addColorStop(.5, `rgba(255,252,240,${intensity * .9})`);
          ray.addColorStop(1, 'rgba(255,243,220,0)');
          context.fillStyle = ray;
          context.fillRect(horizontal ? 180 - length / 2 : 179.4, horizontal ? 179.4 : 180 - length / 2,
            horizontal ? length : 1.2, horizontal ? 1.2 : length);
        }
        for (let i = 0; i < 36; i++) {
          const angle = i * 2.39996;
          const distance = (18 + i * 2.3) * (.45 + p * .8);
          context.fillStyle = `rgba(239,221,190,${intensity * (.15 + i % 4 * .08)})`;
          context.beginPath();
          context.arc(180 + Math.cos(angle) * distance, 180 + Math.sin(angle) * distance * .58, i % 7 === 0 ? 1.1 : .55, 0, Math.PI * 2);
          context.fill();
        }
        if (p === 1) { resolve(); return; }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
  }

  async function start(instant = false) {
    if (!waiting || !ready || playing) return;
    const token = ++version;
    waiting = false;
    playing = true;
    meteors.depart();
    button.disabled = true;
    document.body.dataset.launch = 'departing';
    if (reducedMotion || instant) {
      sceneStarted = true;
      onStart();
      onSkip();
      finish();
      return;
    }
    const bounds = button.getBoundingClientRect();
    const dx = innerWidth / 2 - (bounds.left + bounds.width / 2);
    const dy = innerHeight / 2 - (bounds.top + bounds.height / 2);
    logo.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 260, fill: 'forwards' });
    for (const label of button.children) label.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: 'forwards' });
    const squeeze = 16 / bounds.width;
    button.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { offset: .32, transform: `translate(0,0) scale(${squeeze},.85)`, opacity: 1 },
      { offset: .86, transform: `translate(${dx}px,${dy}px) scale(${squeeze},.3)`, opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) scale(${squeeze * .25},.08)`, opacity: 0 },
    ], { duration: 950, easing: 'cubic-bezier(.65,0,.2,1)', fill: 'forwards' });
    await new Promise(resolve => setTimeout(resolve, 700));
    if (token !== version) return;
    onStart();
    sceneStarted = true;
    document.body.dataset.launch = 'revealing';
    backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 950, easing: 'ease-in-out', fill: 'forwards' });
    await light(token);
    if (token === version) finish();
  }

  function show() {
    ++version;
    cancelAnimationFrame(frame);
    screen.querySelectorAll('*').forEach(element => element.getAnimations().forEach(animation => animation.cancel()));
    flare.getContext('2d').clearRect(0, 0, flare.width, flare.height);
    screen.hidden = false;
    waiting = true;
    playing = false;
    sceneStarted = false;
    document.documentElement.classList.add('launch-pending');
    document.body.dataset.launch = 'waiting';
    button.disabled = !ready;
    isolate(true);
    meteors.start();
    if (ready) button.focus({ preventScroll: true });
  }

  button.addEventListener('click', () => { void start(); });
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !waiting && !playing) return;
    event.preventDefault();
    if (playing) {
      ++version;
      cancelAnimationFrame(frame);
      onStart();
      onSkip();
      finish();
    } else void start(true);
  });
  if (waiting) show();
  return {
    show,
    markReady() {
      if (ready) return;
      ready = true;
      button.disabled = false;
      button.removeAttribute('aria-busy');
      status.textContent = '';
    },
    get waiting() { return waiting; },
    get playing() { return playing; },
    get covering() { return waiting || playing && !sceneStarted; },
    get isReady() { return ready; },
  };
}
