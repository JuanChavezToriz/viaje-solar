import test from 'node:test';
import assert from 'node:assert/strict';
import { assetUrl } from '../src/asset-url.js';

test('local assets work at the site root and under the GitHub Pages project path', () => {
  assert.equal(assetUrl('/textures/portraits/earth.jpg'), '/textures/portraits/earth.jpg');
  assert.equal(assetUrl('/textures/portraits/earth.jpg', '/viaje-solar/'), '/viaje-solar/textures/portraits/earth.jpg');
  assert.equal(assetUrl('assets/earth/clouds.jpg', '/viaje-solar/'), '/viaje-solar/assets/earth/clouds.jpg');
});
