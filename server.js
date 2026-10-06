// MediaForge FFmpeg server: serves the app and converts files with ffmpeg.
const express = require('express');
const multer = require('multer');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = process.env.PORT || 3000;
const MAX_MB = +process.env.MAX_MB || 5120;
const MAX_JOBS = +process.env.MAX_JOBS || 2;
const TIMEOUT_MS = (+process.env.TIMEOUT_MIN || 20) * 60 * 1000;

let hasFfmpeg = true;
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { hasFfmpeg = false; }

// Every user value is checked against these lists. ffmpeg is started without a shell.
const HEIGHTS = [0, 480, 720, 1080, 1440, 2160];
const RATES = [22050, 32000, 44100, 48000, 96000];
const ASPECTS = { '9:16': [9, 16], '1:1': [1, 1], '4:5': [4, 5], '16:9': [16, 9] };
const BITRATES = [64, 96, 128, 192, 256, 320];
const FORMATS = {
  mp4:  { v: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p'], a: ['-c:a', 'aac'], extra: ['-movflags', '+faststart'] },
  mov:  { v: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p'], a: ['-c:a', 'aac'] },
  mkv:  { v: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p'], a: ['-c:a', 'aac'] },
  webm: { v: ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '33', '-row-mt', '1'], a: ['-c:a', 'libopus'] },
  avi:  { v: ['-c:v', 'mpeg4', '-q:v', '5'], a: ['-c:a', 'libmp3lame'] },
  gif:  { gif: true },
  mp3:  { audio: true, a: ['-c:a', 'libmp3lame'], lossy: true },
  wav:  { audio: true, a: ['-c:a', 'pcm_s16le'] },
  aac:  { audio: true, a: ['-c:a', 'aac'], lossy: true, extra: ['-f', 'adts'] },
  m4a:  { audio: true, a: ['-c:a', 'aac'], lossy: true, extra: ['-f', 'ipod'] },
  ogg:  { audio: true, a: ['-c:a', 'libvorbis'], lossy: true },
  flac: { audio: true, a: ['-c:a', 'flac'] },
  opus: { audio: true, a: ['-c:a', 'libopus'], lossy: true, rate: 48000, extra: ['-f', 'opus'] },
  aiff: { audio: true, a: ['-c:a', 'pcm_s16be'], extra: ['-f', 'aiff'] },
  wma:  { audio: true, a: ['-c:a', 'wmav2'], lossy: true, extra: ['-f', 'asf'] },
  wmv:  { v: ['-c:v', 'wmv2', '-b:v', '2M'], a: ['-c:a', 'wmav2'], extra: ['-f', 'asf'] },
  flv:  { v: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p'], a: ['-c:a', 'aac'], extra: ['-f', 'flv'] },
};
const MIME = { mp4: 'video/mp4', mov: 'video/quicktime', mkv: 'video/x-matroska', webm: 'video/webm', avi: 'video/x-msvideo', gif: 'image/gif', mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac', m4a: 'audio/mp4', ogg: 'audio/ogg', flac: 'audio/flac', opus: 'audio/ogg', aiff: 'audio/aiff', wma: 'audio/x-ms-wma', wmv: 'video/x-ms-wmv', flv: 'video/x-flv' };

function buildArgs(inPath, outPath, b) {
  const f = FORMATS[b.format];
  const height = +b.height || 0, rate = +b.sampleRate || 0, ch = +b.channels || 0, kbps = +b.bitrate || 0;
  if (!f) throw new Error('Unsupported format');
  if (!HEIGHTS.includes(height)) throw new Error('Unsupported resolution');
  if (rate && !RATES.includes(rate)) throw new Error('Unsupported sample rate');
  if (ch && ![1, 2].includes(ch)) throw new Error('Unsupported channel count');
  if (kbps && !BITRATES.includes(kbps)) throw new Error('Unsupported bitrate');
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-protocol_whitelist', 'file', '-i', inPath];
  if (f.gif) {
    args.push('-vf', `fps=12,scale=-2:${Math.min(height || 480, 480)}:flags=lanczos`, '-an', '-loop', '0');
  } else if (f.audio) {
    args.push('-vn', ...f.a);
    if (f.lossy) args.push('-b:a', `${kbps || 192}k`);
    if (f.rate) args.push('-ar', String(f.rate));
    else if (rate) args.push('-ar', String(rate));
    if (ch) args.push('-ac', String(ch));
  } else {
    const vf = [];
    const asp = ASPECTS[b.aspect || ''];
    if (b.aspect && !asp) throw new Error('Unsupported aspect ratio');
    if (asp) vf.push(`crop=w='min(iw,ih*${asp[0]}/${asp[1]})':h='min(ih,iw*${asp[1]}/${asp[0]})'`);
    if (height) vf.push(`scale=-2:${height}`);
    if (vf.length) args.push('-vf', vf.join(','));
    args.push(...f.v, ...f.a);
  }
  if (f.extra) args.push(...f.extra);
  args.push(outPath);
  return args;
}

const upload = multer({ dest: path.join(os.tmpdir(), 'mediaforge'), limits: { fileSize: MAX_MB * 1024 * 1024 } });
const app = express();
app.set('trust proxy', 1);
// CORS: set ALLOWED_ORIGIN to your site, e.g. https://mysite.netlify.app (comma separated). Default * allows any site.
const ORIGINS = (process.env.ALLOWED_ORIGIN || '*').split(',').map(s => s.trim());
app.use((req, res, next) => {
  const o = req.headers.origin;
  if (o && (ORIGINS.includes('*') || ORIGINS.includes(o))) {
    res.set('Access-Control-Allow-Origin', ORIGINS.includes('*') ? '*' : o);
    res.set('Access-Control-Allow-Headers', 'Content-Type'); res.set('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
// Simple per-IP limit: RATE_PER_HOUR conversions per hour (in memory, resets on restart).
const RATE = +process.env.RATE_PER_HOUR || 20, hits = new Map();
setInterval(() => hits.clear(), 3600e3).unref();
const limited = ip => { const n = (hits.get(ip) || 0) + 1; hits.set(ip, n); return n > RATE; };
let jobs = 0;
const rm = p => fs.rm(p, { force: true }, () => {});

// ---- Cloudinary AI for the Photo Editor. Set CLOUDINARY_URL (cloudinary://KEY:SECRET@CLOUD) or CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.
// The secret stays on this server. Each photo is uploaded under a random id, processed, returned, then deleted from Cloudinary.
const crypto = require('crypto');
let CLD = null;
{
  const u = (process.env.CLOUDINARY_URL || '').match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  const c = u ? { key: u[1], secret: u[2], cloud: u[3] } : { key: process.env.CLOUDINARY_API_KEY, secret: process.env.CLOUDINARY_API_SECRET, cloud: process.env.CLOUDINARY_CLOUD_NAME };
  if (c.key && c.secret && c.cloud) CLD = c;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cldSign = p => crypto.createHash('sha1').update(Object.keys(p).sort().map(k => `${k}=${p[k]}`).join('&') + CLD.secret).digest('hex');
function cldSteps(op, prompt, b = {}) {
  if (op === 'background') return 'e_background_removal';
  if (op === 'restore') return 'e_gen_restore';
  if (op === 'remove') {
    if (!/^[\p{L}\p{N} ,;'-]{1,80}$/u.test(prompt || '')) throw Object.assign(new Error('Describe what to remove (letters and numbers only)'), { status: 400 });
    const parts = prompt.split(/[,;]/).map(s => s.trim()).filter(Boolean).slice(0, 5).map(encodeURIComponent);
    return 'e_gen_remove:prompt_' + (parts.length > 1 ? `(${parts.join(';')})` : parts[0]);
  }
  if (op === 'recolor') {   // generative recolor of one named thing (hair, suit jacket, tie) to a hex color
    const pr = String(b.prompt || ''), col = String(b.color || '');
    if (!/^[a-z ]{2,30}$/i.test(pr) || !/^[0-9a-f]{6}$/i.test(col)) throw Object.assign(new Error('Bad recolor request'), { status: 400 });
    return 'e_gen_recolor:prompt_' + encodeURIComponent(pr) + ';to-color_' + col;
  }
  if (op === 'enhance') {   // AI quality: noise + compression cleanup, sharper detail, balanced light and color
    const lv = [1, 2, 3].includes(+b.level) ? +b.level : 2;
    const M = { restore: 'e_gen_restore', improve: `e_improve:outdoor:${[40, 65, 90][lv - 1]}`, light: 'e_enhance',
      pro: ['e_gen_restore', 'e_gen_restore/e_improve:outdoor:50', 'e_gen_restore/e_enhance/e_improve:outdoor:50'][lv - 1] };
    if (!M[b.mode]) throw Object.assign(new Error('Unknown enhance mode'), { status: 400 });
    return M[b.mode];
  }
  throw Object.assign(new Error('Unknown tool'), { status: 404 });
}
async function cldProcess(buf, tr) {
  const id = 'mf_' + crypto.randomBytes(12).toString('hex'), ts = Math.floor(Date.now() / 1000), fd = new FormData();
  fd.set('file', new Blob([buf]), 'photo'); fd.set('api_key', CLD.key); fd.set('timestamp', String(ts)); fd.set('public_id', id); fd.set('signature', cldSign({ public_id: id, timestamp: ts }));
  const up = await fetch(`https://api.cloudinary.com/v1_1/${CLD.cloud}/image/upload`, { method: 'POST', body: fd });
  if (!up.ok) { let m = ''; try { m = (await up.json()).error.message; } catch {} throw new Error('Cloudinary upload failed: ' + (m || up.status)); }
  const info = await up.json();
  try {
    const url = `https://res.cloudinary.com/${CLD.cloud}/image/upload/${tr}/v${info.version}/${id}.png`;
    for (let i = 0; i < 30; i++) {            // generative effects can answer 423 while they are still being made
      const r = await fetch(url);
      if (r.ok) return Buffer.from(await r.arrayBuffer());
      if (r.status !== 423 && r.status !== 202) throw new Error('Cloudinary: ' + (r.headers.get('x-cld-error') || r.status));
      await sleep(2000);
    }
    throw new Error('Cloudinary took too long. Try a smaller photo.');
  } finally {
    const t2 = Math.floor(Date.now() / 1000), d = new FormData();
    d.set('api_key', CLD.key); d.set('timestamp', String(t2)); d.set('public_id', id); d.set('signature', cldSign({ public_id: id, timestamp: t2 }));
    fetch(`https://api.cloudinary.com/v1_1/${CLD.cloud}/image/destroy`, { method: 'POST', body: d }).catch(() => {});
  }
}
const imgUp = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const ANTH = process.env.ANTHROPIC_API_KEY, ANTH_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
app.get('/api/cld/status', (_req, res) => res.json({ ok: !!CLD, tr: !!ANTH }));
// Khmer -> short English object names for Remove Object (optional: needs ANTHROPIC_API_KEY on the server)
app.post('/api/translate', express.json({ limit: '4kb' }), async (req, res) => {
  if (!ANTH) return res.status(503).send('Translation is not set up on the server');
  const t = String((req.body && req.body.text) || '').trim().slice(0, 200);
  if (!t) return res.status(400).send('No text');
  if (limited(req.ip)) return res.status(429).send('Hourly limit reached. Try again later.');
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': ANTH, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: ANTH_MODEL, max_tokens: 40, system: 'You turn a Khmer or English instruction about removing things from a photo into short English names of the things to remove. Reply with only the names in lowercase, separated by commas, at most 5 names, each at most 4 words, letters only. No other text.', messages: [{ role: 'user', content: t }] }) });
    if (!r.ok) return res.status(502).send('Translation failed');
    const en = String(((await r.json()).content || []).map(c => c.text || '').join(' ')).toLowerCase().replace(/[^a-z ,]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!en) return res.status(422).send('Could not translate');
    res.json({ en });
  } catch { res.status(502).send('Translation failed'); }
});
app.post('/api/cld/:op', imgUp.single('file'), async (req, res) => {
  if (!CLD) return res.status(503).send('Cloudinary is not set up on the server');
  if (!req.file || !/^image\/(png|jpeg|webp)$/.test(req.file.mimetype)) return res.status(400).send('Send a JPG, PNG or WEBP photo');
  if (limited(req.ip)) return res.status(429).send('Hourly limit reached. Try again later.');
  try { const tr = cldSteps(req.params.op, String(req.body.prompt || ''), req.body); res.type('png').send(await cldProcess(req.file.buffer, tr)); }
  catch (e) { res.status(e.status || 502).send(e.message); }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/health', (_req, res) => res.json({ ffmpeg: hasFfmpeg, maxMb: MAX_MB, cloudinary: !!CLD }));

app.post('/api/convert', upload.single('file'), (req, res) => {
  const inPath = req.file && req.file.path;
  if (!inPath) return res.status(400).send('No file received');
  if (!hasFfmpeg) { rm(inPath); return res.status(503).send('ffmpeg is not installed on the server'); }
  if (jobs >= MAX_JOBS) { rm(inPath); return res.status(429).send('Server is busy. Try again in a moment.'); }
  if (limited(req.ip)) { rm(inPath); return res.status(429).send('Hourly conversion limit reached. Try again later.'); }
  const format = String(req.body.format || '');
  const outPath = `${inPath}.${format}`;
  let args;
  try { args = buildArgs(inPath, outPath, req.body); } catch (e) { rm(inPath); return res.status(400).send(e.message); }
  jobs++;
  const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', d => { err = (err + d).slice(-600); });
  const timer = setTimeout(() => p.kill('SIGKILL'), TIMEOUT_MS);
  req.on('aborted', () => p.kill('SIGKILL'));
  p.on('close', code => {
    clearTimeout(timer); jobs--; rm(inPath);
    if (code !== 0) { rm(outPath); return res.status(500).send('Conversion failed: ' + (err.trim().split('\n').pop() || 'unknown error')); }
    res.type(MIME[format]);
    res.sendFile(outPath, () => rm(outPath));
  });
});

app.use((e, _req, res, _next) => res.status(e.code === 'LIMIT_FILE_SIZE' ? 413 : 500).send(e.code === 'LIMIT_FILE_SIZE' ? `File is larger than ${MAX_MB} MB` : 'Server error'));
app.listen(PORT, () => console.log(`MediaForge on http://localhost:${PORT} (ffmpeg: ${hasFfmpeg})`));
