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
- Collage: 2, 3, 4, 6, 9 photo layouts and Freeform. For more than 9 photos type the number (10 to 30) in the box under the layout buttons and press Set or Enter; grid layouts are made for that number. Freeform grows as you add photos (up to 30). Click an empty box to add a photo, drag inside a photo to reposition.
- public/photo-editor/sample.jpg is a generated demo photo (no real person).

### Cloudinary AI (Photo Editor)
Set `CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME` (or `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) on the server, then restart. The keys stay on the server; the browser only talks to `/api/cld/*`.
- Remove BG -> `e_background_removal` (enable the Cloudinary AI Background Removal add-on)
- Remove Object -> `e_gen_remove` (type what to remove, for example "watermark")
- Portrait > Face Enhance -> `e_gen_restore`
- Photos are sent at up to 2048 px, processed, then deleted from Cloudinary. The hourly per-IP limit (`RATE_PER_HOUR`) also applies.

### AI Enhance (Cloudinary)
With Cloudinary connected, AI Enhance sends the photo to Cloudinary and uses the result as the working photo:
- AI Professional Enhance: Low = `e_gen_restore`; Medium = `+ e_improve`; Strong = `+ e_enhance` (clean noise and compression, sharper detail, balanced light and color), then a light local finish.
- AI Focus / Denoise / Face -> `e_gen_restore`; AI HDR / Color -> `e_improve`; AI Lighting -> `e_enhance`.
- The result keeps the photo's pixel size. Compare shows the original on the left; the top Download button saves exactly what you see (AI result + sliders + crop + text) using the Export settings (default JPG, high quality, original size).
- Photos up to 2048 px are sent; larger photos are sent at 2048 px and the result is scaled back to the original size.

### Restore & Diversify (AI Enhance tab)
For old, faded, stained or scratched prints. Strength (Low / Medium / Strong) at the top of the tab applies to all of them.
- Restore Old Photo: removes dust and specks, fixes fade, makes sepia/yellow prints neutral, adds clarity. With Cloudinary connected it first runs `e_gen_restore`, then the local clean-up.
- Remove Spots & Scratches: local (`public/photo-editor/restore.js`, open/close filters, no AI). Removes specks smaller than about 2, 3 or 5 px at 900 px width. Large stains and missing areas need an AI provider.
- Fix Faded Photo (keeps color), Neutral Black & White, Studio Portrait Clean: local tone, clarity, sharpness and noise settings.
- AI Colorize: needs `window.PE_PROVIDER.colorize(canvas)` returning a canvas. Not configured by default, nothing is faked.
- Very large photos (over about 12 MP) can take 10 to 15 seconds for the speck clean-up.

### Use Template (Photo Editor)
Home page: Use Template > Upload photo, or choose White, Black or Blank PNG (transparent). Inside the editor: Use Template in the left menu.
- Backgrounds: White, Black, Blank PNG, plus Blue, Red, Grey and a custom color.
- Canvas sizes: ID 4x6 cm, ID 3x4 cm, Passport 35x45 mm, 1:1, 4:5, 16:9, 9:16, or same as the photo.
- Photo: Fit or Fill, size, move (or drag on the canvas), rotate. After you upload a photo, "Add photo" puts more photos on the same template (up to 12, several can be chosen at once). Tap a photo on the canvas, or its Photo 1, 2, 3 button, to select it; Fit/Fill, size, move and rotate apply to the selected photo. Change photo and Remove photo work on the selected photo. Remove photo background needs `PE_PROVIDER.removeBackground` (Cloudinary).
- Apply Template bakes it into the working photo, so every other tool still works. Blank PNG exports as PNG with transparency; JPG export is flattened on white.

### Remove Background and Remove Object
- Tap a suggestion and it runs at once, or type it and press Enter / Run. Khmer and English both work.
- Remove Background: Transparent, White, Black, Blue, Red, Green, Grey, Blur, your own photo, or a custom color. The cut-out is cached, so trying another background costs no extra AI call. Typed examples: `ផ្ទៃខាងក្រោយពណ៌ខៀវ`, `ពណ៌ស`, `blue background`, `#1e90ff`.
- Remove Object: 12 suggestions (watermark, logo, text, date stamp, person, ...). Typed Khmer is matched against a built-in word list (about 40 words). Anything else is translated to English by the server when `ANTHROPIC_API_KEY` is set (`ANTHROPIC_MODEL` optional, default claude-haiku-4-5-20251001). Without the key, unknown Khmer shows a message and nothing is sent.
- New server routes: `POST /api/translate` and `/api/cld/recolor`. `/api/cld/status` now also reports `tr` (translation available).
