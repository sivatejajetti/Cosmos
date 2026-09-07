/**
 * NASA Service — Real-Time Earth EPIC Imagery, Near-Earth Asteroids & Live Satellite Tracking
 * Integrates NASA Open APIs (api.nasa.gov) and CelesTrak NORAD Live Satellite TLE Data.
 */

const NASA_BASE_URL = 'https://api.nasa.gov';
const CELESTRAK_BASE_URL = 'https://celestrak.org/NORAD/elements';

// In-memory cache to respect NASA rate limits
const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

export class NasaService {
  /**
   * Fetches real-time full-globe Earth images captured by NASA's DSCOVR EPIC satellite
   */
  static async getLiveEarthImages() {
    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    const cacheKey = `nasa_epic_${apiKey}`;
    
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }

    try {
      const url = `${NASA_BASE_URL}/EPIC/api/natural?api_key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      
      if (res.ok) {
        const rawData = await res.json();
        if (Array.isArray(rawData) && rawData.length > 0) {
          const formatted = rawData.slice(0, 10).map(img => {
            const dateParts = img.date.split(' ')[0].split('-');
            const year = dateParts[0];
            const month = dateParts[1];
            const day = dateParts[2];
            const imageUrl = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${img.image}.png`;

            return {
              identifier: img.identifier,
              caption: img.caption,
              date: img.date,
              imageUrl,
              coords: img.centroid_coordinates ? {
                lat: img.centroid_coordinates.lat,
                lon: img.centroid_coordinates.lon
              } : null,
              dscovrPosition: img.dscovr_j2000_position || null
            };
          });

          const result = { success: true, count: formatted.length, images: formatted };
          cache.set(cacheKey, { timestamp: Date.now(), data: result });
          return result;
        }
      }
    } catch (err) {
      console.warn('[NasaService] EPIC Earth images lookup failed:', err.message);
    }

    return { success: false, images: [], error: 'Unable to fetch real-time NASA EPIC Earth images.' };
  }

  /**
   * Fetches live Near-Earth Asteroids tracked by NASA NeoWs API
   */
  static async getNearEarthAsteroids() {
    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    const cacheKey = `nasa_neo_${apiKey}`;

    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const url = `${NASA_BASE_URL}/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });

      if (res.ok) {
        const data = await res.json();
        const elementCount = data.element_count || 0;
        const nearEarthObjects = data.near_earth_objects ? data.near_earth_objects[today] || [] : [];

        const formatted = nearEarthObjects.slice(0, 15).map(neo => ({
          id: neo.id,
          name: neo.name,
          nasaJplUrl: neo.nasa_jpl_url,
          absoluteMagnitude: neo.absolute_magnitude_h,
          isPotentiallyHazardous: neo.is_potentially_hazardous_asteroid,
          estimatedDiameterKm: neo.estimated_diameter ? {
            min: neo.estimated_diameter.kilometers.estimated_diameter_min.toFixed(3),
            max: neo.estimated_diameter.kilometers.estimated_diameter_max.toFixed(3)
          } : null,
          closeApproachData: neo.close_approach_data && neo.close_approach_data[0] ? {
            closeApproachDate: neo.close_approach_data[0].close_approach_date_full,
            missDistanceKm: Math.round(parseFloat(neo.close_approach_data[0].miss_distance.kilometers)),
            relativeVelocityKmSec: parseFloat(neo.close_approach_data[0].relative_velocity.kilometers_per_second).toFixed(2)
          } : null
        }));

        const result = {
          success: true,
          totalTrackedToday: elementCount,
          asteroids: formatted
        };

        cache.set(cacheKey, { timestamp: Date.now(), data: result });
        return result;
      }
    } catch (err) {
      console.warn('[NasaService] Near-Earth Asteroids lookup failed:', err.message);
    }

    return { success: false, asteroids: [], error: 'Unable to fetch NASA Near-Earth Asteroids data.' };
  }

  /**
   * Fetches real-time NORAD CelesTrak orbital TLE telemetry for active satellites
   */
  static async getLiveSatelliteTLE(group = 'active') {
    const cacheKey = `celestrak_${group}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }

    try {
      const url = `${CELESTRAK_BASE_URL}/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'COSMOS-SatelliteTracker/1.0' },
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const rawData = await res.json();
        if (Array.isArray(rawData)) {
          const result = {
            success: true,
            totalSatellites: rawData.length,
            satellites: rawData.slice(0, 30).map(sat => ({
              name: sat.OBJECT_NAME,
              noradCatId: sat.NORAD_CAT_ID,
              inclinationDeg: sat.INCLINATION,
              raanDeg: sat.RA_OF_ASC_NODE,
              eccentricity: sat.ECCENTRICITY,
              periodMin: sat.PERIOD,
              meanMotion: sat.MEAN_MOTION,
              epoch: sat.EPOCH
            }))
          };

          cache.set(cacheKey, { timestamp: Date.now(), data: result });
          return result;
        }
      }
    } catch (err) {
      console.warn('[NasaService] CelesTrak satellite TLE lookup failed:', err.message);
    }

    return { success: false, satellites: [], error: 'Unable to fetch CelesTrak live satellite TLE data.' };
  }
}
