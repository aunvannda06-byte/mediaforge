# Hosting MediaForge

MediaForge has two parts:

| Part | What it is | Where it can live |
|---|---|---|
| Website | `public/index.html` (one static file) | Netlify, GitHub Pages, or Render |
| FFmpeg server | `server.js` (Node + ffmpeg) | Render (Docker). Netlify and GitHub Pages cannot run it |

Without the server the site still works in the browser (WebM, WAV, MP3, editors). The server unlocks MP4, MOV, MKV, AVI, GIF, AAC, M4A, OGG, FLAC and cropping to 9:16 / 1:1 / 4:5.

## Option A: everything on Render (easiest, one URL)
1. Create a GitHub account and a new repository. Upload the contents of this folder (Dockerfile, server.js, package.json, render.yaml, public/ ...).
2. Go to render.com, sign in with GitHub, choose New > Blueprint, pick your repo. Render reads `render.yaml` and builds the Docker image.
3. After the deploy finishes, open the `https://<name>.onrender.com` URL. The page and the server share one address, so no extra setup.
4. Check `https://<name>.onrender.com/api/health` shows `{"ffmpeg":true,...}`.

Free plan limits: the service sleeps after about 15 minutes idle (first request takes ~1 minute), it has little CPU and 512 MB RAM, so keep MAX_MB at 100 or lower and expect slow conversions. A paid plan removes the sleep.

## Option B: website on Netlify, server on Render
1. Do Option A first so you have the Render URL.
2. Open `public/index.html`, find `window.MF_API=""` near the top and put your Render URL inside, e.g. `window.MF_API="https://mediaforge.onrender.com"` (no trailing slash).
3. Netlify: easiest is drag the `public` folder onto app.netlify.com/drop. Or connect the GitHub repo; `netlify.toml` already sets the publish folder to `public`.
4. In Render > your service > Environment, set `ALLOWED_ORIGIN` to your Netlify URL (e.g. `https://my-site.netlify.app`) and save. This stops other websites from using your server.

## Option C: website on GitHub Pages, server on Render
1. Do steps 1-2 of Option B (Render URL inside `index.html`).
2. Push the repo to GitHub. In the repo: Settings > Pages > Source: **GitHub Actions**. The included workflow publishes `public/` on every push to `main`.
3. Your site is at `https://<user>.github.io/<repo>/`. Set `ALLOWED_ORIGIN` on Render to `https://<user>.github.io` (no path).

## Server settings (environment variables)
`MAX_MB` max upload size (default 500) | `MAX_JOBS` parallel conversions (default 2) | `TIMEOUT_MIN` per job (default 20) | `RATE_PER_HOUR` conversions per IP per hour (default 20) | `ALLOWED_ORIGIN` allowed website URLs, comma separated (default `*`) | `CLOUDINARY_URL` Cloudinary keys for the Photo Editor AI tools (optional, see README).

## Before making it public
- Set `ALLOWED_ORIGIN` and a modest `MAX_MB` / `RATE_PER_HOUR`. The rate limit is in memory and resets on restart.
- There is no sign-in, so anyone who finds the server URL can use its limits. Add accounts or an API gateway before inviting many users.
- Replace the placeholder Privacy, Terms and Contact text with real wording.
- Uploaded files are deleted right after conversion, but nothing is encrypted beyond HTTPS.

## Run locally
`npm install && node server.js` then open http://localhost:3000 (ffmpeg must be installed).
