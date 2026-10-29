export function touchIntent(dx, dy, threshold = 9) {
  if (Math.hypot(dx, dy) < threshold) return 'pending';
  return Math.abs(dx) > Math.abs(dy) * 1.15 ? 'swipe' : 'scroll';
}

// Native vertical scrolling remains available. Only a deliberate horizontal
// gesture changes destination; the browser can cancel the pointer for scrolling.
export function swipeStep(dx, dy, elapsed, width) {
  if (touchIntent(dx, dy) !== 'swipe') return 0;
  const distance = Math.abs(dx);
  const deliberate = distance >= Math.max(48, width * .16);
  const flick = distance >= 28 && distance / Math.max(1, elapsed) > .5;
  return deliberate || flick ? dx < 0 ? 1 : -1 : 0;
}

export function attachPortraitTouch(canvas, {
  enabled, onSwipe = () => {}, onDrag = () => {}, onInteract = () => {}, onScroll = () => {},
  width = () => globalThis.window?.innerWidth || 390,
}) {
  let gesture = null;
  canvas.addEventListener('pointerdown', event => {
    if (event.isPrimary === false) { gesture = null; onDrag(0); return; }
    if (event.pointerType !== 'touch' || !enabled() || event.clientX < 20) return;
    if (event.target.closest?.('button, a, summary, input, select, textarea, .sim-options-panel, #planet-panel.is-expanded, #planet-gesture-surface')) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0, started: event.timeStamp, intent: 'pending' };
  });
  canvas.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId || !enabled()) return;
    gesture.dx = event.clientX - gesture.x;
    gesture.dy = event.clientY - gesture.y;
    if (gesture.intent === 'pending') {
      gesture.intent = touchIntent(event.clientX - gesture.x, event.clientY - gesture.y);
      if (gesture.intent === 'scroll') onScroll();
      if (gesture.intent === 'swipe') onInteract();
    }
    if (gesture.intent !== 'swipe') return;
    onDrag(Math.max(-.8, Math.min(.8, gesture.dx / width())));
  }, { passive: true });
  const release = event => {
    if (gesture?.id !== event.pointerId) return;
    const step = event.type === 'pointerup' && enabled() && gesture.intent === 'swipe'
      ? swipeStep(gesture.dx, gesture.dy, event.timeStamp - gesture.started, width()) : 0;
    gesture = null;
    onDrag(0);
    if (step) onSwipe(step);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
}

// The image has its own gesture surface; the card keeps native vertical scroll
// and horizontal destination paging. Two fingers never select another world.
export function attachPlanetManipulation(surface, { enabled, rotate, zoom, onInteract = () => {} }) {
  const points = new Map();
  let previous = null;
  let multi = false;
  const sample = () => {
    const p = [...points.values()];
    if (!p.length) return null;
    return p.length === 1 ? { x: p[0].x, y: p[0].y, distance: 0 }
      : { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2,
        distance: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) };
  };
  surface.addEventListener('pointerdown', event => {
    if (!enabled() || event.button > 0) return;
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.size > 1) multi = true;
    previous = sample();
    surface.setPointerCapture?.(event.pointerId);
  });
  surface.addEventListener('pointermove', event => {
    if (!points.has(event.pointerId)) return;
    if (!enabled()) { points.clear(); previous = null; multi = false; return; }
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const next = sample();
    if (previous && (!multi || points.size > 1)) {
      const dx = next.x - previous.x, dy = next.y - previous.y;
      if (dx || dy) { rotate(dx * .006, dy * .004); onInteract(); }
      if (next.distance > 5 && previous.distance > 5) zoom(previous.distance / next.distance);
    }
    previous = next;
  });
  const release = event => {
    points.delete(event.pointerId);
    previous = sample();
    if (!points.size) multi = false;
  };
  surface.addEventListener('pointerup', release);
  surface.addEventListener('pointercancel', release);
  surface.addEventListener('lostpointercapture', release);
}
