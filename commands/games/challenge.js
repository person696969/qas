const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('challenge')
        .setDescription('🎯 Challenge another player to various games and competitions')
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('The player you want to challenge')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('game')
                .setDescription('Type of challenge')
                .setRequired(false)
                .addChoices(
                    { name: 'Rock Paper Scissors', value: 'rps' },
                    { name: 'Number Guessing', value: 'guess' },
                    { name: 'Trivia', value: 'trivia' }
                )),

    async execute(interaction) {
        const challenger = interaction.user;
        const opponent = interaction.options.getUser('opponent');
        const gameType = interaction.options.getString('game') || 'rps';

        try {
            if (opponent.id === challenger.id) {
                return await interaction.reply({
                    content: '❌ You cannot challenge yourself!',
                    ephemeral: true
                });
            }

            if (opponent.bot) {
                return await interaction.reply({
                    content: '❌ You cannot challenge bots!',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#E67E22')
                .setTitle('🎯 Challenge Issued!')
                .setDescription(`${challenger} has challenged ${opponent} to a ${gameType} game!`)
                .addFields(
                    { name: '🎮 Game Type', value: gameType, inline: true },
                    { name: '⏱️ Status', value: 'Waiting for opponent response', inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Challenge command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while issuing the challenge.',
                ephemeral: true
            });
        }
    }
};