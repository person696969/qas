const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cast')
        .setDescription('🎣 Cast your fishing line into the water'),

    async execute(interaction) {
        const userId = interaction.user.id;

        try {
            const player = await db.getPlayer(userId) || { coins: 100, level: 1, inventory: { items: [] } };

            const embed = new EmbedBuilder()
                .setColor('#4682B4')
                .setTitle('🎣 Cast Fishing Line')
                .setDescription('Cast your fishing line and wait for a bite!')
                .addFields(
                    { name: '🐟 Fishing Results', value: 'Feature coming soon!', inline: false }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Cast command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while casting your line.',
                ephemeral: true
            });
        }
    }
};