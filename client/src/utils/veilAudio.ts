"use client";

/**
 * Lightweight Web Audio music for Veil — soft mystery pad + win chime.
 * No external MP3 dependency (old you-winn.mp3 was the casino leftover).
 */

let sharedCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedCtx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    sharedCtx = new AC();
  }
  return sharedCtx;
}

function resume() {
  const c = ctx();
  if (c?.state === "suspended") void c.resume();
  return c;
}

/** Soft saw/triangle pad note */
function tone(
  c: AudioContext,
  dest: AudioNode,
  freq: number,
  start: number,
  dur: number,
  gain = 0.04,
  type: OscillatorType = "triangle"
) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

const PAD_NOTES = [196, 233.08, 293.66, 349.23, 392]; // G minor-ish

let bgmTimer: number | null = null;
let bgmRunning = false;
let masterGain: GainNode | null = null;

export function isBgmPlaying() {
  return bgmRunning;
}

export function startBgm(volume = 0.22) {
  const c = resume();
  if (!c || bgmRunning) return;
  bgmRunning = true;

  masterGain = c.createGain();
  masterGain.gain.value = volume;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  masterGain.connect(filter);
  filter.connect(c.destination);

  const loopSec = 6.4;
  const schedule = () => {
    if (!bgmRunning || !masterGain) return;
    const t0 = c.currentTime + 0.05;
    // drifting pad
    PAD_NOTES.forEach((f, i) => {
      tone(c, masterGain!, f, t0 + i * 0.35, 2.8, 0.035, "sine");
      tone(c, masterGain!, f * 2, t0 + 3.2 + i * 0.2, 1.6, 0.018, "triangle");
    });
    // soft pluck motif
    const motif = [392, 466.16, 523.25, 466.16, 392, 349.23];
    motif.forEach((f, i) => {
      tone(c, masterGain!, f, t0 + 0.4 + i * 0.55, 0.7, 0.045, "triangle");
    });
  };

  schedule();
  bgmTimer = window.setInterval(schedule, loopSec * 1000);
}

export function stopBgm() {
  bgmRunning = false;
  if (bgmTimer != null) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
  if (masterGain) {
    try {
      masterGain.disconnect();
    } catch {
      /* ignore */
    }
    masterGain = null;
  }
}

export function setBgmVolume(v: number) {
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
}

/** Sparkly ascending win sting — replaces you-winn.mp3 */
export function playWinSting() {
  const c = resume();
  if (!c) return;
  const t0 = c.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
  notes.forEach((f, i) => {
    tone(c, c.destination, f, t0 + i * 0.09, 0.55, 0.09, "sine");
    tone(c, c.destination, f * 2, t0 + i * 0.09 + 0.02, 0.35, 0.035, "triangle");
  });
  // soft shimmer tail
  tone(c, c.destination, 1318.5, t0 + 0.4, 0.8, 0.04, "sine");
}

/** Tiny UI blip when selecting a box */
export function playSelectBlip() {
  const c = resume();
  if (!c) return;
  tone(c, c.destination, 660, c.currentTime, 0.12, 0.05, "sine");
}
