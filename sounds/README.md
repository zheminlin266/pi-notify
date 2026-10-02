# OpenCode completion sound

`bip-bop-01.mp3` is copied without modification from OpenCode's UI assets:

- Repository: https://github.com/anomalyco/opencode
- Source commit: `1ddb0873aee50d209d1a8d7f91b89c5daf692d49`
- Asset: https://github.com/anomalyco/opencode/blob/1ddb0873aee50d209d1a8d7f91b89c5daf692d49/packages/ui/src/assets/audio/bip-bop-01.mp3
- Package license: https://github.com/anomalyco/opencode/blob/1ddb0873aee50d209d1a8d7f91b89c5daf692d49/packages/ui/LICENSE
- Copyright (c) 2025 opencode; MIT notice retained in `LICENSE-opencode`.
- SHA-256: `129765d4203f92ecb36ba17553b037ebf4daf28ebb56013b3896d3e7e36f2d74`
- Size: 4,574 bytes.

The complete MP3 byte sequence was also found unchanged in the user's installed
OpenCode 2.0.20 executable. Its built-in main-session completion and interruption
notifications both select this asset. The user's `attention.volume` was `1`,
passed to the audio player as normalized volume `1.0` (unity gain).

The Pi sound hook uses ffplay with `-volume 100`, also unity gain. No boost,
normalization, re-encoding, or tone generation is applied. Different application
mixer settings or playback backends can still affect perceived loudness.
