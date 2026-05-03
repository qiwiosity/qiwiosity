const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const OpenAI = require('openai');

const PORT = 5000;
const HOST = '0.0.0.0';

const ROOT = path.join(__dirname, 'qiwiosity', 'mobile');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
};

function readBody(req, maxBytes = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > maxBytes) { reject(new Error('Payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

let _openaiClient = null;
function getOpenAI() {
  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) return null;
  if (!_openaiClient) {
    _openaiClient = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return _openaiClient;
}

function identifyConfigured(res) {
  const ok = !!(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ available: ok }));
}

async function identifyProxy(req, res) {
  const client = getOpenAI();
  if (!client) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'OpenAI integration not configured' }));
    return;
  }
  let raw;
  try {
    raw = await readBody(req);
  } catch (err) {
    const tooBig = /Payload too large/i.test(err.message);
    res.writeHead(tooBig ? 413 : 400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: tooBig ? 'Image too large (max 12MB)' : 'Bad request' }));
    return;
  }
  let parsedReq;
  try { parsedReq = JSON.parse(raw || '{}'); }
  catch { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid JSON' })); return; }
  const { imageDataUrl, hint, candidates } = parsedReq;
  if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'imageDataUrl (data:image/...;base64,...) required' }));
    return;
  }
  try {
    const candList = Array.isArray(candidates) ? candidates.slice(0, 60) : [];
    const candidateBlock = candList.length
      ? `\n\nFor your reference, here are some places in our New Zealand catalogue that the photo MIGHT match (use only if a clear visual match — never invent):\n${candList.map(c => `- ${c.name} (${c.region || ''})`).join('\n')}`
      : '';

    const systemPrompt = `You are an expert at identifying landmarks, statues, monuments, natural features, buildings, and tourist attractions — with deep knowledge of New Zealand (Aotearoa). The user will send a photo (taken live or uploaded). Identify the most likely real-world place or object shown.

Respond ONLY with a single JSON object — no markdown, no prose around it — matching this schema exactly:
{
  "name": "Most likely name of the place / landmark / statue / object",
  "type": "landmark | statue | natural feature | building | mountain | beach | lake | waterfall | town | museum | other",
  "location": "City / region / area, with country",
  "country": "Country name (or 'Unknown')",
  "isInNewZealand": true | false,
  "description": "2-4 sentences of interesting context, history, or significance",
  "confidence": "high | medium | low",
  "matchedCandidate": "Exact name from the candidate list above if it matches, otherwise null",
  "tips": ["short visitor tip 1", "short visitor tip 2"],
  "alternatives": ["other place this could be"]
}

If the image is too unclear, generic, or shows no identifiable place (e.g. a blank wall, a person's face, food), set name to "Unidentifiable" and confidence to "low" and explain in the description.`;

    const userText = hint ? `User hint: ${hint}.${candidateBlock}` : `Identify this place.${candidateBlock}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ]},
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 8192,
    });

    const text = completion.choices?.[0]?.message?.content || '{}';
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { name: 'Unidentifiable', confidence: 'low', description: text.slice(0, 300) }; }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(parsed));
  } catch (err) {
    console.error('identify error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Identification failed' }));
  }
}

function ttsConfigured(res) {
  const ok = !!process.env.ELEVENLABS_API_KEY;
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ available: ok }));
}

async function ttsProxy(req, res) {
  if (!process.env.ELEVENLABS_API_KEY) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'ELEVENLABS_API_KEY not set on server' }));
    return;
  }
  let raw;
  try {
    raw = await readBody(req);
  } catch (err) {
    const tooBig = /Payload too large/i.test(err.message);
    res.writeHead(tooBig ? 413 : 400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: tooBig ? 'Payload too large' : 'Bad request' }));
    return;
  }
  try {
    let parsed;
    try { parsed = JSON.parse(raw || '{}'); }
    catch { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid JSON' })); return; }
    const { text, voiceId } = parsed;
    if (!text || !voiceId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'text and voiceId required' }));
      return;
    }
    const payload = JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.52, similarity_boost: 0.76 }
    });
    const opts = {
      method: 'POST',
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
    };
    const upstream = https.request(opts, up => {
      if (up.statusCode !== 200) {
        res.writeHead(up.statusCode, { 'Content-Type': 'application/json' });
        const errChunks = [];
        up.on('data', c => errChunks.push(c));
        up.on('end', () => res.end(JSON.stringify({ error: 'ElevenLabs ' + up.statusCode, detail: Buffer.concat(errChunks).toString('utf8').slice(0, 300) })));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
      up.pipe(res);
    });
    upstream.on('error', err => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upstream error', detail: err.message }));
    });
    upstream.write(payload);
    upstream.end();
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

const server = http.createServer((req, res) => {
  const urlPathRaw = req.url.split('?')[0];

  // API endpoints
  if (urlPathRaw === '/api/tts/status') return ttsConfigured(res);
  if (urlPathRaw === '/api/tts' && req.method === 'POST') return ttsProxy(req, res);
  if (urlPathRaw === '/api/identify/status') return identifyConfigured(res);
  if (urlPathRaw === '/api/identify' && req.method === 'POST') return identifyProxy(req, res);

  let urlPath = urlPathRaw;
  if (urlPath === '/') urlPath = '/prototype.html';

  const filePath = path.join(ROOT, urlPath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + urlPath);
      return;
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Qiwiosity prototype running at http://${HOST}:${PORT}`);
  console.log(`ElevenLabs server proxy: ${process.env.ELEVENLABS_API_KEY ? 'enabled' : 'disabled (set ELEVENLABS_API_KEY)'}`);
  console.log(`OpenAI Snap & Identify: ${process.env.AI_INTEGRATIONS_OPENAI_API_KEY ? 'enabled' : 'disabled'}`);
});
