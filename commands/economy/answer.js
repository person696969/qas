const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('answer')
        .setDescription('💡 Answer riddles and trivia questions for rewards')
        .addStringOption(option =>
            option.setName('response')
                .setDescription('Your answer to the current question')
                .setRequired(true)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const answer = interaction.options.getString('response');

        try {
            const player = await db.getPlayer(userId) || { coins: 100, level: 1 };

            const embed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle('💡 Answer System')
                .setDescription(`Your answer: "${answer}"`)
                .addFields(
                    { name: '🎯 Result', value: 'Answer processing system coming soon!', inline: false }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Answer command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your answer.',
                ephemeral: true
            });
        }
    }
};