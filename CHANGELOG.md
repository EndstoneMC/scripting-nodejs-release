# Changelog

All notable changes to scripting-nodejs are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-10-14

### Added

- Added support for Bedrock Dedicated Server 1.26.51 and 1.26.52, which Endstone 0.11.11 to 0.11.14 run.
- Added the `/nodejs` command, which shows the versions, the engine, each pack's memory use and the watchdog settings, to operators by default.
- Added one start-up line saying which Node.js the scripts run on and which Bedrock versions are supported.
- Added the plugin's licence and the third-party notices to the release archive.
- Native iterable classes such as `BlockLocationIterator` now work with `for...of` and spread.

### Changed

- The plugin's log lines are now prefixed `[scripting-nodejs]`.
- On an unsupported Bedrock version the plugin prints one line naming the supported versions.
- A missing, mismatched or unloadable `plugins/scripting_nodejs/` folder is reported in plain words, with the system's reason as text on Windows.
- npm packages are installed once per folder per start, give up after 60 seconds, and print one line saying what happened.
- An import that finds nothing reads as it does on the built-in engine, without Node.js internals in the error.
- A `@minecraft/*` module whose own dependencies are not met is refused at import, as on the built-in engine.
- `process.exit()` throws an error the pack can catch instead of being abandoned.
- Warnings from Node.js and output to `process.stdout` and `process.stderr` reach the server log.
- Scripts get the same stack depth as the built-in engine.

### Removed

- **BREAKING**: Removed support for Bedrock Dedicated Server 1.26.3x and 1.26.4x; use 0.1.0 with Endstone 0.11.10 or earlier for those.

### Fixed

- Fixed a script that never returns freezing the server; it is now interrupted at `script-watchdog-hang-threshold`, as on the built-in engine.
- Fixed `script-watchdog-memory-limit` not being enforced on scripts.
- Fixed a stack overflow going unreported to the script watchdog.
- Fixed the plugin failing to load on Linux servers that do not have the LLVM C++ runtime installed, such as a fresh Ubuntu 24.04 (#2).
- Fixed the server crashing when a pack imports certain npm packages, such as `mongodb` (#1).
- Fixed the server crashing on `/reload` (#3).
- Fixed npm packages being given a pack's own script when they import a built-in module or a file of the same name.
- Fixed `process.exit()` and an uncaught error in a timer stopping the pack's timers and network callbacks.
- Fixed a pack that reads `process.stdin` shutting the server down.
- Fixed a pack whose top level waits for a later tick being reported as failed to load.
- Fixed child processes started by name, such as `execFile("uname")`, failing with `ENOENT` on Linux.
- Fixed an error from a missing library being reported as a missing file.

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

[Unreleased]: https://github.com/EndstoneMC/scripting-nodejs-release/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/EndstoneMC/scripting-nodejs-release/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/EndstoneMC/scripting-nodejs-release/releases/tag/v0.1.0
