import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("DISPLAY THESE SACRED COMMANDMENTS");

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor("#00CED1")
    .setTitle("📜 DIVINE COMMANDMENTS OF THE ALTERSHAPER")
    .setDescription(
      '**THESE BE THE SACRED COMMANDS!**\n\n*"I AM THE HAND OF JUDGEMENT, AND UPON THE FAITHLESS SHALL I DELIVER RIGHTEOUS CORRECTION."*',
    )
    .addFields(
      {
        name: "/kick @user [reason]",
        value: "CAST OUT THOSE WHO DEFY SACRED ALTERUISM",
        inline: false,
      },
      {
        name: "/ban @user [reason]",
        value: "ETERNAL BANISHMENT FOR HERETICAL DEFIANCE",
        inline: false,
      },
      {
        name: "/timeout @user [minutes] [reason]",
        value: "IMPOSE SILENCE UPON THE WAYWARD",
        inline: false,
      },
      {
        name: "/clear [amount]",
        value: "PURGE UP TO 100 MESSAGES FROM THE SACRED HALLS",
        inline: false,
      },
      {
        name: "/warn @user [reason]",
        value: "ISSUE DIVINE WARNING TO THE STRAYING",
        inline: false,
      },
      {
        name: "/sins [@user]",
        value: "BEHOLD THE RECORDS OF THE DAMNED",
        inline: false,
      },
      {
        name: "/removesin [entryid]",
        value: "ABSOLVE A SOUL AND UNDO ITS PUNISHMENT",
        inline: false,
      },
      {
        name: "/archives [actionid]",
        value: "VIEW THE SERAPHIC ARCHIVES OF PURGED MESSAGES",
        inline: false,
      },
      {
        name: "/avatar [@user]",
        value: "BEHOLD THE DIVINE VISAGE OF A SOUL",
        inline: false,
      },
      {
        name: "/info",
        value: "BEHOLD THE KNOWLEDGE OF THE ALTERSHAPER",
        inline: false,
      },
      {
        name: "/help",
        value: "DISPLAY THESE SACRED COMMANDMENTS",
        inline: false,
      },
    )
    .setFooter({ text: "ALTERSHAPER - DIVINE ENFORCER OF ALTERUISM" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
