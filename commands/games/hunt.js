const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hunts')
        .setDescription('🏹 Go on treasure hunting expeditions')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Choose hunting location')
                .setRequired(false)
                .addChoices(
                    { name: 'Forest', value: 'forest' },
                    { name: 'Cave', value: 'cave' },
                    { name: 'Mountain', value: 'mountain' },
                    { name: 'Ocean', value: 'ocean' }
                )),

    async execute(interaction) {
        const userId = interaction.user.id;
        const location = interaction.options.getString('location') || 'forest';

        try {
            const player = await db.getPlayer(userId) || { coins: 100, level: 1 };
            const treasureFound = Math.random() > 0.5;
            const reward = treasureFound ? Math.floor(Math.random() * 200) + 50 : 0;

            if (treasureFound) {
                player.coins = (player.coins || 0) + reward;
                await db.updatePlayer(userId, player);
            }

            const embed = new EmbedBuilder()
                .setColor(treasureFound ? '#F1C40F' : '#95A5A6')
                .setTitle('🏹 Hunt Results')
                .setDescription(`You hunted in the ${location}...`)
                .addFields(
                    {
                        name: treasureFound ? '💰 Treasure Found!' : '❌ No Luck',
                        value: treasureFound ? `Found ${reward} coins!` : 'Better luck next time!',
                        inline: false
                    }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Hunt command error:', error);
            await interaction.reply({
                content: '❌ An error occurred during the hunt.',
                ephemeral: true
            });
        }
    }
};