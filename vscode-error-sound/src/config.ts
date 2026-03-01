/**
 * config.ts
 * ─────────────────────────────────────────────────────────────
 * Centralised configuration manager for the Error Sound extension.
 *
 * Reads VS Code workspace settings under the "errorSound.*" namespace
 * and provides typed getters / setters along with a default sound path
 * that ships with the extension.
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

/** Supported audio file extensions. */
export const SUPPORTED_EXTENSIONS = [".mp3", ".wav"];

/**
 * Resolve the path to the default sound file bundled with the extension.
 * The file lives in `<extensionRoot>/sounds/error-default.wav`.
 */
export function getDefaultSoundPath(extensionPath: string): string {
    return path.join(extensionPath, "sounds", "error-default.wav");
}

/**
 * Return the currently configured sound‑file path.
 * Falls back to the built‑in default when the user hasn't set one.
 */
export function getSoundFilePath(extensionPath: string): string {
    const config = vscode.workspace.getConfiguration("errorSound");
    const customPath = config.get<string>("soundFilePath", "");

    if (customPath && fs.existsSync(customPath)) {
        return customPath;
    }

    return getDefaultSoundPath(extensionPath);
}

/** Whether error-sound playback is enabled. */
export function isEnabled(): boolean {
    return vscode.workspace.getConfiguration("errorSound").get<boolean>("enabled", true);
}

/** Debounce interval between consecutive plays (ms). */
export function getDebounceMs(): number {
    return vscode.workspace.getConfiguration("errorSound").get<number>("debounceMs", 1000);
}

/** Playback volume, 0.0 → 1.0. */
export function getVolume(): number {
    return vscode.workspace.getConfiguration("errorSound").get<number>("volume", 1.0);
}

/**
 * Persist a new sound file path to user settings.
 */
export async function setSoundFilePath(filePath: string): Promise<void> {
    const config = vscode.workspace.getConfiguration("errorSound");
    await config.update("soundFilePath", filePath, vscode.ConfigurationTarget.Global);
}

/**
 * Toggle the enabled state and return the new value.
 */
export async function toggleEnabled(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration("errorSound");
    const current = config.get<boolean>("enabled", true);
    await config.update("enabled", !current, vscode.ConfigurationTarget.Global);
    return !current;
}

/**
 * Validate that a given file path points to a supported audio file.
 * Returns `true` when valid, `false` otherwise.
 */
export function isValidSoundFile(filePath: string): boolean {
    if (!fs.existsSync(filePath)) {
        return false;
    }
    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
}
