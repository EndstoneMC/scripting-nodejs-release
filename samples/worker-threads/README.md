# Worker threads

Moves heavy computation off the server thread, using `node:worker_threads`.

Stand somewhere flat and run:

```
/scriptevent maze:build
```

The pack generates ten thousand candidate mazes on a worker thread, keeps the one with the longest solution, and builds it where you stand:

```
Searching 10000 mazes for the hardest 31×31…
Best of 10000: a 348-step path, found in 484 ms while the server ticked 10 times. Building…
```

That last sentence is the sample. Half a second of computation happened, and the server ticked straight through it — on the built-in engine the same work would have been half a second of frozen server, because scripts there have one thread and it is the one running the game.

Both numbers are configurable: `/scriptevent maze:build 51 20000` builds a 51×51 maze from twenty thousand candidates. Run the same command from the server console and the pack searches and reports without building anything, which is a quick way to check that workers start on your server.

## Running it

1. Install the pack as described in the [samples README](../README.md#trying-a-sample). It must be an unzipped folder rather than a `.mcpack`: a worker is started from a real file on disk, and a file inside a zip is not one.
2. Restart the server, join, stand somewhere with room, and run `/scriptevent maze:build`.

## What to look at

**The worker never touches the world.** [`scripts/maze.mjs`](scripts/maze.mjs) imports nothing from `@minecraft/server`, and could not use it if it tried: the Script API belongs to the server thread. That constraint is what makes a job suitable for a worker — it has to be work you can express as data in and data out.

**Finding the worker file.** `import.meta.url` is the module's path relative to the server folder — `development_behavior_packs/worker-threads/scripts/main.js` — so [`scripts/main.js`](scripts/main.js) resolves `maze.mjs` beside it with `node:path` and hands `Worker` an absolute path.

**`.mjs`, not `.js`.** A worker file is loaded by Node.js straight from disk, and Node.js treats a `.js` file as an ES module only when a `package.json` above it says `"type": "module"` — otherwise it guesses, and prints a warning to the console when it does. The `.mjs` extension settles it without a `package.json`.

**The result is transferred, not copied.** `postMessage` passes the grid's `ArrayBuffer` in the transfer list, so ownership moves to the server thread and nothing is duplicated. For a 101×101 maze that is 10 KB that never gets cloned; for a real workload it can be megabytes.

**Building is a job, not a loop.** Placing four hundred wall blocks in one tick is its own stall, so the build is a generator handed to `system.runJob`. Each `yield` gives the tick back and lets the server decide how much to run next time.

**Seeded randomness.** The worker takes a seed and uses its own small generator, so the same request produces the same maze — worth having when someone reports that one came out wrong.

## The cost of a worker

A worker is a whole JavaScript environment: its own heap, its own event loop, its own module graph. Starting one costs tens of milliseconds before your code runs at all.

So a worker is worth it for work measured in hundreds of milliseconds, and not worth it for work measured in single milliseconds. If you have a stream of small jobs, start a pool of workers once at load and post messages to them, rather than starting one per job.

## Where to take it

Anything you can express as data in and data out belongs here: custom world generation, pathfinding for a mob AI, scanning a region you have already read into an array, compressing or encrypting a backup, parsing a large file. What does not belong is anything that needs the world — read it on the tick first, hand the worker plain numbers, and apply the answer on the tick afterwards.
