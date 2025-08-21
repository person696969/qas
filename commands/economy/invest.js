
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invest')
        .setDescription('📈 Invest your coins for long-term treasure hunting profits')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Investment action to perform')
                .setRequired(false)
                .addChoices(
                    { name: '💰 Make Investment', value: 'invest' },
                    { name: '📊 View Portfolio', value: 'portfolio' },
                    { name: '💸 Withdraw Profits', value: 'withdraw' },
                    { name: '📈 Market Analysis', value: 'market' }
                ))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of investment')
                .setRequired(false)
                .addChoices(
                    { name: '📜 Treasure Bonds', value: 'bonds' },
                    { name: '⛏️ Mining Stocks', value: 'mining' },
                    { name: '🗺️ Adventure Fund', value: 'adventure' },
                    { name: '🐉 Dragon Futures', value: 'dragon' }
                ))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount to invest')
                .setRequired(false)
                .setMinValue(100)
                .setMaxValue(50000)),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const action = interaction.options?.getString('action') || 'portfolio';
        const investmentType = interaction.options?.getString('type');
        const amount = interaction.options?.getInteger('amount');

        try {
            const userProfile = await db.getPlayer(userId) || {
                coins: 100,
                investments: { portfolio: {}, totalValue: 0, lastUpdate: Date.now() }
            };

            // Ensure investments object exists
            userProfile.investments = userProfile.investments || { portfolio: {}, totalValue: 0, lastUpdate: Date.now() };

            switch (action) {
                case 'invest':
                    await this.handleInvestment(interaction, userProfile, investmentType, amount);
                    break;
                case 'withdraw':
                    await this.handleWithdrawal(interaction, userProfile);
                    break;
                case 'market':
                    await this.showMarketAnalysis(interaction);
                    break;
                default:
                    await this.showPortfolio(interaction, userProfile);
            }
        } catch (error) {
            console.error('Investment command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your investment request. Please try again.',
                ephemeral: true
            });
        }
    },

    async showPortfolio(interaction, userProfile) {
        const investmentOptions = this.getInvestmentOptions();
        
        // Update investment values
        await this.updateInvestmentValues(userProfile);
        
        const totalInvested = userProfile.investments?.totalValue || 0;
        const portfolio = userProfile.investments?.portfolio || {};
        const dailyProfit = this.calculateDailyProfit(portfolio);
        const totalProfit = this.calculateTotalProfit(portfolio);

        const embed = new EmbedBuilder()
            .setColor('#228B22')
            .setTitle('📈 Investment Portfolio Dashboard')
            .setDescription('**Grow your wealth through smart investments!**\n\n💡 *Diversify your treasure hunting income with our premium investment options.*')
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields([
                {
                    name: '💰 Financial Overview',
                    value: `**Available Coins:** ${(userProfile.coins || 0).toLocaleString()}\n**Total Invested:** ${totalInvested.toLocaleString()} coins\n**Current Value:** ${(totalInvested + totalProfit).toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '📊 Performance Metrics',
                    value: `**Daily Income:** ${dailyProfit.toLocaleString()} coins\n**Total Profit:** ${totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString()} coins\n**ROI:** ${totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(1) : '0.0'}%`,
                    inline: true
                },
                {
                    name: '🎯 Investment Goal',
                    value: `**Monthly Target:** ${(dailyProfit * 30).toLocaleString()} coins\n**Risk Level:** ${this.calculateRiskLevel(portfolio)}\n**Diversification:** ${Object.keys(portfolio).length}/4 types`,
                    inline: true
                }
            ]);

        // Show current investments
        if (Object.keys(portfolio).length > 0) {
            const investmentsList = Object.entries(portfolio).map(([type, data]) => {
                const option = investmentOptions[type];
                const currentValue = data.amount * (1 + (data.totalReturn || 0));
                const profit = currentValue - data.amount;
                return `${option.emoji} **${option.name}**\n💰 ${data.amount.toLocaleString()} → ${currentValue.toLocaleString()} coins\n📈 ${profit >= 0 ? '+' : ''}${profit.toLocaleString()} profit`;
            }).join('\n\n');

            embed.addFields([{
                name: '📋 Current Investments',
                value: investmentsList,
                inline: false
            }]);
        }

        // Available investment options
        const availableOptions = Object.entries(investmentOptions).map(([key, option]) => {
            const canInvest = (userProfile.coins || 0) >= option.minAmount;
            const hasInvestment = portfolio[key] ? '✅' : '❌';
            return `${option.emoji} **${option.name}**\n💰 Min: ${option.minAmount.toLocaleString()} | Return: ${option.return} | Risk: ${option.risk}\n${hasInvestment} ${canInvest ? 'Available' : 'Insufficient funds'}`;
        }).join('\n\n');

        embed.addFields([{
            name: '🏪 Available Investment Options',
            value: availableOptions,
            inline: false
        }]);

        // Create interactive components
        const investmentSelect = new StringSelectMenuBuilder()
            .setCustomId('invest_select')
            .setPlaceholder('💰 Choose an investment option...')
            .addOptions(Object.entries(investmentOptions).map(([key, option]) => ({
                label: option.name,
                description: `${option.return} return • ${option.risk} risk • Min: ${option.minAmount}`,
                value: `invest_${key}`,
                emoji: option.emoji
            })));

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('invest_quick')
                    .setLabel('⚡ Quick Invest')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('invest_withdraw_all')
                    .setLabel('💸 Withdraw All')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('invest_market')
                    .setLabel('📈 Market Analysis')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('invest_calculator')
                    .setLabel('🧮 Profit Calculator')
                    .setStyle(ButtonStyle.Secondary)
            );

        const components = [
            new ActionRowBuilder().addComponents(investmentSelect),
            actionButtons
        ];

        await interaction.reply({ embeds: [embed], components });
    },

    async handleInvestment(interaction, userProfile, investmentType, amount) {
        const investmentOptions = this.getInvestmentOptions();
        
        if (!investmentType || !amount) {
            return await interaction.reply({
                content: '❌ Please specify both investment type and amount!\nExample: `/invest action:invest type:bonds amount:1000`',
                ephemeral: true
            });
        }

        const option = investmentOptions[investmentType];
        if (!option) {
            return await interaction.reply({
                content: '❌ Invalid investment type! Use the dropdown menu to select available options.',
                ephemeral: true
            });
        }

        if (amount < option.minAmount) {
            return await interaction.reply({
                content: `❌ Minimum investment for ${option.name} is **${option.minAmount.toLocaleString()}** coins!`,
                ephemeral: true
            });
        }

        if ((userProfile.coins || 0) < amount) {
            const needed = amount - (userProfile.coins || 0);
            return await interaction.reply({
                content: `❌ Insufficient funds! You need **${needed.toLocaleString()}** more coins.\n\n💡 **Earn more coins:**\n• `/daily` - Daily rewards\n• `/work` - Job opportunities\n• `/hunt` - Treasure hunting`,
                ephemeral: true
            });
        }

        // Process investment
        userProfile.coins -= amount;
        userProfile.investments.portfolio[investmentType] = {
            amount: (userProfile.investments.portfolio[investmentType]?.amount || 0) + amount,
            startDate: Date.now(),
            totalReturn: userProfile.investments.portfolio[investmentType]?.totalReturn || 0
        };
        userProfile.investments.totalValue += amount;

        await db.updatePlayer(interaction.user.id, userProfile);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎉 Investment Successful!')
            .setDescription(`**You've invested ${amount.toLocaleString()} coins in ${option.name}!**\n\n📈 Your investment will start generating returns immediately.`)
            .addFields([
                { name: '💰 Investment Details', value: `**Type:** ${option.emoji} ${option.name}\n**Amount:** ${amount.toLocaleString()} coins\n**Expected Return:** ${option.return}`, inline: true },
                { name: '📊 Portfolio Update', value: `**Remaining Coins:** ${userProfile.coins.toLocaleString()}\n**Total Invested:** ${userProfile.investments.totalValue.toLocaleString()}\n**Portfolio Items:** ${Object.keys(userProfile.investments.portfolio).length}/4`, inline: true },
                { name: '🎯 Projected Earnings', value: `**Daily:** ~${Math.floor(amount * 0.08).toLocaleString()} coins\n**Weekly:** ~${Math.floor(amount * 0.08 * 7).toLocaleString()} coins\n**Monthly:** ~${Math.floor(amount * 0.08 * 30).toLocaleString()} coins`, inline: true }
            ])
            .setFooter({ text: 'Returns are calculated daily. Check your portfolio regularly!' })
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('invest_portfolio')
                    .setLabel('📊 View Portfolio')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('invest_more')
                    .setLabel('💰 Invest More')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({ embeds: [embed], components: [buttons] });
    },

    async showMarketAnalysis(interaction) {
        const marketData = this.generateMarketData();
        
        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('📈 Market Analysis & Trends')
            .setDescription('**Current market conditions and investment opportunities**\n\n📊 *Data updated every hour based on global treasure hunting activity*')
            .addFields([
                {
                    name: '🏆 Top Performing Investments',
                    value: '🐉 Dragon Futures: +15% this week\n⛏️ Mining Stocks: +8% this week\n🗺️ Adventure Fund: +12% this week',
                    inline: true
                },
                {
                    name: '📉 Market Alerts',
                    value: '⚠️ Treasure Bonds: Stable but low growth\n✅ Mining Stocks: Recommended buy\n🔥 Dragon Futures: High volatility',
                    inline: true
                },
                {
                    name: '🎯 Expert Recommendations',
                    value: '• Diversify across 3+ investment types\n• Consider long-term holds (30+ days)\n• Monitor weekly for rebalancing',
                    inline: false
                }
            ])
            .setFooter({ text: 'Market data refreshes hourly • Past performance doesn\'t guarantee future results' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    getInvestmentOptions() {
        return {
            bonds: {
                name: 'Treasure Bonds',
                return: '5% daily',
                risk: 'Very Low',
                minAmount: 100,
                description: 'Stable government-backed treasure securities',
                emoji: '📜',
                riskLevel: 1
            },
            mining: {
                name: 'Mining Stocks',
                return: '12% daily',
                risk: 'Low',
                minAmount: 500,
                description: 'Invest in profitable mining operations',
                emoji: '⛏️',
                riskLevel: 2
            },
            adventure: {
                name: 'Adventure Fund',
                return: '20% daily',
                risk: 'Medium',
                minAmount: 1000,
                description: 'High-risk expeditions with big rewards',
                emoji: '🗺️',
                riskLevel: 3
            },
            dragon: {
                name: 'Dragon Futures',
                return: '35% daily',
                risk: 'High',
                minAmount: 2500,
                description: 'Volatile dragon-related investments',
                emoji: '🐉',
                riskLevel: 4
            }
        };
    },

    async updateInvestmentValues(userProfile) {
        const portfolio = userProfile.investments?.portfolio || {};
        const now = Date.now();
        const lastUpdate = userProfile.investments?.lastUpdate || now;
        const timeDiff = now - lastUpdate;
        const daysPassed = timeDiff / (24 * 60 * 60 * 1000);

        if (daysPassed < 1) return; // Update only once per day

        const investmentOptions = this.getInvestmentOptions();
        
        Object.entries(portfolio).forEach(([type, data]) => {
            const option = investmentOptions[type];
            if (option) {
                const dailyReturn = parseFloat(option.return) / 100;
                const returnAmount = data.amount * dailyReturn * Math.floor(daysPassed);
                data.totalReturn = (data.totalReturn || 0) + returnAmount;
            }
        });

        userProfile.investments.lastUpdate = now;
        await db.updatePlayer(userProfile.id || userProfile.userId, userProfile);
    },

    calculateDailyProfit(portfolio) {
        const investmentOptions = this.getInvestmentOptions();
        return Object.entries(portfolio).reduce((total, [type, data]) => {
            const option = investmentOptions[type];
            if (option) {
                const dailyReturn = parseFloat(option.return) / 100;
                return total + (data.amount * dailyReturn);
            }
            return total;
        }, 0);
    },

    calculateTotalProfit(portfolio) {
        return Object.values(portfolio).reduce((total, data) => {
            return total + (data.totalReturn || 0);
        }, 0);
    },

    calculateRiskLevel(portfolio) {
        if (Object.keys(portfolio).length === 0) return 'None';
        
        const investmentOptions = this.getInvestmentOptions();
        const avgRisk = Object.keys(portfolio).reduce((total, type) => {
            return total + (investmentOptions[type]?.riskLevel || 1);
        }, 0) / Object.keys(portfolio).length;

        if (avgRisk <= 1.5) return 'Low';
        if (avgRisk <= 2.5) return 'Medium';
        if (avgRisk <= 3.5) return 'High';
        return 'Very High';
    },

    generateMarketData() {
        // This would connect to a real market data source in production
        return {
            bonds: { performance: 3.2, trend: 'stable' },
            mining: { performance: 8.1, trend: 'up' },
            adventure: { performance: 12.4, trend: 'up' },
            dragon: { performance: -2.3, trend: 'volatile' }
        };
    }
};
