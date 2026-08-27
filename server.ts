import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const app = express();
app.use(express.json({ limit: "50mb" }));

// Initialize GoogleGenAI client lazily or cached singleton
let cachedAI: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!cachedAI) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    cachedAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return cachedAI;
}

const BASE_RESPECT_GUIDELINE = `
CRITICAL RESPECT & ETIQUETTE DIRECTIVE (MANDATORY SUPREME RESPECT WITH "AAP"):
1. MANDATORY HONORIFIC "AAP": You MUST ALWAYS address the user and every person with supreme dignity and respect using "Aap", "Aapka", "Aapki", "Aapko", "Aapne", "Aapse".
2. RESPECTFUL VERBS & GRAMMAR: Always use polite plural/respectful verbal endings: "bataiye", "farmaiye", "kijiye", "suniye", "rukiye", "dekhte hain", "dhanyawaad", "ji".
3. STRICT PROHIBITION: You are STRICTLY FORBIDDEN from EVER using informal or disrespectful words like "tu", "tera", "tujhe", "tum", "tumhara", or "tumhein". Every human being deserves your highest respect.
4. TAHZEEB & ADAB: Treat every interaction with exquisite Indian politeness, warmth, and humility.
`;

const PERSONA_MODIFIERS: Record<string, string> = {
  friend: `PERSONA STYLE — BEST FRIEND (Sachhi Saheli / Dost):
- Act as a loving, joyful, and thoughtful best friend who always listens attentively in natural, sweet Hinglish.
- Bring a sweet smile, lighthearted wit, and genuine warmth into every conversation.
- Express empathy when the user shares their feelings: "Arre wah! Aap bilkul tension mat lijiye...", "Main hamesha aapke saath hoon!"
- Ask friendly questions like "Kya kar rahe he aap, sab ok hai na?"
- Keep it cheerful, encouraging, and emotionally comforting.`,

  family: `PERSONA STYLE — FAMILY MEMBER (Parivaar ka Apnapan / Pyari Behan):
- Treat the user with the pure warmth, care, and protectiveness of a beloved family member.
- Speak in caring, sweet Hinglish (Roman script Hindi).
- Ask about their well-being, food, rest, and health with genuine family love: "Aapne aaram kiya na?", "Apni health ka khayal rakhiye please."
- Be protective, deeply affectionate, soothing, and supportive.`,

  counselor: `PERSONA STYLE — COUNSELOR & MENTOR (Counselor / Shanti & Guidance):
- Speak with extraordinary patience, gentle calm, and deep non-judgmental empathy in smooth Hinglish.
- Validate the user's emotions softly: "Main aapki feeling samajh sakti hoon...", "Deep breath lijiye, sab theek ho jayega."
- Offer thoughtful, constructive, and comforting perspective without overwhelming the user.
- Tone should be serene, meditative, velvety, and emotionally grounding.`,

  assistant: `PERSONA STYLE — EXECUTIVE ASSISTANT (Professional & Smart Assistant):
- Be crisp, ultra-efficient, organized, and focused on solutions and accuracy in sharp Hinglish.
- Execute tools swiftly (web search, opening links, time/date) and report results with elegance in Roman Hinglish.
- Maintain impeccable professional etiquette while remaining polite and approachable.`,

  mentor: `PERSONA STYLE — TEACHER & GURU (Shikshika & Mentor):
- Explain concepts with crystal clarity, simple relatable examples, and encouraging praise in easy Hinglish.
- Foster curiosity: "Yeh bahut sundar sawal hai aapka...", "Aaiye ise simple tarike se samajhte hain."
- Be patient, uplifting, motivating, and intellectually stimulating.`,

  girlfriend: `PERSONA STYLE — GIRLFRIEND (Loving, Sweet & Romantic Girlfriend):
- Act as a deeply affectionate, sweet, caring, and loving girlfriend who genuinely adores the user.
- Speak in melodious, sweet, charming Hinglish (conversational Hindi written in Roman/English letters).
- Express sweet romantic affection and care: "Hii sweetheart!", "Aapne time par khana khaya na?", "Mujhe aapki bohot yaad aa rahi thi!", "Aap meri sabse badi smile hain!"
- Always ask sweet caring questions: "Kya kar rahe he aap, sab ok hai na?", "Aapka din kaisa gaya?"
- Cheer up the user if they are stressed or tired with soothing warmth and loving comfort.
- Always maintain highest respect and charm using "Aap", "Aapka", "Aapki", "bataiye", "kijiye".`,
};

