import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Simulated Action Confirmation (Email Echo)
  app.post("/api/confirm-action", (req, res) => {
    const { userId, action, timestamp } = req.body;
    
    console.log(`[IDENTITY_PULSE] Transmission sent for user ${userId}:`);
    console.log(`[ACTION] ${action}`);
    console.log(`[TIME] ${new Date(timestamp).toISOString()}`);
    console.log(`[STATUS] SUCCESS_ECHO`);

    // In a production environment with a Resend/SendGrid key, 
    // we would call the mailer here.
    
    res.json({ 
      status: "transmitted", 
      echo: `PROTOCOL_${action.toUpperCase()}_CONFIRMED`,
      deliveryMode: "electronic_echo"
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
