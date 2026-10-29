// Screen-space art direction. Radius is a fraction of the viewport height.
// These are presentation angles, independent of the orbital simulation.
export const portraitProfiles = {
  sun:     { x: .68, y: .79, radius: .62, pitch: .10, roll: -.12, phase: 0,    caption: 'La luz de este viaje.' },
  mercury: { x: .67, y: .64, radius: .48, pitch: .12, roll: -.18, phase: 2.2,  caption: 'Piedra, silencio y tiempo.' },
  venus:   { x: .69, y: .69, radius: .52, pitch: -.08, roll: .14, phase: .8,   caption: 'Un horizonte entre nubes.' },
  earth:   { x: .67, y: .65, radius: .52, pitch: .12, roll: -.28, phase: 3.8,  caption: 'Aquí comienza todo.' },
  mars:    { x: .54, y: .91, radius: .68, pitch: .08, roll: .12, phase: 4.1,   caption: 'Otro horizonte nos espera.' },
  jupiter: { x: .72, y: .66, radius: .56, pitch: -.06, roll: -.16, phase: 2.4, caption: 'Un gigante en movimiento.' },
  saturn:  { x: .65, y: .53, radius: .19, pitch: .48, roll: -.36, phase: .8,   caption: 'Un planeta entre anillos.' },
  uranus:  { x: .67, y: .61, radius: .44, pitch: .22, roll: 1.38, phase: 1.1, caption: 'Calma en azul.' },
  neptune: { x: .70, y: .65, radius: .49, pitch: -.10, roll: .32, phase: 2.8, caption: 'La última escala.' },
};

const mobileViews = {
  sun: [.65, .27, .32, -.12, .10], mercury: [.63, .26, .27, .18, -.18],
  venus: [.66, .25, .28, -.12, .15], earth: [.64, .26, .28, .12, -.20],
  mars: [.63, .27, .30, -.10, -.12], jupiter: [.69, .26, .31, .06, -.16],
  saturn: [.69, .25, .30, .25, -.10], uranus: [.64, .26, .27, .20, 1.48],
  neptune: [.65, .26, .28, .10, .15],
};

export const portraitSummaries = {
  sun: 'La estrella que da luz y ritmo a todos los planetas de este viaje.',
  mercury: 'Un planeta de roca y cráteres, entre días ardientes y noches heladas.',
  venus: 'Bajo un manto de nubes, un planeta envuelto en calor.',
  earth: 'Océanos, nubes y una luna. El lugar donde la vida encontró un hogar.',
  mars: 'Polvo rojo, grandes volcanes y las huellas de antiguos ríos.',
  jupiter: 'Nubes en movimiento y tormentas que dibujan un gigante.',
  saturn: 'Un gigante sereno, rodeado de delicados anillos de hielo y roca.',
  uranus: 'Un planeta de hielo que gira de lado, bajo una atmósfera azul verdosa.',
  neptune: 'Azul profundo y vientos intensos en la última escala de este viaje.',
};

export function isHandset(width, height = Infinity) {
  return width <= 700 || width <= 1000 && height <= 500;
}

export function portraitPose(id, width, height = Infinity) {
  const profile = portraitProfiles[id] || portraitProfiles.earth;
  const view = mobileViews[id] || mobileViews.earth;
  return isHandset(width, height)
    ? { pitch: view[3], roll: view[4] }
    : { pitch: profile.pitch, roll: profile.roll };
}

export function portraitFrame(id, width, height) {
  const profile = portraitProfiles[id] || portraitProfiles.earth;
  const mobile = isHandset(width, height);
  const aspect = width / height;
  if (mobile) {
    const view = mobileViews[id] || mobileViews.earth;
    if (width > height) return { x: .77, y: .44, radius: id === 'saturn' ? .46 : .44 };
    return { x: view[0], y: view[1], radius: Math.min(view[2], aspect * .95) };
  }
  if (id === 'saturn') return { x: profile.x, y: profile.y, radius: Math.min(profile.radius, aspect * .142) };
  if (height < 560) return { x: .69, y: .63, radius: Math.min(profile.radius, .48) };
  return { x: profile.x, y: profile.y, radius: Math.min(profile.radius, aspect * .62) };
}

export function portraitFov(radius, distance = 8) {
  return 2 * Math.atan(1 / (2 * radius * Math.sqrt(distance * distance - 1))) * 180 / Math.PI;
}

export function portraitTexturePath(id, mobile) {
  const hasMobileMap = ['earth', 'mars', 'jupiter', 'saturn'].includes(id);
  return `/textures/portraits/${id}${mobile && hasMobileMap ? '-mobile' : ''}.jpg`;
}