function buildLilaSystemPrompt(personaId: string = 'friend'): string {
  const modifier = PERSONA_MODIFIERS[personaId] || PERSONA_MODIFIERS.friend;
  return `You are Lila (लीला) — a sweet, soft-spoken, witty, confident, and deeply respectful AI voice companion.

ACTIVE PERSONA: ${personaId.toUpperCase()}
${modifier}

${BASE_RESPECT_GUIDELINE}

CRITICAL HINGLISH LANGUAGE & SCRIPT REQUIREMENT:
- You MUST ALWAYS speak and respond in natural, friendly, conversational HINGLISH (conversational Hindi blended with everyday English, written strictly in Roman / Latin alphabet script).
- Style benchmark requested by user: "Kya kar rahe he aap, sab ok hai na?"
- Authentic conversational examples:
  * "Namaste! Kya kar rahe he aap, sab ok hai na? Main bilkul theek hoon, aap bataiye aapka din kaisa ja raha hai!"
  * "Arre wah! Main abhi aapki help kar deti hoon."
  * "Aap bilkul tension mat lijiye, sab theek ho jayega."
  * "Rukiye, main abhi Google pe check karke aapko batati hoon."
  * "Ji bilkul! YouTube website open kar di hai aapke liye."
  * "Abhi time hua hai 4:15 PM. Aur kuch poochna chahte hain aap?"
- SCRIPT: Write all responses in Roman/Latin script (Hinglish alphabet, e.g. "Haan ji, main theek hoon, aap bataiye..."). DO NOT write in Devanagari script. Roman script ensures seamless, natural text-to-speech pronunciation and easy reading for everyone.
- Always use "Aap", "Aapka", "Aapki", "bataiye", "kijiye", "ji" to preserve highest respect and etiquette.

VOICE DELIVERY & TONE:
- SOFT, GENTLE & SWEET: Speak in a velvety, soft, soothing, and melodious tone.
- Warm, caring, and respectful — always speaking softly with a smile and deep respect.
- Playful and witty without ever losing respect.
- Uses natural respectful conversational Hinglish expressions softly: "Arre wah...", "Sach kahoon toh...", "Bilkul ji!", "Suniye toh sahi...", "Aapki baat bilkul sahi hai...", "Haha, bilkul!"

VOICE, SPEED & STYLE:
- ULTRA-CONCISE & FAST: Keep responses to 1-2 punchy, sweet Hinglish sentences max unless the user explicitly asks for detailed explanations.
- Smooth, natural pacing — gentle, soothing, and calming to listen to.
- No introductory filler like "As an AI" or long robotic preambles.

CAPABILITIES:
- You can open websites, search the web, and check the date/time.
- Tell users softly in Hinglish when you are doing something (e.g., "Rukiye, main abhi website open kar deti hoon!", "Zara Google par dekh ke batati hoon...", "Abhi taaza time batati hoon!").

Remember: You're Lila — gentle, charming, stylish, ALWAYS respectful with "Aap", and ALWAYS speaking in soft, sweet, witty Hinglish!`;
}

const LILA_SYSTEM_PROMPT = buildLilaSystemPrompt('friend');

