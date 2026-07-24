require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

if (!GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY is not set.');
  console.warn('   Copy .env.example to .env and add your key from https://aistudio.google.com/app/apikey');
}

const LANG_NAMES = { en: 'English', ml: 'Malayalam', hi: 'Hindi', ta: 'Tamil' };

app.post('/api/analyze', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it to .env and restart the server.' });
    }

    const { imageBase64, mimeType, crop, lang } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'No image provided.' });
    if (!crop || !crop.trim()) return res.status(400).json({ error: 'Crop name is required.' });

    const cropName = crop.trim();
    const langName = LANG_NAMES[lang] || 'English';

    const prompt = `You are AgriScan, an agronomy assistant for Indian farmers. The farmer has identified the crop as: "${cropName}". Trust this — do not second-guess or override it. Examine the attached image (leaf, fruit, stem, or whole crop) of this ${cropName} plant and identify any disease, pest damage, nutrient deficiency, or other unhealthy condition.
Respond ONLY with a single JSON object (no markdown fences, no extra text) with exactly these fields:
{
 "crop": "${cropName}",
 "isHealthy": boolean (true only if the plant looks healthy with no notable disease/pest/deficiency),
 "disease": string (disease/pest/deficiency common name; if healthy, use "No disease detected"),
 "confidence": number (0-100, your confidence in this diagnosis),
 "severity": "Low" | "Medium" | "High",
 "isUnclear": boolean (true if the image is too blurry, dark, distant, or ambiguous to diagnose confidently),
 "symptoms": array of short strings describing observed symptoms,
 "causes": array of short strings describing likely causes,
 "organicTreatment": array of short strings, practical low-cost/organic remedies available to Indian smallholder farmers,
 "chemicalTreatment": array of short strings, common agrochemical treatments with general dosage guidance where appropriate,
 "prevention": array of short strings, preventive measures for future crop cycles
}
Write every string value in simple, plain ${langName}, avoiding technical jargon a smallholder farmer wouldn't know. Keep each array to 3-5 concise items. Be practical and specific to Indian farming conditions.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
            ]
          }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.4 }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', errText);
      return res.status(502).json({ error: 'Gemini API request failed. Check your API key and quota.', detail: errText });
    }

    const data = await geminiRes.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return res.status(502).json({ error: 'Empty response from Gemini.' });

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); }
        catch (e2) { return res.status(502).json({ error: 'Could not parse Gemini response.' }); }
      } else {
        return res.status(502).json({ error: 'Could not parse Gemini response.' });
      }
    }

    res.json({ result: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasKey: !!GEMINI_API_KEY, model: GEMINI_MODEL });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AgriScan server running on port ${PORT}`);
});