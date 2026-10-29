import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { planets } from './planets.js';
import { createGalaxy } from './galaxy.js';
import { overviewDistance, overviewProfile, markerPlacement, focusDistance, simulationRate } from './exploration.js';
import { sampleJourney, sampleArrival, advanceArrival, easeBetween, NEIGHBORHOOD_SCALE, ARRIVAL_DURATION } from './journey.js';
import { createStellarPassage } from './stellar-passage.js';
import { createPlanetPortraits } from './planet-portraits.js';
import { portraitProfiles, portraitSummaries, isHandset } from './portrait-layout.js';
import { planetIcon } from './planet-icons.js';
import { createMobileLaunch } from './mobile-launch.js';
import { assetUrl } from './asset-url.js';
import './styles.css';
import './refresh.css';
import './journey.css';
import './portraits.css';
import './polish.css';
import './mobile-journey.css';

const handset = () => isHandset(window.innerWidth, window.innerHeight);
document.body.classList.toggle('mobile-experience', handset());
let mobileLaunch = null;
let portraitDirection = 1;
let activeBody = null;
let requestedBody = null;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let arrivalActive = false;
let arrivalElapsed = 0;
let portraitPreloadTimer = 0, portraitPreloadBusy = false;
const failedPortraitPreloads = new Set();

const canvas = document.querySelector('#universe');
const sceneWrap = document.querySelector('#scene-wrap');
const simulationUi = document.querySelector('.simulation-ui');
const planetPanelElement = document.querySelector('#planet-panel');
const galaxyMarkerCaption = document.querySelector('#galaxy-marker-caption');
const galaxyGesture = document.querySelector('.galaxy-gesture');
const galaxyMarkerLink = document.querySelector('#galaxy-marker-link');
const galaxyMarkerLine = galaxyMarkerLink.querySelector('line');
const galaxyMarkerCircles = galaxyMarkerLink.querySelectorAll('circle');
const arrivalOverlay = document.querySelector('#arrival-intro');
const waypointTitle = document.querySelector('#waypoint-title');
const destinationStatus = document.querySelector('#destination-status');
let destinationStatusTimer;
let portraitScrollIntentUntil = 0;
const projectedGalaxyMarker = new THREE.Vector3();
document.body.append(simulationUi, planetPanelElement);
window.history.scrollRestoration = 'manual';
if (window.location.hash !== '#explorar') window.scrollTo(0, 0);
mobileLaunch = createMobileLaunch({ onStart: beginArrival, onSkip: finishArrival, reducedMotion,
  onComplete: () => { updateRendererResolution(); queuePortraitPreload(); } });
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03070b);
const camera = new THREE.PerspectiveCamera(window.innerWidth < 700 ? 48 : 43, window.innerWidth / window.innerHeight, 0.03, 700);
camera.position.set(-12.2, 29, 37.8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
function updateRendererResolution(portrait = Boolean(activeBody || requestedBody)) {
  const flying = arrivalActive || mobileLaunch?.covering;
  const limit = portrait ? 2 : flying ? handset() ? 1.25 : 1.5 : handset() ? 1.5 : 2;
  const ratio = Math.min(window.devicePixelRatio || 1, limit);
  if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
  galaxy.setQuality(window.innerWidth < 800 ? 'low' : 'high', renderer.getPixelRatio());
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.13;

const textureLoader = new THREE.TextureLoader();
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const solarSystem = new THREE.Group();
const galaxyScene = new THREE.Group();
const travelAxis = new THREE.Vector3(0.52, 0.14, 0.84).normalize();
const galacticTravelTangent = new THREE.Vector3(0.84, 0, -0.54).normalize();
const orbitCameraUp = travelAxis.clone();
const orbitalSide = new THREE.Vector3().crossVectors(travelAxis, galacticTravelTangent).normalize();
const defaultViewDirection = travelAxis.clone().multiplyScalar(0.58).addScaledVector(orbitalSide, 0.815).normalize();
const defaultViewRight = new THREE.Vector3().crossVectors(defaultViewDirection.clone().negate(), orbitCameraUp).normalize();
const overviewUp = new THREE.Vector3();
function updateOverviewUp() {
  return overviewUp.copy(orbitCameraUp).applyAxisAngle(defaultViewDirection, overviewProfile(camera.aspect, handset(), window.innerHeight).roll);
}
function scaleOverviewWorlds(amount) {
  for (const body of celestialBodies) body.mesh.scale.setScalar(amount);
}
camera.position.copy(defaultViewDirection).multiplyScalar(46);
camera.up.copy(orbitCameraUp);
camera.lookAt(0, 0, 0);
const wideSceneOrigin = new THREE.Vector3(0, 0, 0);
const worldUp = new THREE.Vector3(0, 1, 0);
const wideSceneUp = new THREE.Vector3(0, 0, -1);
const neighborhoodViewDirection = new THREE.Vector3(0.04, 0.92, 0.4).normalize();
const galaxyViewDirection = new THREE.Vector3(0.12, 0.82, 0.56).normalize();
solarSystem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), travelAxis);
scene.add(solarSystem, galaxyScene);

// Each orbital controller keeps the up axis used at construction.
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = true;
controls.enableZoom = false;
controls.rotateSpeed = 0.85;
controls.minPolarAngle = THREE.MathUtils.degToRad(8);
controls.maxPolarAngle = THREE.MathUtils.degToRad(172);
controls.minDistance = 2.25;
controls.maxDistance = 160;
controls.enabled = false;
camera.up.copy(worldUp);
const galaxyControls = new OrbitControls(camera, canvas);
galaxyControls.enableDamping = true;
galaxyControls.dampingFactor = 0.075;
galaxyControls.enableZoom = false;
galaxyControls.enablePan = true;
galaxyControls.rotateSpeed = 0.62;
galaxyControls.minPolarAngle = THREE.MathUtils.degToRad(18);
galaxyControls.maxPolarAngle = THREE.MathUtils.degToRad(64);
galaxyControls.minDistance = 38;
galaxyControls.maxDistance = 190;
const galaxyDefaultDistance = () => 17.8 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(1, camera.aspect));
const galaxyHomeTarget = new THREE.Vector3();
function updateGalaxyHomeTarget() {
  galaxyHomeTarget.set(0, 0, 0);
  return galaxyHomeTarget;
}
const setCanvasTouchAction = () => {
  const mobile = handset();
  const locked = document.body.classList.contains('galaxy-touch-locked') || document.body.classList.contains('solar-touch-locked');
  canvas.style.touchAction = mobile && !locked ? 'pan-y pinch-zoom' : 'none';
  galaxyGesture.textContent = 'Arrastra para mirar alrededor';
};
setCanvasTouchAction();


scene.add(new THREE.AmbientLight(0x8194b2, 0.42));
const sunLight = new THREE.PointLight(0xffd39a, 180, 210, 1.45);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const starCount = window.innerWidth < 700 ? 2500 : 6500;
const starPositions = new Float32Array(starCount * 3);
const starColors = new Float32Array(starCount * 3);
const starSizes = new Float32Array(starCount);
const random = (min, max) => min + Math.random() * (max - min);
for (let i = 0; i < starCount; i++) {
  const radius = random(180, 250);
  const theta = random(0, Math.PI * 2);
  const phi = Math.acos(random(-1, 1));
  starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = radius * Math.cos(phi);
  starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  const brightness = random(0.48, 0.98);
  const tint = Math.random() > 0.82 ? new THREE.Color(0xaac5ee) : new THREE.Color(0xf1e9da);
  starColors[i * 3] = tint.r * brightness;
  starColors[i * 3 + 1] = tint.g * brightness;
  starColors[i * 3 + 2] = tint.b * brightness;
  starSizes[i] = Math.random() > 0.975 ? random(1.45, 2.05) : random(0.76, 1.48);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
starGeometry.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
const starMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    attribute float aSize;
    attribute vec3 color;
    uniform float uTime;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      float twinkle = 0.84 + 0.16 * sin(uTime * 0.7 + position.x * 4.3 + position.y * 7.1);
      gl_PointSize = clamp(aSize * twinkle * (180.0 / max(1.0, -viewPosition.z)), 0.7, 2.2);
      gl_Position = projectionMatrix * viewPosition;
      vColor = color;
      vAlpha = twinkle;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float distanceFromCenter = distance(gl_PointCoord, vec2(0.5));
      float disc = 1.0 - smoothstep(0.19, 0.50, distanceFromCenter);
      gl_FragColor = vec4(vColor, disc * vAlpha * 0.85);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
});
const starField = new THREE.Points(starGeometry, starMaterial);
scene.add(starField);

