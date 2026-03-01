/**
 * extension.ts
 * ─────────────────────────────────────────────────────────────
 * Entry point for the **Error Sound** VS Code extension.
 *
 * Responsibilities
 * ────────────────
 * • Register commands (Set Error Sound, Toggle, Play Test Sound).
 * • Create an `ErrorDetector` that watches for new errors.
 * • Play the configured sound file whenever the detector fires.
 * • Show a status‑bar indicator for quick toggling.
 */

import * as vscode from "vscode";
import * as path from "path";
import { ErrorDetector } from "./errorDetector";
import { playSound, stopCurrentPlayback } from "./soundPlayer";
import {
    getSoundFilePath,
    isEnabled,
    getVolume,
    setSoundFilePath,
    toggleEnabled,
    isValidSoundFile,
    SUPPORTED_EXTENSIONS,
} from "./config";

// ─── Module‑level state ────────────────────────────────────

let errorDetector: ErrorDetector | null = null;
let statusBarItem: vscode.StatusBarItem;

// ─── Activation ─────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
    console.log('[Error Sound] Extension activating…');

    // ── Status bar ──────────────────────────────────────────
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = "errorSound.toggleEnabled";
    updateStatusBar();
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // ── Error detector ──────────────────────────────────────
    errorDetector = new ErrorDetector((newErrorCount) => {
        if (!isEnabled()) {
            return;
        }

        const soundPath = getSoundFilePath(context.extensionPath);
        const volume = getVolume();

        console.log(
            `[Error Sound] ${newErrorCount} new error(s) detected – playing ${soundPath}`
        );

        playSound(soundPath, volume).catch((err) => {
            console.error("[Error Sound] Playback error:", err);
        });
    });
    context.subscriptions.push(errorDetector);

    // ── Commands ────────────────────────────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand("errorSound.setErrorSound", () =>
            handleSetErrorSound(context)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("errorSound.toggleEnabled", () =>
            handleToggle()
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("errorSound.playTestSound", () =>
            handlePlayTestSound(context)
        )
    );

    // ── React to setting changes ────────────────────────────
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("errorSound")) {
                updateStatusBar();
            }
        })
    );

    console.log("[Error Sound] Extension activated ✓");
}

// ─── Deactivation ───────────────────────────────────────────

export function deactivate(): void {
    stopCurrentPlayback();
    errorDetector?.dispose();
    errorDetector = null;
    console.log("[Error Sound] Extension deactivated.");
}

// ─── Command handlers ───────────────────────────────────────

/**
 * "Set Error Sound" – opens a file picker so the user can choose
 * a custom .mp3 / .wav file.
 */
async function handleSetErrorSound(
    context: vscode.ExtensionContext
): Promise<void> {
    const filterLabel = SUPPORTED_EXTENSIONS.map((e) => `*${e}`).join(", ");
    const result = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: "Select Sound File",
        filters: {
            "Audio Files": SUPPORTED_EXTENSIONS.map((e) => e.replace(".", "")),
        },
        defaultUri: vscode.Uri.file(
            path.join(context.extensionPath, "sounds")
        ),
    });

    if (!result || result.length === 0) {
        return; // User cancelled.
    }

    const selectedPath = result[0].fsPath;

    if (!isValidSoundFile(selectedPath)) {
        vscode.window.showErrorMessage(
            `Invalid sound file. Please choose a ${filterLabel} file.`
        );
        return;
    }

    await setSoundFilePath(selectedPath);
    vscode.window.showInformationMessage(
        `Error Sound: Sound set to "${path.basename(selectedPath)}"`
    );
}

/**
 * "Toggle Error Sound On/Off"
 */
async function handleToggle(): Promise<void> {
    const newState = await toggleEnabled();
    updateStatusBar();
    vscode.window.showInformationMessage(
        `Error Sound: ${newState ? "Enabled ✓" : "Disabled ✗"}`
    );
}

/**
 * "Play Test Sound" – immediately plays the current sound once.
 */
async function handlePlayTestSound(
    context: vscode.ExtensionContext
): Promise<void> {
    const soundPath = getSoundFilePath(context.extensionPath);
    const volume = getVolume();

    vscode.window.showInformationMessage(
        `Playing: ${path.basename(soundPath)}`
    );

    try {
        await playSound(soundPath, volume);
    } catch {
        vscode.window.showErrorMessage(
            "Error Sound: Could not play the sound file. Check the path."
        );
    }
}

// ─── Helpers ────────────────────────────────────────────────

/** Update the status‑bar item text/tooltip to reflect current state. */
function updateStatusBar(): void {
    const enabled = isEnabled();
    statusBarItem.text = enabled ? "$(unmute) Error Sound" : "$(mute) Error Sound";
    statusBarItem.tooltip = enabled
        ? "Error Sound is ON – click to toggle"
        : "Error Sound is OFF – click to toggle";
}
