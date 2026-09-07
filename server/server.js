import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import healthRoutes from './routes/healthRoutes.js';
import objectRoutes from './routes/objectRoutes.js';
import wikiRoutes from './routes/wikiRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import radioRoutes from './routes/radioRoutes.js';
import nasaRoutes from './routes/nasaRoutes.js';

/**
 * COSMOS Node.js + Express API Backend Server (NASA APIs & Earth FM Radio Integration)
 */
const app = express();

// 1. Configure Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50kb' })); // Hard cap body size for security
app.use(requestLogger);

// 2. Register API v1 Versioned Routes
app.use('/api/v1', healthRoutes);
app.use('/api/v1', objectRoutes);
app.use('/api/v1', wikiRoutes);
app.use('/api/v1', aiRoutes);
app.use('/api/v1', radioRoutes);
app.use('/api/v1', nasaRoutes);

// 3. Fallback Route & Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

// 4. Start Server Listener
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  const server = app.listen(ENV.PORT, () => {
    console.log(`================================================`);
    console.log(`🚀 COSMOS Backend API running on port ${ENV.PORT}`);
    console.log(`📡 Health Check: http://localhost:${ENV.PORT}/api/v1/health`);
    console.log(`🌌 Objects API:  http://localhost:${ENV.PORT}/api/v1/objects`);
    console.log(`📚 Wikipedia:    http://localhost:${ENV.PORT}/api/v1/wikipedia/earth`);
    console.log(`🤖 AI Explain:   http://localhost:${ENV.PORT}/api/v1/ai/explain`);
    console.log(`📻 Earth FM:     http://localhost:${ENV.PORT}/api/v1/radio/nearby?latitude=20.59&longitude=78.96`);
    console.log(`🚀 NASA EPIC:    http://localhost:${ENV.PORT}/api/v1/nasa/epic`);
    console.log(`☄️  NASA Asteroids: http://localhost:${ENV.PORT}/api/v1/nasa/asteroids`);
    console.log(`📡 Live Sat TLE: http://localhost:${ENV.PORT}/api/v1/satellites/tle`);
    console.log(`================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`ℹ COSMOS Express API is active on port ${ENV.PORT}: http://localhost:${ENV.PORT}/api/v1/health`);
    } else {
      console.error('Express Server error:', err);
    }
  });
}

export default app;