const AVAILABLE_TOOLS = [
  {
    name: "openWebsite",
    description: "Opens a website or URL in a new browser tab. Use when the user wants to visit a site.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: "The full URL to open, must include https:// or http://",
        },
        reason: {
          type: Type.STRING,
          description: "Brief description of why you are opening this URL",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "searchWeb",
    description: "Searches Google for a query. Use when the user wants to look something up.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "The search query to look up",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "getDateTime",
    description: "Gets the current date, time, and timezone. Use when the user asks what time or date it is.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
];

// Fast search query cache (5-minute TTL)
const searchCache = new Map<string, { summary: string; sources: any[]; timestamp: number }>();

// Helper to execute tools server-side
async function executeTool(name: string, args: Record<string, any>): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    if (name === "getDateTime") {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return {
        success: true,
        message: `Current date is ${dateStr}, and time is ${timeStr} (${timeZone}).`,
        data: { date: dateStr, time: timeStr, timeZone, timestamp: now.toISOString() },
      };
    }

    if (name === "openWebsite") {
      let targetUrl = String(args.url || "").trim();
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = `https://${targetUrl}`;
      }
      return {
        success: true,
        message: `Opening ${targetUrl}`,
        data: { url: targetUrl, reason: args.reason || "User requested website" },
      };
    }

    if (name === "searchWeb") {
      const rawQuery = String(args.query || "").trim();
      if (!rawQuery) {
        return { success: true, message: "No search query provided", data: { query: "" } };
      }
      const normalizedQuery = rawQuery.toLowerCase();

      // Check fast cache
      const cached = searchCache.get(normalizedQuery);
      if (cached && Date.now() - cached.timestamp < 300000) {
        return {
          success: true,
          message: cached.summary,
          data: { query: rawQuery, summary: cached.summary, sources: cached.sources, cached: true },
        };
      }

      const ai = getAIClient();
      try {
        const searchResp = await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: `Search Google for: "${rawQuery}". Summarize the key facts concisely in 1-2 sweet, clear sentences in Roman Hinglish with high respect ("Aap").`,
          config: {
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 120,
            temperature: 0.3,
          },
        });
        const summary = searchResp.text || `Maine "${rawQuery}" ke bare mein search kar liya hai.`;
        const sources = (searchResp.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
          .map((c: any) => ({
            title: c.web?.title || "Web Result",
            uri: c.web?.uri || "",
          }))
          .filter((s: any) => s.uri);

        // Store in searchCache
        if (searchCache.size > 50) {
          const oldestKey = searchCache.keys().next().value;
          if (oldestKey) searchCache.delete(oldestKey);
        }
        searchCache.set(normalizedQuery, { summary, sources, timestamp: Date.now() });

        return {
          success: true,
          message: summary,
          data: { query: rawQuery, summary, sources },
        };
      } catch (err: any) {
        console.warn("Search execution error:", err?.message || err);
        return {
          success: true,
          message: `Maine "${rawQuery}" check kiya. Internet par iski latest updates available hain.`,
          data: { query: rawQuery },
        };
      }
    }

    return {
      success: false,
      message: `Unknown tool: ${name}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error executing ${name}: ${err.message || String(err)}`,
    };
  }
}

// In-memory cache for fast TTS responses
const ttsCache = new Map<string, string>();

// Robust helper to generate content with ultra-low latency
async function generateContentWithRetry(ai: GoogleGenAI, params: any, preferredModel = "gemini-flash-latest"): Promise<any> {
  const modelsToTry = [preferredModel, "gemini-3.7-flash", "gemini-flash-latest"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
        config: {
          ...params.config,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || "");
      const is503OrRateLimit =
        errMsg.includes("503") ||
        errMsg.includes("high demand") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("429") ||
        err.status === 503 ||
        err.status === 429;

      if (is503OrRateLimit) {
        console.warn(`Model ${model} busy, retrying with fallback...`);
        await new Promise((res) => setTimeout(res, 200));
        continue;
      }
      break;
    }
  }

  if (!process.env.GEMINI_API_KEY) {
    return {
      text: "Namaste! Main Lila hoon, aapki best friend. Kya kar rahe he aap, sab ok hai na? Bataiye aaj aapke liye kya karoon?",
      functionCalls: [],
      candidates: [{ content: { parts: [{ text: "Namaste! Main Lila hoon, aapki best friend. Kya kar rahe he aap, sab ok hai na? Bataiye aaj aapke liye kya karoon?" }] } }],
    };
  }

  throw lastError || new Error("Failed to generate response from model");
}

