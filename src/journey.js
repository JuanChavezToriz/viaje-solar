export const NEIGHBORHOOD_SCALE = 1400;
export const ARRIVAL_DURATION = 5.6;

// A delayed frame must not fast-forward the camera through the arrival.
export function advanceArrival(elapsed, frameDelta) {
  return Math.min(ARRIVAL_DURATION, elapsed + Math.max(0, Math.min(.05, Number.isFinite(frameDelta) ? frameDelta : 0)));
}

const clamp = value => Math.max(0, Math.min(1, value));
export function easeBetween(value, start, end) {
  const t = clamp((value - start) / (end - start));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// Coordinate units grow as we enter the galaxy. Physical camera distance keeps
// decreasing, including while the solar scene becomes large enough to explore.
export function sampleJourney(progress, entryDistance, solarDistance) {
  const p = clamp(progress);
  const zoom = easeBetween(p, 0, 1);
  const galacticScale = Math.exp(Math.log(NEIGHBORHOOD_SCALE) * easeBetween(p, 0.52, 1));
  const physicalDistance = Math.exp(Math.log(entryDistance)
    + (Math.log(solarDistance / NEIGHBORHOOD_SCALE) - Math.log(entryDistance)) * zoom);
  const distance = physicalDistance * galacticScale;
  const appearance = 0.10 + 0.90 * easeBetween(p, 0.46, 1);
  return {
    focus: easeBetween(p, 0.01, 0.48),
    rebase: easeBetween(p, 0.10, 0.56),
    rotation: easeBetween(p, 0.48, 0.97),
    composition: easeBetween(p, 0.86, 1),
    galacticScale, physicalDistance, distance,
    solarScale: distance / solarDistance * appearance,
    sunReveal: easeBetween(p, 0.37, 0.54),
    planetsReveal: easeBetween(p, 0.64, 0.94),
    flightDistance: Math.log(entryDistance / physicalDistance) * 82,
    flightOpacity: easeBetween(p, 0.04, 0.21) * (1 - easeBetween(p, 0.88, 1)) * 0.85
  };
}

export function sampleArrival(elapsed, homeDistance, departureScale = 4.8) {
  const progress = clamp(elapsed / ARRIVAL_DURATION);
  const approach = easeBetween(progress, 0, 1);
  return {
    progress, approach,
    distance: homeDistance * Math.exp(Math.log(departureScale) * (1 - approach)),
    flightDistance: approach * 175,
    flightOpacity: (0.38 + 0.30 * easeBetween(progress, 0, 0.25)) * (1 - easeBetween(progress, 0.62, 1)),
    copyOpacity: 1 - easeBetween(progress, 0.56, 0.90)
  };
}
