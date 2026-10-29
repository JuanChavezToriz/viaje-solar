import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../node_modules/three/src/Three.js';
import { overviewDistance, overviewProfile, markerPlacement, focusDistance } from '../src/exploration.js';
import { isHandset } from '../src/portrait-layout.js';
import { planets } from '../src/planets.js';

const orbitUp = new THREE.Vector3(0.52, 0.14, 0.84).normalize();
const tangent = new THREE.Vector3(0.84, 0, -0.54).normalize();
const side = new THREE.Vector3().crossVectors(orbitUp, tangent).normalize();
const viewDirection = orbitUp.clone().multiplyScalar(0.58).addScaledVector(side, 0.815).normalize();
const orbitRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), orbitUp);

for (const [width, height] of [[1920, 1080], [1440, 900], [768, 1024], [390, 844], [320, 568], [844, 390]]) {
  test(`overview contains the complete outer orbit at ${width} × ${height}`, () => {
    const aspect = width / height;
    const fov = width < 700 ? 48 : 43;
    const mobile = isHandset(width, height);
    const profile = overviewProfile(aspect, mobile, height);
    const up = orbitUp.clone().applyAxisAngle(viewDirection, profile.roll);
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.03, 700);
    camera.up.copy(up);
    const distance = overviewDistance(aspect, fov, mobile, height);
    const right = new THREE.Vector3().crossVectors(viewDirection.clone().negate(), up).normalize();
    const screenUp = new THREE.Vector3().crossVectors(right, viewDirection.clone().negate()).normalize();
    const frameHeight = 2 * Math.tan(fov * Math.PI / 360) * distance;
    const target = screenUp.multiplyScalar(frameHeight * profile.centerShift).addScaledVector(right, frameHeight * aspect * profile.horizontalShift);
    camera.position.copy(viewDirection).multiplyScalar(distance).add(target);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    // Sample the outer silhouette, including room beyond Neptune's orbital path.
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 90) {
      const radius = mobile ? 16.8 : 17.8;
      const edge = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius).applyQuaternion(orbitRotation).project(camera);
      assert.ok(Math.abs(edge.x) <= (mobile ? .98 : .94), 'outer orbit must leave a horizontal margin');
      const top = mobile ? 1 - profile.top * 2 : .88, bottom = mobile ? 1 - profile.bottom * 2 : -.72;
      assert.ok(edge.y >= bottom && edge.y <= top, 'outer orbit must leave room for navigation and controls');
    }
  });
}

test('all selected worlds, including Saturn’s rings, fit beside the desktop card', () => {
  const aspect = 1440 / 900;
  for (const body of [...planets, { id: 'sun', radius: 1.23 }]) {
    const distance = focusDistance(body, aspect, 43);
    const camera = new THREE.PerspectiveCamera(43, aspect, 0.03, 700);
    camera.position.set(0, 0, distance);
    const frameWidth = 2 * Math.tan(43 * Math.PI / 360) * distance * aspect;
    const target = new THREE.Vector3(frameWidth * 0.13, 0, 0);
    camera.position.add(target);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    const radius = body.radius * (body.id === 'saturn' ? 2.42 : body.id === 'sun' ? 1.15 : 1);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 45) {
      const edge = new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0).project(camera);
      assert.ok(edge.x > -0.9 && edge.x < 0.5, `${body.id} must fit to the left of its card`);
      assert.ok(Math.abs(edge.y) <= 0.46, `${body.id} must fit vertically`);
    }
  }
});

test('mobile portrait framing fills the height while preserving every orbit', () => {
  for (const [width, height] of [[320, 568], [390, 844], [440, 956]]) {
    const aspect = width / height, profile = overviewProfile(aspect, true, height);
    const camera = new THREE.PerspectiveCamera(48, aspect, .03, 700);
    camera.up.copy(orbitUp).applyAxisAngle(viewDirection, profile.roll);
    const distance = overviewDistance(aspect, 48, true, height);
    const right = new THREE.Vector3().crossVectors(viewDirection.clone().negate(), camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, viewDirection.clone().negate()).normalize();
    const target = up.multiplyScalar(2 * Math.tan(48 * Math.PI / 360) * distance * profile.centerShift);
    camera.position.copy(viewDirection).multiplyScalar(distance).add(target);camera.lookAt(target);camera.updateMatrixWorld();
    const ys = [], xs = [];
    for(let a=0;a<Math.PI*2;a+=Math.PI/90){const edge=new THREE.Vector3(Math.cos(a)*16.8,0,Math.sin(a)*16.8).applyQuaternion(orbitRotation).project(camera);ys.push(edge.y);xs.push(edge.x);}
    const availableHeight = 2 * (profile.bottom - profile.top);
    assert.ok(Math.max(...ys)-Math.min(...ys) > availableHeight * .8,
      'the scene must fill at least 80% of the height available below its heading');
    assert.ok(Math.max(...xs)-Math.min(...xs)>1.3, 'the portrait composition must also use the width');
  }
});

test('the galactic callout stays inside small screens near any projected edge', () => {
  for(const [width,height] of [[320,568],[440,956],[844,390],[1440,900]]){
    const mobile=isHandset(width,height);
    for(const x of [10,width/2,width-10]) for(const y of [20,height/2,height-20]){
      const p=markerPlacement(x,y,width,height,145,44,mobile,190);
      assert.ok(p.left>=16 && p.left+145<=width-16);
      assert.ok(p.top>=80 && p.top+44<=height-85);
    }
  }
});

test('expanded mobile sheets preserve a visible space for every world', () => {
  for (const [width, height, top, bottom] of [[390, 844, 180, 490], [375, 667, 180, 340], [390, 844, 180, 330]]) {
    const available = bottom - top;
    const centerY = (top + bottom) / 2;
    for (const body of planets) {
      const distance = focusDistance(body, width / height, 48, true, Math.min(0.28, available / height * 0.72));
      const camera = new THREE.PerspectiveCamera(48, width / height, 0.03, 700);
      const frameHeight = 2 * Math.tan(48 * Math.PI / 360) * distance;
      const target = new THREE.Vector3(0, frameHeight * (centerY / height - 0.5), 0);
      camera.position.copy(target).add(new THREE.Vector3(0, 0, distance));
      camera.lookAt(target);
      camera.updateMatrixWorld();
      const radius = body.radius * (body.id === 'saturn' ? 2.42 : 1);
      for (const y of [-radius, radius]) {
        const edge = new THREE.Vector3(0, y, 0).project(camera);
        const screenY = (-edge.y * 0.5 + 0.5) * height;
        assert.ok(screenY > top && screenY < bottom, `${body.id} must fit between the upper controls and the sheet`);
      }
    }
  }
});
