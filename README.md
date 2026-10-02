# pi-notify

[简体中文](README.zh-CN.md)

Native desktop notifications when [Pi](https://pi.dev) has finished working and is ready for your next input.

## What's New in This Version

Compared with the earlier `agent_end`-only behavior described by the upstream README, this maintained version adds and documents:

- **Settled-only notifications** — notification is delayed until Pi emits `agent_settled`, so automatic retries, context compaction, and queued follow-ups can finish first.
- **Outcome-aware messages** — normal completion shows “Ready for input,” while an unrecoverable agent failure shows a dedicated error message.
- **User-facing sessions only** — settled sessions without an attached UI, including headless subagent children, do not emit a desktop notification.
- **Correct lifecycle documentation** — the README now explains that `agent_end` records the result and `agent_settled` triggers the notification.
- **Outcome-specific sound hooks** — completion and interruption can use separate commands, while `PI_NOTIFY_SOUND_CMD` remains the fallback for existing configurations.
- **Hidden Windows sound console** — Windows console windows are hidden when sound commands run in the background.
- **OpenCode audio asset** — includes the verified `bip-bop-01.mp3` for file-based completion/interruption hooks, with its MIT notice and source hash.
- **No overlapping Windows chime** — when a custom sound hook is configured, the Windows toast is silent. Player launch failures cannot crash Pi.

Terminal protocol detection and tmux passthrough are inherited from the original project. This maintained version extends the original optional sound hook with separate completion and interruption commands.

## Highlights

- **Notifies only when Pi is truly settled** — waits until retries, context compaction, and queued follow-ups have finished.
- **Error-aware messages** — distinguishes a normal completion from an unrecoverable agent error.
- **No empty subagent notifications** — only settled sessions with an attached user UI can notify.
- **Automatic terminal detection** — selects Windows toast, Kitty OSC 99, iTerm2 OSC 9, or OSC 777 without configuration.
- **tmux support** — wraps OSC notifications in tmux passthrough sequences automatically.
- **Optional sound hooks** — runs commands in the background without blocking Pi, with separate sounds for completion and interruption.
- **Zero runtime dependencies** — one small TypeScript extension.

## Compatibility

| Environment | Notification method |
| --- | --- |
| Windows Terminal | Native Windows toast via PowerShell |
| Kitty | OSC 99 |
| iTerm2 | OSC 9 |
| Ghostty, WezTerm, rxvt-unicode, and compatible terminals | OSC 777 |
| tmux | Automatic DCS passthrough wrapping |

The notification lifecycle is tested against Pi 1.0.0 (`agent_end`, `agent_settled`, and `ctx.hasUI`). Terminal notification support and notification permissions must be enabled in your terminal and operating system. Windows Terminal notifications require `powershell.exe`; this normally also works from WSL when Windows interop is enabled.

## Install

This maintained copy is currently installed directly from GitHub:

```bash
pi install git:github.com/zheminlin266/pi-notify
```

If the upstream npm package is already installed, remove it first to avoid loading the extension twice:

```bash
pi remove npm:pi-notify
pi install git:github.com/zheminlin266/pi-notify
```

Restart Pi after installation.

## Optional sound

Set these environment variables to any shell command. Each command is spawned asynchronously after the desktop notification; on Windows, its console window is hidden:

- `PI_NOTIFY_SOUND_COMPLETE_CMD` — played when the conversation completes normally.
- `PI_NOTIFY_SOUND_INTERRUPTED_CMD` — played when the task is interrupted, such as with `Esc`.
- `PI_NOTIFY_SOUND_CMD` — generic fallback when the matching specific variable is unset; this preserves the old configuration.

```bash
# macOS
export PI_NOTIFY_SOUND_COMPLETE_CMD='afplay /System/Library/Sounds/Glass.aiff'
export PI_NOTIFY_SOUND_INTERRUPTED_CMD='afplay /System/Library/Sounds/Basso.aiff'

# Linux
export PI_NOTIFY_SOUND_COMPLETE_CMD='paplay /usr/share/sounds/freedesktop/stereo/complete.oga'
export PI_NOTIFY_SOUND_INTERRUPTED_CMD='paplay /usr/share/sounds/freedesktop/stereo/dialog-error.oga'

# Windows PowerShell (requires ffplay; adjust the repository path)
$env:PI_NOTIFY_SOUND_COMPLETE_CMD = 'ffplay -nodisp -autoexit -loglevel quiet -volume 100 "D:\Projects\pi-notify\sounds\bip-bop-01.mp3"'
$env:PI_NOTIFY_SOUND_INTERRUPTED_CMD = $env:PI_NOTIFY_SOUND_COMPLETE_CMD

# Optional: persist for newly started shells/Pi processes
[Environment]::SetEnvironmentVariable('PI_NOTIFY_SOUND_COMPLETE_CMD', $env:PI_NOTIFY_SOUND_COMPLETE_CMD, 'User')
[Environment]::SetEnvironmentVariable('PI_NOTIFY_SOUND_INTERRUPTED_CMD', $env:PI_NOTIFY_SOUND_INTERRUPTED_CMD, 'User')
```

Add the settings to your shell profile to keep them across sessions. Leave them unset to disable the custom sound hook (the OS/terminal may still play its own notification sound). Windows toasts are silent while a custom sound hook is configured.

The bundled MP3 matches OpenCode 2.0.20's main-session completion/interruption sound. `-volume 100` keeps its original level, matching the user's OpenCode `attention.volume = 1` without amplification. It does not set Windows master volume; application mixer levels can differ. Asset provenance is recorded in [`sounds/README.md`](sounds/README.md).

Changing persistent environment variables does not update already-running shells or Pi. Start a fresh terminal and Pi process to use the new values; `/reload` alone reloads code, not inherited environment variables.

## How it works

The extension records the final assistant result on Pi's `agent_end` event, but deliberately waits for `agent_settled` before notifying. This prevents premature notifications during automatic retries, context compaction, or queued follow-up prompts.

Before notifying, it checks Pi's public `ctx.hasUI` flag. Headless sessions, such as subagent child sessions without an attached UI, are ignored, while a user-facing parent session can still notify after it has displayed the result and settled.

At notification time it detects the current terminal from environment variables, emits the appropriate escape sequence or Windows toast, and then starts the outcome-specific sound hook. On Windows, the sound command uses a hidden console process so no command window flashes on the desktop. Unrecoverable errors currently use the generic `PI_NOTIFY_SOUND_CMD` fallback.

## Development

Load the local extension while working in this repository:

```bash
pi -e ./index.ts
```

Package metadata is declared under the `pi.extensions` field in [`package.json`](package.json).

Run `npm test` with Node.js 24+ for a dependency-free smoke test. It checks notification timing, sound selection, headless sessions, silent Windows toasts, asynchronous player failures, and the bundled audio hash without playing sounds.

## pi.dev availability

Pi can install this repository through Git today. The pi.dev package gallery discovers packages published to npm with the `pi-package` keyword. This maintained copy will need a uniquely named npm release before it can have a separate gallery entry; the unscoped `pi-notify` name belongs to the upstream project.

## Credits

This project is based on [ferologics/pi-notify](https://github.com/ferologics/pi-notify) by [ferologics](https://github.com/ferologics) and retains its MIT license. This repository is an independently maintained copy and is not presented as the original work.

## License

[MIT](LICENSE)
