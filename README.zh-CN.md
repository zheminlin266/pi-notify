# pi-notify

[English](README.md)

当 [Pi](https://pi.dev) 完成工作并等待下一次输入时，发送原生桌面通知。

![pi-notify 演示](demo.gif)

## 特色功能

- **只在 Pi 真正空闲后通知**：等待自动重试、上下文压缩和队列中的后续任务全部结束。
- **区分正常完成与错误**：遇到无法恢复的 agent 错误时显示不同消息。
- **自动识别终端**：无需配置即可选择 Windows Toast、Kitty OSC 99、iTerm2 OSC 9 或 OSC 777。
- **支持 tmux**：自动包装 tmux passthrough 序列。
- **可选声音提醒**：在后台执行自定义声音命令，不阻塞 Pi。
- **零运行时依赖**：实现仅为一个轻量 TypeScript 扩展。

## 兼容性

| 环境 | 通知方式 |
| --- | --- |
| Windows Terminal | PowerShell 原生 Windows Toast |
| Kitty | OSC 99 |
| iTerm2 | OSC 9 |
| Ghostty、WezTerm、rxvt-unicode 等兼容终端 | OSC 777 |
| tmux | 自动使用 DCS passthrough 包装 |

终端和操作系统需要允许通知。Windows Terminal 通知依赖 `powershell.exe`；启用 Windows 互操作时通常也可在 WSL 中使用。

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

通过 `PI_NOTIFY_SOUND_CMD` 设置任意 shell 命令。桌面通知发出后，该命令会作为独立后台进程运行。

```bash
# macOS
export PI_NOTIFY_SOUND_CMD='afplay /System/Library/Sounds/Glass.aiff'

# Linux
export PI_NOTIFY_SOUND_CMD='paplay /usr/share/sounds/freedesktop/stereo/complete.oga'

# Windows PowerShell
$env:PI_NOTIFY_SOUND_CMD = 'powershell -c "[console]::beep(880,180)"'
```

如需长期生效，请写入 shell 配置文件；不设置时仅发送静默桌面通知。

## 工作原理

扩展通过 Pi 的 `agent_end` 事件记录最终 assistant 结果，但只在 `agent_settled` 事件触发后通知。因此，自动重试、上下文压缩或排队中的后续 prompt 不会造成过早提醒。

通知时会根据环境变量识别终端，输出相应转义序列或 Windows Toast，然后启动可选声音命令。

## pi.dev 状态

目前 Pi 已可通过 Git 安装本仓库。pi.dev 扩展列表会发现 npm 上包含 `pi-package` 关键词的包；由于无 scope 的 `pi-notify` 名称属于上游项目，本维护版本需要先以唯一 npm 包名发布，才能获得独立的 pi.dev 条目。

## 致谢

本项目基于 [ferologics/pi-notify](https://github.com/ferologics/pi-notify)，原作者为 [ferologics](https://github.com/ferologics)，并保留 MIT 许可证。本仓库是独立维护的复制版本，不宣称为原创项目。

## 许可证

[MIT](LICENSE)
