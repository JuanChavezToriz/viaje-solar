import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { portraitFrame, portraitFov, portraitProfiles, portraitPose, portraitTexturePath, isHandset } from './portrait-layout.js';
import { attachPortraitTouch, attachPlanetManipulation } from './portrait-touch.js';
import { assetUrl } from './asset-url.js';

// A second scene, composited by the existing renderer. The atlas keeps its own
// positions and camera; a portrait never rescales a planet in the simulation.
export function createPlanetPortraits(renderer, canvas, {
  reducedMotion = false, onDisplay = () => {}, onStatus = () => {}, onInteract = () => {}, onScroll = () => {},
  onSwipe = () => {}, onDrag = () => {},
} = {}) {
  const scene = new THREE.Scene();
  scene.name = 'Planet portraits';
  scene.background = new THREE.Color(0x020304);
  const camera = new THREE.PerspectiveCamera(28, window.innerWidth / window.innerHeight, .05, 60);
  camera.position.set(0, 0, 8);
  const controls = new OrbitControls(camera, canvas);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = .065;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.rotateSpeed = .42;
  controls.minDistance = 4.2;
  controls.maxDistance = 18;
  const loader = new THREE.TextureLoader();
  const geometry = new THREE.SphereGeometry(1, 128, 96);
  const compactMaps = Boolean(globalThis.navigator?.connection?.saveData ||
    globalThis.navigator?.deviceMemory && globalThis.navigator.deviceMemory <= 2 ||
    renderer.capabilities.maxTextureSize && renderer.capabilities.maxTextureSize < 4096);
  const rigs = new Map();
  const preparations = new Map();
  const maps = new Map();
  let preferredIds = new Set();
  const lightDirection = new THREE.Vector3(-3.6, 4.2, 4).normalize();
  scene.add(new THREE.AmbientLight(0xa8b8cf, .055));
  const key = new THREE.DirectionalLight(0xfff2e2, 2.7);
  key.position.copy(lightDirection).multiplyScalar(9);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: .1, far: 20 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -.0005;
  key.shadow.normalBias = .012;
  scene.add(key, key.target);

  const backdropScene = new THREE.Scene();
  const backdropCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  // Fade the complete rendered image, never the individual globe/ring materials.
  // That keeps depth and shadows correct during a transition.
  const targetType = renderer.extensions?.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const portraitTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: targetType, samples: Math.min(isHandset(window.innerWidth, window.innerHeight) ? 2 : 4, renderer.capabilities.maxSamples || 0),
  });
  const warmTarget = new THREE.WebGLRenderTarget(64, 64, { type: targetType });
  const backdropMaterial = new THREE.ShaderMaterial({
    uniforms: { uImage: { value: portraitTarget.texture }, uOpacity: { value: 0 }, uDim: { value: 1 }, uShift: { value: 0 } },
    transparent: true, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D uImage;
      uniform float uOpacity;
      uniform float uDim;
      uniform float uShift;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv - vec2(uShift, 0.0);
        vec3 image = uv.x < 0.0 || uv.x > 1.0 ? vec3(0.0) : texture2D(uImage, uv).rgb;
        gl_FragColor = vec4(image * uDim, uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  backdropScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), backdropMaterial));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  let displayed = null;
  let requested = null;
  let incoming = null;
  let requestVersion = 0;
  let phase = 'idle';
  let cover = 0;
  let weight = 0;
  let zoom = 8;
  let frame = portraitFrame('earth', window.innerWidth, window.innerHeight);
  let warmQueue = Promise.resolve();
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let transitionDirection = 1;
  let drag = 0;
  let dragTarget = 0;
  let useOrder = 0;

  function pruneCache() {
    if (!isHandset(window.innerWidth, window.innerHeight)) return;
    const candidates = [...rigs.values()].filter(rig => rig.ready && rig !== displayed && rig !== incoming && rig.id !== requested)
      .sort((a, b) => Number(preferredIds.has(a.id)) - Number(preferredIds.has(b.id)) || a.lastUsed - b.lastUsed);
    while (rigs.size > 3 && candidates.length) {
      const rig = candidates.shift();
      scene.remove(rig.root);
      rigs.delete(rig.id);
      preparations.delete(rig.id);
      const materials = new Set(), textures = new Set();
      rig.root.traverse(node => {
        if (node.geometry && node.geometry !== geometry) node.geometry.dispose();
        if (node.material) materials.add(node.material);
        if (node.customDepthMaterial) materials.add(node.customDepthMaterial);
      });
      for (const material of materials) {
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        material.dispose();
      }
      for (const texture of textures) texture.dispose();
      for (const path of rig.paths) maps.delete(path);
    }
  }

  function loadMap(path, color = true) {
    if (maps.has(path)) return maps.get(path);
    const promise = new Promise((resolve, reject) => loader.load(assetUrl(path), async texture => {
      try {
        if (color) texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        if (texture.image?.decode) await texture.image.decode();
        renderer.initTexture?.(texture);
        resolve(texture);
      } catch (error) { reject(error); }
    }, undefined, reject));
    maps.set(path, promise);
    promise.catch(() => maps.delete(path));
    return promise;
  }

  function renderInto(target) {
    const previousTarget = renderer.getRenderTarget();
    const autoClear = renderer.autoClear;
    try {
      renderer.setRenderTarget(target);
      renderer.autoClear = true;
      renderer.render(scene, camera);
    } finally {
      renderer.setRenderTarget(previousTarget);
      renderer.autoClear = autoClear;
    }
  }

  function atmosphere(color, strength) {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uLight: { value: lightDirection },
        uOpacity: { value: 1 },
        uStrength: { value: strength },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldPosition = world.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uLight;
        uniform float uOpacity;
        uniform float uStrength;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        void main() {
          vec3 normal = normalize(vWorldNormal);
          vec3 view = normalize(cameraPosition - vWorldPosition);
          float rim = pow(1.0 - max(dot(normal, view), 0.0), 3.6);
          float day = smoothstep(-0.22, 0.55, dot(normal, uLight));
          gl_FragColor = vec4(uColor, rim * day * uStrength * uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    const shell = new THREE.Mesh(geometry, material);
    shell.scale.setScalar(1.009);
    shell.renderOrder = 3;
    return shell;
  }

  async function makeRig(body) {
    const id = body.data.id;
    const profile = portraitProfiles[id];
    const root = new THREE.Group();
    root.name = `portrait-${id}`;
    const pose = portraitPose(id, window.innerWidth, window.innerHeight);
    root.rotation.set(pose.pitch, 0, pose.roll);
    root.visible = false;
    const texturePaths = [portraitTexturePath(id, compactMaps),
      ...(id === 'earth' ? ['/assets/earth/nightmap.jpg', '/assets/earth/clouds.jpg'] : []),
      ...(id === 'saturn' ? ['/textures/portraits/saturn-rings.png'] : [])];
    const textures = await Promise.all(texturePaths.map(path => loadMap(path, !path.endsWith('/clouds.jpg'))));
    let surface;
    if (id === 'sun') {
      surface = new THREE.MeshBasicMaterial({ map: textures[0], color: new THREE.Color(1.6, 1.6, 1.6) });
    } else {
      const rocky = ['mars', 'mercury'].includes(id);
      surface = new THREE.MeshStandardMaterial({
        map: textures[0], roughness: id === 'earth' ? .78 : .96,
        metalness: 0,
        bumpMap: rocky ? textures[0] : null,
        bumpScale: id === 'mercury' ? .009 : .005,
      });
      if (id === 'earth') {
        surface.emissiveMap = textures[1];
        surface.emissive.set(0xffcf9b);
        surface.emissiveIntensity = .65;
        surface.onBeforeCompile = shader => {
          shader.uniforms.portraitSunDirection = { value: lightDirection };
          shader.fragmentShader = 'uniform vec3 portraitSunDirection;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
            #include <emissivemap_fragment>
            vec3 portraitLight = normalize((viewMatrix * vec4(portraitSunDirection, 0.0)).xyz);
            totalEmissiveRadiance *= 1.0 - smoothstep(-0.12, 0.18, dot(normal, portraitLight));
          `);
        };
        surface.customProgramCacheKey = () => 'portrait-earth-night-v1';
      }
    }
    const globe = new THREE.Mesh(geometry, surface);
    globe.rotation.y = profile.phase;
    globe.castShadow = id === 'saturn';
    globe.receiveShadow = id === 'saturn';
    root.add(globe);

    let clouds = null;
    if (id === 'earth') {
      const cloudMap = textures[2];
      const cloudMaterial = new THREE.MeshStandardMaterial({
        map: cloudMap, alphaMap: cloudMap, color: 0xffffff,
        transparent: true, opacity: .88, depthWrite: false, roughness: 1,
      });
      clouds = new THREE.Mesh(geometry, cloudMaterial);
      clouds.scale.setScalar(1.009);
      clouds.rotation.y = profile.phase;
      clouds.renderOrder = 2;
      root.add(clouds);
    }
    if (id === 'saturn') {
      const ringMaterial = new THREE.MeshStandardMaterial({
        map: textures[1], color: 0xfff1d9,
        side: THREE.DoubleSide, transparent: true, opacity: 1,
        alphaTest: .025, depthWrite: false, roughness: 1,
      });
      const ringGeometry = new THREE.RingGeometry(1.12, 2.42, 512, 8);
      const position = ringGeometry.attributes.position;
      const uv = ringGeometry.attributes.uv;
      // The source is a radial strip, rather than the atlas's square ring map.
      for (let index = 0; index < position.count; index++) {
        const radius = Math.hypot(position.getX(index), position.getY(index));
        uv.setXY(index, THREE.MathUtils.clamp((radius - 1.12) / 1.30, 0, 1), .5);
      }
      const rings = new THREE.Mesh(ringGeometry, ringMaterial);
      rings.rotation.x = Math.PI / 2;
      rings.castShadow = true;
      rings.receiveShadow = true;
      rings.customDepthMaterial = new THREE.MeshDepthMaterial({
        map: ringMaterial.map, alphaTest: .12, side: THREE.DoubleSide, depthPacking: THREE.RGBADepthPacking,
      });
      root.add(rings);
    }
    const atmospheres = {
      earth: ['#70acff', .72], mars: ['#c9b6a1', .25], venus: ['#edd2a1', .28],
      jupiter: ['#d7c2ad', .14], saturn: ['#ddcaa5', .12],
      uranus: ['#a1e1e4', .42], neptune: ['#7dafff', .46],
    };
    let shell = null;
    if (atmospheres[id]) { shell = atmosphere(...atmospheres[id]); root.add(shell); }
    scene.add(root);
    const rig = { root, globe, surface, clouds, shell, id, paths: texturePaths, ready: false, lastUsed: ++useOrder };
    rigs.set(id, rig);
    warmQueue = warmQueue.catch(() => {}).then(async () => {
      await renderer.compileAsync?.(root, camera, scene);
      // A small offscreen draw prepares geometry and light programs.
      const visible = [...rigs.values()].map(item => [item, item.root.visible]);
      try {
        for (const item of rigs.values()) item.root.visible = item === rig;
        scene.updateMatrixWorld(true);
        renderInto(warmTarget);
      } finally {
        for (const [item, wasVisible] of visible) item.root.visible = wasVisible;
      }
    });
    await warmQueue;
    rig.ready = true;
    pruneCache();
    return rig;
  }

  function prepare(body) {
    if (preparations.has(body.data.id)) {
      const rig = rigs.get(body.data.id);
      if (rig) rig.lastUsed = ++useOrder;
      return preparations.get(body.data.id);
    }
    // Downloads may overlap; GPU preparation stays serialized.
    const preparation = makeRig(body);
    preparations.set(body.data.id, preparation);
    preparation.catch(() => {
      preparations.delete(body.data.id);
      const rig = rigs.get(body.data.id);
      if (rig) scene.remove(rig.root);
      rigs.delete(body.data.id);
    });
    return preparation;
  }

  function activate(rig) {
    displayed = rig;
    incoming = null;
    for (const item of rigs.values()) item.root.visible = item === rig;
    frame = portraitFrame(rig.id, window.innerWidth, window.innerHeight);
    const pose = portraitPose(rig.id, window.innerWidth, window.innerHeight);
    rig.root.rotation.set(pose.pitch, 0, pose.roll);
    zoom = 8;
    camera.position.set(0, 0, isHandset(window.innerWidth, window.innerHeight) && !reducedMotion ? 9.6 : 8);
    camera.up.set(0, 1, 0);
    controls.target.set(0, 0, 0);
    controls.update();
    controls.saveState();
    rig.lastUsed = ++useOrder;
    pruneCache();
    onDisplay(rig.id);
  }

  async function select(body, direction = 0) {
    const version = ++requestVersion;
    requested = body.data.id;
    const ids = Object.keys(portraitProfiles);
    transitionDirection = direction || Math.sign(ids.indexOf(requested) - ids.indexOf(displayed?.id)) || 1;
    incoming = null;
    const prepared = rigs.get(requested);
    phase = prepared?.ready ? 'changing' : 'loading';
    onStatus(phase, requested);
    try {
      const rig = prepared?.ready ? prepared : await prepare(body);
      if (version !== requestVersion) return false;
      if (!displayed) {
        activate(rig);
        phase = 'entering';
      } else if (displayed === rig) {
        zoom = 8;
        onDisplay(rig.id);
        phase = 'ready';
        onStatus('ready', rig.id);
      } else {
        incoming = rig;
        phase = 'closing';
        onStatus('changing', rig.id);
      }
      return true;
    } catch {
      if (version !== requestVersion) return false;
      requested = displayed?.id || null;
      phase = displayed ? 'ready' : 'idle';
      onStatus('error', body.data.id);
      return false;
    }
  }

  function update(delta, { enabled, running, interactive }) {
    const step = reducedMotion ? 1 : 1 - Math.exp(-delta * 5.5);
    const showing = Boolean(requested && displayed) && enabled;
    weight = THREE.MathUtils.lerp(weight, showing ? 1 : 0, step);
    if (Math.abs(weight - (showing ? 1 : 0)) < .001) weight = showing ? 1 : 0;
    const handset = isHandset(window.innerWidth, window.innerHeight);
    controls.enabled = showing && interactive && !handset;
    drag = THREE.MathUtils.damp(drag, dragTarget, 15, delta);
    if (weight === 0) {
      if (!requested) displayed = null;
      return;
    }
    if (phase === 'closing') {
      cover = reducedMotion ? 1 : Math.min(1, cover + delta / .12);
      if (cover === 1 && incoming) {
        activate(incoming);
        if (reducedMotion) cover = 0;
        phase = 'opening';
      }
    } else {
      cover = reducedMotion ? 0 : Math.max(0, cover - delta / .28);
    }
    if (phase === 'opening' && cover === 0 || phase === 'entering' && weight === 1) {
      phase = 'ready';
      onStatus('ready', displayed.id);
    }
    if (displayed) {
      const destination = portraitFrame(displayed.id, window.innerWidth, window.innerHeight);
      if (handset) {
        const out = THREE.MathUtils.clamp((zoom - 8) / 16, 0, 1);
        destination.x = THREE.MathUtils.lerp(destination.x, .5, out);
        destination.y = THREE.MathUtils.lerp(destination.y, .34, out);
      }
      for (const property of ['x', 'y', 'radius']) frame[property] = THREE.MathUtils.lerp(frame[property], destination[property], step);
      if (isHandset(viewportWidth, viewportHeight) !== handset) {
        const pose = portraitPose(displayed.id, window.innerWidth, window.innerHeight);
        displayed.root.rotation.set(pose.pitch, 0, pose.roll);
      }
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
    }
    const distance = camera.position.length();
    camera.position.multiplyScalar(THREE.MathUtils.damp(distance, zoom, handset ? 3 : 5, delta) / distance);
    controls.update();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = portraitFov(frame.radius);
    camera.setViewOffset(window.innerWidth, window.innerHeight,
      (.5 - frame.x) * window.innerWidth, (.5 - frame.y) * window.innerHeight,
      window.innerWidth, window.innerHeight);
    camera.updateProjectionMatrix();

    for (const rig of rigs.values()) {
      rig.root.visible = rig === displayed;
      if (!rig.root.visible) continue;
      rig.root.scale.setScalar(1 - cover * .025);
      if (running && !reducedMotion) {
        const motionDelta = Math.min(delta, .05);
        const spin = ['venus', 'uranus'].includes(rig.id) ? -.025 : .035;
        rig.globe.rotation.y += motionDelta * spin;
        if (rig.clouds) rig.clouds.rotation.y += motionDelta * .043;
        if (rig.surface.uniforms?.uTime) rig.surface.uniforms.uTime.value += motionDelta;
      }
    }
  }

  function render() {
    if (weight === 0) return;
    const handset = isHandset(window.innerWidth, window.innerHeight);
    const ratio = Math.min(renderer.getPixelRatio(), handset ? 2 : 1.75);
    const width = Math.round(window.innerWidth * ratio), height = Math.round(window.innerHeight * ratio);
    if (portraitTarget.width !== width || portraitTarget.height !== height) portraitTarget.setSize(width, height);
    renderInto(portraitTarget);
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    backdropMaterial.uniforms.uOpacity.value = weight;
    backdropMaterial.uniforms.uDim.value = 1 - cover;
    backdropMaterial.uniforms.uShift.value = handset && !reducedMotion
      ? (phase === 'closing' ? -1 : 1) * transitionDirection * cover * .16 + drag * .18 : 0;
    renderer.clearDepth();
    renderer.render(backdropScene, backdropCamera);
    renderer.autoClear = autoClear;
  }

  attachPortraitTouch(canvas.ownerDocument?.body || canvas, {
    enabled: () => isHandset(window.innerWidth, window.innerHeight) && displayed && weight > .9,
    onSwipe,
    onDrag: fraction => { dragTarget = fraction; onDrag(fraction); },
    onInteract,
    onScroll,
  });

  const gestureSurface = canvas.ownerDocument?.querySelector('#planet-gesture-surface');
  function adjustZoom(factor) {
    const handset = isHandset(window.innerWidth, window.innerHeight);
    zoom = THREE.MathUtils.clamp(zoom * factor, handset ? 5.8 : controls.minDistance, handset ? 26 : controls.maxDistance);
    onInteract();
  }
  if (gestureSurface) attachPlanetManipulation(gestureSurface, {
    enabled: () => isHandset(window.innerWidth, window.innerHeight) && displayed && weight > .9 && phase === 'ready',
    rotate: (yaw, pitch) => {
      const pose = portraitPose(displayed.id, window.innerWidth, window.innerHeight);
      displayed.root.rotation.y += yaw;
      displayed.root.rotation.x = THREE.MathUtils.clamp(displayed.root.rotation.x + pitch, pose.pitch - .6, pose.pitch + .6);
    },
    zoom: adjustZoom,
    onInteract,
  });

  return {
    select, update, render,
    isPrepared(id) { return Boolean(rigs.get(id)?.ready); },
    preload(bodies, neighbors = []) {
      preferredIds = new Set(neighbors);
      return Promise.allSettled(bodies.map(prepare));
    },
    clear() {
      ++requestVersion;
      requested = incoming = null;
      dragTarget = 0;
      phase = 'idle';
      controls.enabled = false;
      onStatus('idle');
    },
    adjustZoom,
    turn(amount) { if (displayed) displayed.root.rotation.y += amount; onInteract(); },
    resetView() {
      zoom = 8;
      controls.reset();
      if (displayed) { const pose = portraitPose(displayed.id, window.innerWidth, window.innerHeight); displayed.root.rotation.set(pose.pitch, 0, pose.roll); }
    },
    get visible() { return weight > .001 || Boolean(requested); },
    get opaque() { return weight === 1; },
  };
}
