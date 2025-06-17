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
      '**THESE BE THE SACRED COMMANDS!**\n\n*"I am the hand of judgement, and upon the faithless shall I deliver righteous correction."*',
    )
    .addFields(
      {
        name: "/kick @user [reason]",
        value: "Cast out those who defy sacred alteruism",
        inline: false,
      },
      {
        name: "/ban @user [reason]",
        value: "Eternal banishment for heretical defiance",
        inline: false,
      },
      {
        name: "/timeout @user [minutes] [reason]",
        value: "Impose silence upon the wayward",
        inline: false,
      },
      {
        name: "/clear [amount]",
        value: "Purge up to 100 messages from the sacred halls",
        inline: false,
      },
      {
        name: "/warn @user [reason]",
        value: "Issue divine warning to the straying",
        inline: false,
      },
      {
        name: "/sins [@user]",
        value: "Behold the records of the damned",
        inline: false,
      },
      {
        name: "/removesin [entryid]",
        value: "Absolve a soul and undo its punishment",
        inline: false,
      },
      {
        name: "/archives [actionid]",
        value: "View the seraphic archives of purged messages",
        inline: false,
      },
      {
        name: "/avatar [@user]",
        value: "Behold the divine visage of a soul",
        inline: false,
      },
      {
        name: "/info",
        value: "Behold the knowledge of the altersaper",
        inline: false,
      },
      {
        name: "/link [fandomusername]",
        value: "Link thy Discord soul with thy Fandom account",
        inline: false,
      },
      {
        name: "/unlink @user",
        value: "Sever the linking between a Discord soul and a Fandom alter",
        inline: false,
      },
      {
        name: "/checklink @user",
        value: "Check if a user is linked to Fandom and sync roles",
        inline: false,
      },
      {
        name: "/synctop5",
        value: "Synchronize the top 5 contributors roles with the rankings",
        inline: false,
      },
      {
        name: "/help",
        value: "Display these sacred commandments",
        inline: false,
      },
    )
    .setFooter({ text: "ALTERSHAPER - DIVINE ENFORCER OF ALTERUISM" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
