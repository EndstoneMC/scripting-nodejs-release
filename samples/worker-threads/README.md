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

That last sentence is the sample. Half a second of computation happened, and the server ticked straight through it — on the stock engine the same work would have been half a second of frozen server, because QuickJS has one thread and it is the one running the game.

Both numbers are configurable: `/scriptevent maze:build 51 20000` builds a 51×51 maze from twenty thousand candidates.

## Running it

1. Copy the `worker-threads` folder into your world's `behavior_packs/` folder.
2. Add it to the world's `world_behavior_packs.json`, or enable it from the world settings screen.
3. Restart the server, join, stand somewhere with room, and run `/scriptevent maze:build`.

The pack must be an unzipped folder rather than a `.mcpack` — a worker is started from a real file on disk, and a file inside a zip is not one.

## What to look at

**The worker never touches the world.** [`scripts/maze.js`](scripts/maze.js) imports nothing from `@minecraft/server`, and could not use it if it tried: the Script API belongs to the server thread. That constraint is what makes a job suitable for a worker — it has to be work you can express as data in and data out.

**Finding the worker file.** `import.meta.dirname` is undefined for a pack module, so [`scripts/main.js`](scripts/main.js) locates its worker with `import.meta.resolve("./maze.js")`, which answers the absolute URL `Worker` wants.

**The result is transferred, not copied.** `postMessage` passes the grid's `ArrayBuffer` in the transfer list, so ownership moves to the server thread and nothing is duplicated. For a 101×101 maze that is 10 KB that never gets cloned; for a real workload it can be megabytes.

**A worker's message is not a tick.** It arrives on a libuv callback, so the handler only pushes the result onto an array. Everything that touches the world happens from the `system.runInterval` below it, which is inside a tick and allowed to.

**Building is a job, not a loop.** Placing four hundred wall blocks in one tick is its own stall, so the build is a generator handed to `system.runJob`. Each `yield` gives the tick back and lets BDS decide how much to run next time.

**Seeded randomness.** The worker takes a seed and uses its own small generator, so the same request produces the same maze — worth having when someone reports that one came out wrong.

## The cost of a worker

A worker is a whole Node environment: its own isolate, its own event loop, its own module graph. Starting one measured **35–42 ms** here, and that is paid before your code runs at all.

So a worker is worth it for work measured in hundreds of milliseconds, and not worth it for work measured in single milliseconds. If you have a stream of small jobs, start a pool of workers once at load and post messages to them, rather than starting one per job.

Measured with Node.js v24.18.0: ten thousand 31×31 candidates take about 480 ms of computation, plus about 40 ms of start-up. Your figures will differ; the shape will not.

## Where to take it

Anything you can express as data in and data out belongs here: custom world generation, pathfinding for a mob AI, scanning a region you have already read into an array, compressing or encrypting a backup, parsing a large file. What does not belong is anything that needs the world — read it on the tick first, hand the worker plain numbers, and apply the answer on the tick afterwards.
