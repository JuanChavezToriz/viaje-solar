import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import * as THREE from '../node_modules/three/src/Three.js';
import { portraitFrame, portraitFov, portraitProfiles, portraitPose, portraitTexturePath, isHandset } from '../src/portrait-layout.js';
import { touchIntent, swipeStep, attachPortraitTouch, attachPlanetManipulation } from '../src/portrait-touch.js';

// Match Vite's alias: this installation uses Three's published source entry.
registerHooks({ resolve(specifier, context, next) {
  return next(specifier === 'three' ? new URL('../node_modules/three/src/Three.js', import.meta.url).href : specifier, context);
} });

function cameraFor(id, width, height) {
  const frame = portraitFrame(id, width, height);
  const camera = new THREE.PerspectiveCamera(portraitFov(frame.radius), width / height, .05, 60);
  camera.position.z = 8;
  camera.setViewOffset(width, height, (.5 - frame.x) * width, (.5 - frame.y) * height, width, height);
  camera.updateMatrixWorld();
  return camera;
}

for (const [width, height] of [[1920, 1080], [1440, 900], [768, 1024], [390, 844], [320, 568], [844, 390]]) {
  test(`Saturn's composition suits the viewport at ${width} × ${height}`, () => {
    if (isHandset(width, height)) {
      const frame = portraitFrame('saturn', width, height);
      const diameter = frame.radius * height * 2;
      assert.ok(diameter > Math.min(width, height) * .85 && diameter < Math.min(width, height) * 1.5,
        'the mobile globe remains immersive without extreme magnification');
      assert.ok(frame.y - frame.radius < 0, 'the globe is deliberately cropped above the viewport');
      assert.ok(frame.x > .6, 'the globe sits to the right of the information');
      const pose = portraitPose('saturn', width, height);
      assert.ok(pose.pitch >= .2 && Math.abs(pose.roll) <= .15, 'rings cross the frame at a gentle angle');
      return;
    }
    const camera = cameraFor('saturn', width, height);
    const profile = portraitPose('saturn', width);
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(profile.pitch, 0, profile.roll));
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 180) {
      const point = new THREE.Vector3(Math.cos(angle) * 2.42, 0, Math.sin(angle) * 2.42)
        .applyQuaternion(tilt).project(camera);
      assert.ok(Math.abs(point.x) < .99, 'rings must retain a horizontal margin');
      const pixelY = (.5 - point.y / 2) * height;
      assert.ok(pixelY > 100, 'rings must clear the header');
      assert.ok(pixelY < height - 115, 'rings must clear the bottom selector');
    }
  });

  test(`worlds retain an immersive apparent size at ${width} × ${height}`, () => {
    for (const id of ['earth', 'mercury', 'venus', 'uranus', 'neptune', 'jupiter']) {
      const frame = portraitFrame(id, width, height);
      assert.ok(Number.isFinite(portraitFov(frame.radius)) && portraitFov(frame.radius) > 0);
      assert.ok(frame.radius * height > width * .16, `${id} must stay large enough to read its surface`);
    }
  });
}

test('every destination has a local texture at each quality level', () => {
  for (const id of Object.keys(portraitProfiles)) {
    for (const mobile of [false, true]) {
      assert.ok(existsSync(`public${portraitTexturePath(id, mobile)}`), `${id} texture must ship locally`);
    }
  }
});

test('Mars reads as a close horizon while Saturn has its own angle', () => {
  const mars = portraitFrame('mars', 1440, 900);
  assert.ok(mars.y + mars.radius > 1.25, 'Mars should deliberately extend below the viewport');
  assert.ok(mars.y - mars.radius < .3, 'the visible hemisphere must fill most of the screen');
  assert.ok(portraitProfiles.saturn.pitch > .4, 'the rings must be seen at an open angle');
  assert.notEqual(portraitProfiles.earth.roll, portraitProfiles.uranus.roll);
});

