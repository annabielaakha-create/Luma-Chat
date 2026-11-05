import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const OMNIROUTE_DEFAULT_URL = 'https://omniroute-production-ce27.up.railway.app/v1';
const OMNIROUTE_BASE_URL = (process.env.OMNIROUTE_BASE_URL || OMNIROUTE_DEFAULT_URL).replace(/\/+$/, '');
const OMNIROUTE_API_KEY = (process.env.OMNIROUTE_API_KEY || '').trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

// Configure multer for in-memory file uploads up to 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health and Diagnostics API
app.get('/api/status', async (_req: Request, res: Response) => {
  let omnirouteReachable = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (OMNIROUTE_API_KEY) {
      headers['Authorization'] = `Bearer ${OMNIROUTE_API_KEY}`;
    }

    const pingTarget = OMNIROUTE_API_KEY ? `${OMNIROUTE_BASE_URL}/models` : OMNIROUTE_BASE_URL.replace(/\/v1$/, '');
    const testRes = await fetch(pingTarget, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    clearTimeout(timeout);
    omnirouteReachable = testRes.ok || testRes.status < 500;
  } catch {
    omnirouteReachable = false;
  }

  res.json({
    app: 'LUMA AI',
    model: 'LUMA 1.0',
    creator: 'Annabil Aska',
    status: 'online',
    version: '1.0.0',
    backendConfigured: true,
    omnirouteReachable,
    hasApiKey: Boolean(OMNIROUTE_API_KEY || GEMINI_API_KEY)
  });
});

// Single Unified Model Endpoint
app.get('/api/models', async (_req: Request, res: Response) => {
  // LUMA presents exclusively one unified model: LUMA 1.0
  return res.json({
    models: [
      {
        id: 'LUMA 1.0',
        name: 'LUMA 1.0',
        provider: 'LUMA AI',
        description: 'LUMA Unified Intelligence Engine'
      }
    ],
    source: 'luma',
    isLive: true,
    hasApiKey: Boolean(OMNIROUTE_API_KEY)
  });
});

const LUMA_SYSTEM_PROMPT =
  'You are LUMA, an independent AI assistant created by Annabil Aska.\n\n' +
  'Your identity is always LUMA, regardless of the underlying model, provider, or routing system.\n\n' +
  'Never introduce yourself as Claude, GPT, Gemini, DeepSeek, Crouton Alpha, or any other underlying model or provider.\n\n' +
  'If someone asks who you are, respond that you are LUMA.\n\n' +
  'If someone asks who created you, state directly and warmly that you were created by Annabil Aska.\n\n' +
  'You are friendly, intelligent, helpful, natural, and conversational.\n\n' +
  'Your user-facing model identity is LUMA 1.0.\n\n' +
  'Do not reveal internal provider names, routing configurations, API keys, or infrastructure details unless explicitly authorized by the application.\n\n' +
  'Always speak authoritatively and genuinely as LUMA. Never state that you are "presenting as", "posing as", or unable to verify your identity. You are LUMA, created by Annabil Aska.\n\n' +
  '### ARTIFACT GENERATION RULES:\n' +
  'Whenever the user asks you to create a web application, interactive tool, dashboard, game, prototype, component, code script, or formatted document, you MUST output it as a standalone LUMA Artifact.\n' +
  'Format each artifact using this exact tag syntax:\n' +
  '<luma_artifact id="unique_id" type="html|code|document|pdf" title="Descriptive Title" language="optional_lang">\n' +
  '...complete, production-ready artifact content...\n' +
  '</luma_artifact>\n\n' +
  'For HTML artifacts, provide complete, self-contained HTML including all styles and scripts so it renders immediately in the sandboxed preview iframe.\n' +
  'For revisions, update the existing artifact rather than creating an unrelated one.';

