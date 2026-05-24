import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

console.log("Server module loading...");

let genAI: any = null;
function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    genAI = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAI;
}

async function startServer() {
  console.log("Starting server function...");
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Gemini Proxy Routes
  app.post("/api/ai/generate", async (req, res) => {
    try {
      const { model, contents, config } = req.body;
      const ai = getGenAI();
      
      const result = await ai.models.generateContent({
        model: model || "gemini-3-flash-preview",
        contents,
        config
      });
      res.json(result);
    } catch (error: any) {
      console.error("Gemini Proxy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { model, systemInstruction, contents } = req.body;
      const ai = getGenAI();
      
      const chat = ai.chats.create({
        model: model || "gemini-3-flash-preview",
        config: { systemInstruction }
      });
      
      const lastMessage = contents[contents.length - 1].parts[0].text;
      const result = await chat.sendMessage({ message: lastMessage });
      res.json(result);
    } catch (error: any) {
      console.error("Gemini Chat Proxy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Running in development mode with Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in production mode, serving static files...");
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on 0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
