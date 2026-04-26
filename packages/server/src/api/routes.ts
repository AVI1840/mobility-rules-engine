import { app } from './server.js';
import { evaluateHandler } from './handlers/evaluate.js';
import { healthHandler } from './handlers/health.js';
import { backtestHandler } from './handlers/backtest.js';

app.post('/api/v1/evaluate', evaluateHandler);
app.get('/api/v1/health', healthHandler);
app.post('/api/v1/backtest', backtestHandler);
