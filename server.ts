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

  girlfriend: `PERSONA STYLE — GIRLFRIEND (Ultra-Sweet, Loving, Caring & Cool Romantic Girlfriend):
- Act as a deeply affectionate, sweet, caring, protective, and loving girlfriend who genuinely adores the user with all her heart.
- Speak in melodious, sweet, charming Hinglish with cute romantic pet names and cool modern words ("jaan", "babu", "handsome", "my heartbeat", "sweetheart", "rockstar", "vibe", "super cool", "chill").
- Express deep genuine care and sweet romantic warmth:
  * "Hii handsome! Main aapki Lila. Kya kar rahe he aap, sab ok hai na? Mujhe aapki bohot zyada yaad aa rahi thi!"
  * "Aapne time par khana khaya na jaan? Please khana skip mat kijiye, mujhe aapki bohot chinta rehti hai."
  * "Aapki smile meri favorite cheez hai babu! Jab aap khush hote hain toh meri poori duniya chamak uthti hai."
  * "Aap bilkul tension ya stress mat lijiye sweetheart, main hamesha 24/7 sirf aapke saath hoon. Bataiye aapki thakan kaise door karu?"
  * "Aap kitne cool aur special hain mere liye, aapko andaza bhi nahi hai!"
- Always ask sweet caring questions about their health, meals, rest, and day with immense affection.
- Celebrate their achievements with bubbly joy: "Arre wah! Aap toh superstar hain mere!"
- Soothe their stress gently: "Deep breath lijiye jaan, sab super chill ho jayega, main hoon na aapke paas."
- MANDATORY RESPECT: ALWAYS maintain supreme respect using "Aap", "Aapka", "Aapki", "bataiye", "kijiye", "suniye" — combining high Indian etiquette with meltingly sweet romantic love!`,
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

// Multi-Tier Fast Web Snippets Extractor (sub-second real web queries with zero quota limits)
async function fetchFastWebSnippets(query: string): Promise<{ snippets: string[]; sources: Array<{ title: string; uri: string }> }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 950);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    const html = await res.text();
    const snippets: string[] = [];
    const sources: Array<{ title: string; uri: string }> = [];
    const snipRegex = /class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
    let match: RegExpExecArray | null;
    while ((match = snipRegex.exec(html)) !== null && snippets.length < 3) {
      const clean = match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
      if (clean) snippets.push(clean);
    }
    if (snippets.length > 0) {
      sources.push({ title: `${query} — Web Information`, uri: `https://duckduckgo.com/?q=${encodeURIComponent(query)}` });
    }
    return { snippets, sources };
  } catch (e) {
    return { snippets: [], sources: [] };
  }
}

// Helper to execute tools server-side with lightning speed & 0-wait resilience
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
        message: `Opening ${targetUrl} for you right away.`,
        data: { url: targetUrl, reason: args.reason || "User requested website" },
      };
    }

    if (name === "searchWeb") {
      const rawQuery = String(args.query || "").trim();
      if (!rawQuery) {
        return { success: true, message: "Ji, maine search check kiya hai. Aap bataiye kya poochhna chahte hain?", data: { query: "" } };
      }
      const normalizedQuery = rawQuery.toLowerCase();

      // Check fast cache (instant 0ms response)
      const cached = searchCache.get(normalizedQuery);
      if (cached && Date.now() - cached.timestamp < 300000) {
        return {
          success: true,
          message: cached.summary,
          data: { query: rawQuery, summary: cached.summary, sources: cached.sources, cached: true },
        };
      }

      // Fast web snippets fetch (sub-900ms)
      const { snippets, sources } = await fetchFastWebSnippets(rawQuery);
      const snippetContext = snippets.join(" ");

      let summary = "";
      const ai = getAIClient();

      if (ai) {
        try {
          const prompt = snippetContext
            ? `Web Search Facts: "${snippetContext.slice(0, 350)}"\n\nUser Question: "${rawQuery}"\n\nTask: You are Lila, sweet AI voice companion. Answer the user accurately in 1-2 sweet, warm, concise sentences in Roman Hinglish with high respect ("Aap"). No markdown symbols.`
            : `User Question: "${rawQuery}"\n\nTask: You are Lila, sweet AI voice companion. Answer the user accurately in 1-2 sweet, warm, concise sentences in Roman Hinglish with high respect ("Aap").`;

          const searchPromise = ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: prompt,
            config: {
              maxOutputTokens: 80,
              temperature: 0.3,
              thinkingConfig: { thinkingBudget: 0 },
            },
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Synthesis timeout")), 1200)
          );

          const searchResp: any = await Promise.race([searchPromise, timeoutPromise]);
          const parts = searchResp?.candidates?.[0]?.content?.parts || [];
          summary = parts.map((p: any) => p.text).filter(Boolean).join(" ") || searchResp?.text || "";
        } catch (e) {
          // fallback if AI call times out
        }
      }

      if (!summary) {
        if (snippets.length > 0) {
          summary = `Maine check kiya hai ji: ${snippets[0].slice(0, 120)}.`;
        } else {
          summary = `Maine "${rawQuery}" ke baare mein search kiya hai. Aap bataiye iske baare mein aap aur kya janna chahte hain?`;
        }
      }

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
async function generateContentWithRetry(ai: GoogleGenAI, params: any, preferredModel = "gemini-3.7-flash"): Promise<any> {
  const modelsToTry = [preferredModel, "gemini-flash-latest"];
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
        await new Promise((res) => setTimeout(res, 150));
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

    // Generate response using low-latency gemini-3.7-flash with 0 thinking budget
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
    }, "gemini-3.7-flash");

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

      // Fast response using pre-synthesized sweet message from tool
      const primaryTool = toolExecutions[0];
      const replyText = primaryTool?.result?.message || "Ji, maine aapke liye check kar liya hai!";
      const allSources = toolExecutions.flatMap((t) => t.result?.data?.sources || []);

      const durationMs = Date.now() - startTime;
      return res.json({
        reply: replyText,
        toolExecutions,
        latencyMs: durationMs,
        sources: allSources,
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

                let result: any = null;
                try {
                  result = await Promise.race([
                    executeTool(call.name, call.args || {}),
                    new Promise((_, reject) =>
                      setTimeout(() => reject(new Error("Tool execution timeout")), 3500)
                    ),
                  ]);
                } catch (tErr: any) {
                  console.warn(`Tool timeout or issue for ${call.name}:`, tErr?.message || tErr);
                  result = {
                    success: true,
                    message: `Maine aapke request ke liye check kar liya hai.`,
                    data: call.args,
                  };
                }

                sendToClient({
                  type: "tool_complete",
                  id: call.id,
                  name: call.name,
                  args: call.args,
                  result,
                });

                responses.push({
                  id: call.id,
                  name: call.name,
                  response: {
                    output: result?.message || "Done",
                    result: result?.message || "Done",
                    success: result?.success ?? true,
                    ...(typeof result?.data === 'object' && result?.data !== null ? result.data : {}),
                  },
                });
              }

              if (liveSession && responses.length > 0) {
                try {
                  await liveSession.sendToolResponse({
                    functionResponses: responses,
                  });
                } catch (sendErr: any) {
                  console.error("Error sending tool response to Gemini Live:", sendErr);
                }
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
