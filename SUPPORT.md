# Support

## Where to go

| You want to… | Go to |
| --- | --- |
| Fix something that is not working | [TROUBLESHOOTING](TROUBLESHOOTING.md) first — it lists every message the plugin prints and what to do about it |
| Report a bug | [Issues](https://github.com/EndstoneMC/scripting-nodejs-release/issues/new/choose) — search the [open ones](https://github.com/EndstoneMC/scripting-nodejs-release/issues) first |
| Ask for a feature | [Issues](https://github.com/EndstoneMC/scripting-nodejs-release/issues/new/choose), saying what you are trying to do rather than only what to add |
| Ask how to do something, or share what you built | [Discussions](https://github.com/EndstoneMC/scripting-nodejs-release/discussions) or the [Endstone Discord](https://discord.gg/xxgPuc2XN9) |
| Learn the plugin in depth | The [Scripting with Node.js](https://endstone.dev/docs/scripting-nodejs) documentation |
| Get help with Endstone itself, not the scripting runtime | The [Endstone repository](https://github.com/EndstoneMC/endstone) and [documentation](https://endstone.dev/docs) |

## What makes a report quick to fix

- **Versions.** In the server console, `version` prints Endstone's and Minecraft's, and `version scripting_nodejs` prints the plugin's. Add your operating system.
- **The start-up log**, from the first line to `Server started.`, and the lines around the failure. The start-up lines say which engine is active and anything that went wrong on the way.
- **Whether it also happens without the plugin.** Move `plugins/endstone_scripting_nodejs.so` (`.dll` on Windows) out of the folder, restart, and try again. "Same on both engines" points at the pack or at Bedrock; "only with the plugin" points here. Either answer helps.
- **The smallest pack that shows it.** Ten lines that reproduce a problem are worth more than a description of a thousand that do.

If the server crashed, say so in the title and attach the newest file in `crash_reports/`.

## Support policy

scripting-nodejs is a pre-release, supported through the channels above on a best-effort basis. Fixes ship in new releases, and each release is tested on the Bedrock versions listed in the [compatibility table](README.md#compatibility).
