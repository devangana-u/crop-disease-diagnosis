# AgriScan

AI-powered crop disease detection for farmers and agricultural professionals, built on the
Google Gemini Vision API. Upload or capture a photo of a leaf, fruit, stem, or crop and get
a plain-language diagnosis: disease/pest/deficiency name, confidence score, severity, symptoms,
causes, organic and chemical treatments, and prevention tips — in English, Malayalam, Hindi, or Tamil.

The Gemini API key lives only on the server (`.env`), never in the browser.

## Project structure

```
agriscan/
├── server.js          # Express server + /api/analyze (calls Gemini using the server-side key)
├── package.json
├── .env.example        # copy to .env and add your key
└── public/
    └── index.html       # frontend — UI, camera capture, history, dashboard, i18n
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add your Gemini API key:
   ```bash
   cp .env.example .env
   ```
   Then open `.env` and paste your key (get a free one at
   https://aistudio.google.com/app/apikey):
   ```
   GEMINI_API_KEY=your_real_key_here
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open http://localhost:3000 in your browser (or on your phone, using your computer's
   local network IP, to test camera capture on a mobile device).

## How it works

- The browser never talks to Gemini directly. It sends the photo (as base64) plus the
  selected crop hint and language to your own backend at `POST /api/analyze`.
- `server.js` reads `GEMINI_API_KEY` from `.env`, calls
  `generativelanguage.googleapis.com` with the image and a structured prompt, and returns
  the parsed JSON diagnosis to the browser.
- Scan history is stored in the browser's `localStorage` per device (no login system is
  included). The Dashboard tab derives its stats from that same history.
- Camera capture uses `getUserMedia` where available, falling back to the device's native
  camera app on browsers/devices without it.

## Notes for production use

This is a functional prototype, not a hardened production deployment. Before shipping to
real users, consider:

- **Accounts & sync** — history is currently per-browser (`localStorage`). For multi-device
  history you'd add real user accounts and move scan storage to a database.
- **Rate limiting / abuse protection** on `/api/analyze`, since it spends your Gemini quota.
- **HTTPS** in production — required for camera access (`getUserMedia`) on most browsers
  outside `localhost`.
- **Model accuracy** — Gemini's diagnosis is a helpful first opinion, not a substitute for
  a licensed agronomist, especially for high-severity or high-value crops.

## Customizing

- **Crops list**: edit the `<select id="cropSelect">` options in `public/index.html`.
- **Languages**: add a new key to the `I18N` object in `public/index.html` and to
  `LANG_NAMES` in `server.js`.
- **Model**: change `GEMINI_MODEL` in `.env` (e.g. to a newer Gemini vision-capable model).
