
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('train')
        .setDescription('💪 Train your skills and improve your abilities')
        .addStringOption(option =>
            option.setName('skill')
                .setDescription('Choose a skill to train')
                .setRequired(false)
                .addChoices(
                    { name: 'Combat', value: 'combat' },
                    { name: 'Magic', value: 'magic' },
                    { name: 'Crafting', value: 'crafting' },
                    { name: 'Mining', value: 'mining' },
                    { name: 'Fishing', value: 'fishing' }
                )),

    async execute(interaction) {
        const userId = interaction.user.id;
        const skill = interaction.options.getString('skill') || 'combat';
        
        try {
            const player = await db.getPlayer(userId) || { 
                skills: {}, 
                skillExperience: {} 
            };

            // Initialize skills if they don't exist
            if (!player.skills) player.skills = {};
            if (!player.skillExperience) player.skillExperience = {};
            
            const currentLevel = player.skills[skill] || 1;
            const expGained = Math.floor(Math.random() * 50) + 10;
            const currentExp = player.skillExperience[skill] || 0;
            const newExp = currentExp + expGained;
            const expNeeded = currentLevel * 100;
            
            let levelUp = false;
            if (newExp >= expNeeded) {
                player.skills[skill] = currentLevel + 1;
                player.skillExperience[skill] = newExp - expNeeded;
                levelUp = true;
            } else {
                player.skillExperience[skill] = newExp;
            }

            await db.updatePlayer(userId, player);

            const embed = new EmbedBuilder()
                .setColor(levelUp ? '#F1C40F' : '#3498DB')
                .setTitle('💪 Training Complete!')
                .setDescription(`You trained your ${skill} skill!`)
                .addFields(
                    { name: '📈 Experience Gained', value: `+${expGained} XP`, inline: true },
                    { name: '🎯 Current Level', value: `Level ${player.skills[skill] || 1}`, inline: true },
                    { name: '⚡ Status', value: levelUp ? '🎉 LEVEL UP!' : 'Keep training!', inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Train command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while training.',
                ephemeral: true
            });
        }
    }
};
