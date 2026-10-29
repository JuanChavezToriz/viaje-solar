// Browser-compatible helpers. No NASA requests occur in the animation loop.
const DAY_MS = 86400000;

// Cubic Hermite interpolation uses both position and velocity.
// It approximates positions between downloaded samples; it is not a new JPL calculation.
export function positionAt(samples, utc) {
  const epoch = typeof utc === 'number' ? utc : Date.parse(utc);
  if (!Number.isFinite(epoch) || !samples?.length) throw new Error('Fecha o muestras inválidas.');
  const first = Date.parse(samples[0].utc), last = Date.parse(samples.at(-1).utc);
  if (epoch < first || epoch > last) throw new RangeError('La fecha está fuera del intervalo descargado.');
  if (epoch === last) return [...samples.at(-1).positionAu];
  let lo = 0, hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (Date.parse(samples[mid].utc) <= epoch) lo = mid; else hi = mid;
  }
  const a = samples[lo], b = samples[hi];
  const start = Date.parse(a.utc), end = Date.parse(b.utc);
  const t = (epoch - start) / (end - start);
  const days = (end - start) / DAY_MS;
  const h00 = 2*t*t*t - 3*t*t + 1;
  const h10 = t*t*t - 2*t*t + t;
  const h01 = -2*t*t*t + 3*t*t;
  const h11 = t*t*t - t*t;
  return a.positionAu.map((value, axis) =>
    h00*value + h10*days*a.velocityAuPerDay[axis]
      + h01*b.positionAu[axis] + h11*days*b.velocityAuPerDay[axis]
  );
}

// xyzAU is in the shared J2000 ecliptic frame, centered on the Sun.
// visibleScale is explicitly an artistic scale; the stored NASA vectors stay intact.
export function applyHorizonsPosition(object, xyzAu, THREE, visibleScale) {
  if (!Number.isFinite(visibleScale) || visibleScale <= 0) throw new Error('Define una escala visual positiva.');
  const [x, y, z] = xyzAu;
  const local = new THREE.Vector3(x, z, -y).multiplyScalar(visibleScale);
  // The current scene already applies a per-planet inclination/node quaternion.
  // Undo it here to avoid rotating the common NASA reference frame a second time.
  local.applyQuaternion(object.orbitalPlane.quaternion.clone().invert());
  object.pivot.position.copy(local);
  return object.pivot.position;
}
