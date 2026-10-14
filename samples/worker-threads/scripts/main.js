import { dirname, resolve } from "node:path";
import { Worker } from "node:worker_threads";

import { BlockPermutation, system } from "@minecraft/server";

const WORKER = resolve(dirname(import.meta.url), "maze.mjs");

const WALL = 1;
const WALL_BLOCK = "minecraft:stone_bricks";
const WALL_HEIGHT = 2;
const DEFAULT_SIZE = 31;
const DEFAULT_ATTEMPTS = 10000;

function tell(player, text) {
    if (player) {
        player.sendMessage(text);
    } else {
        console.log(`maze: ${text}`);
    }
}

function clamp(value, fallback, low, high) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.min(high, Math.max(low, parsed)) : fallback;
}

function* build(maze, origin, dimension) {
    const wall = BlockPermutation.resolve(WALL_BLOCK);

    for (let z = 0; z < maze.size; z++) {
        for (let x = 0; x < maze.size; x++) {
            if (maze.cells[z * maze.size + x] !== WALL) {
                continue;
            }

            for (let y = 0; y < WALL_HEIGHT; y++) {
                dimension.getBlock({ x: origin.x + x, y: origin.y + y, z: origin.z + z })?.setPermutation(wall);
            }

            yield;
        }
    }
}

system.afterEvents.scriptEventReceive.subscribe(({ id, message, sourceEntity }) => {
    if (id !== "maze:build") {
        return;
    }

    const player = sourceEntity?.typeId === "minecraft:player" ? sourceEntity : undefined;
    const [sizeArg, attemptsArg] = message.split(" ");
    const size = clamp(sizeArg, DEFAULT_SIZE, 11, 101) | 1;
    const attempts = clamp(attemptsArg, DEFAULT_ATTEMPTS, 1, 100000);
    const origin = player && {
        x: Math.floor(player.location.x),
        y: Math.floor(player.location.y),
        z: Math.floor(player.location.z),
    };

    tell(player, `Searching ${attempts} mazes for the hardest ${size}×${size}…`);

    const startedAt = system.currentTick;
    const worker = new Worker(WORKER, { workerData: { size, attempts, seed: Date.now() } });

    worker.on("message", (maze) => {
        const summary =
            `Best of ${maze.attempts}: a ${maze.solution}-step path, found in ${maze.ms} ms ` +
            `while the server ticked ${system.currentTick - startedAt} times.`;

        if (player?.isValid) {
            player.sendMessage(`${summary} Building…`);
            system.runJob(build(maze, origin, player.dimension));
        } else {
            console.log(`maze: ${summary}`);
        }
    });
    worker.on("error", (err) => console.error(`maze: the worker failed: ${err}`));
});

console.log("maze: run /scriptevent maze:build [size] [attempts] as a player to build one, or from the console to search only");
