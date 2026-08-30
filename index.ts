/**
 * Pi Notify Extension
 *
 * Sends a native terminal notification when Pi agent is done and waiting for input.
 * Supports multiple terminal protocols:
 * - OSC 777: Ghostty, WezTerm, rxvt-unicode
 * - OSC 9: iTerm2
 * - OSC 99: Kitty
 * - tmux passthrough wrapper for OSC notifications
 * - Windows toast: Windows Terminal (WSL)
 * - Optional sound hooks via PI_NOTIFY_SOUND_CMD, PI_NOTIFY_SOUND_COMPLETE_CMD,
 *   and PI_NOTIFY_SOUND_INTERRUPTED_CMD
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

function windowsToastScript(title: string, body: string): string {
    const type = "Windows.UI.Notifications";
    const mgr = `[${type}.ToastNotificationManager, ${type}, ContentType = WindowsRuntime]`;
    const template = `[${type}.ToastTemplateType]::ToastText01`;
    const toast = `[${type}.ToastNotification]::new($xml)`;
    return [
        `${mgr} > $null`,
        `$xml = [${type}.ToastNotificationManager]::GetTemplateContent(${template})`,
        `$xml.GetElementsByTagName('text')[0].AppendChild($xml.CreateTextNode('${body}')) > $null`,
        `[${type}.ToastNotificationManager]::CreateToastNotifier('${title}').Show(${toast})`,
    ].join("; ");
}

function wrapForTmux(sequence: string): string {
    if (!process.env.TMUX) return sequence;

    // tmux passthrough: wrap in DCS and escape inner ESC bytes.
    const escaped = sequence.split("\x1b").join("\x1b\x1b");
    return `\x1bPtmux;${escaped}\x1b\\`;
}

function notifyOSC777(title: string, body: string): void {
    const sequence = `\x1b]777;notify;${title};${body}\x07`;
    process.stdout.write(wrapForTmux(sequence));
}

function notifyOSC9(message: string): void {
    const sequence = `\x1b]9;${message}\x07`;
    process.stdout.write(wrapForTmux(sequence));
}

function notifyOSC99(title: string, body: string): void {
    // Kitty OSC 99: i=notification id, d=0 means not done yet, p=body for second part
    const titleSequence = `\x1b]99;i=1:d=0;${title}\x1b\\`;
    const bodySequence = `\x1b]99;i=1:p=body;${body}\x1b\\`;
    process.stdout.write(wrapForTmux(titleSequence));
    process.stdout.write(wrapForTmux(bodySequence));
}

function notifyWindows(title: string, body: string): void {
    const { execFile } = require("node:child_process");
    execFile("powershell.exe", ["-NoProfile", "-Command", windowsToastScript(title, body)]);
}

type NotificationOutcome = "complete" | "interrupted" | "error";

function runSoundHook(outcome: NotificationOutcome): void {
    const specificCommand = outcome === "complete"
        ? process.env.PI_NOTIFY_SOUND_COMPLETE_CMD
        : outcome === "interrupted"
            ? process.env.PI_NOTIFY_SOUND_INTERRUPTED_CMD
            : undefined;
    const command = specificCommand?.trim() || process.env.PI_NOTIFY_SOUND_CMD?.trim();
    if (!command) return;

    try {
        const { spawn } = require("node:child_process");
        const child = spawn(command, {
            shell: true,
            detached: true,
            stdio: "ignore",
            windowsHide: process.platform === "win32",
        });
        child.unref();
    } catch {
        // Ignore hook errors to avoid breaking notifications
    }
}

function notify(title: string, body: string, outcome: NotificationOutcome): void {
    const isIterm2 = process.env.TERM_PROGRAM === "iTerm.app" || Boolean(process.env.ITERM_SESSION_ID);

    if (process.env.WT_SESSION) {
        notifyWindows(title, body);
    } else if (process.env.KITTY_WINDOW_ID) {
        notifyOSC99(title, body);
    } else if (isIterm2) {
        notifyOSC9(`${title}: ${body}`);
    } else {
        notifyOSC777(title, body);
    }

    runSoundHook(outcome);
}

export default function (pi: ExtensionAPI) {
    // `agent_end` fires for every low-level attempt, including transient
    // provider errors that Pi will automatically retry. Wait for
    // `agent_settled`, which means retries, compaction, and queued follow-ups
    // are all finished before notifying.
    let finalOutcome: NotificationOutcome = "complete";

    pi.on("agent_end", async (event) => {
        const assistant = [...event.messages].reverse().find((message) => message.role === "assistant");
        if (!assistant) return;

        if (assistant.stopReason === "aborted") {
            finalOutcome = "interrupted";
        } else if (assistant.stopReason === "error") {
            finalOutcome = "error";
        } else {
            finalOutcome = "complete";
        }
    });

    pi.on("agent_settled", async (_event, ctx) => {
        const outcome = finalOutcome;
        const message = outcome === "error"
            ? "Stopped after an unrecoverable error"
            : outcome === "interrupted"
                ? "Task interrupted"
                : "Ready for input";
        finalOutcome = "complete";

        if (!ctx.hasUI) return;

        notify("Pi", message, outcome);
    });
}
