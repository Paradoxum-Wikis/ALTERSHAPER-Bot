import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

function cleanWikitext(text: string): string {
  text = text.replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, '$2');
  text = text.replace(/'''([^']+)'''/g, '$1');
  text = text.replace(/''([^']+)''/g, '$1');
  return text;
}

export const data = new SlashCommandBuilder()
  .setName('tdstrivia')
  .setDescription('Get a random trivia fact from the TDS Wiki');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const response = await fetch('https://tds.fandom.com/wiki/Template:DYKBoxContent?action=raw');
    if (!response.ok) {
      throw new Error('Failed to fetch trivia');
    }
    const text = await response.text();
    const options = Array.from(text.matchAll(/<option>(.*?)<\/option>/gs), m => m[1].trim());
    if (options.length === 0) {
      throw new Error('No trivia options found');
    }
    const trivia = options[Math.floor(Math.random() * options.length)];
    const cleanedTrivia = cleanWikitext(trivia);
    const embed = new EmbedBuilder()
      .setColor('#33577A')
      .setTitle('📚 TDS Trivia')
      .setDescription(cleanedTrivia)
      .setFooter({ text: 'Verily, I have drawn forth this knowledge from the annals of the TDS Wiki.' })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error fetching trivia:', error);
    await interaction.reply({ content: 'The fetching of trivia hath failed. Prithee, attempt once more anon.', ephemeral: true });
  }
}