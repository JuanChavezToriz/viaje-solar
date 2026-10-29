import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../node_modules/three/src/Three.js';
import { createGalaxy } from '../src/galaxy.js';
import { spiralAngle, secondarySpiralAngle } from '../src/galaxy-field.js';

const galaxy = createGalaxy(THREE, { reducedMotion: true });
const pointClouds = galaxy.group.children.filter(child => child.isPoints);
const light = galaxy.group.children.find(child => child.isMesh && child !== galaxy.sunMarker);

test('continuous light and individual stars share the same transition state', () => {
  const stars = pointClouds[0].material.uniforms;
  for (const key of ['uOpacity', 'uBreak', 'uIntro']) {
    assert.equal(light.material.uniforms[key], stars[key]);
  }
  galaxy.setTransition(0.72);
  galaxy.setOpacity(0.24);
  assert.equal(light.material.uniforms.uBreak.value, 0.72);
  assert.equal(light.material.uniforms.uOpacity.value, 0.24);
  assert.equal(galaxy.sunMarker.material.opacity, 0, 'the location marker must disappear during travel');
  galaxy.setTransition(0);
  galaxy.setOpacity(1);
  assert.equal(galaxy.sunMarker.material.opacity, 1, 'returning restores the marker');
});

test('quality changes preserve the complete shape and use the renderer pixel ratio', () => {
  const total = pointClouds.reduce((sum, cloud) => sum + cloud.geometry.getAttribute('position').count, 0);
  assert.equal(total, 190920);
  galaxy.setQuality('low', 1.5);
  for (const cloud of pointClouds) {
    assert.equal(cloud.geometry.drawRange.count, Math.floor(cloud.geometry.getAttribute('position').count * 0.42));
    assert.equal(cloud.material.uniforms.uPixelRatio.value, 1.5);
  }
  assert.equal(light.material.uniforms.uDetail.value, 2);
  galaxy.setQuality('high', 2);
  assert.equal(pointClouds.reduce((sum, cloud) => sum + cloud.geometry.drawRange.count, 0), total);
  assert.equal(light.material.uniforms.uDetail.value, 3);
  assert.equal(pointClouds[0].material.uniforms.uPixelRatio.value, 2);
});

test('stellar geometry stays finite and reproducible across return visits', () => {
  const other = createGalaxy(THREE, { reducedMotion: true });
  const otherClouds = other.group.children.filter(child => child.isPoints);
  pointClouds.forEach((cloud, index) => {
    for (const key of ['position', 'color', 'aStyle']) {
      const values = cloud.geometry.getAttribute(key).array;
      assert.ok(values.every(Number.isFinite), `${key} contains only finite values`);
      assert.deepEqual(values, otherClouds[index].geometry.getAttribute(key).array);
    }
  });
});

test('reduced motion preserves the light field without introducing twinkle', () => {
  galaxy.update(1 / 60, 120, new THREE.PerspectiveCamera(43, 1.6));
  assert.equal(light.material.uniforms.uIntro.value, 1);
  assert.equal(pointClouds[0].material.uniforms.uTime.value, 0);
  assert.equal(light.geometry.getAttribute('position').count, 4, 'the smooth foundation uses a single plane');
});

test('the two main arms remain opposite and sweep continuously into the outer disk', () => {
  let previous = spiralAngle(2.1);
  for (let radius = 2.2; radius <= 22; radius += 0.1) {
    const angle = spiralAngle(radius);
    assert.ok(angle > previous, 'the arm must not fold back on itself');
    assert.ok(angle - previous < 0.13, 'the arm must not have an angular discontinuity');
    assert.ok(Math.abs(spiralAngle(radius, 1) - angle - Math.PI) < 1e-12);
    previous = angle;
  }
});

test('entering the neighborhood preserves the galactic stars and the luminous disk', () => {
  galaxy.setOpacity(1);
  const snapshot = pointClouds.map(cloud => cloud.geometry.attributes.position.array.slice());
  galaxy.setTransition(0.85);
  galaxy.update(1 / 60, 15, new THREE.PerspectiveCamera(43, 1.6));
  assert.equal(light.material.uniforms.uOpacity.value, 1);
  pointClouds.forEach((cloud, index) => assert.deepEqual(cloud.geometry.attributes.position.array, snapshot[index]));
  assert.equal(pointClouds.at(-1).geometry.attributes.position.count, 12000);
  galaxy.setTransition(0);
});

test('interarm stars cover the disk while the centre and outer stars retain distinct colours', () => {
  const sectors = Array(24).fill(0);
  const angleDistance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  let disk = 0, interarm = 0, centre = 0, warm = 0, cool = 0;
  for (const cloud of pointClouds) {
    const { position, color, aStyle } = cloud.geometry.attributes;
    // Check the same distributed prefix used on mobile, not just the full cloud.
    for (let i = 0; i < Math.floor(position.count * 0.42); i++) {
      const x = position.getX(i), z = position.getZ(i), radius = Math.hypot(x, z);
      if (radius < 2) {
        centre++;
        if (color.getX(i) > color.getZ(i) * 1.25) warm++;
      }
      if (radius <= 6 || radius >= 18 || aStyle.getW(i) === 1) continue;
      disk++;
      if (color.getZ(i) > color.getX(i) * 1.25) cool++;
      const angle = Math.atan2(z, x);
      const separation = Math.min(...[spiralAngle(radius), spiralAngle(radius, 1),
        secondarySpiralAngle(radius), secondarySpiralAngle(radius, 1)]
        .map(spine => angleDistance(angle, spine)));
      if (separation > 0.22) {
        interarm++;
        sectors[Math.min(23, Math.floor((angle + Math.PI) / (Math.PI * 2) * 24))]++;
      }
    }
  }
  assert.ok(interarm / disk > 0.25, 'the spaces between the arms must contain a substantial stellar population');
  assert.ok(sectors.every(count => count > 100), 'interarm coverage must extend around the entire disk on mobile');
  assert.ok(warm / centre > 0.5, 'the centre must retain its warmer population');
  assert.ok(cool / disk > 0.6, 'the outer disk must retain its cooler population');
});
