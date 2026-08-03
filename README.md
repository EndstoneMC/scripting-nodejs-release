scripting-nodejs
=====================
### Run existing Script API addons, with the full Node.js ecosystem

This repository is for providing feedback, documentation and samples for the **scripting-nodejs** plugin for [Endstone](https://github.com/EndstoneMC/endstone). You can use it to report issues, submit feature requests and share what you have built. The scripting-nodejs codebase is not open-source, but contributions are welcome here in the form of issues, feature requests, samples and feedback — every report is read and shapes what gets built next.

scripting-nodejs replaces the Bedrock Dedicated Server's built-in QuickJS script engine with a real [Node.js](https://nodejs.org) runtime, so the behaviour packs you already run keep their `@minecraft/*` imports and gain the whole npm ecosystem behind them.

> [!WARNING]
> The plugin is not ready for production servers, and there are no releases to download yet. Watch this repository for the first release.

Quick Start
============
1. Install [Endstone](https://endstone.dev/) v0.11 or newer and start your server once so the folder layout exists.
2. Download the release archive for your platform from [Releases](https://github.com/EndstoneMC/scripting-nodejs-release/releases).
3. Drop `endstone_scripting_nodejs.so` (Linux) or `endstone_scripting_nodejs.dll` (Windows) into your server's `plugins/` folder, and put the `scripting_nodejs/` folder that comes with it beside the plugin.
4. Restart the server.

There is nothing to configure, and your behaviour packs stay exactly as they are.

Features
=========

* Behaviour-pack scripts run on Node.js, with the same addons and the same `@minecraft/*` imports
* `import` and `import()` of `node:` builtins, npm packages and files on disk
* Worker threads, so heavy work never costs you tick time
* Full ICU, for correct internationalisation out of the box
* Per-pack dependencies — a pack ships its own `node_modules`, and two packs can depend on different versions of the same package
* `console.log`, `.info`, `.debug`, `.warn` and `.error` reach the server log, formatted the way Node formats them
* Promises and `await` resolve, because the server pumps the event loop every tick
* Errors keep their class, their message and a pack-relative stack
* Your script-watchdog settings still apply: a pack that stops returning is cut off at the hang threshold, and one that allocates without limit is stopped rather than taking the process down
* Script timings and memory figures come off the real engine instead of reading zero

See the [changelog](CHANGELOG.md) for the latest release.

Performance
===============

QuickJS is a bytecode interpreter with no JIT, so script code that does real work runs a lot faster once V8 is underneath it. One behaviour pack, run twice on the same machine — once with the plugin installed, once with it moved aside so BDS keeps its own engine:

| Benchmark | QuickJS | Node.js / V8 | |
| --- | ---: | ---: | ---: |
| integer loop, 20k iterations | 176 ops/s | 97,175 ops/s | **551×** |
| object field access, 5k objects | 258 ops/s | 29,348 ops/s | **114×** |
| float loop, 20k iterations | 145 ops/s | 11,208 ops/s | **77×** |
| recursion, `fib(18)` | 506 ops/s | 29,055 ops/s | **57×** |
| string building, 2k appends | 1,488 ops/s | 65,058 ops/s | **44×** |
| `map`/`filter`/`reduce`, 5k elements | 336 ops/s | 14,463 ops/s | **43×** |
| `Array.sort`, 2k elements | 393 ops/s | 2,473 ops/s | **6×** |
| | | geometric mean | **61×** |

The spread matters more than the average. Sorting gains least because the sort itself is C in both engines and only the comparator is JavaScript; the integer loop gains most because it is exactly what a JIT is for. The more of your hot path is JavaScript rather than engine internals, the more this is worth.

Measured with Node.js v24.18.0 (V8 13.6) against BDS 1.26.32.2, each benchmark given the same 150 ms of warm-up and 400 ms of measurement on both engines, counting iterations rather than timing a fixed count. Single run per engine, so treat the exact figures as indicative.

Compatibility
===============

| | Supported |
| --- | --- |
| Endstone | v0.11 |
| Bedrock Dedicated Server | 1.26.x |
| Platforms | Linux (x64), Windows (x64) |

Samples
===============
Sample behaviour packs live in [samples/](samples/). They are ordinary packs — install one the way you install any other, then read the source to see what it does.

Troubleshooting
===============
Known issues and guidelines for filing a good report are documented in [TROUBLESHOOTING](TROUBLESHOOTING.md).

Contributing
===============
The scripting-nodejs codebase is not open-source, so there is no pull request to send. What helps most is everything else: a clear bug report, a feature request that explains the problem behind it, a sample pack that shows a pattern working, or a correction to these docs. Issues, samples and documentation fixes in this repository are all welcome, and they are what the roadmap is built from.

If you would rather contribute code, [Endstone](https://github.com/EndstoneMC/endstone) itself — the server software this plugin is built on — is open-source and takes pull requests.

Feedback
===============
* File a bug or a feature request in [GitHub Issues](https://github.com/EndstoneMC/scripting-nodejs-release/issues/new/choose)
* Ask a question or share what you have built in [Discussions](https://github.com/EndstoneMC/scripting-nodejs-release/discussions)
* Chat with us on [Discord](https://discord.gg/xxgPuc2XN9)

# License
The documentation and samples in this repository are licensed under [Apache-2.0](LICENSE). The plugin itself is distributed under the licence bundled with each release.
