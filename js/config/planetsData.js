/**
 * Centralized Astronomical Dataset for COSMOS Planets & Sun with Keplerian Live Time Parameters
 */

export const SUN_CONFIG = {
  id: 'sun',
  name: 'Sun',
  wikipediaTitle: 'Sun',
  type: 'Star (G2V Yellow Dwarf)',
  radius: 14.0,
  realRadius: 109.0,
  distance: 0,
  realDistance: 0,
  color: 0xffaa00,
  rotationSpeed: 0.002,
  surfaceTemp: '5,778 K (5,505 °C)',
  mass: '1.989 × 10³⁰ kg (333,000 Earths)',
  composition: '73% Hydrogen, 25% Helium',
  description: 'The star at the center of the Solar System. It is a nearly perfect ball of hot plasma, heating the planets and driving Earth\'s weather and climate.'
};

export const PLANETS_DATA = [
  {
    id: 'mercury',
    name: 'Mercury',
    wikipediaTitle: 'Mercury (planet)',
    positionFromSun: '1st Planet from Sun',
    radius: 1.2,
    realRadius: 0.38,
    distance: 28.0,
    realDistance: 39.0,
    orbitalPeriodDays: 87.969,
    M0: 4.402, // Mean anomaly at J2000 epoch
    orbitSpeed: 2.2,
    rotationSpeed: 0.004,
    axialTilt: 0.03,
    color: 0x8c8c8c,
    orbitColor: 0x64748b,
    textureType: 'mercury',
    hasAtmosphere: false,
    diameter: '4,879 km (0.38x Earth)',
    distanceFromSun: '57.9 million km (0.39 AU)',
    orbitalPeriod: '88 days',
    rotationPeriod: '59 days',
    mass: '3.30 × 10²³ kg (0.055 Earths)',
    surfaceTemp: '-180 °C to 430 °C',
    atmosphere: 'Ultra-thin exosphere (Oxygen, Sodium, Hydrogen)',
    description: 'The smallest planet in the Solar System and closest to the Sun. Its surface is heavily cratered, resembling Earth\'s Moon.',
    majorSatelliteIds: []
  },
  {
    id: 'venus',
    name: 'Venus',
    wikipediaTitle: 'Venus',
    positionFromSun: '2nd Planet from Sun',
    radius: 2.1,
    realRadius: 0.95,
    distance: 44.0,
    realDistance: 72.0,
    orbitalPeriodDays: 224.701,
    M0: 3.176,
    orbitSpeed: 1.6,
    rotationSpeed: -0.002,
    axialTilt: 177.3,
    color: 0xe3bb76,
    atmosphereColor: 0xffd89b,
    orbitColor: 0x78716c,
    textureType: 'venus',
    hasAtmosphere: true,
    diameter: '12,104 km (0.95x Earth)',
    distanceFromSun: '108.2 million km (0.72 AU)',
    orbitalPeriod: '225 days',
    rotationPeriod: '243 days (retrograde)',
    mass: '4.87 × 10²⁴ kg (0.815 Earths)',
    surfaceTemp: '465 °C (Hottest planet)',
    atmosphere: 'Dense CO₂ (96.5%) with sulfuric acid clouds',
    description: 'Spinning in the opposite direction of most planets, Venus is wrapped in thick toxic clouds of carbon dioxide, driving a runaway greenhouse effect.',
    majorSatelliteIds: []
  },
  {
    id: 'earth',
    name: 'Earth',
    wikipediaTitle: 'Earth',
    positionFromSun: '3rd Planet from Sun',
    radius: 2.2,
    realRadius: 1.0,
    distance: 65.0,
    realDistance: 100.0,
    orbitalPeriodDays: 365.256,
    M0: 6.24,
    orbitSpeed: 1.2,
    rotationSpeed: 0.015,
    axialTilt: 23.44,
    color: 0x2b82c5,
    atmosphereColor: 0x38bdf8,
    orbitColor: 0x38bdf8,
    textureType: 'earthDay',
    hasAtmosphere: true,
    diameter: '12,742 km (1.00x Earth)',
    distanceFromSun: '149.6 million km (1.00 AU)',
    orbitalPeriod: '365.25 days',
    rotationPeriod: '24 hours',
    mass: '5.97 × 10²⁴ kg',
    surfaceTemp: '-89 °C to 58 °C (avg 15 °C)',
    atmosphere: 'Nitrogen (78%), Oxygen (21%), Argon (0.9%)',
    description: 'The third planet from the Sun and the only astronomical object known to harbor life. Liquid water oceans cover 71% of its surface.',
    majorSatelliteIds: ['moon']
  },
  {
    id: 'mars',
    name: 'Mars',
    wikipediaTitle: 'Mars',
    positionFromSun: '4th Planet from Sun',
    radius: 1.5,
    realRadius: 0.53,
    distance: 90.0,
    realDistance: 152.0,
    orbitalPeriodDays: 686.98,
    M0: 0.338,
    orbitSpeed: 0.96,
    rotationSpeed: 0.014,
    axialTilt: 25.19,
    color: 0xc1440e,
    atmosphereColor: 0xf97316,
    orbitColor: 0xea580c,
    textureType: 'mars',
    hasAtmosphere: true,
    diameter: '6,779 km (0.53x Earth)',
    distanceFromSun: '227.9 million km (1.52 AU)',
    orbitalPeriod: '687 days',
    rotationPeriod: '24.6 hours',
    mass: '6.42 × 10²³ kg (0.107 Earths)',
    surfaceTemp: '-125 °C to 20 °C (avg -62 °C)',
    atmosphere: 'Thin CO₂ (95%), Nitrogen (2.6%), Argon (1.9%)',
    description: 'The Red Planet, colored by iron oxide (rust) on its surface. Home to Olympus Mons, the largest volcano in the Solar System.',
    majorSatelliteIds: ['phobos', 'deimos']
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    wikipediaTitle: 'Jupiter',
    positionFromSun: '5th Planet from Sun',
    radius: 7.2,
    realRadius: 11.2,
    distance: 140.0,
    realDistance: 520.0,
    orbitalPeriodDays: 4332.589,
    M0: 0.347,
    orbitSpeed: 0.52,
    rotationSpeed: 0.035,
    axialTilt: 3.13,
    color: 0xb07f35,
    atmosphereColor: 0xfde047,
    orbitColor: 0xca8a04,
    textureType: 'jupiter',
    hasAtmosphere: true,
    diameter: '139,820 km (11.2x Earth)',
    distanceFromSun: '778.5 million km (5.20 AU)',
    orbitalPeriod: '11.86 years',
    rotationPeriod: '9.9 hours (fastest planet)',
    mass: '1.898 × 10²⁷ kg (318 Earths)',
    surfaceTemp: '-110 °C (cloud tops)',
    atmosphere: 'Hydrogen (89%), Helium (10%)',
    description: 'The largest planet in the Solar System. A gas giant with iconic swirling cloud bands and the Great Red Spot, a storm larger than Earth.',
    majorSatelliteIds: ['io', 'europa', 'ganymede', 'callisto']
  },
  {
    id: 'saturn',
    name: 'Saturn',
    wikipediaTitle: 'Saturn',
    positionFromSun: '6th Planet from Sun',
    radius: 5.8,
    realRadius: 9.45,
    distance: 195.0,
    realDistance: 958.0,
    orbitalPeriodDays: 10759.22,
    M0: 5.57,
    orbitSpeed: 0.38,
    rotationSpeed: 0.03,
    axialTilt: 26.73,
    color: 0xe2bf7d,
    atmosphereColor: 0xfef08a,
    orbitColor: 0xeab308,
    textureType: 'saturn',
    hasAtmosphere: true,
    hasRings: true,
    ringConfig: {
      innerRadius: 7.5,
      outerRadius: 13.5,
      textureType: 'saturnRings'
    },
    diameter: '116,460 km (9.45x Earth)',
    distanceFromSun: '1.43 billion km (9.58 AU)',
    orbitalPeriod: '29.45 years',
    rotationPeriod: '10.7 hours',
    mass: '5.68 × 10²⁶ kg (95 Earths)',
    surfaceTemp: '-140 °C',
    atmosphere: 'Hydrogen (96%), Helium (3%)',
    description: 'Famous for its magnificent ring system composed of billions of chunks of ice and rock. Saturn is the least dense planet.',
    majorSatelliteIds: ['titan', 'enceladus', 'rhea', 'iapetus']
  },
  {
    id: 'uranus',
    name: 'Uranus',
    wikipediaTitle: 'Uranus',
    positionFromSun: '7th Planet from Sun',
    radius: 4.0,
    realRadius: 4.0,
    distance: 245.0,
    realDistance: 1920.0,
    orbitalPeriodDays: 30685.4,
    M0: 2.48,
    orbitSpeed: 0.26,
    rotationSpeed: -0.022,
    axialTilt: 97.77,
    color: 0x4b70dd,
    atmosphereColor: 0x38bdf8,
    orbitColor: 0x0284c7,
    textureType: 'uranus',
    hasAtmosphere: true,
    diameter: '50,724 km (4.00x Earth)',
    distanceFromSun: '2.87 billion km (19.2 AU)',
    orbitalPeriod: '84 years',
    rotationPeriod: '17.2 hours (retrograde)',
    mass: '8.68 × 10²⁵ kg (14.5 Earths)',
    surfaceTemp: '-195 °C (coldest planetary atmosphere)',
    atmosphere: 'Hydrogen (83%), Helium (15%), Methane (2%)',
    description: 'An ice giant that rotates on its side at an extreme 97.8-degree tilt. Methane in its upper atmosphere gives it a pale cyan hue.',
    majorSatelliteIds: ['titania', 'oberon', 'ariel', 'umbriel', 'miranda']
  },
  {
    id: 'neptune',
    name: 'Neptune',
    wikipediaTitle: 'Neptune',
    positionFromSun: '8th Planet from Sun',
    radius: 3.8,
    realRadius: 3.88,
    distance: 290.0,
    realDistance: 3007.0,
    orbitalPeriodDays: 60189.0,
    M0: 5.31,
    orbitSpeed: 0.2,
    rotationSpeed: 0.025,
    axialTilt: 28.32,
    color: 0x274687,
    atmosphereColor: 0x60a5fa,
    orbitColor: 0x1d4ed8,
    textureType: 'neptune',
    hasAtmosphere: true,
    diameter: '49,244 km (3.88x Earth)',
    distanceFromSun: '4.50 billion km (30.07 AU)',
    orbitalPeriod: '164.8 years',
    rotationPeriod: '16.1 hours',
    mass: '1.02 × 10²⁶ kg (17.1 Earths)',
    surfaceTemp: '-200 °C',
    atmosphere: 'Hydrogen (80%), Helium (19%), Methane (1.5%)',
    description: 'The outermost major planet in the Solar System. An ice giant known for supersonic winds reaching over 2,100 km/h.',
    majorSatelliteIds: ['triton']
  }
];

