
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('💼 Work various jobs to earn coins and experience')
        .addStringOption(option =>
            option.setName('job')
                .setDescription('Choose a job to work')
                .setRequired(false)
                .addChoices(
                    { name: 'Farmer', value: 'farmer' },
                    { name: 'Miner', value: 'miner' },
                    { name: 'Merchant', value: 'merchant' },
                    { name: 'Guard', value: 'guard' }
                )),

    async execute(interaction) {
        const userId = interaction.user.id;
        const job = interaction.options.getString('job') || 'farmer';
        
        try {
            const player = await db.getPlayer(userId) || { coins: 100, level: 1 };
            const earnings = Math.floor(Math.random() * 100) + 50;

            // Update player coins
            player.coins = (player.coins || 0) + earnings;
            await db.updatePlayer(userId, player);

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('💼 Work Complete!')
                .setDescription(`You worked as a ${job} and earned ${earnings} coins!`)
                .addFields(
                    { name: '💰 Earnings', value: `+${earnings} coins`, inline: true },
                    { name: '💳 Total Coins', value: `${player.coins} coins`, inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Work command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while working.',
                ephemeral: true
            });
        }
    }
};
