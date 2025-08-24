const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('equip')
        .setDescription('⚔️ Equip items and manage your gear')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item you want to equip')
                .setRequired(true)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const itemName = interaction.options.getString('item');

        try {
            const player = await db.getPlayer(userId) || { inventory: { items: [] }, equipment: {} };

            const embed = new EmbedBuilder()
                .setColor('#8B4513')
                .setTitle('⚔️ Equipment System')
                .setDescription(`Attempting to equip: ${itemName}`)
                .addFields(
                    { name: '🎒 Status', value: 'Equipment system coming soon!', inline: false }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Equip command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while equipping the item.',
                ephemeral: true
            });
        }
    }
};