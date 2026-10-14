# Engine check

Says which JavaScript engine runs your server's behaviour pack scripts. Install it first: it is the quickest way to confirm scripting-nodejs is active, and it works on both engines.

On start-up it logs one line:

```
[Scripting] engine-check: scripts run on Node.js 24.18.0 (V8 13.6.233.17-node.50)
```

or, when the plugin is not active:

```
[Scripting] engine-check: scripts run on Bedrock's built-in engine (QuickJS) - scripting-nodejs is not active
```

Run `/scriptevent engine:check` in game to get the same answer as a chat message, or from the server console to get it in the log.

## Running it

1. Install the pack as described in the [samples README](../README.md#trying-a-sample).
2. Restart the server and look for the `engine-check:` line.

If it says the built-in engine, see [TROUBLESHOOTING](../../TROUBLESHOOTING.md#scripts-still-run-on-the-built-in-engine).

## What to look at

**One pack, both engines.** [`scripts/main.js`](scripts/main.js) imports nothing from Node.js. It reads `globalThis.process`, which exists only on Node.js, so the same file loads everywhere and reports what it found. A pack that wants to run on a stock server as well as on scripting-nodejs can use the same test to decide whether to reach for Node.js features — with `await import("node:fs")` inside the check rather than a static `import` at the top, which would stop the pack loading on the built-in engine.
