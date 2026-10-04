# MediaForge server

Serves the MediaForge app and converts files with FFmpeg. When it is running, every
format in the app unlocks (MP4, MOV, AVI, MKV, WMV, FLV, GIF, AAC, OGG, OPUS, FLAC, M4A, AIFF, WMA).
The audio and video editors can open any file type; if the browser cannot read it, the server converts it automatically.

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

## Photo Editor
Open #photo-editor. Runs fully in the browser (public/photo-editor/). AI tools (remove background/object, face enhance, upscale) need a provider: define window.PE_PROVIDER, see the top of pe.js.

### Photo Editor updates
- Crop: drag the box and its handles with the mouse (ratio lock: Free, Original, 1:1, 4:3, 3:4, 16:9, 9:16).
- Text & Sticker: 34 fonts (Khmer + display, bundled in public/photo-editor/fonts, listed in fonts.css) and 20 text styles. "Khmer OS Siemreap" and "Khmer OS Moul Light" use the installed Khmer OS font if present, otherwise the bundled Siemreap / Moul designs.
- Collage: 2, 3, 4, 6, 9 photo layouts and Freeform. Click an empty box to add a photo, drag inside a photo to reposition.
- public/photo-editor/sample.jpg is a generated demo photo (no real person).
- Face Swap (no AI): Photo Editor > Face Swap. Place an oval on the target face and on the source face, then Preview. Skin tone is matched in OKLab, light and shade are blended with a seamless-clone edge correction, and Soften, Grain, Size, Rotate and Move sliders fine-tune it. Faces must be placed by hand because automatic face finding needs a model.
