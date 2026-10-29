import { BAR_ANGLE, spiralAngle, secondarySpiralAngle, createGalacticLight } from './galaxy-field.js';

/**
 * A deterministic stellar volume. No galaxy photograph or image sampler.
 * Stars retain their physical positions while the camera enters the disk.
 */
export function createGalaxy(THREE, { reducedMotion = false } = {}) {
  const group = new THREE.Group();
  group.name = 'Vía Láctea · partículas procedurales';
  let seed = 0x736f6c61;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(1e-8, random()))) * Math.cos(random() * Math.PI * 2);
  const clamp = THREE.MathUtils.clamp;
  const linear = n => n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);

  // Uneven stellar nurseries interrupt two broad arms; short spurs fill the disk.
  const nurseries = Array.from({ length: 34 }, (_, i) => {
    const radius = 3.2 + random() * 15.7;
    const angle = spiralAngle(radius, i % 2) + normal() * 0.025;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, width: 0.23 + random() * 0.40 };
  });
  function stellarPosition(resolved) {
    const population = random();
    let x, y, z, warm = false, cluster = false, bulge = false, dim = 1;
    if (population < 0.20) {
      // A warm, thick bulge and a short tilted bar, rather than a bright disk.
      const bar = random() < 0.55;
      const u = normal() * (bar ? 2.55 : 1.42);
      const v = normal() * (bar ? 0.72 : 1.25);
      x = u * Math.cos(BAR_ANGLE) - v * Math.sin(BAR_ANGLE);
      z = u * Math.sin(BAR_ANGLE) + v * Math.cos(BAR_ANGLE);
      y = normal() * 0.52;
      warm = true;
      bulge = true;
    } else if (population < (resolved ? 0.32 : 0.58)) {
      let radius;
      do { radius = -3.4 * Math.log(Math.max(1e-8, random() * random())); } while (radius > 22);
      const angle = random() * Math.PI * 2;
      x = Math.cos(angle) * radius; z = Math.sin(angle) * radius;
      y = normal() * (0.12 + 0.30 * Math.exp(-radius / 5));
      warm = random() < 0.30;
      dim = 0.58;
    } else if (random() < (resolved ? 0.25 : 0.14)) {
      const nursery = nurseries[Math.floor(random() * nurseries.length)];
      x = nursery.x + normal() * nursery.width;
      z = nursery.z + normal() * nursery.width;
      y = normal() * 0.16;
      cluster = true;
    } else {
      const radius = 2.0 + Math.pow(random(), 0.82) * 19.3;
      const arm = random() < 0.57 ? 0 : 1;
      const spur = random() < 0.16 && radius > 6 && radius < 15;
      const angle = spiralAngle(radius, arm) + normal() * (0.10 + 0.45 / radius)
        + (spur ? 0.42 + 0.18 * Math.sin(radius) : 0);
      x = Math.cos(angle) * radius; z = Math.sin(angle) * radius;
      y = normal() * (0.16 + radius * 0.011);
      warm = random() < 0.14;
      // Broken concentrations and dim lanes keep the arms from becoming ribbons.
      dim = 0.62 + 0.38 * Math.pow(0.5 + 0.5 * Math.sin(radius * 1.25 + arm * 3.3), 2);
    }
    dim *= 1 - THREE.MathUtils.smoothstep(Math.hypot(x, z), 18.2, 23.0);
    return { x, y, z, warm, cluster, bulge, dim };
  }

  function coreAppearance(star) {
    const radius = Math.hypot(star.x, star.z);
    const whiteCore = Math.exp(-radius * radius / 2.8 - star.y * star.y / 1.44);
    // A positional hash varies stellar colors without changing the galaxy's seed.
    const colorHash = Math.abs(Math.sin(star.x * 127.1 + star.y * 311.7 + star.z * 74.7) * 43758.5453) % 1;
    const palette = colorHash < 0.45 ? [1, 0.94, 0.86]
      : colorHash < 0.73 ? [0.68, 0.83, 1]
      : colorHash < 0.93 ? [1, 0.85, 0.66]
      : [0.96, 0.64, 0.49];
    const nucleus = [1, 0.79, 0.49];
    const tint = palette.map((channel, i) => THREE.MathUtils.lerp(channel, nucleus[i], whiteCore * 0.72));

    // Two subtle, curved dim lanes leave the compact nucleus clear.
    const alongBar = (star.x - star.z) * 0.7071;
    const acrossBar = (star.x + star.z) * 0.7071;
    const laneDistance = Math.abs(Math.abs(acrossBar - 0.28 * Math.sin(alongBar * 0.85)) - 0.46);
    const lane = Math.exp(-laneDistance * laneDistance / 0.028)
      * THREE.MathUtils.smoothstep(radius, 0.75, 1.55)
      * (1 - THREE.MathUtils.smoothstep(radius, 3.1, 4.8));
    const depth = 0.90 + 0.10 * clamp((star.y + 0.7) / 1.4, 0, 1);
    return {
      tint,
      light: (0.57 - whiteCore * 0.21 - lane * 0.22) * depth,
      size: 0.88 - whiteCore * 0.12,
      glow: 0.08 + whiteCore * 0.12
    };
  }

  function secondaryPosition(resolved) {
    const arm = random() < 0.52 ? 0 : 1;
    const clustered = random() < (resolved ? 0.38 : 0.13);
    let x, z, radius;
    if (clustered) {
      const nursery = secondaryNurseries[arm][Math.floor(random() * secondaryNurseries[arm].length)];
      x = nursery.x + normal() * nursery.width;
      z = nursery.z + normal() * nursery.width;
      radius = Math.hypot(x, z);
    } else {
      radius = 2.7 + Math.pow(random(), 0.86) * (arm === 0 ? 18.9 : 17.6);
      const angle = secondarySpiralAngle(radius, arm) + normal() * (0.10 + 0.38 / radius);
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
    }
    const innerFade = THREE.MathUtils.smoothstep(radius, 2.2, 4.4);
    const outerFade = 1 - THREE.MathUtils.smoothstep(radius, 18.5, 22);
    const patches = 0.60 + 0.22 * Math.pow(0.5 + 0.5 * Math.sin(radius * 1.35 + arm * 2.4), 2);
    return {
      x, z, y: normal() * (0.11 + radius * 0.006),
      warm: random() < 0.12,
      dim: patches * innerFade * outerFade
    };
  }

  function interarmPosition() {
    const radius = 3.4 + Math.sqrt(random()) * 17.3;
    const arm = random() < 0.5 ? 0 : 1;
    const branch = random() < 0.5 ? 0.58 : 2.16;
    const angle = spiralAngle(radius, arm) + branch
      + 0.18 * Math.sin(radius * 0.55 + branch) + normal() * 0.21;
    return {
      x: Math.cos(angle) * radius, z: Math.sin(angle) * radius,
      y: normal() * (0.18 + radius * 0.014), warm: random() < 0.20,
      dim: (0.40 + random() * 0.24) * (1 - THREE.MathUtils.smoothstep(radius, 17.2, 22))
    };
  }

  const uniforms = {
    uOpacity: { value: 1 },
    uBreak: { value: 0 },
    uIntro: { value: 1 },
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uAspect: { value: 1 },
    uTanHalfFov: { value: Math.tan(43 * Math.PI / 360) }
  };
  const starMaterial = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `
      attribute vec3 color;
      attribute vec4 aStyle;
      attribute float aPhase;
      uniform float uTime;
      uniform float uIntro;
      uniform float uBreak;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vOpacity;
      varying float vGlow;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        float scale = sqrt(length(modelMatrix[0].xyz));
        float twinkle = 0.93 + 0.07 * sin(uTime * (0.55 + aPhase * 0.6) + aPhase * 83.0);
        vColor = color;
        vGlow = aStyle.z;
        vOpacity = aStyle.y * twinkle * uIntro
          * mix(1.0, smoothstep(0.10, 0.38, uBreak), aStyle.w)
          * smoothstep(0.02 * scale, 0.22 * scale, -viewPosition.z);
        float requestedSize = aStyle.x * (64.0 * scale / max(0.5, -viewPosition.z)) * uPixelRatio;
        gl_PointSize = clamp(requestedSize, 1.7 * uPixelRatio, 12.0 * uPixelRatio);
        // Integrate tiny stars over several pixels without increasing their energy.
        vOpacity *= min(1.0, pow(requestedSize / gl_PointSize, 2.0));
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vOpacity;
      varying float vGlow;
      void main() {
        float radius = length(gl_PointCoord - vec2(0.5)) * 2.0;
        float core = exp(-6.0 * radius * radius);
        float halo = exp(-2.5 * radius * radius) * vGlow * 0.36;
        vec2 offset = abs(gl_PointCoord - vec2(0.5)) * 2.0;
        float rays = (exp(-offset.x * 28.0 - offset.y * 4.0)
          + exp(-offset.y * 28.0 - offset.x * 4.0)) * max(0.0, vGlow - 1.0) * 0.22;
        float edgeWidth = max(fwidth(radius) * 0.5, 0.015);
        float alpha = min(0.82, (core + halo + rays) * vOpacity * uOpacity)
          * (1.0 - smoothstep(0.82 - edgeWidth, 1.0 + edgeWidth, radius));
        gl_FragColor = vec4(vColor, alpha);
        #include <colorspace_fragment>
      }
    `
  });
  const galacticLight = createGalacticLight(THREE, uniforms);
  group.add(galacticLight.mesh, galacticLight.bulge);
  const clouds = [];
  function makeCloud(name, count, resolved, placeStar = stellarPosition) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const styles = new Float32Array(count * 4);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const star = placeStar(resolved);
      positions.set([star.x, star.y, star.z], i * 3);
      const gold = star.warm || (resolved && random() < 0.18);
      const tint = gold ? [1, 0.69 + random() * 0.19, 0.42 + random() * 0.25]
        : [0.48 + random() * 0.32, 0.67 + random() * 0.22, 1];
      const core = star.bulge ? coreAppearance(star) : null;
      colors.set((core ? core.tint : tint).map(linear), i * 3);
      const beacon = resolved && random() < 0.065;
      const size = star.sparkle ? 7.0 + random() * 2.0 : resolved ? (beacon ? 4.5 + random() * 1.8 : 1.8 + random() * 1.8)
        : 0.90 + Math.pow(random(), 2) * 1.25;
      const opacity = (resolved ? 0.58 + random() * 0.26 : 0.25 + random() * 0.38) * star.dim;
      const glow = star.sparkle ? 1.65 : resolved ? (beacon ? 0.95 : 0.40) : 0.06;
      styles.set([
        size * (core ? core.size : 1),
        opacity * (core ? core.light : 1),
        core ? Math.max(glow, core.glow) : glow,
        star.local ? 1 : 0
      ], i * 4);
      phases[i] = random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aStyle', new THREE.BufferAttribute(styles, 4));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.computeBoundingSphere();
    const points = new THREE.Points(geometry, starMaterial);
    points.name = name;
    points.frustumCulled = false;
    points.renderOrder = 1;
    group.add(points); clouds.push({ geometry, count });
  }
  makeCloud('Disco, brazos y bulbo · estrellas finas', 112000, false);
  makeCloud('Cúmulos azules y estrellas doradas', 4800, true);

  // Two lighter, offset arms complement the original stars without moving them.
  const secondaryNurseries = [0, 1].map(arm => Array.from({ length: 7 }, () => {
    const radius = 5.5 + random() * 12.0;
    const angle = secondarySpiralAngle(radius, arm) + normal() * 0.025;
    return {
      x: Math.cos(angle) * radius, z: Math.sin(angle) * radius,
      width: 0.30 + random() * 0.45
    };
  }));
  makeCloud('Dos brazos secundarios · estrellas finas', 38000, false, secondaryPosition);
  makeCloud('Cúmulos de los brazos secundarios', 1800, true, secondaryPosition);
  makeCloud('Ramificaciones y estrellas entre brazos', 22000, false, interarmPosition);
  makeCloud('Destellos estelares aislados', 320, true, () => {
    let star;
    do { star = stellarPosition(true); } while (Math.hypot(star.x, star.z) < 4.5);
    return { ...star, dim: star.dim * 0.58, sparkle: true };
  });

  const sunAngle = spiralAngle(13.8, 1) + 0.28;
  const sunX = Math.cos(sunAngle) * 13.8, sunZ = Math.sin(sunAngle) * 13.8;
  makeCloud('Estrellas del vecindario · profundidad durante el acercamiento', 12000, false, () => ({
    x: sunX + normal() * 1.5, y: 0.24 + normal() * 0.38, z: sunZ + normal() * 1.5,
    warm: random() < 0.25, dim: 0.68, local: true
  }));

  const sunMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd8a0, toneMapped: false, transparent: true, depthWrite: false })
  );
  sunMarker.name = 'Sol · posición esquemática en el Brazo de Orión';
  sunMarker.position.set(Math.cos(sunAngle) * 13.8, 0.24, Math.sin(sunAngle) * 13.8);
  group.add(sunMarker);

  function setOpacity(value) {
    uniforms.uOpacity.value = clamp(value, 0, 1);
    sunMarker.material.opacity = uniforms.uOpacity.value * (1 - THREE.MathUtils.smoothstep(uniforms.uBreak.value, 0.12, 0.62));
  }
  function setTransition(value) {
    uniforms.uBreak.value = clamp(value, 0, 1);
    setOpacity(uniforms.uOpacity.value);
  }
  function setQuality(quality, pixelRatio) {
    const low = quality === 'low' || quality === 'mobile';
    for (const cloud of clouds) cloud.geometry.setDrawRange(0, Math.floor(cloud.count * (low ? 0.42 : 1)));
    galacticLight.setQuality(low);
    uniforms.uPixelRatio.value = pixelRatio ?? (typeof window === 'undefined' ? 1
      : Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2));
  }
  function update(_delta, elapsed = 0, camera) {
    uniforms.uTime.value = reducedMotion ? 0 : elapsed;
    uniforms.uIntro.value = 1;
    if (camera) {
      uniforms.uAspect.value = camera.aspect;
      uniforms.uTanHalfFov.value = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    }
  }
  setQuality(typeof window !== 'undefined' && window.innerWidth < 800 ? 'low' : 'high');
  return { group, sunMarker, update, setOpacity, setTransition, setQuality };
}
