import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  GatewayIntentBits,
  GuildMember,
  TextChannel,
  EmbedBuilder,
  ChannelType,
  REST,
  Routes,
  Interaction,
  Collection,
  MessageReaction,
  User,
  PartialMessageReaction,
  PartialUser,
  MessageFlags,
} from "discord.js";
import { loadCommands, Command } from "./utils/commandLoader.js";
import { ReactionRoleHandler } from "./utils/reactionRoleHandler.js";
import { RolePermissions } from "./utils/rolePermissions.js";
import { CommandAccessManager } from "./utils/commandAccessManager.js";

class AltershaperBot {
  private client: Client;
  private readonly BOT_TOKEN = process.env.DISCORD_TOKEN;
  private readonly WELCOME_CHANNEL_ID = "1366495690796040315";
  private commands: Collection<string, Command>;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });

    this.commands = loadCommands();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.once("ready", async () => {
      console.log(
        `✅ Altershaper bot hath awakened as ${this.client.user?.tag}`,
      );
      this.client.user?.setActivity("Alter Egoists", { type: 3 });

      this.logVisibleChannels();

      await this.registerSlashCommands();
      await ReactionRoleHandler.initialize(this.client);
    });

    this.client.on("interactionCreate", this.handleInteraction.bind(this));
    this.client.on("guildMemberAdd", this.handleMemberJoin.bind(this));
    this.client.on("messageReactionAdd", this.handleReactionAdd.bind(this));
    this.client.on(
      "messageReactionRemove",
      this.handleReactionRemove.bind(this),
    );
  }

  private logVisibleChannels(): void {
    console.log("🔍 Permissions:");
    console.log("================================");

    this.client.guilds.cache.forEach((guild) => {
      console.log(`📁 Server: ${guild.name} (ID: ${guild.id})`);

      guild.channels.cache.forEach((channel) => {
        let channelType = "Unknown";
        let canRead = false;

        const permissions = channel.permissionsFor(this.client.user!);
        
        switch (channel.type) {
          case ChannelType.GuildText:
            channelType = "Text";
            canRead = permissions?.has("ViewChannel") && permissions?.has("ReadMessageHistory") || false;
            break;
          case ChannelType.GuildVoice:
            channelType = "Voice";
            canRead = permissions?.has("ViewChannel") || false;
            break;
          case ChannelType.GuildCategory:
            channelType = "Category";
            canRead = permissions?.has("ViewChannel") || false;
            break;
          case ChannelType.GuildAnnouncement:
            channelType = "Announcement";
            canRead = permissions?.has("ViewChannel") && permissions?.has("ReadMessageHistory") || false;
            break;
          case ChannelType.GuildStageVoice:
            channelType = "Stage";
            canRead = permissions?.has("ViewChannel") || false;
            break;
          case ChannelType.GuildForum:
            channelType = "Forum";
            canRead = permissions?.has("ViewChannel") || false;
            break;
          case ChannelType.PublicThread:
            channelType = "Public Thread";
            canRead = permissions?.has("ViewChannel") && permissions?.has("ReadMessageHistory") || false;
            break;
          case ChannelType.PrivateThread:
            channelType = "Private Thread";
            canRead = permissions?.has("ViewChannel") && permissions?.has("ReadMessageHistory") || false;
            break;
        }

        const readStatus = canRead ? "✅ CAN READ" : "❌ CANNOT READ";
        console.log(`  📝 ${channelType}: #${channel.name} (ID: ${channel.id}) - ${readStatus}`);
      });

      console.log("");
    });

    console.log("================================");
  }

  private async registerSlashCommands(): Promise<void> {
    const commandData = Array.from(this.commands.values()).map(
      (command) => command.data,
    );
    const rest = new REST({ version: "10" }).setToken(this.BOT_TOKEN!);

    try {
      console.log("🔄 Registering divine slash commands...");

      await rest.put(Routes.applicationCommands(this.client.user!.id), {
        body: commandData,
      });

      console.log("✅ Divine slash commands registered successfully!");
    } catch (error) {
      console.error("❌ Failed to register slash commands:", error);
    }
  }

  private async handleInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    if (!CommandAccessManager.canUseCommand(interaction.commandName, interaction.guildId)) {
      await interaction.reply({
        content: CommandAccessManager.getAccessDeniedMessage(),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const command = this.commands.get(interaction.commandName);
    if (!command) return;

    const member = interaction.member as GuildMember;
    if (!member) return;

    try {
      if (
        !RolePermissions.hasCommandPermission(member, interaction.commandName)
      ) {
        const errorMessage = RolePermissions.getPermissionErrorMessage(
          interaction.commandName,
        );
        await interaction.reply({
          content: errorMessage,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (
        !RolePermissions.canUseCommandInChannel(member, interaction.channelId!)
      ) {
        await interaction.reply({
          content: RolePermissions.getChannelErrorMessage(),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (
        interaction.commandName === "help" ||
        interaction.commandName === "info" ||
        interaction.commandName === "sins" ||
        interaction.commandName === "avatar" ||
        interaction.commandName === "archives" ||
        interaction.commandName === "link" ||
        interaction.commandName === "checklink" ||
        interaction.commandName === "synctop5"
      ) {
        await command.execute(interaction);
      } else {
        await command.execute(interaction, member);
      }
    } catch (error) {
      console.error("Error executing command:", error);

      const errorMessage =
        "**THE DIVINE POWERS HAVE ENCOUNTERED AN UNEXPECTED ERROR!**";

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: errorMessage,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: errorMessage,
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }

  private async handleMemberJoin(member: GuildMember): Promise<void> {
    const welcomeChannel = member.guild.channels.cache.get(
      this.WELCOME_CHANNEL_ID,
    ) as TextChannel;

    if (welcomeChannel && welcomeChannel.type === ChannelType.GuildText) {
      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("🌟 A NEW SOUL ENTERS THE SACRED REALM")
        .setDescription(
          `**Welcome to the ALTER EGO Wiki Discord server, ${member.user.tag}!**\n\nThou hast entered the sacred halls of Alteruism!\nHere we honour our alter egos and embrace the righteous path!\n\nRead the sacred laws and contribute to our divine mission!\nKnow that defiance of Alteruism shall bring righteous correction!`,
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({
          text: "BOUND BY DUTY TO HONOUR OUR DIVINE ALTER EGO, WE ARE ALTER EGOISTS",
        })
        .setTimestamp();

      await welcomeChannel.send({ embeds: [embed] });
    }
  }

  private async handleReactionAdd(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
  ): Promise<void> {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Failed to fetch reaction:", error);
        return;
      }
    }

    if (user.partial) {
      try {
        await user.fetch();
      } catch (error) {
        console.error("Failed to fetch user:", error);
        return;
      }
    }

    await ReactionRoleHandler.handleReactionAdd(
      reaction as MessageReaction,
      user as User,
    );
  }

  private async handleReactionRemove(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
  ): Promise<void> {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Failed to fetch reaction:", error);
        return;
      }
    }

    if (user.partial) {
      try {
        await user.fetch();
      } catch (error) {
        console.error("Failed to fetch user:", error);
        return;
      }
    }

    await ReactionRoleHandler.handleReactionRemove(
      reaction as MessageReaction,
      user as User,
    );
  }

  public async start(): Promise<void> {
    if (!this.BOT_TOKEN) {
      console.error("❌ Discord token not found in environment variables");
      process.exit(1);
    }

    try {
      await this.client.login(this.BOT_TOKEN);
    } catch (error) {
      console.error("❌ Failed to login:", error);
      process.exit(1);
    }

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("🛑 Shutting down gracefully...");
      this.client.destroy();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("🛑 Shutting down gracefully...");
      this.client.destroy();
      process.exit(0);
    });
  }
}

const bot = new AltershaperBot();
bot.start();
