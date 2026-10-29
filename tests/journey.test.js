import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleJourney, sampleArrival, advanceArrival, NEIGHBORHOOD_SCALE, ARRIVAL_DURATION } from '../src/journey.js';
import { sampleMeteor } from '../src/launch-meteors.js';
import { createStellarPassage } from '../src/stellar-passage.js';
import * as THREE from '../node_modules/three/src/Three.js';

test('the camera continuously approaches the same galactic location at every scale', () => {
  let previous = Infinity;
  for (let step = 0; step <= 1000; step++) {
    const flight = sampleJourney(step / 1000, 45, 48);
    for (const value of Object.values(flight)) assert.ok(Number.isFinite(value));
    assert.ok(flight.physicalDistance <= previous + 1e-10);
    assert.ok(Math.abs(flight.distance / flight.galacticScale - flight.physicalDistance) < 1e-10);
    assert.ok(flight.solarScale > 0);
    previous = flight.physicalDistance;
  }
});

test('galactic and solar coordinate frames join at their intended camera distances', () => {
  for (const [entry, solar] of [[38, 48], [110, 98], [190, 49]]) {
    const start = sampleJourney(0, entry, solar), end = sampleJourney(1, entry, solar);
    assert.ok(Math.abs(start.distance - entry) < 1e-10);
    assert.equal(start.galacticScale, 1);
    assert.ok(Math.abs(end.distance - solar) < 1e-9);
    assert.ok(Math.abs(end.galacticScale - NEIGHBORHOOD_SCALE) < 1e-9);
    assert.ok(Math.abs(end.solarScale - 1) < 1e-10);
    assert.equal(end.sunReveal, 1);
    assert.equal(end.planetsReveal, 1);
    assert.equal(end.composition, 1);
  }
});

test('the Sun grows continuously on screen while the planets become visible', () => {
  let previous = 0;
  for (let step = 0; step <= 500; step++) {
    const flight = sampleJourney(step / 500, 45, 48);
    const angularRadius = flight.solarScale / flight.distance;
    assert.ok(angularRadius >= previous - 1e-12);
    previous = angularRadius;
  }
});

test('reverse scrolling retraces the same camera and foreground stars', () => {
  const outbound = Array.from({ length: 101 }, (_, step) => sampleJourney(step / 100, 57, 48));
  for (let step = 100; step >= 0; step--) {
    assert.deepEqual(sampleJourney(step / 100, 57, 48), outbound[step]);
  }
});

test('the opening approach lands at the exact galaxy view without a fade', () => {
  for (const distance of [45, 85, 110]) {
    const start = sampleArrival(0, distance), end = sampleArrival(ARRIVAL_DURATION, distance);
    assert.ok(start.distance > distance * 4);
    assert.equal(end.distance, distance);
    assert.equal(end.flightOpacity, 0);
    assert.equal(end.progress, 1);
    let previous = start.distance;
    for (let frame = 1; frame <= 336; frame++) {
      const arrival = sampleArrival(frame / 60, distance);
      assert.ok(arrival.distance <= previous + 1e-10);
      previous = arrival.distance;
    }
  }
});

test('foreground stars use deterministic positions and become inactive outside travel', () => {
  const passage = createStellarPassage(THREE, { count: 3600 });
  const other = createStellarPassage(THREE, { count: 3600 });
  assert.deepEqual(passage.group.geometry.attributes.position.array, other.group.geometry.attributes.position.array);
  passage.setFlight(82, .7, 1.5, 390 / 844);
  assert.equal(passage.group.visible, true);
  assert.equal(passage.group.material.uniforms.uDistance.value, 82);
  assert.equal(passage.group.material.uniforms.uPixelRatio.value, 1.5);
  passage.setFlight(82, 0, 1.5, 390 / 844);
  assert.equal(passage.group.visible, false);
});

test('the mobile departure continues from the waiting preview and reaches the same galaxy', () => {
  const home = 90, departureScale = 2.7;
  assert.equal(sampleArrival(0, home, departureScale).distance, home * departureScale);
  assert.equal(sampleArrival(ARRIVAL_DURATION, home, departureScale).distance, home);
});

test('a blocked or resumed frame cannot skip a section of the arrival', () => {
  let elapsed = 1;
  elapsed = advanceArrival(elapsed, 2.5);
  assert.ok(elapsed <= 1.051, 'a long task must not move the camera forward by its whole duration');
  assert.equal(advanceArrival(elapsed, Infinity), elapsed);
  assert.equal(advanceArrival(elapsed, -1), elapsed);
  for (let frame = 0; frame < 500; frame++) elapsed = advanceArrival(elapsed, 1 / 60);
  assert.equal(elapsed, ARRIVAL_DURATION, 'the complete approach still reaches its final frame');
});

test('waiting meteors move across the field and leave a quiet interval', () => {
  const first = sampleMeteor(0, .3, 440, 956), later = sampleMeteor(0, .8, 440, 956);
  assert.ok(later.x < first.x && later.y > first.y);
  assert.ok(first.tailX > first.x && first.tailY < first.y);
  assert.equal(sampleMeteor(0, 3, 440, 956), null);
  for (let i = 0; i < 3; i++) for (let t = 0; t < 20; t += .07) {
    const meteor = sampleMeteor(i, t, 320, 568);
    if (meteor) assert.ok(Object.values(meteor).every(Number.isFinite) && meteor.opacity >= 0 && meteor.opacity <= 1);
  }
});
