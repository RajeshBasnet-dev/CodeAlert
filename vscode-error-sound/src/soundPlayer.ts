/**
 * soundPlayer.ts
 * ─────────────────────────────────────────────────────────────
 * Cross‑platform audio playback module.
 *
 * Uses platform‑native commands to play .wav / .mp3 files:
 *   • Windows  → PowerShell's SoundPlayer (.wav) or Media.MediaPlayer (.mp3)
 *   • macOS    → afplay
 *   • Linux    → aplay (.wav) / mpg123 or paplay (.mp3)
 *
 * This avoids native Node add‑on compilation issues that can plague
 * VS Code extensions.
 */

import { exec, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";

/** Active playback process (if any) – tracked so we can kill overlapping plays. */
let activeProcess: ChildProcess | null = null;

/**
 * Play an audio file at the given `filePath`.
 *
 * @param filePath – Absolute path to an .mp3 or .wav file.
 * @param volume   – Volume scale 0‑1 (best‑effort; not every platform supports it).
 * @returns A promise that resolves when playback completes (or rejects on error).
 */
export function playSound(filePath: string, volume: number = 1.0): Promise<void> {
    return new Promise((resolve, reject) => {
        // ── Guard: file must exist ──────────────────────────────
        if (!fs.existsSync(filePath)) {
            const msg = `Sound file not found: ${filePath}`;
            vscode.window.showWarningMessage(`Error Sound: ${msg}`);
            return reject(new Error(msg));
        }

        // ── Kill any in‑progress playback ───────────────────────
        stopCurrentPlayback();

        const ext = path.extname(filePath).toLowerCase();
        const command = buildPlayCommand(filePath, ext, volume);

        if (!command) {
            const msg = `Unsupported platform or file type: ${process.platform}, ${ext}`;
            vscode.window.showWarningMessage(`Error Sound: ${msg}`);
            return reject(new Error(msg));
        }

        // ── Execute the native command ──────────────────────────
        activeProcess = exec(command, (error) => {
            activeProcess = null;
            if (error) {
                // Don't show a warning for SIGTERM (we killed it ourselves)
                if (error.killed) {
                    return resolve();
                }
                console.error(`[Error Sound] Playback failed: ${error.message}`);
                return reject(error);
            }
            resolve();
        });
    });
}

/**
 * Stop any currently playing sound.
 */
export function stopCurrentPlayback(): void {
    if (activeProcess) {
        activeProcess.kill();
        activeProcess = null;
    }
}

// ─── Private helpers ────────────────────────────────────────

/**
 * Build a platform‑specific playback command string.
 */
function buildPlayCommand(
    filePath: string,
    ext: string,
    volume: number
): string | null {
    const escaped = filePath.replace(/'/g, "'\\''"); // shell‑safe single‑quote escape

    switch (process.platform) {
        // ── Windows ───────────────────────────────────────────
        case "win32":
            if (ext === ".wav") {
                // PowerShell SoundPlayer is the most reliable for .wav on Windows.
                return `powershell -NoProfile -Command "(New-Object Media.SoundPlayer '${escaped}').PlaySync()"`;
            }
            // For .mp3 use Windows Media Player COM via PowerShell.
            return (
                `powershell -NoProfile -Command "` +
                `$p = New-Object System.Windows.Media.MediaPlayer; ` +
                `$p.Open([Uri]'${escaped}'); ` +
                `$p.Volume = ${volume}; ` +
                `$p.Play(); ` +
                `Start-Sleep -Seconds 3; ` +
                `$p.Close()"`
            );

        // ── macOS ─────────────────────────────────────────────
        case "darwin":
            // `afplay` supports both .wav and .mp3.
            const vol = Math.round(volume * 100);
            return `afplay -v ${vol / 100} '${escaped}'`;

        // ── Linux ─────────────────────────────────────────────
        case "linux":
            if (ext === ".wav") {
                return `aplay '${escaped}'`;
            }
            // Attempt mpg123 first; fall back to paplay.
            return `mpg123 -q '${escaped}' 2>/dev/null || paplay '${escaped}'`;

        default:
            return null;
    }
}