function rendererHarness(context, { width = 1440, hold = '', fail = '' } = {}) {
  const previousWindow = globalThis.window;
  globalThis.window = { innerWidth: width, innerHeight: 900 };
  context.after(() => { globalThis.window = previousWindow; });
  const waiting = [];
  const loadedPaths = [];
  context.mock.method(THREE.TextureLoader.prototype, 'load', function(path, onLoad, progress, onError) {
    loadedPaths.push(path);
    const map = new THREE.DataTexture(new Uint8Array([180, 160, 140, 255]), 1, 1);
    const complete = () => path.includes(fail) && fail ? onError?.(new Error('Download failed')) : onLoad?.(map);
    if (hold && path.includes(hold)) waiting.push(complete); else queueMicrotask(complete);
    return map;
  });
  class Canvas extends EventTarget {
    style = {};
    getRootNode() { return this; }
  }
  const renderer = {
    autoClear: true, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 8 },
    clearDepth() {}, getPixelRatio: () => 1, getRenderTarget: () => null, setRenderTarget() {}, initTexture() {},
    async compileAsync() {},
    render(scene, camera) {
      if (scene.name === 'Planet portraits') { this.lastScene = scene; this.lastCamera = camera; }
    },
  };
  return { renderer, canvas: new Canvas(), loadedPaths, release: () => waiting.splice(0).forEach(complete => complete()) };
}

function bodyFor(id) {
  const material = id === 'sun'
    ? new THREE.ShaderMaterial({ uniforms: { uOpacity: { value: 1 }, uTime: { value: 0 } } })
    : new THREE.MeshStandardMaterial({ map: new THREE.Texture() });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(), material);
  if (id === 'saturn') mesh.add(new THREE.Mesh(new THREE.RingGeometry(1.12, 2.42), new THREE.MeshStandardMaterial()));
  return { data: { id }, mesh };
}

test('rapid selections settle on one world; pause freezes rotation and zoom stays bounded', async context => {
  const { createPlanetPortraits } = await import('../src/planet-portraits.js');
  const { renderer, canvas } = rendererHarness(context);
  const portraits = createPlanetPortraits(renderer, canvas);
  const tick = (count, running = true) => {
    for (let i = 0; i < count; i++) portraits.update(1 / 60, { enabled: true, running, interactive: true });
    portraits.render();
  };
  await portraits.select(bodyFor('earth'));
  tick(120);
  assert.equal(portraits.opaque, true);
  const earth = renderer.lastScene.getObjectByName('portrait-earth');
  const rotation = earth.children[0].rotation.y;
  tick(30, false);
  assert.equal(earth.children[0].rotation.y, rotation, 'pausing must freeze the portrait');
  tick(30);
  assert.ok(earth.children[0].rotation.y > rotation);
  portraits.adjustZoom(.01);
  tick(180);
  assert.ok(renderer.lastCamera.position.length() >= 4.19, 'zoom cannot enter the globe');
  for (const [id, index] of [['saturn', 6], ['mars', 4], ['venus', 2]]) {
    await portraits.select(bodyFor(id));
    tick(1);
  }
  tick(180);
  for (const id of ['earth', 'saturn', 'mars', 'venus']) {
    assert.equal(renderer.lastScene.getObjectByName(`portrait-${id}`).visible, id === 'venus');
  }
  assert.equal(renderer.autoClear, true, 'compositing must restore renderer state');
  await portraits.select(bodyFor('sun'));
  for (let frame = 0; frame < 3; frame++) portraits.update(.6, { enabled: true, running: true, interactive: true });
  portraits.render();
  assert.equal(renderer.lastScene.getObjectByName('portrait-venus').visible, false,
    'a slow GPU must not stretch crossfades into long ghost images');
  portraits.clear();
  tick(180);
  assert.equal(portraits.visible, false, 'returning to the atlas must clear the overlay');
});

