export const planets = [
  {
    id: 'mercury', name: 'Mercurio', english: 'Mercury', diameter: 4879, distance: 57.9,
    periodDays: 87.97, periodLabel: '88 días', moons: '0', temperature: '167 °C',
    order: 'PRIMER PLANETA DESDE EL SOL', periodDisplay: '87.97', distanceDisplay: '57.9 M km',
    description: 'Un planeta de extremos: la cercanía al Sol y una atmósfera casi inexistente dejan que el calor viaje sin tregua entre el día y la noche.',
    sourceUrl: 'https://science.nasa.gov/mercury/facts/',
    texture: '/textures/mercury.jpg', orbit: 3.02, eccentricity: 0.206, orbitInclination: 0.122, ascendingNode: 0.34, radius: 0.15, tilt: 0.035, spin: 0.12, color: '#b5a58d', phase: 2.3
  },
  {
    id: 'venus', name: 'Venus', english: 'Venus', diameter: 12104, distance: 108.2,
    periodDays: 224.70, periodLabel: '225 días', moons: '0', temperature: '464 °C',
    order: 'SEGUNDO PLANETA DESDE EL SOL', periodDisplay: '224.70', distanceDisplay: '108.2 M km',
    description: 'Una cubierta espesa de nubes envuelve una superficie ardiente. Su atmósfera atrapa el calor con más fuerza que cualquier otro planeta.',
    sourceUrl: 'https://science.nasa.gov/venus/venus-facts/',
    texture: '/textures/venus.jpg', orbit: 3.51, eccentricity: 0.007, orbitInclination: 0.075, ascendingNode: 1.25, radius: 0.23, tilt: 0.059, spin: -0.055, color: '#dec298', phase: 4.05
  },
  {
    id: 'earth', name: 'Tierra', english: 'Earth', diameter: 12742, distance: 149.6,
    periodDays: 365.256, periodLabel: '365.25 días', moons: '1', temperature: '15 °C',
    order: 'TERCER PLANETA DESDE EL SOL', periodDisplay: '365.25', distanceDisplay: '149.6 M km',
    description: 'Un océano de agua líquida, una atmósfera activa y una luna grande: el único planeta que conocemos donde la vida encontró un hogar.',
    sourceUrl: 'https://science.nasa.gov/moon/',
    texture: '/textures/earth.jpg', orbit: 3.94, eccentricity: 0.017, orbitInclination: 0.028, ascendingNode: 2.12, radius: 0.27, tilt: 0.409, spin: 0.095, color: '#477c98', phase: 5.6
  },
  {
    id: 'mars', name: 'Marte', english: 'Mars', diameter: 6779, distance: 227.9,
    periodDays: 686.98, periodLabel: '687 días', moons: '2', temperature: '−65 °C',
    order: 'CUARTO PLANETA DESDE EL SOL', periodDisplay: '1.88 años', distanceDisplay: '227.9 M km',
    description: 'Un paisaje de volcanes gigantes y antiguos cauces. Bajo el polvo rojo, Marte conserva rastros de un pasado mucho más húmedo.',
    sourceUrl: 'https://science.nasa.gov/mars/moons/',
    texture: '/textures/mars.jpg', orbit: 4.83, eccentricity: 0.093, orbitInclination: 0.056, ascendingNode: 3.08, radius: 0.2, tilt: 0.44, spin: 0.09, color: '#bd7350', phase: 1.05
  },
  {
    id: 'jupiter', name: 'Júpiter', english: 'Jupiter', diameter: 139820, distance: 778.6,
    periodDays: 4332.59, periodLabel: '11.86 años', moons: '115', temperature: '−110 °C',
    order: 'QUINTO PLANETA DESDE EL SOL', periodDisplay: '11.86 años', distanceDisplay: '778.6 M km',
    description: 'Una enorme esfera de nubes y tormentas. La Gran Mancha Roja es un remolino persistente dentro de una atmósfera en constante cambio.',
    sourceUrl: 'https://science.nasa.gov/jupiter/jupiter-moons/',
    texture: '/textures/jupiter.jpg', orbit: 7.44, eccentricity: 0.049, orbitInclination: 0.038, ascendingNode: 4.18, radius: 0.68, tilt: 0.023, spin: 0.14, color: '#d8b493', phase: 2.0
  },
  {
    id: 'saturn', name: 'Saturno', english: 'Saturn', diameter: 116460, distance: 1433.5,
    periodDays: 10759.22, periodLabel: '29.45 años', moons: '293', temperature: '−140 °C',
    order: 'SEXTO PLANETA DESDE EL SOL', periodDisplay: '29.45 años', distanceDisplay: '1.43 mil M km',
    description: 'Sus anillos son incontables fragmentos de hielo y roca. Vistos de cerca, dibujan una estructura delicada, mucho más fina de lo que sugiere su anchura.',
    sourceUrl: 'https://science.nasa.gov/saturn/moons/',
    texture: null, orbit: 9.82, eccentricity: 0.057, orbitInclination: 0.052, ascendingNode: 5.26, radius: 0.59, tilt: 0.466, spin: 0.13, color: '#cfb88f', phase: 0.7
  },
  {
    id: 'uranus', name: 'Urano', english: 'Uranus', diameter: 50724, distance: 2872.5,
    periodDays: 30688.5, periodLabel: '84 años', moons: '29', temperature: '−195 °C',
    order: 'SÉPTIMO PLANETA DESDE EL SOL', periodDisplay: '84 años', distanceDisplay: '2.87 mil M km',
    description: 'Un gigante de hielo que gira casi tumbado sobre su órbita. Sus largas estaciones nacen de una inclinación axial fuera de lo común.',
    sourceUrl: 'https://science.nasa.gov/uranus/moons/',
    texture: null, orbit: 13.18, eccentricity: 0.046, orbitInclination: 0.025, ascendingNode: 2.82, radius: 0.4, tilt: 1.706, spin: -0.1, color: '#82bac1', phase: 3.4
  },
  {
    id: 'neptune', name: 'Neptuno', english: 'Neptune', diameter: 49244, distance: 4495.1,
    periodDays: 60182, periodLabel: '164.8 años', moons: '16', temperature: '−200 °C',
    order: 'OCTAVO PLANETA DESDE EL SOL', periodDisplay: '164.8 años', distanceDisplay: '4.50 mil M km',
    description: 'El planeta más lejano del sistema planetario. Vientos supersónicos recorren su atmósfera fría y azul, bajo una luz solar muy tenue.',
    sourceUrl: 'https://science.nasa.gov/neptune/moons/',
    texture: '/textures/neptune.jpg', orbit: 15.97, eccentricity: 0.009, orbitInclination: 0.044, ascendingNode: 0.91, radius: 0.39, tilt: 0.494, spin: 0.085, color: '#4684c3', phase: 4.9
  }
];
