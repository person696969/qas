const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('solve')
        .setDescription('🧩 Solve puzzles and riddles to earn rewards')
        .addStringOption(option =>
            option.setName('answer')
                .setDescription('Your answer to the current puzzle')
                .setRequired(true)),

    async execute(interaction) {
        const answer = interaction.options.getString('answer').toLowerCase();
        const userId = interaction.user.id;

        try {
            const userData = await db.getPlayer(userId);
            const correctAnswer = userData.currentRiddle?.answer?.toLowerCase();

            if (!userData.currentRiddle) {
                return await interaction.reply({
                    content: '❓ You don\'t have an active puzzle! Use `/riddle` to get one.',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(answer === correctAnswer ? config.embedColors.success : config.embedColors.error)
                .setTimestamp();

            if (answer === correctAnswer) {
                const reward = Math.floor(Math.random() * 100) + 50;

                await db.updatePlayer(userId, {
                    coins: userData.coins + reward,
                    currentRiddle: null,
                    solvedRiddles: (userData.solvedRiddles || 0) + 1
                });

                embed
                    .setTitle('🎉 Correct Answer!')
                    .setDescription(`Well done! You've earned **${reward}** coins!`)
                    .addFields([
                        { name: '💰 Reward', value: `${reward} coins`, inline: true },
                        { name: '🧩 Total Solved', value: `${(userData.solvedRiddles || 0) + 1}`, inline: true }
                    ]);
            } else {
                embed
                    .setTitle('❌ Wrong Answer')
                    .setDescription('That\'s not correct! Try again or use `/riddle` for a new puzzle.')
                    .addFields([
                        { name: '💡 Hint', value: userData.currentRiddle.hint || 'Think carefully...', inline: false }
                    ]);
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Solve command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your answer.',
                ephemeral: true
            });
        }
    }
};