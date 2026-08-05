# Changelog

All notable changes to scripting-nodejs are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-08-05

The first release, and a pre-release: it runs behaviour packs on Node.js on both Linux and Windows servers, and the limitations below are ones you will meet rather than ones we expect you not to.

### Added

- Behaviour-pack scripts run on Node.js instead of the server's built-in QuickJS engine. Your packs keep their `@minecraft/*` imports and need no changes, and there is nothing to configure — install the plugin and restart.
- `import` and `import()` of `node:` builtins, npm packages and files on disk, including worker threads and full ICU.
- A pack's dependencies are its own. A bare specifier resolves from the pack's own `node_modules` first, then the packs directory, then the server, so two packs can depend on different versions of the same package. A `.mcpack` behaves the same, except that nothing can read a `node_modules` that exists only inside a zip.
- npm and corepack ship with the plugin, and a pack's declared dependencies are installed before its scripts run.
- `console.log`, `.info`, `.debug`, `.warn` and `.error` reach the server log, formatted the way Node formats them, stack frames included.
- Errors read the way they do on the built-in engine — class, message and a pack-relative stack — matched against the real engine character for character by a behaviour pack that runs on both.
- Nothing a pack can read of its own files carries the server's path: `import.meta.url` and every frame naming a pack file is relative to the pack.
- A runaway script is stopped at the server's hang threshold and the tick carries on, and a pack that allocates without limit is terminated against the script-memory ceiling in your server properties rather than taking the process down with it.
- The server's script timings, watchdog events and memory figures are real, so the `Slow`, `Spike`, `Hang` and high-memory thresholds you configure behave as they do on the built-in engine.
- An uploaded stack trace maps back to original sources when a pack was built with a bundler that leaves debug ids behind.

### Known limitations

- **No debugger and no profiler.** You cannot attach a debugger to a pack, set a breakpoint, step, or take a CPU profile. Debugging is `console.log` and stack traces.
- **Stack overflow is invisible to an operator.** Runaway recursion reaches the log as a `RangeError` and raises no watchdog event.
- **A stack frame from an npm package names the server's own directory.** A pack's own frames carry nothing, but a package Node resolved for itself keeps the absolute path it was found at, so an error caught from a package and shown to a player can put your install path in front of them.
- **Script code shares the server tick.** Pack JavaScript that blocks stalls the server, as it does on the built-in engine.
- **A few binding paths answer `undefined`.** Container properties handed back by reference work in neither direction, and a native class the built-in engine makes `for…of`-iterable is not iterable here.
- **A Bedrock update can drop you back to the built-in engine.** The plugin finds where to install itself by byte pattern, and a server update breaks that, leaving one error line in the log until a new build ships.

[Unreleased]: https://github.com/EndstoneMC/scripting-nodejs-release/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/EndstoneMC/scripting-nodejs-release/releases/tag/v0.1.0
