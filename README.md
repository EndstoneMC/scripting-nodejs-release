# scripting-nodejs

> Run Bedrock Script API packs on Node.js.

[![Release](https://img.shields.io/github/v/release/EndstoneMC/scripting-nodejs-release)](https://github.com/EndstoneMC/scripting-nodejs-release/releases/latest)
[![Discord](https://img.shields.io/discord/1230982180742631457?logo=discord&logoColor=white&color=5865F2)](https://discord.gg/xxgPuc2XN9)

An [Endstone](https://github.com/EndstoneMC/endstone) plugin that replaces Bedrock Dedicated Server's built-in
script engine with [Node.js](https://nodejs.org). The behaviour packs you already run keep their
`@minecraft/server` imports, events and API, and gain npm packages, files, networking and worker threads.
Plain JavaScript runs about 50 times faster.

This repository holds the releases, documentation and samples, and is where to report problems. The plugin
itself is closed source.

## Supported Versions

| scripting-nodejs | Bedrock Dedicated Server | Endstone        | Platforms              |
| ---------------- | ------------------------ | --------------- | ---------------------- |
| [0.2.0](https://github.com/EndstoneMC/scripting-nodejs-release/releases/tag/v0.2.0) | 1.26.5x | 0.11.11-0.11.14 | Linux x64, Windows x64 |
| [0.1.0](https://github.com/EndstoneMC/scripting-nodejs-release/releases/tag/v0.1.0) | 1.26.3x-1.26.4x | 0.11.5-0.11.10 | Linux x64, Windows x64 |

Tested on 1.26.51 and 1.26.52. Linux means glibc 2.35 or newer: Ubuntu 22.04+ or Debian 12+.

Other Bedrock versions are tried on a best-effort basis. If the plugin cannot attach, it logs
`scripting-nodejs could not hook into this Bedrock server, so scripts will run on Bedrock's built-in engine.`
and your packs run on the built-in engine. Check this table before you update Endstone.

## Quick Start

1. Stop the server.
2. Download the archive for your platform from the
   [latest release](https://github.com/EndstoneMC/scripting-nodejs-release/releases/latest).
3. Unzip it into your server folder, the one with `server.properties` and `plugins/`. The archive already
   contains `plugins/`, so it merges into yours.
4. Start the server. The log shows:

    ```
    [scripting-nodejs] Scripts will run on Node.js v24.18.0 (V8 13.6). scripting-nodejs 0.2.0.
    ```

There is nothing to configure. `/nodejs` prints the plugin and Node.js versions, or `(Node.js: not active)` when
scripts run on the built-in engine. If something looks wrong, see [TROUBLESHOOTING](TROUBLESHOOTING.md).

## npm Packages

Put a `package.json` beside your pack's `manifest.json` and import what it lists:

```json
{
    "dependencies": {
        "dayjs": "^1.11.13"
    }
}
```

```js
import dayjs from "dayjs";
```

The plugin installs the dependencies when the pack loads, with the npm it ships, so the server needs nothing else
installed. A `package.json` in the packs folder or the server folder serves every pack below it. Packages that
need a native build step, such as `better-sqlite3` or `sharp`, do not work; `node:sqlite` is built in.

## What Changes for a Pack

Nothing you have to do: packs run unchanged. What they can now do:

- Import `node:fs`, `node:http`, `node:crypto`, `node:worker_threads`, `node:sqlite` and the other Node.js
  built-ins, and npm packages.
- Use `fetch`, `WebSocket`, `setTimeout`, `Buffer`, `process` and the rest of Node.js's globals.
- `console.log` formats values the way Node.js does, and stack traces carry line and column numbers.

The script watchdog, `/script profiler` and `/reload` work as they do on the built-in engine.

## Known Limitations

- A pack can do anything the server's user can: read and write files, connect anywhere, start programs.
  Install packs only from people you trust.
- Script code shares the server tick, so code that blocks holds the server while it runs. Use the asynchronous
  APIs or a worker thread for heavy work.
- No script debugger yet: Mojang's VS Code debugger cannot attach to packs running on Node.js.
- `process.exit()` throws an error the pack can catch; it does not stop the server.

## Samples

[samples/](samples/) has complete behaviour packs, each showing one thing Node.js makes possible: an engine
check, an npm package behind a `/seen` command, files, an HTTP status endpoint, worker threads, SQLite, a Discord
relay, and [benchmarks](samples/benchmarks/) comparing the two engines.

## Documentation

- [Scripting with Node.js](https://endstone.dev/docs/scripting-nodejs) in the Endstone documentation:
  installation, npm packages, what differs from the built-in engine, and performance.
- [TROUBLESHOOTING](TROUBLESHOOTING.md): every message the plugin prints and what to do about it.
- [CHANGELOG](CHANGELOG.md): what changed in each release.
- [SUPPORT](SUPPORT.md): where to ask and what to include. Report bugs in
  [Issues](https://github.com/EndstoneMC/scripting-nodejs-release/issues/new/choose).

## License

The documentation and samples in this repository are licensed under [Apache-2.0](LICENSE). The plugin is
distributed as a binary on the [Releases](https://github.com/EndstoneMC/scripting-nodejs-release/releases) page.
