
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('socialize')
        .setDescription('🍻 Socialize with other adventurers in the tavern')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Choose your social action')
                .setRequired(false)
                .addChoices(
                    { name: 'Buy drinks for everyone', value: 'buy_drinks' },
                    { name: 'Tell a story', value: 'tell_story' },
                    { name: 'Listen to gossip', value: 'listen_gossip' },
                    { name: 'Start a conversation', value: 'start_chat' }
                )),

    async execute(interaction) {
        const userId = interaction.user.id;
        const action = interaction.options.getString('action') || 'start_chat';
        
        try {
            const player = await db.getPlayer(userId) || { coins: 100, level: 1 };

            const embed = new EmbedBuilder()
                .setColor('#D35400')
                .setTitle('🍻 Tavern Socializing')
                .setDescription(`You decided to ${action.replace('_', ' ')} in the tavern!`)
                .addFields(
                    { name: '🎭 Social Activity', value: 'The tavern is bustling with activity!', inline: false },
                    { name: '💬 Result', value: 'Social features coming soon!', inline: false }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Social command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while socializing.',
                ephemeral: true
            });
        }
    }
};
