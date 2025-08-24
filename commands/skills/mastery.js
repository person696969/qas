
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mastery')
        .setDescription('📈 View and manage your skill masteries'),

    async execute(interaction) {
        const userId = interaction.user.id;
        
        try {
            const player = await db.getPlayer(userId) || { 
                skills: { combat: 1, magic: 1, crafting: 1 },
                skillExperience: { combat: 0, magic: 0, crafting: 0 }
            };

            const embed = new EmbedBuilder()
                .setColor('#FF9800')
                .setTitle('📈 Skill Mastery System')
                .setDescription('Track your progress and master various skills!')
                .addFields(
                    { name: '⚔️ Combat Mastery', value: `Level ${player.skills?.combat || 1}`, inline: true },
                    { name: '✨ Magic Mastery', value: `Level ${player.skills?.magic || 1}`, inline: true },
                    { name: '🔨 Crafting Mastery', value: `Level ${player.skills?.crafting || 1}`, inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Mastery command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while accessing mastery information.',
                ephemeral: true
            });
        }
    }
};
