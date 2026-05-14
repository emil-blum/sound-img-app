import React, { useEffect, useRef, useReducer, useCallback, useState } from "react";
import * as Tone from "tone";
import {
  X, Play, Pause, Square, Volume2, Layers, Grid3X3,
  Camera, RefreshCcw, Crosshair, Mic
} from "lucide-react";

// ─── Canvas dimensions ────────────────────────────────────────────────────────
let CW = 800, CH = 450;

// ─── Design tokens ───────────────────────────────────────────────────────────
const P = {
  bg:          "#050506",
  panel:       "#0a0a0c",
  cell:        "#0e0e10",
  border:      "rgba(255,255,255,0.08)",
  borderHov:   "rgba(255,255,255,0.18)",
  txt:         "#e0e0e0",
  sub:         "#888",
  accent:      "#ff3e00",
  accentSoft:  "rgba(255,62,0,0.12)",
  accentGlow:  "rgba(255,62,0,0.35)",
  blue:        "#0090cc",
  blueT:       "rgba(0,144,204,0.18)",
  track:       "#1a1a1f",
};

// ─── Scales ──────────────────────────────────────────────────────────────────
const SCALES = {
  pentatonicMinor: { notes: [0, 3, 5, 7, 10],          label: "Penta Minor" },
  pentatonicMajor: { notes: [0, 2, 4, 7, 9],           label: "Penta Major" },
  naturalMinor:    { notes: [0, 2, 3, 5, 7, 8, 10],    label: "Nat Minor"   },
  major:           { notes: [0, 2, 4, 5, 7, 9, 11],    label: "Major"       },
  dorian:          { notes: [0, 2, 3, 5, 7, 9, 10],    label: "Dorian"      },
  blues:           { notes: [0, 3, 5, 6, 7, 10],       label: "Blues"       },
  chromatic:       { notes: [0,1,2,3,4,5,6,7,8,9,10,11], label: "Chromatic" },
};

const ROOT_NAMES  = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const STRIP_COLS  = ["#0090cc","#ff6b6b","#ffd93d","#6bcb77","#ff922b","#cc5de8","#20c997","#f06595"];

const INSTRUMENTS = [
  { id: "synth",   label: "Synth (Tri)" },
  { id: "drums",   label: "Drums"       },
  { id: "keys",     label: "Keys"        },
  { id: "vocals",  label: "Vocals"      },
  { id: "custom",  label: "Custom Pack" },
];

const CUSTOM_NOTE_SLOTS = [
  "C3","D3","E3","F3","G3","A3","B3",
  "C4","D4","E4","F4","G4","A4","B4",
  "C5","D5","E5","F5","G5","A5","B5","C6",
];

const SAMPLE_MAPS: Record<string, any> = {
  // 10 sounds mapped to pentatonic minor at C (default scale) — nearest-note lookup, no pitch-shifting on defaults
  drums: {
    C4: "boom.wav", "D#4": "kick.wav", F4: "tom1.wav", G4: "tom2.wav", "A#4": "tom3.wav",
    C5: "tom4.wav", "D#5": "808s.wav", F5: "clap.wav", G5: "hat.wav",  "A#5": "bell.wav",
  },
  keys: {
    C2: "C2.ogg", D2: "D2.ogg", E2: "E2.ogg", F2: "F2.ogg", G2: "G2.ogg", A2: "A2.ogg", B2: "B2.ogg",
    C3: "C3.ogg", D3: "D3.ogg", E3: "E3.ogg", F3: "F3.ogg", G3: "G3.ogg", A3: "A3.ogg", B3: "B3.ogg",
    C4: "C4.ogg", D4: "D4.ogg", E4: "E4.ogg", F4: "F4.ogg", G4: "G4.ogg", A4: "A4.ogg", B4: "B4.ogg",
    C5: "C5.ogg", D5: "D5.ogg", E5: "E5.ogg", F5: "F5.ogg", G5: "G5.ogg", A5: "A5.ogg", B5: "B5.ogg",
    C6: "C6.ogg", D6: "D6.ogg", E6: "E6.ogg", F6: "F6.ogg", G6: "G6.ogg", A6: "A6.ogg", B6: "B6.ogg",
  },
  // 50 chordal vocal pads mapped 1-per-semitone C2–C#6: nearest-note always hits an exact anchor, zero pitch-shifting
  vocals: {
    C2:    "v01.ogg", "C#2": "v02.ogg", D2:    "v03.ogg", "D#2": "v04.ogg", E2:    "v05.ogg",
    F2:    "v06.ogg", "F#2": "v07.ogg", G2:    "v08.ogg", "G#2": "v09.ogg", A2:    "v10.ogg",
    "A#2": "v11.ogg", B2:   "v12.ogg",
    C3:    "v13.ogg", "C#3": "v14.ogg", D3:    "v15.ogg", "D#3": "v16.ogg", E3:    "v17.ogg",
    F3:    "v18.ogg", "F#3": "v19.ogg", G3:    "v20.ogg", "G#3": "v21.ogg", A3:    "v22.ogg",
    "A#3": "v23.ogg", B3:   "v24.ogg",
    C4:    "v25.ogg", "C#4": "v26.ogg", D4:    "v27.ogg", "D#4": "v28.ogg", E4:    "v29.ogg",
    F4:    "v30.ogg", "F#4": "v31.ogg", G4:    "v32.ogg", "G#4": "v33.ogg", A4:    "v34.ogg",
    "A#4": "v35.ogg", B4:   "v36.ogg",
    C5:    "v37.ogg", "C#5": "v38.ogg", D5:    "v39.ogg", "D#5": "v40.ogg", E5:    "v41.ogg",
    F5:    "v42.ogg", "F#5": "v43.ogg", G5:    "v44.ogg", "G#5": "v45.ogg", A5:    "v46.ogg",
    "A#5": "v47.ogg", B5:   "v48.ogg",
    C6:    "v49.ogg", "C#6": "v50.ogg",
  },
};

function getSamplerNote(midi: number, keys: string[]): string {
  if (!keys.length) return Tone.Frequency(midi, "midi").toNote();
  return keys.reduce((best, key) => {
    const dBest = Math.abs(Tone.Frequency(best).toMidi() - midi);
    const dKey  = Math.abs(Tone.Frequency(key).toMidi()  - midi);
    return dKey < dBest ? key : best;
  });
}

// ─── Key → grid ──────────────────────────────────────────────────────────────
const GRID_MAP: Record<string, { r: number; c: number }> = {
  Digit1: { r:0,c:0 }, Digit2: { r:0,c:1 }, Digit3: { r:0,c:2 },
  Digit4: { r:0,c:3 }, Digit5: { r:0,c:4 }, Digit6: { r:0,c:5 },
  KeyQ:   { r:1,c:0 }, KeyW:   { r:1,c:1 }, KeyE:   { r:1,c:2 },
  KeyR:   { r:1,c:3 }, KeyT:   { r:1,c:4 }, KeyY:   { r:1,c:5 },
  KeyA:   { r:2,c:0 }, KeyS:   { r:2,c:1 }, KeyD:   { r:2,c:2 },
  KeyF:   { r:2,c:3 }, KeyG:   { r:2,c:4 }, KeyH:   { r:2,c:5 },
  KeyZ:   { r:3,c:0 }, KeyX:   { r:3,c:1 }, KeyC:   { r:3,c:2 },
  KeyV:   { r:3,c:3 }, KeyB:   { r:3,c:4 }, KeyN:   { r:3,c:5 },
};
const KEY_LBL: Record<string, string> = {
  Digit1:"1", Digit2:"2", Digit3:"3", Digit4:"4", Digit5:"5", Digit6:"6",
  KeyQ:"Q", KeyW:"W", KeyE:"E", KeyR:"R", KeyT:"T", KeyY:"Y",
  KeyA:"A", KeyS:"S", KeyD:"D", KeyF:"F", KeyG:"G", KeyH:"H",
  KeyZ:"Z", KeyX:"X", KeyC:"C", KeyV:"V", KeyB:"B", KeyN:"N",
};
const PAD_ROWS = [
  ["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6"],
  ["KeyQ","KeyW","KeyE","KeyR","KeyT","KeyY"],
  ["KeyA","KeyS","KeyD","KeyF","KeyG","KeyH"],
  ["KeyZ","KeyX","KeyC","KeyV","KeyB","KeyN"],
];

