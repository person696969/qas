const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forge')
        .setDescription('⚒️ Forge powerful weapons and armor at the blacksmith'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.getPlayer(userId) || {
            coins: 100,
            level: 1,
            experience: 0,
            inventory: {},
            skills: { smithing: 1 }
        };

        const forgeable = [
            { name: 'Iron Sword', cost: 150, materials: ['iron_ore', 'coal'], stats: '+15 ATK' },
            { name: 'Steel Shield', cost: 200, materials: ['steel_ingot', 'leather'], stats: '+20 DEF' },
            { name: 'Mystic Bow', cost: 300, materials: ['enchanted_wood', 'silver_string'], stats: '+25 ATK' },
            { name: 'Dragon Armor', cost: 500, materials: ['dragon_scale', 'mithril'], stats: '+50 DEF' }
        ];

        const embed = new EmbedBuilder()
            .setColor('#CD853F')
            .setTitle('⚒️ The Grand Forge')
            .setDescription('**Master Blacksmith\'s Workshop**\n\nForge legendary equipment for your adventures!')
            .addFields(
                { name: '🔨 Your Smithing Level', value: `Level ${userProfile.skills?.smithing || 1}`, inline: true },
                { name: '💰 Available Coins', value: `${userProfile.coins || 0}`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true }
            );

        forgeable.forEach(item => {
            embed.addFields({
                name: `⚔️ ${item.name}`,
                value: `**Cost:** ${item.cost} coins\n**Materials:** ${item.materials.join(', ')}\n**Stats:** ${item.stats}`,
                inline: true
            });
        });

        const buttons = forgeable.map((item, index) => 
            new ButtonBuilder()
                .setCustomId(`forge_${index}`)
                .setLabel(`Forge ${item.name}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⚒️')
        );

        const inspectButton = new ButtonBuilder()
            .setCustomId('forge_inspect')
            .setLabel('Inspect Materials')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔍');

        const upgradeButton = new ButtonBuilder()


    },

    async handleForging(interaction, item, userProfile) {
        const forgingEmbed = new EmbedBuilder()
            .setColor('#FF6600')
            .setTitle(`🔥 Forging ${item.name}`)
            .setDescription('The forge burns hot as you work...')
            .addFields(
                { name: 'Item', value: item.name, inline: true },
                { name: 'Cost', value: `${item.cost} coins`, inline: true },
                { name: 'Materials', value: item.materials.join(', '), inline: true }
            );

        const confirmButton = new ButtonBuilder()
            .setCustomId('forging_confirm')
            .setLabel('Start Forging')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⚒️');

        const cancelButton = new ButtonBuilder()
            .setCustomId('forging_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
        
        const response = await interaction.editReply({ embeds: [forgingEmbed], components: [row] });

        const filter = i => i.user.id === interaction.user.id;
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

            if (confirmation.customId === 'forging_confirm') {
                // Simulate forging process
                const progressEmbed = new EmbedBuilder()
                    .setColor('#FF8C00')
                    .setTitle('⚒️ Forging in Progress...')
                    .setDescription('🔥 Heating materials...\n⚒️ Shaping the item...\n✨ Adding finishing touches...')
                    .addFields({ name: 'Progress', value: '███████░░░ 70%', inline: false });

                await confirmation.update({ embeds: [progressEmbed], components: [] });

                // Wait for forging to complete
                setTimeout(async () => {
                    const success = Math.random() > 0.2; // 80% success rate
                    
                    if (success) {
                        const successEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ Forging Successful!')
                            .setDescription(`You have successfully forged a **${item.name}**!`)
                            .addFields(
                                { name: 'New Item', value: `${item.name}\n${item.stats}`, inline: true },
                                { name: 'Quality', value: Math.random() > 0.8 ? 'Masterwork' : 'Standard', inline: true },
                                { name: 'Experience Gained', value: '+50 Smithing XP', inline: true }
                            );

                        await interaction.editReply({ embeds: [successEmbed], components: [] });
                    } else {
                        const failEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('💔 Forging Failed')
                            .setDescription('The forging attempt was unsuccessful.')
                            .addFields(
                                { name: 'Materials Lost', value: '50% of materials consumed', inline: true },
                                { name: 'Experience Gained', value: '+10 Smithing XP', inline: true },
                                { name: 'Try Again?', value: 'You can attempt again with remaining materials', inline: true }
                            );

                        await interaction.editReply({ embeds: [failEmbed], components: [] });
                    }
                }, 3000);
            } else {
                await confirmation.update({ content: '❌ Forging cancelled.', embeds: [], components: [] });
            }
        } catch (e) {
            await interaction.editReply({ content: '❌ Forging offer expired.', embeds: [], components: [] });
        }

            .setCustomId('forge_upgrade')
            .setLabel('Upgrade Forge')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⬆️');

        const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(buttons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(inspectButton, upgradeButton);

        const response = await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });

        // Handle button interactions
        const filter = i => i.user.id === interaction.user.id;
        const collector = response.createMessageComponentCollector({ filter, time: 300000 });

        collector.on('collect', async (i) => {
            try {
                if (i.customId.startsWith('forge_')) {
                    const action = i.customId.split('_')[1];
                    
                    if (action === 'inspect') {
                        const materialsEmbed = new EmbedBuilder()
                            .setColor('#8B4513')
                            .setTitle('🔍 Material Inspection')
                            .setDescription('**Your Available Materials**')
                            .addFields(
                                { name: '⚒️ Metals', value: 'Iron Ore: 15\nSteel Ingot: 8\nMithril: 2', inline: true },
                                { name: '🌿 Organics', value: 'Leather: 12\nEnchanted Wood: 5\nDragon Scale: 1', inline: true },
                                { name: '💎 Gems', value: 'Ruby: 3\nSapphire: 2\nDiamond: 1', inline: true }
                            );

                        await i.update({ embeds: [materialsEmbed] });
                        
                        setTimeout(async () => {
                            await interaction.editReply({ embeds: [embed], components: [row1, row2, row3] });
                        }, 5000);
                    } else if (action === 'upgrade') {
                        const upgradeEmbed = new EmbedBuilder()
                            .setColor('#FFD700')
                            .setTitle('⬆️ Forge Upgrade')
                            .setDescription('Improve your forge capabilities!')
                            .addFields(
                                { name: 'Current Level', value: 'Level 1 Basic Forge', inline: true },
                                { name: 'Upgrade Cost', value: '2500 coins + 10 Iron', inline: true },
                                { name: 'Benefits', value: '+15% Success Rate\nUnlocks Advanced Items', inline: true }
                            );

                        const confirmUpgrade = new ButtonBuilder()
                            .setCustomId('forge_upgrade_confirm')
                            .setLabel('Confirm Upgrade')
                            .setStyle(ButtonStyle.Success);

                        const cancelUpgrade = new ButtonBuilder()
                            .setCustomId('forge_upgrade_cancel')
                            .setLabel('Cancel')
                            .setStyle(ButtonStyle.Secondary);

                        const upgradeRow = new ActionRowBuilder().addComponents(confirmUpgrade, cancelUpgrade);
                        await i.update({ embeds: [upgradeEmbed], components: [upgradeRow] });
                    } else if (/^\d+$/.test(action)) {
                        const itemIndex = parseInt(action);
                        const item = forgeable[itemIndex];
                        
                        if (item) {
                            await i.deferUpdate();
                            await this.handleForging(interaction, item, userProfile);
                        }
                    }
                }
            } catch (error) {
                console.error('Error in forge button handler:', error);
                await i.followUp({ content: '❌ An error occurred while forging.', ephemeral: true });
            }
        });

        collector.on('end', () => {
            // Disable all buttons when collector ends
            const disabledRows = [row1, row2, row3].map(row => 
                new ActionRowBuilder().addComponents(
                    row.components.map(button => button.setDisabled(true))
                )
            );
            interaction.editReply({ components: disabledRows }).catch(() => {});
        });
    }
};