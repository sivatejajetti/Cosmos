import { Router } from 'express';
import { getLiveEarthImages, getNearEarthAsteroids, getLiveSatelliteTLE } from '../controllers/nasaController.js';

const router = Router();

// GET /api/v1/nasa/epic — Live full-globe Earth photos from DSCOVR EPIC satellite
router.get('/nasa/epic', getLiveEarthImages);

// GET /api/v1/nasa/asteroids — Live Near-Earth Asteroids tracked by NASA NeoWs
router.get('/nasa/asteroids', getNearEarthAsteroids);

// GET /api/v1/satellites/tle — Live satellite TLE orbit data from CelesTrak / NORAD
router.get('/satellites/tle', getLiveSatelliteTLE);

export default router;
