import express from 'express';
import cors from 'cors';
import { RulesEngine } from '../core/engine.js';
import { mobilityDomainModule } from '../domains/mobility/module.js';

// Initialize engine with mobility domain
const engine = new RulesEngine();
engine.loadDomainModule(mobilityDomainModule);

export const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    /\.github\.io$/,
    /\.ngrok-free\.app$/,
    /\.ngrok\.io$/,
    /\.vercel\.app$/,
  ],
  credentials: true,
}));
app.use(express.json());

// Error handling for malformed JSON
app.use((err: Error & { type?: string }, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({
      status: 'error',
      error: { code: 'MALFORMED_REQUEST', message: 'Invalid JSON in request body', details: [] },
    });
    return;
  }
  next(err);
});

export { engine };
