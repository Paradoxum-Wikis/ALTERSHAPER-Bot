import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  GuildMember,
} from "discord.js";
import { TopContributorsManager } from "../utils/topContributors.js";
import { RolePermissions } from "../utils/rolePermissions.js";

export const data = new SlashCommandBuilder()
  .setName("synctop5")
  .setDescription("Synchronize the top 5 contributors roles with the rankings");

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content:
        "**THIS SACRED RITE CAN ONLY BE PERFORMED WITHIN THE SACRED HALLS!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (
    !RolePermissions.hasCommandPermission(
      interaction.member as GuildMember,
      "synctop5",
    )
  ) {
    await interaction.reply({
      content: RolePermissions.getPermissionErrorMessage("synctop5"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await interaction.deferReply();

    console.log(
      "📊 Manual top contributor sync requested by",
      interaction.user.tag,
    );

    const result = await TopContributorsManager.syncAllTopContributorRoles(
      interaction.guild,
    );

    const embed = new EmbedBuilder()
      .setColor(result.errors.length > 0 ? "#FFA500" : "#00FF00")
      .setTitle("🏆 TOP CONTRIBUTORS SYNCHRONIZATION COMPLETE")
      .setDescription(
        "**The rankings have been synchronized with the reverent roles!**",
      )
      .addFields({
        name: "📊 SYNCHRONIZATION STATISTICS",
        value: [
          `**Linked Users Processed:** ${result.processed}`,
          `**Roles Granted:** ${result.rolesGranted}`,
          `**Roles Removed:** ${result.rolesRemoved}`,
          `**Errors Encountered:** ${result.errors.length}`,
        ].join("\n"),
        inline: false,
      })
      .setTimestamp();

    if (result.errors.length > 0) {
      const errorSample = result.errors.slice(0, 3).join("\n");
      const additionalErrors =
        result.errors.length > 3
          ? `\n... and ${result.errors.length - 3} more errors`
          : "";

      embed.addFields({
        name: "⚠️ ERRORS ENCOUNTERED",
        value: `\`\`\`${errorSample}${additionalErrors}\`\`\``,
        inline: false,
      });
    }

    if (
      result.rolesGranted === 0 &&
      result.rolesRemoved === 0 &&
      result.errors.length === 0
    ) {
      embed.addFields({
        name: "ℹ️ STATUS",
        value:
          "All top contributor roles were already properly synchronized. No changes were needed.",
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error during manual top contributor sync:", error);
    await interaction.editReply({
      content:
        "**A DISTURBANCE IN THE SACRED HALLS! The synchronization ritual failed. The oracles are perplexed. Try again later, or consult the high scribes.**",
    });
  }
}
