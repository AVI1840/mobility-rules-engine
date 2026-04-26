import { app } from './api/server.js';
import './api/routes.js';

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Mobility Rules Engine API running on port ${PORT}`);
});
