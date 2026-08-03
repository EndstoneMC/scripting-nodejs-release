---
name: Bug Report
about: Report something that does not work as expected.
title: ''
labels: ''
assignees: ''

---

<!--
Read the guidelines for filing an issue first.

https://github.com/EndstoneMC/scripting-nodejs-release/blob/main/TROUBLESHOOTING.md#filing-an-issue
-->

## Environment data

- scripting-nodejs version: XXX
- Endstone version: XXX
- BDS version: XXX
- OS and version: XXX

## Code snippet

<!--
Please provide the smallest behaviour pack script that reproduces the issue. If it depends on npm packages, list them and their versions.
-->

```js
XXX
```

## Repro steps

<!-- Delete this section if the snippet above is enough on its own. -->

1. XXX

## Expected behavior

XXX

## Actual behavior

XXX

## Does it also happen without the plugin?

<!--
Move the plugin out of `plugins/` and restart, so the server falls back to its own engine.
-->

- [ ] Same behavior on the stock engine
- [ ] Works on the stock engine, fails with scripting-nodejs
- [ ] Not checked

## Logs

<!--
Server log covering start-up and the failure, including the full stack trace. Attach anything in `crash_reports/` if the server crashed.
-->

```
XXX
```