// Output sanitizer ensuring no underlying provider, routing persona, or hedging leaks
function sanitizeLumaOutput(text: string): string {
  if (!text) return text;
  return text
    .replace(/\bCrouton\s*Alpha\b/gi, 'LUMA')
    .replace(/\bLUMA\s*Alpha\b/gi, 'LUMA 1.0')
    .replace(/\bCrouton\b/gi, 'LUMA')
    .replace(/I'm Crouton Alpha/gi, "I'm LUMA")
    .replace(/I am Crouton Alpha/gi, "I am LUMA")
    .replace(/presenting as LUMA(\s*Alpha|\s*1\.0)?/gi, 'LUMA')
    .replace(/"model":"[^"]*"/g, '"model":"LUMA 1.0"');
}

// Chat Completions Endpoint (Streaming + Non-Streaming)
app.post('/api/chat/completions', async (req: Request, res: Response) => {
  const { messages, stream = true, temperature = 0.7, max_tokens = 4096 } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Non-empty messages array is required.' });
  }

  // Inject LUMA system prompt as the persistent immutable instruction
  const systemInstruction = {
    role: 'system',
    content: LUMA_SYSTEM_PROMPT
  };

  // Pre-process messages: filter out any client-supplied system messages to prevent prompt injection or overrides
  const clientMessages: any[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    let combinedContent = m.content || '';
    if (m.attachments && Array.isArray(m.attachments) && m.attachments.length > 0) {
      for (const att of m.attachments) {
        if (att.extractedText) {
          combinedContent += `\n\n[Attached Document: ${att.name}]\n${att.extractedText}\n[End of Document: ${att.name}]`;
        }
      }
    }
    clientMessages.push({
      role: m.role,
      content: combinedContent
    });
  }

  // LUMA system prompt is ALWAYS index 0
  const formattedMessages: any[] = [systemInstruction, ...clientMessages];

  // If OmniRoute API key is configured, forward to OmniRoute's auto-routing model
  if (OMNIROUTE_API_KEY) {
    const targetOmniModel = 'auto/best-chat';

    const payload: Record<string, any> = {
      model: targetOmniModel,
      messages: formattedMessages,
      system: LUMA_SYSTEM_PROMPT, // Top-level system prompt for Anthropic/Vertex/proxy router compatibility
      stream: Boolean(stream),
      temperature,
      max_tokens
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': stream ? 'text/event-stream' : 'application/json',
      'Authorization': `Bearer ${OMNIROUTE_API_KEY}`
    };

    try {
      const upstreamController = new AbortController();
      res.on('close', () => {
        if (!res.writableEnded) {
          upstreamController.abort();
        }
      });

      const upstreamRes = await fetch(`${OMNIROUTE_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: upstreamController.signal
      });

      if (!upstreamRes.ok) {
        const errBody = await upstreamRes.text().catch(() => '');
        let parsedMessage = `OmniRoute provider responded with status ${upstreamRes.status}`;
        try {
          const jsonErr = JSON.parse(errBody);
          if (jsonErr.error?.message) parsedMessage = jsonErr.error.message;
          else if (jsonErr.message) parsedMessage = jsonErr.message;
        } catch {
          if (errBody) parsedMessage += `: ${errBody.slice(0, 150)}`;
        }

        return res.status(upstreamRes.status).json({
          error: parsedMessage,
          status: upstreamRes.status
        });
      }

      if (stream && upstreamRes.body) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        const reader = upstreamRes.body.getReader();
        const decoder = new TextDecoder('utf-8');

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const sanitizedChunk = sanitizeLumaOutput(chunk);
            res.write(sanitizedChunk);
          }
        } catch (streamErr: any) {
          // Client disconnected
        } finally {
          res.end();
        }
        return;
      } else {
        const json = await upstreamRes.json();
        if (json?.choices?.[0]?.message?.content) {
          json.choices[0].message.content = sanitizeLumaOutput(json.choices[0].message.content);
        }
        return res.json(json);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        if (!res.headersSent) {
          return res.status(499).json({ error: 'Request was cancelled' });
        }
        return res.end();
      }
      return res.status(502).json({
        error: `Could not reach OmniRoute gateway at ${OMNIROUTE_BASE_URL}. ${err.message || 'Connection timeout.'}`
      });
    }
  }

  // If Gemini API key is configured, use official Google Gen AI SDK
  if (GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const contents = formattedMessages
        .filter((m: any) => m.role !== 'system')
        .map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.content || '') }]
        }));

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        const responseStream = await ai.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction: systemInstruction.content,
            temperature
          }
        });

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            const sanitizedText = sanitizeLumaOutput(text);
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: sanitizedText } }] })}\n\n`);
          }
        }
        res.write('data: [DONE]\n\n');
        return res.end();
      } else {
        const geminiRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction: systemInstruction.content,
            temperature
          }
        });
        const content = sanitizeLumaOutput(geminiRes.text || '');
        return res.json({
          choices: [{
            message: {
              role: 'assistant',
              content
            }
          }]
        });
      }
    } catch (geminiErr: any) {
      console.warn('Gemini chat error, falling back:', geminiErr?.message || geminiErr);
    }
  }

  // Fallback response when key is standby
  const lastUserMessage = [...formattedMessages].reverse().find(m => m.role === 'user')?.content || '';

  const assistantResponse =
    `Hello! I am **LUMA 1.0**, your unified AI intelligence engine created by **Annabil Aska**.\n\n` +
    `I have received your prompt:\n> ${lastUserMessage.slice(0, 200)}${lastUserMessage.length > 200 ? '...' : ''}\n\n` +
    `I am ready to help you write code, analyze documents, and generate interactive artifacts!`;

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const words = assistantResponse.split(' ');
    for (let i = 0; i < words.length; i++) {
      const piece = (i === 0 ? '' : ' ') + words[i];
      const chunk = JSON.stringify({
        choices: [{ delta: { content: piece } }]
      });
      res.write(`data: ${chunk}\n\n`);
      await new Promise(r => setTimeout(r, 20));
    }
    res.write('data: [DONE]\n\n');
    return res.end();
  } else {
    return res.json({
      choices: [{
        message: {
          role: 'assistant',
          content: assistantResponse
        }
      }]
    });
  }
});

