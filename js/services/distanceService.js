import { PLANETS_DATA, getLiveOrbitAngle, getLiveRotationAngle } from '../config/planetsData.js';

/**
 * Service for Calculating Real-Time Astronomical & Surface Distance
 * From User's Exact Geolocation to Any Celestial Body / Spacecraft
 */
export class DistanceService {
  static userLocation = {
    lat: 20.5937,
    lon: 78.9629,
    status: 'Detecting Location...',
    isGPS: false,
    city: 'India'
  };

  static isInit = false;
  static listeners = [];

  static addListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
      callback(this.userLocation);
    }
  }

  static notifyListeners() {
    this.listeners.forEach(cb => {
      try { cb(this.userLocation); } catch (e) { console.error(e); }
    });
  }

  static init() {
    if (this.isInit) return;
    this.isInit = true;

    const handlePos = (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const latStr = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
      const lonStr = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;

      this.userLocation = {
        lat,
        lon,
        status: `GPS Verified (${latStr}, ${lonStr})`,
        isGPS: true,
        city: 'Your Location'
      };
      this.notifyListeners();
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        handlePos,
        (err) => {
          console.warn('[DistanceService Geolocation Notice]', err.message);
          this.fetchIPLocation();
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );

      try {
        navigator.geolocation.watchPosition(
          handlePos,
          () => {},
          { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
        );
      } catch (e) {}
    } else {
      this.fetchIPLocation();
    }
  }

  static async fetchIPLocation() {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const lat = parseFloat(data.latitude);
          const lon = parseFloat(data.longitude);
          const latStr = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
          const lonStr = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
          this.userLocation = {
            lat,
            lon,
            status: `${data.city || 'Local'} (${latStr}, ${lonStr})`,
            isGPS: false,
            city: data.city || 'India'
          };
          this.notifyListeners();
          return;
        }
      }
    } catch (e) {
      // Fallback default
    }

    this.userLocation = {
      lat: 20.5937,
      lon: 78.9629,
      status: `Location (India: 20.59° N, 78.96° E)`,
      isGPS: false,
      city: 'India'
    };
    this.notifyListeners();
  }

  /**
   * Calculates live distance from user's current location on Earth to target celestial body
   */
  static getLiveDistance(targetData, date = new Date()) {
    this.init();

    if (!targetData) return null;

    const id = targetData.id;

    // Case 1: Target is Earth itself
    if (id === 'earth') {
      return {
        km: '0 km (Ground Level)',
        miles: '0 mi',
        au: '0.0000 AU',
        lightTime: '0.00 ms (Instant)',
        locationStatus: this.userLocation.status,
        isEarth: true,
        rawKm: 0
      };
    }

    // Semi-major axis in AU for planets and Sun
    const planetAU = {
      sun: 0.0,
      mercury: 0.387098,
      venus: 0.723332,
      earth: 1.000000,
      mars: 1.523679,
      jupiter: 5.204267,
      saturn: 9.582686,
      uranus: 19.19126,
      neptune: 30.07000
    };

    let distKm = 0;
    let distAU = 0;

    // Check if target is a planet or Sun
    if (planetAU[id] !== undefined) {
      const earthConfig = PLANETS_DATA.find(p => p.id === 'earth') || { orbitalPeriodDays: 365.256, M0: 6.24 };
      const earthAngle = getLiveOrbitAngle(earthConfig, date);
      const earthX = planetAU.earth * Math.cos(earthAngle);
      const earthZ = planetAU.earth * Math.sin(earthAngle);

      let targetX = 0, targetZ = 0;
      if (id !== 'sun') {
        const targetConfig = PLANETS_DATA.find(p => p.id === id) || targetData;
        const targetAngle = getLiveOrbitAngle(targetConfig, date);
        const radiusAU = planetAU[id] || 1.0;
        targetX = radiusAU * Math.cos(targetAngle);
        targetZ = radiusAU * Math.sin(targetAngle);
      }

      // Compute Delta in AU
      const dx = targetX - earthX;
      const dz = targetZ - earthZ;
      distAU = Math.sqrt(dx * dx + dz * dz);

      // Add user surface location offset (Earth radius offset in AU)
      const earthRotAngle = getLiveRotationAngle(earthConfig, date, earthAngle);
      const userLonRad = (this.userLocation.lon * Math.PI) / 180;
      const userLatRad = (this.userLocation.lat * Math.PI) / 180;
      const netAngle = earthRotAngle + userLonRad;

      const earthRadiusAU = 6371 / 149597870.7; // ~0.00004258 AU
      const surfaceDx = earthRadiusAU * Math.cos(userLatRad) * Math.cos(netAngle);
      const surfaceDz = earthRadiusAU * Math.cos(userLatRad) * Math.sin(netAngle);

      const netDx = targetX - (earthX + surfaceDx);
      const netDz = targetZ - (earthZ + surfaceDz);
      distAU = Math.sqrt(netDx * netDx + netDz * netDz);
      distKm = distAU * 149597870.7;
    }
    // Case 2: Natural Satellite Moons (Earth's Moon or Moons of other planets)
    else if (targetData.type === 'satellite' || targetData.parentPlanetId) {
      if (targetData.parentPlanetId === 'earth' || id === 'moon') {
        // Distance to Earth's Moon from user surface position (~384,400 km)
        const meanMoonDist = 384400; // km
        // Latitude / zenith angle variation offset
        const latOffset = Math.sin((this.userLocation.lat * Math.PI) / 180) * 3200;
        distKm = meanMoonDist - latOffset;
        distAU = distKm / 149597870.7;
      } else {
        // Moon of another planet (e.g. Europa, Phobos, Titan)
        const parentConfig = PLANETS_DATA.find(p => p.id === targetData.parentPlanetId);
        const parentDist = parentConfig ? this.getLiveDistance(parentConfig, date) : { rawKm: 150000000 };
        distKm = parentDist.rawKm + (targetData.orbitalDistance || 2.0) * 150000;
        distAU = distKm / 149597870.7;
      }
    }
    // Case 3: Artificial Spacecraft & Satellites (ISS, Hubble, Starlink, Aryabhata, Probes)
    else if (targetData.category === 'artificial' || targetData.parentBodyId) {
      if (targetData.parentBodyId === 'earth') {
        // Satellite orbiting Earth (e.g. ISS ~408 km, GEO ~35,786 km)
        let altitudeKm = 408;
        if (id.includes('hubble')) altitudeKm = 535;
        else if (id.includes('geo') || id.includes('gps')) altitudeKm = 20200;
        else if (id.includes('aryabhata')) altitudeKm = 619;
        else if (id.includes('starlink')) altitudeKm = 550;

        distKm = altitudeKm;
        distAU = distKm / 149597870.7;
      } else {
        // Deep space probe (e.g. Voyager 1, James Webb, Pioneer)
        const parentConfig = PLANETS_DATA.find(p => p.id === targetData.parentBodyId);
        const parentDist = parentConfig ? this.getLiveDistance(parentConfig, date) : { rawKm: 150000000 };
        distKm = parentDist.rawKm + 1500000;
        distAU = distKm / 149597870.7;
      }
    } else {
      distKm = 149597870.7;
      distAU = 1.0;
    }

    const distMiles = distKm * 0.621371;
    const totalLightSeconds = distKm / 299792.458; // c = 299,792.458 km/s

    return {
      km: this.formatNumber(distKm) + ' km',
      miles: this.formatMiles(distMiles),
      au: distAU.toFixed(4) + ' AU',
      lightTime: this.formatLightTime(totalLightSeconds),
      locationStatus: this.userLocation.status,
      isEarth: false,
      rawKm: distKm
    };
  }

  static formatLightTime(seconds) {
    if (seconds < 0.001) return '0.00 ms (Instant)';
    if (seconds < 1.0) return (seconds * 1000).toFixed(1) + ' ms';
    if (seconds < 60) return seconds.toFixed(2) + ' secs';

    const mins = Math.floor(seconds / 60);
    const remSecs = Math.floor(seconds % 60);
    if (mins < 60) {
      return `${mins}m ${remSecs.toString().padStart(2, '0')}s`;
    }

    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m ${remSecs.toString().padStart(2, '0')}s`;
  }

  static formatNumber(num) {
    return Math.round(num).toLocaleString('en-US');
  }

  static formatMiles(miles) {
    if (miles >= 1e9) return (miles / 1e9).toFixed(2) + ' B mi';
    if (miles >= 1e6) return (miles / 1e6).toFixed(1) + ' M mi';
    return Math.round(miles).toLocaleString('en-US') + ' mi';
  }
}
