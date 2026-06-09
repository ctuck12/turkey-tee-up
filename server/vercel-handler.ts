// Vercel serverless function entry point
// Using CommonJS exports directly to avoid ESM/CJS interop issues

import express from "express";
import { registerRoutes } from "./routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
registerRoutes(app);

function handler(req: any, res: any) {
  return app(req, res);
}

// Export for Vercel @vercel/node runtime
export { handler };
export default handler;