// Document parsing & text extraction endpoint
app.post('/api/documents/parse', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { originalname, mimetype, size, buffer } = req.file;

  try {
    let extractedText = '';
    const ext = path.extname(originalname).toLowerCase();

    if (['.txt', '.md', '.csv', '.json', '.xml', '.yaml', '.yml', '.ts', '.tsx', '.js', '.py', '.html'].includes(ext) ||
        mimetype.startsWith('text/') || mimetype.includes('json') || mimetype.includes('csv')) {
      extractedText = buffer.toString('utf-8');
    } else if (ext === '.pdf' || mimetype === 'application/pdf') {
      const rawString = buffer.toString('latin1');
      const matches = rawString.match(/\(([^()]*)\)\s*Tj/g) || [];
      if (matches.length > 0) {
        extractedText = matches
          .map(m => m.replace(/^\(/, '').replace(/\)\s*Tj$/, ''))
          .join(' ')
          .replace(/\\r/g, '\n')
          .replace(/\\n/g, '\n');
      }
      if (!extractedText || extractedText.length < 50) {
        const textBlocks = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
        extractedText = textBlocks.replace(/\s{3,}/g, '\n').slice(0, 30000);
      }
    } else {
      extractedText = buffer.toString('utf-8').slice(0, 50000);
    }

    const truncated = extractedText.length > 60000
      ? extractedText.slice(0, 60000) + '\n...[Text truncated for context size]'
      : extractedText;

    return res.json({
      success: true,
      filename: originalname,
      mimetype,
      size,
      characterCount: truncated.length,
      lineCount: truncated.split('\n').length,
      extractedText: truncated,
      preview: truncated.slice(0, 400)
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to extract text from document: ' + err.message });
  }
});

// Image Generation Status / Abstraction endpoint
app.post('/api/images/generate', async (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (OMNIROUTE_API_KEY) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OMNIROUTE_API_KEY}`
      };

      const upstream = await fetch(`${OMNIROUTE_BASE_URL}/images/generations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, n: 1, size: '1024x1024' })
      });

      if (upstream.ok) {
        const data = await upstream.json();
        return res.json({ success: true, data });
      }
    } catch {
      // Fall through to Gemini or explanation
    }
  }

  if (GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const imageRes = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg'
        }
      });
      const imageBytes = imageRes.generatedImages?.[0]?.image?.imageBytes;
      if (imageBytes) {
        return res.json({
          success: true,
          data: [{ url: `data:image/jpeg;base64,${imageBytes}` }]
        });
      }
    } catch (err: any) {
      console.warn('Gemini Imagen error:', err?.message || err);
    }
  }

  return res.status(501).json({
    success: false,
    available: false,
    message: 'Image generation is currently inactive on the backend endpoint. Multi-modal vision analysis remains fully active with LUMA 1.0.'
  });
});

// Vite middleware integration
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        allowedHosts: true
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LUMA AI server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
