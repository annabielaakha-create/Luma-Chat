import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const OMNIROUTE_DEFAULT_URL = 'https://omniroute-production-ce27.up.railway.app/v1';
const OMNIROUTE_BASE_URL = (process.env.OMNIROUTE_BASE_URL || OMNIROUTE_DEFAULT_URL).replace(/\/+$/, '');
const OMNIROUTE_API_KEY = (process.env.OMNIROUTE_API_KEY || '').trim();

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
    creator: 'Luma Studio',
    status: 'online',
    version: '1.0.0',
    backendConfigured: true,
    omnirouteReachable,
    hasApiKey: Boolean(OMNIROUTE_API_KEY)
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

// Chat Completions Endpoint (Streaming + Non-Streaming)
app.post('/api/chat/completions', async (req: Request, res: Response) => {
  const { messages, stream = true, temperature = 0.7, max_tokens = 4096 } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Non-empty messages array is required.' });
  }

  // Inject LUMA system prompt so the assistant generates rich artifacts
  const systemInstruction = {
    role: 'system',
    content:
      'You are LUMA AI, an independent, multi-model AI workspace created by Luma Studio. Your official model identifier is LUMA 1.0.\n\n' +
      '### ARTIFACT GENERATION RULES:\n' +
      'Whenever the user asks you to create a web application, interactive tool, dashboard, game, prototype, component, code script, or formatted document, you MUST output it as a standalone LUMA Artifact.\n' +
      'Format each artifact using this exact tag syntax:\n' +
      '<luma_artifact id="unique_id" type="html|code|document|pdf" title="Descriptive Title" language="optional_lang">\n' +
      '...complete, production-ready artifact content...\n' +
      '</luma_artifact>\n\n' +
      'For HTML artifacts, provide complete, self-contained HTML including all styles and scripts so it renders immediately in the sandboxed preview iframe.\n' +
      'For revisions, update the existing artifact rather than creating an unrelated one.\n' +
      'Never refer to yourself as Claude, GPT, Gemini, or DeepSeek. Your brand and model name is LUMA 1.0.'
  };

  // Pre-process messages
  const formattedMessages: any[] = [systemInstruction];

  for (const m of messages) {
    if (m.role === 'system') continue; // override with LUMA system prompt
    let combinedContent = m.content || '';
    if (m.attachments && Array.isArray(m.attachments) && m.attachments.length > 0) {
      for (const att of m.attachments) {
        if (att.extractedText) {
          combinedContent += `\n\n[Attached Document: ${att.name}]\n${att.extractedText}\n[End of Document: ${att.name}]`;
        }
      }
    }
    formattedMessages.push({
      role: m.role,
      content: combinedContent
    });
  }

  // If OmniRoute API key is configured, forward to OmniRoute's auto-routing model
  if (OMNIROUTE_API_KEY) {
    // Let OmniRoute handle model routing, fallback, and load balancing
    const targetOmniModel = 'auto/best-chat';

    const payload = {
      model: targetOmniModel,
      messages: formattedMessages,
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
            res.write(chunk);
          }
        } catch (streamErr: any) {
          // Client disconnected
        } finally {
          res.end();
        }
        return;
      } else {
        const json = await upstreamRes.json();
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

  // Fallback response when key is standby
  const lastUserMessage = [...formattedMessages].reverse().find(m => m.role === 'user')?.content || '';

  const assistantResponse =
    `Hello! I am **LUMA 1.0**, your unified AI intelligence engine created by **Luma Studio**.\n\n` +
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
      // Fall through to honest explanation
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
        hmr: process.env.DISABLE_HMR !== 'true'
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
