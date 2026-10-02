import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";

// Exercise the extension without starting any notification or audio processes.
const source = stripTypeScriptTypes(readFileSync(new URL("./index.ts", import.meta.url), "utf8"))
    .replace("export default function", "module.exports = function");

function load(env = {}) {
    const handlers = new Map();
    const sounds = [];
    const toasts = [];
    const output = [];
    const context = {
        module: { exports: {} },
        process: { env, platform: "win32", stdout: { write: (text) => output.push(text) } },
        require(name) {
            assert.equal(name, "node:child_process");
            return {
                execFile: (...args) => toasts.push(args),
                spawn: (...args) => {
                    const child = new EventEmitter();
                    child.unref = () => {};
                    sounds.push({ args, child });
                    return child;
                },
            };
        },
    };
    vm.runInNewContext(source, context, { filename: "index.ts" });
    context.module.exports({ on: (name, handler) => handlers.set(name, handler) });
    return { handlers, sounds, toasts, output };
}

const complete = "play-complete";
const interrupted = "play-interrupted";
const fallback = "play-fallback";
const test = load({ WT_SESSION: "test", PI_NOTIFY_SOUND_COMPLETE_CMD: complete,
    PI_NOTIFY_SOUND_INTERRUPTED_CMD: interrupted, PI_NOTIFY_SOUND_CMD: fallback });
const end = (stopReason) => test.handlers.get("agent_end")({ messages: [{ role: "assistant", stopReason }] });
const settled = (hasUI = true) => test.handlers.get("agent_settled")({}, { hasUI });

await end("error");
assert.equal(test.sounds.length, 0, "agent_end must not notify during retries");
await end("stop");
await settled();
assert.equal(test.sounds.at(-1).args[0], complete, "successful retry must use completion sound");
assert.equal(test.sounds.at(-1).args[1].windowsHide, true);
assert.equal(test.toasts[0][2].windowsHide, true);
assert.match(test.toasts[0][1][2], /SetAttribute\('silent', 'true'\)/,
    "custom audio must silence the overlapping Windows toast chime");
assert.doesNotThrow(() => test.sounds.at(-1).child.emit("error", new Error("player unavailable")));

await end("aborted");
await settled();
assert.equal(test.sounds.at(-1).args[0], interrupted);
await end("error");
await settled();
assert.equal(test.sounds.at(-1).args[0], fallback);
const count = test.sounds.length;
await end("stop");
await settled(false);
assert.equal(test.sounds.length, count, "headless subagents must remain silent");

const silent = load({ WT_SESSION: "test" });
await silent.handlers.get("agent_settled")({}, { hasUI: true });
assert.equal(silent.sounds.length, 0, "unset sound hooks must not launch a custom player");
assert.doesNotMatch(silent.toasts[0][1][2], /SetAttribute\('silent', 'true'\)/,
    "without a custom hook the existing Windows toast behavior must be preserved");
const blank = load({ PI_NOTIFY_SOUND_COMPLETE_CMD: "  ", PI_NOTIFY_SOUND_CMD: fallback });
await blank.handlers.get("agent_settled")({}, { hasUI: true });
assert.equal(blank.sounds[0].args[0], fallback);
assert.equal(blank.output.length, 1);
const audio = readFileSync(new URL("./sounds/bip-bop-01.mp3", import.meta.url));
assert.equal(createHash("sha256").update(audio).digest("hex"),
    "129765d4203f92ecb36ba17553b037ebf4daf28ebb56013b3896d3e7e36f2d74",
    "bundled audio must match the verified OpenCode asset");
console.log("pi-notify: lifecycle, sound selection, headless mode, toast audio, playback failure and asset checks passed");
