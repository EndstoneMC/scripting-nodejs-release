import { createServer } from "node:http";

import { system, world } from "@minecraft/server";

const HOST = "127.0.0.1";
const PORT = 8787;
const SAMPLE_TICKS = 20;

let status = { online: true, players: [], tps: null, tick: system.currentTick, updated: new Date().toISOString() };
let sampledAt = Date.now();

system.runInterval(() => {
    const now = Date.now();
    status = {
        online: true,
        players: world.getAllPlayers().map((player) => player.name),
        tps: Math.min(20, Math.round(((SAMPLE_TICKS * 1000) / (now - sampledAt)) * 10) / 10),
        tick: system.currentTick,
        updated: new Date(now).toISOString(),
    };
    sampledAt = now;
}, SAMPLE_TICKS);

const server = createServer((request, response) => {
    if (request.method !== "GET" || request.url !== "/status") {
        response.writeHead(404, { "content-type": "application/json" }).end('{"error":"not found"}');
        return;
    }
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify(status));
});

server.on("error", (error) => {
    console.error(`http-status: cannot listen on ${HOST}:${PORT}: ${error.message}`);
});

server.listen(PORT, HOST, () => {
    console.log(`http-status: serving http://${HOST}:${PORT}/status`);
});
