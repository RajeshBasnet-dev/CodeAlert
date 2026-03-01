/**
 * generate-beep.js
 * ─────────────────────────────────────────────────────────────
 * Generates a simple PCM WAV beep sound for the default error tone.
 * This runs once during setup — you can replace the output file
 * with any .wav or .mp3 of your choice.
 *
 * Usage: node generate-beep.js
 * Output: sounds/error-default.wav
 */

const fs = require("fs");
const path = require("path");

// ── Audio parameters ────────────────────────────────────────
const SAMPLE_RATE = 44100;
const DURATION = 0.25;          // seconds
const FREQUENCY = 880;          // Hz (A5 — a sharp, attention‑grabbing beep)
const AMPLITUDE = 0.6;          // 0–1
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

const numSamples = Math.floor(SAMPLE_RATE * DURATION);
const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
const dataSize = numSamples * blockAlign;

// ── Build the WAV buffer ────────────────────────────────────
const buffer = Buffer.alloc(44 + dataSize);
let offset = 0;

function writeString(str) {
    buffer.write(str, offset, "ascii");
    offset += str.length;
}
function writeUInt32(val) {
    buffer.writeUInt32LE(val, offset);
    offset += 4;
}
function writeUInt16(val) {
    buffer.writeUInt16LE(val, offset);
    offset += 2;
}
function writeInt16(val) {
    buffer.writeInt16LE(val, offset);
    offset += 2;
}

// RIFF header
writeString("RIFF");
writeUInt32(36 + dataSize);
writeString("WAVE");

// fmt  sub‑chunk
writeString("fmt ");
writeUInt32(16);                        // sub‑chunk size
writeUInt16(1);                         // PCM format
writeUInt16(NUM_CHANNELS);
writeUInt32(SAMPLE_RATE);
writeUInt32(byteRate);
writeUInt16(blockAlign);
writeUInt16(BITS_PER_SAMPLE);

// data sub‑chunk
writeString("data");
writeUInt32(dataSize);

// ── Generate a sine‑wave with a quick fade‑out ──────────────
for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Envelope: linear fade‑out over the last 30% of the duration
    const fadeStart = DURATION * 0.7;
    let envelope = 1.0;
    if (t > fadeStart) {
        envelope = 1.0 - (t - fadeStart) / (DURATION - fadeStart);
    }
    const sample = Math.sin(2 * Math.PI * FREQUENCY * t) * AMPLITUDE * envelope;
    const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    writeInt16(intSample);
}

// ── Write to disk ───────────────────────────────────────────
const outDir = path.join(__dirname, "sounds");
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, "error-default.wav");
fs.writeFileSync(outPath, buffer);
console.log(`✓ Generated default beep: ${outPath} (${buffer.length} bytes)`);
