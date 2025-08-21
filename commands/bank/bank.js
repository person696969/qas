
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');
const { handleError } = require('../../utils/errorHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('🏦 Comprehensive treasure vault and financial services')
        .addSubcommand(subcommand =>
            subcommand
                .setName('dashboard')
                .setDescription('View your complete financial overview'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('deposit')
                .setDescription('Deposit coins into your account')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to deposit')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1000000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('withdraw')
                .setDescription('Withdraw coins from your account')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to withdraw')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1000000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('invest')
                .setDescription('Investment portfolio management')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Investment type')
                        .setRequired(false)
                        .addChoices(
                            { name: '🗺️ Treasure Map Shares (8% - Low Risk)', value: 'treasure_maps' },
                            { name: '🐉 Dragon Hoard Fund (15% - Medium Risk)', value: 'dragon_hoard' },
                            { name: '💎 Mystic Crystal Mining (25% - High Risk)', value: 'crystal_mining' },
                            { name: '🏺 Ancient Artifact Trading (40% - Very High Risk)', value: 'artifact_trading' },
                            { name: '🌟 Legendary Ventures (60% - Extreme Risk)', value: 'legendary_ventures' }
                        ))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to invest')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(100000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('View detailed transaction history'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('premium')
                .setDescription('Access premium banking services')),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const userId = interaction.user.id;
            let userProfile = await db.getPlayer(userId);
            
            if (!userProfile) {
                userProfile = {
                    coins: 100,
                    bank: {
                        savings: 0,
                        invested: 0,
                        interestRate: 0.05,
                        investments: {},
                        accountType: 'basic',
                        transactionHistory: [],
                        lastInterestPayout: Date.now()
                    }
                };
                await db.setPlayer(userId, userProfile);
            }

            // Ensure bank structure exists
            if (!userProfile.bank) {
                userProfile.bank = {
                    savings: 0,
                    invested: 0,
                    interestRate: 0.05,
                    investments: {},
                    accountType: 'basic',
                    transactionHistory: [],
                    lastInterestPayout: Date.now()
                };
                await db.setPlayer(userId, userProfile);
            }

            const subcommand = interaction.options.getSubcommand();
            switch (subcommand) {
                case 'dashboard':
                    await this.handleDashboard(interaction, userProfile);
                    break;
                case 'deposit':
                    await this.handleDeposit(interaction, userProfile);
                    break;
                case 'withdraw':
                    await this.handleWithdraw(interaction, userProfile);
                    break;
                case 'invest':
                    await this.handleInvest(interaction, userProfile);
                    break;
                case 'history':
                    await this.handleHistory(interaction, userProfile);
                    break;
                case 'premium':
                    await this.handlePremium(interaction, userProfile);
                    break;
            }
        } catch (error) {
            await handleError(interaction, error);
        }
    },

    async handleDashboard(interaction, userProfile) {
        const bank = userProfile.bank || {};
        const totalWealth = (userProfile.coins || 0) + (bank.savings || 0) + (bank.invested || 0);
        const accountLevel = this.getAccountLevel(totalWealth);

        // Calculate daily interest
        const timeSinceLastPayout = Date.now() - (bank.lastInterestPayout || Date.now());
        const daysSinceLastPayout = Math.floor(timeSinceLastPayout / (1000 * 60 * 60 * 24));
        const pendingInterest = Math.floor((bank.savings || 0) * (bank.interestRate || 0.05) * daysSinceLastPayout);

        const embed = new EmbedBuilder()
            .setColor('#2E8B57')
            .setTitle('🏦 **FIRST NATIONAL TREASURE BANK**')
            .setDescription('*"Your wealth, our commitment to excellence"*\n\n**Comprehensive Financial Dashboard**')
            .setThumbnail('https://cdn.discordapp.com/emojis/bank_icon.png')
            .addFields(
                {
                    name: '💰 **Account Overview**',
                    value: `**Wallet Balance:** ${(userProfile.coins || 0).toLocaleString()} coins\n` +
                           `**Savings Account:** ${(bank.savings || 0).toLocaleString()} coins\n` +
                           `**Active Investments:** ${(bank.invested || 0).toLocaleString()} coins\n` +
                           `**Total Net Worth:** ${totalWealth.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '📈 **Account Status**',
                    value: `**Account Level:** ${accountLevel.name}\n` +
                           `**Interest Rate:** ${((bank.interestRate || 0.05) * 100).toFixed(2)}% daily\n` +
                           `**Pending Interest:** ${pendingInterest.toLocaleString()} coins\n` +
                           `**Security Rating:** ${accountLevel.security}`,
                    inline: true
                },
                {
                    name: '🎯 **Performance Metrics**',
                    value: `**Investment Return:** ${this.calculateInvestmentReturn(bank.investments || {})}%\n` +
                           `**Account Age:** ${this.getAccountAge(bank)} days\n` +
                           `**Transactions:** ${(bank.transactionHistory || []).length}\n` +
                           `**Premium Status:** ${bank.accountType === 'premium' ? '✅ Active' : '❌ Inactive'}`,
                    inline: true
                }
            );

        // Add investment portfolio if exists
        if (Object.keys(bank.investments || {}).length > 0) {
            const portfolioText = Object.entries(bank.investments).map(([type, amount]) => {
                const investment = this.getInvestmentInfo(type);
                return `${investment.emoji} **${investment.name}:** ${amount.toLocaleString()} coins (${(investment.return * 100)}% return)`;
            }).join('\n');

            embed.addFields({
                name: '📊 **Investment Portfolio**',
                value: portfolioText,
                inline: false
            });
        }

        // Add recent transactions
        if (bank.transactionHistory && bank.transactionHistory.length > 0) {
            const recentTransactions = bank.transactionHistory.slice(-3).reverse().map(tx => 
                `${tx.type === 'deposit' ? '➡️' : '⬅️'} **${tx.type}:** ${tx.amount.toLocaleString()} coins - ${new Date(tx.timestamp).toLocaleDateString()}`
            ).join('\n');

            embed.addFields({
                name: '📝 **Recent Activity**',
                value: recentTransactions || 'No recent transactions',
                inline: false
            });
        }

        embed.setFooter({ 
            text: `Banking since the Great Treasure Rush • Last updated: ${new Date().toLocaleTimeString()}`,
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

        // Create interactive buttons
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('bank_quick_deposit')
                    .setLabel('Quick Deposit')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('bank_quick_withdraw')
                    .setLabel('Quick Withdraw')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏦'),
                new ButtonBuilder()
                    .setCustomId('bank_investment_center')
                    .setLabel('Investment Center')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📈'),
                new ButtonBuilder()
                    .setCustomId('bank_collect_interest')
                    .setLabel(`Collect Interest (${pendingInterest})`)
                    .setStyle(pendingInterest > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setEmoji('💎')
                    .setDisabled(pendingInterest <= 0)
            );

        const serviceButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('bank_transaction_history')
                    .setLabel('Transaction History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('bank_premium_services')
                    .setLabel('Premium Services')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⭐'),
                new ButtonBuilder()
                    .setCustomId('bank_account_settings')
                    .setLabel('Account Settings')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId('bank_financial_advisor')
                    .setLabel('Financial Advisor')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👔')
            );

        const response = await interaction.editReply({ 
            embeds: [embed], 
            components: [actionButtons, serviceButtons] 
        });

        // Handle button interactions
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000 // 5 minutes
        });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                return buttonInteraction.reply({ content: '❌ This is not your banking session!', ephemeral: true });
            }

            try {
                await buttonInteraction.deferUpdate();
                const freshProfile = await db.getPlayer(userId);
                
                switch (buttonInteraction.customId) {
                    case 'bank_collect_interest':
                        if (pendingInterest > 0) {
                            freshProfile.coins += pendingInterest;
                            freshProfile.bank.lastInterestPayout = Date.now();
                            await db.setPlayer(userId, freshProfile);
                            
                            const successEmbed = new EmbedBuilder()
                                .setColor('#00FF00')
                                .setTitle('💎 Interest Collected!')
                                .setDescription(`You collected ${pendingInterest.toLocaleString()} coins in interest!`)
                                .addFields({ name: 'New Balance', value: `${freshProfile.coins.toLocaleString()} coins` });
                            
                            await buttonInteraction.editReply({ embeds: [successEmbed], components: [] });
                        }
                        break;
                        
                    case 'bank_investment_center':
                        await this.showInvestmentCenter(buttonInteraction, freshProfile);
                        break;
                        
                    case 'bank_transaction_history':
                        await this.showTransactionHistory(buttonInteraction, freshProfile);
                        break;
                        
                    case 'bank_premium_services':
                        await this.showPremiumServices(buttonInteraction, freshProfile);
                        break;
                        
                    case 'bank_account_settings':
                        await this.showAccountSettings(buttonInteraction, freshProfile);
                        break;
                        
                    case 'bank_financial_advisor':
                        await this.showFinancialAdvice(buttonInteraction, freshProfile);
                        break;
                }
            } catch (error) {
                console.error('Button interaction error:', error);
            }
        });

        collector.on('end', () => {
            const expiredEmbed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle('🏦 Banking Session Expired')
                .setDescription('Your banking session has timed out. Use `/bank dashboard` to start a new session.');
            
            interaction.editReply({ embeds: [expiredEmbed], components: [] }).catch(() => {});
        });
    },

    async handleDeposit(interaction, userProfile) {
        const amount = interaction.options.getInteger('amount');

        if (amount > (userProfile.coins || 0)) {
            throw new Error(`You don't have enough coins! You only have ${(userProfile.coins || 0).toLocaleString()} coins.`);
        }

        // Process deposit
        userProfile.coins -= amount;
        userProfile.bank.savings += amount;
        
        // Add to transaction history
        if (!userProfile.bank.transactionHistory) userProfile.bank.transactionHistory = [];
        userProfile.bank.transactionHistory.push({
            type: 'deposit',
            amount: amount,
            timestamp: Date.now(),
            balanceAfter: userProfile.bank.savings
        });

        await db.setPlayer(interaction.user.id, userProfile);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💰 **Deposit Successful**')
            .setDescription(`Successfully deposited ${amount.toLocaleString()} coins into your savings account!`)
            .addFields(
                { name: '💳 New Wallet Balance', value: `${userProfile.coins.toLocaleString()} coins`, inline: true },
                { name: '🏦 New Savings Balance', value: `${userProfile.bank.savings.toLocaleString()} coins`, inline: true },
                { name: '📈 Daily Interest', value: `${Math.floor(userProfile.bank.savings * userProfile.bank.interestRate).toLocaleString()} coins/day`, inline: true }
            )
            .setFooter({ text: 'Thank you for banking with us!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleWithdraw(interaction, userProfile) {
        const amount = interaction.options.getInteger('amount');

        if (amount > (userProfile.bank.savings || 0)) {
            throw new Error(`You don't have enough coins in savings! You only have ${(userProfile.bank.savings || 0).toLocaleString()} coins saved.`);
        }

        // Process withdrawal
        userProfile.coins += amount;
        userProfile.bank.savings -= amount;
        
        // Add to transaction history
        if (!userProfile.bank.transactionHistory) userProfile.bank.transactionHistory = [];
        userProfile.bank.transactionHistory.push({
            type: 'withdrawal',
            amount: amount,
            timestamp: Date.now(),
            balanceAfter: userProfile.bank.savings
        });

        await db.setPlayer(interaction.user.id, userProfile);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏦 **Withdrawal Successful**')
            .setDescription(`Successfully withdrew ${amount.toLocaleString()} coins from your savings account!`)
            .addFields(
                { name: '💰 New Wallet Balance', value: `${userProfile.coins.toLocaleString()} coins`, inline: true },
                { name: '🏦 New Savings Balance', value: `${userProfile.bank.savings.toLocaleString()} coins`, inline: true },
                { name: '📉 Interest Impact', value: `${Math.floor(userProfile.bank.savings * userProfile.bank.interestRate).toLocaleString()} coins/day`, inline: true }
            )
            .setFooter({ text: 'Funds available immediately in your wallet' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleInvest(interaction, userProfile) {
        const investmentType = interaction.options.getString('type');
        const amount = interaction.options.getInteger('amount');

        if (!investmentType && !amount) {
            // Show investment overview
            await this.showInvestmentCenter(interaction, userProfile);
            return;
        }

        if (!investmentType || !amount) {
            throw new Error('Please specify both investment type and amount!');
        }

        const investment = this.getInvestmentInfo(investmentType);
        if (!investment) {
            throw new Error('Invalid investment type!');
        }

        if (amount < investment.min) {
            throw new Error(`The minimum investment for ${investment.name} is ${investment.min.toLocaleString()} coins!`);
        }

        if (amount > (userProfile.coins || 0)) {
            throw new Error(`You don't have enough coins! You need ${amount.toLocaleString()} coins.`);
        }

        // Process investment
        userProfile.coins -= amount;
        userProfile.bank.invested += amount;
        if (!userProfile.bank.investments) userProfile.bank.investments = {};
        userProfile.bank.investments[investmentType] = (userProfile.bank.investments[investmentType] || 0) + amount;
        
        await db.setPlayer(interaction.user.id, userProfile);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('📈 **Investment Successful**')
            .setDescription(`Successfully invested ${amount.toLocaleString()} coins in ${investment.name}!`)
            .addFields(
                { name: '💎 Investment Details', value: `**Type:** ${investment.name}\n**Amount:** ${amount.toLocaleString()} coins\n**Expected Return:** ${(investment.return * 100)}% annually`, inline: true },
                { name: '⚠️ Risk Assessment', value: `**Risk Level:** ${investment.risk}\n**Volatility:** ${investment.volatility}\n**Liquidity:** ${investment.liquidity}`, inline: true },
                { name: '💰 Portfolio Update', value: `**Total Invested:** ${userProfile.bank.invested.toLocaleString()} coins\n**Remaining Wallet:** ${userProfile.coins.toLocaleString()} coins`, inline: true }
            )
            .setFooter({ text: 'Investments carry risk. Past performance does not guarantee future results.' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleHistory(interaction, userProfile) {
        await this.showTransactionHistory(interaction, userProfile);
    },

    async handlePremium(interaction, userProfile) {
        await this.showPremiumServices(interaction, userProfile);
    },

    // Helper methods
    getAccountLevel(totalWealth) {
        if (totalWealth >= 1000000) return { name: '💎 Diamond Elite', security: 'Maximum', benefits: 'All premium features' };
        if (totalWealth >= 500000) return { name: '🥇 Platinum Plus', security: 'High', benefits: 'Premium + exclusive access' };
        if (totalWealth >= 100000) return { name: '🥈 Gold Standard', security: 'Enhanced', benefits: 'Premium features' };
        if (totalWealth >= 25000) return { name: '🥉 Silver Class', security: 'Standard+', benefits: 'Some premium features' };
        return { name: '⚪ Basic Member', security: 'Standard', benefits: 'Basic features' };
    },

    getInvestmentInfo(type) {
        const investments = {
            treasure_maps: { 
                name: 'Treasure Map Shares', 
                emoji: '🗺️',
                return: 0.08, 
                risk: 'Low', 
                min: 100,
                volatility: 'Low',
                liquidity: 'High'
            },
            dragon_hoard: { 
                name: 'Dragon Hoard Fund', 
                emoji: '🐉',
                return: 0.15, 
                risk: 'Medium', 
                min: 500,
                volatility: 'Medium',
                liquidity: 'Medium'
            },
            crystal_mining: { 
                name: 'Mystic Crystal Mining', 
                emoji: '💎',
                return: 0.25, 
                risk: 'High', 
                min: 1000,
                volatility: 'High',
                liquidity: 'Medium'
            },
            artifact_trading: { 
                name: 'Ancient Artifact Trading', 
                emoji: '🏺',
                return: 0.40, 
                risk: 'Very High', 
                min: 2000,
                volatility: 'Very High',
                liquidity: 'Low'
            },
            legendary_ventures: {
                name: 'Legendary Ventures',
                emoji: '🌟',
                return: 0.60,
                risk: 'Extreme',
                min: 5000,
                volatility: 'Extreme',
                liquidity: 'Very Low'
            }
        };
        return investments[type];
    },

    calculateInvestmentReturn(investments) {
        if (!investments || Object.keys(investments).length === 0) return 0;
        
        let totalReturn = 0;
        let totalInvested = 0;
        
        for (const [type, amount] of Object.entries(investments)) {
            const investment = this.getInvestmentInfo(type);
            if (investment) {
                totalReturn += amount * investment.return;
                totalInvested += amount;
            }
        }
        
        return totalInvested > 0 ? ((totalReturn / totalInvested) * 100).toFixed(1) : 0;
    },

    getAccountAge(bank) {
        const created = bank.accountCreated || Date.now();
        return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
    },

    async showInvestmentCenter(interaction, userProfile) {
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📈 **Investment Center**')
            .setDescription('**Professional Investment Management**\n\n*Diversify your portfolio with our premium investment options*');

        // Add investment options
        const investments = ['treasure_maps', 'dragon_hoard', 'crystal_mining', 'artifact_trading', 'legendary_ventures'];
        investments.forEach(type => {
            const investment = this.getInvestmentInfo(type);
            embed.addFields({
                name: `${investment.emoji} **${investment.name}**`,
                value: `**Return:** ${(investment.return * 100)}% annually\n**Risk:** ${investment.risk}\n**Minimum:** ${investment.min.toLocaleString()} coins`,
                inline: true
            });
        });

        await interaction.editReply({ embeds: [embed], components: [] });
    },

    async showTransactionHistory(interaction, userProfile) {
        const transactions = userProfile.bank.transactionHistory || [];
        
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📋 **Transaction History**')
            .setDescription('**Your Banking Activity**\n\n');

        if (transactions.length === 0) {
            embed.setDescription('No transactions found. Start banking to see your history here!');
        } else {
            const recentTransactions = transactions.slice(-10).reverse();
            const historyText = recentTransactions.map(tx => 
                `${tx.type === 'deposit' ? '➡️ **Deposit**' : '⬅️ **Withdrawal**'}: ${tx.amount.toLocaleString()} coins\n` +
                `└ Balance: ${tx.balanceAfter.toLocaleString()} coins • ${new Date(tx.timestamp).toLocaleDateString()}`
            ).join('\n\n');
            
            embed.setDescription(historyText);
        }

        await interaction.editReply({ embeds: [embed], components: [] });
    },

    async showPremiumServices(interaction, userProfile) {
        const isPremium = userProfile.bank.accountType === 'premium';
        
        const embed = new EmbedBuilder()
            .setColor(isPremium ? '#FFD700' : '#4169E1')
            .setTitle('⭐ **Premium Banking Services**')
            .setDescription(isPremium ? 
                '**You are a Premium Member!**\n\nEnjoy exclusive benefits and enhanced services.' :
                '**Upgrade to Premium Banking**\n\nUnlock exclusive features and higher returns!'
            )
            .addFields(
                { name: '🎯 **Premium Benefits**', value: '• Higher interest rates (2x multiplier)\n• Exclusive investment opportunities\n• Priority customer support\n• Advanced portfolio analytics\n• No transaction fees', inline: true },
                { name: '💰 **Upgrade Cost**', value: isPremium ? '**Already Premium!**' : '**50,000 coins**\n(One-time fee)', inline: true },
                { name: '📈 **ROI Calculation**', value: `Premium pays for itself with accounts over 250,000 coins!`, inline: true }
            );

        const upgradeButton = new ButtonBuilder()
            .setCustomId('bank_upgrade_premium')
            .setLabel(isPremium ? 'Already Premium' : 'Upgrade to Premium')
            .setStyle(isPremium ? ButtonStyle.Success : ButtonStyle.Primary)
            .setEmoji('⭐')
            .setDisabled(isPremium || (userProfile.coins || 0) < 50000);

        const row = new ActionRowBuilder().addComponents(upgradeButton);

        await interaction.editReply({ embeds: [embed], components: [row] });
    },

    async showAccountSettings(interaction, userProfile) {
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('⚙️ **Account Settings**')
            .setDescription('**Manage Your Banking Preferences**')
            .addFields(
                { name: '🔐 Security Settings', value: '• Two-factor authentication\n• Transaction notifications\n• Login alerts', inline: true },
                { name: '📊 Preferences', value: '• Auto-invest settings\n• Interest payout frequency\n• Statement delivery', inline: true },
                { name: '📱 Notifications', value: '• Large transaction alerts\n• Investment updates\n• Market news', inline: true }
            );

        await interaction.editReply({ embeds: [embed], components: [] });
    },

    async showFinancialAdvice(interaction, userProfile) {
        const totalWealth = (userProfile.coins || 0) + (userProfile.bank.savings || 0) + (userProfile.bank.invested || 0);
        const advice = this.generateFinancialAdvice(userProfile, totalWealth);
        
        const embed = new EmbedBuilder()
            .setColor('#00CED1')
            .setTitle('👔 **Personal Financial Advisor**')
            .setDescription('**Customized Financial Guidance**\n\n' + advice.summary)
            .addFields(
                { name: '📊 **Portfolio Analysis**', value: advice.portfolioAnalysis, inline: true },
                { name: '🎯 **Recommendations**', value: advice.recommendations, inline: true },
                { name: '⚠️ **Risk Assessment**', value: advice.riskAssessment, inline: true }
            )
            .setFooter({ text: 'Financial advice is for informational purposes only' });

        await interaction.editReply({ embeds: [embed], components: [] });
    },

    generateFinancialAdvice(userProfile, totalWealth) {
        const savingsRatio = (userProfile.bank.savings || 0) / Math.max(totalWealth, 1);
        const investmentRatio = (userProfile.bank.invested || 0) / Math.max(totalWealth, 1);
        
        let summary = '';
        let recommendations = '';
        let riskAssessment = '';
        
        if (totalWealth < 10000) {
            summary = 'Focus on building your initial wealth through regular activities and savings.';
            recommendations = '• Save 50% of earnings\n• Avoid high-risk investments\n• Build emergency fund';
            riskAssessment = 'Conservative approach recommended';
        } else if (totalWealth < 50000) {
            summary = 'You\'re building solid wealth! Consider diversifying your portfolio.';
            recommendations = '• Start small investments\n• Maintain 30% in savings\n• Explore low-risk options';
            riskAssessment = 'Moderate risk acceptable';
        } else {
            summary = 'Excellent wealth accumulation! Focus on optimization and growth strategies.';
            recommendations = '• Diversify investments\n• Consider premium account\n• Explore all investment tiers';
            riskAssessment = 'Higher risk tolerance advisable';
        }
        
        const portfolioAnalysis = `**Savings:** ${(savingsRatio * 100).toFixed(1)}%\n**Investments:** ${(investmentRatio * 100).toFixed(1)}%\n**Liquid:** ${((1 - savingsRatio - investmentRatio) * 100).toFixed(1)}%`;
        
        return { summary, portfolioAnalysis, recommendations, riskAssessment };
    }
};
