import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { LinkLogger } from "../utils/linkLogger.js";
import {
  FANDOM_ROLE_MAP,
  FANDOM_ROLE_IDS,
  LINKED_ROLE_ID,
  TOP_CONTRIBUTORS_ROLE_ID,
} from "../utils/roleConstants.js";
import { TopContributorsManager } from "../utils/topContributors.js";

interface FandomUserQueryUser {
  userid: number;
  name: string;
  missing?: string;
  groups?: string[];
  editcount?: number;
  registration?: string;
  gender?: string;
}

interface FandomUserQueryResponse {
  batchcomplete: string;
  query?: {
    users: FandomUserQueryUser[];
  };
}

interface FandomUserProfileData {
  id: number;
  username: string;
  discordHandle?: string;
}

interface FandomUserProfileResponse {
  userData?: FandomUserProfileData;
}

export const data = new SlashCommandBuilder()
  .setName("link")
  .setDescription("Link thy Discord soul with thy Fandom account")
  .addStringOption((option) =>
    option
      .setName("fandomusername")
      .setDescription("Thy username on Fandom")
      .setRequired(true),
  );

async function manageFandomRoles(
  member: GuildMember,
  fandomGroups: string[],
  interactionGuild: ChatInputCommandInteraction["guild"],
): Promise<{ grantedRoleNames: string[]; failedRoleNames: string[] }> {
  const rolesToGrantIds: string[] = [];
  const grantedRoleNames: string[] = [];
  const failedRoleNames: string[] = [];

  rolesToGrantIds.push(LINKED_ROLE_ID);

  for (const group of fandomGroups) {
    const roleId = FANDOM_ROLE_MAP[group.toLowerCase()];
    if (roleId) {
      rolesToGrantIds.push(roleId);
    }
  }

  let rolesToRemoveFromMember: string[] = [];
  member.roles.cache.forEach((role) => {
    if (
      FANDOM_ROLE_IDS.includes(role.id) &&
      !rolesToGrantIds.includes(role.id)
    ) {
      rolesToRemoveFromMember.push(role.id);
    }
  });

  if (rolesToRemoveFromMember.length > 0) {
    try {
      await member.roles.remove(rolesToRemoveFromMember);
    } catch (e) {
      console.error("Error removing roles from member:", e);
    }
  }

  for (const roleId of rolesToGrantIds) {
    if (member.roles.cache.has(roleId)) {
      const role = interactionGuild?.roles.cache.get(roleId);
      if (role) grantedRoleNames.push(role.name);
      continue;
    }
    try {
      await member.roles.add(roleId);
      const role = interactionGuild?.roles.cache.get(roleId);
      if (role) grantedRoleNames.push(role.name);
    } catch (error) {
      const role = interactionGuild?.roles.cache.get(roleId);
      if (role) failedRoleNames.push(role.name);
    }
  }
  return { grantedRoleNames, failedRoleNames };
}

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const fandomUsernameInput = interaction.options.getString(
    "fandomusername",
    true,
  );
  const member = interaction.member as GuildMember;

  if (!interaction.guild) {
    await interaction.reply({
      content:
        "**THIS SACRED RITE CAN ONLY BE PERFORMED WITHIN THE SACRED HALLS!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const userQueryUrl = `https://alter-ego.fandom.com/api.php?action=query&format=json&list=users&ususers=${encodeURIComponent(fandomUsernameInput)}&usprop=groups%7Cgender%7Cregistration%7Ceditcount`;
    const userQueryResponse = await fetch(userQueryUrl);

    if (!userQueryResponse.ok) {
      throw new Error(
        `MediaWiki API responded with status: ${userQueryResponse.status}`,
      );
    }
    const userQueryData =
      (await userQueryResponse.json()) as FandomUserQueryResponse;

    if (
      !userQueryData.query ||
      !userQueryData.query.users ||
      userQueryData.query.users.length === 0
    ) {
      await interaction.reply({
        content: `**THE ORACLES FIND NO ALTER NAMED "${fandomUsernameInput}"! CHECK THY SPELLING, MORTAL!**`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const fandomUser = userQueryData.query.users[0];
    if (fandomUser.missing !== undefined) {
      await interaction.reply({
        content: `**THE ORACLES FIND NO ALTER NAMED "${fandomUsernameInput}"! CHECK THY SPELLING, MORTAL!**`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const fandomUserId = fandomUser.userid;
    const canonicalFandomUsername = fandomUser.name;
    const fandomGroups = fandomUser.groups || [];

    const existingLink = await LinkLogger.getLinkByDiscordId(
      interaction.user.id,
    );
    if (existingLink) {
      if (existingLink.fandomUserId !== fandomUserId) {
        await interaction.reply({
          content: `**THY SOUL AND PRESENCE IS ALREADY BOUND TO A DIFFERENT FANDOM ALTER (${existingLink.fandomUsername})!**`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const { grantedRoleNames, failedRoleNames } = await manageFandomRoles(
        member,
        fandomGroups,
        interaction.guild,
      );

      const topContributorResult =
        await TopContributorsManager.manageTopContributorRole(
          member,
          canonicalFandomUsername,
        );

      const syncEmbed = new EmbedBuilder()
        .setColor(failedRoleNames.length > 0 ? "#FFA500" : "#00FF00")
        .setTitle("🔗 ALTER AND SOUL SYNCHRONIZED!")
        .setDescription(
          `**THY LINK TO FANDOM ALTER "${canonicalFandomUsername}" IS CONFIRMED AND ROLES HAVE BEEN SYNCHRONIZED!**`,
        );

      let allGrantedRoles = [...grantedRoleNames];
      if (topContributorResult.roleGranted) {
        const topRole = interaction.guild?.roles.cache.get(
          TOP_CONTRIBUTORS_ROLE_ID,
        );
        if (topRole) allGrantedRoles.push(topRole.name);
      }

      if (allGrantedRoles.length > 0) {
        const roleMentions = allGrantedRoles
          .map((name) => {
            const linkedRole =
              interaction.guild?.roles.cache.get(LINKED_ROLE_ID);
            if (linkedRole && linkedRole.name === name) {
              return `<@&${LINKED_ROLE_ID}>`;
            }

            const topRole = interaction.guild?.roles.cache.get(
              TOP_CONTRIBUTORS_ROLE_ID,
            );
            if (topRole && topRole.name === name) {
              return `<@&${TOP_CONTRIBUTORS_ROLE_ID}>`;
            }

            const roleEntry = Object.entries(FANDOM_ROLE_MAP).find(
              ([, id]) => interaction.guild?.roles.cache.get(id)?.name === name,
            );
            return roleEntry ? `<@&${roleEntry[1]}>` : `\`${name}\``;
          })
          .join(", ");
        syncEmbed.addFields({
          name: "ROLES ENSURED/GRANTED",
          value: roleMentions,
        });
      } else {
        syncEmbed.addFields({
          name: "ROLES STATUS",
          value:
            "No new Fandom specific roles were applicable or needed granting at this time.",
        });
      }

      if (topContributorResult.rank) {
        syncEmbed.addFields({
          name: "TOP CONTRIBUTOR STATUS",
          value: `**RANK #${topContributorResult.rank}** in current week's top contributors!`,
        });
      }

      if (failedRoleNames.length > 0) {
        syncEmbed.addFields({
          name: "ROLE GRANTING ISSUES",
          value: `Failed to grant: ${failedRoleNames.map((rName) => `\`${rName}\``).join(", ")}.`,
        });
      }

      await interaction.reply({ embeds: [syncEmbed] });
      return;
    }

    const fandomAccountAlreadyLinked =
      await LinkLogger.getLinkByFandomId(fandomUserId);
    if (fandomAccountAlreadyLinked) {
      await interaction.reply({
        content: `**THE ALTER "${canonicalFandomUsername}" IS ALREADY BOUND TO ANOTHER DISCORD PRESENCE!**`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const userProfileUrl = `https://alter-ego.fandom.com/wikia.php?controller=UserProfile&method=getUserData&format=json&userId=${fandomUserId}`;
    const userProfileResponse = await fetch(userProfileUrl);

    if (!userProfileResponse.ok) {
      throw new Error(
        `Fandom API responded with status: ${userProfileResponse.status}`,
      );
    }
    const userProfileData =
      (await userProfileResponse.json()) as FandomUserProfileResponse;

    if (!userProfileData.userData || !userProfileData.userData.discordHandle) {
      const profileUrl = `https://alter-ego.fandom.com/wiki/User:${encodeURIComponent(canonicalFandomUsername)}`;
      const tutorialEmbed = new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("❓ HOW TO LINK YOUR FANDOM ACCOUNT")
        .setDescription(
          `**The alter "${canonicalFandomUsername}" hath not revealed one's Discord handle on the profile!**\n\n` +
          `To link your Discord, follow these steps:\n\n` +
          `1. Visit your Fandom profile: [Edit Profile](${profileUrl})\n` +
          `2. Click the **"Edit profile"** button on the top right of your user page.\n` +
          `3. Find the **"Discord"** field.\n` +
          `4. Enter your Discord username (e.g. \`${interaction.user.username}\`).\n` +
          `5. Save your profile.\n\n` +
          `Once done, run this command again.`
        )
        .setFooter({ text: "If you have set your Discord and still see this, double-check for typos or try again in a few minutes." });

      await interaction.reply({
        embeds: [tutorialEmbed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const fandomDiscordHandle = userProfileData.userData.discordHandle;
    const discordUserIdentifierToCompare = interaction.user.username;

    if (
      fandomDiscordHandle.toLowerCase() !==
      discordUserIdentifierToCompare.toLowerCase()
    ) {
      const profileUrl = `https://alter-ego.fandom.com/wiki/User:${encodeURIComponent(canonicalFandomUsername)}`;
      const tutorialEmbed = new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("❓ DISCORD HANDLE MISMATCH")
        .setDescription(
          `**A mismatch in the Dirac sea!**\n\n` +
          `The Discord handle on Fandom ("${fandomDiscordHandle}") doth not align with thy current Discord username ("${interaction.user.username}"). Didst thou input the correct username?\n\n` +
          `To fix this:\n` +
          `1. Visit your Fandom profile: [Edit Profile](${profileUrl})\n` +
          `2. Click the **"Edit profile"** button on the top right of your user page.\n` +
          `3. Find the **"Discord"** field.\n` +
          `4. Enter your correct Discord username (\`${interaction.user.username}\`).\n` +
          `5. Save your profile.\n\n` +
          `Once done, run this command again.`
        )
        .setFooter({ text: "If you have set your Discord and still see this, double-check for typos or try again in a few minutes." });

      await interaction.reply({
        embeds: [tutorialEmbed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const confirmationEmbed = new EmbedBuilder()
      .setColor("#FF6B35")
      .setTitle("⚠️ LINKING CONFIRMATION")
      .setDescription(
        `**THOU ART ABOUT TO LINK THY DISCORD SOUL WITH THE FANDOM ALTER: ${canonicalFandomUsername}**`,
      )
      .addFields(
        {
          name: "🔒 PERMANENT ACTION",
          value:
            "**THIS LINKING IS ETERNAL AND CANNOT BE UNDONE WITHOUT ALTERMINISTRATOR INTERVENTION!**",
          inline: false,
        },
        {
          name: "📜 CONFIRMATION REQUIRED",
          value:
            "Make certain this is thy true will. Shouldst thou wish to proceed, click the button below to commence the linking ritual. The oracles shall commune with the Dirac sea and bind thee to thine alter.",
          inline: false,
        },
      )
      .setFooter({ text: `This confirmation will expire in 60 seconds` })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_link")
        .setLabel("🖋️ Confirm Linking")
        .setStyle(ButtonStyle.Primary),
    );

    const reply = await interaction.reply({
      embeds: [confirmationEmbed],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });

    try {
      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
      });

      let confirmed = false;

      // In case I want to move this to non ephemeral later
      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
          await i.reply({
            content: "You cannot confirm another's linking ritual.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        confirmed = true;
        collector.stop();

        const { grantedRoleNames, failedRoleNames } = await manageFandomRoles(
          member,
          fandomGroups,
          interaction.guild,
        );
        await LinkLogger.addLink(
          interaction.user.id,
          interaction.user.tag,
          canonicalFandomUsername,
          fandomUserId,
        );

        const topContributorResult =
          await TopContributorsManager.manageTopContributorRole(
            member,
            canonicalFandomUsername,
          );

        const successEmbed = new EmbedBuilder()
          .setColor(failedRoleNames.length > 0 ? "#FFA500" : "#00FF00")
          .setTitle("🔗 ALTER AND SOUL INTERTWINED!")
          .setDescription(
            `**PRAISE BE! Thy Discord presence, ${interaction.user.tag}, is now divinely linked with thy Fandom alter: ${canonicalFandomUsername}!**`,
          );

        let allGrantedRoles = [...grantedRoleNames];
        if (topContributorResult.roleGranted) {
          const topRole = interaction.guild?.roles.cache.get(
            TOP_CONTRIBUTORS_ROLE_ID,
          );
          if (topRole) allGrantedRoles.push(topRole.name);
        }

        if (allGrantedRoles.length > 0) {
          const roleMentions = allGrantedRoles
            .map((name) => {
              const linkedRole =
                interaction.guild?.roles.cache.get(LINKED_ROLE_ID);
              if (linkedRole && linkedRole.name === name) {
                return `<@&${LINKED_ROLE_ID}>`;
              }

              const topRole = interaction.guild?.roles.cache.get(
                TOP_CONTRIBUTORS_ROLE_ID,
              );
              if (topRole && topRole.name === name) {
                return `<@&${TOP_CONTRIBUTORS_ROLE_ID}>`;
              }

              const roleEntry = Object.entries(FANDOM_ROLE_MAP).find(
                ([, id]) =>
                  interaction.guild?.roles.cache.get(id)?.name === name,
              );
              return roleEntry ? `<@&${roleEntry[1]}>` : `\`${name}\``;
            })
            .join(", ");
          successEmbed.addFields({
            name: "ROLES BESTOWED",
            value: roleMentions,
          });
        } else {
          successEmbed.addFields({
            name: "ROLES STATUS",
            value:
              "No specific Fandom staff roles were applicable at this time.",
          });
        }

        if (topContributorResult.rank) {
          successEmbed.addFields({
            name: "TOP CONTRIBUTOR STATUS",
            value: `**🏆 CONGRATULATIONS! RANK #${topContributorResult.rank}** in current week's top contributors!`,
          });
        }

        if (failedRoleNames.length > 0) {
          successEmbed.addFields({
            name: "ROLE GRANTING ISSUES",
            value: `Failed to grant: ${failedRoleNames.map((rName) => `\`${rName}\``).join(", ")}.`,
          });
        }

        await i.update({
          embeds: [successEmbed],
          components: [],
        });
      });

      collector.on("end", async () => {
        if (!confirmed) {
          const timeoutEmbed = new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("⏰ LINKING RITUAL EXPIRED")
            .setDescription(
              "**THE LINKING CONFIRMATION HAS EXPIRED. NO CHANGES WERE MADE.**",
            )
            .addFields({
              name: "TO RETRY",
              value:
                "Run the `/link` command again to restart the linking process.",
              inline: false,
            });

          await interaction.editReply({
            embeds: [timeoutEmbed],
            components: [],
          });
        }
      });
    } catch (error) {
      const timeoutEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("⏰ LINKING RITUAL EXPIRED")
        .setDescription(
          "**THE LINKING CONFIRMATION HAS EXPIRED. NO CHANGES WERE MADE.**",
        )
        .addFields({
          name: "TO RETRY",
          value:
            "Run the `/link` command again to restart the linking process.",
          inline: false,
        });

      await interaction.editReply({
        embeds: [timeoutEmbed],
        components: [],
      });
    }
  } catch (error) {
    console.error("Error during Fandom account linking:", error);
    await interaction.reply({
      content:
        "**A DISTURBANCE IN THE SCARED HALLS! The linking ritual failed. The oracles are perplexed. Try again later, or consult the high scribes.**",
      flags: MessageFlags.Ephemeral,
    });
  }
}
