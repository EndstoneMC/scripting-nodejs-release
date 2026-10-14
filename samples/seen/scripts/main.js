import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";

import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system, world } from "@minecraft/server";

dayjs.extend(relativeTime);

const PREFIX = "seen:";
const SAVE_INTERVAL_TICKS = 1200;

function keyOf(name) {
    return PREFIX + name.toLowerCase();
}

function record(name) {
    world.setDynamicProperty(keyOf(name), Date.now());
}

function describe(name) {
    if (world.getAllPlayers().some((player) => player.name.toLowerCase() === name.toLowerCase())) {
        return `${name} is online right now.`;
    }
    const at = world.getDynamicProperty(keyOf(name));
    if (typeof at !== "number") {
        return `${name} has not been seen on this server.`;
    }
    return `${name} was last seen ${dayjs(at).fromNow()} (${dayjs(at).format("D MMM YYYY, HH:mm")}).`;
}

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    if (initialSpawn) {
        record(player.name);
    }
});

world.afterEvents.playerLeave.subscribe(({ playerName }) => {
    record(playerName);
});

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        record(player.name);
    }
}, SAVE_INTERVAL_TICKS);

system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
    customCommandRegistry.registerCommand(
        {
            name: "samples:seen",
            description: "Shows when a player was last online.",
            permissionLevel: CommandPermissionLevel.Any,
            mandatoryParameters: [{ name: "player", type: CustomCommandParamType.String }],
        },
        (_origin, name) => ({ status: CustomCommandStatus.Success, message: describe(name) }),
    );
});

console.log("seen: /seen <player> is ready");
