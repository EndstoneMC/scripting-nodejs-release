import { parentPort, workerData } from "node:worker_threads";

const WALL = 1;
const PATH = 0;

const { size, attempts, seed } = workerData;

function random(state) {
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function carve(next) {
    const cells = new Uint8Array(size * size).fill(WALL);
    const stack = [size + 1];
    const neighbours = [];

    cells[size + 1] = PATH;

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const x = current % size;
        const z = (current - x) / size;

        neighbours.length = 0;
        if (x > 2 && cells[z * size + x - 2] === WALL) neighbours.push(current - 2);
        if (x < size - 3 && cells[z * size + x + 2] === WALL) neighbours.push(current + 2);
        if (z > 2 && cells[(z - 2) * size + x] === WALL) neighbours.push(current - 2 * size);
        if (z < size - 3 && cells[(z + 2) * size + x] === WALL) neighbours.push(current + 2 * size);

        if (neighbours.length === 0) {
            stack.pop();
            continue;
        }

        const chosen = neighbours[Math.floor(next() * neighbours.length)];
        cells[(current + chosen) / 2] = PATH;
        cells[chosen] = PATH;
        stack.push(chosen);
    }

    return cells;
}

function solve(cells) {
    const start = size + 1;
    const goal = (size - 2) * size + (size - 2);
    const distance = new Int32Array(size * size).fill(-1);
    const queue = new Int32Array(size * size);

    let head = 0;
    let tail = 0;

    distance[start] = 0;
    queue[tail++] = start;

    while (head < tail) {
        const current = queue[head++];
        if (current === goal) {
            return distance[current];
        }

        const x = current % size;
        for (const step of [x > 0 ? -1 : 0, x < size - 1 ? 1 : 0, -size, size]) {
            const next = current + step;
            if (step === 0 || next < 0 || next >= cells.length) continue;
            if (cells[next] === WALL || distance[next] !== -1) continue;
            distance[next] = distance[current] + 1;
            queue[tail++] = next;
        }
    }

    return 0;
}

const startedAt = Date.now();
const next = random(seed);

let best = null;

for (let attempt = 0; attempt < attempts; attempt++) {
    const cells = carve(next);
    const solution = solve(cells);

    if (best === null || solution > best.solution) {
        best = { cells, solution };
    }
}

parentPort.postMessage(
    { size, attempts, solution: best.solution, ms: Date.now() - startedAt, cells: best.cells },
    [best.cells.buffer],
);
parentPort.close();