test('reduced motion selects immediately and leaves the Sun still', async context => {
  const { createPlanetPortraits } = await import('../src/planet-portraits.js');
  const { renderer, canvas } = rendererHarness(context);
  const portraits = createPlanetPortraits(renderer, canvas, { reducedMotion: true });
  await portraits.select(bodyFor('sun'));
  for (let i = 0; i < 20; i++) portraits.update(1 / 60, { enabled: true, running: true, interactive: true });
  portraits.render();
  assert.equal(portraits.opaque, true);
  const sun = renderer.lastScene.getObjectByName('portrait-sun').children[0];
  assert.equal(sun.rotation.y, portraitProfiles.sun.phase);
  portraits.clear();
  portraits.update(1 / 60, { enabled: false, running: true, interactive: false });
  assert.equal(portraits.visible, false);
});

test('a slow destination keeps the previous world intact until every asset is ready', async context => {
  const { createPlanetPortraits } = await import('../src/planet-portraits.js');
  const { renderer, canvas, release } = rendererHarness(context, { hold: '/mars.jpg' });
  const displayed = [];
  const portraits = createPlanetPortraits(renderer, canvas, { onDisplay: id => displayed.push(id) });
  const tick = () => { portraits.update(.05, { enabled: true, running: true, interactive: true }); portraits.render(); };
  await portraits.select(bodyFor('earth'));
  for (let i = 0; i < 40; i++) tick();
  const pending = portraits.select(bodyFor('mars'));
  for (let i = 0; i < 60; i++) tick();
  assert.deepEqual(displayed, ['earth']);
  assert.equal(renderer.lastScene.getObjectByName('portrait-earth').visible, true);
  assert.equal(renderer.lastScene.getObjectByName('portrait-mars'), undefined);
  release();
  await pending;
  for (let i = 0; i < 40; i++) {
    tick();
    const visible = renderer.lastScene.children.filter(child => child.name.startsWith('portrait-') && child.visible);
    assert.equal(visible.length, 1, 'only one model can draw or cast shadows at a time');
  }
  assert.deepEqual(displayed, ['earth', 'mars']);
  const surface = renderer.lastScene.getObjectByName('portrait-mars').children[0];
  assert.equal(surface.material.transparent, false);
  assert.equal(surface.material.depthWrite, true);
  assert.equal(surface.castShadow, false, 'rocky worlds do not need a self-shadow pass');
});

test('leaving a destination cancels a pending arrival', async context => {
  const { createPlanetPortraits } = await import('../src/planet-portraits.js');
  const { renderer, canvas, release } = rendererHarness(context, { hold: '/mars.jpg' });
  const displayed = [];
  const portraits = createPlanetPortraits(renderer, canvas, { onDisplay: id => displayed.push(id) });
  const pending = portraits.select(bodyFor('mars'));
  portraits.clear();
  release();
  assert.equal(await pending, false);
  assert.deepEqual(displayed, []);
  assert.equal(portraits.visible, false);
});

test('a failed map preserves the previous destination and reports a recoverable error', async context => {
  const { createPlanetPortraits } = await import('../src/planet-portraits.js');
  const { renderer, canvas } = rendererHarness(context, { fail: '/neptune.jpg' });
  const statuses = [];
  const portraits = createPlanetPortraits(renderer, canvas, { onStatus: status => statuses.push(status) });
  await portraits.select(bodyFor('earth'));
  portraits.update(2, { enabled: true, running: true, interactive: true });
  assert.equal(await portraits.select(bodyFor('neptune')), false);
  portraits.update(2, { enabled: true, running: true, interactive: true });
  portraits.render();
  assert.equal(renderer.lastScene.getObjectByName('portrait-earth').visible, true);
  assert.equal(portraits.opaque, true);
  assert.equal(statuses.at(-1), 'error');
});

