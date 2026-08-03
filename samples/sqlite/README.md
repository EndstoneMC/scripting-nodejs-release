# SQLite

Stores per-player statistics in a real database, using `node:sqlite`.

The pack counts the blocks each player breaks and places, and keeps the totals in `data/stats.db`, next to your server executable. Join and it tells you how many of each you have, and which three blocks you break and place most. The counts survive a restart, and unlike a JSON file they can be queried — "who has placed the most stone" is one `SELECT` away, over any number of players.

`node:sqlite` is built into the Node.js runtime the plugin ships, so this sample needs no `npm install` and no native addon. On the stock engine there is no database of any kind, and no way to reach one.

## Running it

1. Copy the `sqlite` folder into your world's `behavior_packs/` folder.
2. Add it to the world's `world_behavior_packs.json`, or enable it from the world settings screen.
3. Restart the server, join, and break and place some blocks.

You can open `data/stats.db` with any SQLite client while the server is running:

```sql
SELECT player_name, action, SUM(count) AS total
FROM stats
GROUP BY player_id, action
ORDER BY total DESC;
```

## The schema

One table carries both statistics, with the action as a column:

| player_id | player_name | action | block | count |
| --- | --- | --- | --- | --- |
| `-4294967295` | Alice | `break` | `minecraft:stone` | 128 |
| `-4294967295` | Alice | `place` | `minecraft:oak_planks` | 64 |

A column beats a table per action here: one prepared statement records both, one query answers "top blocks" for either, and adding a third statistic — crafted, mined by tool, whatever you track — is a new value rather than new code.

## What to look at

**Batch the writes.** `DatabaseSync` is synchronous and runs on the server thread, so a write per block break is a disk seek per block break. [`scripts/main.js`](scripts/main.js) accumulates events in a `Map` and commits them every 100 ticks, which turns a thousand blocks into one transaction.

**One transaction, not one per row.** SQLite commits to disk at the end of a transaction. Wrapping the batch in `BEGIN`/`COMMIT` is the difference between one flush and one per row, and the `ROLLBACK` in the `catch` means a failed batch leaves nothing half-written.

**Prepare statements once.** The three statements are prepared while the module loads and reused for the life of the server. Re-preparing per call is the usual reason SQLite looks slow.

**Let the database do the counting.** `ON CONFLICT ... DO UPDATE` adds to the existing row instead of reading it back, `GROUP BY` totals each action in one query, and the leaderboard sorts and limits in SQL rather than in JavaScript.

**WAL mode.** `PRAGMA journal_mode = WAL` lets a reader — your own client, on another connection — read the database while the server writes to it.

Events that have not been flushed yet are lost if the server dies, so up to 100 ticks of counting is at risk. That is the trade for not touching the disk on the tick; shorten the interval if you would rather lose less.

## Where to take it

The same shape works for anything you need to query rather than merely store: playtime, economy balances, claims, punishment history. If you outgrow SQLite, the batching and the prepared statements carry over unchanged to a client for a networked database — only the connection and the placeholder syntax change.
