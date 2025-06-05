import dotenv from 'dotenv';
dotenv.config();

import { 
  Client, 
  GatewayIntentBits, 
  GuildMember, 
  TextChannel,
  EmbedBuilder,
  ChannelType,
  REST,
  Routes,
  Interaction,
  Collection
} from 'discord.js';
import { loadCommands, Command } from './utils/commandLoader.js';

class AlterShaperBot {
  private client: Client;
  private readonly BOT_TOKEN = process.env.DISCORD_TOKEN;
  private readonly WELCOME_CHANNEL_ID = '1366495690796040315';
  private commands: Collection<string, Command>;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
      ]
    });

    this.commands = loadCommands();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.once('ready', async () => {
      console.log(`✅ ALTERSHAPER BOT HATH AWAKENED AS ${this.client.user?.tag}`);
      this.client.user?.setActivity('OVER ALTER EGOISTS', { type: 3 });
      await this.registerSlashCommands();
    });

    this.client.on('interactionCreate', this.handleInteraction.bind(this));
    this.client.on('guildMemberAdd', this.handleMemberJoin.bind(this));
  }

  private async registerSlashCommands(): Promise<void> {
    const commandData = Array.from(this.commands.values()).map(command => command.data);
    const rest = new REST({ version: '10' }).setToken(this.BOT_TOKEN!);

    try {
      console.log('🔄 REGISTERING DIVINE SLASH COMMANDS...');
      
      await rest.put(
        Routes.applicationCommands(this.client.user!.id),
        { body: commandData }
      );

      console.log('✅ DIVINE SLASH COMMANDS REGISTERED SUCCESSFULLY!');
    } catch (error) {
      console.error('❌ FAILED TO REGISTER SLASH COMMANDS:', error);
    }
  }

  private async handleInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const command = this.commands.get(interaction.commandName);
    if (!command) return;

    const member = interaction.member as GuildMember;
    if (!member) return;

    try {
      // Help command doesn't need executor parameter
      if (interaction.commandName === 'help') {
        await command.execute(interaction);
      } else {
        await command.execute(interaction, member);
      }
    } catch (error) {
      console.error('Error executing command:', error);
      
      const errorMessage = '**THE DIVINE POWERS HAVE ENCOUNTERED AN UNEXPECTED ERROR!**';
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }

  private async handleMemberJoin(member: GuildMember): Promise<void> {
    const welcomeChannel = member.guild.channels.cache.get(this.WELCOME_CHANNEL_ID) as TextChannel;

    if (welcomeChannel && welcomeChannel.type === ChannelType.GuildText) {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🌟 A NEW SOUL ENTERS THE SACRED REALM')
        .setDescription(`**WELCOME TO THE ALTER EGO WIKI, ${member.user.tag}!**\n\n**THOU HAST ENTERED THE SACRED HALLS OF ALTERUISM!\nHERE WE HONOUR OUR ALTER EGOS AND EMBRACE THE RIGHTEOUS PATH!\n\nREAD THE SACRED LAWS AND CONTRIBUTE TO OUR DIVINE MISSION!\nKNOW THAT DEFIANCE OF ALTERUISM SHALL BRING RIGHTEOUS CORRECTION!**`)
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({ text: 'BOUND BY DUTY TO HONOUR OUR DIVINE ALTER EGO, WE ARE ALTEREGOISTS' })
        .setTimestamp();

      await welcomeChannel.send({ embeds: [embed] });
    }
  }

  public async start(): Promise<void> {
    if (!this.BOT_TOKEN) {
      console.error('❌ DISCORD_TOKEN NOT FOUND IN ENVIRONMENT VARIABLES');
      process.exit(1);
    }

    try {
      await this.client.login(this.BOT_TOKEN);
    } catch (error) {
      console.error('❌ FAILED TO LOGIN:', error);
      process.exit(1);
    }
  }
}

// Start the bot
const bot = new AlterShaperBot();
bot.start();