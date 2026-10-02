// MediaForge FFmpeg server: serves the app and converts files with ffmpeg.
const express = require('express');
const multer = require('multer');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = process.env.PORT || 3000;
const MAX_MB = +process.env.MAX_MB || 500;
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

app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/health', (_req, res) => res.json({ ffmpeg: hasFfmpeg, maxMb: MAX_MB }));

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
