/**
 * errorDetector.ts
 * ─────────────────────────────────────────────────────────────
 * Monitors VS Code diagnostics (the red squiggly lines) and
 * triggers a callback when **new** errors appear.
 *
 * Key design decisions
 * ────────────────────
 * 1. We track *known* error fingerprints per URI so that the sound is
 *    played only for **new** errors, not for diagnostics that were already
 *    visible.
 * 2. A configurable debounce timer prevents the sound from firing in rapid
 *    succession while the user is actively typing.
 * 3. Only `DiagnosticSeverity.Error` diagnostics are considered.
 */

import * as vscode from "vscode";
import { getDebounceMs } from "./config";

/** Signature that uniquely identifies a single diagnostic error. */
type ErrorFingerprint = string;

/**
 * Build a fingerprint string from a diagnostic so we can tell whether
 * an error is "new" or was already present.
 */
function fingerprint(uri: vscode.Uri, diag: vscode.Diagnostic): ErrorFingerprint {
    return `${uri.toString()}|${diag.range.start.line}:${diag.range.start.character}-${diag.range.end.line}:${diag.range.end.character}|${diag.message}`;
}

/**
 * The ErrorDetector class.
 *
 * Instantiate it with `onNewErrors` – a callback that receives the count of
 * new errors whenever fresh diagnostics arrive.
 */
export class ErrorDetector implements vscode.Disposable {
    /** Set of fingerprints we have already seen. */
    private knownErrors = new Set<ErrorFingerprint>();

    /** Handle to the debounce timeout, if any. */
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    /** VS Code disposable for the diagnostics listener. */
    private disposable: vscode.Disposable;

    /**
     * @param onNewErrors – Called when **new** errors are detected.
     *                      Receives the number of new errors that triggered the call.
     */
    constructor(private readonly onNewErrors: (count: number) => void) {
        this.disposable = vscode.languages.onDidChangeDiagnostics(
            this.handleDiagnosticChange,
            this
        );

        // Seed with current diagnostics so we don't fire on already-existing errors.
        this.seedExistingErrors();
    }

    dispose(): void {
        this.disposable.dispose();
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }

    // ─── Private ────────────────────────────────────────────

    /**
     * Populate knownErrors with every error already present at startup.
     */
    private seedExistingErrors(): void {
        vscode.languages.getDiagnostics().forEach(([uri, diagnostics]) => {
            diagnostics
                .filter((d) => d.severity === vscode.DiagnosticSeverity.Error)
                .forEach((d) => this.knownErrors.add(fingerprint(uri, d)));
        });
    }

    /**
     * Handler for `onDidChangeDiagnostics`.
     * Compares incoming errors against the known set and fires `onNewErrors`
     * (debounced) when we find genuinely new ones.
     */
    private handleDiagnosticChange(event: vscode.DiagnosticChangeEvent): void {
        let newErrorCount = 0;

        for (const uri of event.uris) {
            const diagnostics = vscode.languages.getDiagnostics(uri);
            const currentErrors = diagnostics.filter(
                (d) => d.severity === vscode.DiagnosticSeverity.Error
            );

            // Build the fresh set for this URI and detect new fingerprints.
            const freshFingerprints = new Set<ErrorFingerprint>();
            for (const diag of currentErrors) {
                const fp = fingerprint(uri, diag);
                freshFingerprints.add(fp);

                if (!this.knownErrors.has(fp)) {
                    newErrorCount++;
                }
            }

            // Remove stale fingerprints for this URI.
            for (const known of this.knownErrors) {
                if (known.startsWith(uri.toString() + "|") && !freshFingerprints.has(known)) {
                    this.knownErrors.delete(known);
                }
            }

            // Merge fresh fingerprints into the known set.
            freshFingerprints.forEach((fp) => this.knownErrors.add(fp));
        }

        // Fire the callback (debounced) only when new errors appeared.
        if (newErrorCount > 0) {
            this.debouncedNotify(newErrorCount);
        }
    }

    /**
     * Debounced wrapper around `onNewErrors` to prevent rapid‑fire playback.
     */
    private debouncedNotify(count: number): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.debounceTimer = null;
            this.onNewErrors(count);
        }, getDebounceMs());
    }
}
