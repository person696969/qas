
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('travel')
        .setDescription('🗺️ Travel to different locations and regions')
        .addStringOption(option =>
            option.setName('destination')
                .setDescription('Choose your destination')
                .setRequired(false)
                .addChoices(
                    { name: 'Village Square', value: 'village' },
                    { name: 'Forest', value: 'forest' },
                    { name: 'Mountains', value: 'mountains' },
                    { name: 'Seaside Port', value: 'port' },
                    { name: 'Desert Oasis', value: 'desert' }
                )),

    async execute(interaction) {
        const userId = interaction.user.id;
        const destination = interaction.options.getString('destination') || 'village';
        
        try {
            const player = await db.getPlayer(userId) || { location: 'village', coins: 100 };
            
            // Update player location
            player.location = destination;
            await db.updatePlayer(userId, player);

            const locationDescriptions = {
                village: '🏘️ A peaceful village with shops and friendly NPCs',
                forest: '🌲 A mysterious forest filled with adventure',
                mountains: '⛰️ Towering peaks with hidden caves',
                port: '🚢 A bustling seaside port with ships',
                desert: '🏜️ A vast desert with ancient ruins'
            };

            const embed = new EmbedBuilder()
                .setColor('#607D8B')
                .setTitle('🗺️ Travel Complete!')
                .setDescription(`You have arrived at: **${destination}**`)
                .addFields(
                    { name: '📍 Location', value: locationDescriptions[destination] || 'Unknown location', inline: false },
                    { name: '🎯 What to do here?', value: 'Explore, hunt for treasures, or continue your journey!', inline: false }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Travel command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while traveling.',
                ephemeral: true
            });
        }
    }
};
