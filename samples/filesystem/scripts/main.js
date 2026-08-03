// Keeps a visit count per player in a JSON file next to the server executable.
// Nothing here is possible on the stock engine: BDS's QuickJS sandbox has no `node:fs`.

import { mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { world } from "@minecraft/server";

const DATA_DIR = "data";
const DATA_FILE = join(DATA_DIR, "visits.json");

// Read once, at load, so the join handler never waits on the disk.
function load() {
    try {
        return JSON.parse(readFileSync(DATA_FILE, "utf8"));
    } catch (err) {
        if (err.code === "ENOENT") {
            return {};
        }
        console.error(`visits: ${DATA_FILE} is unreadable, starting empty: ${err}`);
        return {};
    }
}

function save() {
    return writeFile(DATA_FILE, JSON.stringify(visits, null, 2));
}

mkdirSync(DATA_DIR, { recursive: true });

const visits = load();

console.log(`visits: ${Object.keys(visits).length} player(s) loaded from ${DATA_FILE}`);

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    if (!initialSpawn) {
        return;
    }

    const count = (visits[player.id] ?? 0) + 1;
    visits[player.id] = count;

    player.sendMessage(count === 1 ? `Welcome, ${player.name}!` : `Welcome back, ${player.name} — visit #${count}.`);

    // Write off the tick path. The message above has already been sent, so a slow disk
    // costs the player nothing, and a failed write costs them nothing but a log line.
    save().catch((err) => console.error(`visits: could not write ${DATA_FILE}: ${err}`));
});
