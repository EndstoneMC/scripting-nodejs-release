# scripting-nodejs

**Run existing Script API addons, with the full Node.js ecosystem.**

This repository is for providing feedback, documentation and samples for the **scripting-nodejs** plugin for [Endstone](https://github.com/EndstoneMC/endstone). You can use it to report issues, submit feature requests and share what you have built. The scripting-nodejs codebase is not open-source, but contributions are welcome here in the form of issues, feature requests, samples and feedback — every report is read and shapes what gets built next.

scripting-nodejs replaces the Bedrock Dedicated Server's built-in QuickJS script engine with a real [Node.js](https://nodejs.org) runtime, so the behaviour packs you already run keep their `@minecraft/*` imports and gain the whole npm ecosystem behind them.

> [!WARNING]
> The plugin is not ready for production servers, and there are no releases to download yet. Watch this repository for the first release.

## Quick Start

1. Install [Endstone](https://endstone.dev/) v0.11 or newer and start your server once so the folder layout exists.
2. Download the release archive for your platform from [Releases](https://github.com/EndstoneMC/scripting-nodejs-release/releases).
3. Unzip it over your server root. The archive is rooted there already, so everything lands in `plugins/`: the plugin itself, and a `scripting_nodejs/` folder beside it holding the runtime and npm.
4. Restart the server.

There is nothing to configure, and your behaviour packs stay exactly as they are.

## Features

* Behaviour-pack scripts run on Node.js, with the same addons and the same `@minecraft/*` imports
* `import` and `import()` of `node:` builtins, npm packages and files on disk
* Worker threads, so heavy work never costs you tick time
* Full ICU, for correct internationalisation out of the box
* npm packages install themselves — declare them in a `package.json` and the plugin installs them when the pack loads, with no Node or npm needed on the server
* Per-pack dependencies — a pack has its own `node_modules`, and two packs can depend on different versions of the same package
* `console.log`, `.info`, `.debug`, `.warn` and `.error` reach the server log, formatted the way Node formats them
* Promises and `await` resolve, because the server pumps the event loop every tick
* Errors keep their class, their message and a pack-relative stack
* Your script-watchdog settings still apply: a pack that stops returning is cut off at the hang threshold, and one that allocates without limit is stopped rather than taking the process down
* Script timings and memory figures come off the real engine instead of reading zero

See the [changelog](CHANGELOG.md) for the latest release.

## Using an npm package

Declare what you need in a `package.json` and import it. The plugin installs the dependencies when the pack loads, using the npm that ships inside it — nothing has to be installed on the server, and there is no build step for you to run.

### Where the package.json goes

Three places, each with a different reach. All three are installed, and Node resolves through them in the same order:

| Location | Available to |
| --- | --- |
| `behavior_packs/mypack/package.json` | that pack alone |
| `behavior_packs/package.json` | every pack in that folder |
| `package.json` in the server root | every pack on the server |

Innermost wins. A pack that declares its own copy of a package gets that copy, whatever the folder above it asks for, so two packs can depend on different versions of one and neither has to care.

A pack's `package.json` sits beside its `manifest.json`, and needs nothing but the dependencies:

```json
{
    "dependencies": {
        "discord.js": "^14.27.0"
    }
}
```

Then import it the way you would anywhere else:

```js
import { Client } from "discord.js";
```

The [discord sample](samples/discord/) is a working pack built this way.

### What happens on start-up

When a pack that declares dependencies loads, the plugin runs npm's own installer over each of the three locations that has a `package.json`, **before** the pack's scripts run, and waits for it to finish. So the first start after you add a dependency takes as long as the install does and needs a working network connection; later starts have nothing to do and cost nothing.

The server log says what happened:

```
Installed behavior_packs/mypack's dependencies from behavior_packs/mypack, behavior_packs.
```

If an install fails, the failing location and npm's own error are logged, the server carries on, and the pack's imports fail where they are written — so a network outage at start-up costs you that pack, not the server.

### What it does not do

**Lifecycle scripts do not run.** Installs are performed with `ignoreScripts`, so a package that compiles something in a `postinstall` — most native addons — will not build, and a package is not able to run code on your server merely by being depended on. Pure-JavaScript packages, which is the overwhelming majority of npm, are unaffected.

**Nothing is pruned.** A package sitting in `node_modules` that nothing depends on any more is left where it is rather than deleted.

**No audit, no funding notices.** Neither has anywhere to print on a game server.

### Installing by hand instead

You can still run `npm install` in any of those three folders yourself and ship the resulting `node_modules` with the pack. It is the same install engine either way, so the tree is the same one the plugin would have built. Worth doing for a server with no outbound network, or when you want the exact tree pinned and reviewed before it reaches production.

## Performance

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

## Compatibility

| | Supported |
| --- | --- |
| Endstone | v0.11 |
| Bedrock Dedicated Server | 1.26.x |
| Platforms | Linux (x64), Windows (x64) |

## Samples

Sample behaviour packs live in [samples/](samples/). They are ordinary packs — install one the way you install any other, then read the source to see what it does.

## Troubleshooting

Known issues and guidelines for filing a good report are documented in [TROUBLESHOOTING](TROUBLESHOOTING.md).

## Contributing

The scripting-nodejs codebase is not open-source, so there is no pull request to send. What helps most is everything else: a clear bug report, a feature request that explains the problem behind it, a sample pack that shows a pattern working, or a correction to these docs. Issues, samples and documentation fixes in this repository are all welcome, and they are what the roadmap is built from.

If you would rather contribute code, [Endstone](https://github.com/EndstoneMC/endstone) itself — the server software this plugin is built on — is open-source and takes pull requests.

## Feedback

* File a bug or a feature request in [GitHub Issues](https://github.com/EndstoneMC/scripting-nodejs-release/issues/new/choose)
* Ask a question or share what you have built in [Discussions](https://github.com/EndstoneMC/scripting-nodejs-release/discussions)
* Chat with us on [Discord](https://discord.gg/xxgPuc2XN9)

## License

The documentation and samples in this repository are licensed under [Apache-2.0](LICENSE). The plugin itself is distributed under the licence bundled with each release.
