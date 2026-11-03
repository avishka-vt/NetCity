import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates the NetCity Express router.
 * The host adds one line: app.use('/netcity', createNetCityRouter());
 * @param {object} [options]
 * @returns {express.Router}
 */
export function createNetCityRouter(options = {}) {
  const router = express.Router();
  const publicDir = options.publicDir || path.join(__dirname, 'public');

  // Serve all static files from public (game/, index.html, host-demo.html, etc.)
  router.use(express.static(publicDir));

  // Default route: index.html for development full window
  router.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  return router;
}
