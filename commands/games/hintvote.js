const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hintvote')
        .setDescription('💡 Vote for hints during riddles and puzzles')
        .addStringOption(option =>
            option.setName('option')
                .setDescription('Your vote choice')
                .setRequired(true)
                .addChoices(
                    { name: 'Request Hint', value: 'request' },
                    { name: 'No Hint Needed', value: 'no_hint' },
                    { name: 'Give Up', value: 'give_up' }
                )),

    async execute(interaction) {
        const userId = interaction.user.id;
        const vote = interaction.options.getString('option');

        try {
            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('💡 Hint Vote Recorded')
                .setDescription(`Your vote: ${vote}`)
                .addFields(
                    { name: '📊 Voting System', value: 'Community hint voting coming soon!', inline: false }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Hintvote command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your vote.',
                ephemeral: true
            });
        }
    }
};