import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClientApp } from './apps/client/server.js';
import { createNetCityRouter } from './netcity-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Mount v2 client app at root
app.use(createClientApp());

// Backwards compatibility: keep MVP router mounted at /netcity
app.use('/netcity', createNetCityRouter());

const server = app.listen(PORT, () => {
  console.log(`NetCity v2.0 running at http://localhost:${PORT}`);
  console.log(`Legacy MVP routes at http://localhost:${PORT}/netcity/host-demo.html`);
});

export { app, server };
export default app;
