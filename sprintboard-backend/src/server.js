import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/db.js';
import mongoose from 'mongoose';

const port = Number(process.env.PORT || 4000);
let server;
async function shutdown(signal) {
  console.info(`${signal} received; closing SprintBoard API...`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
}
async function main() {
  await connectDatabase();
  server = app.listen(port, () => console.info(`SprintBoard API listening on http://localhost:${port}`));
  server.requestTimeout = 30_000;
  server.headersTimeout = 35_000;
  server.keepAliveTimeout = 5_000;
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => { console.error('Unhandled rejection:', reason); if (server) server.close(() => process.exit(1)); else process.exit(1); });
main().catch((error) => { console.error('Could not start SprintBoard API:', error.message); process.exit(1); });
