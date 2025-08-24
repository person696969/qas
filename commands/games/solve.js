
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamesolve')
        .setDescription('🎮 Solve game puzzles and challenges')
        .addStringOption(option =>
            option.setName('answer')
                .setDescription('Your solution to the game puzzle')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of game puzzle')
                .addChoices(
                    { name: 'Word Puzzle', value: 'word' },
                    { name: 'Number Game', value: 'number' },
                    { name: 'Logic Puzzle', value: 'logic' }
                )),

    async execute(interaction) {
        const answer = interaction.options.getString('answer');
        const puzzleType = interaction.options.getString('type') || 'word';
        const userId = interaction.user.id;

        try {
            const userData = await db.getPlayer(userId);
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.info)
                .setTitle('🎮 Game Puzzle Solved!')
                .setDescription(`You attempted to solve a ${puzzleType} puzzle with answer: "${answer}"`)
                .addFields([
                    { name: '🎯 Puzzle Type', value: puzzleType, inline: true },
                    { name: '💭 Your Answer', value: answer, inline: true },
                    { name: '🏆 Status', value: 'Processing...', inline: true }
                ])
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Game solve command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing the game puzzle.',
                ephemeral: true
            });
        }
    }
};