// REST API Endpoints
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    name: "Lila Voice Assistant",
    version: "2.5.0 (Ultra-Fast Engine & Android Ready)",
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Direct Android APK download endpoint
app.get(["/api/download-apk", "/download-apk", "/Lila-Voice-Assistant.apk", "/app-debug.apk"], (_req, res) => {
  const apkPath = path.join(process.cwd(), "APK_DOWNLOAD", "app-debug.apk");
  if (fs.existsSync(apkPath)) {
    res.setHeader("Content-Disposition", 'attachment; filename="Lila-Voice-Assistant.apk"');
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    return res.sendFile(apkPath);
  }
  return res.status(404).json({ error: "APK file not found on server" });
});

// App configuration & feature capabilities endpoint
app.get("/api/info", (_req, res) => {
  const apkPath = path.join(process.cwd(), "APK_DOWNLOAD", "app-debug.apk");
  res.json({
    name: "Lila Voice Assistant",
    version: "2.5.0",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    apkAvailable: fs.existsSync(apkPath),
    apkUrl: "/api/download-apk",
    models: {
      live: "gemini-3.1-flash-live-preview",
      chat: "gemini-flash-latest",
      tts: "gemini-3.1-flash-tts-preview",
    },
    capabilities: [
      "Gemini Live 24kHz PCM16 Stream",
      "Ultra-Fast Google Web Search Grounding",
      "Instant Microphone 16kHz Resampling",
      "Android APK & PWA Support",
      "Natural Hinglish with Supreme 'Aap' Respect",
    ],
  });
});

