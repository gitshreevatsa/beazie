"use client";

/**
 * Veil audio: optional soft BGM + short UI blips.
 * Win jingle is a real WAV (see /public/audio/prize-win.wav) via useWinFx.
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

const PAD_NOTES = [196, 233.08, 293.66, 349.23, 392];

let bgmTimer: number | null = null;
let bgmRunning = false;
let masterGain: GainNode | null = null;

export function isBgmPlaying() {
  return bgmRunning;
}

export function startBgm(volume = 0.18) {
  const c = resume();
  if (!c || bgmRunning) return;
  bgmRunning = true;

  masterGain = c.createGain();
  masterGain.gain.value = volume;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1200;
  masterGain.connect(filter);
  filter.connect(c.destination);

  const loopSec = 7.2;
  const schedule = () => {
    if (!bgmRunning || !masterGain) return;
    const t0 = c.currentTime + 0.05;
    PAD_NOTES.forEach((f, i) => {
      tone(c, masterGain!, f, t0 + i * 0.4, 3.0, 0.028, "sine");
    });
    const motif = [392, 440, 523.25, 440];
    motif.forEach((f, i) => {
      tone(c, masterGain!, f, t0 + 1.2 + i * 0.7, 0.85, 0.035, "triangle");
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

/** Select blip — short WAV if present, else synth. */
export function playSelectBlip() {
  if (typeof window === "undefined") return;
  const a = new Audio("/audio/select.wav");
  a.volume = 0.4;
  void a.play().catch(() => {
    const c = resume();
    if (!c) return;
    tone(c, c.destination, 880, c.currentTime, 0.1, 0.05, "sine");
  });
}

/** @deprecated win sound is /audio/prize-win.wav via useWinFx */
export function playWinSting() {
  if (typeof window === "undefined") return;
  const a = new Audio("/audio/prize-win.wav");
  a.volume = 0.55;
  void a.play().catch(() => {});
}
