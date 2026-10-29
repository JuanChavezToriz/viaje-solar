const fraction = value => value - Math.floor(value);
const noise = value => fraction(Math.sin(value * 127.1 + 12.8) * 43758.5453);

export function sampleMeteor(index, seconds, width, height) {
  const age = (seconds + index * 1.6) % 5.2;
  if (age > 1.65) return null;
  const progress = age / 1.65;
  const distance = Math.min(height, width * 1.8) * (.5 + noise(index + 7) * .18);
  const x = width * (.67 + noise(index + 1) * .3) - distance * progress * .64;
  const y = height * (.035 + noise(index + 4) * .27) + distance * progress * .77;
  const length = Math.min(94, width * .19) * (.65 + noise(index + 9) * .35);
  return { x, y, tailX: x + length * .64, tailY: y - length * .77,
    opacity: Math.sin(Math.PI * progress) * .78 };
}

export function createLaunchMeteors(canvas, { reducedMotion = false } = {}) {
  const context = canvas.getContext('2d');
  const stars = Array.from({ length: 94 }, (_, i) => ({
    x: noise(i + 31), y: noise(i + 241), radius: i % 13 === 0 ? 1.05 : .55,
  }));
  let frame = 0, started = 0, departure = null, lastDraw = -Infinity;

  function draw(now) {
    if (now - lastDraw >= 1000 / 30 || reducedMotion) {
      lastDraw = now;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      const width = innerWidth, height = innerHeight;
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const time = reducedMotion ? 0 : Math.max(0, now - started) / 1000;
      const pull = departure === null ? 0 : Math.max(0, Math.min(1, (now - departure) / 1800));
      const point = (x, y) => [width / 2 + (x - width / 2) * (1 - pull * .7), height / 2 + (y - height / 2) * (1 - pull * .7)];
      stars.forEach((star, i) => {
        const [x, y] = point(fraction(star.x + time * .0008) * width, fraction(star.y + time * .0011) * height);
        const alpha = (.25 + .12 * Math.sin(time * .5 + i)) * (1 - pull);
        context.fillStyle = `rgba(213,226,237,${alpha})`;
        context.beginPath(); context.arc(x, y, star.radius, 0, Math.PI * 2); context.fill();
      });
      for (let i = 0; i < 3; i++) {
        const meteor = sampleMeteor(i, reducedMotion ? .65 : time, width, height);
        if (!meteor) continue;
        const [x, y] = point(meteor.x, meteor.y), [tailX, tailY] = point(meteor.tailX, meteor.tailY);
        const trail = context.createLinearGradient(tailX, tailY, x, y);
        trail.addColorStop(0, 'rgba(175,204,231,0)');
        trail.addColorStop(1, `rgba(224,235,247,${meteor.opacity * (1 - pull)})`);
        context.strokeStyle = trail; context.lineWidth = 1.15; context.lineCap = 'round';
        context.beginPath(); context.moveTo(tailX, tailY); context.lineTo(x, y); context.stroke();
        context.fillStyle = `rgba(255,247,230,${meteor.opacity * (1 - pull)})`;
        context.beginPath(); context.arc(x, y, 1.25, 0, Math.PI * 2); context.fill();
      }
    }
    if (!reducedMotion) frame = requestAnimationFrame(draw);
  }
  return {
    start() { cancelAnimationFrame(frame); started = performance.now(); departure = null; lastDraw = -Infinity; draw(started); },
    depart() { departure = performance.now(); },
    stop() { cancelAnimationFrame(frame); },
  };
}