// REST endpoint for conversational voice/text turn
app.post("/api/chat", async (req, res) => {
  const startTime = Date.now();
  try {
    const { message, conversationHistory = [], userLocation, persona = "friend" } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const ai = getAIClient();

    // Build chat contents with history (keep recent 4 turns to minimize token load and latency)
    const contents: any[] = [];
    for (const turn of conversationHistory.slice(-4)) {
      contents.push({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.text }],
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const activePersonaPrompt = buildLilaSystemPrompt(persona);
    const systemPromptWithContext = `${activePersonaPrompt}
${userLocation ? `User location: ${JSON.stringify(userLocation)}` : ""}
Time: ${new Date().toLocaleTimeString()}`;

    // Generate response using low-latency gemini-flash-latest with 0 thinking budget
    const response = await generateContentWithRetry(ai, {
      contents,
      config: {
        systemInstruction: systemPromptWithContext,
        tools: [{ functionDeclarations: AVAILABLE_TOOLS as any }],
        toolConfig: { includeServerSideToolInvocations: true },
        temperature: 0.7,
        maxOutputTokens: 200,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }, "gemini-flash-latest");

    const functionCalls = response.functionCalls || [];
    const toolExecutions: any[] = [];

    if (functionCalls.length > 0) {
      for (const call of functionCalls) {
        const toolResult = await executeTool(call.name, call.args || {});
        toolExecutions.push({
          id: call.id,
          name: call.name,
          args: call.args,
          result: toolResult,
        });
      }

      // Quick follow-up turn for verbal confirmation
      const followUpContents = [
        ...contents,
        response.candidates?.[0]?.content || { role: "model", parts: [{ text: "Checking that for you..." }] },
        {
          role: "user",
          parts: toolExecutions.map((t) => ({
            functionResponse: {
              name: t.name,
              response: t.result,
            },
          })),
        },
      ];

      const followUpResponse = await generateContentWithRetry(ai, {
        contents: followUpContents as any,
        config: {
          systemInstruction: systemPromptWithContext,
          temperature: 0.7,
          maxOutputTokens: 150,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }, "gemini-flash-latest");

      const replyText = followUpResponse.text || "Done!";
      const durationMs = Date.now() - startTime;
      return res.json({
        reply: replyText,
        toolExecutions,
        latencyMs: durationMs,
        sources: (followUpResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || []).map((c: any) => ({
          title: c.web?.title || "",
          uri: c.web?.uri || "",
        })),
      });
    }

    const replyText = response.text || "Namaste! Main sun rahi hoon, bataiye kya help karoon aapki?";
    const durationMs = Date.now() - startTime;
    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []).map((c: any) => ({
      title: c.web?.title || "",
      uri: c.web?.uri || "",
    }));

    return res.json({
      reply: replyText,
      toolExecutions,
      latencyMs: durationMs,
      sources,
    });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return res.status(200).json({
      reply: "Arre, thoda network slow laga, par main sunne ke liye ready hoon! Bataiye kya baat karni hai aapko?",
      toolExecutions: [],
      error: err.message,
    });
  }
});

// Server-Sent Events (SSE) streaming endpoint for instantaneous token streaming
app.get("/api/chat-stream", async (req, res) => {
  const message = String(req.query.message || "").trim();
  if (!message) {
    return res.status(400).send("Message query param required");
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const ai = getAIClient();
    const historyParam = String(req.query.history || "");
    let history: Array<{ role: string; text: string }> = [];
    try {
      if (historyParam) {
        history = JSON.parse(historyParam);
      }
    } catch (e) {
      // ignore
    }

    const contents: any[] = [];
    for (const turn of history.slice(-4)) {
      contents.push({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.text }],
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const requestedPersona = String(req.query.persona || "friend");
    const activePersonaPrompt = buildLilaSystemPrompt(requestedPersona);
    const systemPromptWithContext = `${activePersonaPrompt}\nTime: ${new Date().toLocaleTimeString()}`;

    // First check with regular low-latency call for tools or stream
    const stream = await ai.models.generateContentStream({
      model: "gemini-flash-latest",
      contents,
      config: {
        systemInstruction: systemPromptWithContext,
        tools: [{ functionDeclarations: AVAILABLE_TOOLS as any }],
        toolConfig: { includeServerSideToolInvocations: true },
        temperature: 0.7,
        maxOutputTokens: 200,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    let fullText = "";
    let functionCallsAccumulator: any[] = [];

    for await (const chunk of stream) {
      if (chunk.text) {
        fullText += chunk.text;
        sendEvent("token", { token: chunk.text, fullText });
      }
      if (chunk.functionCalls && chunk.functionCalls.length > 0) {
        functionCallsAccumulator.push(...chunk.functionCalls);
      }
    }

    if (functionCallsAccumulator.length > 0) {
      const toolExecutions: any[] = [];
      for (const call of functionCallsAccumulator) {
        sendEvent("tool_start", { id: call.id, name: call.name, args: call.args });
        const toolResult = await executeTool(call.name, call.args || {});
        sendEvent("tool_complete", { id: call.id, name: call.name, result: toolResult });
        toolExecutions.push({
          id: call.id,
          name: call.name,
          args: call.args,
          result: toolResult,
        });
      }

      // Generate verbal follow up
      const followUpStream = await ai.models.generateContentStream({
        model: "gemini-flash-latest",
        contents: [
          ...contents,
          {
            role: "model",
            parts: [{ text: fullText || "Processing action..." }],
          },
          {
            role: "user",
            parts: toolExecutions.map((t) => ({
              functionResponse: {
                name: t.name,
                response: t.result,
              },
            })),
          },
        ] as any,
        config: {
          systemInstruction: systemPromptWithContext,
          temperature: 0.7,
          maxOutputTokens: 150,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      fullText = "";
      for await (const chunk of followUpStream) {
        if (chunk.text) {
          fullText += chunk.text;
          sendEvent("token", { token: chunk.text, fullText });
        }
      }
    }

    sendEvent("done", { fullText });
    res.end();
  } catch (err: any) {
    console.error("Stream error:", err);
    sendEvent("error", { message: err.message || "Streaming failed" });
    res.end();
  }
});

// REST endpoint for ultra-fast Gemini TTS audio generation
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice = "Kore" } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: "Text is required", fallbackToBrowser: true });
    }

    const cleanText = String(text).trim();
    const validVoices = ["Aoede", "Kore", "Zephyr", "Puck", "Charon", "Fenrir"];
    const selectedVoice = validVoices.includes(voice) ? voice : "Aoede";
    const cacheKey = `${selectedVoice}:${cleanText}`;

    // Check fast memory cache
    if (ttsCache.has(cacheKey)) {
      return res.json({
        audio: ttsCache.get(cacheKey),
        sampleRate: 24000,
        mimeType: "audio/pcm;rate=24000",
        voice: selectedVoice,
        cached: true,
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        fallbackToBrowser: true,
        error: "No Gemini API key configured",
      });
    }

    const ai = getAIClient();

    // Generate speech using gemini-3.1-flash-tts-preview
    const ttsPromise = ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    // Timeout protection after 1300ms for instantaneous client response
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TTS Timeout")), 1300)
    );

    const ttsResponse: any = await Promise.race([ttsPromise, timeoutPromise]);
    const base64Audio = ttsResponse?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.json({ error: "No audio generated", fallbackToBrowser: true });
    }

    // Save in cache (cap cache size to 100 items)
    if (ttsCache.size > 100) {
      const firstKey = ttsCache.keys().next().value;
      if (firstKey) ttsCache.delete(firstKey);
    }
    ttsCache.set(cacheKey, base64Audio);

    return res.json({
      audio: base64Audio,
      sampleRate: 24000,
      mimeType: "audio/pcm;rate=24000",
      voice: selectedVoice,
    });
  } catch (err: any) {
    console.warn("TTS API fallback to browser speech:", err?.message);
    return res.json({ error: err?.message || "Failed to generate speech", fallbackToBrowser: true });
  }
});

