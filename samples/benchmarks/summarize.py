"""Summarise benchmark runs from one or more server logs.

    python summarize.py logs/quickjs-1.log logs/quickjs-2.log logs/nodejs-1.log ...

Each BENCH START line begins a run. A run's figure for a benchmark is the median of its rounds; the
table shows the median of those per-run figures, with the lowest and highest beside it.
"""

import math
import re
import statistics
import sys

START = re.compile(r"BENCH START engine=(\w+) runtime=\"([^\"]*)\"")
ROUND = re.compile(r"BENCH ROUND engine=(\w+) bench=(\w+) round=\d+ ops_per_s=([\d.]+)")
RESULT = re.compile(r"BENCH RESULT engine=\w+ bench=(\w+) .* label=\"([^\"]*)\"")
DONE = re.compile(r"BENCH DONE engine=(\w+)")
ENGINES = {"quickjs": "QuickJS", "nodejs": "Node.js"}


def read(paths):
    runs = []
    labels = {}
    runtimes = {}
    for path in paths:
        current = None
        with open(path, encoding="utf-8", errors="replace") as log:
            for line in log:
                if match := START.search(line):
                    current = {"engine": match.group(1), "rounds": {}, "done": False}
                    runtimes[match.group(1)] = match.group(2)
                elif current and (match := ROUND.search(line)):
                    current["rounds"].setdefault(match.group(2), []).append(float(match.group(3)))
                elif match := RESULT.search(line):
                    labels.setdefault(match.group(1), match.group(2))
                elif current and DONE.search(line):
                    current["done"] = True
                    runs.append(current)
                    current = None
    return runs, labels, runtimes


def figure(values):
    if not values:
        return None
    return statistics.median(values), min(values), max(values), len(values)


def number(value):
    return f"{value:,.0f}" if value >= 100 else f"{value:,.1f}"


def main():
    runs, labels, runtimes = read(sys.argv[1:])
    if not runs:
        raise SystemExit("no completed BENCH runs in those logs")
    engines = [engine for engine in ENGINES if any(run["engine"] == engine for run in runs)]
    names = list(labels) or sorted({name for run in runs for name in run["rounds"]})

    for engine in engines:
        count = sum(run["engine"] == engine for run in runs)
        print(f"{ENGINES[engine]}: {runtimes.get(engine, '?')}, {count} run(s)")
    print()

    header = ["benchmark"] + [f"{ENGINES[engine]} ops/s (range)" for engine in engines]
    if len(engines) == 2:
        header.append("speed-up")
    print("| " + " | ".join(header) + " |")
    print("| --- |" + " ---: |" * (len(header) - 1))

    ratios = {"JavaScript": [], "Script API calls": []}
    for name in names:
        row = [labels.get(name, name)]
        medians = []
        for engine in engines:
            per_run = [statistics.median(run["rounds"][name]) for run in runs
                       if run["engine"] == engine and run["rounds"].get(name)]
            stats = figure(per_run)
            medians.append(stats[0] if stats else None)
            row.append(f"{number(stats[0])} ({number(stats[1])}–{number(stats[2])})" if stats else "—")
        if len(engines) == 2:
            if all(medians):
                ratio = medians[1] / medians[0]
                ratios["Script API calls" if name.startswith("api_") else "JavaScript"].append(ratio)
                row.append(f"**{ratio:.1f}×**" if ratio < 10 else f"**{ratio:.0f}×**")
            else:
                row.append("—")
        print("| " + " | ".join(row) + " |")

    for group, values in ratios.items():
        if values:
            geometric = math.exp(sum(math.log(ratio) for ratio in values) / len(values))
            print(f"| | | geometric mean, {group} | **{geometric:.1f}×** |")


if __name__ == "__main__":
    main()
