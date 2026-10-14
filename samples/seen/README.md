# Seen

Adds a `/seen` command that tells you when a player was last online, worded by [Day.js](https://day.js.org), an npm package:

```
/seen Steve
Steve was last seen 3 hours ago (14 Oct 2026, 08:15).
```

This is the smallest complete example of an npm package in a behaviour pack. The pack lists `dayjs` in a `package.json` beside its `manifest.json`, the plugin installs it when the pack loads, and the script imports it like any other module. Nothing has to be installed on the server by hand, and there is no build step.

## Running it

1. Install the pack as described in the [samples README](../README.md#trying-a-sample).
2. Restart the server. The first start downloads Day.js, so it needs network access and takes a moment longer; later starts find it already installed.
3. Join, leave, and from the console or another player run `/seen <name>`. Names with spaces need quotes: `/seen "Some Player"`.

## What to look at

**Two manifests, two jobs.** `manifest.json` is read by Minecraft and lists the `@minecraft/*` modules the pack needs. `package.json` is read by npm and lists the npm packages. A `package.json` needs nothing but its `dependencies` — a name and a version only matter if you publish to npm, which you never will.

```json
{
    "dependencies": {
        "dayjs": "^1.11.13"
    }
}
```

**Importing a package.** `import dayjs from "dayjs"` works because the plugin put Day.js in the pack's own `node_modules/`. Its plugins live in sub-paths, and Node.js wants the file extension for those: `import relativeTime from "dayjs/plugin/relativeTime.js"`.

**A real command.** The pack registers `/seen` through the Script API's custom command registry during `system.beforeEvents.startup`, so players get autocompletion and the usual permission handling. Its full name is `/samples:seen`; the short form works as long as no other pack registers a `seen` of its own.

**Saved in the world.** Times are kept as world dynamic properties, one per player name, so they travel with the world and survive restarts. They are refreshed on join, on leave and once a minute, so even a crash loses at most a minute.