const sunMaterial = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uColorHot: { value: new THREE.Color('#fff1c5') }, uColorMid: { value: new THREE.Color('#f3a947') }, uColorDeep: { value: new THREE.Color('#d75119') } },
  transparent: true,
  depthWrite: false,
  vertexShader: `
    varying vec3 vPos;
    varying vec3 vNormal;
    void main() {
      vPos = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uOpacity;
    uniform vec3 uColorHot;
    uniform vec3 uColorMid;
    uniform vec3 uColorDeep;
    varying vec3 vPos;
    varying vec3 vNormal;
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      float c000 = hash(i);
      float c100 = hash(i + vec3(1,0,0));
      float c010 = hash(i + vec3(0,1,0));
      float c110 = hash(i + vec3(1,1,0));
      float c001 = hash(i + vec3(0,0,1));
      float c101 = hash(i + vec3(1,0,1));
      float c011 = hash(i + vec3(0,1,1));
      float c111 = hash(i + vec3(1,1,1));
      return mix(mix(mix(c000, c100, f.x), mix(c010, c110, f.x), f.y),
                 mix(mix(c001, c101, f.x), mix(c011, c111, f.x), f.y), f.z);
    }
    float fbm(vec3 p) {
      float v = 0.0;
      float a = 0.53;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.05;
        a *= 0.49;
      }
      return v;
    }
    void main() {
      vec3 p = normalize(vPos);
      float slow = uTime * 0.095;
      vec3 warp = vec3(
        fbm(p * 4.5 + vec3(slow, 0.0, 1.2)),
        fbm(p * 4.5 + vec3(2.3, -slow, 0.0)),
        fbm(p * 4.5 + vec3(0.0, 1.8, slow))
      ) - 0.5;
      float granulation = fbm(p * 17.0 + warp * 2.1 + vec3(slow, -slow * 0.36, slow * 0.21));
      float cells = fbm(p * 39.0 + warp * 1.4 + vec3(-slow * 0.7, slow * 0.52, 1.8));
      float filament = noise(p * 82.0 + warp * 2.0 + vec3(slow * 1.5, 1.0, -slow));
      float surface = granulation * 0.57 + cells * 0.37 + filament * 0.06;
      float limb = pow(max(0.0, dot(normalize(vNormal), normalize(cameraPosition))), 0.28);
      float flare = smoothstep(0.58, 0.88, surface);
      vec3 color = mix(uColorDeep, uColorMid, smoothstep(0.24, 0.59, surface));
      color = mix(color, uColorHot, flare * 0.65);
      color *= 0.5 + surface * 1.32;
      color *= 0.48 + limb * 0.68;
      gl_FragColor = vec4(color * 1.32, uOpacity);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
});
const sunGeometry = new THREE.SphereGeometry(1.23, 72, 56);
const systemSun = new THREE.Mesh(sunGeometry, sunMaterial);
systemSun.userData.id = 'sun';
systemSun.userData.name = 'Sol';
solarSystem.add(systemSun);
const sunData = {
  id: 'sun', name: 'Sol', order: 'ESTRELLA DEL SISTEMA SOLAR', diameter: 1392700,
  distanceDisplay: 'Centro', periodDisplay: '25', moons: '8 planetas',
  temperature: '5,500 °C (fotosfera)',
  description: 'Nuestra estrella concentra casi toda la masa del sistema y mantiene a los planetas en sus órbitas. Su superficie visible es plasma en constante actividad.',
  sourceUrl: 'https://science.nasa.gov/sun/facts/', radius: 1.23
};
const sunObject = { data: sunData, mesh: systemSun };

const haloCanvas = document.createElement('canvas');
haloCanvas.width = haloCanvas.height = 256;
const haloContext = haloCanvas.getContext('2d');
const haloGradient = haloContext.createRadialGradient(128, 128, 25, 128, 128, 128);
haloGradient.addColorStop(0, 'rgba(255,179,81,0.38)');
haloGradient.addColorStop(0.25, 'rgba(246,139,45,0.14)');
haloGradient.addColorStop(0.62, 'rgba(220,94,32,0.045)');
haloGradient.addColorStop(1, 'rgba(190,75,26,0)');
haloContext.fillStyle = haloGradient;
haloContext.fillRect(0, 0, 256, 256);
const haloTexture = new THREE.CanvasTexture(haloCanvas);

const galaxy = createGalaxy(THREE, { reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
galaxy.setQuality(window.innerWidth < 800 ? 'low' : 'high', renderer.getPixelRatio());
galaxyScene.add(galaxy.group);
const galaxySunMarker = galaxy.sunMarker;
const stellarPassage = createStellarPassage(THREE, { count: window.innerWidth < 700 ? 3600 : 7600 });
camera.add(stellarPassage.group);
scene.add(camera);
const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture, color: '#ffe1aa', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
halo.scale.set(6.5, 6.5, 1);
solarSystem.add(halo);

function makeFallbackTexture(colorA, colorB, isBand = false) {
  const width = 1024;
  const height = 512;
  const cvs = document.createElement('canvas');
  cvs.width = width;
  cvs.height = height;
  const ctx = cvs.getContext('2d');
  const image = ctx.createImageData(width, height);
  const c1 = new THREE.Color(colorA);
  const c2 = new THREE.Color(colorB);
  const seed = Math.random() * 10;
  for (let y = 0; y < height; y++) {
    const latitude = y / height;
    const band = Math.sin(latitude * Math.PI * (isBand ? 46 : 14) + Math.sin(latitude * 58 + seed) * 0.55);
    for (let x = 0; x < width; x++) {
      const wave = (Math.sin(x * 0.023 + y * 0.037 + seed) + Math.cos(x * 0.011 - y * 0.029) + Math.sin(y * 0.073)) * 0.08;
      const value = THREE.MathUtils.clamp(0.52 + band * (isBand ? 0.19 : 0.08) + wave, 0.1, 0.92);
      const index = (y * width + x) * 4;
      image.data[index] = Math.round(THREE.MathUtils.lerp(c1.r, c2.r, value) * 255);
      image.data[index + 1] = Math.round(THREE.MathUtils.lerp(c1.g, c2.g, value) * 255);
      image.data[index + 2] = Math.round(THREE.MathUtils.lerp(c1.b, c2.b, value) * 255);
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const map = new THREE.CanvasTexture(cvs);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function makeSaturnRings(innerRadius, outerRadius) {
  const size = 768;
  const cvs = document.createElement('canvas');
  cvs.width = size;
  cvs.height = size;
  const ctx = cvs.getContext('2d');
  const image = ctx.createImageData(size, size);
  const bands = [
    [0.00, 0.14, 174, 151, 123, 88],
    [0.14, 0.16, 93, 81, 68, 18],
    [0.16, 0.39, 218, 194, 159, 190],
    [0.39, 0.43, 103, 91, 77, 30],
    [0.43, 0.57, 231, 214, 183, 228],
    [0.57, 0.61, 72, 66, 58, 12],
    [0.61, 0.78, 207, 185, 151, 178],
    [0.78, 0.80, 82, 73, 63, 20],
    [0.80, 0.97, 225, 205, 171, 184],
    [0.97, 1.00, 174, 150, 120, 96]
  ];
  const innerUvRadius = innerRadius / outerRadius;
  for (let y = 0; y < size; y++) {
    const v = ((y + 0.5) / size) * 2 - 1;
    for (let x = 0; x < size; x++) {
      const u = ((x + 0.5) / size) * 2 - 1;
      const uvRadius = Math.hypot(u, v);
      if (uvRadius < innerUvRadius || uvRadius > 1) continue;

      const radial = (uvRadius - innerUvRadius) / (1 - innerUvRadius);
      const band = bands.find(item => radial >= item[0] && radial < item[1]) || bands[bands.length - 1];
      const fineBands = Math.sin(radial * 760) * 4 + Math.sin(radial * 2180) * 2.2;
      const angularGrain = Math.sin(Math.atan2(v, u) * 128 + radial * 230) * 1.2;
      const variation = fineBands + angularGrain;
      const edgeFade = Math.min(1, radial * 34, (1 - radial) * 42);
      const index = (y * size + x) * 4;
      image.data[index] = THREE.MathUtils.clamp(band[2] + variation, 0, 255);
      image.data[index + 1] = THREE.MathUtils.clamp(band[3] + variation, 0, 255);
      image.data[index + 2] = THREE.MathUtils.clamp(band[4] + variation, 0, 255);
      image.data[index + 3] = Math.round(band[5] * edgeFade);
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(cvs);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeVenusClouds() {
  const width = 1024;
  const height = 512;
  const cvs = document.createElement('canvas');
  cvs.width = width;
  cvs.height = height;
  const ctx = cvs.getContext('2d');
  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const latitude = y / height;
    const latFade = Math.pow(Math.sin(Math.PI * latitude), 0.42);
    for (let x = 0; x < width; x++) {
      const longitude = x / width;
      const drift = Math.sin(latitude * 29 + Math.sin(longitude * 21) * 2.2) * 0.032;
      const swirls = Math.sin((latitude + drift) * 94 + Math.sin(longitude * 12) * 2.4);
      const wisps = Math.sin((longitude + drift) * 68 + Math.sin(latitude * 24) * 1.5);
      const smallCloud = Math.sin(longitude * 223 + latitude * 157 + Math.sin(longitude * 49) * 3.0);
      const cloud = (swirls * 0.40 + wisps * 0.34 + smallCloud * 0.13 + 0.14) * latFade;
      const density = THREE.MathUtils.clamp((cloud + 0.08) * 0.75, 0, 1);
      const index = (y * width + x) * 4;
      const warm = THREE.MathUtils.clamp(0.52 + cloud * 0.42, 0, 1);
      image.data[index] = Math.round(194 + warm * 55);
      image.data[index + 1] = Math.round(128 + warm * 68);
      image.data[index + 2] = Math.round(76 + warm * 55);
      image.data[index + 3] = Math.round(26 + density * 194);
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(cvs);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function standardMaterial(texture, color = '#ffffff', roughness = 0.91) {
  return new THREE.MeshStandardMaterial({ map: texture, color, roughness, metalness: 0.0 });
}

const planetObjects = [];
const planetTransitionMaterials = [];
function trackPlanetTransitionMaterial(material) {
  planetTransitionMaterials.push({ material, opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite });
  return material;
}
function setPlanetTransitionOpacity(opacity) {
  const progress = THREE.MathUtils.clamp(opacity, 0, 1);
  for (const entry of planetTransitionMaterials) {
    entry.material.opacity = entry.opacity * progress;
    entry.material.transparent = entry.transparent || progress < 0.999;
    entry.material.depthWrite = progress >= 0.999 && entry.depthWrite;
  }
}
const labels = new Map();
const labelLayer = document.querySelector('#label-layer');
const connectorSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
connectorSvg.classList.add('label-connectors');
connectorSvg.setAttribute('aria-hidden', 'true');
connectorSvg.setAttribute('preserveAspectRatio', 'none');
const connectorGroups = new Map();
labelLayer.append(connectorSvg);
const planetButtons = document.querySelector('#planet-buttons');
const railIndicator = document.createElement('span');
railIndicator.className = 'planet-rail-indicator';
railIndicator.setAttribute('aria-hidden', 'true');
planetButtons.append(railIndicator);

function updateRailIndicator() {
  const chip = planetButtons.querySelector('.is-selected');
  railIndicator.hidden = !chip;
  if (!chip) return;
  railIndicator.style.width = `${chip.offsetWidth}px`;
  railIndicator.style.transform = `translateX(${chip.offsetLeft}px)`;
}
const playButton = document.querySelector('#toggle-play');
const enterPlanetsButton = document.querySelector('#enter-planets');
const portraitPager = document.querySelector('#portrait-pager');
function updateHandsetUi() {
  const mobile = handset();
  const changed = mobile !== document.body.classList.contains('mobile-experience');
  document.body.classList.toggle('mobile-experience', mobile);
  const parent = document.querySelector(mobile ? '.sim-options-panel' : '.planet-rail');
  if (playButton.parentElement !== parent) parent.append(playButton);
  if (enterPlanetsButton.parentElement !== document.body) document.body.append(enterPlanetsButton);
  if (changed && activeBody) {
    document.querySelector('#planet-description').textContent = mobile ? portraitSummaries[activeBody.data.id] : activeBody.data.description;
    const expanded = planetPanelElement.classList.contains('is-expanded');
    document.querySelector('#panel-more').innerHTML = `${expanded ? mobile ? 'Menos datos' : 'Volver a la vista' : mobile ? 'Más datos' : 'Conocer más'} <span aria-hidden="true">${expanded ? '−' : '+'}</span>`;
  }
}
updateHandsetUi();
const speedButtons = Array.from(document.querySelectorAll('.speed-button'));
const simDate = document.querySelector('#sim-date');
const simElapsed = document.querySelector('#sim-elapsed');
const simStatus = document.querySelector('#sim-status');
const simRate = document.querySelector('#sim-rate');
const overviewButton = document.querySelector('#overview-button');
const solarHint = document.querySelector('#solar-hint');
const focusRing = document.createElement('div');
focusRing.className = 'body-focus-ring';
focusRing.setAttribute('aria-hidden', 'true');
focusRing.hidden = true;
labelLayer.append(focusRing);

function addBodySelector(body) {
  const connector = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  connector.classList.add('planet-connector');
  connector.style.opacity = '0';
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  marker.setAttribute('r', '1.6');
  connector.append(line, marker);
  connectorSvg.append(connector);
  connectorGroups.set(body.id, { group: connector, line, marker });

  const label = document.createElement('button');
  label.type = 'button';
  label.className = 'planet-label' + (body.id === 'sun' ? ' is-star' : '');
  label.textContent = body.name;
  label.dataset.planet = body.id;
  label.setAttribute('aria-label', 'Seleccionar ' + body.name);
  label.title = 'Ver información de ' + body.name;
  label.addEventListener('click', () => selectPlanet(body.id));
  labelLayer.append(label);
  labels.set(body.id, label);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'planet-chip' + (body.id === 'sun' ? ' is-star' : '');
  button.dataset.planet = body.id;
  button.setAttribute('aria-label', 'Acercar a ' + body.name);
  button.setAttribute('aria-pressed', 'false');
  const thumbnail = document.createElement('span');
  thumbnail.className = 'planet-thumbnail';
  thumbnail.setAttribute('aria-hidden', 'true');
  thumbnail.style.setProperty('--planet-color', body.color || '#ffd27a');
  if (body.texture && body.id !== 'venus') thumbnail.style.backgroundImage = `url("${assetUrl(body.texture)}")`;
  const name = document.createElement('span');
  name.textContent = body.name;
  button.append(thumbnail, name);
  button.addEventListener('click', () => selectPlanet(body.id));
  button.addEventListener('pointerenter', () => { if (solarInteractionActive && !activeBody) setHover(body.id); });
  button.addEventListener('pointerleave', () => setHover(null));
  button.addEventListener('focus', () => { if (solarInteractionActive && !activeBody) setHover(body.id); });
  button.addEventListener('blur', () => setHover(null));
  planetButtons.append(button);
}

addBodySelector(sunData);

for (let index = 0; index < planets.length; index++) {
  const planet = planets[index];
  const map = planet.texture
    ? textureLoader.load(assetUrl(planet.texture), texture => { texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8; })
    : makeFallbackTexture(planet.color, planet.id === 'saturn' ? '#eed9b0' : '#b7d6d6', planet.id === 'saturn' || planet.id === 'uranus');
  if (!planet.texture) map.colorSpace = THREE.SRGBColorSpace;
  const orbitInclination = planet.orbitInclination;
  const orbitalPlane = new THREE.Group();
  const nodeRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), planet.ascendingNode);
  const inclinationRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), orbitInclination);
  orbitalPlane.quaternion.copy(nodeRotation).multiply(inclinationRotation);
  const pivot = new THREE.Group();
  const axialTilt = new THREE.Group();
  axialTilt.rotation.z = planet.tilt;
  const globeGeometry = new THREE.SphereGeometry(planet.radius, 48, 36);
  const globe = new THREE.Mesh(globeGeometry, trackPlanetTransitionMaterial(standardMaterial(map, '#ffffff', 0.88)));
  globe.position.set(0, 0, 0);
  globe.rotation.y = random(0, Math.PI * 2);
  globe.userData.isPlanet = true;
  globe.userData.id = planet.id;
  globe.userData.name = planet.name;
  globe.userData.index = index;
  axialTilt.add(globe);
  pivot.add(axialTilt);
  orbitalPlane.add(pivot);
  if (planet.id === 'venus') {
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(planet.radius * 1.012, 56, 40),
      trackPlanetTransitionMaterial(new THREE.MeshStandardMaterial({ map: makeVenusClouds(), transparent: true, depthWrite: false, opacity: 0.92, roughness: 1 }))
    );
    clouds.renderOrder = 2;
    globe.add(clouds);
  }
  solarSystem.add(orbitalPlane);
  planetObjects.push({
    data: planet,
    mesh: globe,
    pivot,
    orbitalPlane,
    axialTilt,
    semiMajorAxis: planet.orbit,
    semiMinorAxis: planet.orbit * Math.sqrt(1 - planet.eccentricity ** 2),
    eccentricity: planet.eccentricity,
    meanAnomaly: planet.phase,
    orbitInclination,
    spin: planet.spin
  });

  addBodySelector(planet);

  if (planet.id === 'saturn') {
    const ringInnerRadius = planet.radius * 1.12;
    const ringOuterRadius = planet.radius * 2.42;
    const rings = new THREE.Mesh(
      new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, 256, 8),
      trackPlanetTransitionMaterial(new THREE.MeshStandardMaterial({
        map: makeSaturnRings(ringInnerRadius, ringOuterRadius),
        color: 0xfff4df,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.035,
        depthWrite: false,
        roughness: 0.78,
        metalness: 0.025
      }))
    );
    rings.rotation.x = Math.PI / 2;
    rings.renderOrder = 1;
    globe.add(rings);
  }
}

const celestialBodies = [sunObject, ...planetObjects];
for (const body of celestialBodies) {
  const dot = document.createElement('i');
  dot.dataset.destination = body.data.id;
  dot.setAttribute('aria-hidden', 'true');
  portraitPager.append(dot);
}
const portraits = createPlanetPortraits(renderer, canvas, {
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  onDisplay: displayPortrait,
  onStatus: updatePortraitStatus,
  onInteract: () => document.body.classList.add('portrait-touched'),
  onSwipe: stepDestination,
  onDrag: fraction => { planetPanelElement.style.transform = fraction ? `translateX(${fraction * 24}px)` : ''; },
  onScroll: () => { portraitScrollIntentUntil = performance.now() + 700; },
});
planetButtons.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const buttons = [...planetButtons.querySelectorAll('.planet-chip')];
  const current = buttons.indexOf(event.target.closest('.planet-chip'));
  if (current < 0) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
    : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next].focus({ preventScroll: true });
  selectPlanet(buttons[next].dataset.planet);
});
const selectableMeshes = celestialBodies.map(body => body.mesh);
const trajectorySegments = 256;
const motionArcSegments = 38;
const motionArcSpan = 0.64;

function solveEccentricAnomaly(meanAnomaly, eccentricity) {
  let eccentricAnomaly = meanAnomaly;
  for (let iteration = 0; iteration < 6; iteration++) {
    const error = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly;
    eccentricAnomaly -= error / (1 - eccentricity * Math.cos(eccentricAnomaly));
  }
  return eccentricAnomaly;
}

function updateOrbitalPosition(object) {
  const eccentricAnomaly = solveEccentricAnomaly(object.meanAnomaly, object.eccentricity);
  object.pivot.position.set(
    object.semiMajorAxis * (Math.cos(eccentricAnomaly) - object.eccentricity),
    0,
    -object.semiMinorAxis * Math.sin(eccentricAnomaly)
  );
}

for (const object of planetObjects) {
  const orbitCurve = new THREE.EllipseCurve(
    -object.semiMajorAxis * object.eccentricity,
    0,
    object.semiMajorAxis,
    object.semiMinorAxis,
    0,
    Math.PI * 2,
    false,
    0
  );
  const orbitPoints = orbitCurve.getPoints(trajectorySegments);
  const geometry = new THREE.BufferGeometry().setFromPoints(
    orbitPoints.map(point => new THREE.Vector3(point.x, 0, -point.y))
  );
  const trajectoryColor = new THREE.Color(object.data.color).lerp(new THREE.Color('#a7acb0'), 0.2);
  const baseOpacity = object.data.id === 'mercury' ? 0.14 : 0.045;
  const material = new THREE.LineBasicMaterial({ color: trajectoryColor, transparent: true, opacity: baseOpacity, depthWrite: false });
  const line = new THREE.LineLoop(geometry, material);
  line.frustumCulled = false;
  line.userData.planetId = object.data.id;
  object.orbitalPlane.add(line);
  object.orbitCurve = orbitCurve;
  object.trajectory = line;

  const arcPositions = new Float32Array((motionArcSegments + 1) * 3);
  const arcColors = new Float32Array((motionArcSegments + 1) * 3);
  const arcColor = new THREE.Color(object.data.color).lerp(new THREE.Color('#fff0d8'), 0.42);
  for (let index = 0; index <= motionArcSegments; index++) {
    const fade = 0.08 + (index / motionArcSegments) ** 2.2 * 0.92;
    arcColors[index * 3] = arcColor.r * fade;
    arcColors[index * 3 + 1] = arcColor.g * fade;
    arcColors[index * 3 + 2] = arcColor.b * fade;
  }
  const arcGeometry = new THREE.BufferGeometry();
  arcGeometry.setAttribute('position', new THREE.BufferAttribute(arcPositions, 3));
  arcGeometry.setAttribute('color', new THREE.BufferAttribute(arcColors, 3));
  const arcMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
  const motionArc = new THREE.Line(arcGeometry, arcMaterial);
  motionArc.frustumCulled = false;
  motionArc.renderOrder = 1;
  object.orbitalPlane.add(motionArc);
  object.motionArc = motionArc;
  updateOrbitalPosition(object);
}

function updateMotionArc(object) {
  const positions = object.motionArc.geometry.attributes.position;
  for (let index = 0; index <= motionArcSegments; index++) {
    const progress = index / motionArcSegments;
    const meanAnomaly = object.meanAnomaly - motionArcSpan * (1 - progress);
    const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, object.eccentricity);
    positions.setXYZ(index,
      object.semiMajorAxis * (Math.cos(eccentricAnomaly) - object.eccentricity),
      0,
      -object.semiMinorAxis * Math.sin(eccentricAnomaly)
    );
  }
  positions.needsUpdate = true;
}

const globalTrailSamples = 144;
const globalTrailLocalPoint = new THREE.Vector3();
const globalTrailCenterPoint = new THREE.Vector3();
function galacticPositionAt(phase, destination) {
  return destination.copy(galacticTravelTangent).multiplyScalar(Math.sin(phase) * 24)
    .addScaledVector(travelAxis, (1 - Math.cos(phase)) * 10);
}
for (const object of planetObjects) {
  const positions = new Float32Array(globalTrailSamples * 3);
  const colors = new Float32Array(globalTrailSamples * 3);
  const color = new THREE.Color(object.data.color).lerp(new THREE.Color('#f0d6b8'), 0.34);
  for (let index = 0; index < globalTrailSamples; index++) {
    const fade = 0.045 + (index / (globalTrailSamples - 1)) ** 1.5 * 0.82;
    colors[index * 3] = color.r * fade;
    colors[index * 3 + 1] = color.g * fade;
    colors[index * 3 + 2] = color.b * fade;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.58, depthWrite: false });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  line.visible = false;
  line.userData.planetId = object.data.id;
  scene.add(line);
  object.globalTrail = line;
}

function updateGlobalTrails() {
  if (!showOrbits) return;
  const simulatedDaysPerSecond = daysPerSecondAtOneX * speed;
  for (const object of planetObjects) {
    const duration = Math.min(8, object.data.periodDays / simulatedDaysPerSecond * 0.72);
    const meanMotion = Math.PI * 2 * simulatedDaysPerSecond / object.data.periodDays;
    const positionAttribute = object.globalTrail.geometry.attributes.position;
    for (let index = 0; index < globalTrailSamples; index++) {
      const age = duration * (1 - index / (globalTrailSamples - 1));
      const historicalPhase = solarTravelPhase - globalTravelRate * speed * age;
      galacticPositionAt(historicalPhase, globalTrailCenterPoint);
      const eccentricAnomaly = solveEccentricAnomaly(object.meanAnomaly - meanMotion * age, object.eccentricity);
      globalTrailLocalPoint.set(
        object.semiMajorAxis * (Math.cos(eccentricAnomaly) - object.eccentricity),
        0,
        -object.semiMinorAxis * Math.sin(eccentricAnomaly)
      ).applyQuaternion(object.orbitalPlane.quaternion).applyQuaternion(solarSystem.quaternion);
      positionAttribute.setXYZ(index,
        globalTrailCenterPoint.x + globalTrailLocalPoint.x,
        globalTrailCenterPoint.y + globalTrailLocalPoint.y,
        globalTrailCenterPoint.z + globalTrailLocalPoint.z
      );
    }
    positionAttribute.needsUpdate = true;
  }
}

let activeMode = 'galaxy';
let solarInteractionActive = false;
let portraitHintShown = false;
let running = true;
let speed = 1;
let showOrbits = true;
let showNames = false;
let totalSimDays = 0;
let elapsedForMotion = 0;
let solarTravelPhase = 0;
const globalTravelRate = 0.012;
let pointerX = 0;
let pointerY = 0;
let easedPointerX = 0;
let easedPointerY = 0;
let lastHover = null;
let lastPointer = null;
let cameraGestureActive = false;
let followSelectionDirection = false;
let followingSelection = false;
let resettingOverview = false;
const selectionAnchor = new THREE.Vector3();
const selectionFrame = { centerY: 0.34, heightFraction: 0.25 };
let focusTransitionProgress = 1;
const focusDirection = new THREE.Vector3();
const focusStartCameraPosition = new THREE.Vector3();
const focusStartCameraTarget = new THREE.Vector3();
const focusEndCameraPosition = new THREE.Vector3();
const focusForward = new THREE.Vector3();
const focusRight = new THREE.Vector3();
const focusUp = new THREE.Vector3();
const cameraOffset = new THREE.Vector3();
const focusBodyPosition = new THREE.Vector3();
const focusSunPosition = new THREE.Vector3();
const arrivalStartScale = () => 4.8;
const daysPerSecondAtOneX = 365.25 / 60;
const defaultCameraDistance = () => overviewDistance(camera.aspect, camera.fov, handset(), window.innerHeight);
const desiredTarget = new THREE.Vector3();
const target = new THREE.Vector3();
const cameraPanOffset = new THREE.Vector3();
const cameraTargetWithPan = new THREE.Vector3();
const journeyTrack = document.querySelector('.journey-track');
const journeyTitle = document.querySelector('#journey-title');
const journeyProgressBar = document.querySelector('#journey-progress-bar');
const journeySunPosition = new THREE.Vector3();
const journeyWorldSun = new THREE.Vector3();
const journeyDirection = new THREE.Vector3();
const journeyYRotation = new THREE.Quaternion();
const journeyEntryDirection = galaxyViewDirection.clone();
const journeyEntryTarget = new THREE.Vector3();
let journeyEntryDistance = galaxyDefaultDistance();
let journeyEntryInteracted = false;
let journeyProgress = 0;
let journeyTargetProgress = 0;
let galaxyInteracted = false;
let galaxyTouchLocked = false;
let solarTouchLocked = false;
let travelForward = true;
let navigationFrame = 0;
const solarCompositionProgress = 0;
const solarStoryCompositionProgress = 0;
arrivalOverlay.hidden = !arrivalActive;
document.body.classList.toggle('is-arriving', arrivalActive);

controls.addEventListener('start', () => {
  if (!solarInteractionActive) return;
  cameraGestureActive = true;
  resettingOverview = false;
  followSelectionDirection = false;
  focusTransitionProgress = 1;
});
controls.addEventListener('end', () => {
  cameraGestureActive = false;
  if (solarInteractionActive) cameraPanOffset.subVectors(controls.target, desiredTarget);
});
controls.addEventListener('change', () => {
  if (cameraGestureActive) camera.userData.zoomTarget = camera.position.distanceTo(controls.target);
});
galaxyControls.addEventListener('start', () => { galaxyInteracted = true; });

const scrollRange = () => Math.max(1, journeyTrack.offsetHeight - window.innerHeight);
function updateSceneMode() {
  if (arrivalActive && window.scrollY > 2) finishArrival();
  const nextProgress = THREE.MathUtils.clamp(window.scrollY / scrollRange(), 0, 1);
  if (Math.abs(nextProgress - journeyTargetProgress) > 0.0001) travelForward = nextProgress > journeyTargetProgress;
  journeyTargetProgress = nextProgress;
}
function updateJourneyUi() {
  const nextMode = journeyProgress < 0.005 ? 'galaxy' : journeyProgress > 0.995 ? 'solar' : 'transition';
  if (nextMode !== activeMode) {
    if (activeMode === 'galaxy') {
      journeyEntryDirection.copy(camera.position).sub(galaxyControls.target).normalize();
      journeyEntryTarget.copy(galaxyControls.target);
      journeyEntryDistance = camera.position.distanceTo(galaxyControls.target);
      journeyEntryInteracted = galaxyInteracted;
    }
    if (activeMode === 'solar') { resetCamera(); solarTravelPhase = 0; setSolarTouchLock(false); }
    if (nextMode === 'galaxy') { galaxyInteracted = journeyEntryInteracted; galaxyControls.target.copy(journeyEntryTarget); }
    if (nextMode !== 'galaxy' && galaxyTouchLocked) setGalaxyTouchLock(false);
    activeMode = nextMode;
    if (nextMode === 'solar') queuePortraitPreload();
    canvas.style.cursor = nextMode === 'transition' ? 'default' : 'grab';
    document.querySelector('#sim-options').removeAttribute('open');
  }
  solarInteractionActive = activeMode === 'solar';
  document.body.classList.toggle('galaxy-active', activeMode === 'galaxy');
  document.body.classList.toggle('transition-active', activeMode === 'transition');
  document.body.classList.toggle('explore-active', solarInteractionActive);
  document.body.classList.toggle('system-interactive', solarInteractionActive);
  document.body.classList.toggle('planet-selected', Boolean(activeBody || requestedBody) && solarInteractionActive);
  galaxyGesture.hidden = galaxyInteracted || (window.innerWidth < 700 && !galaxyTouchLocked);
  document.body.style.setProperty('--journey-progress', journeyProgress.toFixed(4));
  journeyProgressBar.style.transform = 'scaleY(' + journeyProgress + ')';
  const solarChapter = journeyProgress > 0.65;
  const title = solarChapter ? 'Nuestro rincón del universo.' : 'Entre millones de estrellas.';
  if (journeyTitle.textContent !== title) journeyTitle.textContent = title;
  const description = document.querySelector('#journey-description');
  const chapterDescription = solarChapter ? 'Ocho planetas, a tu ritmo.' : 'Un pequeño punto nos espera.';
  if (description.textContent !== chapterDescription) description.textContent = chapterDescription;
  const waypoint = !travelForward ? 'Volvemos a mirar más allá.'
    : journeyProgress < 0.30 ? 'Nos acercamos.'
    : journeyProgress < 0.76 ? 'El camino se abre.' : 'Ya casi estamos.';
  if (waypointTitle.textContent !== waypoint) waypointTitle.textContent = waypoint;
  document.querySelectorAll('[data-stage]').forEach(link => {
    const current = link.dataset.stage === (solarChapter ? 'solar' : 'galaxy');
    link.classList.toggle('is-active', current);
    if (current) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current');
  });
  labelLayer.classList.toggle('is-inactive', !solarInteractionActive);
  labelLayer.style.opacity = solarInteractionActive ? '1' : '0';
  labelLayer.style.visibility = solarInteractionActive ? 'visible' : 'hidden';
}
window.addEventListener('scroll', updateSceneMode, { passive: true });
window.addEventListener('resize', () => {
  updateHandsetUi();
  celestialBodies.forEach(body => { body.labelOffset = null; });
  if (performance.now() < portraitScrollIntentUntil) { updateSceneMode(); return; }
  // Orientation and browser chrome change the scroll range. Keep the same
  // destination instead of interpreting that resize as a journey backwards.
  const progress = activeBody || requestedBody || activeMode === 'solar' ? 1 : journeyTargetProgress;
  window.scrollTo({ top: progress * scrollRange(), behavior: 'instant' });
  journeyTargetProgress = progress;
  if (progress === 1) journeyProgress = 1;
  updateSceneMode();
}, { passive: true });
updateSceneMode();

function setPanel(planet) {
  planetPanelElement.classList.remove('is-expanded');
  document.body.classList.remove('planet-details-open');
  const moreButton = document.querySelector('#panel-more');
  moreButton.setAttribute('aria-expanded', 'false');
  moreButton.innerHTML = `${handset() ? 'Más datos' : 'Conocer más'} <span aria-hidden="true">+</span>`;
  document.querySelector('#planet-name').innerHTML = planet ? planet.name : 'El sistema<br />Solar';
  document.querySelector('#portrait-caption').textContent = planet ? portraitProfiles[planet.id].caption : '';
  document.querySelector('.portrait-symbol').innerHTML = planetIcon(planet?.id || 'sun');
  document.querySelector('#planet-description').textContent = planet
    ? (handset() ? portraitSummaries[planet.id] : planet.description)
    : 'Ocho planetas, cada uno siguiendo su propio ritmo alrededor de una estrella común.';
  document.querySelector('#planet-diameter').innerHTML = planet ? (planet.id === 'sun' ? '1.39 M' : planet.diameter.toLocaleString('es-MX')) + ' <small>km</small>' : '1.39 M km <small>Sol</small>';
  document.querySelector('#planet-distance').innerHTML = planet ? (planet.id === 'sun' ? 'Centro <small>del sistema solar</small>' : planet.distanceDisplay + ' <small>del Sol</small>') : '149.6 M km <small>Tierra</small>';
  document.querySelector('#planet-period').innerHTML = planet ? (planet.id === 'sun' ? '25 <small>días en el ecuador</small>' : planet.periodDisplay + (planet.periodDisplay.includes('años') ? '' : ' <small>días</small>')) : '365.25 <small>días</small>';
  document.querySelector('#planet-moons').innerHTML = planet ? (planet.id === 'sun' ? '8 <small>planetas</small>' : planet.moons + ' <small>confirmadas</small>') : '—';
  document.querySelector('#period-label').textContent = planet?.id === 'sun' ? 'Una vuelta' : handset() ? 'Un año aquí' : 'Año en este planeta';
  document.querySelector('#moons-label').textContent = planet?.id === 'sun' ? 'Planetas' : 'Lunas';
  document.querySelector('#planet-temperature').textContent = planet ? planet.temperature : '—';
  const sourceLink = document.querySelector('#planet-source');
  sourceLink.href = planet ? planet.sourceUrl : 'https://science.nasa.gov/solar-system/planets/';
  sourceLink.setAttribute('aria-label', planet ? 'Fuente de NASA para los datos de ' + planet.name : 'Fuentes de datos NASA');
}

document.querySelector('#panel-more').addEventListener('click', event => {
  const expanded = planetPanelElement.classList.toggle('is-expanded');
  document.body.classList.toggle('planet-details-open', expanded);
  event.currentTarget.setAttribute('aria-expanded', String(expanded));
  event.currentTarget.innerHTML = expanded
    ? `${handset() ? 'Menos datos' : 'Volver a la vista'} <span aria-hidden="true">−</span>`
    : `${handset() ? 'Más datos' : 'Conocer más'} <span aria-hidden="true">+</span>`;
});

function updateSelectionUi() {
  solarHint.textContent = handset()
    ? 'Toca un planeta para acercarte.'
    : (activeBody ? 'Arrastra para cambiar de perspectiva.' : 'Elige tu próxima escala.');
}

function updatePortraitStatus(status, id) {
  clearTimeout(destinationStatusTimer);
  destinationStatus.textContent = '';
  document.body.dataset.portraitState = status;
  document.body.classList.toggle('portrait-loading', status === 'loading');
  document.body.classList.toggle('portrait-changing', status === 'changing');
  const busy = status === 'loading' || status === 'changing';
  planetButtons.setAttribute('aria-busy', String(busy));
  planetButtons.querySelectorAll('.planet-chip').forEach(chip => chip.classList.toggle('is-pending', busy && chip.dataset.planet === id));
  if (status === 'loading') destinationStatusTimer = setTimeout(() => {
    destinationStatus.textContent = 'Un instante, estamos llegando.';
  }, 1400);
  if (status === 'error') {
    requestedBody = null;
    if (!activeBody) resetCamera();
    planetButtons.querySelectorAll('.planet-chip').forEach(chip => {
      const selected = chip.dataset.planet === activeBody?.data.id;
      chip.classList.toggle('is-selected', selected);
      chip.setAttribute('aria-pressed', String(selected));
    });
    updateRailIndicator();
    destinationStatus.textContent = 'No pudimos llegar. Vuelve a intentarlo.';
  }
}

function displayPortrait(id) {
  if (!requestedBody || requestedBody.data.id !== id) return;
  activeBody = requestedBody;
  requestedBody = null;
  document.body.dataset.portrait = id;
  document.body.classList.add('portrait-visible');
  document.body.classList.toggle('portrait-touched', portraitHintShown);
  if (handset() && !portraitHintShown) {
    portraitHintShown = true;
    setTimeout(() => document.body.classList.add('portrait-touched'), 7000);
  }
  setPanel(activeBody.data);
  queuePortraitPreload();
  portraitPager.querySelectorAll('i').forEach(dot => dot.classList.toggle('is-current', dot.dataset.destination === id));
  portraitPager.setAttribute('aria-label', `${activeBody.data.name}, destino ${celestialBodies.indexOf(activeBody) + 1} de ${celestialBodies.length}`);
  const heading = handset() ? planetPanelElement : document.querySelector('.planet-panel-main');
  heading.getAnimations().forEach(animation => animation.cancel());
  if (!reducedMotion) heading.animate([
    { opacity: 0, transform: handset() ? `translateX(${portraitDirection * 28}px)` : 'translateY(8px)' },
    { opacity: 1, transform: 'translate(0)' },
  ], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
}

function frameSelection() {
  if (!activeBody || !followingSelection) return;
  const compact = window.innerWidth < 700 || window.innerHeight < 560;
  if (window.innerWidth < 700) {
    const top = document.querySelector('.exploration-context').getBoundingClientRect().bottom + 12;
    const bottom = planetPanelElement.getBoundingClientRect().top - 16;
    const availableHeight = Math.max(64, bottom - top);
    selectionFrame.centerY = (top + availableHeight / 2) / window.innerHeight;
    selectionFrame.heightFraction = Math.min(0.28, availableHeight / window.innerHeight * 0.72);
  } else {
    selectionFrame.centerY = compact ? 0.40 : 0.5;
    selectionFrame.heightFraction = compact ? 0.25 : 0.44;
  }
  camera.userData.zoomTarget = focusDistance(activeBody.data, camera.aspect, camera.fov, compact, selectionFrame.heightFraction);
}

function stepDestination(direction) {
  const current = requestedBody || activeBody;
  if (!current) return;
  const index = celestialBodies.indexOf(current);
  const next = celestialBodies[(index + direction + celestialBodies.length) % celestialBodies.length];
  selectPlanet(next.data.id, direction);
}
document.querySelector('#enter-planets').addEventListener('click', () => selectPlanet('earth'));
document.querySelector('#previous-planet').addEventListener('click', () => stepDestination(-1));
document.querySelector('#next-planet').addEventListener('click', () => stepDestination(1));

function selectPlanet(id, direction = 0) {
  if (!solarInteractionActive) return;
  const object = id === 'sun' ? sunObject : planetObjects.find(item => item.data.id === id);
  if (!object) return;
  portraitDirection = direction || Math.sign(celestialBodies.indexOf(object) - celestialBodies.indexOf(activeBody)) || 1;
  focusStartCameraPosition.copy(camera.position);
  focusStartCameraTarget.copy(controls.target);
  cameraPanOffset.set(0, 0, 0);
  focusTransitionProgress = 0;
  followSelectionDirection = true;
  followingSelection = true;
  resettingOverview = false;
  setHover(null);
  object.mesh.getWorldPosition(focusBodyPosition);
  sunObject.mesh.getWorldPosition(focusSunPosition);
  if (object.data.id === 'sun') {
    focusDirection.copy(camera.position).sub(controls.target).normalize();
  } else {
    focusDirection.subVectors(focusSunPosition, focusBodyPosition).normalize();
    focusDirection.addScaledVector(orbitCameraUp, 0.72).normalize();
  }
  activeMode = 'solar';
  requestedBody = object;
  updateRendererResolution(true);
  void portraits.select(object, portraitDirection);
  controls.minDistance = Math.max(0.65, object.data.radius * 1.35);
  document.querySelector('#planet-panel').classList.add('has-selection');
  document.querySelector('#explorar').classList.add('has-selection');
  document.body.classList.add('planet-selected');
  Array.from(document.querySelectorAll('.planet-chip')).forEach(chip => {
    const selected = chip.dataset.planet === id;
    chip.classList.toggle('is-selected', selected);
    chip.setAttribute('aria-pressed', String(selected));
  });
  labels.forEach((label, key) => label.classList.toggle('is-selected', key === id));
  labelLayer.classList.add('has-selection');
  updateSelectionUi();
  frameSelection();
  const chip = planetButtons.querySelector(`[data-planet="${id}"]`);
  if (chip && !handset()) planetButtons.scrollTo({ left: chip.offsetLeft - (planetButtons.clientWidth - chip.offsetWidth) / 2, behavior: reducedMotion ? 'auto' : 'smooth' });
  updateRailIndicator();
}

function resetCamera() {
  requestedBody = null;
  portraits.clear();
  delete document.body.dataset.portrait;
  activeBody = null;
  updateRendererResolution(false);
  controls.minDistance = 2.25;
  cameraGestureActive = false;
  cameraPanOffset.set(0, 0, 0);
  followSelectionDirection = false;
  followingSelection = false;
  resettingOverview = true;
  setHover(null);
  focusTransitionProgress = 1;
  desiredTarget.set(0, 0, 0);
  camera.userData.zoomTarget = defaultCameraDistance();
  document.querySelector('#planet-panel').classList.remove('has-selection');
  document.querySelector('#explorar').classList.remove('has-selection');
  document.body.classList.remove('planet-selected', 'portrait-visible', 'portrait-touched', 'planet-details-open');
  Array.from(document.querySelectorAll('.planet-chip')).forEach(chip => { chip.classList.remove('is-selected'); chip.setAttribute('aria-pressed', 'false'); });
  labelLayer.classList.remove('has-selection');
  setPanel(null);
  updateSelectionUi();
  updateRailIndicator();
}

overviewButton.addEventListener('click', resetCamera);
document.querySelector('#reset-camera').addEventListener('click', () => {
  if (activeBody) portraits.resetView(); else resetCamera();
  document.querySelector('#sim-options').open = false;
});
document.querySelector('#turn-left').addEventListener('click', () => portraits.turn(-.3));
document.querySelector('#turn-right').addEventListener('click', () => portraits.turn(.3));

function adjustZoom(factor) {
  if (activeBody) { portraits.adjustZoom(factor); return; }
  const currentDistance = camera.userData.zoomTarget || camera.position.distanceTo(controls.target);
  camera.userData.zoomTarget = THREE.MathUtils.clamp(currentDistance * factor, controls.minDistance, controls.maxDistance);
}
document.querySelector('#zoom-in').addEventListener('click', () => adjustZoom(0.78));
document.querySelector('#zoom-out').addEventListener('click', () => adjustZoom(1.28));

function togglePlay() {
  running = !running;
  playButton.setAttribute('aria-label', running ? 'Pausar movimiento' : 'Continuar movimiento');
  playButton.title = running ? 'Pausar movimiento' : 'Continuar movimiento';
  playButton.querySelector('.play-label').textContent = playButton.title;
  playButton.classList.toggle('is-paused', !running);
  simStatus.textContent = running ? 'En movimiento' : 'En pausa';
  document.querySelector('.timeline-status').classList.toggle('is-paused', !running);
}
playButton.addEventListener('click', togglePlay);

speedButtons.forEach(button => {
  const multiplier = Number(button.dataset.speed);
  button.title = `Velocidad ${multiplier}×: aproximadamente ${multiplier} años simulados por minuto`;
  button.setAttribute('aria-label', button.title);
  button.addEventListener('click', () => {
    speed = Number(button.dataset.speed);
    simRate.textContent = simulationRate(speed);
    speedButtons.forEach(item => {
      const selected = item === button;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
  });
});

document.querySelector('#toggle-orbits').addEventListener('click', event => {
  showOrbits = !showOrbits;
  planetObjects.forEach(object => {
    object.trajectory.visible = showOrbits;
    object.motionArc.visible = showOrbits;
    object.globalTrail.visible = showOrbits && activeMode === 'solar';
  });
  const button = event.currentTarget;
  button.classList.toggle('is-active', showOrbits);
  button.setAttribute('aria-pressed', String(showOrbits));
});
document.querySelector('#toggle-names').addEventListener('click', event => {
  showNames = !showNames;
  const button = event.currentTarget;
  button.classList.toggle('is-active', showNames);
  button.setAttribute('aria-pressed', String(showNames));
});

const galaxyTouchButton = document.querySelector('#galaxy-touch-toggle');
const solarTouchButton = document.querySelector('#solar-touch-toggle');
function setSolarTouchLock(locked) {
  solarTouchLocked = locked;
  document.body.classList.toggle('solar-touch-locked', locked);
  solarTouchButton.setAttribute('aria-pressed', String(locked));
  solarTouchButton.textContent = locked ? 'Continuar viaje' : 'Girar vista';
  setCanvasTouchAction();
  updateSelectionUi();
}
solarTouchButton.addEventListener('click', () => setSolarTouchLock(!solarTouchLocked));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  if (!solarInteractionActive) return;
  const direction = button.dataset.view === 'top'
    ? orbitCameraUp.clone().multiplyScalar(0.985).addScaledVector(defaultViewDirection, 0.17).normalize()
    : defaultViewDirection;
  if (!activeBody) camera.userData.zoomTarget = button.dataset.view === 'top'
    ? overviewDistance(camera.aspect, camera.fov, false) : defaultCameraDistance();
  followSelectionDirection = false;
  focusTransitionProgress = 1;
  camera.position.copy(controls.target).addScaledVector(direction, camera.userData.zoomTarget || defaultCameraDistance());
  camera.lookAt(controls.target);
  controls.update();
}));
function setGalaxyTouchLock(locked) {
  galaxyTouchLocked = locked;
  document.body.classList.toggle('galaxy-touch-locked', locked);
  galaxyTouchButton.setAttribute('aria-pressed', String(locked));
  galaxyTouchButton.textContent = locked ? 'CONTINUAR' : 'GIRAR';
  galaxyTouchButton.setAttribute('aria-label', locked ? 'Volver a desplazar la página' : 'Activar gestos para girar la galaxia');
  setCanvasTouchAction();
}

function resetGalaxyView() {
  galaxyInteracted = false;
  galaxyScene.position.set(0,0,0);
  galaxyScene.scale.setScalar(1);
  galaxySunMarker.scale.setScalar(1);
  galaxyControls.target.copy(updateGalaxyHomeTarget());
  camera.up.copy(worldUp);
  camera.position.copy(galaxyViewDirection).multiplyScalar(galaxyDefaultDistance()).add(galaxyControls.target);
  camera.lookAt(galaxyControls.target);
  galaxyControls.update();
}
function finishArrival() {
  if (!arrivalActive) return;
  arrivalActive = false;
  arrivalElapsed = ARRIVAL_DURATION;
  arrivalOverlay.hidden = true;
  document.body.classList.remove('is-arriving');
  resetGalaxyView();
  updateRendererResolution();
  queuePortraitPreload();
}
function beginArrival() {
  cancelNavigation();
  clearTimeout(portraitPreloadTimer);
  if (galaxyTouchLocked) setGalaxyTouchLock(false);
  window.scrollTo({ top: 0, behavior: 'instant' });
  window.history.replaceState(null, '', '#galaxia');
  journeyProgress = journeyTargetProgress = 0;
  activeMode = 'galaxy';
  if (reducedMotion) { resetGalaxyView(); updateJourneyUi(); return; }
  arrivalElapsed = 0;
  arrivalActive = true;
  updateRendererResolution();
  clock.getDelta();
  galaxyInteracted = false;
  arrivalOverlay.hidden = false;
  document.body.classList.add('is-arriving');
  resetGalaxyView();
  renderArrival(0);
}
document.querySelector('#skip-intro').addEventListener('click', finishArrival);
document.querySelector('#replay-intro').addEventListener('click', () => mobileLaunch.show());
function adjustGalaxyZoom(factor) {
  if (activeMode !== 'galaxy') return;
  galaxyInteracted = true;
  const offset = camera.position.clone().sub(galaxyControls.target);
  const distance = THREE.MathUtils.clamp(offset.length() * factor, galaxyControls.minDistance, galaxyControls.maxDistance);
  camera.position.copy(galaxyControls.target).add(offset.normalize().multiplyScalar(distance));
  camera.lookAt(galaxyControls.target);
  galaxyControls.update();
}

document.querySelector('#galaxy-reset').addEventListener('click', resetGalaxyView);
document.querySelector('#galaxy-zoom-in').addEventListener('click', () => adjustGalaxyZoom(0.82));
document.querySelector('#galaxy-zoom-out').addEventListener('click', () => adjustGalaxyZoom(1.22));
galaxyTouchButton.addEventListener('click', () => setGalaxyTouchLock(!galaxyTouchLocked));
canvas.addEventListener('wheel', event => {
  if (!(event.ctrlKey || event.metaKey) || activeMode === 'transition') return;
  event.preventDefault();
  if (solarInteractionActive) adjustZoom(event.deltaY > 0 ? 1.12 : 0.89);
  else adjustGalaxyZoom(event.deltaY > 0 ? 1.12 : 0.89);
}, { passive: false });

window.addEventListener('keydown', event => {
  if (document.documentElement.classList.contains('launch-pending')) return;
  if (arrivalActive && event.key === 'Escape') { event.preventDefault(); finishArrival(); return; }
  if (!solarInteractionActive || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (event.key === 'Escape') {
    const openDetails = document.querySelector('#sim-options[open], .atlas-credits[open]');
    if (openDetails) { openDetails.open = false; openDetails.querySelector('summary').focus(); }
    else if (planetPanelElement.classList.contains('is-expanded')) document.querySelector('#panel-more').click();
    else { resetCamera(); overviewButton.focus({ preventScroll: true }); }
    event.preventDefault();
  } else if (event.code === 'Space' && !event.target.closest('button, a, summary')) {
    event.preventDefault(); togglePlay();
  } else if (handset() && activeBody && ['ArrowLeft', 'ArrowRight'].includes(event.key) && !event.target.closest('button, a, summary')) {
    event.preventDefault(); stepDestination(event.key === 'ArrowRight' ? 1 : -1);
  }
});

function formatSimDate(days) {
  const start = new Date(Date.UTC(2026, 0, 1));
  const date = new Date(start.getTime() + days * 86400000);
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(date).replace('.', '').toUpperCase();
}

function setHover(id) {
  if (lastHover === id) return;
  lastHover = id;
  canvas.style.cursor = id ? 'pointer' : 'grab';
  labels.forEach((label, key) => label.classList.toggle('is-hovered', key === id));
  canvas.setAttribute('aria-label', id ? 'Seleccionar ' + celestialBodies.find(body => body.data.id === id)?.data.name : 'Sistema Solar en 3D, arrastra para girar la vista');
}

function pickBody(event) {
  const rect = canvas.getBoundingClientRect();
  mouse.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(selectableMeshes, false);
  if (hits.length) return hits[0].object.userData.id;

  let nearestId = null;
  let nearestRatio = Infinity;
  const pickX = event.clientX - rect.left;
  const pickY = event.clientY - rect.top;
  const pixelsPerRadian = rect.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  for (const body of celestialBodies) {
    const worldPosition = body.mesh.getWorldPosition(new THREE.Vector3());
    const cameraDistance = camera.position.distanceTo(worldPosition);
    const projected = worldPosition.clone().project(camera);
    if (projected.z < -1 || projected.z > 1) continue;
    const screenX = (projected.x * 0.5 + 0.5) * rect.width;
    const screenY = (-projected.y * 0.5 + 0.5) * rect.height;
    const hitRadius = Math.max(window.innerWidth < 700 ? 26 : 22, body.data.radius * pixelsPerRadian / cameraDistance * 1.65);
    const ratio = Math.hypot(pickX - screenX, pickY - screenY) / hitRadius;
    if (ratio <= 1 && ratio < nearestRatio) {
      nearestId = body.data.id;
      nearestRatio = ratio;
    }
  }
  return nearestId;
}

canvas.addEventListener('pointermove', event => {
  if (!solarInteractionActive || cameraGestureActive || portraits.visible) return;
  if (lastPointer && Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y) > 4) return;
  setHover(pickBody(event));
});
canvas.addEventListener('pointerdown', event => {
  if (activeMode === 'galaxy') {
    canvas.style.cursor = 'grabbing';
    return;
  }
  if (!solarInteractionActive) return;
  if (event.pointerType === 'mouse' && event.button !== 0) {
    if (event.button === 2) canvas.style.cursor = 'move';
    return;
  }
  lastPointer = { x: event.clientX, y: event.clientY };
  canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointerup', event => {
  if (activeMode === 'galaxy') {
    canvas.style.cursor = 'grab';
    return;
  }
  const start = lastPointer;
  lastPointer = null;
  canvas.style.cursor = 'grab';
  if (!solarInteractionActive || portraits.visible || !start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
  const id = pickBody(event);
  if (id) selectPlanet(id);
});
canvas.addEventListener('pointercancel', () => {
  lastPointer = null;
  canvas.style.cursor = solarInteractionActive || activeMode === 'galaxy' ? 'grab' : 'default';
});
window.addEventListener('pointermove', event => {
  pointerX = event.clientX / window.innerWidth * 2 - 1;
  pointerY = event.clientY / window.innerHeight * 2 - 1;
}, { passive: true });

function updateLabels() {
  if (activeMode !== 'solar' || !solarInteractionActive) return;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  connectorSvg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
  const pixelsPerRadian = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const occupied = [];
  const overlayRects = ['.site-header', '.journey-caption', '.exploration-context', '.solar-hint', '#planet-panel', '.simulation-ui', '.journey-progress', '.atlas-credits']
    .map(selector => document.querySelector(selector))
    .filter(element => {
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.05;
    })
    .map(element => element.getBoundingClientRect());
  for (const object of celestialBodies) {
    const label = labels.get(object.data.id);
    const connector = connectorGroups.get(object.data.id);
    const annotated = handset() && !activeBody && ['sun', 'earth', 'saturn'].includes(object.data.id);
    if (!showNames && !annotated && object.data.id !== activeBody?.data.id && object.data.id !== lastHover) {
      label.style.opacity = '0';
      label.style.visibility = 'hidden';
      connector.group.style.opacity = '0';
      continue;
    }
    const worldPosition = object.mesh.getWorldPosition(new THREE.Vector3());
    const pos = worldPosition.clone();
    pos.project(camera);
    const x = (pos.x * 0.5 + 0.5) * width;
    const y = (-pos.y * 0.5 + 0.5) * height;
    if (activeBody && object.data.id !== activeBody.data.id) {
      label.style.opacity = '0';
      label.style.visibility = 'hidden';
      connector.group.style.opacity = '0';
      continue;
    }
    const onScreen = pos.z > -1 && pos.z < 1 && x > -24 && x < width + 24 && y > -24 && y < height + 24;
    if (!onScreen) {
      label.style.opacity = '0';
      label.style.visibility = 'hidden';
      connector.group.style.opacity = '0';
      object.labelScreenPosition = null;
      continue;
    }
    const depth = camera.position.distanceTo(worldPosition);
    const bodyRadius = object.data.radius * pixelsPerRadian / depth;
    const labelWidth = label.offsetWidth || 76;
    const labelHeight = label.offsetHeight || 30;
    const anchorX = rect.left + x;
    const anchorY = rect.top + y;
    const safe = { left: rect.left + 8, top: rect.top + 88, right: rect.right - 8, bottom: rect.bottom - 12 };
    let chosen = null;
    let bestScore = Infinity;
    const steps = [Math.max(18, bodyRadius + 10), Math.max(30, bodyRadius + 22), 44, 60, 78, 96];
    for (const distance of steps) {
      for (let direction = 0; direction < 8; direction++) {
        const angle = direction * Math.PI / 4 - Math.PI / 2;
        const centerX = anchorX + Math.cos(angle) * distance;
        const centerY = anchorY + Math.sin(angle) * distance;
        const left = THREE.MathUtils.clamp(centerX - labelWidth / 2, safe.left, safe.right - labelWidth);
        const top = THREE.MathUtils.clamp(centerY - labelHeight / 2, safe.top, safe.bottom - labelHeight);
        const box = { left, top, right: left + labelWidth, bottom: top + labelHeight };
        let score = distance * 0.12;
        if (object.labelOffset) {
          score += Math.hypot((left + labelWidth / 2) - anchorX - object.labelOffset.x,
            (top + labelHeight / 2) - anchorY - object.labelOffset.y) * 0.9;
        }
        for (const other of occupied) {
          const overlapWidth = Math.max(0, Math.min(box.right + 6, other.right) - Math.max(box.left - 6, other.left));
          const overlapHeight = Math.max(0, Math.min(box.bottom + 6, other.bottom) - Math.max(box.top - 6, other.top));
          score += overlapWidth * overlapHeight * 3.5;
        }
        for (const other of overlayRects) {
          const overlapWidth = Math.max(0, Math.min(box.right + 5, other.right) - Math.max(box.left - 5, other.left));
          const overlapHeight = Math.max(0, Math.min(box.bottom + 5, other.bottom) - Math.max(box.top - 5, other.top));
          score += overlapWidth * overlapHeight * 5.5;
        }
        if (score < bestScore) {
          bestScore = score;
          chosen = box;
        }
      }
    }
    if (bestScore > 700 && object.data.id !== activeBody?.data.id && object.data.id !== lastHover) {
      label.style.opacity = '0';
      label.style.visibility = 'hidden';
      connector.group.style.opacity = '0';
      continue;
    }
    const centerX = chosen.left + labelWidth / 2;
    const centerY = chosen.top + labelHeight / 2;
    object.labelScreenPosition = { x: centerX, y: centerY };
    object.labelOffset = { x: centerX - anchorX, y: centerY - anchorY };
    label.style.transform = 'translate(' + chosen.left + 'px,' + chosen.top + 'px)';
    label.style.opacity = '1';
    label.style.visibility = 'visible';
    occupied.push(chosen);
    label.classList.toggle('is-selected', object.data.id === activeBody?.data.id);

    const edgeX = THREE.MathUtils.clamp(anchorX, chosen.left, chosen.right);
    const edgeY = THREE.MathUtils.clamp(anchorY, chosen.top, chosen.bottom);
    const edgeDistance = Math.hypot(edgeX - anchorX, edgeY - anchorY);
    if (edgeDistance > bodyRadius + 5) {
      const startX = anchorX + (edgeX - anchorX) / edgeDistance * (bodyRadius + 2);
      const startY = anchorY + (edgeY - anchorY) / edgeDistance * (bodyRadius + 2);
      connector.line.setAttribute('x1', startX.toFixed(1));
      connector.line.setAttribute('y1', startY.toFixed(1));
      connector.line.setAttribute('x2', edgeX.toFixed(1));
      connector.line.setAttribute('y2', edgeY.toFixed(1));
      connector.marker.setAttribute('cx', startX.toFixed(1));
      connector.marker.setAttribute('cy', startY.toFixed(1));
      connector.group.style.opacity = object.data.id === activeBody?.data.id ? '1' : '0.78';
    } else {
      connector.group.style.opacity = '0';
    }
  }
}

function updateFocusRing() {
  const body = activeBody || celestialBodies.find(item => item.data.id === lastHover);
  if (!solarInteractionActive || !body) { focusRing.hidden = true; return; }
  const position = body.mesh.getWorldPosition(focusBodyPosition);
  const distance = camera.position.distanceTo(position);
  const projected = position.clone().project(camera);
  if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.15 || Math.abs(projected.y) > 1.15) {
    focusRing.hidden = true; return;
  }
  const radius = body.data.radius * (body.data.id === 'saturn' ? 2.42 : 1);
  const pixels = radius * window.innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance);
  const diameter = Math.max(44, pixels * 2 + 18);
  focusRing.hidden = false;
  focusRing.classList.toggle('is-selected', Boolean(activeBody));
  focusRing.style.width = focusRing.style.height = `${diameter}px`;
  focusRing.style.transform = `translate(${(projected.x * 0.5 + 0.5) * window.innerWidth - diameter / 2}px, ${(-projected.y * 0.5 + 0.5) * window.innerHeight - diameter / 2}px)`;
}

function placeGalaxyAtSun(scale, rebase) {
  journeyYRotation.setFromAxisAngle(worldUp, galaxyScene.rotation.y);
  journeySunPosition.copy(galaxySunMarker.position).applyQuaternion(journeyYRotation);
  galaxyScene.scale.setScalar(scale);
  galaxyScene.position.copy(journeySunPosition).multiplyScalar(-rebase * scale);
  galaxySunMarker.scale.setScalar(1 / scale);
  journeyWorldSun.copy(journeySunPosition).multiplyScalar((1 - rebase) * scale);
}

function renderArrival(delta) {
  arrivalElapsed = advanceArrival(arrivalElapsed, delta);
  const arrival = sampleArrival(arrivalElapsed, galaxyDefaultDistance(), arrivalStartScale());
  const home = updateGalaxyHomeTarget();
  journeyDirection.copy(galaxyViewDirection).lerp(neighborhoodViewDirection, (1 - arrival.approach) * 0.28).normalize();
  camera.up.copy(worldUp);
  camera.position.copy(journeyDirection).multiplyScalar(arrival.distance).add(home);
  camera.lookAt(home);
  galaxyControls.target.copy(home);
  arrivalOverlay.style.setProperty('--arrival-copy-opacity', arrival.copyOpacity);
  stellarPassage.setFlight(arrival.flightDistance, arrival.flightOpacity, renderer.getPixelRatio(), camera.aspect);
  if (arrival.progress >= 1) finishArrival();
}

function renderJourney(progress) {
  const flight = sampleJourney(progress, journeyEntryDistance, defaultCameraDistance());
  placeGalaxyAtSun(flight.galacticScale, flight.rebase);
  target.lerpVectors(journeyEntryTarget, journeyWorldSun, flight.focus);

  // Every galactic star stays in place. The camera approaches our marker while
  // coordinate units change, leaving the surrounding galaxy behind the planets.
  galaxy.setTransition(progress);
  galaxy.setOpacity(1);
  galaxyScene.visible = true;
  solarSystem.position.copy(journeyWorldSun);
  solarSystem.scale.setScalar(flight.solarScale);
  solarSystem.visible = progress > 0.37;
  systemSun.material.uniforms.uOpacity.value = flight.sunReveal;
  systemSun.material.depthWrite = flight.sunReveal > 0.995;
  halo.material.opacity = flight.sunReveal;
  const planetReveal = flight.planetsReveal;
  setPlanetTransitionOpacity(planetReveal);
  planetObjects.forEach(object => {
    object.trajectory.visible = showOrbits && progress > 0.72;
    object.motionArc.visible = showOrbits && progress > 0.72;
    object.trajectory.material.opacity = 0.12 * planetReveal;
    object.motionArc.material.opacity = 0.78 * planetReveal;
    object.globalTrail.visible = false;
  });

  journeyDirection.copy(journeyEntryDirection).lerp(defaultViewDirection, flight.rotation).normalize();
  camera.up.copy(worldUp).lerp(updateOverviewUp(), flight.rotation).normalize();
  focusForward.copy(journeyDirection).negate();
  focusRight.crossVectors(focusForward, camera.up).normalize();
  focusUp.crossVectors(focusRight, focusForward).normalize();
  const frameHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * flight.distance;
  const profile = overviewProfile(camera.aspect, handset(), window.innerHeight);
  target.addScaledVector(focusUp, frameHeight * profile.centerShift * flight.composition);
  target.addScaledVector(focusRight, frameHeight * camera.aspect * profile.horizontalShift * flight.composition);
  scaleOverviewWorlds(THREE.MathUtils.lerp(1, profile.planetScale, flight.composition));
  camera.position.copy(target).addScaledVector(journeyDirection, flight.distance);
  camera.lookAt(target);
  controls.target.copy(target);
  stellarPassage.setFlight(175 + flight.flightDistance, reducedMotion ? 0 : flight.flightOpacity, renderer.getPixelRatio(), camera.aspect);
}

function animate() {
  requestAnimationFrame(animate);
  const frameDelta = clock.getDelta();
  if (mobileLaunch?.covering) return;
  const delta = Math.min(frameDelta, 0.05);
  elapsedForMotion += delta;
  stellarPassage.setFlight(0, 0, renderer.getPixelRatio(), camera.aspect);
  journeyProgress = reducedMotion ? journeyTargetProgress : THREE.MathUtils.damp(journeyProgress,journeyTargetProgress,8,frameDelta);
  if (Math.abs(journeyProgress - journeyTargetProgress) < 0.0003) journeyProgress = journeyTargetProgress;
  updateJourneyUi();
  const pointerEase = 1 - Math.exp(-delta * 4.5);
  easedPointerX += (pointerX - easedPointerX) * pointerEase;
  easedPointerY += (pointerY - easedPointerY) * pointerEase;
  if (!reducedMotion) starMaterial.uniforms.uTime.value += delta;
  galaxy.update(delta,elapsedForMotion,camera);
  if (running && journeyProgress > 0.45) {
    const angularScale = daysPerSecondAtOneX * speed;
    if (activeMode === 'solar') {
      solarTravelPhase += delta * globalTravelRate * speed;
      galacticPositionAt(solarTravelPhase, solarSystem.position);
    }
    totalSimDays += delta * angularScale;
    planetObjects.forEach(object => {
      const meanMotion = Math.PI * 2 * angularScale / object.data.periodDays;
      object.meanAnomaly = THREE.MathUtils.euclideanModulo(object.meanAnomaly + meanMotion * delta,Math.PI * 2);
      updateOrbitalPosition(object);
      updateMotionArc(object);
      object.mesh.rotation.y += object.spin * 2.8 * Math.sqrt(speed) * delta;
    });
    systemSun.rotation.y += delta * 0.3 * Math.sqrt(speed);
    systemSun.material.uniforms.uTime.value += delta;
    simDate.textContent = formatSimDate(totalSimDays);
    simElapsed.textContent = '+ ' + Math.floor(totalSimDays).toLocaleString('es-MX') + ' DÍAS';
  }
  controls.enabled = solarInteractionActive && !portraits.visible && !handset();
  controls.enableZoom = solarInteractionActive && solarTouchLocked;
  galaxyControls.enabled = activeMode === 'galaxy' && !arrivalActive;
  galaxyControls.enableZoom = activeMode === 'galaxy' && !arrivalActive && galaxyTouchLocked;
  if (activeMode === 'galaxy') {
    solarSystem.visible = false;
    galaxyScene.visible = true;
    galaxyScene.position.set(0,0,0);
    galaxyScene.scale.setScalar(1);
    galaxySunMarker.scale.setScalar(1);
    galaxy.setTransition(0);
    galaxy.setOpacity(1);
    camera.up.copy(worldUp);
    // The galaxy keeps turning while the camera preserves the user's chosen view.
    if (!reducedMotion) galaxyScene.rotation.y += delta * (arrivalActive ? 0.014 : 0.022);
    if (arrivalActive) {
      renderArrival(frameDelta);
    } else if (!galaxyInteracted) {
      galaxyControls.target.copy(updateGalaxyHomeTarget());
      journeyDirection.copy(galaxyViewDirection);
      journeyDirection.x += easedPointerX * 0.018;
      journeyDirection.z += easedPointerY * 0.014;
      journeyDirection.normalize();
      camera.position.copy(journeyDirection).multiplyScalar(galaxyDefaultDistance()).add(galaxyControls.target);
      camera.lookAt(galaxyControls.target);
    }
    if (!arrivalActive && !mobileLaunch?.waiting) galaxyControls.update();
  } else if (activeMode === 'transition') {
    renderJourney(journeyProgress);
  } else {

    solarSystem.visible = true;
    solarSystem.scale.setScalar(1);
    scaleOverviewWorlds(overviewProfile(camera.aspect, handset(), window.innerHeight).planetScale);
    setPlanetTransitionOpacity(1);
    systemSun.material.uniforms.uOpacity.value = 1;
    systemSun.material.depthWrite = true;
    placeGalaxyAtSun(NEIGHBORHOOD_SCALE, 1);
    galaxyScene.visible = true;
    galaxy.setTransition(1);
    galaxy.setOpacity(1);
    starField.visible = true;
    planetObjects.forEach(object => {
      object.trajectory.visible = showOrbits;
      object.motionArc.visible = showOrbits;
      const selected = activeBody?.data.id === object.data.id;
      const hovered = lastHover === object.data.id;
      const ordinaryOrbitOpacity = object.data.id === 'mercury' ? 0.20 : handset() ? 0.17 : 0.11;
      const storyLineFade = THREE.MathUtils.lerp(1, 0.48, solarStoryCompositionProgress);
      object.trajectory.material.opacity = (selected ? 0.40 : hovered ? 0.32 : ordinaryOrbitOpacity) * storyLineFade;
      object.motionArc.material.opacity = (selected ? 1 : hovered ? 0.95 : 0.82) * storyLineFade;
      object.globalTrail.visible = showOrbits;
      object.globalTrail.material.opacity = (selected ? 0.3 : hovered ? 0.2 : 0.1)
        * THREE.MathUtils.lerp(1, 0.16, solarStoryCompositionProgress);
    });
    updateGlobalTrails();
    if (activeBody && followingSelection) {
      activeBody.mesh.getWorldPosition(focusBodyPosition);
      if (followSelectionDirection && activeBody.data.id !== 'sun') {
        sunObject.mesh.getWorldPosition(focusSunPosition);
        focusDirection.subVectors(focusSunPosition, focusBodyPosition)
          .addScaledVector(orbitCameraUp, 0.72)
          .normalize();
      }
      desiredTarget.copy(focusBodyPosition);
      const focusDistance = camera.userData.zoomTarget || defaultCameraDistance();
      const frameWidth = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * focusDistance * camera.aspect;
      if (focusTransitionProgress < 1 || followSelectionDirection) focusForward.copy(focusDirection).negate();
      else focusForward.copy(camera.position).sub(controls.target).normalize().negate();
      focusRight.crossVectors(focusForward, updateOverviewUp()).normalize();
      focusUp.crossVectors(focusRight, focusForward).normalize();
      if (window.innerWidth >= 700) desiredTarget.addScaledVector(focusRight, frameWidth * 0.13);
      if (window.innerWidth < 700 || window.innerHeight < 560) {
        const frameHeight = frameWidth / camera.aspect;
        desiredTarget.addScaledVector(focusUp, frameHeight * (selectionFrame.centerY - 0.5));
      }
    } else if (activeBody) {
      desiredTarget.copy(selectionAnchor);
    } else {
      desiredTarget.copy(solarSystem.getWorldPosition(new THREE.Vector3()));
      const overviewDistance = camera.userData.zoomTarget || defaultCameraDistance();
      const overviewFrameWidth = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * overviewDistance * camera.aspect;
      focusForward.copy(camera.position).sub(controls.target).normalize().negate();
      focusRight.crossVectors(focusForward, updateOverviewUp()).normalize();
      const profile = overviewProfile(camera.aspect, handset(), window.innerHeight);
      desiredTarget.addScaledVector(focusRight, overviewFrameWidth * (profile.horizontalShift + 0.15 * solarCompositionProgress - 0.22 * solarStoryCompositionProgress));
      const overviewFrameHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * overviewDistance;
      desiredTarget.addScaledVector(orbitCameraUp, -overviewFrameHeight * 0.15 * solarStoryCompositionProgress);
      focusUp.crossVectors(focusRight, focusForward).normalize();
      desiredTarget.addScaledVector(focusUp, overviewFrameHeight * profile.centerShift);
    }
    const destinationDistance = camera.userData.zoomTarget || defaultCameraDistance();
    if (activeBody && focusTransitionProgress < 1 && !cameraGestureActive) {
      focusTransitionProgress = Math.min(1, focusTransitionProgress + delta / (reducedMotion ? 0.01 : 0.85));
      const eased = focusTransitionProgress * focusTransitionProgress * (3 - 2 * focusTransitionProgress);
      focusEndCameraPosition.copy(desiredTarget).addScaledVector(focusDirection, destinationDistance);
      target.lerpVectors(focusStartCameraTarget, desiredTarget, eased);
      camera.position.lerpVectors(focusStartCameraPosition, focusEndCameraPosition, eased);
    } else {
      const targetBeforeFollow = controls.target.clone();
      if (cameraGestureActive) target.copy(controls.target);
      else if (activeBody) target.copy(cameraTargetWithPan.copy(desiredTarget).add(cameraPanOffset));
      else target.lerp(cameraTargetWithPan.copy(desiredTarget).add(cameraPanOffset), 1 - Math.exp(-delta * 6.5));
      camera.position.add(target.clone().sub(targetBeforeFollow));
      cameraOffset.copy(camera.position).sub(target);
      if (!cameraGestureActive && cameraOffset.lengthSq() > 0.0001) {
        const currentDistance = cameraOffset.length();
        const direction = cameraOffset.normalize();
        if (activeBody && followSelectionDirection) {
          direction.lerp(focusDirection, 1 - Math.exp(-delta * 3.2)).normalize();
        } else if (!activeBody && resettingOverview) {
          direction.lerp(defaultViewDirection, 1 - Math.exp(-delta * 4)).normalize();
          if (direction.dot(defaultViewDirection) > 0.9999) resettingOverview = false;
        }
        const nextDistance = THREE.MathUtils.damp(currentDistance, destinationDistance, activeBody ? 5.4 : 4.0, delta);
        camera.position.copy(target).addScaledVector(direction, nextDistance);
      }
    }
    controls.target.copy(target);
    camera.up.copy(updateOverviewUp());

    halo.material.opacity = 1;
    solarSystem.updateMatrixWorld(true);
    controls.update();
    updateLabels();
    updateFocusRing();
  }
  if (!solarInteractionActive) focusRing.hidden = true;
  sunLight.position.copy(systemSun.getWorldPosition(focusSunPosition));
  starField.position.copy(camera.position);
  starField.rotation.y = reducedMotion ? 0 : elapsedForMotion * 0.0009;
  starField.visible = true;
  if (activeMode === 'galaxy' || (activeMode === 'transition' && journeyProgress < 0.42)) {
    galaxyScene.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    galaxySunMarker.getWorldPosition(projectedGalaxyMarker).project(camera);
    const screenX = (projectedGalaxyMarker.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-projectedGalaxyMarker.y * 0.5 + 0.5) * window.innerHeight;
    const withinView = projectedGalaxyMarker.z >= -1 && projectedGalaxyMarker.z <= 1 && screenX >= 0 && screenX <= window.innerWidth && screenY >= 0 && screenY <= window.innerHeight;
    const width = galaxyMarkerCaption.offsetWidth;
    const height = galaxyMarkerCaption.offsetHeight;
    const titleBottom = document.querySelector('.journey-caption').getBoundingClientRect().bottom;
    const placement = markerPlacement(screenX, screenY, window.innerWidth, window.innerHeight, width, height,
      handset(), handset() && window.innerHeight > window.innerWidth ? titleBottom + 12 : 90);
    const captionX = placement.left, captionY = placement.top;
    galaxyMarkerCaption.style.left = captionX + 'px';
    galaxyMarkerCaption.style.top = captionY + 'px';
    galaxyMarkerCaption.style.visibility = withinView ? 'visible' : 'hidden';
    const markerOpacity = withinView ? String(1 - THREE.MathUtils.smoothstep(journeyProgress,0.24,0.42)) : '0';
    galaxyMarkerCaption.style.opacity = markerOpacity;
    galaxyMarkerLink.style.opacity = markerOpacity;
    galaxyMarkerLink.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
    galaxyMarkerLine.setAttribute('x1', screenX); galaxyMarkerLine.setAttribute('y1', screenY);
    galaxyMarkerLine.setAttribute('x2', Math.max(captionX, Math.min(screenX, captionX + width)));
    galaxyMarkerLine.setAttribute('y2', captionY + height / 2);
    galaxyMarkerCircles.forEach(circle => {
      circle.setAttribute('cx', screenX); circle.setAttribute('cy', screenY);
    });
  } else {
    galaxyMarkerCaption.style.visibility = 'hidden';
    galaxyMarkerCaption.style.opacity = '0';
    galaxyMarkerLink.style.opacity = '0';
  }
  portraits.update(frameDelta, { enabled: solarInteractionActive, running,
    interactive: true });
  // Once the portrait covers the frame there is no need to draw the galaxy.
  if (portraits.opaque) renderer.clear();
  else renderer.render(scene,camera);
  portraits.render();
}

async function prepareArrival() {
  updateRendererResolution();
  solarSystem.visible = false;
  galaxyScene.visible = true;
  galaxy.setTransition(0);
  galaxy.setOpacity(1);
  renderArrival(0);
  starField.position.copy(camera.position);
  galaxy.update(0, elapsedForMotion, camera);
  // Include the travelling stars in compilation and actual draws before entry.
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera);
  await new Promise(requestAnimationFrame);
  renderer.render(scene, camera);
  await new Promise(requestAnimationFrame);
  stellarPassage.setFlight(0, 0, renderer.getPixelRatio(), camera.aspect);
  clock.getDelta();
  document.body.dataset.arrivalPrepared = 'true';
  mobileLaunch.markReady();
}

function queuePortraitPreload() {
  clearTimeout(portraitPreloadTimer);
  if (portraitPreloadBusy) return;
  portraitPreloadTimer = setTimeout(async () => {
    if (arrivalActive || mobileLaunch.covering || mobileLaunch.playing || activeMode === 'transition' ||
      requestedBody || document.hidden) {
      queuePortraitPreload(); return;
    }
    // Keep the next swipe and the way back ready, rather than three unrelated worlds.
    const index = activeBody ? celestialBodies.indexOf(activeBody) : -1;
    const direction = portraitDirection || 1;
    const candidates = index < 0
      ? ['earth', 'mars', 'venus'].map(id => celestialBodies.find(body => body.data.id === id))
      : [direction, -direction].map(step => celestialBodies[(index + step + celestialBodies.length) % celestialBodies.length]);
    const next = candidates.find(body => !portraits.isPrepared(body.data.id) && !failedPortraitPreloads.has(body.data.id));
    if (!next) return;
    portraitPreloadBusy = true;
    try {
      const [result] = await portraits.preload([next], candidates.map(body => body.data.id));
      if (result.status === 'rejected') failedPortraitPreloads.add(next.data.id);
    }
    finally { portraitPreloadBusy = false; }
    queuePortraitPreload();
  }, 250);
}

camera.userData.zoomTarget = defaultCameraDistance();
setPanel(null);
updateSelectionUi();
if (reducedMotion) togglePlay();
camera.up.copy(worldUp);
galaxyControls.target.copy(updateGalaxyHomeTarget());
camera.position.copy(galaxyViewDirection).multiplyScalar(galaxyDefaultDistance()).add(galaxyControls.target);
journeyEntryTarget.copy(galaxyControls.target);
camera.lookAt(galaxyControls.target);
galaxyControls.saveState();
journeyEntryDistance = galaxyDefaultDistance();
journeyProgress = journeyTargetProgress;
animate();
void prepareArrival();

const resizeObserver = new ResizeObserver(() => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  setCanvasTouchAction();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = window.innerWidth < 700 ? 48 : 43;
  camera.updateProjectionMatrix();
  camera.userData.zoomTarget = activeBody
    ? focusDistance(activeBody.data, camera.aspect, camera.fov, window.innerWidth < 700 || window.innerHeight < 560)
    : defaultCameraDistance();
  updateSelectionUi();
  frameSelection();
  updateRailIndicator();
  updateRendererResolution();
  galaxy.setQuality(window.innerWidth < 800 ? 'low' : 'high', renderer.getPixelRatio());
  updateSceneMode();
});
resizeObserver.observe(document.body);
const overlayResizeObserver = new ResizeObserver(() => {
  const dockHeight = Math.ceil(simulationUi.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--dock-height', `${dockHeight}px`);
  frameSelection();
});
overlayResizeObserver.observe(simulationUi);
overlayResizeObserver.observe(planetPanelElement);
overlayResizeObserver.observe(document.querySelector('.exploration-context'));

function cancelNavigation() {
  if (navigationFrame) cancelAnimationFrame(navigationFrame);
  navigationFrame = 0;
}
function navigateToStage(destination) {
  cancelNavigation();
  const start = window.scrollY, span = destination - start;
  if (reducedMotion || Math.abs(span) < 2) { window.scrollTo({ top: destination, behavior: 'instant' }); return; }
  const duration = Math.max(850, Math.min(3400, Math.abs(span) / scrollRange() * 3400));
  const started = performance.now();
  const tick = now => {
    const progress = Math.min(1, (now - started) / duration);
    window.scrollTo({ top: start + span * easeBetween(progress, 0, 1), behavior: 'instant' });
    navigationFrame = progress < 1 ? requestAnimationFrame(tick) : 0;
  };
  navigationFrame = requestAnimationFrame(tick);
}
window.addEventListener('wheel', cancelNavigation, { passive: true });
window.addEventListener('touchstart', cancelNavigation, { passive: true });
window.addEventListener('pointerdown', cancelNavigation, { passive: true });
window.addEventListener('resize', cancelNavigation, { passive: true });
window.addEventListener('keydown', event => {
  if (['Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) cancelNavigation();
});
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click',event => {
    const destination = link.getAttribute('href') === '#explorar' ? scrollRange() : 0;
    event.preventDefault();
    if (arrivalActive) finishArrival();
    if (galaxyTouchLocked) setGalaxyTouchLock(false);
    if (solarTouchLocked) setSolarTouchLock(false);
    window.history.replaceState(null, '', link.getAttribute('href'));
    navigateToStage(destination);
  });
});