// ─── Music utilities ─────────────────────────────────────────────────────────
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
  let h = 0, s = 0, l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (mx === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToMidi(h: number, s: number, l: number, root: number, intervals: number[], oct: number) {
  let midi;
  if (s < 5) {
    const deg = Math.round((l / 100) * (intervals.length - 1));
    midi = root + intervals[deg];
  } else {
    const tot = intervals.length * 2;
    const deg = Math.floor((h / 360) * tot) % tot;
    midi = root + Math.floor(deg / intervals.length) * 12 + intervals[deg % intervals.length];
  }
  return Math.max(0, Math.min(127, midi + oct * 12));
}

function pxVel(l: number) { return Math.round(Math.max(0.06, Math.pow(Math.max(0.06, l / 100), 2)) * 127); }

function formatDur(sec: number): string {
  return sec < 2 ? `${Math.round(sec * 10) / 10}s` : `${Math.round(sec)}s`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface RecordedNote { time: number; note: string; velocity: number; }

interface Loop {
  id: string;
  type: "pixel" | "recorded";
  // pixel
  y: number; x0: number; x1: number;
  // recorded
  recordedNotes?: RecordedNote[];
  duration?: number;
  // shared
  col: string; muted: boolean; octave: number; root: number;
  speed: "half" | "normal" | "double";
  volume: number; distortion: number; reverb: number;
  delay: number; chorus: number; phaser: number; compression: number;
  instrument: string;
}

interface AppState {
  imgLoaded: boolean; iw: number; ih: number;
  mx: number; my: number;
  pads: Record<string, number>;
  loops: Loop[]; colIdx: number;
  bpm: number; scale: keyof typeof SCALES; root: number; oct: number;
  metro: boolean; vol: number;
  sel: boolean; sx0: number | null; sx1: number | null; sy: number | null;
  ready: boolean;
  transportState: "stopped" | "playing" | "paused";
  isPanning: boolean; spacePressed: boolean; mpcInstrument: string;
}

type Action =
  | { t: "IMG";      w: number; h: number }
  | { t: "MOVE";     d: "l"|"r"|"u"|"d"; amount?: number }
  | { t: "JUMP";     x: number; y: number }
  | { t: "PON";      k: string }
  | { t: "POFF";     k: string }
  | { t: "SS";       x: number; y: number }
  | { t: "SU";       x: number }
  | { t: "SC" }
  | { t: "SK" }
  | { t: "LRME";     id: string }
  | { t: "LMUT";     id: string }
  | { t: "LSET";     id: string; p: string; v: any }
  | { t: "REC_LOOP"; events: RecordedNote[]; duration: number; instrument: string }
  | { t: "BPM";      v: number }
  | { t: "SCL";      v: keyof typeof SCALES }
  | { t: "ROOT";     v: number }
  | { t: "OCT";      v: number }
  | { t: "MTR" }
  | { t: "VOL";      v: number }
  | { t: "RDY" }
  | { t: "TSTATE";   v: "stopped"|"playing"|"paused" }
  | { t: "SPACE";    pressed: boolean }
  | { t: "PAN_START" }
  | { t: "PAN_END" }
  | { t: "MPC_INST"; v: string };

const INIT: AppState = {
  imgLoaded: false, iw: 0, ih: 0,
  mx: 0, my: 0, pads: {},
  loops: [], colIdx: 0,
  bpm: 120, scale: "pentatonicMinor", root: 0, oct: 0,
  metro: false, vol: 0.7,
  sel: false, sx0: null, sx1: null, sy: null,
  ready: false, transportState: "stopped",
  isPanning: false, spacePressed: false, mpcInstrument: "synth",
};

// ─── Reducer ─────────────────────────────────────────────────────────────────
function reducer(s: AppState, a: Action): AppState {
  switch (a.t) {
    case "IMG":
      return { ...s, imgLoaded: true, iw: a.w, ih: a.h,
        mx: Math.max(0, Math.floor(a.w/2) - 3),
        my: Math.max(0, Math.floor(a.h/2) - 2) };
    case "MOVE": {
      const amt = a.amount || 1;
      let x = s.mx, y = s.my;
      if (a.d === "l") x = Math.max(0, x - amt);
      if (a.d === "r") x = Math.min(s.iw - 6, x + amt);
      if (a.d === "u") y = Math.max(0, y - amt);
      if (a.d === "d") y = Math.min(s.ih - 4, y + amt);
      return { ...s, mx: x, my: y };
    }
    case "JUMP":
      return { ...s,
        mx: Math.max(0, Math.min(s.iw - 6, Math.round(a.x - 3))),
        my: Math.max(0, Math.min(s.ih - 4, Math.round(a.y - 2))) };
    case "PON":  return { ...s, pads: { ...s.pads, [a.k]: Date.now() } };
    case "POFF": { const p = { ...s.pads }; delete p[a.k]; return { ...s, pads: p }; }
    case "SS":   return { ...s, sel: true, sx0: a.x, sx1: a.x, sy: a.y };
    case "SU":   return { ...s, sx1: a.x };
    case "SC":   return { ...s, sel: false, sx0: null, sx1: null, sy: null };
    case "SK": {
      if (s.sx0 == null || s.sx1 == null || s.sy == null) return { ...s, sel: false };
      const xa = Math.max(0, Math.min(s.sx0, s.sx1));
      const xb = Math.min(s.iw - 1, Math.min(xa + 7, Math.max(s.sx0, s.sx1)));
      if (xb - xa < 1) return { ...s, sel: false, sx0: null, sx1: null, sy: null };
      const col = STRIP_COLS[s.colIdx % STRIP_COLS.length];
      return { ...s, sel: false, sx0: null, sx1: null, sy: null,
        loops: [...s.loops, {
          id: crypto.randomUUID(), type: "pixel",
          y: s.sy, x0: xa, x1: xb, col, muted: false,
          octave: 0, root: s.root, speed: "normal", volume: 0.8,
          distortion: 0, reverb: 0, delay: 0, chorus: 0, phaser: 0, compression: 0,
          instrument: s.mpcInstrument,
        }],
        colIdx: s.colIdx + 1 };
    }
    case "LRME": return { ...s, loops: s.loops.filter(l => l.id !== a.id) };
    case "LMUT": return { ...s, loops: s.loops.map(l => l.id === a.id ? { ...l, muted: !l.muted } : l) };
    case "LSET": return { ...s, loops: s.loops.map(l => l.id === a.id ? { ...l, [a.p]: a.v } : l) };
    case "REC_LOOP": {
      const col = STRIP_COLS[s.colIdx % STRIP_COLS.length];
      return { ...s,
        loops: [...s.loops, {
          id: crypto.randomUUID(), type: "recorded",
          y: -1, x0: 0, x1: 0,
          recordedNotes: a.events, duration: a.duration,
          col, muted: false, octave: 0, root: s.root, speed: "normal",
          volume: 0.8, distortion: 0, reverb: 0, delay: 0, chorus: 0, phaser: 0, compression: 0,
          instrument: a.instrument,
        }],
        colIdx: s.colIdx + 1 };
    }
    case "BPM":      return { ...s, bpm: Math.min(240, Math.max(40, a.v)) };
    case "SCL":      return { ...s, scale: a.v };
    case "ROOT":     return { ...s, root: a.v };
    case "OCT":      return { ...s, oct: a.v };
    case "MTR":      return { ...s, metro: !s.metro };
    case "VOL":      return { ...s, vol: a.v };
    case "RDY":      return { ...s, ready: true, transportState: "playing" };
    case "TSTATE":   return { ...s, transportState: a.v };
    case "SPACE":    return { ...s, spacePressed: a.pressed };
    case "PAN_START":return { ...s, isPanning: true, sel: false };
    case "PAN_END":  return { ...s, isPanning: false };
    case "MPC_INST": return { ...s, mpcInstrument: a.v };
    default:         return s;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function App() {
  const [s, d] = useReducer(reducer, INIT);
  const sr = useRef(s); sr.current = s;
  const lr = useRef(s.loops); lr.current = s.loops;

  type CustomFile = { id: string; note: string; url: string; name: string };
  const [customFiles, setCustomFiles] = useState<CustomFile[]>([]);
  const customFilesRef = useRef<CustomFile[]>([]); customFilesRef.current = customFiles;
  const [customVersion, setCustomVersion] = useState(0);
  const customSamplerRef   = useRef<Tone.Sampler | null>(null);
  const loopInstruments    = useRef(new Map<string, string>()); // loop.id → built instrument id

  // Canvas + nav refs
  const cvs    = useRef<HTMLCanvasElement>(null);
  const navCvs = useRef<HTMLCanvasElement>(null);
  const imgEl  = useRef<HTMLImageElement | null>(null);
  const pxDat  = useRef<Uint8ClampedArray | null>(null);

  // Audio refs
  const masterGain      = useRef<Tone.Gain | null>(null);
  const reverbNode      = useRef<Tone.Reverb | null>(null);
  const sharedChorusBus = useRef<Tone.Chorus | null>(null);
  const sharedPhaserBus = useRef<Tone.Phaser | null>(null);
  const mpcSynth        = useRef<Tone.PolySynth | Tone.Sampler | null>(null);
  const preloadedSamplers = useRef<Map<string, Tone.Sampler>>(new Map());
  const loopSynths  = useRef(new Map<string, Tone.Synth | Tone.Sampler>());
  const loopNodes   = useRef(new Map<string, {
    vol: Tone.Volume; dist: Tone.Distortion; reverbSend: Tone.Gain;
    chorusSend: Tone.Gain; phaserSend: Tone.Gain; delay: Tone.FeedbackDelay;
    comp: Tone.Compressor; chain: any;
  }>());
  const loopSeqs    = useRef(new Map<string, Tone.Sequence | Tone.Part<any>>());
  const metroSynth  = useRef<Tone.Synth | null>(null);
  const metroSeq    = useRef<Tone.Sequence | null>(null);

  // Interaction refs
  const flashes        = useRef(new Map<string, number>());
  const heldKeys       = useRef(new Set<string>());
  const triggeredNotes = useRef(new Map<string, string>());
  const arrowKeys      = useRef(new Set<string>());
  const raf            = useRef<number | null>(null);
  const moveInterval   = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMousePos   = useRef<{ x: number; y: number } | null>(null);

  // Recording refs
  const isRecordingRef    = useRef(false);
  const recordStartRef    = useRef(0);
  const recordedEventsRef = useRef<RecordedNote[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Mobile detection
  const [isMobile] = useState(() =>
    typeof window !== "undefined" && (window.innerWidth < 1024 || "ontouchstart" in window)
  );

  // ── Canvas container resize ────────────────────────────────────────────────
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width < 10 || height < 10) return;
      const dpr = window.devicePixelRatio || 1;
      CW = Math.round(width);
      CH = Math.round(height);
      if (cvs.current) {
        cvs.current.width = CW * dpr;
        cvs.current.height = CH * dpr;
        const ctx2 = cvs.current.getContext("2d");
        if (ctx2) ctx2.scale(dpr, dpr);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Transport handlers ─────────────────────────────────────────────────────
  const handleTransportPlay = useCallback(() => {
    if (!sr.current.ready) return;
    Tone.getTransport().start();
    d({ t: "TSTATE", v: "playing" });
  }, []);

  const handleTransportPause = useCallback(() => {
    if (!sr.current.ready) return;
    Tone.getTransport().pause();
    d({ t: "TSTATE", v: "paused" });
  }, []);

  const handleTransportStop = useCallback(() => {
    if (!sr.current.ready) return;
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      setIsRecording(false);
    }
    Tone.getTransport().stop();
    d({ t: "TSTATE", v: "stopped" });
  }, []);

  // ── Recording ─────────────────────────────────────────────────────────────
  const toggleRecording = useCallback(() => {
    const st = sr.current;
    if (!st.ready || st.transportState !== "playing") return;
    if (!isRecordingRef.current) {
      isRecordingRef.current = true;
      recordStartRef.current = Tone.getTransport().seconds;
      recordedEventsRef.current = [];
      setIsRecording(true);
    } else {
      isRecordingRef.current = false;
      setIsRecording(false);
      const duration = Tone.getTransport().seconds - recordStartRef.current;
      if (duration >= 0.2 && recordedEventsRef.current.length > 0) {
        const secPerBar = (60 / st.bpm) * 4;
        const bars = Math.max(1, Math.round(duration / secPerBar));
        d({
          t: "REC_LOOP",
          events: [...recordedEventsRef.current],
          duration: bars * secPerBar,
          instrument: st.mpcInstrument,
        });
      }
    }
  }, []);

  // ── Pixel helper ──────────────────────────────────────────────────────────
  const pixAt = useCallback((ix: number, iy: number) => {
    const st = sr.current, data = pxDat.current;
    if (!data || ix < 0 || ix >= st.iw || iy < 0 || iy >= st.ih) return null;
    const i = (iy * st.iw + ix) * 4;
    const r = data[i], g = data[i+1], b = data[i+2];
    const { h, s, l } = rgbToHsl(r, g, b);
    return { r, g, b, midi: hslToMidi(h, s, l, 60 + st.root, SCALES[st.scale].notes, st.oct), vel: pxVel(l) };
  }, []);

  // ── Audio init ─────────────────────────────────────────────────────────────
  const initAudio = useCallback(async () => {
    if (sr.current.ready) return;
    await Tone.start();
    masterGain.current = new Tone.Gain(sr.current.vol).toDestination();
    reverbNode.current = new Tone.Reverb({ decay: 2.5, preDelay: 0.01, wet: 1.0 }).connect(masterGain.current);
    reverbNode.current.generate();
    sharedChorusBus.current = new Tone.Chorus({ frequency: 4, delayTime: 2, depth: 0.5, wet: 1.0 }).start().connect(masterGain.current);
    sharedPhaserBus.current = new Tone.Phaser({ frequency: 0.5, octaves: 3, baseFrequency: 350, wet: 1.0 }).connect(masterGain.current);
    metroSynth.current = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
    }).connect(masterGain.current);
    metroSynth.current.volume.value = -10;
    metroSeq.current = new Tone.Sequence((time, b) => {
      if (!sr.current.metro) return;
      metroSynth.current?.triggerAttackRelease(b === 0 ? "G5" : "C5", "32n", time, b === 0 ? 0.85 : 0.45);
    }, [0,1,2,3], "4n");
    metroSeq.current.loop = true;
    metroSeq.current.start(0);
    const transport = Tone.getTransport();
    transport.bpm.value = sr.current.bpm;
    transport.start();
    d({ t: "RDY" });
  }, []);

  // ── Sampler loader (on-demand) ─────────────────────────────────────────────
  const ensureSampler = useCallback((inst: string): Tone.Sampler => {
    if (!preloadedSamplers.current.has(inst)) {
      preloadedSamplers.current.set(inst, new Tone.Sampler({
        urls: SAMPLE_MAPS[inst], baseUrl: `/samples/${inst}/`,
      }).connect(masterGain.current!));
    }
    return preloadedSamplers.current.get(inst)!;
  }, []);

  // ── MPC synth switch ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!s.ready || !masterGain.current) return;
    if (s.mpcInstrument === "synth") {
      if (mpcSynth.current instanceof Tone.PolySynth) return;
      if (mpcSynth.current instanceof Tone.PolySynth) mpcSynth.current.dispose();
      mpcSynth.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.12, sustain: 0.3, release: 0.3 },
      }).connect(masterGain.current);
    } else if (s.mpcInstrument === "custom") {
      const target = customSamplerRef.current;
      if (mpcSynth.current === target) return;
      if (mpcSynth.current instanceof Tone.PolySynth) mpcSynth.current.dispose();
      mpcSynth.current = target;
    } else {
      const sampler = ensureSampler(s.mpcInstrument);
      if (mpcSynth.current === sampler) return;
      if (mpcSynth.current instanceof Tone.PolySynth) mpcSynth.current.dispose();
      mpcSynth.current = sampler;
    }
  }, [s.ready, s.mpcInstrument, ensureSampler]);

  // ── Custom pack rebuild ────────────────────────────────────────────────────
  useEffect(() => {
    lr.current.forEach(lp => {
      if (lp.instrument === "custom") {
        loopSynths.current.get(lp.id)?.dispose();
        loopSynths.current.delete(lp.id);
      }
    });
    if (!s.ready || !masterGain.current || customFiles.length === 0) { setCustomVersion(v => v + 1); return; }
    customSamplerRef.current?.dispose();
    const urls: Record<string, string> = {};
    customFiles.forEach(f => { urls[f.note] = f.url; });
    customSamplerRef.current = new Tone.Sampler({ urls, baseUrl: "" }).connect(masterGain.current);
    if (sr.current.mpcInstrument === "custom") mpcSynth.current = customSamplerRef.current;
    setCustomVersion(v => v + 1);
  }, [customFiles, s.ready]);

  // ── BPM + volume sync ──────────────────────────────────────────────────────
  useEffect(() => { if (!s.ready) return; Tone.getTransport().bpm.rampTo(s.bpm, 0.1); }, [s.bpm, s.ready]);
  useEffect(() => { if (masterGain.current) masterGain.current.gain.rampTo(s.vol, 0.05); }, [s.vol]);

  // ── Loop reconciliation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!s.ready) return;
    const ids = new Set(s.loops.map(l => l.id));

    loopSeqs.current.forEach((seq, id)  => { if (!ids.has(id)) { seq.dispose();  loopSeqs.current.delete(id);  } });
    loopSynths.current.forEach((syn, id) => { if (!ids.has(id)) { syn.dispose();  loopSynths.current.delete(id); loopInstruments.current.delete(id); } });
    loopNodes.current.forEach((nodes, id) => {
      if (!ids.has(id)) {
        nodes.vol.dispose(); nodes.dist.dispose(); nodes.reverbSend.dispose();
        nodes.chorusSend.dispose(); nodes.phaserSend.dispose();
        nodes.delay.dispose(); nodes.comp.dispose();
        loopNodes.current.delete(id);
      }
    });

    s.loops.forEach(loop => {
      // ── Node chain (shared for both pixel and recorded) ──
      let nodes = loopNodes.current.get(loop.id);
      if (!nodes) {
        const vol  = new Tone.Volume(Tone.gainToDb(loop.volume)).connect(masterGain.current!);
        const comp = new Tone.Compressor({ ratio: 4, threshold: -20 }).connect(vol);
        const delay = new Tone.FeedbackDelay({ delayTime: "8n", feedback: 0.3, wet: loop.delay }).connect(comp);
        const dist = new Tone.Distortion(loop.distortion).connect(delay);
        const reverbSend  = new Tone.Gain(loop.reverb).connect(reverbNode.current!);
        const chorusSend  = new Tone.Gain(loop.chorus).connect(sharedChorusBus.current!);
        const phaserSend  = new Tone.Gain(loop.phaser).connect(sharedPhaserBus.current!);
        vol.connect(reverbSend); vol.connect(chorusSend); vol.connect(phaserSend);
        nodes = { vol, comp, reverbSend, chorusSend, phaserSend, delay, dist, chain: dist };
        loopNodes.current.set(loop.id, nodes);
      } else {
        nodes.vol.volume.rampTo(Tone.gainToDb(loop.volume), 0.1);
        nodes.dist.distortion = loop.distortion;
        nodes.reverbSend.gain.rampTo(loop.reverb, 0.1);
        nodes.chorusSend.gain.rampTo(loop.chorus, 0.1);
        nodes.phaserSend.gain.rampTo(loop.phaser, 0.1);
        nodes.delay.wet.rampTo(loop.delay, 0.1);
        nodes.comp.ratio.value = 1 + loop.compression * 19;
      }

      // ── Instrument (shared) ──
      let syn = loopSynths.current.get(loop.id);
      const builtFor = loopInstruments.current.get(loop.id);
      if (!syn || builtFor !== loop.instrument) {
        syn?.dispose();
        if (loop.instrument === "synth") {
          syn = new Tone.Synth({
            oscillator: { type: "triangle" },
            envelope: { attack: 0.005, decay: 0.08, sustain: 0.3, release: 0.2 },
          }).connect(nodes.chain);
        } else if (loop.instrument === "custom") {
          const cf = customFilesRef.current;
          if (cf.length > 0) {
            const urls: Record<string, string> = {};
            cf.forEach(f => { urls[f.note] = f.url; });
            syn = new Tone.Sampler({ urls, baseUrl: "" }).connect(nodes.chain);
          } else {
            syn = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.005, decay: 0.08, sustain: 0.3, release: 0.2 } }).connect(nodes.chain);
          }
        } else {
          syn = new Tone.Sampler({ urls: SAMPLE_MAPS[loop.instrument], baseUrl: `/samples/${loop.instrument}/` }).connect(nodes.chain);
        }
        loopSynths.current.set(loop.id, syn);
        loopInstruments.current.set(loop.id, loop.instrument);
      }

      const playbackRate = loop.speed === "half" ? 0.5 : loop.speed === "double" ? 2 : 1;

      // ── Pixel loop: Tone.Sequence ──
      if (loop.type === "pixel") {
        let seq = loopSeqs.current.get(loop.id) as Tone.Sequence | undefined;
        const wantLen = loop.x1 - loop.x0 + 1;
        if (!seq || !(seq instanceof Tone.Sequence) || seq.length !== wantLen) {
          seq?.dispose();
          const steps = Array.from({ length: wantLen }, (_, i) => i);
          seq = new Tone.Sequence((time, i) => {
            const lp = lr.current.find(l => l.id === loop.id);
            if (!lp || lp.muted) return;
            const currentSyn = loopSynths.current.get(loop.id);
            if (!currentSyn) return;
            const data = pxDat.current!;
            const idx = (lp.y * sr.current.iw + (lp.x0 + i)) * 4;
            const { h, s, l } = rgbToHsl(data[idx], data[idx+1], data[idx+2]);
            const midi = hslToMidi(h, s, l, 60 + lp.root, SCALES[sr.current.scale].notes, lp.octave);
            const samplerKeys = currentSyn instanceof Tone.Sampler
              ? (lp.instrument === "custom"
                  ? customFilesRef.current.map(f => f.note)
                  : Object.keys(SAMPLE_MAPS[lp.instrument] ?? {}))
              : [];
            const note = samplerKeys.length ? getSamplerNote(midi, samplerKeys) : Tone.Frequency(midi, "midi").toNote();
            try {
              if (currentSyn instanceof Tone.Sampler) { currentSyn.triggerAttackRelease(note, "8n", time, pxVel(l) / 127); }
              else if (currentSyn instanceof Tone.Synth) { currentSyn.triggerAttackRelease(note, "16n", time, pxVel(l) / 127); }
            } catch (_) {}
            const delayMs = (time - Tone.now()) * 1000;
            setTimeout(() => { flashes.current.set(`${loop.id}:${i}`, Date.now() + 160); }, Math.max(0, delayMs));
          }, steps, "8n");
          seq.loop = true;
          seq.start(0);
          loopSeqs.current.set(loop.id, seq);
        }
        if (seq.playbackRate !== playbackRate) seq.playbackRate = playbackRate;
      }

      // ── Recorded loop: Tone.Part ──
      else if (loop.type === "recorded" && loop.recordedNotes?.length) {
        if (!loopSeqs.current.has(loop.id)) {
          const events = loop.recordedNotes.map(e => ({ time: e.time, note: e.note, velocity: e.velocity }));
          const part = new Tone.Part((time: number, ev: any) => {
            const lp = lr.current.find(l => l.id === loop.id);
            if (!lp || lp.muted) return;
            const syn2 = loopSynths.current.get(loop.id);
            if (!syn2) return;
            try {
              if (syn2 instanceof Tone.Sampler) { syn2.triggerAttackRelease(ev.note, "8n", time, ev.velocity); }
              else { (syn2 as Tone.Synth).triggerAttackRelease(ev.note, "16n", time, ev.velocity); }
            } catch (_) {}
          }, events);
          part.loop = true;
          part.loopEnd = loop.duration!;
          part.start(0);
          loopSeqs.current.set(loop.id, part);
        }
        const part = loopSeqs.current.get(loop.id)!;
        if (part.playbackRate !== playbackRate) part.playbackRate = playbackRate;
      }
    });
  }, [s.loops, s.ready, s.scale, pixAt, customVersion]);

  // ── Viewport calc ──────────────────────────────────────────────────────────
  const calcVP = useCallback((st: AppState) => {
    if (!st.imgLoaded) return null;
    const ppc = Math.min(48, Math.max(8, Math.floor(Math.min(CW * 0.95 / st.iw, CH * 0.95 / st.ih))));
    const vw = Math.min(st.iw, Math.floor(CW / ppc));
    const vh = Math.min(st.ih, Math.floor(CH / ppc));
    const cx = st.mx + 3, cy = st.my + 2;
    const vx = Math.max(0, Math.min(st.iw - vw, Math.floor(cx - vw / 2)));
    const vy = Math.max(0, Math.min(st.ih - vh, Math.floor(cy - vh / 2)));
    const ox = Math.floor((CW - vw * ppc) / 2);
    const oy = Math.floor((CH - vh * ppc) / 2);
    return { ppc, vw, vh, vx, vy, ox, oy };
  }, []);

  // ── Render loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    const c = cvs.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = CW * dpr; c.height = CH * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);

    function draw() {
      const st = sr.current;
      const nc = navCvs.current;
      ctx.fillStyle = P.bg;
      ctx.fillRect(0, 0, CW, CH);

      if (st.imgLoaded && imgEl.current) {
        const v = calcVP(st);
        if (v) {
          const { ppc, vw, vh, vx, vy, ox, oy } = v;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(imgEl.current, vx, vy, vw, vh, ox, oy, vw * ppc, vh * ppc);
          ctx.strokeStyle = P.border; ctx.strokeRect(ox, oy, vw * ppc, vh * ppc);

          const now = Date.now();
          st.loops.forEach(lp => {
            if (lp.type !== "pixel") return;
            if (lp.y < vy || lp.y >= vy + vh) return;
            const xa = Math.max(lp.x0, vx), xb = Math.min(lp.x1, vx + vw - 1);
            if (xa > xb) return;
            const sy = oy + (lp.y - vy) * ppc, sx = ox + (xa - vx) * ppc, sw = (xb - xa + 1) * ppc;
            ctx.fillStyle = lp.muted ? "rgba(128,128,128,0.1)" : lp.col + "2a";
            ctx.fillRect(sx, sy, sw, ppc);
            ctx.strokeStyle = lp.muted ? "#444" : lp.col;
            ctx.lineWidth = 2; ctx.strokeRect(sx, sy, sw, ppc);
            for (let i = 0; i <= lp.x1 - lp.x0; i++) {
              const imgX = lp.x0 + i;
              if (imgX < vx || imgX >= vx + vw) continue;
              const exp = flashes.current.get(`${lp.id}:${i}`);
              if (exp && now < exp) {
                const a = ((exp - now) / 160) * 0.8;
                ctx.fillStyle = `rgba(255,255,255,${a})`;
                ctx.fillRect(ox + (imgX - vx) * ppc, sy, ppc, ppc);
              }
            }
          });

          if (st.sel && st.sx0 != null && st.sx1 != null && st.sy != null && st.sy >= vy && st.sy < vy + vh) {
            const xa2 = Math.max(0, Math.min(st.sx0, st.sx1));
            const xb2 = Math.min(st.iw - 1, Math.min(xa2 + 7, Math.max(st.sx0, st.sx1)));
            const xs = Math.max(xa2, vx), xe = Math.min(xb2, vx + vw - 1);
            if (xe >= xs) {
              const ssy = oy + (st.sy - vy) * ppc, ssx = ox + (xs - vx) * ppc, ssw = (xe - xs + 1) * ppc;
              ctx.fillStyle = P.blueT; ctx.fillRect(ssx, ssy, ssw, ppc);
              ctx.strokeStyle = P.blue; ctx.lineWidth = 1; ctx.setLineDash([4, 2]);
              ctx.strokeRect(ssx, ssy, ssw, ppc); ctx.setLineDash([]);
            }
          }

          const msx = ox + (st.mx - vx) * ppc, msy = oy + (st.my - vy) * ppc;
          ctx.strokeStyle = P.blue; ctx.lineWidth = 2; ctx.strokeRect(msx, msy, 6 * ppc, 4 * ppc);
          ctx.fillStyle = st.isPanning ? "rgba(255,255,255,0.05)" : P.blueT;
          ctx.fillRect(msx, msy, 6 * ppc, 4 * ppc);

          // Minimap
          if (nc) {
            const nctx = nc.getContext("2d")!;
            nctx.clearRect(0, 0, nc.width, nc.height);
            const ratio = st.iw / st.ih;
            const pad = 6;
            let nw, nh;
            if (ratio >= 1) { nw = 100 - pad*2; nh = nw / ratio; }
            else            { nh = 100 - pad*2; nw = nh * ratio; }
            const nx = (100 - nw) / 2, ny = (100 - nh) / 2;
            if (imgEl.current) { nctx.imageSmoothingEnabled = true; nctx.drawImage(imgEl.current, nx, ny, nw, nh); }
            const vScale = nw / st.iw;
            nctx.fillStyle = "rgba(0,144,204,0.2)";
            nctx.fillRect(nx + v.vx * vScale, ny + v.vy * vScale, v.vw * vScale, v.vh * vScale);
            nctx.strokeStyle = P.blue; nctx.lineWidth = 1;
            nctx.strokeRect(nx + v.vx * vScale, ny + v.vy * vScale, v.vw * vScale, v.vh * vScale);
            nctx.strokeStyle = P.accent; nctx.lineWidth = 1.5;
            nctx.strokeRect(nx + st.mx * vScale, ny + st.my * vScale, 6 * vScale, 4 * vScale);
          }
        }
      }
      raf.current = requestAnimationFrame(draw);
    }
    draw();
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [calcVP]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const startMove = useCallback(() => {
    if (moveInterval.current) return;
    moveInterval.current = setInterval(() => {
      const keys = arrowKeys.current;
      if (keys.has("ArrowLeft"))  d({ t: "MOVE", d: "l", amount: 2 });
      if (keys.has("ArrowRight")) d({ t: "MOVE", d: "r", amount: 2 });
      if (keys.has("ArrowUp"))    d({ t: "MOVE", d: "u", amount: 2 });
      if (keys.has("ArrowDown"))  d({ t: "MOVE", d: "d", amount: 2 });
    }, 60);
  }, []);

  const stopMove = useCallback(() => {
    if (moveInterval.current) { clearInterval(moveInterval.current); moveInterval.current = null; }
  }, []);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    function kd(e: KeyboardEvent) {
      if (e.code === "Space") { e.preventDefault(); if (!sr.current.spacePressed) d({ t: "SPACE", pressed: true }); return; }
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.code)) {
        e.preventDefault();
        if (!arrowKeys.current.has(e.code)) {
          arrowKeys.current.add(e.code);
          d({ t: "MOVE", d: e.code === "ArrowLeft" ? "l" : e.code === "ArrowRight" ? "r" : e.code === "ArrowUp" ? "u" : "d" });
          startMove();
        }
        return;
      }
      const g = GRID_MAP[e.code];
      if (!g || e.repeat) return;
      e.preventDefault();
      if (!heldKeys.current.has(e.code)) {
        heldKeys.current.add(e.code);
        d({ t: "PON", k: e.code });
        if (sr.current.ready && mpcSynth.current) {
          const p = pixAt(sr.current.mx + g.c, sr.current.my + g.r);
          if (p) {
            const inst = sr.current.mpcInstrument;
            const samplerKeys = mpcSynth.current instanceof Tone.Sampler
              ? (inst === "custom" ? customFilesRef.current.map(f => f.note) : Object.keys(SAMPLE_MAPS[inst] ?? {}))
              : [];
            const note = samplerKeys.length ? getSamplerNote(p.midi, samplerKeys) : Tone.Frequency(p.midi, "midi").toNote();
            triggeredNotes.current.set(e.code, note);
            try { mpcSynth.current.triggerAttack(note, Tone.now(), p.vel / 127); } catch (_) {}
            // Record capture
            if (isRecordingRef.current) {
              const relTime = Math.max(0, Tone.getTransport().seconds - recordStartRef.current);
              recordedEventsRef.current.push({ time: relTime, note, velocity: p.vel / 127 });
            }
          }
        }
      }
    }

    function ku(e: KeyboardEvent) {
      if (e.code === "Space") { e.preventDefault(); d({ t: "SPACE", pressed: false }); d({ t: "PAN_END" }); return; }
      if (arrowKeys.current.has(e.code)) {
        arrowKeys.current.delete(e.code);
        if (arrowKeys.current.size === 0) stopMove();
        return;
      }
      const g = GRID_MAP[e.code];
      if (!g) return;
      heldKeys.current.delete(e.code);
      d({ t: "POFF", k: e.code });
      if (sr.current.ready && mpcSynth.current) {
        const note = triggeredNotes.current.get(e.code);
        if (note) { mpcSynth.current.triggerRelease(note, Tone.now()); triggeredNotes.current.delete(e.code); }
      }
    }

    function killAll() {
      heldKeys.current.forEach(k => {
        d({ t: "POFF", k });
        const note = triggeredNotes.current.get(k);
        if (note && sr.current.ready && mpcSynth.current) mpcSynth.current.triggerRelease(note, Tone.now());
      });
      heldKeys.current.clear(); triggeredNotes.current.clear(); arrowKeys.current.clear(); stopMove();
    }

    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", killAll);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); window.removeEventListener("blur", killAll); };
  }, [pixAt, startMove, stopMove]);

  // ── Mouse ──────────────────────────────────────────────────────────────────
  function imgCoords(e: React.MouseEvent | MouseEvent) {
    const c = cvs.current; if (!c) return null;
    const r = c.getBoundingClientRect();
    const cx = (e.clientX - r.left) * (CW / r.width);
    const cy = (e.clientY - r.top)  * (CH / r.height);
    const v = calcVP(sr.current); if (!v) return null;
    const ix = v.vx + Math.floor((cx - v.ox) / v.ppc);
    const iy = v.vy + Math.floor((cy - v.oy) / v.ppc);
    if (ix < 0 || ix >= sr.current.iw || iy < 0 || iy >= sr.current.ih) return null;
    return { x: ix, y: iy };
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (s.spacePressed) { d({ t: "PAN_START" }); lastMousePos.current = { x: e.clientX, y: e.clientY }; return; }
    const c = imgCoords(e); if (c) d({ t: "SS", x: c.x, y: c.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (s.isPanning && lastMousePos.current) {
      const dx = e.clientX - lastMousePos.current.x, dy = e.clientY - lastMousePos.current.y;
      const v = calcVP(s);
      if (v && (Math.abs(dx) > v.ppc || Math.abs(dy) > v.ppc)) {
        d({ t: "MOVE", d: dx > 0 ? "l" : "r", amount: Math.floor(Math.abs(dx) / v.ppc) });
        d({ t: "MOVE", d: dy > 0 ? "u" : "d", amount: Math.floor(Math.abs(dy) / v.ppc) });
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }
    if (s.sel) { const c = imgCoords(e); if (c) d({ t: "SU", x: c.x }); }
  };

  // ── Custom pack handlers ───────────────────────────────────────────────────
  const onCustomFileUpload = useCallback((files: FileList) => {
    const used = new Set(customFilesRef.current.map(f => f.note));
    const newFiles: CustomFile[] = [];
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("audio/")) return;
      const nextNote = CUSTOM_NOTE_SLOTS.find(n => !used.has(n));
      if (!nextNote) return;
      used.add(nextNote);
      newFiles.push({ id: crypto.randomUUID(), note: nextNote, url: URL.createObjectURL(file), name: file.name.replace(/\.[^.]+$/, "") });
    });
    if (newFiles.length) setCustomFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeCustomFile = useCallback((id: string) => {
    setCustomFiles(prev => { const f = prev.find(f => f.id === id); if (f) URL.revokeObjectURL(f.url); return prev.filter(f => f.id !== id); });
  }, []);

  const clearCustomFiles = useCallback(() => { customFilesRef.current.forEach(f => URL.revokeObjectURL(f.url)); setCustomFiles([]); }, []);

  // ── Image loader ───────────────────────────────────────────────────────────
  const onFile = useCallback(async (file: File) => {
    if (!file || !file.type.match(/^image\//)) return;
    await initAudio();
    const reader = new FileReader();
    reader.onload = (e) => {
      const el = new Image();
      el.onload = () => {
        imgEl.current = el;
        const tc = document.createElement("canvas"); tc.width = el.width; tc.height = el.height;
        const tx = tc.getContext("2d")!; tx.drawImage(el, 0, 0);
        pxDat.current = tx.getImageData(0, 0, el.width, el.height).data;
        d({ t: "IMG", w: el.width, h: el.height });
      };
      el.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [initAudio]);

  // ── Inline style shortcuts ─────────────────────────────────────────────────
  const ibs: React.CSSProperties = { // icon button style
    background: "transparent", border: `1px solid ${P.border}`, color: P.sub,
    cursor: "pointer", padding: "4px 6px", display: "flex", alignItems: "center",
    justifyContent: "center", transition: "all 0.15s",
  };
  const ibsActive: React.CSSProperties = { borderColor: P.accent, color: P.accent, background: P.accentSoft };

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: P.bg, color: P.txt, overflow: "hidden", userSelect: "none", position: "relative" }}>
      {/* ── Global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;900&family=JetBrains+Mono:wght@300;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; background: #050506; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,62,0,0.25); }
        ::-webkit-scrollbar-thumb:hover { background: #ff3e00; }
        .si-select {
          background: ${P.cell}; border: 1px solid ${P.border}; color: ${P.txt};
          font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; font-weight: 500;
          text-transform: uppercase; letter-spacing: 0.06em;
          padding: 5px 8px; outline: none; cursor: pointer;
          -webkit-appearance: none; appearance: none;
          transition: border-color 0.15s;
        }
        .si-select:hover, .si-select:focus { border-color: ${P.borderHov}; }
        .si-select option { background: #111113; }
        .si-slider {
          -webkit-appearance: none; appearance: none; background: transparent;
          height: 3px; cursor: ew-resize; outline: none; width: 100%;
        }
        .si-slider::-webkit-slider-runnable-track { height: 3px; background: ${P.track}; }
        .si-slider::-webkit-slider-thumb {
          -webkit-appearance: none; height: 14px; width: 5px;
          background: var(--knob-color, #c8c8c8); margin-top: -5.5px; border-radius: 1px;
          transition: box-shadow 0.15s, background 0.2s;
        }
        .si-slider:hover::-webkit-slider-thumb { box-shadow: 0 0 8px ${P.accentGlow}; }
        .si-label { font-family: 'JetBrains Mono',monospace; font-size: 0.55rem; font-weight: 300; text-transform: uppercase; letter-spacing: 0.1em; color: ${P.sub}; }
        .si-val   { font-family: 'JetBrains Mono',monospace; font-size: 0.62rem; font-weight: 500; color: ${P.accent}; }
        .si-ibtn:hover { border-color: ${P.borderHov} !important; color: ${P.txt} !important; }
        @keyframes recPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

      {/* ── Noise bg ── */}
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(circle at 50% 30%, #0d0d10 0%, #050506 100%)", zIndex: 0, pointerEvents: "none" }} />
      <svg style={{ position: "fixed", inset: 0, opacity: 0.032, zIndex: 1, pointerEvents: "none" }} aria-hidden="true">
        <filter id="sn"><feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
        <rect width="100%" height="100%" filter="url(#sn)"/>
      </svg>

      {/* ── Mobile overlay ── */}
      {isMobile && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: P.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 32, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 8, height: 8, background: P.accent, boxShadow: `0 0 10px ${P.accentGlow}` }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: "1.4rem", textTransform: "uppercase", letterSpacing: "-0.02em", color: P.accent }}>Sound.IMG</span>
          </div>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", color: P.sub, maxWidth: 320, lineHeight: 1.7, letterSpacing: "0.04em" }}>
            THIS INSTRUMENT IS DESIGNED FOR DESKTOP.<br/>
            COME BACK ON A COMPUTER WITH A FULL KEYBOARD TO PLAY.
          </p>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", color: "#333", letterSpacing: "0.1em", textTransform: "uppercase" }}>Chrome or Edge · 1280px+ recommended</p>
        </div>
      )}

      {/* ── Desktop intro overlay ── */}
      {!isMobile && !s.ready && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(5,5,6,0.96)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, maxWidth: 480, padding: "48px 40px", background: "rgba(10,10,12,0.9)", border: `1px solid ${P.border}`, textAlign: "center" }}>
            <div>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", fontWeight: 300, color: P.sub, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>Experiment in Progress by Emīl Blūm</p>
              <h1 style={{ fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: "2rem", textTransform: "uppercase", letterSpacing: "-0.02em", color: P.accent, margin: 0 }}>
                Sound.IMG
              </h1>
            </div>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.9rem", color: "#aaa", lineHeight: 1.65, margin: 0 }}>
              Transform any image into a playable instrument. Each pixel becomes a note: its colour sets the pitch, its brightness the velocity. Navigate the image, play notes on your keyboard and capture looping sequences.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", textAlign: "left" }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.55rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.14em", color: P.sub }}>Controls</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: "0.65rem", fontFamily: "'JetBrains Mono',monospace", color: P.sub }}>
              <span><strong style={{ color: P.txt }}>ARROWS</strong> — navigate</span>
              <span><strong style={{ color: P.txt }}>1-6, Q-Y, A-H, Z-N</strong> — play pads</span>
              <span><strong style={{ color: P.txt }}>CLICK + DRAG</strong> — capture loop</span>
              <span><strong style={{ color: P.txt }}>SPACE + DRAG</strong> — pan canvas</span>
              </div>
            </div>
            <button onClick={initAudio} style={{
              background: P.accent, border: "none", color: "#fff",
              fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: "0.85rem",
              textTransform: "uppercase", letterSpacing: "0.1em",
              padding: "14px 40px", cursor: "pointer",
              boxShadow: `0 0 24px ${P.accentGlow}`,
              display: "flex", alignItems: "center", gap: 10,
              transition: "box-shadow 0.2s",
            }}
              onMouseOver={e => (e.currentTarget.style.boxShadow = `0 0 40px ${P.accentGlow}`)}
              onMouseOut={e  => (e.currentTarget.style.boxShadow = `0 0 24px ${P.accentGlow}`)}
            >
              <Play size={16} />
              Start Engine
            </button>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.55rem", color: "#333", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Desktop only · Chrome or Edge recommended</p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header style={{ display: "flex", alignItems: "center", gap: 0, height: 58, background: P.panel, borderBottom: `1px solid ${P.border}`, padding: "0 22px", flexShrink: 0, zIndex: 20, position: "relative" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 16, flexShrink: 0 }}>
          <span style={{ fontFamily: "Inter,sans-serif", fontWeight: 900, fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "-0.02em", color: P.accent }}>Sound.IMG</span>
        </div>
        <div style={{ width: 1, height: 28, background: "rgba(255,62,0,0.22)", marginRight: 12, flexShrink: 0 }} />

        {/* Transport */}
        {s.ready && (
          <>
            <div style={{ display: "flex", gap: 3, marginRight: 12, flexShrink: 0 }}>
              <button className="si-ibtn" onClick={s.transportState === "playing" ? handleTransportPause : handleTransportPlay}
                title={s.transportState === "playing" ? "Pause" : "Play"}
                style={{ ...ibs, ...(s.transportState === "playing" ? ibsActive : {}), padding: "5px 8px" }}>
                {s.transportState === "playing" ? <Pause size={12} /> : <Play size={12} />}
              </button>
              <button className="si-ibtn" onClick={handleTransportStop} title="Stop (reset to 0)"
                style={{ ...ibs, ...(s.transportState === "stopped" ? ibsActive : {}) }}>
                <Square size={12} />
              </button>
            </div>
            <div style={{ width: 1, height: 28, background: "rgba(255,62,0,0.22)", marginRight: 12, flexShrink: 0 }} />
          </>
        )}

        {/* Musical controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          {/* BPM */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span className="si-label">BPM</span>
            <input type="number" value={s.bpm} min={40} max={240}
              onChange={e => d({ t: "BPM", v: +e.target.value })}
              style={{ width: 52, background: P.cell, border: `1px solid ${P.border}`, color: P.txt, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.85rem", fontWeight: 500, textAlign: "center", padding: "3px 4px", outline: "none" }} />
          </div>
          {/* Scale */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span className="si-label">Scale</span>
            <select value={s.scale} onChange={e => d({ t: "SCL", v: e.target.value as any })} className="si-select">
              {Object.entries(SCALES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {/* Root */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span className="si-label">Root</span>
            <select value={s.root} onChange={e => d({ t: "ROOT", v: +e.target.value })} className="si-select" style={{ width: 52 }}>
              {ROOT_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
            </select>
          </div>
          {/* Octave */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span className="si-label">Oct</span>
            <select value={s.oct} onChange={e => d({ t: "OCT", v: +e.target.value })} className="si-select" style={{ width: 52 }}>
              {[-2,-1,0,1,2].map(o => <option key={o} value={o}>{o >= 0 ? `+${o}` : o}</option>)}
            </select>
          </div>
        </div>

        <div style={{ width: 1, height: 28, background: "rgba(255,62,0,0.22)", margin: "0 12px", flexShrink: 0 }} />

        {/* MPC Pack + Metro */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span className="si-label" style={{ color: P.accent }}>MPC Pack</span>
            <select value={s.mpcInstrument} onChange={e => d({ t: "MPC_INST", v: e.target.value })} className="si-select" style={{ color: P.accent, borderColor: `${P.accent}55` }}>
              {INSTRUMENTS.map(inst => <option key={inst.id} value={inst.id}>{inst.label}</option>)}
            </select>
          </div>
          <button onClick={() => d({ t: "MTR" })} style={{ ...ibs, ...(s.metro ? ibsActive : {}), marginTop: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", letterSpacing: "0.1em", padding: "4px 8px" }} className="si-ibtn">
            METRO
          </button>
        </div>

        <div style={{ width: 1, height: 28, background: "rgba(255,62,0,0.22)", margin: "0 12px", flexShrink: 0 }} />

        {/* Volume */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <Volume2 size={12} style={{ color: P.sub, flexShrink: 0 }} />
          <input type="range" min={0} max={1} step={0.01} value={s.vol}
            onChange={e => d({ t: "VOL", v: +e.target.value })}
            className="si-slider"
            style={{ width: 72, "--knob-color": s.vol > 0 ? P.accent : "#c8c8c8" } as React.CSSProperties} />
        </div>

        {/* Right side */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {s.imgLoaded && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.55rem", color: P.sub, letterSpacing: "0.06em" }}>{s.iw} × {s.ih} px</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.55rem", color: P.accent }}>{s.loops.length} loops active</span>
            </div>
          )}
          <button className="si-ibtn" onClick={() => {
            initAudio();
            const i = document.createElement("input"); i.type = "file"; i.accept = "image/*";
            i.onchange = e => onFile((e.target as HTMLInputElement).files![0]); i.click();
          }} style={{ ...ibs }} title="Load image">
            <RefreshCcw size={14} />
          </button>
        </div>
      </header>

      {/* ── Body: 3-column ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative", zIndex: 2 }}>

        {/* ── LEFT: MPC + Recording + Custom Pack ── */}
        <div style={{ width: 310, flexShrink: 0, background: P.panel, borderRight: `1px solid ${P.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* MPC header */}
          <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${P.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.14em", color: P.accent }}>
                <Grid3X3 size={11} /> MPC Pad Grid
              </span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.52rem", color: P.sub }}>{s.mx},{s.my}</span>
            </div>
          </div>

          {/* MPC pads */}
          <div style={{ padding: "10px 12px", flexShrink: 0 }}>
            <div style={{ display: "grid", gridTemplateRows: "repeat(4,1fr)", gap: 4 }}>
              {PAD_ROWS.map((row, r) => (
                <div key={r} style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 4 }}>
                  {row.map((key, c) => {
                    const active = !!s.pads[key];
                    const p = pixAt(s.mx + c, s.my + r);
                    const bg = p ? `rgb(${p.r},${p.g},${p.b})` : P.cell;
                    return (
                      <div key={key} style={{
                        height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                        background: active ? "#fff" : bg,
                        border: `1px solid ${active ? "#fff" : P.border}`,
                        transform: active ? "scale(0.93)" : "scale(1)",
                        boxShadow: active ? "0 0 12px rgba(255,255,255,0.4)" : "none",
                        transition: "all 0.06s",
                      }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", fontWeight: 500, color: active ? "#000" : "#fff", mixBlendMode: active ? "normal" : "difference", opacity: active ? 1 : 0.85 }}>
                          {KEY_LBL[key]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.5rem", color: "#666", textAlign: "center", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 6, marginBottom: 0 }}>
              Hold arrow keys for rapid nav
            </p>
          </div>

          {/* Recording */}
          <div style={{ padding: "8px 12px", borderTop: `1px solid ${P.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.14em", color: P.sub }}>Rec Loop</span>
              {isRecording && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: P.accent, animation: "recPulse 1s ease-in-out infinite" }} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.52rem", color: P.accent }}>REC</span>
                </div>
              )}
            </div>
            <button onClick={toggleRecording} style={{
              ...ibs,
              ...(isRecording ? { ...ibsActive, background: P.accent, color: "#fff", borderColor: P.accent } : {}),
              width: "100%", justifyContent: "center", gap: 6,
              fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", fontWeight: 500,
              textTransform: "uppercase", letterSpacing: "0.1em",
              padding: "7px 0",
              opacity: (!s.ready || s.transportState !== "playing") ? 0.35 : 1,
            }} className="si-ibtn">
              <Mic size={12} />
              {isRecording ? "Stop Recording" : "Record MPC"}
            </button>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.5rem", color: "#666", marginTop: 5, marginBottom: 0, lineHeight: 1.5 }}>
              {isRecording ? "Play pads — stop to create loop" : "Transport must be playing"}
            </p>
          </div>

          {/* Custom Pack */}
          <div style={{ padding: "8px 12px", borderTop: `1px solid ${P.border}`, flex: 1, display: "flex", flexDirection: "column", gap: 6, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.14em", color: P.sub }}>Custom Pack</span>
              <div style={{ display: "flex", gap: 4 }}>
                {customFiles.length > 0 && (
                  <button onClick={clearCustomFiles} className="si-ibtn" style={{ ...ibs, fontSize: "0.5rem", padding: "3px 6px" }}>Clear</button>
                )}
                <button onClick={() => {
                  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "audio/*"; inp.multiple = true;
                  inp.onchange = e => { const f = (e.target as HTMLInputElement).files; if (f) onCustomFileUpload(f); }; inp.click();
                }} className="si-ibtn" style={{ ...ibs, ...ibsActive, fontSize: "0.5rem", padding: "3px 7px" }}>
                  + Upload
                </button>
              </div>
            </div>
            {customFiles.length === 0 ? (
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.52rem", color: "#666", marginTop: 2 }}>Upload .mp3 / .wav to enable Custom Pack</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, overflowY: "auto", maxHeight: 64 }}>
                {customFiles.map(f => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 4, background: P.cell, border: `1px solid ${P.border}`, padding: "2px 6px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.5rem", color: P.blue }}>{f.note}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.5rem", color: P.sub, maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                    <button onClick={() => removeCustomFile(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: P.sub, padding: 0, display: "flex" }}>
                      <X size={8} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Credit */}
          <div style={{ padding: "8px 14px", borderTop: `1px solid ${P.border}`, flexShrink: 0 }}>
            <a href="https://emilblum.com/" target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.5rem", color: "#444", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.12em", display: "block", transition: "color 0.15s" }}
              onMouseOver={e => ((e.currentTarget as HTMLAnchorElement).style.color = P.accent)}
              onMouseOut={e  => ((e.currentTarget as HTMLAnchorElement).style.color = "#444")}>
              by Emīl Blūm ↗
            </a>
          </div>
        </div>

        {/* ── CENTER: Canvas ── */}
        <div ref={canvasContainerRef} style={{ flex: 1, position: "relative", overflow: "hidden", minWidth: 0 }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>

          {/* Upload placeholder */}
          {!s.imgLoaded && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
              <div onClick={() => { initAudio(); const i = document.createElement("input"); i.type = "file"; i.accept = "image/*"; i.onchange = e => onFile((e.target as HTMLInputElement).files![0]); i.click(); }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "36px 48px", border: `1px dashed ${P.border}`, cursor: "pointer", transition: "border-color 0.2s" }}
                onMouseOver={e => ((e.currentTarget as HTMLDivElement).style.borderColor = P.accent)}
                onMouseOut={e  => ((e.currentTarget as HTMLDivElement).style.borderColor = P.border)}>
                <Camera size={36} strokeWidth={1} style={{ color: P.sub }} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "Inter,sans-serif", fontWeight: 900, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.06em", color: P.txt, margin: 0 }}>Upload Image</p>
                  <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", color: P.sub, marginTop: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>JPEG · PNG · drag &amp; drop</p>
                </div>
              </div>
            </div>
          )}

          {/* Canvas wrapper with minimap */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} className="canvas-wrap">
            <canvas ref={cvs}
              style={{ display: "block", width: "100%", height: "100%", opacity: s.imgLoaded ? 1 : 0, transition: "opacity 0.4s", cursor: s.spacePressed ? "grab" : s.isPanning ? "grabbing" : "crosshair" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={() => { d({ t: "PAN_END" }); if (s.sel) d({ t: "SK" }); }}
              onMouseLeave={() => { d({ t: "PAN_END" }); if (s.sel) d({ t: "SC" }); }}
            />

            {/* Minimap — hover reveal, stays on canvas */}
            {s.imgLoaded && (
              <div style={{ position: "absolute", top: 10, right: 10, width: 120, height: 120, background: "rgba(10,10,12,0.9)", border: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", opacity: 0, transition: "opacity 0.2s" }}
                className="minimap-overlay">
                <canvas ref={navCvs} width={100} height={100} style={{ width: 100, height: 100 }} />
                <span style={{ position: "absolute", bottom: 3, right: 5, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.45rem", color: "#333", textTransform: "uppercase", letterSpacing: "0.1em" }}>MAP</span>
              </div>
            )}

            {/* Help tooltip */}
            {s.imgLoaded && (
              <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 16, alignItems: "center", padding: "6px 14px", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", border: `1px solid ${P.border}`, opacity: 0, transition: "opacity 0.2s", whiteSpace: "nowrap", pointerEvents: "none" }}
                className="help-tooltip">
                {[
                  ["SPACE+DRAG","PAN"],
                  ["CLICK+DRAG","LOOP"],
                  ["ARROWS","MOVE"],
                ].map(([k,v]) => (
                  <span key={k} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.55rem", color: P.sub }}>
                    <strong style={{ color: P.txt, marginRight: 4 }}>{k}</strong>{v}
                  </span>
                ))}
              </div>
            )}
          </div>

          <style>{`
            .canvas-wrap:hover .minimap-overlay { opacity: 1 !important; }
            .canvas-wrap:hover .help-tooltip { opacity: 1 !important; }
          `}</style>
        </div>

        {/* ── RIGHT: Loops panel ── */}
        <div style={{ width: 340, flexShrink: 0, background: P.panel, borderLeft: `1px solid ${P.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Loops header */}
          <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${P.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.14em", color: P.accent }}>
                <Layers size={11} /> Active Loops
              </span>
              {s.loops.length > 0 && (
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.52rem", color: P.accent }}>
                  {s.loops.length} active
                </span>
              )}
            </div>
          </div>

          {/* Loops list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
            {s.loops.length === 0 && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", color: "#2a2a2a", textAlign: "center", lineHeight: 1.8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Click + drag on the image<br />to capture a pixel loop
                </p>
              </div>
            )}

            {s.loops.map(lp => (
              <div key={lp.id} style={{ background: P.cell, border: `1px solid ${P.border}`, borderTop: `1px solid ${P.accent}`, padding: "13px 10px", display: "flex", flexDirection: "column", gap: 10 }}>

                {/* Row 1: Identity + actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 3, height: 34, background: lp.muted ? "#2a2a2a" : lp.col, borderRadius: 1.5, flexShrink: 0 }} />

                  {lp.type === "pixel" ? (
                    <>
                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        {Array.from({ length: lp.x1 - lp.x0 + 1 }).map((_, i) => {
                          const p = pixAt(lp.x0 + i, lp.y);
                          return <div key={i} style={{ width: 9, height: 28, background: p ? `rgb(${p.r},${p.g},${p.b})` : "#000", opacity: lp.muted ? 0.25 : 1, borderRadius: 1 }} />;
                        })}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 38 }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.52rem", color: P.sub }}>Y:{lp.y}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.5rem", color: "#666" }}>X:{lp.x0}–{lp.x1}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1 }}>
                      <div style={{ padding: "4px 8px", background: `${lp.col}22`, border: `1px solid ${lp.col}55`, display: "flex", alignItems: "center", gap: 5 }}>
                        <Mic size={9} style={{ color: lp.col }} />
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", fontWeight: 500, color: lp.col }}>
                          {lp.recordedNotes?.length ?? 0} notes
                        </span>
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.52rem", color: P.sub }}>
                        {lp.duration !== undefined ? formatDur(lp.duration) : ""}
                      </span>
                    </div>
                  )}

                  <div style={{ marginLeft: "auto", display: "flex", gap: 3, flexShrink: 0 }}>
                    {lp.type === "pixel" && (
                      <button onClick={() => d({ t: "JUMP", x: lp.x0, y: lp.y })} title="Locate on canvas" className="si-ibtn" style={{ ...ibs }}>
                        <Crosshair size={11} />
                      </button>
                    )}
                    <button onClick={() => d({ t: "LMUT", id: lp.id })} title={lp.muted ? "Unmute" : "Mute"} className="si-ibtn"
                      style={{ ...ibs, ...(lp.muted ? ibsActive : {}), fontSize: "0.52rem", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em", padding: "3px 6px" }}>
                      {lp.muted ? "UNMUTE" : "MUTE"}
                    </button>
                    <button onClick={() => d({ t: "LRME", id: lp.id })} className="si-ibtn" style={{ ...ibs, color: "#e74c3c" }}>
                      <X size={11} />
                    </button>
                  </div>
                </div>

                {/* Row 2: Controls */}
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className="si-label">Sound</span>
                    <select value={lp.instrument} onChange={e => d({ t: "LSET", id: lp.id, p: "instrument", v: e.target.value })} className="si-select">
                      {INSTRUMENTS.map(inst => <option key={inst.id} value={inst.id}>{inst.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className="si-label">Oct</span>
                    <select value={lp.octave} onChange={e => d({ t: "LSET", id: lp.id, p: "octave", v: +e.target.value })} className="si-select" style={{ width: 46 }}>
                      {[-2,-1,0,1,2,3].map(o => <option key={o} value={o}>{o >= 0 ? `+${o}` : o}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className="si-label">Speed</span>
                    <select value={lp.speed} onChange={e => d({ t: "LSET", id: lp.id, p: "speed", v: e.target.value })} className="si-select" style={{ width: 44 }}>
                      <option value="half">½x</option>
                      <option value="normal">1x</option>
                      <option value="double">2x</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="si-label">Vol</span>
                      <span className="si-val">{Math.round(lp.volume * 100)}</span>
                    </div>
                    <input type="range" min={0} max={1.2} step={0.01} value={lp.volume}
                      onChange={e => d({ t: "LSET", id: lp.id, p: "volume", v: +e.target.value })}
                      className="si-slider"
                      style={{ "--knob-color": lp.volume > 0 ? P.accent : "#c8c8c8" } as React.CSSProperties} />
                  </div>
                </div>

                {/* Row 3: FX */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px 8px", paddingTop: 10, borderTop: `1px solid ${P.border}` }}>
                  {[
                    { label: "Reverb",  p: "reverb",      v: lp.reverb      },
                    { label: "Delay",   p: "delay",        v: lp.delay       },
                    { label: "Chorus",  p: "chorus",       v: lp.chorus      },
                    { label: "Dist",    p: "distortion",   v: lp.distortion  },
                    { label: "Phase",   p: "phaser",       v: lp.phaser      },
                    { label: "Comp",    p: "compression",  v: lp.compression },
                  ].map(fx => (
                    <div key={fx.p} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span className="si-label">{fx.label}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.48rem", color: "#666" }}>{Math.round(fx.v * 10)}</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.01} value={fx.v}
                        onChange={e => d({ t: "LSET", id: lp.id, p: fx.p, v: +e.target.value })}
                        className="si-slider"
                        style={{ "--knob-color": fx.v > 0 ? P.accent : "#c8c8c8" } as React.CSSProperties} />
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
