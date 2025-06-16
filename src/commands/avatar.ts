import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  User,
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
  const rawTargetUser = interaction.options.getUser("user") || interaction.user;

  try {
    const targetUser: User = await rawTargetUser.fetch(true);
    const isAnimatedAvatar = targetUser.avatar?.startsWith('a_');
    const avatarURL = targetUser.displayAvatarURL({ 
      size: 512, 
      extension: isAnimatedAvatar ? "gif" : "png" 
    });
    const bannerURL = targetUser.bannerURL({ size: 1024, extension: "png" });

    const embed = new EmbedBuilder()
      .setColor(targetUser.hexAccentColor || "#B2BEB5")
      .setTitle(`🖼️ VISAGE OF ${targetUser.tag.toUpperCase()}`)
      .setDescription(`[View Avatar](${avatarURL})`)
      .setImage(avatarURL);

    if (bannerURL) {
      embed.addFields({ name: "Banner", value: `[View Banner](${bannerURL})`, inline: false });
    } else if (targetUser.hexAccentColor) {
      embed.addFields({ name: "Banner Color", value: `Hex: ${targetUser.hexAccentColor}`, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Error displaying avatar/banner:", error);
    await interaction.reply({
      content: "**Failed to retrieve user's visage! The soul may be elusive or one's divine profile hidden.**",
      flags: MessageFlags.Ephemeral,
    });
  }
}