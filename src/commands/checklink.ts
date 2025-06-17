import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
} from "discord.js";
import { LinkLogger } from "../utils/linkLogger.js";
import { FANDOM_ROLE_MAP, FANDOM_ROLE_IDS, LINKED_ROLE_ID, TOP_CONTRIBUTORS_ROLE_ID } from "../utils/roleConstants.js";
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

export const data = new SlashCommandBuilder()
  .setName("checklink")
  .setDescription("CHECK IF A USER IS LINKED TO FANDOM AND SYNC THEIR ROLES")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("THE DISCORD SOUL TO CHECK")
      .setRequired(true),
  );

async function manageFandomRoles(
  member: GuildMember,
  fandomGroups: string[],
  interactionGuild: ChatInputCommandInteraction['guild'],
): Promise<{ grantedRoleNames: string[], failedRoleNames: string[] }> {
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
  member.roles.cache.forEach(role => {
      if (FANDOM_ROLE_IDS.includes(role.id) && !rolesToGrantIds.includes(role.id)) {
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
  const targetUser = interaction.options.getUser("user", true);
  const targetMember = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);

  if (!interaction.guild) {
    await interaction.reply({
      content: "**THIS SACRED RITE CAN ONLY BE PERFORMED WITHIN THE GUILD HALLS!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!targetMember) {
    await interaction.reply({
      content: "**THE TARGET SOUL IS NOT PRESENT IN THESE SACRED HALLS!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const existingLink = await LinkLogger.getLinkByDiscordId(targetUser.id);
    
    if (!existingLink) {
      const embed = new EmbedBuilder()
        .setColor("#808080")
        .setTitle("🔍 LINK STATUS CHECK")
        .setDescription(`**${targetUser.tag} IS NOT BOUND TO ANY FANDOM ALTER!**`)
        .addFields(
          {
            name: "STATUS",
            value: "UNLINKED",
            inline: true,
          },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    const userQueryUrl = `https://alter-ego.fandom.com/api.php?action=query&format=json&list=users&ususers=${encodeURIComponent(existingLink.fandomUsername)}&usprop=groups%7Cgender%7Cregistration%7Ceditcount`;
    const userQueryResponse = await fetch(userQueryUrl);

    if (!userQueryResponse.ok) {
      throw new Error(`MediaWiki API responded with status: ${userQueryResponse.status}`);
    }
    const userQueryData = (await userQueryResponse.json()) as FandomUserQueryResponse;

    let fandomGroups: string[] = [];
    let fandomDataStatus = "ACTIVE";

    if (!userQueryData.query || !userQueryData.query.users || userQueryData.query.users.length === 0) {
      fandomDataStatus = "FANDOM USER NOT FOUND";
    } else {
      const fandomUser = userQueryData.query.users[0];
      if (fandomUser.missing !== undefined) {
        fandomDataStatus = "FANDOM USER NOT FOUND";
      } else {
        fandomGroups = fandomUser.groups || [];
      }
    }

    let rolesSynced = false;
    let grantedRoleNames: string[] = [];
    let failedRoleNames: string[] = [];
    let topContributorResult: any = { roleGranted: false, roleRemoved: false };

    if (fandomDataStatus === "ACTIVE") {
      const roleResult = await manageFandomRoles(targetMember, fandomGroups, interaction.guild);
      grantedRoleNames = roleResult.grantedRoleNames;
      failedRoleNames = roleResult.failedRoleNames;
      
      topContributorResult = await TopContributorsManager.manageTopContributorRole(targetMember, existingLink.fandomUsername);
      
      rolesSynced = true;
    }

    const embed = new EmbedBuilder()
      .setColor(fandomDataStatus === "ACTIVE" ? "#00FF00" : "#FFA500")
      .setTitle("🔍 LINK STATUS CHECK & SYNC")
      .setDescription(`**${targetUser.tag} IS BOUND TO FANDOM ALTER: ${existingLink.fandomUsername}**`)
      .addFields(
        {
          name: "DISCORD USER",
          value: `${targetUser.tag}`,
          inline: true,
        },
        {
          name: "FANDOM ALTER",
          value: `${existingLink.fandomUsername}`,
          inline: true,
        },
        {
          name: "FANDOM STATUS",
          value: fandomDataStatus,
          inline: true,
        },
        {
          name: "LINKED ON",
          value: `<t:${Math.floor(new Date(existingLink.linkedAt).getTime() / 1000)}:F>`,
          inline: true,
        },
        {
          name: "ROLE SYNC",
          value: rolesSynced ? "PERFORMED" : "SKIPPED (FANDOM DATA UNAVAILABLE)",
          inline: true,
        }
      );

    if (rolesSynced) {
      let allGrantedRoles = [...grantedRoleNames];
      if (topContributorResult.roleGranted) {
        const topRole = interaction.guild?.roles.cache.get(TOP_CONTRIBUTORS_ROLE_ID);
        if (topRole) allGrantedRoles.push(topRole.name);
      }
      
      if (allGrantedRoles.length > 0) {
        const roleMentions = allGrantedRoles.map(name => {
          const linkedRole = interaction.guild?.roles.cache.get(LINKED_ROLE_ID);
          if (linkedRole && linkedRole.name === name) {
              return `<@&${LINKED_ROLE_ID}>`;
          }
          
          const topRole = interaction.guild?.roles.cache.get(TOP_CONTRIBUTORS_ROLE_ID);
          if (topRole && topRole.name === name) {
              return `<@&${TOP_CONTRIBUTORS_ROLE_ID}>`;
          }
          
          const roleEntry = Object.entries(FANDOM_ROLE_MAP).find(([, id]) => interaction.guild?.roles.cache.get(id)?.name === name);
          return roleEntry ? `<@&${roleEntry[1]}>` : `\`${name}\``;
        }).join(", ");
        embed.addFields({ name: "ROLES SYNCHRONIZED", value: roleMentions });
      } else {
        embed.addFields({ name: "ROLES SYNCHRONIZED", value: "No Fandom specific roles were applicable or needed changes." });
      }

      if (topContributorResult.rank) {
        embed.addFields({ name: "TOP CONTRIBUTOR STATUS", value: `**🏆 RANK #${topContributorResult.rank}** in current week's top contributors!` });
      } else if (topContributorResult.roleRemoved) {
        embed.addFields({ name: "TOP CONTRIBUTOR STATUS", value: "No longer in top 5 contributors - role removed." });
      }

      if (failedRoleNames.length > 0) {
        embed.addFields({ name: "ROLE SYNC ISSUES", value: `Failed to grant: ${failedRoleNames.map(rName => `\`${rName}\``).join(", ")}.` });
        embed.setColor("#FFA500");
      }

      if (fandomGroups.length > 0) {
        embed.addFields({ name: "FANDOM GROUPS", value: fandomGroups.map(group => `\`${group}\``).join(", ") });
      }
    }

    if (fandomDataStatus !== "ACTIVE") {
      embed.addFields({ 
        name: "⚠️ WARNING", 
        value: "The linked Fandom account could not be found. The user may need to re-link their account or the Fandom username may have changed." 
      });
    }

    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error("Error during link check:", error);
    await interaction.reply({
      content: "**A DISTURBANCE IN THE SACRED HALLS! The link check ritual failed. The oracles are perplexed. Try again later, or consult the high scribes.**",
      flags: MessageFlags.Ephemeral,
    });
  }
}