import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { system, world } from "@minecraft/server";

const DATA_DIR = "data";
const DATA_FILE = join(DATA_DIR, "stats.db");
const FLUSH_INTERVAL_TICKS = 100;

mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DATA_FILE);

db.exec("PRAGMA journal_mode = WAL");
db.exec(`
    CREATE TABLE IF NOT EXISTS stats (
        player_id   TEXT NOT NULL,
        player_name TEXT NOT NULL,
        action      TEXT NOT NULL,
        block       TEXT NOT NULL,
        count       INTEGER NOT NULL,
        PRIMARY KEY (player_id, action, block)
    )
`);

const record = db.prepare(`
    INSERT INTO stats (player_id, player_name, action, block, count) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (player_id, action, block) DO UPDATE
        SET count = count + excluded.count, player_name = excluded.player_name
`);
const totalsOf = db.prepare("SELECT action, SUM(count) AS total FROM stats WHERE player_id = ? GROUP BY action");
const favouritesOf = db.prepare(
    "SELECT block, count FROM stats WHERE player_id = ? AND action = ? ORDER BY count DESC LIMIT 3",
);

const pending = new Map();

function queue(player, action, block) {
    const key = `${player.id}/${action}/${block}`;
    const row = pending.get(key);

    if (row) {
        row.count += 1;
    } else {
        pending.set(key, { id: player.id, name: player.name, action, block, count: 1 });
    }
}

world.afterEvents.playerBreakBlock.subscribe(({ player, brokenBlockPermutation }) => {
    queue(player, "break", brokenBlockPermutation.type.id);
});

world.afterEvents.playerPlaceBlock.subscribe(({ player, block }) => {
    queue(player, "place", block.typeId);
});

system.runInterval(() => {
    if (pending.size === 0) {
        return;
    }

    const batch = [...pending.values()];
    pending.clear();

    db.exec("BEGIN");
    try {
        for (const row of batch) {
            record.run(row.id, row.name, row.action, row.block, row.count);
        }
        db.exec("COMMIT");
    } catch (err) {
        db.exec("ROLLBACK");
        console.error(`stats: could not flush ${batch.length} row(s): ${err}`);
    }
}, FLUSH_INTERVAL_TICKS);

function favourites(playerId, action) {
    return favouritesOf
        .all(playerId, action)
        .map(({ block, count }) => `${block.replace("minecraft:", "")} ×${count}`)
        .join(", ");
}

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    if (!initialSpawn) {
        return;
    }

    const totals = new Map(totalsOf.all(player.id).map(({ action, total }) => [action, total]));
    const broken = totals.get("break") ?? 0;
    const placed = totals.get("place") ?? 0;

    if (broken + placed === 0) {
        return;
    }

    player.sendMessage(`You have broken ${broken} block(s) and placed ${placed}.`);

    if (broken > 0) {
        player.sendMessage(`Most broken: ${favourites(player.id, "break")}.`);
    }
    if (placed > 0) {
        player.sendMessage(`Most placed: ${favourites(player.id, "place")}.`);
    }
});

console.log(`stats: ${DATA_FILE} ready`);
