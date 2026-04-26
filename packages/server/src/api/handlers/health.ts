import type { Request, Response } from 'express';
import { engine } from '../server.js';

export function healthHandler(_req: Request, res: Response): void {
  const healthStatus = engine.getHealth();
  res.status(200).json({
    status: 'success',
    data: healthStatus,
  });
}
