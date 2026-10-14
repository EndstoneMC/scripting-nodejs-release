# Benchmarks

Measures how fast scripts run on your server, on whichever engine is active. Run it once with scripting-nodejs installed and once with the plugin moved aside, and you have the comparison in the main README for your own hardware.

> [!WARNING]
> A run holds the server thread for about 25 seconds, a quarter of a second at a time. Run it on a test server, not a live one.

## What it measures

Ten workloads, each a function called over and over for a fixed window of wall-clock time, counting calls:

| Benchmark | What one call does |
| --- | --- |
| integer loop | 20,000 iterations of integer arithmetic |
| object field access | reads three fields from each of 5,000 objects |
| float loop | 20,000 iterations of `Math.sqrt` and floating-point arithmetic |
| recursion | computes `fib(18)` recursively |
| string building | appends 2,000 short strings |
| map/filter/reduce | chains the three array methods over 5,000 numbers |
| `Array.sort` | sorts a copy of 2,000 numbers with a comparator |
| `system.currentTick` | reads the property 1,000 times |
| `world.getDimension()` | calls it 1,000 times |
| `BlockPermutation.resolve()` | calls it 100 times |

The first seven are plain JavaScript; the last three are calls into the Script API, where most of the time is spent in the game rather than in JavaScript.

## Running it

1. Install the pack as described in the [samples README](../README.md#trying-a-sample), on a test server.
2. Start the server, wait for it to settle — twenty seconds after `Server started.` is plenty — and run, from the console:

    ```
    scriptevent bench:run
    ```

3. The results arrive in the log about 25 seconds later:

    ```
    [Scripting] BENCH START engine=nodejs runtime="Node.js v24.18.0 (V8 13.6.233.17-node.50)" rounds=7 warmup=2 window_ms=250 benchmarks=10
    [Scripting] BENCH ROUND engine=nodejs bench=int_loop round=1 ops_per_s=87108.0
    …
    [Scripting] BENCH RESULT engine=nodejs bench=int_loop median=87108.0 min=79852.0 max=89884.0 rounds=7 label="integer loop, 20k iterations"
    …
    [Scripting] BENCH DONE engine=nodejs checksum=1439518848
    ```

`scriptevent bench:run 11 400` runs eleven measured rounds of 400 ms instead of seven of 250.

For the built-in engine, stop the server, move `plugins/endstone_scripting_nodejs.so` (`.dll` on Windows) out of the `plugins/` folder, start it again and repeat. Put the file back afterwards.

## Method

**Within a run.** Every benchmark is run in rounds, each round one window of 250 ms on one server tick, with two ticks between windows so the server keeps ticking. The rounds go round-robin — every benchmark once, then every benchmark again — so a moment of load elsewhere on the machine is spread across all of them rather than landing on one. The first two rounds of each benchmark are warm-up and are discarded, which gives Node.js time to compile the hot code; the built-in engine is treated the same way. The next seven are measured, and the run reports their median, lowest and highest.

**Across runs.** One run is one server start. To compare engines, do several runs of each, alternating — built-in, Node.js, built-in, Node.js — so that anything else the machine is doing affects both. Then summarise all the logs together:

```shell
python summarize.py quickjs-1.log nodejs-1.log quickjs-2.log nodejs-2.log …
```

[`summarize.py`](summarize.py) takes each run's median per benchmark, and reports the median of those per-run figures with the lowest and highest beside it, the ratio between the engines, and the geometric mean of the ratios for the JavaScript and the Script API benchmarks separately. It needs only Python, which every Endstone install has.

**What it does not measure.** Start-up time, memory, garbage collection pauses under a real pack's allocation pattern, and anything that waits on the disk or network. A pack's real speed-up depends on how much of its time is its own JavaScript, which is why the two kinds of benchmark are reported apart.

## Results

Measured on 2026-10-14, Bedrock Dedicated Server 1.26.51.1 on Linux, an 8-thread AMD EPYC-Milan server shared with other work — the load average was between 7 and 14 throughout, which is why the ranges are wide. Four runs per engine, alternating, of seven measured 250 ms rounds each after two warm-up rounds. Node.js v24.18.0 (V8 13.6).

| Benchmark | Built-in engine, ops/s | Node.js, ops/s | Node.js is |
| --- | ---: | ---: | ---: |
| integer loop, 20k iterations | 151 (82–168) | 82,758 (50,648–89,012) | **547×** |
| object field access, 5k objects | 404 (299–448) | 86,474 (52,428–101,688) | **214×** |
| float loop, 20k iterations | 139 (71–159) | 15,782 (8,893–16,512) | **114×** |
| recursion, `fib(18)` | 456 (312–502) | 23,914 (13,521–27,376) | **52×** |
| string building, 2k appends | 1,066 (692–1,152) | 18,996 (9,652–22,604) | **18×** |
| map/filter/reduce, 5k elements | 449 (304–506) | 6,370 (2,866–7,312) | **14×** |
| `Array.sort`, 2k elements | 452 (236–520) | 2,824 (1,496–3,004) | **6.2×** |
| `system.currentTick`, 1k reads | 2,034 (1,304–2,296) | 3,988 (1,904–4,136) | **2.0×** |
| `world.getDimension()`, 1k calls | 890 (652–1,016) | 874 (384–928) | **1.0×** |
| `BlockPermutation.resolve()`, 100 calls | 6,124 (4,576–6,956) | 5,758 (3,016–6,620) | **0.9×** |
| geometric mean, JavaScript | | | **52×** |
| geometric mean, Script API calls | | | **1.2×** |

Each figure is the median of the four per-run medians, with the lowest and highest per-run median in brackets. One run on each engine landed during a burst of other work on the machine and reads roughly half the others; the medians are what that is for.

**Reading it.** Plain JavaScript gains the most where it is most like arithmetic — the integer loop is exactly what a JIT compiler is for — and least where the work is already native on both engines: `Array.sort` spends its time in the engine's own sort, and only the comparator is JavaScript. Calls into the Script API run at about the same speed on both engines, because the time goes into the game. So a pack that does real computation in JavaScript — pathfinding, generation, parsing, simulation — gets much faster, and a pack that mostly calls the API gets about the speed it had.
