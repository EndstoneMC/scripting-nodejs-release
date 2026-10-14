import { mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { world } from "@minecraft/server";

const DATA_DIR = join("pack_data", "visits");
const DATA_FILE = join(DATA_DIR, "visits.json");

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

    save().catch((err) => console.error(`visits: could not write ${DATA_FILE}: ${err}`));
});
