import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase limit to handle larger base64 image uploads
app.use(express.json({ limit: "15mb" }));

// Initialize the standard Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Endpoint: AI Diagnosis
app.post("/api/diagnose", async (req: express.Request, res: express.Response) => {
  try {
    const { image, mimeType } = req.body;

    if (!image || !mimeType) {
      res.status(400).json({ error: "Por favor, forneça uma imagem e o seu tipo MIME correto." });
      return;
    }

    let finalBase64 = "";
    if (image.startsWith("http://") || image.startsWith("https://")) {
      // It is a sandbox URL, fetch it on the server side
      const imgRes = await fetch(image);
      const arrayBuffer = await imgRes.arrayBuffer();
      finalBase64 = Buffer.from(arrayBuffer).toString("base64");
    } else {
      // It's a local base64 upload, strip the content type prefix
      finalBase64 = image.includes(";base64,") 
        ? image.split(";base64,")[1] 
        : image;
    }

    // Standardize Gemini API structured schema to guarantee the Portuguese JSON required by the user
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: finalBase64,
          },
        },
        {
          text: `Tu és um botânico especialista e fitopatologista de IA altamente qualificado. 
Analisa detalhadamente a foto desta folha ou planta.
Deves identificar qual é a planta, avaliar a sua saúde, diagnosticar quaisquer problemas observados (doenças, fungos, insetos, stress hídrico, queimadura solar, deficiência de nutrientes) e receitar o tratamento ideal.

Deves obrigatoriamente responder em português de Portugal e usar EXCLUSIVAMENTE o seguinte formato de objeto JSON com as chaves exatas:
{
  "planta": "Nome comum e científico da planta analisada",
  "estado_saude": "Uma destas exatas opções: Saudável / Doente / Stress Hídrico / Deficiência de Nutrientes",
  "diagnostico": "Descrição detalhada do que foi observado na imagem (patologias, manchas, anomalias, etc.)",
  "tratamento": "Passos práticos passo-a-passo detalhados e recomendações para tratar e recuperar a planta (ou manutenção, se estiver saudável)"
}`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            planta: {
              type: Type.STRING,
              description: "Nome comum e científico da planta.",
            },
            estado_saude: {
              type: Type.STRING,
              description: "Estado de saúde (Saudável / Doente / Stress Hídrico / Deficiência de Nutrientes).",
            },
            diagnostico: {
              type: Type.STRING,
              description: "Descrição detalhada do que foi observado nas folhas ou planta.",
            },
            tratamento: {
              type: Type.STRING,
              description: "Passos práticos e recomendações de tratamento.",
            },
          },
          required: ["planta", "estado_saude", "diagnostico", "tratamento"],
        },
      },
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("O modelo não retornou um conteúdo válido.");
    }

    try {
      const parsedJson = JSON.parse(textResponse.trim());
      res.json(parsedJson);
    } catch (parseError) {
      console.error("Erro ao fazer parse do JSON do Gemini:", textResponse);
      // Fallback: Tentativa de extrair qualquer JSON se falhar
      res.status(500).json({
        error: "Resposta do modelo inválida.",
        raw: textResponse,
      });
    }
  } catch (error: any) {
    console.error("Erro no diagnóstico:", error);
    res.status(500).json({
      error: error.message || "Ocorreu um erro ao processar o diagnóstico com a IA.",
    });
  }
});

// Configure Vite integration
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Servidor] Ativo em http://localhost:${PORT}`);
  });
}

setupVite();
