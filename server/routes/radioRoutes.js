import { Router } from 'express';
import { getNearbyRadioStations } from '../controllers/radioController.js';

const router = Router();

// GET /api/v1/radio/nearby?latitude=...&longitude=...&radius=50
router.get('/radio/nearby', getNearbyRadioStations);

export default router;
