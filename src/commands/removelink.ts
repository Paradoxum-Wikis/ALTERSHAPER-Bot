import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
} from "discord.js";
import { LinkLogger } from "../utils/linkLogger.js";
import { FANDOM_ROLE_IDS, LINKED_ROLE_ID } from "../utils/roleConstants.js";

export const data = new SlashCommandBuilder()
  .setName("unlink")
  .setDescription("SEVER THE LINK BETWEEN DISCORD AND FANDOM SOULS")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("THE DISCORD SOUL TO UNLINK FROM FANDOM")
      .setRequired(true),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content:
        "**THIS SACRED RITE CAN ONLY BE PERFORMED WITHIN THE SACRED HALLS!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);
  const targetMember = await interaction.guild.members
    .fetch(targetUser.id)
    .catch(() => null);

  try {
    const existingLink = await LinkLogger.getLinkByDiscordId(targetUser.id);

    if (!existingLink) {
      await interaction.reply({
        content: `**${targetUser.tag} HATH NO LINK TO SEVER! THE SOUL IS ALREADY UNBOUND!**`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const confirmationEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("⚠️ LINKING SEVERANCE")
      .setDescription(
        `**THOU ART ABOUT TO SEVER THE LINK BETWEEN DISCORD SOUL ${targetUser.tag} AND FANDOM ALTER: ${existingLink.fandomUsername}**`,
      )
      .addFields(
        {
          name: "🔒 PERMANENT ACTION",
          value:
            "**THIS SEVERANCE IS IRREVERSIBLE! THE USER MUST RE-LINK MANUALLY TO RESTORE THE LINK!**",
          inline: false,
        },
        {
          name: "📜 CONFIRMATION REQUIRED",
          value:
            "React with 🖋️ within 1 minute to proceed with the severance ritual.",
          inline: false,
        },
      )
      .setFooter({ text: "This confirmation will expire in 60 seconds" })
      .setTimestamp();

    const confirmationMessage = await interaction.reply({
      embeds: [confirmationEmbed],
      flags: MessageFlags.Ephemeral,
    });

    const message = await confirmationMessage.fetch();

    try {
      await message.react("🖋️");
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }

    const filter = (reaction: any, user: any) => {
      return reaction.emoji.name === "🖋️" && user.id === interaction.user.id;
    };

    try {
      const collected = await message.awaitReactions({
        filter,
        max: 1,
        time: 60000,
        errors: ["time"],
      });

      if (collected.size > 0) {
        await LinkLogger.removeLink(targetUser.id);

        if (targetMember) {
          const rolesToRemove = [LINKED_ROLE_ID, ...FANDOM_ROLE_IDS];
          const rolesToRemoveFiltered = rolesToRemove.filter((roleId) =>
            targetMember.roles.cache.has(roleId),
          );

          if (rolesToRemoveFiltered.length > 0) {
            try {
              await targetMember.roles.remove(rolesToRemoveFiltered);
            } catch (roleError) {
              console.error("Failed to remove roles during unlink:", roleError);
            }
          }
        }

        const successEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("💔 LINKING SEVERED!")
          .setDescription(
            `**THE LINK BETWEEN ${targetUser.tag} AND FANDOM ALTER "${existingLink.fandomUsername}" HATH BEEN SEVERED!**`,
          )
          .addFields(
            {
              name: "EXECUTOR OF SEVERANCE",
              value: `${executor.user.tag}`,
              inline: true,
            },
            {
              name: "SEVERED LINKING",
              value: `Discord: ${targetUser.tag}\nFandom: ${existingLink.fandomUsername}`,
              inline: true,
            },
            {
              name: "ROLES REMOVED",
              value: targetMember
                ? "All linked and Fandom specific roles have been stripped."
                : "User not in server - roles could not be removed.",
              inline: false,
            },
          )
          .setTimestamp();

        await interaction.followUp({ embeds: [successEmbed] });

        try {
          await targetUser.send(
            `**THY LINK HATH BEEN SEVERED!\n\nThy connection to the Fandom alter "${existingLink.fandomUsername}" has been severed by ${executor.user.tag}.\n\nTo restore thy link, thou must use the /link command again and verify thy identity anew.**`,
          );
        } catch (dmError) {
          console.log("Failed to send DM to unlinked user:", dmError);
        }
      }
    } catch (error) {
      const timeoutEmbed = new EmbedBuilder()
        .setColor("#808080")
        .setTitle("⏰ SEVERANCE RITUAL EXPIRED")
        .setDescription(
          "**THE SEVERANCE CONFIRMATION HAS EXPIRED. NO CHANGES WERE MADE.**",
        )
        .addFields({
          name: "TO RETRY",
          value:
            "Run the `/unlink` command again to restart the severance process.",
          inline: false,
        });

      await interaction.followUp({
        embeds: [timeoutEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    console.error("Error during account unlinking:", error);
    await interaction.reply({
      content:
        "**A DISTURBANCE IN THE SACRED HALLS! The severance ritual failed. The oracles are perplexed. Try again later, or consult the high scribes.**",
      flags: MessageFlags.Ephemeral,
    });
  }
}
