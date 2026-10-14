# HTTP status

Serves your server's status as JSON over HTTP, using `node:http` — something an uptime monitor, a website widget or a Discord bot can poll:

```
$ curl http://127.0.0.1:8787/status
{"online":true,"players":["Steve","Alex"],"tps":20,"tick":180,"updated":"2026-10-14T11:15:45.777Z"}
```

On the built-in engine scripts cannot open a socket at all.

## Running it

1. Install the pack as described in the [samples README](../README.md#trying-a-sample).
2. Restart the server. The log says where it is listening:

    ```
    [Scripting] http-status: serving http://127.0.0.1:8787/status
    ```

3. Open that address on the server machine, or `curl` it.

It listens on `127.0.0.1` only, so nothing outside the machine can reach it. To publish it, put it behind the reverse proxy you already use for your website, or change `HOST` in [`scripts/main.js`](scripts/main.js) to `0.0.0.0` and open the port in your firewall. Change `PORT` if 8787 is taken; the log says so when it is.

## What to look at

**A snapshot, refreshed on the tick.** Once a second, a `system.runInterval` callback reads the players and works out the tick rate, and stores the answer in a plain object. Requests are answered from that object, so serving a thousand requests costs the server nothing but the JSON encoding.

**Tick rate, measured.** The interval runs every 20 ticks; how much wall-clock time those 20 ticks took gives the ticks per second. A healthy server reads 20.

**Failures are logged, not thrown.** A port already in use is an `error` event on the server object. The pack logs it and keeps running without the endpoint, rather than taking the rest of the pack down with it.

## Where to take it

Add routes for what your community wants to see — a leaderboard from the [sqlite sample](../sqlite/), the last few chat lines, the time until the next restart. For anything beyond a handful of routes, an npm framework such as [Hono](https://hono.dev) or [Fastify](https://fastify.dev) installs the same way the [seen sample](../seen/) installs Day.js.