test('touch paging waits for release, respects cancellation and preserves vertical scrolling', () => {
  assert.equal(touchIntent(3, 2), 'pending');
  assert.equal(touchIntent(30, 3), 'swipe');
  assert.equal(touchIntent(4, 35), 'scroll');
  const canvas = new EventTarget();
  const steps = [];
  const drags = [];
  let scrollIntents = 0;
  attachPortraitTouch(canvas, { enabled: () => true, onSwipe: step => steps.push(step), onDrag: amount => drags.push(amount), onScroll: () => scrollIntents++ });
  const pointer = (type, x, y) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerType: 'touch', pointerId: 1, clientX: x, clientY: y });
    canvas.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false, 'native scrolling and zoom must remain available');
  };
  pointer('pointerdown', 100, 100); pointer('pointermove', 105, 150); pointer('pointerup', 105, 150);
  assert.equal(steps.length, 0);
  assert.equal(scrollIntents, 1, 'viewport changes during a scroll must not force a return to the portrait');
  pointer('pointerdown', 100, 100); pointer('pointermove', 140, 103); pointer('pointercancel', 140, 103);
  assert.equal(steps.length, 0, 'a canceled gesture cannot change destination');
  assert.equal(drags.at(-1), 0);
  pointer('pointermove', 180, 104);
  assert.equal(steps.length, 0);
  pointer('pointerdown', 290, 250); pointer('pointermove', 100, 255);
  assert.equal(steps.length, 0, 'drag feedback must not commit before release');
  pointer('pointerup', 100, 255);
  assert.deepEqual(steps, [1]);
  pointer('pointerdown', 100, 250); pointer('pointermove', 280, 255); pointer('pointerup', 280, 255);
  assert.deepEqual(steps, [1, -1]);
  pointer('pointerdown', 100, 100); pointer('pointermove', 105, 150); pointer('pointermove', 300, 155); pointer('pointerup', 300, 155);
  assert.deepEqual(steps, [1, -1], 'vertical intent stays vertical even if the finger later drifts sideways');
});

test('swipe thresholds accept a deliberate slide or quick flick, without accidental changes', () => {
  assert.equal(swipeStep(-90, 4, 500, 390), 1);
  assert.equal(swipeStep(90, 4, 500, 390), -1);
  assert.equal(swipeStep(-32, 2, 40, 390), 1);
  assert.equal(swipeStep(-32, 2, 400, 390), 0);
  assert.equal(swipeStep(-18, 2, 10, 390), 0);
  assert.equal(swipeStep(-90, 110, 100, 390), 0);
  assert.equal(isHandset(844, 390), true, 'a rotated phone keeps its touch navigation');
  assert.equal(isHandset(768, 1024), false, 'a tablet retains the destination selector');
});

test('the planet surface rotates with one finger, pinches with two and resets canceled gestures', () => {
  const surface = new EventTarget();
  const rotations = [], zooms = [];
  attachPlanetManipulation(surface, { enabled: () => true, rotate: (...delta) => rotations.push(delta), zoom: ratio => zooms.push(ratio) });
  const pointer = (type, id, x, y) => {
    const event = new Event(type);
    Object.assign(event, { pointerId: id, clientX: x, clientY: y, button: 0 });
    surface.dispatchEvent(event);
  };
  pointer('pointerdown', 1, 100, 100);
  pointer('pointermove', 1, 120, 110);
  assert.deepEqual(rotations.at(-1), [.12, .04]);
  pointer('pointerdown', 2, 220, 110);
  pointer('pointermove', 2, 270, 110);
  assert.ok(zooms.at(-1) < 1, 'spreading the fingers moves closer');
  pointer('pointermove', 2, 200, 110);
  assert.ok(zooms.at(-1) > 1, 'bringing fingers together moves away');
  pointer('pointerup', 2, 200, 110);
  const count = rotations.length;
  pointer('pointermove', 1, 150, 120);
  assert.equal(rotations.length, count, 'lifting one finger cannot accidentally resume a drag');
  pointer('pointercancel', 1, 150, 120);
  pointer('pointermove', 1, 180, 140);
  assert.equal(rotations.length, count);
});

