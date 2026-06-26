/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Generate story/blog draft using Gemini 3.5 Flash
app.post('/api/generate-story', async (req, res) => {
  const { prompt, category } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'A concept prompt is required to compose a story.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    console.warn("GEMINI_API_KEY is not configured or has placeholder value. Using simulated local writing master template.");
    
    // High-fidelity fallback story matching the concept prompt
    const simulatedTitle = `The Echo of "${prompt.trim().slice(0, 30)}"`;
    const simulatedCategory = category || 'Technology';
    
    let simulatedUrl = 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=60';
    if (simulatedCategory === 'AI') simulatedUrl = 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=60';
    if (simulatedCategory === 'Lifestyle') simulatedUrl = 'https://images.unsplash.com/photo-1493934558415-9d19f0b2b4d2?w=800&auto=format&fit=crop&q=60';
    if (simulatedCategory === 'Travel') simulatedUrl = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=60';
    if (simulatedCategory === 'Education') simulatedUrl = 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=60';

    const simulatedContent = `### A Prelude to "${prompt.trim()}"

We began our exploration with a simple idea: *"${prompt.trim()}"*. Over time, this concept grew and developed into a captivating narrative that inspires our path forward.

#### The Core Narrative

Every great story starts with a spark of inspiration. For us, this spark led to a deeper analysis of the dynamics at play, blending professional insight with a dash of creativity. This piece invites you to observe the intersection of curiosity, design, and impact.

> "A single vision carried with persistent effort has the power to redefine our modern landscape."

#### Closing Reflections

We hope this template stirs your imagination. **Note:** To enable fully dynamic AI story generation tailored instantly to any prompt you write, please set your \`GEMINI_API_KEY\` in your AI Studio **Settings > Secrets** panel! Once activated, our Gemini writer assistant will instantly compose bespoke, multi-chapter masterpieces for you.`;

    return res.json({
      title: simulatedTitle,
      content: simulatedContent,
      category: simulatedCategory,
      imageUrl: simulatedUrl,
      isSimulated: true
    });
  }

  try {
    // Lazy initialization of GoogleGenAI SDK to prevent module boot crashes
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemInstruction = `You are an expert ghostwriter, elite novelist, and master blogger.
Your task is to write a highly engaging, beautifully written, full-length story or blog post based on the user's concept prompt and topic category.
The output MUST be written in structured rich Markdown with beautiful subheadings (###, ####), strong quotes, bulleted takeaways, and impeccable paragraph formatting.
Do not make it too short; aim for a comprehensive, immersive story or article that reads like a human expert wrote it.`;

    const userPrompt = `Create a story/blog article on category ${category || 'General'} based on this suggestion: "${prompt}".`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'A modern, captivating, and click-worthy title for the story or article.',
            },
            content: {
              type: Type.STRING,
              description: 'The complete, fully fleshed-out story manuscript or research article, utilizing Markdown headers, bullet points, spacing, and quotes.',
            },
            suggestedCoverKeyword: {
              type: Type.STRING,
              description: 'One of these five preset categories that best fits the theme to select the perfect preset header cover: Technology, AI, Education, Lifestyle, Travel',
            }
          },
          required: ['title', 'content', 'suggestedCoverKeyword'],
        }
      }
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error("No response text received from Gemini API.");
    }

    const result = JSON.parse(rawText.trim());
    
    // Choose cover image URL based on suggested preset category keyword
    const PRESETS: Record<string, string> = {
      'AI': 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=60',
      'Lifestyle': 'https://images.unsplash.com/photo-1493934558415-9d19f0b2b4d2?w=800&auto=format&fit=crop&q=60',
      'Travel': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=60',
      'Technology': 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=60',
      'Education': 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=60'
    };

    const validatedCategory = PRESETS[result.suggestedCoverKeyword] ? result.suggestedCoverKeyword : (category || 'Technology');
    const finalUrl = PRESETS[validatedCategory] || PRESETS['Technology'];

    return res.json({
      title: result.title,
      content: result.content,
      category: validatedCategory,
      imageUrl: finalUrl,
      isSimulated: false
    });

  } catch (err: any) {
    console.error("Gemini API call failed:", err);
    return res.status(500).json({ 
      error: `AI Generation error: ${err.message || 'Unknown network error'}. Please update your API key in Secrets or try again.` 
    });
  }
});

// Serve frontend build or Vite dev server
if (process.env.NODE_ENV !== 'production') {
  const startDev = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[DEV] Full-Stack App running on port ${PORT}`);
    });
  };
  startDev();
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PROD] Full-Stack App running on port ${PORT}`);
  });
}
