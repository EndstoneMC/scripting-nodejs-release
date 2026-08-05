# Troubleshooting

## Filing an issue

Before filing, please search the [existing issues](https://github.com/EndstoneMC/scripting-nodejs-release/issues) — someone may already have reported it.

A report we can act on has all of this:

- The scripting-nodejs version, the Endstone version, the BDS version and your operating system.
- The smallest behaviour pack that shows the problem. A pack that reproduces it in ten lines is worth more than a description of a pack that reproduces it in a thousand.
- What you expected to happen, and what happened instead.
- The server log covering the start-up and the failure. Scripting errors are logged with their stack, and the stack is usually the answer.

If the server crashed, say so explicitly and attach anything in `crash_reports/`.

## Before you report

**Check that the plugin actually loaded.** The server log names it at start-up. If it is not there, the plugin file or the `scripting_nodejs/` folder beside it is missing or in the wrong place.

**Check whether the same thing happens without the plugin.** Move the plugin out of `plugins/` and restart, so the server falls back to its own engine. If the behaviour is identical, the problem is in the pack or in BDS rather than here — but tell us either way, since "same on both engines" is useful information.

**Check that the pack works on a stock server first.** A pack that BDS itself refuses will not run here either.

## Known issues

- **No debugger and no profiler.** Attaching a JavaScript debugger to a running pack, setting a breakpoint, stepping, or taking a CPU profile are all unsupported. Debugging is `console.log` and stack traces.
- **A stack overflow raises no watchdog event.** Runaway recursion is stopped by the engine and reaches the log as a `RangeError`, so there is nothing for an operator to see beyond the error itself.
- **A Bedrock update can drop the server back to its own engine.** The plugin finds where to install itself by byte pattern, and a BDS update breaks that. The log carries one error line at start-up and your packs run on the built-in engine until a new build ships — so check the log after updating BDS.
- **Container properties handed back by reference do not work in either direction.** Reading one gives `undefined` and writing one is a silent no-op that reports success. Containers returned from a *method* are unaffected.
- **A native class the built-in engine makes `for…of`-iterable is not iterable here** — iterating one throws.
- **Stack frames from npm packages carry absolute paths.** Your pack's own frames are pack-relative, but a package that Node resolved for itself keeps the full path it was found at. If your pack shows a caught error to a player, that path can reach the client.
- **A pack whose declared module dependency is unsatisfied still loads**, where a stock server would refuse it.
- **A few binding paths answer `undefined`** instead of the value a stock server returns. If an API returns nothing where you expect an object, that is worth an issue.
- **Some native types cross as a log line rather than a value.** The line names the type it could not carry; please include it in your report.
- **Windows has had far less real-server time than Linux.** Windows reports are especially useful.
