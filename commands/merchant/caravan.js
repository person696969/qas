
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('caravan')
        .setDescription('🐪 Join merchant caravans for epic trading expeditions')
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Join an outgoing caravan expedition')
                .addStringOption(option =>
                    option.setName('destination')
                        .setDescription('Trading destination')
                        .setRequired(true)
                        .addChoices(
                            { name: '🏜️ Sunfire Desert Bazaar', value: 'desert' },
                            { name: '⛰️ Crystal Mountain Markets', value: 'mountain' },
                            { name: '🌊 Sapphire Coast Ports', value: 'coast' },
                            { name: '🌲 Whispering Forest Posts', value: 'forest' },
                            { name: '🌋 Volcanic Glass Islands', value: 'volcanic' },
                            { name: '❄️ Frozen Peaks Trading', value: 'tundra' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('invest')
                .setDescription('Invest in caravan goods and supplies')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of investment')
                        .addChoices(
                            { name: '📦 Trading Goods', value: 'goods' },
                            { name: '🛡️ Security & Guards', value: 'security' },
                            { name: '🐪 Better Transport', value: 'transport' },
                            { name: '🍖 Provisions & Supplies', value: 'supplies' }
                        ))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to invest')
                        .setRequired(true)
                        .setMinValue(50)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check caravan status and progress'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('routes')
                .setDescription('View available trade routes and information'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('View your caravan trading history')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first! Use `/profile create` to begin your adventure.',
                    ephemeral: true
                });
                return;
            }

            // Initialize merchant data
            if (!player.merchant) {
                player.merchant = {
                    activeCaravan: null,
                    investments: {},
                    reputation: 0,
                    completedRoutes: {},
                    totalProfits: 0,
                    caravanLevel: 1,
                    specializations: []
                };
            }

            const tradeRoutes = {
                desert: {
                    name: '🏜️ Sunfire Desert Bazaar',
                    description: 'A scorching journey through endless dunes to the legendary spice markets',
                    duration: 4 * 60 * 60 * 1000, // 4 hours
                    risk: 'high',
                    difficulty: '⭐⭐⭐⭐',
                    profit: { min: 1.8, max: 3.5 },
                    goods: ['Exotic Spices', 'Desert Silk', 'Fire Gems', 'Enchanted Sand'],
                    dangers: ['Sandstorms', 'Desert Bandits', 'Mirages', 'Scorching Heat'],
                    specialReward: 'Phoenix Feather',
                    climate: 'Extreme Heat',
                    distance: '500 leagues'
                },
                mountain: {
                    name: '⛰️ Crystal Mountain Markets',
                    description: 'Treacherous mountain paths leading to gem-rich mining settlements',
                    duration: 3 * 60 * 60 * 1000, // 3 hours
                    risk: 'medium-high',
                    difficulty: '⭐⭐⭐',
                    profit: { min: 1.5, max: 2.8 },
                    goods: ['Precious Metals', 'Mountain Furs', 'Crystal Formations', 'Dwarven Crafts'],
                    dangers: ['Avalanches', 'Mountain Trolls', 'Thin Air', 'Rockslides'],
                    specialReward: 'Mithril Ore',
                    climate: 'Cold & Windy',
                    distance: '350 leagues'
                },
                coast: {
                    name: '🌊 Sapphire Coast Ports',
                    description: 'Pleasant coastal voyage to bustling seaside trading centers',
                    duration: 2 * 60 * 60 * 1000, // 2 hours
                    risk: 'low',
                    difficulty: '⭐⭐',
                    profit: { min: 1.2, max: 1.8 },
                    goods: ['Fresh Seafood', 'Sea Salt', 'Pearls', 'Naval Supplies'],
                    dangers: ['Sea Storms', 'Pirates', 'Sea Monsters', 'Fog'],
                    specialReward: 'Siren\'s Pearl',
                    climate: 'Mild & Breezy',
                    distance: '200 leagues'
                },
                forest: {
                    name: '🌲 Whispering Forest Posts',
                    description: 'Mystical journey through ancient woods to druidic settlements',
                    duration: 1.5 * 60 * 60 * 1000, // 1.5 hours
                    risk: 'low-medium',
                    difficulty: '⭐⭐',
                    profit: { min: 1.1, max: 1.6 },
                    goods: ['Rare Herbs', 'Magical Wood', 'Forest Honey', 'Elven Crafts'],
                    dangers: ['Wild Beasts', 'Getting Lost', 'Angry Spirits', 'Thorny Paths'],
                    specialReward: 'Heartwood Branch',
                    climate: 'Temperate',
                    distance: '150 leagues'
                },
                volcanic: {
                    name: '🌋 Volcanic Glass Islands',
                    description: 'Dangerous expedition to volcanic islands rich in rare materials',
                    duration: 5 * 60 * 60 * 1000, // 5 hours
                    risk: 'extreme',
                    difficulty: '⭐⭐⭐⭐⭐',
                    profit: { min: 2.5, max: 5.0 },
                    goods: ['Volcanic Glass', 'Fire Crystals', 'Lava Forged Metals', 'Rare Minerals'],
                    dangers: ['Volcanic Eruptions', 'Lava Flows', 'Fire Elementals', 'Toxic Gases'],
                    specialReward: 'Dragon\'s Blood Ruby',
                    climate: 'Extreme Heat',
                    distance: '750 leagues'
                },
                tundra: {
                    name: '❄️ Frozen Peaks Trading',
                    description: 'Frigid expedition to the ice-bound northern settlements',
                    duration: 4.5 * 60 * 60 * 1000, // 4.5 hours
                    risk: 'high',
                    difficulty: '⭐⭐⭐⭐',
                    profit: { min: 2.0, max: 3.2 },
                    goods: ['Ice Crystals', 'Arctic Furs', 'Frozen Treasures', 'Ice Wine'],
                    dangers: ['Blizzards', 'Ice Wolves', 'Frostbite', 'Crevasses'],
                    specialReward: 'Eternal Ice Shard',
                    climate: 'Freezing',
                    distance: '600 leagues'
                }
            };

            switch (subcommand) {
                case 'join':
                    await this.handleJoin(interaction, player, tradeRoutes);
                    break;
                case 'invest':
                    await this.handleInvest(interaction, player, tradeRoutes);
                    break;
                case 'status':
                    await this.handleStatus(interaction, player, tradeRoutes);
                    break;
                case 'routes':
                    await this.handleRoutes(interaction, player, tradeRoutes);
                    break;
                case 'history':
                    await this.handleHistory(interaction, player, tradeRoutes);
                    break;
            }

        } catch (error) {
            console.error('Error in caravan command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing the caravan. Please try again.',
                ephemeral: true
            });
        }
    },

    async handleJoin(interaction, player, tradeRoutes) {
        if (player.merchant.activeCaravan) {
            await interaction.editReply({
                content: '❌ You\'re already part of a caravan expedition! Use `/caravan status` to check progress.',
                ephemeral: true
            });
            return;
        }

        const destination = interaction.options.getString('destination');
        const route = tradeRoutes[destination];

        const embed = new EmbedBuilder()
            .setColor('#DAA520')
            .setTitle(`🐪 ${route.name}`)
            .setDescription('╔══════════════════════════════════════╗\n║         **CARAVAN EXPEDITION**       ║\n╚══════════════════════════════════════╝\n\n' + route.description)
            .setThumbnail('https://example.com/caravan.png')
            .addFields(
                { name: '⏱️ Journey Time', value: `${route.duration / (60 * 60 * 1000)} hours`, inline: true },
                { name: '🎯 Difficulty', value: route.difficulty, inline: true },
                { name: '⚠️ Risk Level', value: route.risk.toUpperCase(), inline: true },
                { name: '💰 Profit Range', value: `${Math.round((route.profit.min - 1) * 100)}% - ${Math.round((route.profit.max - 1) * 100)}%`, inline: true },
                { name: '🌡️ Climate', value: route.climate, inline: true },
                { name: '📏 Distance', value: route.distance, inline: true },
                {
                    name: '📦 Trading Goods',
                    value: route.goods.map(good => `• ${good}`).join('\n'),
                    inline: true
                },
                {
                    name: '⚠️ Known Dangers',
                    value: route.dangers.map(danger => `• ${danger}`).join('\n'),
                    inline: true
                },
                {
                    name: '🎁 Special Reward',
                    value: `✨ ${route.specialReward}\n*Rare item exclusive to this route*`,
                    inline: true
                }
            );

        // Calculate minimum investment required
        const minInvestment = Math.floor(100 * Math.pow(1.5, Object.keys(route.goods).length));
        embed.addFields({
            name: '💡 Expedition Requirements',
            value: `• Minimum investment: **${minInvestment} gold**\n• Caravan level: **${Math.max(1, Math.floor(route.duration / (60 * 60 * 1000)) - 1)}**\n• Risk tolerance: **${route.risk}**`,
            inline: false
        });

        const joinButton = new ButtonBuilder()
            .setCustomId(`caravan_join_${destination}`)
            .setLabel('🐪 Join Expedition')
            .setStyle(ButtonStyle.Primary);

        const detailsButton = new ButtonBuilder()
            .setCustomId(`caravan_details_${destination}`)
            .setLabel('📊 View Details')
            .setStyle(ButtonStyle.Secondary);

        const cancelButton = new ButtonBuilder()
            .setCustomId('caravan_cancel')
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
            .addComponents(joinButton, detailsButton, cancelButton);

        const response = await interaction.editReply({
            embeds: [embed],
            components: [row]
        });

        const filter = i => i.user.id === interaction.user.id;
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 45000 });

            if (confirmation.customId === `caravan_join_${destination}`) {
                // Check if player meets requirements
                const playerLevel = player.merchant.caravanLevel || 1;
                const requiredLevel = Math.max(1, Math.floor(route.duration / (60 * 60 * 1000)) - 1);

                if (playerLevel < requiredLevel) {
                    await confirmation.update({
                        content: `❌ You need caravan level ${requiredLevel} for this expedition! Complete more routes to level up.`,
                        embeds: [],
                        components: []
                    });
                    return;
                }

                player.merchant.activeCaravan = {
                    destination: destination,
                    route: route,
                    startTime: Date.now(),
                    endTime: Date.now() + route.duration,
                    investments: {
                        goods: 0,
                        security: 0,
                        transport: 0,
                        supplies: 0
                    },
                    totalInvested: 0,
                    events: []
                };

                await db.updatePlayer(interaction.user.id, player);

                const successEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🐪 Caravan Expedition Started!')
                    .setDescription(`You've joined the caravan bound for **${route.name}**!`)
                    .addFields(
                        { name: '⏰ Departure Time', value: '<t:' + Math.floor(Date.now() / 1000) + ':R>', inline: true },
                        { name: '🏁 Expected Return', value: '<t:' + Math.floor(player.merchant.activeCaravan.endTime / 1000) + ':R>', inline: true },
                        { name: '💡 Next Steps', value: '• Use `/caravan invest` to invest in expedition supplies\n• Higher investments = better profits\n• Check progress with `/caravan status`', inline: false }
                    );

                await confirmation.update({
                    embeds: [successEmbed],
                    components: []
                });
            } else if (confirmation.customId === `caravan_details_${destination}`) {
                // Show detailed route information
                const detailEmbed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle(`📊 ${route.name} - Detailed Information`)
                    .setDescription(route.description)
                    .addFields(
                        { name: '🗺️ Route Details', value: `**Distance:** ${route.distance}\n**Climate:** ${route.climate}\n**Difficulty:** ${route.difficulty}`, inline: true },
                        { name: '💰 Economic Info', value: `**Profit Potential:** ${Math.round((route.profit.min - 1) * 100)}% - ${Math.round((route.profit.max - 1) * 100)}%\n**Risk Level:** ${route.risk}\n**Special Reward:** ${route.specialReward}`, inline: true }
                    );

                await confirmation.update({
                    embeds: [detailEmbed],
                    components: []
                });
            } else {
                await confirmation.update({
                    content: '❌ Caravan expedition cancelled.',
                    embeds: [],
                    components: []
                });
            }
        } catch (e) {
            await interaction.editReply({
                content: '❌ Caravan offer expired. Use the command again to join an expedition.',
                embeds: [],
                components: []
            });
        }
    },

    async handleInvest(interaction, player, tradeRoutes) {
        if (!player.merchant.activeCaravan) {
            await interaction.editReply({
                content: '❌ You need to join a caravan expedition first! Use `/caravan join` to start.',
                ephemeral: true
            });
            return;
        }

        const investmentType = interaction.options.getString('type');
        const amount = interaction.options.getInteger('amount');

        if (player.gold < amount) {
            await interaction.editReply({
                content: `❌ You need ${amount} gold to make this investment! You currently have ${player.gold} gold.`,
                ephemeral: true
            });
            return;
        }

        const investmentTypes = {
            goods: {
                name: '📦 Trading Goods',
                description: 'High-quality merchandise for better profits',
                effect: 'Increases base profit multiplier',
                efficiency: 1.0
            },
            security: {
                name: '🛡️ Security & Guards',
                description: 'Hired protection to reduce journey risks',
                effect: 'Reduces chance of negative events',
                efficiency: 0.8
            },
            transport: {
                name: '🐪 Better Transport',
                description: 'Faster camels and improved wagons',
                effect: 'Reduces journey time and improves success',
                efficiency: 0.6
            },
            supplies: {
                name: '🍖 Provisions & Supplies',
                description: 'Food, water, and emergency equipment',
                effect: 'Improves overall expedition safety',
                efficiency: 0.9
            }
        };

        const investment = investmentTypes[investmentType];
        const route = tradeRoutes[player.merchant.activeCaravan.destination];

        player.gold -= amount;
        player.merchant.activeCaravan.investments[investmentType] += amount;
        player.merchant.activeCaravan.totalInvested += amount;

        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('💰 Investment Successful!')
            .setDescription(`You've invested in **${investment.name}** for your caravan expedition!`)
            .addFields(
                { name: '💰 Investment Amount', value: `${amount} gold`, inline: true },
                { name: '📊 Total Invested', value: `${player.merchant.activeCaravan.totalInvested} gold`, inline: true },
                { name: '💳 Remaining Gold', value: `${player.gold} gold`, inline: true },
                { name: '🎯 Investment Effect', value: investment.effect, inline: false },
                { name: '📈 Expected Benefits', value: this.calculateInvestmentBenefits(player.merchant.activeCaravan, route), inline: false }
            );

        // Show investment breakdown
        const investments = player.merchant.activeCaravan.investments;
        const breakdown = Object.entries(investments)
            .filter(([, value]) => value > 0)
            .map(([type, value]) => `${investmentTypes[type].name}: ${value} gold`)
            .join('\n');

        if (breakdown) {
            embed.addFields({ name: '📊 Investment Breakdown', value: breakdown, inline: false });
        }

        embed.addFields({
            name: '⏰ Expedition Status',
            value: `**Destination:** ${route.name}\n**Returns:** <t:${Math.floor(player.merchant.activeCaravan.endTime / 1000)}:R>\n**Progress:** ${this.calculateProgress(player.merchant.activeCaravan)}%`,
            inline: false
        });

        await interaction.editReply({ embeds: [embed] });
    },

    async handleStatus(interaction, player, tradeRoutes) {
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🐪 Caravan Status & Progress');

        if (player.merchant.activeCaravan) {
            const route = tradeRoutes[player.merchant.activeCaravan.destination];
            const timeLeft = player.merchant.activeCaravan.endTime - Date.now();
            const progress = this.calculateProgress(player.merchant.activeCaravan);

            if (timeLeft <= 0) {
                // Caravan has returned - calculate results
                const results = this.calculateExpeditionResults(player.merchant.activeCaravan, route, player);
                
                player.gold += results.earnings;
                player.merchant.reputation += results.reputationGain;
                player.merchant.totalProfits += results.profit;
                
                // Update completed routes
                if (!player.merchant.completedRoutes[player.merchant.activeCaravan.destination]) {
                    player.merchant.completedRoutes[player.merchant.activeCaravan.destination] = 0;
                }
                player.merchant.completedRoutes[player.merchant.activeCaravan.destination]++;

                // Level up check
                const totalRoutes = Object.values(player.merchant.completedRoutes).reduce((sum, count) => sum + count, 0);
                const newLevel = Math.floor(totalRoutes / 5) + 1;
                if (newLevel > player.merchant.caravanLevel) {
                    player.merchant.caravanLevel = newLevel;
                }

                // Add special rewards
                if (results.specialReward) {
                    if (!player.inventory) player.inventory = { items: [] };
                    player.inventory.items.push(route.specialReward);
                }

                player.merchant.activeCaravan = null;
                await db.updatePlayer(interaction.user.id, player);

                embed.setColor(results.success ? '#00FF00' : '#FF6B6B')
                    .setDescription(`🏁 **Expedition Complete!**\n\n${results.eventDescription}`)
                    .addFields(
                        { name: '💰 Financial Results', value: `**Total Earnings:** ${results.earnings} gold\n**Net Profit:** ${results.profit} gold\n**Profit Margin:** ${Math.round(results.profitMargin * 100)}%`, inline: true },
                        { name: '📊 Experience Gained', value: `**Reputation:** +${results.reputationGain}\n**Caravan Level:** ${player.merchant.caravanLevel}\n**Routes Completed:** ${totalRoutes}`, inline: true },
                        { name: '🎁 Rewards', value: results.specialReward ? `**Special Item:** ${route.specialReward}\n**Rarity Bonus:** Applied` : 'No special rewards this time', inline: true }
                    );

                if (results.events.length > 0) {
                    embed.addFields({
                        name: '📜 Journey Events',
                        value: results.events.join('\n'),
                        inline: false
                    });
                }

            } else {
                // Caravan is still traveling
                embed.setDescription(`🚶‍♂️ **En Route to ${route.name}**\n\n*Your caravan continues its journey across dangerous lands...*`)
                    .addFields(
                        { name: '📍 Current Location', value: this.getCurrentLocation(progress, route), inline: true },
                        { name: '⏰ Time Remaining', value: `<t:${Math.floor(player.merchant.activeCaravan.endTime / 1000)}:R>`, inline: true },
                        { name: '📊 Progress', value: `${progress}%`, inline: true },
                        { name: '💰 Total Investment', value: `${player.merchant.activeCaravan.totalInvested} gold`, inline: true },
                        { name: '🎯 Expected Profit', value: this.calculateExpectedProfit(player.merchant.activeCaravan, route), inline: true },
                        { name: '⚠️ Risk Assessment', value: this.calculateRiskLevel(player.merchant.activeCaravan, route), inline: true }
                    );

                // Show recent events
                if (player.merchant.activeCaravan.events.length > 0) {
                    const recentEvents = player.merchant.activeCaravan.events.slice(-3);
                    embed.addFields({
                        name: '📰 Recent Events',
                        value: recentEvents.join('\n'),
                        inline: false
                    });
                }
            }
        } else {
            embed.setDescription('🏠 **No Active Expeditions**\n\n*You are currently not part of any caravan expedition.*')
                .addFields(
                    { name: '📊 Your Stats', value: `**Caravan Level:** ${player.merchant.caravanLevel || 1}\n**Reputation:** ${player.merchant.reputation || 0}\n**Total Profits:** ${player.merchant.totalProfits || 0} gold`, inline: true },
                    { name: '🗺️ Completed Routes', value: this.formatCompletedRoutes(player.merchant.completedRoutes), inline: true },
                    { name: '💡 Getting Started', value: '• Use `/caravan routes` to explore destinations\n• Use `/caravan join` to start an expedition\n• Higher investments lead to better profits', inline: false }
                );
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleRoutes(interaction, player, tradeRoutes) {
        const embed = new EmbedBuilder()
            .setColor('#9370DB')
            .setTitle('🗺️ Available Trade Routes')
            .setDescription('╔══════════════════════════════════════╗\n║        **EXPEDITION ROUTES**         ║\n╚══════════════════════════════════════╝\n\n*Choose your destination wisely, brave merchant!*');

        Object.entries(tradeRoutes).forEach(([key, route]) => {
            const completedCount = player.merchant.completedRoutes?.[key] || 0;
            const requiredLevel = Math.max(1, Math.floor(route.duration / (60 * 60 * 1000)) - 1);
            const canAccess = (player.merchant.caravanLevel || 1) >= requiredLevel;

            embed.addFields({
                name: `${route.name} ${canAccess ? '✅' : '🔒'}`,
                value: `**${route.description}**\n\n` +
                       `⏱️ **Duration:** ${route.duration / (60 * 60 * 1000)}h | ` +
                       `🎯 **Difficulty:** ${route.difficulty}\n` +
                       `💰 **Profit:** ${Math.round((route.profit.min - 1) * 100)}-${Math.round((route.profit.max - 1) * 100)}% | ` +
                       `⚠️ **Risk:** ${route.risk}\n` +
                       `🎁 **Special:** ${route.specialReward} | ` +
                       `📊 **Completed:** ${completedCount}x\n` +
                       `🔓 **Required Level:** ${requiredLevel}`,
                inline: false
            });
        });

        embed.addFields({
            name: '💡 Route Selection Tips',
            value: '• **Lower risk routes** are safer but offer smaller profits\n• **Higher risk routes** can yield massive rewards or losses\n• **Investment type** affects success chances\n• **Route familiarity** improves with each completion',
            inline: false
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('route_quick_join')
            .setPlaceholder('🚀 Quick join a route...')
            .addOptions(
                Object.entries(tradeRoutes).map(([key, route]) => ({
                    label: route.name.replace(/🏜️|⛰️|🌊|🌲|🌋|❄️/g, '').trim(),
                    value: key,
                    description: `${route.duration / (60 * 60 * 1000)}h journey, ${route.risk} risk`,
                    emoji: route.name.match(/🏜️|⛰️|🌊|🌲|🌋|❄️/)?.[0] || '🗺️'
                }))
            );

        const components = [
            new ActionRowBuilder().addComponents(selectMenu)
        ];

        await interaction.editReply({ embeds: [embed], components });
    },

    async handleHistory(interaction, player, tradeRoutes) {
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('📜 Caravan Trading History')
            .setDescription('╔══════════════════════════════════════╗\n║        **YOUR EXPEDITION LOG**       ║\n╚══════════════════════════════════════╝');

        if (!player.merchant.completedRoutes || Object.keys(player.merchant.completedRoutes).length === 0) {
            embed.setDescription('📋 **No Expeditions Completed**\n\n*Begin your trading career with `/caravan join`!*');
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        embed.addFields(
            { name: '📊 Overall Statistics', value: `**Caravan Level:** ${player.merchant.caravanLevel || 1}\n**Total Profits:** ${player.merchant.totalProfits || 0} gold\n**Reputation:** ${player.merchant.reputation || 0}\n**Routes Mastered:** ${Object.keys(player.merchant.completedRoutes).length}`, inline: true }
        );

        // Route completion details
        Object.entries(player.merchant.completedRoutes).forEach(([routeKey, count]) => {
            const route = tradeRoutes[routeKey];
            if (route) {
                const masteryLevel = this.calculateMasteryLevel(count);
                embed.addFields({
                    name: `${route.name}`,
                    value: `**Completed:** ${count} times\n**Mastery:** ${masteryLevel.name} ${masteryLevel.emoji}\n**Bonus:** ${masteryLevel.bonus}`,
                    inline: true
                });
            }
        });

        await interaction.editReply({ embeds: [embed] });
    },

    // Helper methods
    calculateProgress(activeCaravan) {
        const elapsed = Date.now() - activeCaravan.startTime;
        const total = activeCaravan.endTime - activeCaravan.startTime;
        return Math.min(100, Math.floor((elapsed / total) * 100));
    },

    calculateInvestmentBenefits(activeCaravan, route) {
        const totalInvestment = activeCaravan.totalInvested;
        const baseProfit = route.profit.min;
        const investmentBonus = Math.min(0.5, totalInvestment / 1000); // Max 50% bonus
        const expectedProfit = Math.round((baseProfit + investmentBonus) * 100);
        
        return `• **Profit Boost:** +${Math.round(investmentBonus * 100)}%\n• **Expected Return:** ~${expectedProfit}%\n• **Risk Reduction:** ${Math.min(25, Math.floor(totalInvestment / 50))}%`;
    },

    calculateExpeditionResults(activeCaravan, route, player) {
        const investments = activeCaravan.investments;
        const totalInvested = activeCaravan.totalInvested;
        
        // Calculate success factors
        const securityFactor = investments.security / totalInvested || 0;
        const goodsFactor = investments.goods / totalInvested || 0;
        const transportFactor = investments.transport / totalInvested || 0;
        const suppliesFactor = investments.supplies / totalInvested || 0;
        
        // Base success chance
        let successChance = 0.7;
        successChance += securityFactor * 0.2; // Security reduces risk
        successChance += suppliesFactor * 0.1; // Supplies improve safety
        
        const success = Math.random() < successChance;
        
        // Calculate profit multiplier
        let profitMultiplier = route.profit.min + (Math.random() * (route.profit.max - route.profit.min));
        profitMultiplier += goodsFactor * 0.3; // Goods boost profits
        profitMultiplier += transportFactor * 0.2; // Transport improves efficiency
        
        if (!success) {
            profitMultiplier *= 0.3; // Major loss on failure
        }
        
        const earnings = Math.floor(totalInvested * profitMultiplier);
        const profit = earnings - totalInvested;
        const profitMargin = profit / totalInvested;
        
        const events = this.generateJourneyEvents(activeCaravan, route, success);
        const specialReward = success && Math.random() < 0.3; // 30% chance for special reward
        
        return {
            success,
            earnings,
            profit,
            profitMargin,
            reputationGain: success ? Math.floor(totalInvested / 100) + 5 : 1,
            specialReward,
            events,
            eventDescription: success ? 
                '🎉 Your caravan returned successfully with profitable trades!' :
                '⚠️ The expedition faced challenges, but lessons were learned.'
        };
    },

    generateJourneyEvents(activeCaravan, route, success) {
        const events = [];
        const eventCount = Math.floor(Math.random() * 3) + 1;
        
        const positiveEvents = [
            '🌟 Found a shortcut that saved time',
            '🤝 Made valuable trading contacts',
            '💎 Discovered rare materials',
            '🛡️ Successfully defended against bandits',
            '🌤️ Enjoyed perfect weather conditions'
        ];
        
        const negativeEvents = [
            '⛈️ Encountered severe weather delays',
            '🦁 Wild animal attacks slowed progress',
            '💸 Some goods were damaged in transit',
            '🗺️ Got lost and had to backtrack',
            '🥵 Supply shortages caused problems'
        ];
        
        for (let i = 0; i < eventCount; i++) {
            if (success && Math.random() > 0.3) {
                events.push(positiveEvents[Math.floor(Math.random() * positiveEvents.length)]);
            } else {
                events.push(negativeEvents[Math.floor(Math.random() * negativeEvents.length)]);
            }
        }
        
        return events;
    },

    getCurrentLocation(progress, route) {
        const locations = [
            '🏠 Departure City',
            '🛤️ Trade Roads',
            '🗻 Halfway Point',
            '🚩 Near Destination',
            '🏁 Arrival'
        ];
        
        const locationIndex = Math.min(4, Math.floor(progress / 20));
        return locations[locationIndex];
    },

    calculateExpectedProfit(activeCaravan, route) {
        const totalInvested = activeCaravan.totalInvested;
        const avgMultiplier = (route.profit.min + route.profit.max) / 2;
        const expectedReturn = Math.floor(totalInvested * avgMultiplier);
        const expectedProfit = expectedReturn - totalInvested;
        
        return `${expectedProfit} gold (${Math.round(((expectedReturn / totalInvested) - 1) * 100)}%)`;
    },

    calculateRiskLevel(activeCaravan, route) {
        const securityRatio = activeCaravan.investments.security / activeCaravan.totalInvested;
        const baseRisk = { low: 0.1, 'low-medium': 0.2, medium: 0.3, 'medium-high': 0.4, high: 0.5, extreme: 0.7 }[route.risk];
        const adjustedRisk = Math.max(0.05, baseRisk - (securityRatio * 0.3));
        
        if (adjustedRisk < 0.15) return '🟢 Very Low';
        if (adjustedRisk < 0.25) return '🟡 Low';
        if (adjustedRisk < 0.35) return '🟠 Medium';
        if (adjustedRisk < 0.5) return '🔴 High';
        return '💀 Extreme';
    },

    formatCompletedRoutes(completedRoutes) {
        if (!completedRoutes || Object.keys(completedRoutes).length === 0) {
            return 'No routes completed yet';
        }
        
        return Object.entries(completedRoutes)
            .map(([route, count]) => `${route}: ${count}x`)
            .join('\n');
    },

    calculateMasteryLevel(completions) {
        if (completions >= 20) return { name: 'Legendary', emoji: '🏆', bonus: '50% profit boost' };
        if (completions >= 15) return { name: 'Master', emoji: '👑', bonus: '35% profit boost' };
        if (completions >= 10) return { name: 'Expert', emoji: '⭐', bonus: '25% profit boost' };
        if (completions >= 5) return { name: 'Experienced', emoji: '💼', bonus: '15% profit boost' };
        return { name: 'Novice', emoji: '📋', bonus: '5% profit boost' };
    }
};
