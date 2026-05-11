import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

import { GoogleGenAI, Type } from '@google/genai';

// Initialize Firebase Admin using a Service Account Key if provided, else fallback to Application Default Credentials
try {
  if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccountParams = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({
        credential: cert(serviceAccountParams)
      });
      console.log('Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT_KEY');
    } else {
      initializeApp();
      console.log('Firebase Admin initialized with Default Credentials. Auth operations may fail without FIREBASE_SERVICE_ACCOUNT_KEY.');
    }
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin', error);
}

// The AI client will be instantiated per-request to capture latest env vars
// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const app = express();

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firestoreDatabaseId: string | undefined;
try {
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    firestoreDatabaseId = config.firestoreDatabaseId;
  }
} catch (e) {
  console.error("Could not read firebase-applet-config.json:", e);
}

const db = getFirestore(undefined, firestoreDatabaseId);

// Test server-side Firestore connectivity
async function testServerFirestore() {
  try {
    const collections = await db.listCollections();
    console.log(`Firebase Admin: Successfully connected. Found ${collections.length} collections.`);
  } catch (error: any) {
    console.error("Firebase Admin Firestore connection failed:", error.message);
  }
}
testServerFirestore();

// Background job to clean up ordered cart items older than 2 minutes
setInterval(async () => {
  try {
    const twoMinutesAgoMs = Date.now() - 2 * 60 * 1000;
    
    // 1. Clean cartItems
    try {
      const itemsSnapshot = await db.collection('cartItems')
        .where('status', '==', 'ordered')
        .get();
        
      if (!itemsSnapshot.empty) {
        let deletedCount = 0;
        for (const doc of itemsSnapshot.docs) {
          try {
            const data = doc.data();
            if (data.orderedAt) {
              const orderedMs = new Date(data.orderedAt).getTime();
              if (orderedMs < twoMinutesAgoMs) {
                await doc.ref.delete();
                deletedCount++;
              }
            }
          } catch (itemErr: any) {
            // Ignore NOT_FOUND errors
            if (itemErr.code !== 5 && !itemErr.message?.includes('NOT_FOUND')) {
              console.error('Error deleting cart item:', itemErr);
            }
          }
        }
        if (deletedCount > 0) {
          console.log(`Auto-deleted ${deletedCount} ordered cart item(s)`);
        }
      }
    } catch (queryErr) {
      console.error('Error querying cart items for deletion:', queryErr);
    }

    // 2. Clean carts
    try {
      const cartsSnapshot = await db.collection('carts')
        .where('status', '==', 'ordered')
        .get();
        
      if (!cartsSnapshot.empty) {
        let deletedCarts = 0;
        for (const doc of cartsSnapshot.docs) {
          try {
            const data = doc.data();
            if (data.orderedAt) {
              const orderedMs = new Date(data.orderedAt).getTime();
              if (orderedMs < twoMinutesAgoMs) {
                await doc.ref.delete();
                deletedCarts++;
              }
            }
          } catch (cartErr: any) {
            if (cartErr.code !== 5 && !cartErr.message?.includes('NOT_FOUND')) {
              console.error('Error deleting cart:', cartErr);
            }
          }
        }
        if (deletedCarts > 0) {
          console.log(`Auto-deleted ${deletedCarts} ordered cart(s)`);
        }
      }
    } catch (queryErr) {
      console.error('Error querying carts for deletion:', queryErr);
    }
  } catch (error) {
    console.error('Error during auto-delete task:', error);
  }
}, 30000); // Check every 30 seconds
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const FAST2SMS_API_KEY = "2uUWA49isSjTnfevxJ3BEP1Zr6hqFX8dlgwCLaVyb5YoODRH0zbyo2hOLNF3qI608i7TemgSZwWD1xRd";

// In-memory OTP store (phone -> { otp, expiresAt })
const otpStore = new Map<string, { otp: string, expiresAt: number }>();

app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });

  const isDev = process.env.NODE_ENV !== 'production';
  const useMockOtp = process.env.USE_MOCK_OTP === 'true' || (isDev && process.env.USE_MOCK_OTP !== 'false');
  const isMockMode = isDev && useMockOtp;

  // Generate 6 digit OTP
  const otp = isMockMode ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(phone, { otp, expiresAt });

  if (isMockMode) {
    console.log(`[MOCK OTP] Using mock OTP for ${phone}: 123456`);
    return res.json({ 
      success: true, 
      message: 'Mock OTP: 123456 (for testing)',
      isMock: true
    });
  }

  try {
    // Fast2SMS OTP API
    const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
      params: {
        authorization: FAST2SMS_API_KEY,
        route: 'otp',
        variables_values: otp,
        numbers: phone
      }
    });
    
    if (response.data.return === false) {
      throw new Error(response.data.message || 'Fast2SMS API returned false');
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error: any) {
    console.error("Fast2SMS Error:", error.response?.data || error.message);
    otpStore.delete(phone);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to send OTP via Fast2SMS';
    res.status(400).json({ error: errorMessage });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  const stored = otpStore.get(phone);

  if (!stored) return res.status(400).json({ error: 'No OTP requested for this number' });
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({ error: 'OTP expired' });
  }
  if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

  otpStore.delete(phone);
  res.json({ success: true, message: 'OTP verified successfully' });
});

