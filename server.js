import express from 'express';
import { createClientApp } from './apps/client/server.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Mount v2 client app at root
app.use(createClientApp());

const server = app.listen(PORT, () => {
  console.log(`NetCity v2.0 running at http://localhost:${PORT}`);
});

export { app, server };
export default app;