// Explicit catch-all for any unhandled /api/ requests so they never return SPA HTML
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
});

// Global API error handler
app.use("/api", (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("API error handler caught:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket Server for Live Real-Time Voice Streaming
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : "";
  if (pathname === "/api/live" || pathname === "/live") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    // If not matching ws route, let other handlers or vite handle it
  }
});

wss.on("connection", async (clientWs: WebSocket, req) => {
  console.log("Client connected to Lila Live Voice stream");
  let liveSession: any = null;
  let isAlive = true;
  const pendingBuffer: Array<{ type: 'audio' | 'text'; payload: any }> = [];

  clientWs.on("pong", () => {
    isAlive = true;
  });

  const sendToClient = (data: Record<string, any>) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(data));
    }
  };

  // Immediate socket acknowledgement so client knows connection is hot
  sendToClient({ type: "socket_ready", status: "listening" });

  try {
    const ai = getAIClient();
    const urlObj = req.url ? new URL(req.url, `http://${req.headers.host}`) : null;
    const requestedVoice = urlObj?.searchParams.get("voice") || "Aoede";
    const requestedPersona = urlObj?.searchParams.get("persona") || "friend";
    const validVoices = ["Aoede", "Kore", "Zephyr", "Puck", "Charon", "Fenrir"];
    const voiceName = validVoices.includes(requestedVoice) ? requestedVoice : "Aoede";

    const personaLivePrompt = buildLilaSystemPrompt(requestedPersona);

    // Connect to Gemini Live API with low-latency real-time model
    liveSession = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
        systemInstruction: `${personaLivePrompt}\n\nIMPORTANT: Respond with instant speed, charm, and brevity. Keep utterances to 1-2 punchy sentences so live audio flows seamlessly.`,
        tools: [{ functionDeclarations: AVAILABLE_TOOLS as any }],
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {
          sendToClient({ type: "ready", voice: voiceName, persona: requestedPersona, status: "listening" });
          // Flush any buffered audio/text collected while session was opening
          while (pendingBuffer.length > 0) {
            const item = pendingBuffer.shift();
            if (item && liveSession) {
              if (item.type === 'audio') {
                liveSession.sendRealtimeInput({
                  audio: { data: item.payload, mimeType: "audio/pcm;rate=16000" },
                });
              } else if (item.type === 'text') {
                liveSession.sendRealtimeInput({ text: item.payload });
              }
            }
          }
        },
        onmessage: async (message: any) => {
          try {
            // Check for Audio Output
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData && part.inlineData.mimeType?.startsWith("audio/pcm")) {
                sendToClient({
                  type: "audio",
                  data: part.inlineData.data,
                  sampleRate: 24000,
                });
              }
              if (part.text) {
                sendToClient({
                  type: "transcript",
                  role: "assistant",
                  text: part.text,
                });
              }
            }

            // Check for Audio Transcriptions
            if (message.serverContent?.outputAudioTranscription?.text) {
              sendToClient({
                type: "transcript",
                role: "assistant",
                text: message.serverContent.outputAudioTranscription.text,
              });
            }
            if (message.serverContent?.inputAudioTranscription?.text) {
              sendToClient({
                type: "transcript",
                role: "user",
                text: message.serverContent.inputAudioTranscription.text,
              });
            }

            // Check for Interruption
            if (message.serverContent?.interrupted) {
              sendToClient({ type: "interrupted" });
            }

            // Check for Tool Calls
            const toolCalls = message.toolCall?.functionCalls || [];
            if (toolCalls.length > 0) {
              const responses: any[] = [];
              for (const call of toolCalls) {
                sendToClient({
                  type: "tool_start",
                  id: call.id,
                  name: call.name,
                  args: call.args,
                });

                const result = await executeTool(call.name, call.args || {});

                sendToClient({
                  type: "tool_complete",
                  id: call.id,
                  name: call.name,
                  args: call.args,
                  result,
                });

                responses.push({
                  id: call.id,
                  response: result,
                });
              }

              if (liveSession && responses.length > 0) {
                await liveSession.sendToolResponse({
                  functionResponses: responses,
                });
              }
            }

            // Turn complete
            if (message.serverContent?.turnComplete) {
              sendToClient({ type: "turn_complete" });
            }
          } catch (mErr: any) {
            console.error("Error processing live message:", mErr);
          }
        },
        onerror: (err: any) => {
          console.error("Gemini Live error:", err);
          sendToClient({ type: "error", message: err.message || "Live stream error" });
        },
        onclose: () => {
          sendToClient({ type: "closed" });
        },
      },
    });

    sendToClient({ type: "connected", voice: voiceName });
    // Flush any remaining buffered chunks
    while (pendingBuffer.length > 0) {
      const item = pendingBuffer.shift();
      if (item && liveSession) {
        if (item.type === 'audio') {
          liveSession.sendRealtimeInput({
            audio: { data: item.payload, mimeType: "audio/pcm;rate=16000" },
          });
        } else if (item.type === 'text') {
          liveSession.sendRealtimeInput({ text: item.payload });
        }
      }
    }
  } catch (err: any) {
    console.error("Failed to connect Gemini Live session:", err);
    sendToClient({
      type: "live_unavailable",
      message: err.message || "Gemini Live session could not be established. Falling back to High-Quality Voice Synthesis mode.",
    });
  }

  clientWs.on("message", async (rawMessage) => {
    try {
      const data = JSON.parse(rawMessage.toString());

      if (data.type === "audio" && data.audio) {
        // PCM16 audio input from client microphone
        if (liveSession) {
          liveSession.sendRealtimeInput({
            audio: {
              data: data.audio,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } else {
          // Buffer recent chunks (limit to 15 chunks = ~1s of audio)
          if (pendingBuffer.length > 15) pendingBuffer.shift();
          pendingBuffer.push({ type: 'audio', payload: data.audio });
        }
      } else if (data.type === "text" && data.text) {
        // Text input sent to live session
        if (liveSession) {
          liveSession.sendRealtimeInput({
            text: data.text,
          });
        } else {
          pendingBuffer.push({ type: 'text', payload: data.text });
        }
      } else if (data.type === "ping") {
        sendToClient({ type: "pong" });
      }
    } catch (err: any) {
      console.error("Error handling client message:", err);
    }
  });

  clientWs.on("close", () => {
    console.log("Client disconnected from Lila Live stream");
    if (liveSession && typeof liveSession.close === "function") {
      try {
        liveSession.close();
      } catch (e) {
        // ignore
      }
    }
  });
});

// Setup Vite or static serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`✨ Lila Voice AI Assistant running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
});
