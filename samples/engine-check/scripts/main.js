import { system } from "@minecraft/server";

const versions = globalThis.process?.versions;
const engine = versions?.node
    ? `Node.js ${versions.node} (V8 ${versions.v8})`
    : "Bedrock's built-in engine (QuickJS) - scripting-nodejs is not active";

console.log(`engine-check: scripts run on ${engine}`);

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
    if (id !== "engine:check") {
        return;
    }
    if (sourceEntity?.typeId === "minecraft:player") {
        sourceEntity.sendMessage(`Scripts on this server run on ${engine}.`);
    } else {
        console.log(`engine-check: scripts run on ${engine}`);
    }
});
