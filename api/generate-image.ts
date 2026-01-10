
import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- Security & Rate Limiting Config ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 Minute
const MAX_REQUESTS_PER_WINDOW = 5; // 5 images per minute per IP to prevent abuse
const MAX_BODY_SIZE = 4 * 1024 * 1024; // 4MB Limit for input

// Simple in-memory rate limiter (Note: Resets on serverless cold start, effectively per-instance)
const rateLimitMap = new Map<string, number[]>();

const checkRateLimit = (ip: string) => {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];
  // Filter out old requests
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW_MS);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
};

// --- Helper: Mask API Key in Logs ---
const maskKey = (error: any, key: string) => {
  if (typeof error === 'string') return error.replace(key, '***KEY_MASKED***');
  if (error instanceof Error) {
    error.message = error.message.replace(key, '***KEY_MASKED***');
    if (error.stack) error.stack = error.stack.replace(key, '***KEY_MASKED***');
  }
  return error;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS & Method Validation
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-User-Gemini-Key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Body Size Check (Basic prevention)
  if (parseInt(req.headers['content-length'] || '0') > MAX_BODY_SIZE) {
    return res.status(413).json({ error: 'Payload Too Large' });
  }

  // 3. Extract & Validate Key from Header (Never Body)
  const apiKey = req.headers['x-user-gemini-key'] as string;
  if (!apiKey || !apiKey.startsWith('AIza')) {
    // Intentionally vague 401
    return res.status(401).json({ error: 'Invalid or missing Authorization credentials.' });
  }

  // 4. Rate Limiting
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too Many Requests. Please wait a moment.' });
  }

  // 5. Processing
  try {
    const { prompt, model = 'gemini-2.5-flash-image', aspectRatio = '1:1', config = {} } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    // Initialize Server-side Client
    // SECURITY: The key is kept in this function scope and destroyed after execution
    const ai = new GoogleGenAI({ apiKey });

    // Construct request
    // We restrict models to image generation ones only for this endpoint
    const allowedModels = ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'];
    const selectedModel = allowedModels.includes(model) ? model : 'gemini-2.5-flash-image';

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        },
        // We use default safety settings on server to avoid bad request errors from custom enums
      }
    });

    const candidate = response.candidates?.[0];
    
    // Check for Safety Blocks
    if (candidate?.finishReason === 'SAFETY') {
      return res.status(400).json({ 
        error: 'Image generation blocked by safety filters.',
        code: 'SAFETY_BLOCK' 
      });
    }

    if (!candidate?.content?.parts) {
      throw new Error('No content returned from upstream API.');
    }

    // Extract Image
    let imageBase64 = null;
    let mimeType = null;
    let debugText = '';

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        imageBase64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType;
      } else if (part.text) {
        debugText += part.text;
      }
    }

    if (!imageBase64) {
      throw new Error('No image data found in response.');
    }

    // Success Response
    return res.status(200).json({
      imageBase64,
      mimeType,
      debugText: debugText.substring(0, 100) // Truncate debug info
    });

  } catch (error: any) {
    // SECURITY: Mask the key in any logs or error messages
    const maskedError = maskKey(error, apiKey);
    console.error('[Generate Image API Error]', maskedError);

    const status = error.status || 500;
    const message = error.message || 'Internal Server Error';

    // Return sanitized error to client
    return res.status(status).json({ 
      error: 'Image generation failed.', 
      details: status === 500 ? 'Server error' : message 
    });
  }
}
