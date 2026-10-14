# Filesystem

Reads and writes a file on disk from a behaviour pack, using `node:fs`.

The pack keeps a visit count per player in `pack_data/visits/visits.json`, in your server folder. Join once and it greets you; leave, rejoin, and it knows which visit this is. Restart the server and it still knows, because the count is on disk rather than in memory.

On the built-in engine none of this loads: there is no `node:fs`, no `node:path`, and no way to reach the disk at all.

## Running it

1. Install the pack as described in the [samples README](../README.md#trying-a-sample).
2. Restart the server and join.

The log confirms it found its file:

```
[Scripting] visits: 0 player(s) loaded from pack_data/visits/visits.json
```

## What to look at

**Relative paths start at the server folder.** A pack's working directory is the folder the server runs in, so `pack_data/visits` lands beside `server.properties`. Keeping the data outside the pack means a pack update never overwrites it, and a world backup tool or a panel's file manager can see it.

**Read once, at load.** [`scripts/main.js`](scripts/main.js) reads the JSON file with `readFileSync` while the module is loading, then serves every join from memory. A behaviour pack shares the server's tick, so a synchronous read is fine once at start-up and a bad idea on every join.

**Write off the tick path.** The join handler sends its message first and then writes with `fs/promises`, without awaiting. The player never waits on the disk, and a failed write costs a log line rather than a join.

**A missing file is not an error.** The first run has nothing to read, so `ENOENT` starts an empty record. Anything else is logged, because a file that exists but will not parse is worth knowing about.

## Where to take it

The same shape carries over to anything you want to keep between restarts: a config file an admin edits by hand, a ban list shared with a website, an export of the economy for a spreadsheet. Read on load, serve from memory, write without blocking the tick.
