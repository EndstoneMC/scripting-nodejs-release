# scripting-nodejs

**Your Script API addons, running on Node.js.**

scripting-nodejs is a plugin for [Endstone](https://github.com/EndstoneMC/endstone) that replaces the Bedrock Dedicated Server's built-in script engine with [Node.js](https://nodejs.org). The behaviour packs you already run keep working exactly as they are — same `@minecraft/server` imports, same events, same API — and every pack gains what Node.js has: npm packages, files, the network, worker threads, and a compiler that runs plain JavaScript many times faster.

This repository is where you download it, read about it, report problems and share what you build. The plugin itself is closed source; the documentation and samples here are open.

> [!NOTE]
> **scripting-nodejs is a pre-release.** It runs behaviour packs on Linux and Windows servers, and a handful of things are not finished yet — they are listed under [sharp edges](#sharp-edges). Try it on a test server before your live one.

## Why

- **npm.** List a package in a `package.json` beside your pack's `manifest.json` and import it. The plugin installs it when the pack loads; the server needs nothing else installed.
- **The rest of the world.** Read and write files, open a database, call a web API, run an HTTP endpoint, keep a WebSocket open to Discord — all from inside a behaviour pack.
- **Speed.** Plain JavaScript runs 6 to 550 times faster than on the built-in engine in our benchmarks — about 50 times on average — and worker threads take heavy work off the server thread entirely. See [Performance](#performance).
- **Nothing to rewrite.** Packs need no changes, and there is nothing to configure.

## Install

You need an Endstone server whose version is in the [compatibility table](#compatibility). Running `version` in the server console prints it:

```
This server is running Endstone version: 0.11.14 (Minecraft: 26.52)
```

1. Stop the server.
2. Download the archive for your platform from [Releases](https://github.com/EndstoneMC/scripting-nodejs-release/releases).
3. Unzip it into your **server folder** — the one that holds `server.properties` and `plugins/`. The archive already contains the `plugins/` folder, so it merges into yours:

    ```
    bedrock_server/
    ├── server.properties
    └── plugins/
        ├── endstone_scripting_nodejs.so      (.dll on Windows)
        └── scripting_nodejs/                 the Node.js runtime and npm
    ```

    On Windows, *Extract All* suggests a new folder named after the archive — change it to your server folder. On Linux, `unzip -o scripting-nodejs-*-linux-x64.zip -d /path/to/bedrock_server`. On a hosting panel, upload the archive to the server's top folder and unarchive it there.

4. Start the server.

There is nothing to configure.

### Check that it is active

The start-up log has one line from the plugin saying which Node.js your scripts run on:

```
[scripting-nodejs] Scripts will run on Node.js v24.18.0 (V8 13.6). scripting-nodejs 0.2.0, for Bedrock 1.26.51.1 and 1.26.52.3.
```

Run `/nodejs` in the console, or in game as an operator, for the same answer with each pack's memory use and the watchdog settings.

For a definite answer, install the [engine-check sample](samples/engine-check/). It logs which engine runs your packs' scripts:

```
[Scripting] engine-check: scripts run on Node.js 24.18.0 (V8 13.6.233.17-node.50)
```

If either says otherwise, [TROUBLESHOOTING](TROUBLESHOOTING.md) has every message the plugin prints and what to do about it.

## Compatibility

Each release of scripting-nodejs supports specific versions of the Bedrock Dedicated Server, and each Endstone release runs one version of it. Pick the row for your Endstone.

| scripting-nodejs | Bedrock Dedicated Server | Endstone | Platforms |
| --- | --- | --- | --- |
| [0.2.0](https://github.com/EndstoneMC/scripting-nodejs-release/releases/tag/v0.2.0) | 1.26.51, 1.26.52 | 0.11.11 – 0.11.14 | Linux x64, Windows x64 |
| [0.1.0](https://github.com/EndstoneMC/scripting-nodejs-release/releases/tag/v0.1.0) | 1.26.3x – 1.26.4x | 0.11.5 – 0.11.10 | Linux x64¹, Windows x64 |

¹ 0.1.0 on Linux loads only where the LLVM C++ runtime (`libc++.so.1`) is installed; 0.2.0 carries its own.

Linux means Ubuntu 22.04 or newer and Debian 12 or newer (glibc 2.35 or newer). Older distributions that run Endstone, such as Ubuntu 20.04 and Debian 11, do not run this plugin. On macOS and ARM machines Endstone runs under Docker emulation, which scripting-nodejs has not been tested under.

**Before you update Endstone**, check that the version you are moving to is in the table. On a Bedrock version the plugin does not support, it logs one error at start-up naming the supported versions, and your packs run on the built-in engine — so packs that use Node.js features stop loading until a scripting-nodejs release supports it. If you install Endstone with pip, you can stay on a version with `pip install endstone==0.11.14`.

## What changes for a pack

**Nothing you have to do.** A pack that runs on a stock Bedrock server runs here unchanged: same `manifest.json`, same `@minecraft/*` modules and versions, same events and errors.

**What a pack can now do:**

- `import` from `node:fs`, `node:http`, `node:crypto`, `node:worker_threads`, `node:sqlite` and every other Node.js built-in, statically or with `import()`.
- Import npm packages, installed for it from a `package.json` — see [npm packages](#npm-packages).
- Use the globals Node.js has: `fetch`, `WebSocket`, `setTimeout`, `setInterval`, `structuredClone`, `TextEncoder`, `URL`, `process`, `Buffer`.
- Import its own `.mjs` files, and `.json` files with `import config from "./config.json" with { type: "json" }`.

**What reads differently:**

- `console.log` formats values the way Node.js does — `{ a: 1 }` rather than `[object Object]` — and `console.debug` exists.
- Stack traces carry line *and* column numbers and start with the pack's folder: `at development_behavior_packs/my-pack/scripts/main.js:14:9`.
- `import.meta.url` is the module's path from the server folder, such as `development_behavior_packs/my-pack/scripts/main.js`, not a `file:` URL, and `import.meta.dirname` is not set. To reach a file beside a module, use `path.resolve(path.dirname(import.meta.url), "data.json")`.
- Relative paths in `node:fs` start at the server folder, the one with `server.properties` in it.
- Pack scripts are ES modules, so `require` is not defined. `import` works for CommonJS packages too.

## Sharp edges

Stated plainly, so none of them is a surprise.

- **A pack can do anything the server can.** On a stock server a pack is sandboxed. Here it can read and write any file the server's user can, connect anywhere, and start programs. Install packs only from people you trust, and run the server as a user that owns nothing else.
- **Script code shares the server tick.** A synchronous loop, a `readFileSync` of a large file, a slow `DatabaseSync` query — anything that blocks — holds the whole server while it runs, exactly as on the built-in engine. Use the asynchronous APIs, batch your work, or move it to a [worker thread](samples/worker-threads/).
- **`process.exit()` does not stop the server.** It throws `process.exit() is not available to behaviour packs; the server keeps running.`, which the pack can catch, and nothing else stops.
- **A Bedrock update can leave the plugin behind.** See [Before you update Endstone](#compatibility).
- **No script debugger yet.** Mojang's VS Code debugger cannot attach to packs running on Node.js; debugging is `console.log` and stack traces.
- **No CPU profiler.** You cannot take a CPU profile of a pack.
- **The script watchdog applies, with a few differences.** A script that runs past `script-watchdog-hang-threshold` is interrupted and reported, a pack past `script-watchdog-memory-limit` is stopped, and an uncaught stack overflow is reported, all as on the built-in engine; by default the server then shuts down. The differences: a stack overflow your own code catches is not reported; the memory limit applies to each pack separately and counts only the pack's JavaScript heap; and worker threads are not watched.
- **A few Script API paths are not finished.** A few container properties read `undefined` and ignore writes.
- **npm packages that need a build step do not work.** Install scripts are not run, so native addons such as `better-sqlite3`, `bcrypt` or `sharp` install but fail to load. Pure-JavaScript packages — most of npm — are unaffected, and `node:sqlite` is built in.
- **An error from inside an npm package names your server's folder.** Your pack's own stack frames are relative, but frames inside `node_modules` carry the full path, so a pack that shows a caught error to a player can show them where your server lives.
- **Stack traces point at the JavaScript your pack ships.** A pack compiled from TypeScript gets frames in the compiled output, not in the `.ts` sources.
- **Windows has had less time on real servers than Linux.** In particular, 0.2.0's support for Bedrock 1.26.51 and 1.26.52 has been run on a Linux server but not yet on a Windows one. Windows reports are especially welcome.

## npm packages

Put a `package.json` beside your pack's `manifest.json`, listing what you need:

```json
{
    "dependencies": {
        "dayjs": "^1.11.13"
    }
}
```

and import it:

```js
import dayjs from "dayjs";
```

When the pack loads, the plugin installs what the `package.json` lists into the pack's own `node_modules/`, using the npm that ships inside the plugin, and the pack's scripts run once it has finished. The first start after you add a package takes as long as the download and needs network access; later starts find it installed. Each folder is installed at most once per server start, and an install that has not finished after 60 seconds is abandoned and the pack loads without it. When something was installed the log says so in one line; when npm fails it says why. The [seen sample](samples/seen/) is a complete pack built this way.

**Where a `package.json` can go.** Node.js looks for packages from the importing script upwards, so a `package.json` serves every pack below it. All three places are installed, innermost first:

| `package.json` in | Serves |
| --- | --- |
| the pack folder, beside `manifest.json` | that pack alone |
| the packs folder, such as `development_behavior_packs/` | every pack in that folder |
| the server folder | every pack on the server |

A pack that lists its own copy of a package gets that copy, so two packs can depend on different versions of one.

**Zipped packs.** A `.mcpack` cannot hold a `node_modules/` of its own. Put the `package.json` in the folder the `.mcpack` sits in instead.

**What the install does not do.** It does not run install scripts (see [sharp edges](#sharp-edges)), does not delete packages you put in `node_modules/` yourself, does not read `.npmrc` — so private registries are not supported — and prints no audit or funding notices.

**Offline servers.** Run `npm install` in the pack folder on a machine with network access and ship the pack with its `node_modules/`, or bundle the pack and its packages into one file with a bundler such as esbuild. Either way there is nothing left to download when the server starts.

## Performance

The built-in engine is an interpreter; Node.js compiles hot JavaScript to machine code. The [benchmarks sample](samples/benchmarks/) runs the same workloads on both engines on the same server, with warm-up rounds discarded and the median of repeated runs reported:

| Benchmark | Built-in engine | Node.js | |
| --- | ---: | ---: | ---: |
| integer loop, 20k iterations | 151 ops/s | 82,758 ops/s | **547×** |
| object field access, 5k objects | 404 ops/s | 86,474 ops/s | **214×** |
| float loop, 20k iterations | 139 ops/s | 15,782 ops/s | **114×** |
| recursion, `fib(18)` | 456 ops/s | 23,914 ops/s | **52×** |
| string building, 2k appends | 1,066 ops/s | 18,996 ops/s | **18×** |
| map/filter/reduce, 5k elements | 449 ops/s | 6,370 ops/s | **14×** |
| `Array.sort`, 2k elements | 452 ops/s | 2,824 ops/s | **6.2×** |
| `system.currentTick`, 1k reads | 2,034 ops/s | 3,988 ops/s | **2.0×** |
| `world.getDimension()`, 1k calls | 890 ops/s | 874 ops/s | **1.0×** |
| `BlockPermutation.resolve()`, 100 calls | 6,124 ops/s | 5,758 ops/s | **0.9×** |

The shape matters more than any one number. Code that is mostly JavaScript — loops, arithmetic, objects, strings, arrays — gains the most, because that is what a JIT compiler is for. Calls into the Script API itself (`world.getDimension()`, `BlockPermutation.resolve()`, reading `system.currentTick`) run at about the speed they do on the built-in engine, because the time goes into the game rather than into JavaScript. So a pack gains in proportion to how much of its time is its own JavaScript.

Measured on 2026-10-14 with Node.js v24.18.0 on Bedrock Dedicated Server 1.26.51.1 for Linux, on an 8-thread AMD EPYC-Milan server that was busy with other work. Four server runs per engine, alternating between them; each run discards two warm-up rounds per benchmark and measures seven rounds of 250 ms. Each figure is the median of the four per-run medians. The [benchmarks sample](samples/benchmarks/) has the ranges, the method in full, and a script to summarise your own runs — the numbers on your hardware will differ, the shape will not.

## Samples

Complete behaviour packs, each showing one thing Node.js makes possible, are in [samples/](samples/): an engine check, an npm package behind a `/seen` command, files, an HTTP status endpoint, worker threads, SQLite, a Discord relay, and the benchmarks above.

## Documentation

The [Scripting with Node.js](https://endstone.dev/docs/scripting-nodejs) section of the Endstone documentation covers installation, your first npm package, what differs from the built-in engine, performance and debugging in more depth.

## Help and feedback

- Something not working? [TROUBLESHOOTING](TROUBLESHOOTING.md) lists every message the plugin prints and what to do about each.
- Found a bug or want a feature? [Open an issue](https://github.com/EndstoneMC/scripting-nodejs-release/issues/new/choose).
- Questions, ideas and show-and-tell go in [Discussions](https://github.com/EndstoneMC/scripting-nodejs-release/discussions) or on the [Endstone Discord](https://discord.gg/xxgPuc2XN9).

See [SUPPORT](SUPPORT.md) for what to include and where to ask. Changes in each release are in the [changelog](CHANGELOG.md).

## License

The documentation and samples in this repository are licensed under [Apache-2.0](LICENSE). The scripting-nodejs plugin is closed source and distributed as a binary on the [Releases](https://github.com/EndstoneMC/scripting-nodejs-release/releases) page.
