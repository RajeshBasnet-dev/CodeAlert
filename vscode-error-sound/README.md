# 🔊 Error Sound — VS Code Extension

> **Hear your bugs!** Plays a custom sound whenever a new error (red squiggly) appears in your code editor.

![VS Code](https://img.shields.io/badge/VS%20Code-1.80%2B-blue?logo=visual-studio-code)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

| Feature | Description |
| --- | --- |
| 🎵 **Real‑time error detection** | Listens to VS Code diagnostics and fires on *new* errors only |
| 🎛️ **Custom sound file** | Bring your own `.mp3` or `.wav` — select it from the Command Palette |
| 🔇 **Quick toggle** | Enable / disable from the status bar or Command Palette |
| ⏱️ **Debounce control** | Configurable cooldown so the sound doesn't spam while you type |
| 🖥️ **Cross‑platform** | Works on Windows, macOS, and Linux (no native add‑ons) |

---

## 📦 Installation

### From Source (Development)

```bash
# 1. Clone or download this folder
cd vscode-error-sound

# 2. Install dependencies
npm install

# 3. Compile TypeScript
npm run compile

# 4. Open this folder in VS Code
code .

# 5. Press F5 to launch the Extension Development Host
```

### From VSIX (Production)

```bash
# Package the extension
npx -y @vscode/vsce package

# Install the generated .vsix
code --install-extension vscode-error-sound-1.0.0.vsix
```

---

## 🎵 Configuring the Sound

### Option 1 — Command Palette

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Type **"Error Sound: Set Error Sound"**.
3. Browse and select your `.mp3` or `.wav` file.

### Option 2 — Settings

Add this to your `settings.json`:

```jsonc
{
  "errorSound.soundFilePath": "C:/path/to/your/sound.wav"
}
```

### Option 3 — Drop‑in Default

Place your audio file at:

```
vscode-error-sound/sounds/error-default.wav
```

The extension uses this path automatically when no custom path is set.

---

## 🎮 Commands

| Command | Description |
| --- | --- |
| `Error Sound: Set Error Sound` | Open a file picker to choose a custom `.mp3` / `.wav` |
| `Error Sound: Toggle Error Sound On/Off` | Enable or disable the extension |
| `Error Sound: Play Test Sound` | Preview the currently configured sound |

---

## ⚙️ Configuration

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `errorSound.soundFilePath` | `string` | `""` | Absolute path to a custom sound file. Leave empty for the bundled default. |
| `errorSound.enabled` | `boolean` | `true` | Turn error sound on or off. |
| `errorSound.debounceMs` | `number` | `1000` | Minimum milliseconds between consecutive sound plays. |
| `errorSound.volume` | `number` | `1.0` | Playback volume (`0.0` – `1.0`). Platform support varies. |

---

## 🧪 Testing the Extension

1. **Press `F5`** in VS Code to launch the Extension Development Host.
2. Open or create a `.ts` / `.js` file with intentional errors, for example:

   ```typescript
   // test-errors.ts
   const x: number = "hello";   // ← Type error
   console.logg("oops");         // ← Unknown function
   ```

3. You should hear the configured sound play once the TypeScript / JavaScript language server reports the errors.
4. Fix the errors — the sound should **not** replay until a *new* error appears.
5. Use `Ctrl+Shift+P` → **"Error Sound: Play Test Sound"** to verify audio playback independently.

---

## 📁 Folder Structure

```
vscode-error-sound/
├── .vscode/
│   ├── launch.json          # Debug configuration
│   └── tasks.json           # Build task
├── sounds/
│   └── error-default.wav    # Default sound (place your own here)
├── src/
│   ├── extension.ts         # Main entry — commands, lifecycle
│   ├── errorDetector.ts     # Diagnostics watcher with fingerprinting
│   ├── soundPlayer.ts       # Cross‑platform audio playback
│   └── config.ts            # Settings manager
├── package.json             # Extension manifest
├── tsconfig.json            # TypeScript config
├── .vscodeignore            # Files to exclude from packaging
├── .gitignore
└── README.md                # You are here!
```

---

## 🔧 How It Works

1. **Activation** — The extension activates after VS Code finishes starting (`onStartupFinished`).
2. **Error detection** — `errorDetector.ts` subscribes to `vscode.languages.onDidChangeDiagnostics`. Each error is fingerprinted by URI + range + message.
3. **New‑error check** — Only errors whose fingerprint is *not* already in the known set trigger the sound.
4. **Debouncing** — A configurable timer prevents the sound from firing repeatedly while the user is actively typing.
5. **Playback** — `soundPlayer.ts` uses OS‑native commands (`powershell`, `afplay`, `aplay`) to play the audio without requiring native Node.js add‑ons.

---

## 🐧 Linux Prerequisites

On Linux you may need to install one of these audio players:

```bash
# For .wav files
sudo apt install alsa-utils   # provides `aplay`

# For .mp3 files
sudo apt install mpg123
```

---

## 📝 License

MIT — feel free to modify and redistribute.

---

## 🤝 Contributing

1. Fork the repo.
2. Create a feature branch.
3. Submit a pull request.

Bug reports and feature requests are welcome!
