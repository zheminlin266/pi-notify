# pi-notify

[English](README.md)

当 [Pi](https://pi.dev) 完成工作并等待下一次输入时，发送原生桌面通知。

## 本版本新增

相较于上游 README 先前描述的仅依赖 `agent_end` 的行为，本维护版本新增并明确记录了：

- **仅在完全空闲后通知**：延迟到 Pi 触发 `agent_settled` 才发送通知，让自动重试、上下文压缩和排队中的后续任务先完成。
- **根据结果显示不同消息**：正常完成时显示“Ready for input”，发生不可恢复的 agent 错误时显示专用错误消息。
- **仅通知面向用户的会话**：没有绑定 UI 的已完成会话（包括无头 subagent 子会话）不会发送桌面通知。
- **修正生命周期说明**：README 现在明确说明由 `agent_end` 记录结果、由 `agent_settled` 触发通知。
- **按结果区分声音提醒**：正常完成和中断可使用不同命令，`PI_NOTIFY_SOUND_CMD` 继续作为旧配置的通用回退。
- **Windows 音效不弹命令窗口**：声音命令在后台启动时会隐藏 Windows 控制台窗口。
- **OpenCode 音频文件**：附带已核验的 `bip-bop-01.mp3`，用于完成和中断提示，并保留 MIT 声明和来源哈希。
- **避免 Windows 提示音叠加**：配置自定义音效时，Windows Toast 静音；播放器启动失败不会导致 Pi 崩溃。

终端协议检测和 tmux passthrough 继承自原项目；本维护版本将原有可选声音提醒扩展为支持正常完成和中断分别设置命令。

## 特色功能

- **只在 Pi 真正空闲后通知**：等待自动重试、上下文压缩和队列中的后续任务全部结束。
- **区分正常完成与错误**：遇到无法恢复的 agent 错误时显示不同消息。
- **不再产生空的 subagent 通知**：只有绑定了用户 UI 的已完成会话才会通知。
- **自动识别终端**：无需配置即可选择 Windows Toast、Kitty OSC 99、iTerm2 OSC 9 或 OSC 777。
- **支持 tmux**：自动包装 tmux passthrough 序列。
- **可选声音提醒**：在后台执行自定义声音命令，不阻塞 Pi；可为正常完成和中断分别设置音效。
- **零运行时依赖**：实现仅为一个轻量 TypeScript 扩展。

## 兼容性

| 环境 | 通知方式 |
| --- | --- |
| Windows Terminal | PowerShell 原生 Windows Toast |
| Kitty | OSC 99 |
| iTerm2 | OSC 9 |
| Ghostty、WezTerm、rxvt-unicode 等兼容终端 | OSC 777 |
| tmux | 自动使用 DCS passthrough 包装 |

通知生命周期已按 Pi 1.0.0 的 `agent_end`、`agent_settled` 和 `ctx.hasUI` 接口验证。终端和操作系统需要允许通知。Windows Terminal 通知依赖 `powershell.exe`；启用 Windows 互操作时通常也可在 WSL 中使用。

## 安装

当前维护版本可直接从 GitHub 安装：

```bash
pi install git:github.com/zheminlin266/pi-notify
```

如果已经安装上游 npm 版本，请先移除，避免扩展被重复加载：

```bash
pi remove npm:pi-notify
pi install git:github.com/zheminlin266/pi-notify
```

安装后重启 Pi。

## 可选声音提醒

通过以下环境变量设置任意 shell 命令。桌面通知发出后，命令会异步在后台运行；在 Windows 上不会显示控制台窗口：

- `PI_NOTIFY_SOUND_COMPLETE_CMD`：对话正常输出结束时播放。
- `PI_NOTIFY_SOUND_INTERRUPTED_CMD`：任务被中断（例如按 `Esc`）时播放。
- `PI_NOTIFY_SOUND_CMD`：通用回退音效；当对应的特定变量未设置时使用，也保持旧配置兼容。

```bash
# macOS
export PI_NOTIFY_SOUND_COMPLETE_CMD='afplay /System/Library/Sounds/Glass.aiff'
export PI_NOTIFY_SOUND_INTERRUPTED_CMD='afplay /System/Library/Sounds/Basso.aiff'

# Linux
export PI_NOTIFY_SOUND_COMPLETE_CMD='paplay /usr/share/sounds/freedesktop/stereo/complete.oga'
export PI_NOTIFY_SOUND_INTERRUPTED_CMD='paplay /usr/share/sounds/freedesktop/stereo/dialog-error.oga'

# Windows PowerShell（需要已安装 ffplay；请按实际位置调整路径）
$env:PI_NOTIFY_SOUND_COMPLETE_CMD = 'ffplay -nodisp -autoexit -loglevel quiet -volume 100 "D:\Projects\pi-notify\sounds\bip-bop-01.mp3"'
$env:PI_NOTIFY_SOUND_INTERRUPTED_CMD = $env:PI_NOTIFY_SOUND_COMPLETE_CMD

# 可选：持久化，供新启动的 shell/Pi 使用
[Environment]::SetEnvironmentVariable('PI_NOTIFY_SOUND_COMPLETE_CMD', $env:PI_NOTIFY_SOUND_COMPLETE_CMD, 'User')
[Environment]::SetEnvironmentVariable('PI_NOTIFY_SOUND_INTERRUPTED_CMD', $env:PI_NOTIFY_SOUND_INTERRUPTED_CMD, 'User')
```

如需长期生效，请写入 shell 配置文件或按上述方式持久化。不设置环境变量时不会启动自定义播放器，操作系统或终端仍可能播放自己的通知声音。配置自定义音效后，Windows Toast 会静音，避免两种声音叠加。

附带的 MP3 与本机 OpenCode 2.0.20 的主会话完成/中断音效逐字节一致。`-volume 100` 保持音频原始幅度，对应本机 OpenCode 的 `attention.volume = 1`，不做放大。它不代表 Windows 主音量；不同应用的混音器音量仍可能不同。来源见 [`sounds/README.md`](sounds/README.md)。

持久环境变量变更不会更新已运行的 shell 或 Pi。请重新打开终端并启动 Pi；仅执行 `/reload` 不会刷新进程继承的环境变量。

## 工作原理

扩展通过 Pi 的 `agent_end` 事件记录最终 assistant 结果，但只在 `agent_settled` 事件触发后通知。因此，自动重试、上下文压缩或排队中的后续 prompt 不会造成过早提醒。

通知前，扩展会检查 Pi 公开的 `ctx.hasUI` 标志。无头会话（例如没有绑定 UI 的 subagent 子会话）会被忽略；面向用户的父会话显示结果并完全空闲后仍可正常通知。

通知时会根据环境变量识别终端，输出相应转义序列或 Windows Toast，然后根据结果启动对应的可选声音命令。不可恢复错误目前使用通用 `PI_NOTIFY_SOUND_CMD` 回退音效。Windows 声音命令使用隐藏的控制台进程启动，不会在桌面上闪现命令窗口。

## 本地验证

在 Node.js 24+ 下运行 `npm test`。无需安装依赖，也不会播放声音；覆盖通知时机、音效选择、无头会话、Windows Toast 静音、播放器异步启动失败和音频文件哈希。

## pi.dev 状态

目前 Pi 已可通过 Git 安装本仓库。pi.dev 扩展列表会发现 npm 上包含 `pi-package` 关键词的包；由于无 scope 的 `pi-notify` 名称属于上游项目，本维护版本需要先以唯一 npm 包名发布，才能获得独立的 pi.dev 条目。

## 致谢

本项目基于 [ferologics/pi-notify](https://github.com/ferologics/pi-notify)，原作者为 [ferologics](https://github.com/ferologics)，并保留 MIT 许可证。本仓库是独立维护的复制版本，不宣称为原创项目。

## 许可证

[MIT](LICENSE)
