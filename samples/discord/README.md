# Discord

Relays joins, chat and leaves to a Discord channel, using [discord.js](https://discord.js.org).

This is the sample that shows what an npm package looks like inside a behaviour pack. The pack carries its own `package.json` beside `manifest.json`, `npm install` puts `node_modules/` in the pack folder, and the scripts import from it exactly as they would in any Node project. When someone joins, says something, or leaves, a line appears in your Discord channel:

```
**Alice** joined the server
**Alice**: anyone got spare iron?
**Alice** left the server
```

On the stock engine there is no npm, no `node_modules`, and no socket to open — discord.js is 40-odd packages and a WebSocket gateway, none of which QuickJS can reach.

## The two manifests

A behaviour pack that uses npm packages has both:

| File | Read by | Says |
| --- | --- | --- |
| `manifest.json` | Minecraft | The pack's identity, its entry script, and which `@minecraft/*` modules it needs |
| `package.json` | npm and Node.js | Which npm packages it needs |

They do not know about each other, and neither one is optional. `package.json` needs nothing but its `dependencies` — a name and a version matter only if you publish the folder to npm, which you never will. Module resolution starts from the importing script and climbs, so `node_modules/` in the pack folder serves every script in the pack — and a second pack that wants a different version of the same package gets its own copy rather than a conflict.

## Running it

1. Copy the `discord` folder into your world's `behavior_packs/` folder.
2. Install the dependencies **inside the pack folder**, so `node_modules/` lands beside `manifest.json`:

    ```shell
    cd behavior_packs/discord
    npm install
    ```

3. Create a bot at the [Discord Developer Portal](https://discord.com/developers/applications), invite it to your server, and copy its token and the target channel's id.
4. Enable the pack for your world, and enable **Beta APIs** in the world's experiments — chat events live in the beta `@minecraft/server` module, which is why the manifest asks for `"version": "beta"`.
5. Start the server once. The pack writes an empty `data/discord.json` next to your server executable and tells you so:

    ```json
    {
        "token": "your-bot-token",
        "channel_id": "123456789012345678"
    }
    ```

6. Fill both fields in and restart.

Until the file has a token and a channel id, the pack loads, logs a warning, and does nothing else.

## What to look at

**The token is not in the pack.** [`scripts/main.js`](scripts/main.js) reads `data/discord.json`, next to the server executable rather than inside the pack. A pack folder is the wrong place for a credential: it gets copied between worlds, zipped up and shared without anyone thinking about it. Keeping the config outside also means a panel's file manager can edit it without touching the pack, and that a pack update never overwrites your token.

**A missing config writes itself.** The first start creates the file with empty fields and says so in the log, so there is nothing to copy from the README by hand.

**A before-event only queues.** `chatSend` is a before-event, so its handler runs in read-only mode and must return promptly. It pushes a string onto an array and returns; the network call happens later, on an interval, long after the event has gone.

**One message per flush, not one per event.** Discord rate-limits a channel to a handful of sends every few seconds, and a busy server produces far more than that. Lines accumulate for two seconds and go out together.

**Whole lines, up to the limit.** Discord rejects a message over 2000 characters, so the flush takes lines while they fit and leaves the rest queued for the next one.

**Player input is escaped, and mentions are defused.** Names and chat text go through `escapeMarkdown`, and every send passes `allowedMentions: { parse: [] }` — otherwise a player typing `@everyone` in chat pings your whole Discord server.

**The gateway stays connected because the server pumps the event loop.** discord.js keeps a WebSocket open and a heartbeat running; both are ordinary libuv work, and BDS drives one pump per tick.

## Where to take it

Relaying the other way — Discord messages into the game — needs the `MessageContent` privileged intent enabled for your bot, an extra `GatewayIntentBits.MessageContent`, and a `world.sendMessage` from a `system.run` callback rather than straight out of the discord.js handler. The same shape covers server start and stop announcements, death messages, and an admin channel that runs commands.
