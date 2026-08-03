# Filesystem

Reads and writes a file on disk from a behaviour pack, using `node:fs`.

The pack keeps a visit count per player in `data/visits.json`, next to your server executable. Join once and it greets you; leave, rejoin, and it knows which visit this is. Stop and restart the server and it still knows, because the count is on disk rather than in memory.

On the stock engine none of this compiles: BDS's QuickJS sandbox has no `node:fs`, no `node:path`, and no way to reach the disk at all.

## Running it

1. Copy the `filesystem` folder into your world's `behavior_packs/` folder.
2. Add it to the world's `world_behavior_packs.json`, or enable it from the world settings screen.
3. Restart the server and join.

## What to look at

**Read once, at load.** [`scripts/main.js`](scripts/main.js) reads the JSON file with `readFileSync` while the module is loading, then serves every join from memory. A behaviour pack shares the server's tick, so a synchronous read is fine once at start-up and a bad idea on every join.

**Write off the tick path.** The join handler sends its message first and then writes with `fs/promises`, without awaiting. The player never waits on the disk, and a failed write costs a log line rather than a join.

**A missing file is not an error.** The first run has nothing to read, so `ENOENT` starts an empty record. Anything else is logged, because a file that exists but will not parse is worth knowing about.

## Where to take it

The same two lines that open a file open a socket or a database connection. Swapping `writeFile` for an HTTP call to your own service, or for a `better-sqlite3` insert, is the same shape of code — a fast in-memory read on the tick, and the slow part deferred.
