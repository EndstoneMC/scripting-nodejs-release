// Searches for a hard maze on a worker thread, then builds it in the world a few blocks per
// tick. Neither half runs on the tick for longer than it should: the search is pure CPU on
// another thread, and the building is a job the server paces itself.

import { Worker } from "node:worker_threads";

import { BlockPermutation, system, world } from "@minecraft/server";

// `import.meta.dirname` is undefined for a pack module, so the worker file is located by
// asking the loader to resolve it. That answers an absolute URL, which is what `Worker` needs.
const WORKER = new URL(import.meta.resolve("./maze.js"));

const WALL = 1;
const WALL_BLOCK = "minecraft:stone_bricks";
const WALL_HEIGHT = 2;
const DEFAULT_SIZE = 31;
const DEFAULT_ATTEMPTS = 10000;

// A worker's message arrives on a libuv callback rather than inside a tick, so finished
// mazes wait here. Everything that touches the world happens on the interval below.
const finished = [];

let ticks = 0;

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

            // Yielding hands the tick back. BDS decides how much of the job to run each time.
            yield;
        }
    }
}

system.afterEvents.scriptEventReceive.subscribe(({ id, message, sourceEntity }) => {
    if (id !== "maze:build") {
        return;
    }

    const player = sourceEntity;
    if (player === undefined) {
        console.warn("maze: run this as a player — the maze is built where you stand");
        return;
    }

    const [sizeArg, attemptsArg] = message.split(" ");
    const size = clamp(sizeArg, DEFAULT_SIZE, 11, 101) | 1; // a maze needs odd dimensions
    const attempts = clamp(attemptsArg, DEFAULT_ATTEMPTS, 1, 100000);
    const origin = {
        x: Math.floor(player.location.x),
        y: Math.floor(player.location.y),
        z: Math.floor(player.location.z),
    };

    player.sendMessage(`Searching ${attempts} mazes for the hardest ${size}×${size}…`);

    const worker = new Worker(WORKER, { workerData: { size, attempts, seed: Date.now() } });
    const startedAt = ticks;

    worker.on("message", (maze) => finished.push({ maze, player, origin, startedAt }));
    worker.on("error", (err) => console.error(`maze: the worker failed: ${err}`));
});

system.runInterval(() => {
    ticks += 1;

    while (finished.length > 0) {
        const { maze, player, origin, startedAt } = finished.shift();

        player.sendMessage(
            `Best of ${maze.attempts}: a ${maze.solution}-step path, found in ${maze.ms} ms ` +
                `while the server ticked ${ticks - startedAt} times. Building…`,
        );

        system.runJob(build(maze, origin, player.dimension));
    }
}, 1);

world.afterEvents.worldLoad.subscribe(() => {
    console.log("maze: run /scriptevent maze:build [size] [attempts] in game");
});
