# Troubleshooting

Start with the symptom. Every message the plugin prints is in the [message reference](#message-reference) at the end, with what it means and what to do.

- [Scripts still run on the built-in engine](#scripts-still-run-on-the-built-in-engine)
- [A pack stopped loading after an update](#a-pack-stopped-loading-after-an-update)
- [npm packages](#npm-packages)
- [Errors from a pack's scripts](#errors-from-a-packs-scripts)
- [The server stalls or freezes](#the-server-stalls-or-freezes)
- [`/reload` is refused](#reload-is-refused)
- [Lines you can ignore](#lines-you-can-ignore)
- [Message reference](#message-reference)
- [Filing an issue](#filing-an-issue)

The quickest way to know which engine is running your packs is the [engine-check sample](samples/engine-check/), which logs one line saying so.

## Scripts still run on the built-in engine

Read the start-up log from the top, looking for lines starting `[Scripting]`.

**No `Loading scripting_nodejs` line at all.** Endstone did not find the plugin. Check that `plugins/endstone_scripting_nodejs.so` (`.dll` on Windows) is directly inside your server's `plugins/` folder — not in `plugins/plugins/`, and not in a folder named after the archive, which is where Windows' *Extract All* puts it by default. If Endstone printed

```
Error occurred when trying to load plugin 'scripting_nodejs': plugin was compiled for Endstone API version: 0.11, but the server has an incompatible API version: 0.12.
```

your Endstone is newer than this release supports; see the [compatibility table](README.md#compatibility).

**`Loading scripting_nodejs`, then an error.** The error names the problem; find it in the [message reference](#message-reference). The usual ones:

- `Unable to find the runtime factory for script runtimes, falling back to QuickJS.` — your Bedrock version is not supported by this release of scripting-nodejs.
- `Could not load the Node.js runtime, scripts stay on QuickJS. There is no libruntime.so in …` — only part of the archive was unpacked.

**`Loading scripting_nodejs` and `Initializing Node.js …`, and no error.** The plugin is active, and every pack attached to the world runs on Node.js. If one still seems not to, install the engine-check sample beside it to confirm, and check the pack's own errors further down the log.

## A pack stopped loading after an update

After updating Endstone, packs that import `node:` modules or npm packages fail with errors such as

```
[Scripting] [My Pack] ReferenceError: Import [node:fs.js] not found.
[Scripting] [Seen] ReferenceError: Import [dayjs.js] not found.
```

because the server is back on the built-in engine, which has neither. (The `.js` on the end is the built-in engine's doing.) Look further up the log for `Unable to find the runtime factory for script runtimes, falling back to QuickJS.` — it means the new Endstone runs a Bedrock version this release of scripting-nodejs does not support. Go back to an Endstone version in the [compatibility table](README.md#compatibility) (`pip install endstone==0.11.14` if you installed it with pip), or update scripting-nodejs once a release lists your version.

## npm packages

**The first start after adding a package is slow, or fails offline.** The plugin installs what a pack's `package.json` lists before the pack runs, and that needs the npm registry. Give the server network access for that start, or install the packages yourself — `npm install` in the pack folder on any machine with Node.js — and ship the pack with its `node_modules/`.

**`Installing <pack>'s dependencies failed: <folder>: <reason>`.** npm could not install what that `package.json` lists. The reason is npm's own. `404 Not Found` means a package name or version does not exist; `ENOTFOUND` or `ETIMEDOUT` means no network. The pack still loads, and its imports of the missing packages fail:

```
Error: Cannot find package 'some-package' imported from …/development_behavior_packs/my-pack/scripts/main.js
```

**A package installs but fails when imported, mentioning bindings, `.node` files or `node-gyp`.** It is a native addon that needs a build step, and install scripts do not run on the server. Use a pure-JavaScript alternative; for SQLite, `node:sqlite` is built in.

**A package from a private registry will not install.** `.npmrc` is not read, so only the public npm registry is available. Install such packages yourself and ship them in `node_modules/`.

**A zipped pack (`.mcpack`) cannot find its packages.** A zip cannot hold a `node_modules/` the plugin can install into. Put the `package.json` in the folder the `.mcpack` is in.

**`Installed <pack>'s dependencies from …` appears for a pack with no `package.json`.** A `package.json` in the packs folder or the server folder serves every pack below it, so the plugin checks it for each of them. It is harmless.

## Errors from a pack's scripts

Script errors are printed the way the server always prints them, with the pack's name in brackets and a stack trace:

```
[Scripting] [My Pack] Error: something went wrong
    at development_behavior_packs/my-pack/scripts/main.js:10:38
```

The path is relative to your server folder, and the two numbers are the line and the column. Uncaught errors while a pack first loads are printed a second time by the server, as `Plugin [My Pack - 1.0.0] - [main.js] ran with error: […]`; that is the same error.

**`Could not run [main.js], a top-level await did not settle within the load.`** The pack's top level waits for something that only happens on a later tick, such as `await new Promise((resolve) => system.run(resolve))`. Nothing a later tick does can happen while the pack is still loading. Move the wait into an event handler or a `system.run` callback.

**`TypeError: Invalid URL` from `new URL(…, import.meta.url)`.** `import.meta.url` is the module's path from the server folder, not a `file:` URL. Build paths with `node:path` instead: `resolve(dirname(import.meta.url), "data.json")`.

**`ERR_IMPORT_ATTRIBUTE_MISSING` importing a `.json` file.** Node.js requires the import attribute: `import config from "./config.json" with { type: "json" };`.

**`RangeError: Maximum call stack size exceeded`.** Runaway recursion. On scripting-nodejs it raises no watchdog event and the server keeps running; the error in the log is all there is. (The built-in engine reports the same mistake as `InternalError: stack overflow`, and its watchdog shuts the server down.)

**`Error: null` from a pack that called `process.exit()`.** `process.exit()` cannot stop the server. The code that called it is abandoned with that error, and the pack keeps running.

**A warning starting `(node:<number>)`, with no timestamp.** Node.js printed it directly. The most common is `[MODULE_TYPELESS_PACKAGE_JSON]`, for a `.js` file Node.js loaded itself, such as a worker: give that file the `.mjs` extension, or add `"type": "module"` to the pack's `package.json`.

**It works on the built-in engine and not here.** Check the [sharp edges](README.md#sharp-edges) — `for…of` over a native collection, and a few container properties, are the usual suspects — and if it is none of those, please [report it](#filing-an-issue) with the smallest pack that shows it.

## The server stalls or freezes

**The server freezes and never recovers.** A pack's script is stuck in a loop — at its top level while it loads, in an event handler, or in a `system.run` callback. The built-in engine's watchdog would interrupt it after `script-watchdog-hang-threshold`; scripting-nodejs does not, so the server waits for it. Restart the server, and find the pack by detaching packs from the world until the freeze stops.

**The server freezes for a moment, or players see lag, while a pack works.** A pack's scripts run on the server thread, between the server's own work, so anything that blocks — a long loop, a synchronous file read, a large `DatabaseSync` query — holds the server until it finishes. Use the asynchronous APIs (`fs/promises`, `fetch`), spread work over ticks with `system.runJob`, or move it to a [worker thread](samples/worker-threads/).

**The server's memory use keeps climbing.** `script-watchdog-memory-limit` is not enforced on scripting-nodejs, so a pack that leaks memory is not stopped the way the built-in engine stops it. Find the pack by detaching packs from the world, as for a freeze.

**`/script profiler stop` says `Profiler stopped. Failed to save profile.`** Bedrock's script profiler cannot record scripts running on Node.js yet.

**`NODE_OPTIONS` is set on the machine.** Node.js reads it. Most options are harmless, but setting both `--max-semi-space-size` and `--max-old-space-size` stops the server as the first pack loads. Remove them, or unset `NODE_OPTIONS` for the server.

## `/reload` is refused

```
/reload is refused while scripting_nodejs is installed: … Restart the server instead.
```

Reloading cannot be done safely while scripts run on Node.js, so the plugin refuses it before anything happens. Restart the server instead. Plugins that call Endstone's reload from code are not covered by the refusal; avoid them while scripting-nodejs is installed.

Version 0.1.0 does not refuse `/reload`, and running it there can crash the server.

## Lines you can ignore

- `[Scripting] [pack-probe] <uuid> …` — four lines per pack at start-up, a diagnostic that will be removed.
- `[Scripting] Installed <pack>'s dependencies from …` on every start — the plugin checks each pack's npm packages each time, and says "Installed" even when everything was already there.

## Message reference

Lines the plugin itself prints, all prefixed `[Scripting]`.

| Message | Meaning | What to do |
| --- | --- | --- |
| `Initializing Node.js v24.18.0 (LTS) (v8: 13.6.233.17).` (versions vary by release) | The plugin is starting Node.js. With no error after it, scripts run on Node.js. | Nothing. |
| `Unable to find the runtime factory for script runtimes, falling back to QuickJS.` | This release of scripting-nodejs does not support your Bedrock version, so scripts run on the built-in engine. | Use an Endstone version in the [compatibility table](README.md#compatibility), or update scripting-nodejs. |
| `Unable to hook the runtime factory for script runtimes, falling back to QuickJS.` | The plugin could not start on a Bedrock version it supports. Scripts run on the built-in engine. | [Report it](#filing-an-issue) with the start-up log. |
| `Could not initialise Node.js, falling back to QuickJS.` followed by more lines | Node.js refused to start; the lines after it say why. Often a bad `NODE_OPTIONS` value. | Fix or unset `NODE_OPTIONS`; otherwise report it with those lines. |
| `Could not load the Node.js runtime, scripts stay on QuickJS. There is no libruntime.so in <folder>; unpack the whole release archive over the server root, not just the plugin.` | Only the plugin file was copied, not the `scripting_nodejs/` folder beside it. (`runtime.dll` on Windows.) | Unzip the whole archive into the server folder. |
| `Could not load the Node.js runtime, scripts stay on QuickJS. libruntime.so is there, but the loader refused it: <reason>` | The runtime is present but could not be loaded; the reason is the operating system's. | `cannot open shared object file` naming a library: unzip the whole archive again, so every file in `scripting_nodejs/` is from the same release. Release 0.1.0 on Linux needs the LLVM C++ runtime (`libc++.so.1`) installed on the machine; later releases carry their own. Anything else: report it. |
| `Could not load the Node.js runtime, scripts stay on QuickJS. libruntime.so exports no scripting_nodejs_load.` | The plugin file and the `scripting_nodejs/` folder come from different releases. | Unzip the whole archive of one release again. |
| `/reload is refused while scripting_nodejs is installed: …` | See [`/reload` is refused](#reload-is-refused). | Restart the server instead. |
| `<pack> declares dependencies, but npm was not installed beside the server; skipping.` | The npm that ships with the plugin, in `plugins/scripting_nodejs/node_modules/npm`, is missing. | Unzip the whole archive again. |
| `Installing <pack>'s dependencies failed: <folder>: <reason>` | npm could not install that folder's `package.json`. | See [npm packages](#npm-packages). |
| `Installed <pack>'s dependencies from <folders>.` | The npm packages those folders list are in place. | Nothing. |
| `Could not run [<script>], a top-level await did not settle within the load. …` | See [errors](#errors-from-a-packs-scripts). | Move the wait out of the pack's top level. |
| `Could not run [<script>], execution was terminated.` | The pack was stopped while it loaded. | [Report it](#filing-an-issue) with the pack. |
| `Could not run [<script>], the loader failed without an exception.` | The pack failed to load with no error to show. | [Report it](#filing-an-issue) with the pack. |
| `Native type conversion has no branch for the pointer-like type [<type>]; it will not marshal as what it points to.` | A Script API value of that type cannot reach scripts yet, and reads as `undefined`. | [Report it](#filing-an-issue) with the line; it names exactly what is missing. |

## Filing an issue

Search the [existing issues](https://github.com/EndstoneMC/scripting-nodejs-release/issues) first; someone may have reported it already. Then [open a bug report](https://github.com/EndstoneMC/scripting-nodejs-release/issues/new/choose) — the form asks for everything below.

- **Versions.** `version scripting_nodejs` and `version` in the server console, and your operating system.
- **The start-up log**, from the first line to `Server started.`, and the lines around the failure.
- **Whether it happens without the plugin.** Move `plugins/endstone_scripting_nodejs.so` (`.dll` on Windows) out of the folder, restart, and try again. Tell us either way: "same on both engines" is as useful as "only with the plugin".
- **The smallest pack that shows it.**

If the server crashed, say so in the title and attach the newest file in `crash_reports/`.
