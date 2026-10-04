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
- Face Swap (no AI): Photo Editor > Face Swap. Place an oval on the target face and on the source face, then Preview. Light, shade and skin tone come from the target photo and facial detail from the source (frequency separation in OKLab, a face-shaped mask with hairline fade). Soften, Grain, Size, Width, Height, Rotate and Move sliders fine-tune it. Faces must be placed by hand because automatic face finding needs a model.

### Cloudinary AI (Photo Editor)
Set `CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME` (or `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) on the server, then restart. The keys stay on the server; the browser only talks to `/api/cld/*`.
- Remove BG -> `e_background_removal` (enable the Cloudinary AI Background Removal add-on)
- Remove Object -> `e_gen_remove` (type what to remove, for example "watermark")
- Portrait > Face Enhance -> `e_gen_restore`
- Photos are sent at up to 2048 px, processed, then deleted from Cloudinary. The hourly per-IP limit (`RATE_PER_HOUR`) also applies.
- Cloudinary has no face-swap API, so Face Swap stays the built-in no-AI tool. After swapping, Portrait > Face Enhance can add polish.
