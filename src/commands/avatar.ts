import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("avatar")
  .setDescription("BEHOLD THE VISAGE OF A SOUL")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("THE SOUL WHOSE VISAGE THOU SEEKEST TO VIEW")
      .setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const targetUser = interaction.options.getUser("user") || interaction.user;

  try {
    const embed = new EmbedBuilder()
      .setColor("#00CED1")
      .setImage(targetUser.displayAvatarURL({ size: 512 }));

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Error displaying avatar:", error);
    await interaction.reply({
      content: "**Failed to display avatar!**",
      flags: MessageFlags.Ephemeral,
    });
  }
}