/**
 * Calculates real-time astronomical orbital angle for a planet at any Date
 */
export function getLiveOrbitAngle(config, date = new Date()) {
  const J2000 = new Date('2000-01-01T12:00:00Z').getTime();
  const elapsedDays = (date.getTime() - J2000) / (1000 * 60 * 60 * 24);
  const period = config.orbitalPeriodDays || 365.256;
  const m0 = config.M0 || 0;
  
  const meanAnomaly = m0 + (2 * Math.PI / period) * elapsedDays;
  return meanAnomaly % (Math.PI * 2);
}

/**
 * Calculates real-time axial rotation angle for Earth & planets based on live UTC system clock & solar position
 */
export function getLiveRotationAngle(config, date = new Date(), orbitAngle = 0) {
  let rotationHours = 24.0;
  if (config.id === 'earth') rotationHours = 24.0;
  else if (config.id === 'mars') rotationHours = 24.62;
  else if (config.id === 'jupiter') rotationHours = 9.93;
  else if (config.id === 'saturn') rotationHours = 10.7;
  else if (config.id === 'mercury') rotationHours = 1407.6;
  else if (config.id === 'venus') rotationHours = 5832.5;
  else if (config.id === 'uranus') rotationHours = 17.2;
  else if (config.id === 'neptune') rotationHours = 16.1;

  const secondsInDay = (date.getUTCHours() * 3600) + (date.getUTCMinutes() * 60) + date.getUTCSeconds() + (date.getUTCMilliseconds() / 1000);
  const dayFraction = (secondsInDay / (rotationHours * 3600)) % 1;

  if (config.id === 'earth') {
    // Synchronize Greenwich Meridian (Lon 0) with UTC solar noon (12:00:00 UTC)
    const solarOffset = orbitAngle + Math.PI;
    const utcSpinAngle = (dayFraction - 0.5) * Math.PI * 2;
    return solarOffset + utcSpinAngle;
  }

  const isRetrograde = (config.rotationSpeed && config.rotationSpeed < 0) || config.id === 'venus' || config.id === 'uranus';
  const angle = dayFraction * Math.PI * 2;
  return isRetrograde ? -angle : angle;
}
