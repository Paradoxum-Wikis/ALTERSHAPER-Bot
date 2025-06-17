import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Display these sacred commandments");

interface CommandInfo {
  name: string;
  value: string;
  category: string;
}

const commands: CommandInfo[] = [
  // Admin
  {
    name: "/ban @user [reason]",
    value: "Eternal banishment for heretical defiance",
    category: "admin",
  },
  {
    name: "/removesin [entryid]",
    value: "Absolve a soul and undo its punishment",
    category: "admin",
  },
  {
    name: "/unlink @user",
    value: "Sever the linking between a Discord soul and a Fandom alter",
    category: "admin",
  },
  // Moderator
  {
    name: "/kick @user [reason]",
    value: "Cast out those who defy sacred alteruism",
    category: "moderator",
  },
  {
    name: "/timeout @user [minutes] [reason]",
    value: "Impose silence upon the wayward",
    category: "moderator",
  },
  {
    name: "/clear [amount]",
    value: "Purge up to 100 messages from the sacred halls",
    category: "moderator",
  },
  {
    name: "/warn @user [reason]",
    value: "Issue divine warning to the straying",
    category: "moderator",
  },
  {
    name: "/sins [@user]",
    value: "Behold the records of the damned",
    category: "moderator",
  },
  {
    name: "/archives [actionid]",
    value: "View the seraphic archives of purged messages",
    category: "moderator",
  },
  // Basic
  {
    name: "/avatar [@user]",
    value: "Behold the divine visage of a soul",
    category: "basic",
  },
  {
    name: "/info",
    value: "Behold the knowledge of the altershaper",
    category: "basic",
  },
  {
    name: "/link [fandomusername]",
    value: "Link thy Discord soul with thy Fandom account",
    category: "basic",
  },
  {
    name: "/checklink @user",
    value: "Check if a user is linked to Fandom and sync roles",
    category: "basic",
  },
  {
    name: "/synctop5",
    value: "Synchronize the top 5 contributors roles with the rankings",
    category: "basic",
  },
  {
    name: "/help",
    value: "Display these sacred commandments",
    category: "basic",
  },
];

const categories = [
  {
    name: "🥀 ALTERMINISTRATOR",
    description: "**Divine powers reserved for the highest authority**",
    commands: commands.filter(cmd => cmd.category === "admin"),
  },
  {
    name: "⚖️ MODERATOR",
    description: "**Sacred instruments for maintaining order and righteousness**",
    commands: commands.filter(cmd => cmd.category === "moderator"),
  },
  {
    name: "📚 BASIC",
    description: "**Available to all faithful souls in the sacred halls**",
    commands: commands.filter(cmd => cmd.category === "basic"),
  },
];

function createEmbed(categoryIndex: number): EmbedBuilder {
  const category = categories[categoryIndex];
  
  const embed = new EmbedBuilder()
    .setColor("#00CED1")
    .setTitle("📜 DIVINE COMMANDMENTS OF THE ALTERSHAPER")
    .setDescription(
      `**These be the sacred commands!**\n\n*"I am the hand of judgement, and upon the faithless shall I deliver righteous correction."*\n\n${category.description}\n\n**Page ${categoryIndex + 1} of ${categories.length}**`
    )
    .addFields({
      name: category.name,
      value: category.commands.map(cmd => `**${cmd.name}**\n${cmd.value}`).join('\n\n'),
      inline: false,
    })
    .setFooter({ text: "ALTERSHAPER - Divine Enforcer of Alteruism" })
    .setTimestamp();

  return embed;
}

function createButtons(currentPage: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("first")
      .setLabel("⏮️ Admin")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("previous")
      .setLabel("◀️ Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Next ▶️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1),
    new ButtonBuilder()
      .setCustomId("last")
      .setLabel("Basic ⏭️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1),
  );
}

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const totalPages = categories.length;
  let currentPage = 0;

  const embed = createEmbed(currentPage);
  const buttons = createButtons(currentPage, totalPages);

  const response = await interaction.reply({
    embeds: [embed],
    components: [buttons],
  });

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 300000, // 5 minutes
  });

  collector.on("collect", async (buttonInteraction) => {
    if (buttonInteraction.user.id !== interaction.user.id) {
      await buttonInteraction.reply({
        content: "**Thou cannot control another's commandments!**",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    switch (buttonInteraction.customId) {
      case "first":
        currentPage = 0;
        break;
      case "previous":
        currentPage = Math.max(0, currentPage - 1);
        break;
      case "next":
        currentPage = Math.min(totalPages - 1, currentPage + 1);
        break;
      case "last":
        currentPage = totalPages - 1;
        break;
    }

    const newEmbed = createEmbed(currentPage);
    const newButtons = createButtons(currentPage, totalPages);

    await buttonInteraction.update({
      embeds: [newEmbed],
      components: [newButtons],
    });
  });

  collector.on("end", async () => {
    const disabledButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("first")
        .setLabel("⏮️ Admin")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("previous")
        .setLabel("◀️ Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next ▶️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("last")
        .setLabel("Basic ⏭️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );

    response.edit({ components: [disabledButtons] }).catch(() => {});
  });
}
