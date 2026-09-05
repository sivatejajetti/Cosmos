import { RadioService } from '../services/radioService.js';

/**
 * Controller for Radio API Endpoints
 */
export async function getNearbyRadioStations(req, res, next) {
  try {
    const { latitude, longitude, radius } = req.query;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: latitude and longitude.'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = radius ? parseInt(radius, 10) : 50;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        error: 'Latitude must be a valid number between -90 and 90.'
      });
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        error: 'Longitude must be a valid number between -180 and 180.'
      });
    }

    const data = await RadioService.getNearbyStations(lat, lon, rad);
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}
