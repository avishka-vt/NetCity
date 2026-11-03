import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export function createClientApp() {
  const app = express();

  // Serve client public assets
  app.use(express.static(path.join(__dirname, 'public')));

  // Serve client src for direct ESM imports
  app.use('/src', express.static(path.join(__dirname, 'src')));

  // Serve packages for direct ESM imports in development
  app.use('/packages', express.static(path.join(rootDir, 'packages')));

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  return app;
}

const PORT = process.env.PORT || 3000;
const app = createClientApp();

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isMainModule && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`NetCity v2.0 Standalone Game running at: http://localhost:${PORT}`);
  });
}

export default app;
