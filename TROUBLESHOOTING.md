# Troubleshooting

Start with the symptom. Every message the plugin prints is in the [message reference](#message-reference) at the end, with what it means and what to do.

- [Scripts still run on the built-in engine](#scripts-still-run-on-the-built-in-engine)
- [A pack stopped loading after an update](#a-pack-stopped-loading-after-an-update)
- [npm packages](#npm-packages)
- [Errors from a pack's scripts](#errors-from-a-packs-scripts)
- [The server stalls or freezes](#the-server-stalls-or-freezes)
- [Message reference](#message-reference)
- [Filing an issue](#filing-an-issue)

The quickest way to know which engine is running your packs is the [engine-check sample](samples/engine-check/), which logs one line saying so.

## Scripts still run on the built-in engine

Run `/nodejs` in the console: it says whether scripts run on Node.js (`Node.js: not active` means they run on the built-in engine). Or read the start-up log from the top, looking for lines starting `[Scripting] [Node.js]`.

**No `Loading scripting_nodejs` line at all.** Endstone did not find the plugin. Check that `plugins/endstone_scripting_nodejs.so` (`.dll` on Windows) is directly inside your server's `plugins/` folder — not in `plugins/plugins/`, and not in a folder named after the archive, which is where Windows' *Extract All* puts it by default. If Endstone printed

```
Error occurred when trying to load plugin 'scripting_nodejs': plugin was compiled for Endstone API version: 0.11, but the server has an incompatible API version: 0.12.
```

your Endstone is newer than this release supports; see the [compatibility table](README.md#supported-versions).

**`Loading scripting_nodejs`, then an error.** The error names the problem; find it in the [message reference](#message-reference). The usual ones:

- `scripting-nodejs could not hook into this Bedrock server, …` — the plugin could not attach to your Bedrock build; see the [message reference](#message-reference).
- `plugins/scripting_nodejs/libruntime.so is missing, …` — only part of the archive was unpacked.

**`Scripts will run on Node.js …`, and no error.** The plugin is active, and every pack attached to the world runs on Node.js. If one still seems not to, install the engine-check sample beside it to confirm, and check the pack's own errors further down the log.

## A pack stopped loading after an update

After updating Endstone, packs that import `node:` modules or npm packages fail with errors such as

```
[Scripting] [My Pack] ReferenceError: Import [node:fs.js] not found.
[Scripting] [Seen] ReferenceError: Import [dayjs.js] not found.
```

because the server is back on the built-in engine, which has neither. (The `.js` on the end is the built-in engine's doing.) Look further up the log for `scripting-nodejs could not hook into this Bedrock server` — it means the plugin could not attach to the Bedrock version the new Endstone runs. Go back to an Endstone version in the [compatibility table](README.md#supported-versions) (`pip install endstone==0.11.14` if you installed it with pip), or report it.

## npm packages

**The first start after adding a package is slow, or fails offline.** The plugin installs what a pack's `package.json` lists before the pack runs, and that needs the npm registry. Give the server network access for that start, or install the packages yourself — `npm install` in the pack folder on any machine with Node.js — and ship the pack with its `node_modules/`.

**`Could not install npm packages from <folder>/package.json: <reason>. The pack will load without them, so importing them will fail. …`** npm could not install what that `package.json` lists. The reason is npm's own. `404 Not Found` means a package name or version does not exist; `ENOTFOUND` or `ETIMEDOUT` means no network. The pack still loads, and its imports of the missing packages fail:

```
Error: Cannot find package 'some-package' imported from development_behavior_packs/my-pack/scripts/main.js. Is it listed in the pack's package.json?
```

**`… (timed out after 60 s)`.** The install did not finish in 60 seconds and was abandoned, so an offline server still starts. Give the server network access, or install the packages yourself.

**A package installs but fails when imported, mentioning bindings, `.node` files or `node-gyp`.** It is a native addon that needs a build step, and install scripts do not run on the server. Use a pure-JavaScript alternative; for SQLite, `node:sqlite` is built in.

**A package from a private registry will not install.** `.npmrc` is not read, so only the public npm registry is available. Install such packages yourself and ship them in `node_modules/`.

**A zipped pack (`.mcpack`) cannot find its packages.** A zip cannot hold a `node_modules/` the plugin can install into. Put the `package.json` in the folder the `.mcpack` is in.

**`Installed npm packages for every pack on the server (3 added) in 4.2 s.`** A `package.json` in the packs folder or the server folder serves every pack below it, and is installed once per start. A folder that is already satisfied prints nothing.

**`<package> needs a native build step, which does not run on the server. …`** See the next item.

## Errors from a pack's scripts

Script errors are printed the way the server always prints them, with the pack's name in brackets and a stack trace:

```
[Scripting] [My Pack] Error: something went wrong
    at development_behavior_packs/my-pack/scripts/main.js:10:38
```

The path is relative to your server folder, and the two numbers are the line and the column. Uncaught errors while a pack first loads are printed a second time by the server, as `Plugin [My Pack - 1.0.0] - [main.js] ran with error: […]`; that is the same error.

**`TypeError: Invalid URL` from `new URL(…, import.meta.url)`.** `import.meta.url` is the module's path from the server folder, not a `file:` URL. Build paths with `node:path` instead: `resolve(dirname(import.meta.url), "data.json")`.

**`ERR_IMPORT_ATTRIBUTE_MISSING` importing a `.json` file.** Node.js requires the import attribute: `import config from "./config.json" with { type: "json" };`.

**`RangeError: Maximum call stack size exceeded`.** Runaway recursion. If nothing catches it, the watchdog reports `Stack overflow detected`, as on the built-in engine. If your code catches it, nothing is reported and the server keeps running. (The built-in engine words the error `InternalError: stack overflow`.)

**`process.exit() is not available to behaviour packs; the server keeps running.`** `process.exit()` cannot stop the server, so the call throws this error. Remove the call.

**`ReferenceError: Import [lib/missing.js] not found.`** A relative import found no file. Check the path and the extension.

**A line starting `[<pack>] Warning: [CODE] …`.** Node.js printed a warning about the pack. The most common is `[MODULE_TYPELESS_PACKAGE_JSON]`, for a `.js` file Node.js loaded itself, such as a worker: give that file the `.mjs` extension, or add `"type": "module"` to the pack's `package.json`.

**It works on the built-in engine and not here.** Check the [known limitations](README.md#known-limitations), and if it is not one of those, please [report it](#filing-an-issue) with the smallest pack that shows it.

## The server stalls or freezes

**The server stops after a `[Watchdog] … ms hang detected` line.** A pack's script ran past `script-watchdog-hang-threshold` — in a loop at its top level, in an event handler, in a `system.run` callback or in a timer — and was interrupted with `InternalError: interrupted`. As on the built-in engine, the server then shuts down unless `script-watchdog-enable-shutdown` is off. The line names the pack; fix its loop. A worker thread is not watched, so a loop there is not interrupted.

**The server freezes for a moment, or players see lag, while a pack works.** A pack's scripts run on the server thread, between the server's own work, so anything that blocks — a long loop, a synchronous file read, a large `DatabaseSync` query — holds the server until it finishes. Use the asynchronous APIs (`fs/promises`, `fetch`), spread work over ticks with `system.runJob`, or move it to a [worker thread](samples/worker-threads/).

**The server stops after a high-memory or out-of-memory watchdog line.** A pack went past `script-watchdog-memory-limit`. The limit applies to each pack's JavaScript heap; the server's script memory figures show the heap. Memory a pack holds outside that heap, such as large buffers, is not counted, so also watch the server's overall memory use.

**`/script profiler stop` says `Profiler stopped. Failed to save profile.`** Bedrock's script profiler cannot record scripts running on Node.js.

**`NODE_OPTIONS` is set on the machine.** Node.js reads it. Most options are harmless, but setting both `--max-semi-space-size` and `--max-old-space-size` stops the server as the first pack loads. Remove them, or unset `NODE_OPTIONS` for the server.

## Message reference

Lines the plugin itself prints, all prefixed `[Scripting] [Node.js]`. `libruntime.so` is `runtime.dll` on Windows.

| Message | Meaning | What to do |
| --- | --- | --- |
| `Scripts will run on Node.js v24.18.0 (V8 13.6). scripting-nodejs 0.2.0.` (versions vary by release) | The plugin started Node.js. With no error after it, scripts run on Node.js. | Nothing. |
| `scripting-nodejs could not hook into this Bedrock server, so scripts will run on Bedrock's built-in engine. Please report this with your start-up log: …` | The plugin could not attach to this Bedrock build, so scripts run on the built-in engine. Builds other than 1.26.5x are tried best effort. | [Report it](#filing-an-issue) with the start-up log. |
| `Node.js failed to start, so scripts will run on Bedrock's built-in engine. Please report this with the lines below: …` followed by more lines | Node.js refused to start; the lines after it say why. Often a bad `NODE_OPTIONS` value. | Fix or unset `NODE_OPTIONS`; otherwise report it with those lines. |
| `plugins/scripting_nodejs/libruntime.so is missing, so scripts will run on Bedrock's built-in engine. Unpack the whole release archive over the server folder, not just the plugin.` | Only the plugin file was copied, not the `scripting_nodejs/` folder beside it. | Unzip the whole archive into the server folder. |
| `plugins/scripting_nodejs/libruntime.so could not be loaded, so scripts will run on Bedrock's built-in engine. Unpack the whole release archive over the server folder again; if this comes back, report it with this line at …. The loader said: <reason>` | The runtime is present but the system could not load it; the reason is the operating system's. | Unzip the whole archive again, so every file in `scripting_nodejs/` is from the same release. On Linux, a `GLIBC_2.xx not found` reason means the distribution is older than Ubuntu 22.04 or Debian 12. Anything else: report it. |
| `plugins/scripting_nodejs/ is from a different scripting-nodejs version than the plugin, so scripts will run on Bedrock's built-in engine. Unpack the whole release archive over the server folder again.` | The plugin file and the `scripting_nodejs/` folder come from different releases. | Unzip the whole archive of one release again. |
| `Could not install npm packages from <folder>/package.json: <reason>. …` or `<pack>: could not install …` | npm could not install that folder's `package.json`, or took more than 60 seconds. | See [npm packages](#npm-packages). |
| `Installed npm packages (2 added, 1 changed) in 3.4 s.` | The packages that folder lists are in place. | Nothing. |
| `<package> needs a native build step, which does not run on the server. It will probably fail to load; look for a pure-JavaScript alternative.` | A package needs to compile native code. | Use a pure-JavaScript alternative. |
| `<pack> lists npm packages, but plugins/scripting_nodejs/node_modules/npm is missing. Reinstall scripting-nodejs from the release archive.` | The npm that ships with the plugin is missing. | Unzip the whole archive again. |
| `Could not run [<script>], the loader failed without an exception.` | The pack failed to load with no error to show. | [Report it](#filing-an-issue) with the pack. |
| `Native type conversion has no branch for the pointer-like type [<type>]; it will not marshal as what it points to.` | A Script API value of that type cannot reach scripts yet, and reads as `undefined`. | [Report it](#filing-an-issue) with the line; it names exactly what is missing. |

## Filing an issue

Search the [existing issues](https://github.com/EndstoneMC/scripting-nodejs-release/issues) first; someone may have reported it already. Then [open a bug report](https://github.com/EndstoneMC/scripting-nodejs-release/issues/new/choose) — the form asks for everything below.

- **Versions.** `version scripting_nodejs`, `version` and `/nodejs` in the server console, and your operating system.
- **The start-up log**, from the first line to `Server started.`, and the lines around the failure.
- **Whether it happens without the plugin.** Move `plugins/endstone_scripting_nodejs.so` (`.dll` on Windows) out of the folder, restart, and try again. Tell us either way: "same on both engines" is as useful as "only with the plugin".
- **The smallest pack that shows it.**

If the server crashed, say so in the title and attach the newest file in `crash_reports/`.
