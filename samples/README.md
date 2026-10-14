# Samples

Complete behaviour packs, each showing one thing scripting-nodejs makes possible. Copy one onto your server, attach it to a world, restart, and read the source — every sample is short enough to read in a sitting, and its README says what to look at.

| Sample | Shows |
| --- | --- |
| [engine-check](engine-check/) | Which engine runs your scripts — install this one first |
| [seen](seen/) | An npm package declared in `package.json` and installed for you, behind a `/seen` command |
| [filesystem](filesystem/) | Reading and writing a JSON file with `node:fs` |
| [http-status](http-status/) | Serving the server's players and tick rate over HTTP with `node:http` |
| [worker-threads](worker-threads/) | Heavy computation on another thread with `node:worker_threads`, while the server keeps ticking |
| [sqlite](sqlite/) | Per-player statistics in a real database with `node:sqlite` |
| [discord](discord/) | A Discord chat relay built on discord.js |
| [benchmarks](benchmarks/) | Measuring script speed on either engine, the way the numbers in the README were measured |

## Trying a sample

1. Copy the sample's folder into your server's `development_behavior_packs/` folder.
2. Attach it to your world. Open `worlds/<your world>/world_behavior_packs.json` — create it if it is not there — and add the `uuid` and `version` from the `header` of the sample's `manifest.json`:

    ```json
    [
        {
            "pack_id": "9a6a4fe8-a6f2-4da8-85b2-5382e316a3c7",
            "version": [1, 0, 0]
        }
    ]
    ```

    That entry is [engine-check](engine-check/)'s. Each sample you add is one more object in the list.

3. Restart the server.

A sample that has a `package.json` needs network access on its first start, while the plugin installs its npm packages. A sample that writes files keeps them under `pack_data/` in your server folder.

Everything a sample logs starts with a short prefix of its own — `engine-check:`, `seen:`, `maze:` and so on — so you can `grep` the log for it.

## Contributing a sample

If you have built something that shows a pattern well, share it in [Discussions](https://github.com/EndstoneMC/scripting-nodejs-release/discussions) or open a pull request. A good sample does one thing, runs without editing anything but a clearly marked config file, says in its log that it loaded, and explains its choices in its README rather than in comments.
