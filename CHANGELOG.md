# Changelog

All notable changes to scripting-nodejs are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added support for Bedrock Dedicated Server 1.26.51 and 1.26.52, which Endstone 0.11.11 to 0.11.14 run.

### Changed

- `/reload` is refused while the plugin is installed, with a message saying to restart the server instead, rather than crashing it (#3).
- The start-up error says whether the plugin's runtime files are missing or present but unable to load, and on Windows gives the reason as text rather than an error number.

### Removed

- **BREAKING**: Removed support for Bedrock Dedicated Server 1.26.3x and 1.26.4x; use 0.1.0 with Endstone 0.11.10 or earlier for those.

### Fixed

- Fixed the plugin failing to load on Linux servers that do not have the LLVM C++ runtime installed, such as a fresh Ubuntu 24.04 (#2).
- Fixed the server crashing when a pack imports certain npm packages, such as `mongodb` (#1).

## [0.1.0] - 2026-08-05

The first release, and a pre-release.

### Added

- Behaviour-pack scripts run on Node.js instead of the server's built-in engine, with the same `@minecraft/*` imports and nothing to configure.
- Packs can `import` Node.js built-ins, npm packages and their own files, including worker threads and full ICU.
- npm packages listed in a pack's `package.json` are installed before the pack's scripts run, with no Node.js or npm needed on the server.
- Each pack resolves npm packages from its own `node_modules` first, so two packs can depend on different versions of one package.
- `console.log`, `.info`, `.debug`, `.warn` and `.error` reach the server log, formatted the way Node.js formats them.
- Errors keep the class, message and pack-relative stack they have on the built-in engine.
- `import.meta.url` and stack frames for a pack's own files are relative to the server folder, so they do not reveal where the server is installed.
- The script watchdog's hang threshold stops a runaway script and its memory limit stops a pack that allocates without bound, without taking the server down.
- The server's script timings, memory figures and `Slow`, `Spike`, `Hang` and high-memory watchdog events come from the real engine.
- Stack traces from a pack built with a bundler that records debug ids can be mapped back to the original sources.

[Unreleased]: https://github.com/EndstoneMC/scripting-nodejs-release/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/EndstoneMC/scripting-nodejs-release/releases/tag/v0.1.0
