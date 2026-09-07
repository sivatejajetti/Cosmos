import { NasaService } from '../services/nasaService.js';

/**
 * Express Controller for NASA Open APIs & Live Satellite Telemetry
 */
export async function getLiveEarthImages(req, res, next) {
  try {
    const data = await NasaService.getLiveEarthImages();
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

export async function getNearEarthAsteroids(req, res, next) {
  try {
    const data = await NasaService.getNearEarthAsteroids();
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

export async function getLiveSatelliteTLE(req, res, next) {
  try {
    const group = req.query.group || 'active';
    const data = await NasaService.getLiveSatelliteTLE(group);
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}
