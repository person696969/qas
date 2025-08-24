const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unequip')
        .setDescription('🎒 Unequip items and return them to inventory')
        .addStringOption(option =>
            option.setName('slot')
                .setDescription('Equipment slot to unequip')
                .setRequired(true)
                .addChoices(
                    { name: 'Weapon', value: 'weapon' },
                    { name: 'Armor', value: 'armor' },
                    { name: 'Accessory', value: 'accessory' }
                )),

    async execute(interaction) {
        const userId = interaction.user.id;
        const slot = interaction.options.getString('slot');

        try {
            const player = await db.getPlayer(userId) || { inventory: { items: [] }, equipment: {} };

            const embed = new EmbedBuilder()
                .setColor('#95A5A6')
                .setTitle('🎒 Unequip Item')
                .setDescription(`Attempting to unequip from: ${slot}`)
                .addFields(
                    { name: '🔄 Status', value: 'Unequip system coming soon!', inline: false }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Unequip command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while unequipping the item.',
                ephemeral: true
            });
        }
    }
};