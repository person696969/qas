
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forecast')
        .setDescription('🌤️ Check the weather forecast for your location')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Location to check weather for')
                .setRequired(false)),

    async execute(interaction) {
        const location = interaction.options.getString('location') || 'Current Location';
        
        try {
            const weatherTypes = ['Sunny', 'Cloudy', 'Rainy', 'Stormy', 'Snowy'];
            const currentWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
            const temperature = Math.floor(Math.random() * 30) + 10;

            const embed = new EmbedBuilder()
                .setColor('#00BCD4')
                .setTitle('🌤️ Weather Forecast')
                .setDescription(`Weather report for **${location}**`)
                .addFields(
                    { name: '🌡️ Temperature', value: `${temperature}°C`, inline: true },
                    { name: '☁️ Conditions', value: currentWeather, inline: true },
                    { name: '💨 Wind', value: 'Light breeze', inline: true }
                )
                .setFooter({ text: 'Weather updates every hour' });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Weather command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while checking weather.',
                ephemeral: true
            });
        }
    }
};
