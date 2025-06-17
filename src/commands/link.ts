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

export async function execute(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  const fandomUsernameInput = interaction.options.getString("fandomusername", true);

  if (!interaction.guild) {
    await interaction.reply({
      content: "**THIS SACRED RITE CAN ONLY BE PERFORMED WITHIN THE GUILD HALLS!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const existingLink = await LinkLogger.getLinkByDiscordId(interaction.user.id);
  if (existingLink) {
    await interaction.reply({
      content: `**THY ALTER IS ALREADY BOUND! THOU ART LINKED WITH: ${existingLink.fandomUsername}.**`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    // Get Fandom user id
    const userQueryUrl = `https://tds.fandom.com/api.php?action=query&format=json&list=users&ususers=${encodeURIComponent(fandomUsernameInput)}`;
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
    const fandomAccountAlreadyLinked = await LinkLogger.getLinkByFandomId(fandomUserId);
    if (fandomAccountAlreadyLinked && fandomAccountAlreadyLinked.discordUserId !== interaction.user.id) {
        await interaction.reply({
        content: `**THE ALTER "${canonicalFandomUsername}" IS ALREADY BOUND TO ANOTHER DISCORD PRESENCE!**`,
        flags: MessageFlags.Ephemeral,
        });
        return;
    }


    // Get user profile data
    const userProfileUrl = `https://tds.fandom.com/wikia.php?controller=UserProfile&method=getUserData&format=json&userId=${fandomUserId}`;
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

    // Verification
    const fandomDiscordHandle = userProfileData.userData.discordHandle;
    const discordUserIdentifierToCompare = interaction.user.username;

    if (fandomDiscordHandle !== discordUserIdentifierToCompare) {
    await interaction.reply({
        content: `**A MISMATCH IN THE ASTRAL STREAMS!**\nThe Discord handle on Fandom ("${fandomDiscordHandle}") doth not align with thy current Discord username ("${interaction.user.username}"). Update thy Fandom profile, then try again.`,
        flags: MessageFlags.Ephemeral,
    });
    return;
    }

    // Grant role and log
    const member = interaction.member as GuildMember;
    try {
      await member.roles.add(LINKED_ROLE_ID);
    } catch (roleError) {
      console.error(`Failed to grant role ${LINKED_ROLE_ID} to ${interaction.user.tag}:`, roleError);
      await interaction.reply({
        content: "**A CELESTIAL SNAG! Thy Fandom account is verified, but the sacred role could not be bestowed. Alert the scribes!**",
        flags: MessageFlags.Ephemeral,
      });
      await LinkLogger.addLink(interaction.user.id, interaction.user.tag, canonicalFandomUsername, fandomUserId);
      return;
    }

    await LinkLogger.addLink(interaction.user.id, interaction.user.tag, canonicalFandomUsername, fandomUserId);

    const successEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("🔗 ALTERS INTERTWINED!")
      .setDescription(`**PRAISE BE! Thy Discord presence, ${interaction.user.tag}, is now divinely linked with thy Fandom alter: ${canonicalFandomUsername}!**`)
      .addFields({ name: "ROLE GRANTED", value: `<@&${LINKED_ROLE_ID}> bestowed upon thee!` })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });

  } catch (error) {
    console.error("Error during Fandom account linking:", error);
    await interaction.reply({
      content: "**A DISTURBANCE IN THE SCARED HALLS! The linking ritual failed. The oracles are perplexed. Try again later, or consult the high scribes.**",
      flags: MessageFlags.Ephemeral,
    });
  }
}