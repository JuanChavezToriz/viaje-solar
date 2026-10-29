// Camera-local stars provide parallax through each change of coordinate units.
// Their wrap points are transparent, so reversing scroll retraces the same field.
export function createStellarPassage(THREE, { count = 7600 } = {}) {
  let seed = 0x67616c61;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const positions = new Float32Array(count * 3);
  const styles = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 108;
    positions.set([Math.cos(angle) * radius, Math.sin(angle) * radius, random() * 220], i * 3);
    styles.set([0.7 + random() * 1.8, 0.30 + random() * 0.62, random()], i * 3);
    const tint = random() < 0.25 ? new THREE.Color('#b4cefa') : new THREE.Color('#fff0d7');
    colors.set([tint.r, tint.g, tint.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aStyle', new THREE.BufferAttribute(styles, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const uniforms = { uDistance: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 }, uAspect: { value: 1 } };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `
      attribute vec3 aStyle;
      attribute vec3 color;
      uniform float uDistance;
      uniform float uPixelRatio;
      uniform float uAspect;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float depth = mod(position.z - uDistance, 220.0);
        vec3 point = vec3(position.x * max(1.0, uAspect * 0.8), position.y, -depth);
        float requested = aStyle.x * 65.0 / max(1.0, depth) * uPixelRatio;
        gl_PointSize = clamp(requested, 1.7 * uPixelRatio, 8.0 * uPixelRatio);
        vAlpha = aStyle.y * smoothstep(0.25, 5.0, depth) * (1.0 - smoothstep(175.0, 220.0, depth))
          * min(1.0, pow(requested / gl_PointSize, 2.0));
        vColor = color;
        gl_Position = projectionMatrix * vec4(point, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float r = length(gl_PointCoord - vec2(0.5)) * 2.0;
        float alpha = exp(-5.0 * r * r) * (1.0 - smoothstep(0.72, 1.0, r));
        gl_FragColor = vec4(vColor, alpha * vAlpha * uOpacity);
        #include <colorspace_fragment>
      }
    `
  });
  const group = new THREE.Points(geometry, material);
  group.name = 'Estrellas cercanas · paralaje del viaje';
  group.frustumCulled = false;
  group.renderOrder = 3;
  group.visible = false;
  return {
    group,
    setFlight(distance, opacity, pixelRatio, aspect) {
      uniforms.uDistance.value = distance;
      uniforms.uOpacity.value = opacity;
      uniforms.uPixelRatio.value = pixelRatio;
      uniforms.uAspect.value = aspect;
      group.visible = opacity > 0.001;
    }
  };
}
