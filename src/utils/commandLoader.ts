import { Collection } from "discord.js";
import * as kick from "../commands/kick.js";
import * as ban from "../commands/ban.js";
import * as timeout from "../commands/timeout.js";
import * as clear from "../commands/clear.js";
import * as warn from "../commands/warn.js";
import * as sins from "../commands/sins.js";
import * as removesin from "../commands/removesin.js";
import * as archives from "../commands/archives.js";
import * as help from "../commands/help.js";
import * as avatar from "../commands/avatar.js";
import * as info from "../commands/info.js";
import * as link from "../commands/link.js";
import * as unlink from "../commands/removelink.js";
import * as checklink from "../commands/checklink.js";
import * as synctop5 from "../commands/synctop5.js";
import * as slowmode from "../commands/slowmode.js";
import * as oracle from "../commands/oracle.js";
import * as tdstrivia from "../commands/tdstrivia.js";
import * as aura from "../commands/aura.js";
import * as battle from "../commands/battle.js";
import * as battlestats from "../commands/battlestats.js";
import * as furry from "../commands/furry.js";
import * as anime from "../commands/anime.js";
import * as ship from "../commands/ship.js";
import * as webhook from "../commands/webhook.js";
// import * as bossfight from "../commands/bossfight.js";

export interface Command {
  data: any;
  execute: (...args: any[]) => Promise<void>;
}

export function loadCommands(): Collection<string, Command> {
  const commands = new Collection<string, Command>();

  const commandModules = [
    kick,
    ban,
    timeout,
    clear,
    warn,
    sins,
    removesin,
    archives,
    help,
    avatar,
    info,
    link,
    unlink,
    checklink,
    synctop5,
    slowmode,
    oracle,
    tdstrivia,
    aura,
    battle,
    battlestats,
    furry,
    anime,
    ship,
    webhook,
    // bossfight,
  ];

  for (const command of commandModules) {
    commands.set(command.data.name, command);
  }

  return commands;
}
