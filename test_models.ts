import { GoogleGenAI } from '@google/genai';
// Use the built-in node fetch and process.env.
import dotenv from 'dotenv';
dotenv.config();

async function testModels() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const fallbackModels = [
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];

  for (const currentModel of fallbackModels) {
    let retries = 2; // Reduce retries per model
    let success = false;
    let response;
    
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: currentModel,
          contents: "Hello",
          config: {
            responseMimeType: "application/json",
            temperature: 0.7,
          }
        });
        success = true;
        break; // success
      } catch (error: any) {
        retries--;
        // 429 indicates rate limiting. Do not retry the same model, fail fast to next fallback
        const isRetryable = error.status === 503 || error.status === 'UNAVAILABLE' || error.message?.includes('503') || error.message?.includes('UNAVAILABLE');
        
        if (!isRetryable) {
          retries = 0; // stop retrying this model if it's a hard error or 429
        } else if (retries > 0) {
          console.warn(`[${currentModel}] API error (${error.status || error.message}), retrying in 1000ms...`);
          await new Promise(res => setTimeout(res, 1000));
        }
      }
    }
    
    if (success && response) {
      console.log('SUCCESS on ' + currentModel);
      break; // we got a successful response from one of the models
    } else {
      console.warn(`Exhausted retries/quota for model ${currentModel}, moving to next...`);
    }
  }
}

testModels().catch(console.error);
