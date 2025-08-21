
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

// Enhanced market data with dynamic pricing
const fishMarket = {
    buyers: [
        { 
            name: 'Local Fishmonger Pete', 
            emoji: '👨‍🍳',
            multiplier: 0.8, 
            minRarity: 'common',
            description: 'Buys all fish at basic prices',
            specialty: 'Volume purchases'
        },
        { 
            name: 'Seaside Restaurant', 
            emoji: '🍽️',
            multiplier: 1.2, 
            minRarity: 'uncommon',
            description: 'Pays premium for fresh catches',
            specialty: 'Quality dining'
        },
        { 
            name: 'Royal Palace Kitchen', 
            emoji: '👑',
            multiplier: 1.8, 
            minRarity: 'rare',
            description: 'Seeks rare delicacies for nobility',
            specialty: 'Exclusive cuisine'
        },
        { 
            name: 'Mystic Collector', 
            emoji: '🔮',
            multiplier: 3.0, 
            minRarity: 'legendary',
            description: 'Pays handsomely for legendary specimens',
            specialty: 'Magical research'
        },
        {
            name: 'International Trader',
            emoji: '🚢',
            multiplier: 1.5,
            minRarity: 'common',
            description: 'Export specialist with fluctuating prices',
            specialty: 'Global markets'
        }
    ],
    
    // Dynamic market conditions
    conditions: {
        boom: { multiplier: 1.5, description: 'High demand - excellent prices!' },
        normal: { multiplier: 1.0, description: 'Stable market conditions' },
        recession: { multiplier: 0.7, description: 'Low demand - reduced prices' },
        festival: { multiplier: 2.0, description: 'Festival season - premium prices!' },
        shortage: { multiplier: 1.8, description: 'Supply shortage - increased prices!' }
    },

    // Fish base values for calculations
    baseValues: {
        // Common fish
        'Herring': 8, 'Mackerel': 12, 'Cod': 15, 'Anchovy': 6, 'Sardine': 7,
        // Uncommon fish
        'Salmon': 25, 'Tuna': 35, 'Bass': 30, 'Rainbow Trout': 28, 'Sea Bream': 32,
        // Rare fish
        'Swordfish': 75, 'Marlin': 85, 'Giant Squid': 100, 'Manta Ray': 90, 'Shark': 120,
        // Legendary fish
        'Golden Fish': 300, 'Kraken': 500, 'Leviathan': 750, 'Dragon Fish': 1000, 'Phoenix Koi': 1200
    },

    rarityMultipliers: {
        common: 1.0,
        uncommon: 1.5,
        rare: 2.5,
        legendary: 5.0
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fishmarket')
        .setDescription('🏪 Visit the bustling fish market')
        .addSubcommand(subcommand =>
            subcommand
                .setName('prices')
                .setDescription('📊 Check current market prices and trends'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sell')
                .setDescription('💰 Sell your fish to buyers')
                .addStringOption(option =>
                    option.setName('buyer')
                        .setDescription('Choose a specific buyer')
                        .setRequired(false)
                        .addChoices(
                            { name: '👨‍🍳 Local Fishmonger Pete', value: '0' },
                            { name: '🍽️ Seaside Restaurant', value: '1' },
                            { name: '👑 Royal Palace Kitchen', value: '2' },
                            { name: '🔮 Mystic Collector', value: '3' },
                            { name: '🚢 International Trader', value: '4' }
                        ))
                .addStringOption(option =>
                    option.setName('fish')
                        .setDescription('Specific fish to sell')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('Amount to sell')
                        .setRequired(false)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('trends')
                .setDescription('📈 View detailed market analysis and forecasts'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('contracts')
                .setDescription('📋 Special delivery contracts for bonus rewards'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('auction')
                .setDescription('🔨 Participate in fish auctions')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            // Get player data
            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a fishing profile first! Use `/cast` to start fishing.',
                    ephemeral: true
                });
                return;
            }

            // Get current market condition
            const marketCondition = this.getCurrentMarketCondition();
            
            switch (subcommand) {
                case 'prices':
                    await this.showMarketPrices(interaction, player, marketCondition);
                    break;
                case 'sell':
                    await this.sellFish(interaction, player, marketCondition);
                    break;
                case 'trends':
                    await this.showMarketTrends(interaction, player, marketCondition);
                    break;
                case 'contracts':
                    await this.showContracts(interaction, player);
                    break;
                case 'auction':
                    await this.showAuction(interaction, player);
                    break;
            }

        } catch (error) {
            console.error('Error in fish market command:', error);
            await interaction.editReply({
                content: '❌ An error occurred at the fish market. Try again later!',
                ephemeral: true
            });
        }
    },

    async showMarketPrices(interaction, player, marketCondition) {
        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('🏪 Fish Market - Current Prices')
            .setDescription(`**Market Status:** ${marketCondition.description}\n**Price Modifier:** ${Math.round(marketCondition.multiplier * 100)}%`)
            .addFields({
                name: '📊 **Today\'s Market Overview**',
                value: `**Active Buyers:** ${fishMarket.buyers.length}\n**Market Volume:** High\n**Price Volatility:** Moderate\n**Best Time to Sell:** ${this.getBestSellingTime()}`,
                inline: false
            });

        // Show buyer information
        fishMarket.buyers.forEach((buyer, index) => {
            const finalMultiplier = buyer.multiplier * marketCondition.multiplier;
            embed.addFields({
                name: `${buyer.emoji} ${buyer.name}`,
                value: `**Rate:** ${Math.round(finalMultiplier * 100)}% base value\n**Specialty:** ${buyer.specialty}\n**Min Rarity:** ${buyer.minRarity}\n*${buyer.description}*`,
                inline: true
            });
        });

        // Show sample prices for common fish
        const samplePrices = Object.entries(fishMarket.baseValues).slice(0, 6).map(([fish, baseValue]) => {
            const finalPrice = Math.round(baseValue * marketCondition.multiplier);
            return `**${fish}:** ${finalPrice} coins`;
        }).join('\n');

        embed.addFields({
            name: '💰 Sample Prices (Base Rate)',
            value: samplePrices,
            inline: false
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('market_sell_all')
                    .setLabel('Quick Sell All')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💸'),
                new ButtonBuilder()
                    .setCustomId('market_selective_sell')
                    .setLabel('Selective Sell')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎯'),
                new ButtonBuilder()
                    .setCustomId('market_trends')
                    .setLabel('View Trends')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📈')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    async sellFish(interaction, player, marketCondition) {
        const buyerIndex = parseInt(interaction.options.getString('buyer')) || null;
        const specificFish = interaction.options.getString('fish');
        const quantity = interaction.options.getInteger('quantity');

        // Check if player has fish to sell
        if (!player.inventory?.fish || Object.keys(player.inventory.fish).length === 0) {
            await interaction.editReply({
                content: '🎣 You don\'t have any fish to sell! Go fishing first with `/cast`.',
                ephemeral: true
            });
            return;
        }

        const fishInventory = player.inventory.fish;
        let totalEarnings = 0;
        let soldItems = [];

        if (specificFish && quantity) {
            // Sell specific fish
            if (!fishInventory[specificFish] || fishInventory[specificFish] < quantity) {
                await interaction.editReply({
                    content: `❌ You don't have ${quantity} ${specificFish}(s) to sell!`,
                    ephemeral: true
                });
                return;
            }

            const buyer = buyerIndex !== null ? fishMarket.buyers[buyerIndex] : this.getBestBuyer(specificFish);
            const baseValue = fishMarket.baseValues[specificFish] || 5;
            const salePrice = Math.round(baseValue * buyer.multiplier * marketCondition.multiplier);
            const totalValue = salePrice * quantity;

            fishInventory[specificFish] -= quantity;
            if (fishInventory[specificFish] === 0) delete fishInventory[specificFish];

            totalEarnings = totalValue;
            soldItems.push({ fish: specificFish, quantity, price: salePrice, buyer: buyer.name });

        } else {
            // Sell all fish or to specific buyer
            for (const [fishName, fishCount] of Object.entries(fishInventory)) {
                const buyer = buyerIndex !== null ? fishMarket.buyers[buyerIndex] : this.getBestBuyer(fishName);
                
                // Check if buyer accepts this fish rarity
                const fishRarity = this.getFishRarity(fishName);
                if (!this.buyerAcceptsFish(buyer, fishRarity)) continue;

                const baseValue = fishMarket.baseValues[fishName] || 5;
                const salePrice = Math.round(baseValue * buyer.multiplier * marketCondition.multiplier);
                const totalValue = salePrice * fishCount;

                totalEarnings += totalValue;
                soldItems.push({ fish: fishName, quantity: fishCount, price: salePrice, buyer: buyer.name });
                delete fishInventory[fishName];
            }
        }

        if (soldItems.length === 0) {
            await interaction.editReply({
                content: '❌ No suitable fish found for the selected buyer!',
                ephemeral: true
            });
            return;
        }

        // Update player data
        player.coins += totalEarnings;
        player.inventory.fish = fishInventory;
        
        // Add market experience
        player.marketExp = (player.marketExp || 0) + Math.floor(totalEarnings / 10);
        
        await db.updatePlayer(interaction.user.id, player);

        // Create sale summary
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💰 Fish Sale Complete!')
            .setDescription('**Your fish have been sold successfully!**')
            .addFields(
                { name: '💵 Total Earnings', value: `${totalEarnings} coins`, inline: true },
                { name: '🐟 Items Sold', value: soldItems.length.toString(), inline: true },
                { name: '👛 New Balance', value: `${player.coins} coins`, inline: true }
            );

        // Add sale details
        const saleDetails = soldItems.map(item => 
            `**${item.fish}** x${item.quantity} → ${item.price * item.quantity} coins\n*Sold to ${item.buyer}*`
        ).join('\n\n');

        if (saleDetails.length <= 1024) {
            embed.addFields({
                name: '📋 Sale Details',
                value: saleDetails,
                inline: false
            });
        }

        // Market experience bonus
        if (player.marketExp >= 100) {
            embed.addFields({
                name: '📈 Market Experience',
                value: `Level ${Math.floor(player.marketExp / 100)} Market Trader`,
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('market_prices')
                    .setLabel('Check Prices')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('go_fishing')
                    .setLabel('Go Fishing')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎣'),
                new ButtonBuilder()
                    .setCustomId('market_contracts')
                    .setLabel('View Contracts')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    async showMarketTrends(interaction, player, marketCondition) {
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📈 Fish Market Trends & Analysis')
            .setDescription('**Professional market analysis and forecasts**')
            .addFields(
                {
                    name: '📊 Current Market State',
                    value: `**Condition:** ${marketCondition.description}\n**Price Index:** ${Math.round(marketCondition.multiplier * 100)}\n**Volatility:** Medium\n**Trading Volume:** ${Math.floor(Math.random() * 1000 + 500)}`,
                    inline: true
                },
                {
                    name: '📅 Weekly Forecast',
                    value: `**Monday:** Stable 📊\n**Tuesday:** Rising 📈\n**Wednesday:** Peak 🔝\n**Thursday:** Declining 📉\n**Friday:** Recovery 📊\n**Weekend:** Festival Bonus 🎉`,
                    inline: true
                },
                {
                    name: '🎯 Trading Tips',
                    value: `• Legendary fish prices peak during full moons\n• Common fish sell best on weekdays\n• Festival events boost all prices by 100%\n• Storm weather increases rare fish demand`,
                    inline: false
                }
            );

        // Price history simulation
        const priceHistory = this.generatePriceHistory();
        embed.addFields({
            name: '📉 Price History (Last 7 Days)',
            value: priceHistory.map((price, index) => 
                `Day ${index + 1}: ${price}% ${price > 100 ? '📈' : price < 100 ? '📉' : '📊'}`
            ).join('\n'),
            inline: false
        });

        // Hot fish recommendations
        const hotFish = this.getHotFishRecommendations();
        embed.addFields({
            name: '🔥 Hot Fish This Week',
            value: hotFish.join('\n'),
            inline: false
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('market_alerts')
                    .setLabel('Set Price Alerts')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔔'),
                new ButtonBuilder()
                    .setCustomId('market_history')
                    .setLabel('Detailed History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📚'),
                new ButtonBuilder()
                    .setCustomId('market_predictions')
                    .setLabel('AI Predictions')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🤖')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    async showContracts(interaction, player) {
        const contracts = this.generateDailyContracts();
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('📋 Special Delivery Contracts')
            .setDescription('**Complete these contracts for bonus rewards!**\n*Contracts reset daily at midnight*')
            .addFields({
                name: '⏰ Time Remaining',
                value: this.getTimeUntilReset(),
                inline: true
            });

        contracts.forEach((contract, index) => {
            const progress = player.contracts?.[contract.id] || 0;
            const completed = progress >= contract.target;
            const status = completed ? '✅ Completed' : `📈 ${progress}/${contract.target}`;
            
            embed.addFields({
                name: `${contract.emoji} ${contract.title}`,
                value: `**Target:** ${contract.description}\n**Progress:** ${status}\n**Reward:** ${contract.reward}\n**Bonus:** ${contract.bonus}`,
                inline: true
            });
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('contracts_claim')
                    .setLabel('Claim Rewards')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎁'),
                new ButtonBuilder()
                    .setCustomId('contracts_refresh')
                    .setLabel('Check Progress')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('contracts_history')
                    .setLabel('Contract History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📜')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    async showAuction(interaction, player) {
        const auctions = this.getCurrentAuctions();
        
        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('🔨 Fish Auction House')
            .setDescription('**Bid on rare fish from other players!**\n*Auctions end automatically after time expires*')
            .addFields({
                name: '💰 Your Auction Balance',
                value: `${player.auctionBalance || 0} coins`,
                inline: true
            });

        auctions.forEach(auction => {
            const timeLeft = this.getTimeRemaining(auction.endTime);
            embed.addFields({
                name: `${auction.emoji} ${auction.fish} (${auction.rarity})`,
                value: `**Current Bid:** ${auction.currentBid} coins\n**Bidder:** ${auction.highestBidder}\n**Time Left:** ${timeLeft}\n**Min Increment:** ${auction.minIncrement} coins`,
                inline: true
            });
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('auction_bid')
                    .setLabel('Place Bid')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('auction_create')
                    .setLabel('Create Auction')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📢'),
                new ButtonBuilder()
                    .setCustomId('auction_my_bids')
                    .setLabel('My Bids')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👤')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    // Utility functions
    getCurrentMarketCondition() {
        const conditions = Object.keys(fishMarket.conditions);
        const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
        return {
            name: randomCondition,
            ...fishMarket.conditions[randomCondition]
        };
    },

    getBestBuyer(fishName) {
        const fishRarity = this.getFishRarity(fishName);
        const suitableBuyers = fishMarket.buyers.filter(buyer => 
            this.buyerAcceptsFish(buyer, fishRarity)
        );
        return suitableBuyers.reduce((best, current) => 
            current.multiplier > best.multiplier ? current : best
        );
    },

    getFishRarity(fishName) {
        if (['Golden Fish', 'Kraken', 'Leviathan', 'Dragon Fish', 'Phoenix Koi'].includes(fishName)) return 'legendary';
        if (['Swordfish', 'Marlin', 'Giant Squid', 'Manta Ray', 'Shark'].includes(fishName)) return 'rare';
        if (['Salmon', 'Tuna', 'Bass', 'Rainbow Trout', 'Sea Bream'].includes(fishName)) return 'uncommon';
        return 'common';
    },

    buyerAcceptsFish(buyer, fishRarity) {
        const rarityOrder = ['common', 'uncommon', 'rare', 'legendary'];
        return rarityOrder.indexOf(fishRarity) >= rarityOrder.indexOf(buyer.minRarity);
    },

    getBestSellingTime() {
        const times = ['Morning (6-9 AM)', 'Afternoon (2-5 PM)', 'Evening (7-10 PM)', 'Late Night (11 PM-1 AM)'];
        return times[Math.floor(Math.random() * times.length)];
    },

    generatePriceHistory() {
        return Array.from({ length: 7 }, () => Math.floor(Math.random() * 60 + 70));
    },

    getHotFishRecommendations() {
        return [
            '🔥 **Dragon Fish** - Up 45% this week',
            '📈 **Giant Squid** - High demand from restaurants',
            '⭐ **Golden Fish** - Collectors paying premium',
            '🎯 **Swordfish** - Tournament season bonus'
        ];
    },

    generateDailyContracts() {
        return [
            {
                id: 'common_fisher',
                emoji: '🐟',
                title: 'Common Fisher',
                description: 'Catch 10 common fish',
                target: 10,
                reward: '500 coins',
                bonus: '+50% XP for common catches'
            },
            {
                id: 'rare_hunter',
                emoji: '🦈',
                title: 'Rare Hunter',
                description: 'Catch 3 rare fish',
                target: 3,
                reward: '1500 coins + Rare Bait',
                bonus: 'Unlock legendary fishing spot'
            },
            {
                id: 'market_trader',
                emoji: '💰',
                title: 'Market Trader',
                description: 'Earn 2000 coins from selling',
                target: 2000,
                reward: 'Premium Rod Upgrade',
                bonus: '+10% market prices for 24h'
            }
        ];
    },

    getCurrentAuctions() {
        return [
            {
                fish: 'Mystic Leviathan',
                rarity: 'Legendary',
                emoji: '🐋',
                currentBid: 5000,
                highestBidder: 'Anonymous',
                endTime: Date.now() + 3600000, // 1 hour
                minIncrement: 100
            },
            {
                fish: 'Crystal Swordfish',
                rarity: 'Rare',
                emoji: '🗡️',
                currentBid: 800,
                highestBidder: 'Fisher123',
                endTime: Date.now() + 1800000, // 30 minutes
                minIncrement: 50
            }
        ];
    },

    getTimeUntilReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const diff = tomorrow - now;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    },

    getTimeRemaining(endTime) {
        const now = Date.now();
        const diff = endTime - now;
        if (diff <= 0) return 'Ended';
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m`;
    }
};
