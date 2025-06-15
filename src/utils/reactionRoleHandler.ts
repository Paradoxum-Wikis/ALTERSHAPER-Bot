import { MessageReaction, User, TextChannel, Client } from 'discord.js';

export class ReactionRoleHandler {
  private static readonly REACTION_MESSAGE_ID = '1383900105106522283';
  private static readonly REACTION_CHANNEL_ID = '1366498883001257984';
  private static readonly TARGET_ROLE_ID = '1362093143830298704';
  private static readonly TARGET_EMOJI = '🖋️';
  private static readonly TARGET_GUILD_ID = '1362084781134708907';

  public static async initialize(client: Client): Promise<void> {
    try {
      const guild = client.guilds.cache.get(this.TARGET_GUILD_ID);
      if (!guild) return;

      const channel = guild.channels.cache.get(this.REACTION_CHANNEL_ID) as TextChannel;
      if (!channel) {
        try {
          const fetchedChannel = await guild.channels.fetch(this.REACTION_CHANNEL_ID) as TextChannel;
          if (fetchedChannel) {
            await fetchedChannel.messages.fetch(this.REACTION_MESSAGE_ID);
          }
        } catch (fetchError) {
          console.error("❌ Failed to fetch channel:", fetchError);
        }
        return;
      }

      await channel.messages.fetch(this.REACTION_MESSAGE_ID);
    } catch (error) {
      console.error("❌ Failed to setup reaction roles:", error);
    }
  }

  public static async handleReactionAdd(reaction: MessageReaction, user: User): Promise<void> {
    if (user.bot) return;
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        return;
      }
    }

    if (!reaction.message.guild) return;
    if (reaction.message.id !== this.REACTION_MESSAGE_ID) return;
    if (reaction.emoji.name !== this.TARGET_EMOJI) return;
    
    const member = reaction.message.guild.members.cache.get(user.id);
    if (!member) return;

    try {
      await member.roles.add(this.TARGET_ROLE_ID);
      console.log(`✅ ROLE GRANTED TO ${user.tag} FOR REACTING WITH PEN_FOUNTAIN`);
    } catch (error) {
      console.error('❌ Failed to grant role:', error);
    }
  }

  public static async handleReactionRemove(reaction: MessageReaction, user: User): Promise<void> {
    if (user.bot) return;
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        return;
      }
    }

    if (!reaction.message.guild) return;
    if (reaction.message.id !== this.REACTION_MESSAGE_ID) return;
    if (reaction.emoji.name !== this.TARGET_EMOJI) return;
    
    const member = reaction.message.guild.members.cache.get(user.id);
    if (!member) return;

    try {
      await member.roles.remove(this.TARGET_ROLE_ID);
      console.log(`❌ ROLE REMOVED FROM ${user.tag} FOR REMOVING PEN_FOUNTAIN`);
    } catch (error) {
      console.error('❌ Failed to remove role:', error);
    }
  }
}