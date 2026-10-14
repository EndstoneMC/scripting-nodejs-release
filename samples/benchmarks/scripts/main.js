import { BlockPermutation, system, world } from "@minecraft/server";

const ENGINE = typeof globalThis.process?.versions?.v8 === "string" ? "nodejs" : "quickjs";
const RUNTIME = ENGINE === "nodejs" ? `Node.js ${process.version} (V8 ${process.versions.v8})` : "QuickJS (built-in)";

const WARMUP_ROUNDS = 2;
const DEFAULT_ROUNDS = 7;
const DEFAULT_WINDOW_MS = 250;
const GAP_TICKS = 2;

function intLoop() {
    let sum = 0;
    for (let i = 0; i < 20000; i++) {
        sum = (sum + i * i) | 0;
    }
    return sum;
}

const records = Array.from({ length: 5000 }, (_, i) => ({ id: i, x: i * 0.5, y: i % 7, z: -i }));

function objectFields() {
    let sum = 0;
    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        sum += record.x + record.y - record.z;
    }
    return sum;
}

function floatLoop() {
    let sum = 0;
    for (let i = 0; i < 20000; i++) {
        sum += Math.sqrt(i) * 1.0001;
    }
    return sum;
}

function fib(n) {
    return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

function recursion() {
    return fib(18);
}

function stringBuilding() {
    let text = "";
    for (let i = 0; i < 2000; i++) {
        text += i.toString(36);
    }
    return text.length;
}

const numbers = Array.from({ length: 5000 }, (_, i) => (i * 7919) % 5000);

function arrayPipeline() {
    return numbers
        .map((n) => n * 3)
        .filter((n) => n % 2 === 0)
        .reduce((total, n) => total + n, 0);
}

const unsorted = Array.from({ length: 2000 }, (_, i) => (i * 104729) % 2000);

function arraySort() {
    return unsorted.slice().sort((a, b) => a - b)[1000];
}

function apiProperty() {
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
        sum = (sum + system.currentTick) | 0;
    }
    return sum;
}

function apiCall() {
    let found = 0;
    for (let i = 0; i < 1000; i++) {
        if (world.getDimension("overworld")) {
            found++;
        }
    }
    return found;
}

function apiObject() {
    let found = 0;
    for (let i = 0; i < 100; i++) {
        if (BlockPermutation.resolve("minecraft:stone")) {
            found++;
        }
    }
    return found;
}

const BENCHMARKS = [
    { name: "int_loop", label: "integer loop, 20k iterations", fn: intLoop },
    { name: "object_fields", label: "object field access, 5k objects", fn: objectFields },
    { name: "float_loop", label: "float loop, 20k iterations", fn: floatLoop },
    { name: "recursion", label: "recursion, fib(18)", fn: recursion },
    { name: "string_build", label: "string building, 2k appends", fn: stringBuilding },
    { name: "array_pipeline", label: "map/filter/reduce, 5k elements", fn: arrayPipeline },
    { name: "array_sort", label: "Array.sort, 2k elements", fn: arraySort },
    { name: "api_property", label: "system.currentTick, 1k reads", fn: apiProperty },
    { name: "api_call", label: "world.getDimension(), 1k calls", fn: apiCall },
    { name: "api_object", label: "BlockPermutation.resolve(), 100 calls", fn: apiObject },
];

function measure(fn, windowMs) {
    let operations = 0;
    let sink = 0;
    const start = Date.now();
    const end = start + windowMs;
    let now = start;
    while (now < end) {
        sink = (sink + (fn() | 0)) | 0;
        operations++;
        now = Date.now();
    }
    return { opsPerSecond: (operations * 1000) / (now - start), sink };
}

function median(sorted) {
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

let running = false;

function run(rounds, windowMs) {
    const plan = [];
    for (let round = -WARMUP_ROUNDS; round < rounds; round++) {
        for (const bench of BENCHMARKS) {
            plan.push({ bench, round });
        }
    }
    const results = new Map(BENCHMARKS.map((bench) => [bench.name, []]));
    let checksum = 0;
    let index = 0;

    console.log(
        `BENCH START engine=${ENGINE} runtime="${RUNTIME}" rounds=${rounds} warmup=${WARMUP_ROUNDS} ` +
            `window_ms=${windowMs} benchmarks=${BENCHMARKS.length}`,
    );

    const step = () => {
        const { bench, round } = plan[index];
        const { opsPerSecond, sink } = measure(bench.fn, windowMs);
        checksum = (checksum + sink) | 0;
        if (round >= 0) {
            results.get(bench.name).push(opsPerSecond);
            console.log(
                `BENCH ROUND engine=${ENGINE} bench=${bench.name} round=${round + 1} ops_per_s=${opsPerSecond.toFixed(1)}`,
            );
        }

        index++;
        if (index < plan.length) {
            system.runTimeout(step, GAP_TICKS);
            return;
        }

        for (const bench of BENCHMARKS) {
            const sorted = results.get(bench.name).slice().sort((a, b) => a - b);
            console.log(
                `BENCH RESULT engine=${ENGINE} bench=${bench.name} median=${median(sorted).toFixed(1)} ` +
                    `min=${sorted[0].toFixed(1)} max=${sorted[sorted.length - 1].toFixed(1)} rounds=${sorted.length} ` +
                    `label="${bench.label}"`,
            );
        }
        console.log(`BENCH DONE engine=${ENGINE} checksum=${checksum}`);
        running = false;
    };

    system.runTimeout(step, GAP_TICKS);
}

function parse(value, fallback, low, high) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.min(high, Math.max(low, parsed)) : fallback;
}

system.afterEvents.scriptEventReceive.subscribe(({ id, message }) => {
    if (id !== "bench:run") {
        return;
    }
    if (running) {
        console.warn("BENCH already running");
        return;
    }

    const [roundsArg, windowArg] = message.split(" ");
    running = true;
    run(parse(roundsArg, DEFAULT_ROUNDS, 1, 50), parse(windowArg, DEFAULT_WINDOW_MS, 50, 1000));
});

console.log(`BENCH ready on ${RUNTIME}; run /scriptevent bench:run [rounds] [window_ms]`);
