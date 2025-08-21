
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tunnel')
        .setDescription('⛏️ Explore and expand mining tunnels with advanced systems')
        .addSubcommand(subcommand =>
            subcommand
                .setName('dig')
                .setDescription('Dig a new tunnel section')
                .addStringOption(option =>
                    option.setName('direction')
                        .setDescription('Direction to dig')
                        .setRequired(true)
                        .addChoices(
                            { name: '⬇️ Deeper', value: 'deep' },
                            { name: '⬅️ Branch Left', value: 'left' },
                            { name: '➡️ Branch Right', value: 'right' },
                            { name: '🔄 Expand Chamber', value: 'expand' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reinforce')
                .setDescription('Reinforce tunnel supports and stability'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('map')
                .setDescription('View your detailed mine layout'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('upgrade')
                .setDescription('Upgrade tunnel systems and equipment')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Profile Required')
                    .setDescription('You need to create a profile first!')
                    .addFields({
                        name: '🚀 Getting Started',
                        value: 'Use `/profile` to create your mining adventure profile!',
                        inline: false
                    })
                    .setFooter({ text: 'Start your underground journey today!' });

                await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            // Initialize comprehensive mining data
            if (!player.mining) {
                player.mining = {
                    tunnels: [{
                        id: 1,
                        depth: 1,
                        branches: [],
                        stability: 100,
                        resources: {},
                        type: 'main',
                        discovered: Date.now()
                    }],
                    totalDepth: 1,
                    equipment: {
                        pickaxe: { type: 'basic', durability: 100, efficiency: 1.0 },
                        supports: 0,
                        lantern: { type: 'basic', fuel: 100 },
                        safety_gear: false
                    },
                    statistics: {
                        tunnels_dug: 0,
                        resources_found: 0,
                        accidents: 0,
                        time_spent: 0
                    },
                    upgrades: {
                        ventilation: 1,
                        lighting: 1,
                        safety: 1,
                        efficiency: 1
                    }
                };
            }

            if (subcommand === 'dig') {
                const direction = interaction.options.getString('direction');
                const currentTunnel = player.mining.tunnels[player.mining.tunnels.length - 1];

                // Advanced stability and equipment checks
                const equipmentCheck = this.checkEquipment(player.mining.equipment);
                if (!equipmentCheck.success) {
                    const equipmentEmbed = new EmbedBuilder()
                        .setColor('#FF6B6B')
                        .setTitle('⚠️ Equipment Check Failed')
                        .setDescription(equipmentCheck.message)
                        .addFields({
                            name: '🛠️ Required Equipment',
                            value: equipmentCheck.required.join('\n'),
                            inline: false
                        })
                        .setThumbnail(interaction.user.displayAvatarURL())
                        .setFooter({ text: 'Safety first in the mines!' });

                    await interaction.editReply({ embeds: [equipmentEmbed], ephemeral: true });
                    return;
                }

                if (currentTunnel.stability < 50) {
                    const stabilityEmbed = new EmbedBuilder()
                        .setColor('#FF9500')
                        .setTitle('⚠️ Tunnel Instability Warning')
                        .setDescription('The tunnel structure is compromised!')
                        .addFields(
                            { name: '📊 Current Stability', value: `${currentTunnel.stability}%`, inline: true },
                            { name: '🔧 Required Stability', value: '50% minimum', inline: true },
                            { name: '🛠️ Solution', value: 'Use `/tunnel reinforce` first', inline: true }
                        )
                        .setColor('#FF9500')
                        .setFooter({ text: 'Reinforce before continuing!' });

                    await interaction.editReply({ embeds: [stabilityEmbed], ephemeral: true });
                    return;
                }

                // Dynamic cost calculation
                const digCost = Math.floor(15 * Math.pow(1.15, player.mining.totalDepth) / player.mining.equipment.pickaxe.efficiency);
                
                if (player.stamina < digCost) {
                    const staminaEmbed = new EmbedBuilder()
                        .setColor('#FF6B6B')
                        .setTitle('😴 Insufficient Stamina')
                        .setDescription('You\'re too tired to continue mining!')
                        .addFields(
                            { name: '⚡ Required', value: `${digCost} stamina`, inline: true },
                            { name: '⚡ Available', value: `${player.stamina} stamina`, inline: true },
                            { name: '💡 Tip', value: 'Rest or use energy potions!', inline: true }
                        )
                        .setFooter({ text: 'Take a break, miner!' });

                    await interaction.editReply({ embeds: [staminaEmbed], ephemeral: true });
                    return;
                }

                // Enhanced digging interface
                const embed = new EmbedBuilder()
                    .setColor('#8B4513')
                    .setTitle('⛏️ Advanced Mining Operation')
                    .setDescription(`╔══════════════════════════════════════╗\n║           **TUNNEL EXPANSION**           ║\n╚══════════════════════════════════════╝\n\nPrepare to dig ${this.getDirectionEmoji(direction)} **${direction}**`)
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .addFields(
                        { 
                            name: '⚡ Operation Cost', 
                            value: `**${digCost}** stamina\n*Efficiency: ${player.mining.equipment.pickaxe.efficiency}x*`, 
                            inline: true 
                        },
                        { 
                            name: '📍 Current Status', 
                            value: `**Depth:** ${player.mining.totalDepth}\n**Stability:** ${currentTunnel.stability}%`, 
                            inline: true 
                        },
                        { 
                            name: '🎯 Expected Rewards', 
                            value: this.generateRewardPreview(direction, player.mining.totalDepth), 
                            inline: true 
                        }
                    )
                    .setFooter({ text: 'Choose your mining strategy wisely!' });

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('dig_confirm')
                            .setLabel('Start Mining')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('⛏️'),
                        new ButtonBuilder()
                            .setCustomId('dig_careful')
                            .setLabel('Careful Dig (+Safety)')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🛡️'),
                        new ButtonBuilder()
                            .setCustomId('dig_aggressive')
                            .setLabel('Power Dig (+Reward)')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('💥'),
                        new ButtonBuilder()
                            .setCustomId('dig_cancel')
                            .setLabel('Cancel')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('❌')
                    );

                const response = await interaction.editReply({
                    embeds: [embed],
                    components: [buttons]
                });

                const filter = i => i.user.id === interaction.user.id;
                try {
                    const confirmation = await response.awaitMessageComponent({ filter, time: 45000 });
                    await this.processMining(confirmation, player, direction, digCost);

                } catch (e) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('#6C757D')
                        .setTitle('⏰ Mining Operation Timeout')
                        .setDescription('The mining opportunity has passed.')
                        .setFooter({ text: 'Try again when you\'re ready!' });

                    await interaction.editReply({
                        embeds: [timeoutEmbed],
                        components: []
                    });
                }

            } else if (subcommand === 'reinforce') {
                await this.handleReinforcement(interaction, player);
            } else if (subcommand === 'map') {
                await this.showMineMap(interaction, player);
            } else if (subcommand === 'upgrade') {
                await this.showUpgradeMenu(interaction, player);
            }

        } catch (error) {
            console.error('Error in tunnel command:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('💥 Mining System Error')
                .setDescription('A system error occurred in the mines!')
                .addFields({
                    name: '🔧 What to do',
                    value: 'Please try again in a moment. If the problem persists, contact support.',
                    inline: false
                })
                .setFooter({ text: 'Error logged for investigation' });

            await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }
    },

    async processMining(interaction, player, direction, baseCost) {
        let multiplier = 1.0;
        let riskFactor = 1.0;
        let finalCost = baseCost;

        switch (interaction.customId) {
            case 'dig_careful':
                multiplier = 0.8;
                riskFactor = 0.5;
                finalCost = Math.floor(baseCost * 1.2);
                break;
            case 'dig_aggressive':
                multiplier = 1.5;
                riskFactor = 2.0;
                finalCost = Math.floor(baseCost * 0.8);
                break;
        }

        player.stamina -= finalCost;
        player.mining.equipment.pickaxe.durability -= Math.floor(Math.random() * 3) + 1;

        // Calculate mining results with enhanced algorithm
        const results = this.calculateMiningResults(direction, player, multiplier, riskFactor);

        // Create success embed
        const successEmbed = new EmbedBuilder()
            .setColor(results.success ? '#00FF00' : '#FF6B6B')
            .setTitle(results.success ? '🎉 Mining Success!' : '💥 Mining Mishap!')
            .setDescription(results.description)
            .setThumbnail(interaction.user.displayAvatarURL());

        if (results.success) {
            if (results.resources && Object.keys(results.resources).length > 0) {
                const resourceText = Object.entries(results.resources)
                    .map(([type, amount]) => `${this.getResourceEmoji(type)} **${amount}** ${type.replace('_', ' ')}`)
                    .join('\n');

                successEmbed.addFields({
                    name: '💎 Resources Discovered',
                    value: resourceText,
                    inline: false
                });
            }

            successEmbed.addFields(
                { name: '🏗️ New Tunnel Section', value: `Depth ${results.newDepth}`, inline: true },
                { name: '🏛️ Stability', value: `${results.stability}%`, inline: true },
                { name: '📊 Mining XP', value: `+${results.experience}`, inline: true }
            );
        }

        // Apply results to player
        this.applyMiningResults(player, results);
        await db.updatePlayer(interaction.user.id, player);

        const continueButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tunnel_map')
                    .setLabel('View Map')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🗺️'),
                new ButtonBuilder()
                    .setCustomId('tunnel_dig_again')
                    .setLabel('Dig Again')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⛏️'),
                new ButtonBuilder()
                    .setCustomId('mining_stats')
                    .setLabel('Statistics')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📊')
            );

        await interaction.update({
            embeds: [successEmbed],
            components: [continueButtons]
        });
    },

    // Helper methods
    checkEquipment(equipment) {
        const required = [];
        
        if (!equipment.pickaxe || equipment.pickaxe.durability <= 0) {
            required.push('⛏️ Working pickaxe with durability');
        }
        
        if (!equipment.lantern || equipment.lantern.fuel <= 0) {
            required.push('💡 Fueled lantern for visibility');
        }

        return {
            success: required.length === 0,
            message: required.length > 0 ? 'Your equipment needs attention!' : 'Equipment check passed!',
            required
        };
    },

    getDirectionEmoji(direction) {
        const emojis = {
            'deep': '⬇️',
            'left': '⬅️',
            'right': '➡️',
            'expand': '🔄'
        };
        return emojis[direction] || '⛏️';
    },

    generateRewardPreview(direction, depth) {
        const baseRewards = {
            'deep': ['Iron Ore', 'Coal', 'Rare Gems'],
            'left': ['Silver', 'Crystals', 'Artifacts'],
            'right': ['Gold', 'Precious Stones', 'Ancient Relics'],
            'expand': ['Multiple Resources', 'Hidden Chambers', 'Treasure Caches']
        };

        const rewards = baseRewards[direction] || ['Unknown Resources'];
        return rewards.join('\n');
    },

    getResourceEmoji(type) {
        const emojis = {
            'iron': '⚙️',
            'gold': '🥇',
            'silver': '🥈',
            'gems': '💎',
            'crystal': '🔮',
            'coal': '🪨',
            'stone': '🗿',
            'artifact': '🏺'
        };
        return emojis[type] || '📦';
    },

    calculateMiningResults(direction, player, multiplier, riskFactor) {
        const success = Math.random() > (0.1 * riskFactor);
        
        if (!success) {
            return {
                success: false,
                description: '💥 The tunnel collapsed! Some equipment was damaged but you escaped safely.',
                damage: Math.floor(Math.random() * 20) + 10
            };
        }

        // Generate resources based on direction and depth
        const resources = {};
        const depth = player.mining.totalDepth;
        
        // Base resource generation
        if (Math.random() < 0.7) {
            resources.iron = Math.floor((Math.random() * 3 + 1) * multiplier);
        }
        
        if (Math.random() < 0.4 && depth > 5) {
            resources.gold = Math.floor((Math.random() * 2 + 1) * multiplier);
        }
        
        if (Math.random() < 0.2 && depth > 10) {
            resources.gems = Math.floor((Math.random() * 2) * multiplier);
        }

        return {
            success: true,
            description: '🎉 Your mining operation was successful! You\'ve expanded deeper into the earth.',
            resources,
            newDepth: depth + 1,
            stability: Math.max(30, 90 - Math.floor(Math.random() * 20)),
            experience: Math.floor(25 * multiplier)
        };
    },

    applyMiningResults(player, results) {
        if (results.success) {
            // Add resources to inventory
            if (!player.inventory) player.inventory = {};
            if (!player.inventory.materials) player.inventory.materials = {};
            
            Object.entries(results.resources || {}).forEach(([type, amount]) => {
                player.inventory.materials[type] = (player.inventory.materials[type] || 0) + amount;
            });

            // Update mining data
            player.mining.totalDepth = results.newDepth;
            player.mining.statistics.tunnels_dug++;
            player.mining.statistics.resources_found += Object.values(results.resources || {}).reduce((a, b) => a + b, 0);
        } else {
            // Handle failure consequences
            player.mining.statistics.accidents++;
            if (results.damage) {
                player.mining.equipment.pickaxe.durability -= results.damage;
            }
        }
    },

    async handleReinforcement(interaction, player) {
        // Implementation for reinforcement system
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('🔨 Tunnel Reinforcement System')
            .setDescription('Strengthen your mining tunnels for safer operations')
            .addFields({
                name: '🏗️ Available Options',
                value: 'Select reinforcement type below',
                inline: false
            });

        await interaction.editReply({ embeds: [embed] });
    },

    async showMineMap(interaction, player) {
        // Implementation for detailed mine mapping
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('🗺️ Advanced Mine Layout')
            .setDescription('Your underground network visualization')
            .addFields({
                name: '📍 Tunnel Network',
                value: 'Interactive mine map coming soon!',
                inline: false
            });

        await interaction.editReply({ embeds: [embed] });
    },

    async showUpgradeMenu(interaction, player) {
        // Implementation for upgrade system
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⚙️ Mining Equipment Upgrades')
            .setDescription('Enhance your mining capabilities')
            .addFields({
                name: '🛠️ Available Upgrades',
                value: 'Equipment upgrade system coming soon!',
                inline: false
            });

        await interaction.editReply({ embeds: [embed] });
    }
};