app.post('/api/extract-image', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const response = await axios.get(url);
    const html = response.data;
    
    const metaMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) || html.match(/<link\s+rel="image_src"\s+href="([^"]+)"/i);
    
    if (metaMatch && metaMatch[1]) {
      return res.json({ imageUrl: metaMatch[1] });
    }
    
    res.status(400).json({ error: 'Could not extract direct image link' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch the URL' });
  }
});

app.post('/api/food-benefits', async (req, res) => {
  const { name, language = 'English', category = '', type = '', description = '' } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Food name is required' });
  
  try {
    const prompt = `As a premium restaurant nutritionist and behavioral marketer, analyze the food item below:
Name: "${name}"
Category: "${category}"
Diet Type: "${type}"
Description/Ingredients: "${description}"
Unique Identifier: "${Date.now()}"

Based directly on the specific item above, generate unique, realistic nutritional values and benefits. DO NOT copy another item's data.
Return ONLY a valid JSON object.
CRITICAL INSTRUCTION: All string values for 'title', 'description', and 'summary' MUST be fully translated into ${language}. If ${language} is not English, you MUST output the actual translated words in that language for the titles and descriptions!

The output MUST be in this exact JSON format:
{
  "nutritionData": [
    { "name": "<'Protein' TRANSLATED TO ${language}>", "value": <estimated_percentage_int>, "color": "#10b981" },
    { "name": "<'Carbs' TRANSLATED TO ${language}>", "value": <estimated_percentage_int>, "color": "#f59e0b" },
    { "name": "<'Fiber' TRANSLATED TO ${language}>", "value": <estimated_percentage_int>, "color": "#8b5cf6" },
    { "name": "<'Fat' TRANSLATED TO ${language}>", "value": <estimated_percentage_int>, "color": "#ef4444" },
    { "name": "<'Vitamins' TRANSLATED TO ${language}>", "value": <estimated_percentage_int>, "color": "#3b82f6" }
  ],
  "benefitsText": [
    { "title": "<Short persuasive title about ${name} TRANSLATED INTO ${language}>", "description": "<One sentence explaining a specific benefit of eating ${name} TRANSLATED INTO ${language}>" },
    { "title": "<Another specific title for ${name} TRANSLATED INTO ${language}>", "description": "<One sentence explaining a specific benefit of eating ${name} TRANSLATED INTO ${language}>" },
    { "title": "<A final specific title for ${name} TRANSLATED INTO ${language}>", "description": "<One sentence explaining a specific benefit of eating ${name} TRANSLATED INTO ${language}>" }
  ],
  "summary": "<A powerful, one-sentence psychological push to eat ${name} right now TRANSLATED INTO ${language}>"
}

Values in nutritionData must sum to exactly 100. Make the colors look professional matching the data type. Do NOT repeat generic benefits; they must prominently feature why ${name} is good.`;

    let response;
    let retries = 3;
    let delay = 1000;
    
    if (!process.env.GEMINI_API_KEY && !process.env.CUSTOM_GEMINI_API_KEY) {
       console.error("No API Key present in environment variables.");
       return res.status(500).json({ error: "No API Key" });
    } else {
       console.log(`API Key is present. Using: ${process.env.CUSTOM_GEMINI_API_KEY ? 'CUSTOM_GEMINI_API_KEY' : 'GEMINI_API_KEY'}...`);
    }

    const customKey = process.env.CUSTOM_GEMINI_API_KEY || '';
    const isOpenRouter = customKey.startsWith('sk-or-');
    
    let parsedData: any = {};
    let lastError: any;

    if (isOpenRouter) {
      console.log('Using OpenRouter API');
      let retries = 2;
      while (retries > 0) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${customKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              response_format: { type: 'json_object' },
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 2000
            })
          });
          const json = await res.json();
          if (!res.ok) {
            throw new Error(json.error?.message || 'OpenRouter API error');
          }
          let cleanText = json.choices[0].message.content;
          const match = cleanText.match(/\{[\s\S]*\}/);
          if (match) cleanText = match[0];
          parsedData = JSON.parse(cleanText);
          break; // success
        } catch (error: any) {
          lastError = error;
          retries--;
          console.log(`[OpenRouter] error: ${error.message}, retrying...`);
        }
      }
      
      if (!parsedData.nutritionData) {
        return res.status(500).json({ error: "OpenRouter API failed" });
      }

    } else {
      const ai = new GoogleGenAI({ apiKey: process.env.CUSTOM_GEMINI_API_KEY || process.env.GEMINI_API_KEY });
      
      const fallbackModels = [
        'gemini-2.0-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash'
      ];
  
      let response;
  
      for (const currentModel of fallbackModels) {
        let retries = 2; // Reduce retries per model
        let success = false;
        
        while (retries > 0) {
          try {
            response = await ai.models.generateContent({
              model: currentModel,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                temperature: 0.7,
              }
            });
            success = true;
            break; // success
          } catch (error: any) {
            lastError = error;
            retries--;
            // 429 indicates rate limiting. Do not retry the same model, fail fast to next fallback
            const isRetryable = error.status === 503 || error.status === 'UNAVAILABLE' || error.message?.includes('503') || error.message?.includes('UNAVAILABLE');
            
            if (!isRetryable) {
              retries = 0; // stop retrying this model if it's a hard error or 429
            } else if (retries > 0) {
              console.log(`[${currentModel}] API error (${error.status || error.message}), retrying in 1000ms...`);
              await new Promise(res => setTimeout(res, 1000));
            }
          }
        }
        
        if (success && response) {
          break; // we got a successful response from one of the models
        } else {
          console.log(`Exhausted retries/quota for model ${currentModel}, moving to next...`);
        }
      }
  
      if (!response) {
        // Send 429 rate limit specifically if all models failed with 429
        if (lastError && (lastError.status === 429 || lastError.message?.includes('429'))) {
           return res.status(429).json({ error: "Rate limit exceeded on all models" });
        }
        return res.status(500).json({ error: "Gemini API failed on all fallback models" });
      }

      if (response?.text) {
        try {
          let cleanText = response.text;
          const match = cleanText.match(/\{[\s\S]*\}/);
          if (match) cleanText = match[0];
          parsedData = JSON.parse(cleanText);
        } catch (e) {
          console.error("Failed to parse Gemini JSON:", response.text);
          return res.status(500).json({ error: "Parse error" });
        }
      }
    }
        
        // Force nutrition values to be slightly different
        if (parsedData.nutritionData && parsedData.nutritionData.length > 0) {
           const offset = name.length % 5;
           parsedData.nutritionData[0].value += offset;
           if (parsedData.nutritionData[1]) {
             parsedData.nutritionData[1].value -= offset;
           }
        }
    
    res.json(parsedData);
  } catch (error: any) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete('/api/admin/delete-user/:uid', async (req, res) => {
  const { uid } = req.params;
  if (!uid) {
    return res.status(400).json({ error: 'User UID is required' });
  }

  try {
    // Delete from Firebase Auth
    await getAuth().deleteUser(uid);
    console.log(`Successfully deleted user ${uid} from Firebase Auth`);
    res.json({ success: true, message: 'User deleted from Authentication' });
  } catch (error: any) {
    console.error(`Error deleting user ${uid} from auth:`, error);
    // If user is already deleted or doesn't exist, we can still return 200 so the client can proceed
    if (error.code === 'auth/user-not-found') {
      return res.json({ success: true, message: 'User not found in Auth, considered deleted' });
    }
    // Catch when Service Account Key is missing, rendering IAM forbidden over Auth API calls
    if (error.message && error.message.includes('Identity Toolkit API has not been used')) {
      return res.status(500).json({ 
        error: 'Missing Firebase Service Account.', 
        details: 'To delete users from Firebase Auth within AI Studio, you MUST configure your Firebase Admin credentials. Go to Firebase Console -> Project Settings -> Service Accounts -> Generate New Private Key. Copy the entire JSON and add it to your Environment Variables setting as "FIREBASE_SERVICE_ACCOUNT_KEY".' 
      });
    }

    res.status(500).json({ error: 'Failed to delete user from Authentication', details: error.message });
  }
});

async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  let isProd = process.env.NODE_ENV === 'production';
  // Fallback if NODE_ENV is production but dist is not built yet
  if (isProd && !fs.existsSync(path.join(distPath, 'index.html'))) {
    isProd = false;
  }

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('Failed to load vite, falling back to static serving', e);
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
