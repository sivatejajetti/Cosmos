import { PLANETS_DATA, SUN_CONFIG } from '../config/planetsData.js';
import { SATELLITES_DATA } from '../config/satellitesData.js';
import { ARTIFICIAL_SATELLITES_DATA } from '../config/artificialSatellitesData.js';

/**
 * Frontend COSMOS API Service Client
 * Fetches object metadata & Wikipedia summaries from Express backend with automatic local fallback.
 */
export class CosmosApi {
  static baseUrl = 'http://localhost:5000/api/v1';

  static async getObjectById(id) {
    try {
      const response = await fetch(`${this.baseUrl}/objects/${id}`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn(`[COSMOS API] Backend unreachable at ${this.baseUrl}. Falling back to local static dataset for '${id}'.`);
    }

    // Local Dataset Fallback
    const all = [
      SUN_CONFIG,
      ...PLANETS_DATA,
      ...SATELLITES_DATA,
      ...ARTIFICIAL_SATELLITES_DATA
    ];

    return all.find(o => o.id.toLowerCase() === id.toLowerCase()) || null;
  }

  static async getWikipediaData(id) {
    try {
      const response = await fetch(`${this.baseUrl}/wikipedia/${id}`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.wikipedia) {
          return json.wikipedia;
        }
      }
    } catch (err) {
      console.warn(`[COSMOS API] Wikipedia backend endpoint unreachable for '${id}'.`);
    }
    return null;
  }

  /**
   * POST /api/v1/ai/explain — request AI explanation for a celestial object
   * @param {string} id - Object ID (e.g. 'earth', 'moon', 'aryabhata')
   * @param {string} mode - 'beginner' | 'student' | 'deepdive'
   * @param {string|null} question - Optional custom question
   * @returns {Promise<{success:boolean, explanation?:string, error?:string, errorCode?:string}>}
   */
  static async getAIExplanation(id, mode = 'beginner', question = null) {
    try {
      const body = { objectId: id, mode };
      if (question) body.question = question;

      const response = await fetch(`${this.baseUrl}/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const json = await response.json();
        return json;
      }
      return { success: false, error: 'AI service returned an error.', errorCode: 'HTTP_ERROR' };
    } catch (err) {
      console.warn(`[COSMOS API] AI backend endpoint unreachable for '${id}'.`);
      return { success: false, error: 'AI service is not reachable. Check that the backend server is running.', errorCode: 'NETWORK_ERROR' };
    }
  }

  /**
   * GET /api/v1/radio/nearby — fetch nearby live radio stations for latitude/longitude
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} radius
   * @returns {Promise<{success:boolean, location:object, searchRadiusKm:number, stations:Array}>}
   */
  static async fetchNearbyRadioStations(latitude, longitude, radius = 50) {
    try {
      const url = `${this.baseUrl}/radio/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`;
      const response = await fetch(url);
      if (response.ok) {
        const json = await response.json();
        return json;
      }
    } catch (err) {
      console.warn(`[COSMOS API] Radio endpoint unreachable at ${this.baseUrl}/radio/nearby.`, err);
    }
    return {
      success: false,
      location: { latitude, longitude, placeName: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°` },
      searchRadiusKm: radius,
      stations: []
    };
  }
}
