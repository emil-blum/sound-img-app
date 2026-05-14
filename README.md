# Sound.IMG

**An image-to-music instrument built in the browser.**

Upload any image and play it. Every pixel becomes a note — its colour sets the pitch, its brightness the velocity. Navigate the image with arrow keys, play notes on your keyboard, drag to capture looping sequences, and layer up to unlimited loops in real time.

> Experiment in Progress by [Emīl Blūm](https://emilblum.com)

---

## How it works

- **MPC Mode** — Arrow keys move a 6×4 cursor across the image. Each of the 24 keys (1–6, Q–Y, A–H, Z–N) maps to a pixel. Hue determines pitch within the active scale, lightness determines velocity.
- **Pixel Loops** — Click and drag horizontally across a row of 2–8 pixels to capture a looping sequence. Each loop runs through its own FX chain (Reverb, Delay, Chorus, Distortion, Phaser, Compressor).
- **Recorded Loops** — Hit REC while the transport is playing, perform on the MPC pads, then stop to capture a free loop that repeats at the recorded duration.
- **Transport** — Play / Pause / Stop in the header. Pause holds position, Stop resets to bar 0.
- **Loop Locate** — The crosshair button on each loop card jumps the canvas viewport to that loop's source pixel.

## Instruments

| Name | Type | Notes |
|---|---|---|
| Synth (Tri) | Oscillator | Generated, no samples |
| Drums | Sample | 10 sounds, 808-style |
| Keys | Sample | Piano, C2–B6 |
| Vocals | Sample | 50 chordal vocal pads, C2–C#6 |
| Custom Pack | Sample | Upload your own .mp3 / .wav |

## Controls

| Key / Action | Function |
|---|---|
| Arrow keys | Navigate MPC cursor |
| 1–6, Q–Y, A–H, Z–N | Play pads |
| Click + drag | Capture pixel loop |
| Space + drag | Pan canvas |
| Scroll | Zoom in / out |

## Running locally

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build → dist/
```

Requires Node 18+. No API keys or environment variables needed.

## Deploying to Vercel

A `vercel.json` is included. Connect the repo to Vercel, set framework to Vite — it deploys as a static site with no server-side config required.

---

## Sample packs used

**Chordal Vocal One Shots — Free Sample Pack #GM0127**
by GowlerMusic
https://gowlermusic.bandcamp.com/album/chordal-vocal-one-shots-free-sample-pack-gm0127

**88 Piano Keys, Long Reverb**
by TEDAgame
https://freesound.org/people/TEDAgame/packs/25405/

**DRUMBOII 808 Drum Pack**
by Drumboii
https://drumboii.com/products/free-808-sample-pack

---

## License

MIT License

Copyright (c) 2026 Emīl Blūm

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
