import { GoogleGenAI } from "@google/genai";
import { Language } from "../types";
import { DEFAULT_PROMPT_SYSTEM } from "../constants";

// Initialize Gemini Client
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

/**
 * Translates text using a stream to allow real-time UI updates.
 * Returns an async generator that yields chunks of translated text.
 */
export async function* translateTextStream(
  text: string,
  sourceLang: Language,
  targetLang: Language
): AsyncGenerator<string, void, unknown> {
  if (!text.trim()) return;

  try {
    const model = "gemini-3-pro-preview"; 
    
    const sourcePrompt = sourceLang === Language.AUTO ? "the detected source language" : sourceLang;
    const targetPrompt = targetLang;

    const prompt = `Translate the following text from ${sourcePrompt} to ${targetPrompt}.
    
    Text to translate:
    """
    ${text}
    """
    `;

    const streamResult = await ai.models.generateContentStream({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: DEFAULT_PROMPT_SYSTEM,
        temperature: 0.3,
      }
    });

    for await (const chunk of streamResult) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Translation stream error:", error);
    throw error;
  }
}