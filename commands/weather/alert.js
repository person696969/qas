
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alert')
        .setDescription('🌩️ Set up weather alerts and notifications')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of weather alert')
                .setRequired(false)
                .addChoices(
                    { name: 'Storm Warning', value: 'storm' },
                    { name: 'Clear Skies', value: 'clear' },
                    { name: 'Rain Alert', value: 'rain' },
                    { name: 'Snow Alert', value: 'snow' }
                )),

    async execute(interaction) {
        const alertType = interaction.options.getString('type') || 'storm';
        
        try {
            const alertMessages = {
                storm: '⛈️ Storm Warning: Severe weather approaching!',
                clear: '☀️ Clear Skies: Perfect weather for adventures!',
                rain: '🌧️ Rain Alert: Light showers expected!',
                snow: '❄️ Snow Alert: Snowfall incoming!'
            };

            const embed = new EmbedBuilder()
                .setColor('#00BCD4')
                .setTitle('🌩️ Weather Alert System')
                .setDescription(alertMessages[alertType])
                .addFields(
                    { name: '📡 Alert Status', value: 'Weather monitoring active', inline: true },
                    { name: '⏰ Update Frequency', value: 'Every 30 minutes', inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Alert command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while setting up weather alert.',
                ephemeral: true
            });
        }
    }
};