test('handsets prepare the detailed map before revealing a destination', async context => {
  const { createPlanetPortraits } = await import('../src/planet-portraits.js');
  const { renderer, canvas, loadedPaths } = rendererHarness(context, { width: 390 });
  const portraits = createPlanetPortraits(renderer, canvas);
  await portraits.select(bodyFor('earth'));
  assert.ok(loadedPaths.includes('/textures/portraits/earth.jpg'));
  assert.ok(!loadedPaths.includes('/textures/portraits/earth-mobile.jpg'));
  portraits.adjustZoom(.001);
  for (let i = 0; i < 160; i++) portraits.update(.05, { enabled: true, running: true, interactive: true });
  portraits.render();
  assert.ok(renderer.lastCamera.position.length() >= 5.79, 'finger zoom stays within a useful distance from the surface');
  portraits.adjustZoom(100);
  for (let i = 0; i < 160; i++) portraits.update(.05, { enabled: true, running: true, interactive: true });
  portraits.render();
  assert.ok(renderer.lastCamera.position.length() <= 26.01, 'zooming out stays bounded');
  assert.ok(Math.abs(renderer.lastCamera.view.offsetX) < 1, 'zooming out recenters the world');
});

test('prepared mobile neighbors switch within half a second without downloading again or reporting loading', async context => {
  const { createPlanetPortraits } = await import('../src/planet-portraits.js');
  const { renderer, canvas, loadedPaths } = rendererHarness(context, { width: 390 });
  const statuses = [];
  const portraits = createPlanetPortraits(renderer, canvas, { onStatus: status => statuses.push(status) });
  const tick = () => { portraits.update(1 / 60, { enabled: true, running: true, interactive: true }); portraits.render(); };
  await portraits.select(bodyFor('earth'));
  for (let i = 0; i < 120; i++) tick();
  await portraits.preload([bodyFor('mars'), bodyFor('venus')]);
  assert.equal(portraits.isPrepared('mars'), true);
  const downloads = loadedPaths.length;
  for (const id of ['mars', 'earth', 'venus']) {
    statuses.length = 0;
    await portraits.select(bodyFor(id));
    for (let i = 0; i < 29; i++) tick();
    assert.equal(statuses.at(-1), 'ready');
    assert.equal(statuses.includes('loading'), false);
    assert.equal(loadedPaths.length, downloads, 'nearby worlds should reuse their prepared textures');
    assert.equal(renderer.lastScene.getObjectByName(`portrait-${id}`).visible, true);
  }
  await portraits.select(bodyFor('mars'));
  for (let i = 0; i < 29; i++) tick();
  await portraits.preload([bodyFor('jupiter')], ['earth', 'jupiter']);
  assert.equal(portraits.isPrepared('earth'), true, 'preparing the next world must preserve the way back');
  assert.equal(portraits.isPrepared('venus'), false, 'the older unrelated world is evicted instead');
});

test('mobile exploration releases older maps while preserving the displayed world', async context => {
  const { createPlanetPortraits } = await import('../src/planet-portraits.js');
  const { renderer, canvas } = rendererHarness(context, { width: 390 });
  const portraits = createPlanetPortraits(renderer, canvas, { reducedMotion: true });
  for (const id of ['earth', 'mars', 'saturn', 'venus', 'neptune']) {
    await portraits.select(bodyFor(id));
    portraits.update(.05, { enabled: true, running: true, interactive: true }); portraits.render();
    assert.ok(renderer.lastScene.children.filter(child => child.name.startsWith('portrait-')).length <= 3);
    assert.equal(renderer.lastScene.getObjectByName(`portrait-${id}`).visible, true);
  }
  await portraits.select(bodyFor('earth'));
  portraits.update(.05, { enabled: true, running: true, interactive: true }); portraits.render();
  assert.equal(renderer.lastScene.getObjectByName('portrait-earth').visible, true, 'an evicted world can return');
});
