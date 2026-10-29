// The light field and the individual stars share the same spiral spine.
export const BAR_ANGLE = -0.62;
export const SPIRAL_WINDING = 2.45;
export function spiralAngle(radius, arm = 0) {
  return BAR_ANGLE + arm * Math.PI + SPIRAL_WINDING * Math.log(Math.max(radius, 2.1) / 2.1)
    + 0.055 * Math.sin(radius * 0.55);
}

// Fainter stellar/gas arms sit between the two dominant stellar arms.
export function secondarySpiralAngle(radius, arm = 0) {
  return spiralAngle(radius, arm) + 1.48 + 0.08 * Math.sin(radius * 0.48);
}

export function createGalacticLight(THREE, sharedUniforms) {
  const uniforms = { ...sharedUniforms, uDetail: { value: 3 } };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `
      varying vec2 vGalactic;
      varying float vWorldScale;
      void main() {
        vGalactic = position.xz;
        vWorldScale = length(modelMatrix[0].xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uBreak;
      uniform float uIntro;
      uniform float uDetail;
      varying vec2 vGalactic;
      varying float vWorldScale;
      float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }
      float noise(vec2 p) {
        vec2 cell = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(cell), hash(cell + vec2(1, 0)), f.x),
          mix(hash(cell + vec2(0, 1)), hash(cell + vec2(1, 1)), f.x), f.y);
      }
      float clouds(vec2 p) {
        float value = 0.0, weight = 0.56;
        for (int i = 0; i < 3; i++) {
          if (float(i) >= uDetail) break;
          value += weight * noise(p);
          p = mat2(1.6, -1.2, 1.2, 1.6) * p + vec2(7.1, 3.8);
          weight *= 0.5;
        }
        return value;
      }
      void main() {
        vec2 p = vGalactic;
        float radius = max(length(p), 0.001);
        float angle = atan(p.y, p.x);
        float spine = ${BAR_ANGLE.toFixed(2)} + ${SPIRAL_WINDING.toFixed(2)} * log(max(radius, 2.1) / 2.1)
          + 0.055 * sin(radius * 0.55);
        float cloud = clouds(p * 0.72 + vec2(2.3, 9.7));
        float inner = smoothstep(1.8, 3.5, radius);
        float outer = 1.0 - smoothstep(17.5, 23.0, radius);
        float width = 0.85 + radius * 0.105;
        float primaryDistance = sin(angle - spine) * radius / width;
        float secondarySpine = spine + 1.48 + 0.08 * sin(radius * 0.48);
        float secondaryDistance = sin(angle - secondarySpine) * radius / (width * 0.82);
        float primary = exp(-0.5 * primaryDistance * primaryDistance) * 0.30
          + exp(-0.125 * primaryDistance * primaryDistance) * 0.17;
        float secondary = exp(-0.5 * secondaryDistance * secondaryDistance) * 0.38
          + exp(-0.10 * secondaryDistance * secondaryDistance) * 0.14;
        float dustDistance = sin(angle - spine - 0.055) * radius / (width * 0.37);
        float secondaryDust = sin(angle - secondarySpine - 0.05) * radius / (width * 0.28);
        float dust = max(exp(-0.5 * dustDistance * dustDistance),
          exp(-0.5 * secondaryDust * secondaryDust) * 0.72) * inner
          * smoothstep(0.24, 0.76, cloud);
        float fineCloud = clouds(p * 1.85 + vec2(12.1, 4.8));
        float disk = exp(-radius / 10.5) * 0.35 * (0.68 + cloud * 0.65);
        float arms = (primary + secondary) * inner * exp(-radius / 26.0)
          * (0.50 + cloud * 1.05) * (1.0 - dust * 0.70);
        float emission = (primary + secondary) * inner * exp(-radius / 30.0)
          * smoothstep(0.53, 0.76, cloud) * smoothstep(0.38, 0.70, fineCloud) * 0.82;
        float alongBar = p.x * cos(${BAR_ANGLE.toFixed(2)}) + p.y * sin(${BAR_ANGLE.toFixed(2)});
        float acrossBar = -p.x * sin(${BAR_ANGLE.toFixed(2)}) + p.y * cos(${BAR_ANGLE.toFixed(2)});
        float bar = exp(-alongBar * alongBar / 16.0 - acrossBar * acrossBar / 1.65) * 0.33;
        float nucleus = exp(-radius * radius / 2.8) * 0.35 + exp(-radius * radius / 14.0) * 0.075;
        float light = disk + arms + bar + nucleus + emission;
        vec3 diskTint = mix(vec3(0.19, 0.29, 0.53), vec3(0.84, 0.61, 0.34), exp(-radius / 4.5));
        vec3 armTint = mix(vec3(0.25, 0.42, 0.86), vec3(0.46, 0.52, 0.80), cloud);
        vec3 tint = (diskTint * disk + armTint * arms
          + vec3(0.88, 0.16, 0.32) * emission
          + vec3(0.98, 0.71, 0.40) * (bar + nucleus)) / max(light, 0.001);
        // Exposure adapts near the Sun; the stars remain in the same volume.
        float exposure = 1.0 / (1.0 + max(0.0, sqrt(vWorldScale) - 1.0) * 0.13);
        gl_FragColor = vec4(tint, min(light, 0.76) * outer * uOpacity * uIntro * exposure);
        #include <colorspace_fragment>
      }
    `
  });
  const geometry = new THREE.PlaneGeometry(48, 48);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Luz continua del disco, brazos y barra central';
  mesh.position.y = -0.06;
  mesh.renderOrder = 0;
  const bulge = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 20), new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -view.xyz;
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float facing = max(0.0, dot(normalize(vNormal), normalize(vView)));
        gl_FragColor = vec4(vec3(1.0, 0.72, 0.42), pow(facing, 3.0) * 0.085 * uOpacity);
        #include <colorspace_fragment>
      }
    `
  }));
  bulge.name = 'Bulbo luminoso · volumen estelar';
  bulge.scale.set(3.8, 1.05, 1.9);
  bulge.rotation.y = -BAR_ANGLE;
  return { mesh, bulge, setQuality(low) { uniforms.uDetail.value = low ? 2 : 3; } };
}
