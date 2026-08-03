// Relays joins, chat and leaves to a Discord channel with discord.js — an npm package,
// installed into this pack's own node_modules, talking to the network over a WebSocket.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Client, escapeMarkdown, Events, GatewayIntentBits } from "discord.js";

import { system, world } from "@minecraft/server";

const DATA_DIR = "data";
const CONFIG_FILE = join(DATA_DIR, "discord.json");
const FLUSH_INTERVAL_TICKS = 40;
const MAX_MESSAGE_LENGTH = 1900;

// The config lives next to the server, not inside the pack: a pack folder gets copied
// between worlds, zipped up and shared without anyone thinking about the token in it.
function loadConfig() {
    const blank = { token: "", channel_id: "" };

    try {
        return { ...blank, ...JSON.parse(readFileSync(CONFIG_FILE, "utf8")) };
    } catch (err) {
        if (err.code === "ENOENT") {
            mkdirSync(DATA_DIR, { recursive: true });
            writeFileSync(CONFIG_FILE, JSON.stringify(blank, null, 4));
            console.warn(`discord: wrote ${CONFIG_FILE} — fill in token and channel_id, then restart`);
        } else {
            console.error(`discord: ${CONFIG_FILE} is unreadable, the relay is off: ${err}`);
        }
        return blank;
    }
}

const config = loadConfig();
const enabled = config.token !== "" && config.channel_id !== "";

if (!enabled) {
    console.warn(`discord: no token or channel_id in ${CONFIG_FILE}, the relay is off`);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const pending = [];

let channel = null;

client.once(Events.ClientReady, async ({ user }) => {
    console.log(`discord: logged in as ${user.tag}`);
    try {
        channel = await client.channels.fetch(config.channel_id);
    } catch (err) {
        console.error(`discord: channel ${config.channel_id} is unreachable: ${err}`);
    }
});

if (enabled) {
    // The gateway is a WebSocket, kept alive by the event loop the server pumps every tick.
    client.login(config.token).catch((err) => console.error(`discord: login failed: ${err}`));
}

// Take whole lines up to Discord's message limit, leaving the rest for the next flush.
function take() {
    const lines = [];
    let length = 0;

    while (pending.length > 0 && length + pending[0].length + 1 <= MAX_MESSAGE_LENGTH) {
        length += pending[0].length + 1;
        lines.push(pending.shift());
    }

    return lines.join("\n");
}

system.runInterval(() => {
    if (channel === null || pending.length === 0) {
        return;
    }

    // One message per flush rather than one per event: Discord rate-limits a channel to a
    // handful of sends every few seconds, and a busy server produces far more than that.
    channel
        .send({ content: take(), allowedMentions: { parse: [] } })
        .catch((err) => console.error(`discord: send failed: ${err}`));
}, FLUSH_INTERVAL_TICKS);

world.afterEvents.playerJoin.subscribe(({ playerName }) => {
    pending.push(`**${escapeMarkdown(playerName)}** joined the server`);
});

world.afterEvents.playerLeave.subscribe(({ playerName }) => {
    pending.push(`**${escapeMarkdown(playerName)}** left the server`);
});

// A before-event runs in read-only mode, so the handler does nothing but queue a string.
// The network call happens on the interval above, well after the event has returned.
world.beforeEvents.chatSend.subscribe(({ sender, message }) => {
    pending.push(`**${escapeMarkdown(sender.name)}**: ${escapeMarkdown(message)}`);
});
