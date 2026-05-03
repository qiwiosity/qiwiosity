const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
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
  try {
    const raw = await readBody(req);
    const { text, voiceId } = JSON.parse(raw || '{}');
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
});
