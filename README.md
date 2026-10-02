# MediaForge server

Serves the MediaForge app and converts files with FFmpeg. When it is running, every
format in the app unlocks (MP4, MOV, AVI, MKV, GIF, AAC, OGG, FLAC, M4A).

## Run with Docker
    docker build -t mediaforge .
    docker run -p 3000:3000 mediaforge
Open http://localhost:3000

## Run without Docker
Install Node 18+ and FFmpeg, then:
    npm install
    npm start

## Settings (environment variables)
- PORT (default 3000)
- MAX_MB largest upload in MB (default 500)
- MAX_JOBS conversions at the same time (default 2)
- TIMEOUT_MIN minutes before a conversion is stopped (default 20)

## Notes
- Uploaded and converted files are deleted as soon as each job finishes.
- Requests are limited to a fixed list of formats and settings. FFmpeg is started without a shell.
- This version has no sign-in. Before putting it on the public internet, add authentication and
  rate limiting (for example behind a reverse proxy), because conversions use a lot of CPU.
- To host the page somewhere else, set window.MF_API = "https://your-server" before the page script.
  The server would then also need CORS headers for that site.
- Background removal and watermark removal still need a model or API.
