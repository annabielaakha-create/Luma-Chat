import { AIModel, BackendStatus } from '../types';

export async function fetchBackendStatus(): Promise<BackendStatus> {
  const res = await fetch('/api/status');
  if (!res.ok) {
    throw new Error(`Failed to check backend status: ${res.status}`);
  }
  return res.json();
}

export async function fetchAvailableModels(): Promise<{ models: AIModel[]; isLive: boolean }> {
  try {
    const res = await fetch('/api/models');
    if (res.ok) {
      const data = await res.json();
      return {
        models: data.models || [{ id: 'LUMA 1.0', name: 'LUMA 1.0', provider: 'LUMA AI' }],
        isLive: Boolean(data.isLive)
      };
    }
  } catch {
    // fallback
  }
  return {
    models: [
      { id: 'LUMA 1.0', name: 'LUMA 1.0', provider: 'LUMA AI', description: 'Unified Multi-Model Intelligence' }
    ],
    isLive: true
  };
}

export interface StreamChatParams {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    attachments?: Array<{ name: string; extractedText?: string }>;
  }>;
  temperature?: number;
  onChunk: (chunk: string) => void;
  signal?: AbortSignal;
}

export async function streamChatCompletion({
  model,
  messages,
  temperature = 0.7,
  onChunk,
  signal
}: StreamChatParams): Promise<string> {
  const response = await fetch('/api/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      stream: true
    }),
    signal
  });

  if (!response.ok) {
    let errMessage = `Error ${response.status}: Failed to generate response`;
    try {
      const errJson = await response.json();
      if (errJson.error) errMessage = errJson.error;
    } catch {
      const errText = await response.text();
      if (errText) errMessage = errText;
    }
    throw new Error(errMessage);
  }

  if (!response.body) {
    throw new Error('Readable stream not supported by server');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulated = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed.includes('[DONE]')) {
          continue;
        }

        const dataMatch = trimmed.match(/^data:\s*(.*)$/);
        if (dataMatch) {
          const jsonStr = dataMatch[1].trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta =
              parsed.choices?.[0]?.delta?.content ||
              parsed.choices?.[0]?.text ||
              (typeof parsed.choices?.[0]?.message?.content === 'string' ? parsed.choices[0].message.content : '') ||
              '';
            if (delta) {
              accumulated += delta;
              onChunk(delta);
            }
          } catch {
            // Ignore telemetry or non-JSON chunk
          }
        }
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return accumulated;
    }
    // If stream fails partway, do not crash if we already accumulated text
    if (!accumulated) {
      throw err;
    }
  }

  // If streaming yielded no text, fallback seamlessly to non-streaming POST
  if (!accumulated && (!signal || !signal.aborted)) {
    try {
      const fallbackRes = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          stream: false
        }),
        signal
      });
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        const content = data.choices?.[0]?.message?.content || data.content || '';
        if (content) {
          accumulated = content;
          onChunk(content);
        }
      }
    } catch {
      // Fallback failed, return whatever we have
    }
  }

  return accumulated;
}

export async function uploadAndParseDocument(file: File): Promise<{
  filename: string;
  mimetype: string;
  size: number;
  extractedText: string;
  characterCount: number;
  lineCount: number;
  preview: string;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/documents/parse', {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || `Upload failed with status ${res.status}`);
  }

  return res.json();
}

export async function requestImageGeneration(prompt: string): Promise<{
  success: boolean;
  data?: any;
  message?: string;
}> {
  const res = await fetch('/api/images/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Image generation failed');
  }

  return data;
}
