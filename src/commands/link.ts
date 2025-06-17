import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
} from "discord.js";
import { LinkLogger } from "../utils/linkLogger.js";

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

const FANDOM_ROLE_MAP: Record<string, string> = {
  "threadmoderator": "1366509892386553866",
  "content-moderator": "1366510432168185926",
  "sysop": "1366509321340588162",
  "bureaucrat": "1366507366681673920",
};
const FANDOM_ROLE_IDS = Object.values(FANDOM_ROLE_MAP);
const LINKED_ROLE_ID = "1384535350621241466";


export const data = new SlashCommandBuilder()
  .setName("link")
  .setDescription("LINK THY DISCORD ACCOUNT WITH THY FANDOM ACCOUNT")
  .addStringOption((option) =>
    option
      .setName("fandomusername")
      .setDescription("THY USERNAME ON FANDOM")
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
  const fandomUsernameInput = interaction.options.getString("fandomusername", true);
  const member = interaction.member as GuildMember;

  if (!interaction.guild) {
    await interaction.reply({
      content: "**THIS SACRED RITE CAN ONLY BE PERFORMED WITHIN THE GUILD HALLS!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const userQueryUrl = `https://alter-ego.fandom.com/api.php?action=query&format=json&list=users&ususers=${encodeURIComponent(fandomUsernameInput)}&usprop=groups%7Cgender%7Cregistration%7Ceditcount`;
    const userQueryResponse = await fetch(userQueryUrl);

    if (!userQueryResponse.ok) {
      throw new Error(`MediaWiki API responded with status: ${userQueryResponse.status}`);
    }
    const userQueryData = (await userQueryResponse.json()) as FandomUserQueryResponse;

    if (!userQueryData.query || !userQueryData.query.users || userQueryData.query.users.length === 0) {
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

    const existingLink = await LinkLogger.getLinkByDiscordId(interaction.user.id);
    if (existingLink) {
      if (existingLink.fandomUserId !== fandomUserId) {
        await interaction.reply({
          content: `**THY ALTER IS ALREADY BOUND TO A DIFFERENT FANDOM PRESENCE (${existingLink.fandomUsername})!**`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const { grantedRoleNames, failedRoleNames } = await manageFandomRoles(member, fandomGroups, interaction.guild);
      
      const syncEmbed = new EmbedBuilder()
        .setColor(failedRoleNames.length > 0 ? "#FFA500" : "#00FF00")
        .setTitle("🔗 ALTERS SYNCHRONIZED!")
        .setDescription(`**THY LINK TO FANDOM ALTER "${canonicalFandomUsername}" IS CONFIRMED AND ROLES SYNCHRONIZED!**`);
      
      if (grantedRoleNames.length > 0) {
        const roleMentions = grantedRoleNames.map(name => {
          const roleEntry = Object.entries(FANDOM_ROLE_MAP).find(([, id]) => interaction.guild?.roles.cache.get(id)?.name === name);
          return roleEntry ? `<@&${roleEntry[1]}>` : `\`${name}\``;
        }).join(", ");
        syncEmbed.addFields({ name: "ROLES ENSURED/GRANTED", value: roleMentions });
      } else {
        syncEmbed.addFields({ name: "ROLES STATUS", value: "No new Fandom specific roles were applicable or needed granting at this time." });
      }
      if (failedRoleNames.length > 0) {
        syncEmbed.addFields({ name: "ROLE GRANTING ISSUES", value: `Failed to grant: ${failedRoleNames.map(rName => `\`${rName}\``).join(", ")}.` });
      }
      
      await interaction.reply({ embeds: [syncEmbed] });
      return;
    }

    const fandomAccountAlreadyLinked = await LinkLogger.getLinkByFandomId(fandomUserId);
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
      throw new Error(`Fandom API responded with status: ${userProfileResponse.status}`);
    }
    const userProfileData = (await userProfileResponse.json()) as FandomUserProfileResponse;

    if (!userProfileData.userData || !userProfileData.userData.discordHandle) {
      await interaction.reply({
        content: `**THE ALTER "${canonicalFandomUsername}" HATH NOT REVEALED ONE'S DISCORD HANDLE ON THE PROFILE!**\nMake sure thy Discord handle is set on thy Fandom user profile.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const fandomDiscordHandle = userProfileData.userData.discordHandle;
    const discordUserIdentifierToCompare = interaction.user.username;

    if (fandomDiscordHandle.toLowerCase() !== discordUserIdentifierToCompare.toLowerCase()) {
    await interaction.reply({
        content: `**A MISMATCH IN THE ASTRAL STREAMS!**\nThe Discord handle on Fandom ("${fandomDiscordHandle}") doth not align with thy current Discord username ("${interaction.user.username}"). Update thy Fandom profile, then try again.`,
        flags: MessageFlags.Ephemeral,
    });
    return;
    }

    const { grantedRoleNames, failedRoleNames } = await manageFandomRoles(member, fandomGroups, interaction.guild);
    await LinkLogger.addLink(interaction.user.id, interaction.user.tag, canonicalFandomUsername, fandomUserId);

    const successEmbed = new EmbedBuilder()
      .setColor(failedRoleNames.length > 0 ? "#FFA500" : "#00FF00")
      .setTitle("🔗 ALTERS INTERTWINED!")
      .setDescription(`**PRAISE BE! Thy Discord presence, ${interaction.user.tag}, is now divinely linked with thy Fandom alter: ${canonicalFandomUsername}!**`);
    
    if (grantedRoleNames.length > 0) {
        const roleMentions = grantedRoleNames.map(name => {
            const roleEntry = Object.entries(FANDOM_ROLE_MAP).find(([, id]) => interaction.guild?.roles.cache.get(id)?.name === name);
            return roleEntry ? `<@&${roleEntry[1]}>` : `\`${name}\``;
        }).join(", ");
      successEmbed.addFields({ name: "ROLES BESTOWED/CONFIRMED", value: roleMentions });
    } else {
      successEmbed.addFields({ name: "ROLES STATUS", value: "No specific Fandom staff roles were applicable at this time." });
    }
    if (failedRoleNames.length > 0) {
        successEmbed.addFields({ name: "ROLE GRANTING ISSUES", value: `Failed to grant: ${failedRoleNames.map(rName => `\`${rName}\``).join(", ")}.`});
    }

    await interaction.reply({ embeds: [successEmbed] });

  } catch (error) {
    console.error("Error during Fandom account linking:", error);
    await interaction.reply({
      content: "**A DISTURBANCE IN THE SCARED HALLS! The linking ritual failed. The oracles are perplexed. Try again later, or consult the high scribes.**",
      flags: MessageFlags.Ephemeral,
    });
  }
}