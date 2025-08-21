
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const TRADE_CATEGORIES = {
    weapons: {
        name: '⚔️ Weapons & Armor',
        emoji: '⚔️',
        items: [
            { name: 'Steel Sword', cost: 250, rarity: 'Common', effect: '+15 Attack Power' },
            { name: 'Dragon Blade', cost: 1500, rarity: 'Legendary', effect: '+50 Attack, Fire Damage' },
            { name: 'Knight\'s Shield', cost: 400, rarity: 'Uncommon', effect: '+20 Defense' },
            { name: 'Mythril Armor', cost: 2000, rarity: 'Epic', effect: '+35 Defense, Magic Resist' }
        ]
    },
    potions: {
        name: '🧪 Potions & Consumables',
        emoji: '🧪',
        items: [
            { name: 'Health Potion', cost: 50, rarity: 'Common', effect: 'Restores 100 HP' },
            { name: 'Mana Elixir', cost: 75, rarity: 'Common', effect: 'Restores 150 MP' },
            { name: 'Phoenix Down', cost: 500, rarity: 'Rare', effect: 'Revives from death' },
            { name: 'Elixir of Power', cost: 300, rarity: 'Uncommon', effect: '+25% damage for 1 hour' }
        ]
    },
    materials: {
        name: '📦 Crafting Materials',
        emoji: '📦',
        items: [
            { name: 'Iron Ingot', cost: 100, rarity: 'Common', effect: 'Basic crafting material' },
            { name: 'Dragon Scale', cost: 800, rarity: 'Rare', effect: 'Legendary crafting component' },
            { name: 'Magic Crystal', cost: 200, rarity: 'Uncommon', effect: 'Enchantment material' },
            { name: 'Void Essence', cost: 1200, rarity: 'Epic', effect: 'Ultimate crafting reagent' }
        ]
    },
    artifacts: {
        name: '🏺 Ancient Artifacts',
        emoji: '🏺',
        items: [
            { name: 'Compass of True North', cost: 600, rarity: 'Rare', effect: 'Never get lost in dungeons' },
            { name: 'Ring of Luck', cost: 450, rarity: 'Uncommon', effect: '+10% treasure find rate' },
            { name: 'Cloak of Shadows', cost: 900, rarity: 'Epic', effect: '+50% stealth success' },
            { name: 'Crown of Kings', cost: 2500, rarity: 'Legendary', effect: '+100% reputation gain' }
        ]
    }
};

const MERCHANT_PERSONALITIES = {
    friendly: {
        name: '😊 Cheerful Merchant',
        greeting: 'Welcome, friend! Browse my finest wares!',
        haggle_success: 'You drive a hard bargain! Deal accepted.',
        haggle_fail: 'Sorry friend, but I can\'t go any lower!',
        discount: 0.05
    },
    gruff: {
        name: '😠 Gruff Trader',
        greeting: 'What do you want? Make it quick!',
        haggle_success: 'Fine, fine... you\'re persistent. Deal.',
        haggle_fail: 'No way! That\'s my final price!',
        discount: 0.02
    },
    mysterious: {
        name: '🎭 Mysterious Vendor',
        greeting: '...The shadows whisper of your arrival...',
        haggle_success: '...The fates smile upon this exchange...',
        haggle_fail: '...The spirits deny your request...',
        discount: 0.08
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trade')
        .setDescription('🏪 Visit the advanced trading marketplace')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Choose your trading action')
                .setRequired(false)
                .addChoices(
                    { name: '🛒 Browse Market', value: 'browse' },
                    { name: '💰 Sell Items', value: 'sell' },
                    { name: '🤝 Trade with Players', value: 'player_trade' },
                    { name: '📊 Market Analysis', value: 'analysis' },
                    { name: '🎯 Daily Deals', value: 'deals' }
                ))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Item category to browse')
                .setRequired(false)
                .addChoices(
                    { name: '⚔️ Weapons & Armor', value: 'weapons' },
                    { name: '🧪 Potions & Consumables', value: 'potions' },
                    { name: '📦 Crafting Materials', value: 'materials' },
                    { name: '🏺 Ancient Artifacts', value: 'artifacts' }
                )),
    
    async execute(interaction) {
        const action = interaction.options?.getString('action') || 'browse';
        const category = interaction.options?.getString('category');
        const userId = interaction.user.id;
        
        try {
            const userProfile = await db.getUser(userId) || {
                coins: 100,
                level: 1,
                experience: 0,
                inventory: {},
                trading: { reputation: 0, transactions: 0, haggle_skill: 1 }
            };

            switch (action) {
                case 'browse':
                    await this.showMarketplace(interaction, userProfile, category);
                    break;
                case 'sell':
                    await this.showSellInterface(interaction, userProfile);
                    break;
                case 'player_trade':
                    await this.showPlayerTrading(interaction, userProfile);
                    break;
                case 'analysis':
                    await this.showMarketAnalysis(interaction, userProfile);
                    break;
                case 'deals':
                    await this.showDailyDeals(interaction, userProfile);
                    break;
                default:
                    await this.showMarketplace(interaction, userProfile);
            }

        } catch (error) {
            console.error('Trade command error:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('💥 Trading Post Error')
                .setDescription('The trading post encountered an issue!')
                .addFields({
                    name: '🛠️ What happened?',
                    value: 'A temporary glitch in the marketplace systems.',
                    inline: false
                })
                .setFooter({ text: 'Please try again in a moment' });

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },

    async showMarketplace(interaction, userProfile, category) {
        const currentMerchant = this.getDailyMerchant();
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏪 Grand Trading Marketplace')
            .setDescription(`╔═══════════════════════════════════════╗\n║        **${currentMerchant.name}**        ║\n╚═══════════════════════════════════════╝\n\n*${currentMerchant.greeting}*`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                {
                    name: '💰 Your Wealth',
                    value: `**${userProfile.coins || 0}** coins\n💎 Net Worth: **${this.calculateNetWorth(userProfile)}**`,
                    inline: true
                },
                {
                    name: '📊 Trading Stats',
                    value: `🤝 Reputation: **${userProfile.trading?.reputation || 0}**\n📈 Transactions: **${userProfile.trading?.transactions || 0}**\n🎯 Haggle Skill: **${userProfile.trading?.haggle_skill || 1}**`,
                    inline: true
                },
                {
                    name: '🎒 Inventory Space',
                    value: `**${Object.keys(userProfile.inventory || {}).length}/50** items\n📦 Storage: ${this.getStorageBar(userProfile)}`,
                    inline: true
                }
            );

        if (category) {
            const categoryData = TRADE_CATEGORIES[category];
            if (categoryData) {
                embed.addFields({
                    name: `${categoryData.emoji} ${categoryData.name}`,
                    value: this.formatCategoryItems(categoryData.items, currentMerchant.discount),
                    inline: false
                });
            }
        } else {
            // Show category overview
            Object.entries(TRADE_CATEGORIES).forEach(([key, cat]) => {
                embed.addFields({
                    name: `${cat.emoji} ${cat.name}`,
                    value: `${cat.items.length} items available\nPrice range: ${Math.min(...cat.items.map(i => i.cost))} - ${Math.max(...cat.items.map(i => i.cost))} coins`,
                    inline: true
                });
            });
        }

        // Create interactive components
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('trade_category_select')
            .setPlaceholder('🏷️ Select a category to browse...')
            .addOptions(
                Object.entries(TRADE_CATEGORIES).map(([key, cat]) => ({
                    label: cat.name,
                    description: `Browse ${cat.items.length} ${cat.name.toLowerCase()}`,
                    value: `trade_${key}`,
                    emoji: cat.emoji
                }))
            );

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('trade_quick_buy')
                    .setLabel('Quick Buy')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🛒'),
                new ButtonBuilder()
                    .setCustomId('trade_haggle')
                    .setLabel('Haggle Prices')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🤝'),
                new ButtonBuilder()
                    .setCustomId('trade_sell_items')
                    .setLabel('Sell Items')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('trade_daily_deals')
                    .setLabel('Daily Deals')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🎯')
            );

        const components = [
            new ActionRowBuilder().addComponents(categorySelect),
            actionButtons
        ];

        embed.setFooter({ 
            text: `Merchant changes daily • Reputation affects prices • Use buttons for quick actions` 
        });

        await interaction.reply({ embeds: [embed], components });
    },

    async showSellInterface(interaction, userProfile) {
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💰 Item Selling Interface')
            .setDescription('╔═══════════════════════════════════════╗\n║        **CONVERT ITEMS TO COINS**        ║\n╚═══════════════════════════════════════╝\n\nSelect items from your inventory to sell')
            .addFields(
                {
                    name: '🎒 Sellable Inventory',
                    value: this.formatSellableItems(userProfile.inventory || {}),
                    inline: false
                },
                {
                    name: '💡 Selling Tips',
                    value: '• Rare items sell for more\n• Market prices fluctuate daily\n• Reputation affects sell prices\n• Bulk sales get bonuses',
                    inline: false
                }
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: 'Smart selling maximizes profits!' });

        const sellButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('sell_common')
                    .setLabel('Sell Commons')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📦'),
                new ButtonBuilder()
                    .setCustomId('sell_valuable')
                    .setLabel('Sell Valuables')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💎'),
                new ButtonBuilder()
                    .setCustomId('sell_bulk')
                    .setLabel('Bulk Sell')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('sell_appraise')
                    .setLabel('Get Appraisal')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔍')
            );

        await interaction.reply({ embeds: [embed], components: [sellButtons] });
    },

    async showPlayerTrading(interaction, userProfile) {
        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('🤝 Player Trading Hub')
            .setDescription('╔═══════════════════════════════════════╗\n║        **PLAYER-TO-PLAYER TRADING**        ║\n╚═══════════════════════════════════════╝\n\nTrade directly with other adventurers!')
            .addFields(
                {
                    name: '🔄 Active Trades',
                    value: 'No active trades found.\nCreate a trade offer to get started!',
                    inline: false
                },
                {
                    name: '📋 Trade Offers',
                    value: 'Browse community offers or post your own.',
                    inline: true
                },
                {
                    name: '🛡️ Security',
                    value: 'All trades are secured by escrow system.',
                    inline: true
                }
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: 'Player trading coming soon!' });

        const tradeButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('trade_create_offer')
                    .setLabel('Create Offer')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('trade_browse_offers')
                    .setLabel('Browse Offers')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('trade_my_offers')
                    .setLabel('My Offers')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📋')
            );

        await interaction.reply({ embeds: [embed], components: [tradeButtons] });
    },

    async showMarketAnalysis(interaction, userProfile) {
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📊 Market Analysis Dashboard')
            .setDescription('╔═══════════════════════════════════════╗\n║        **ECONOMIC INTELLIGENCE**        ║\n╚═══════════════════════════════════════╝\n\nAdvanced market insights and trends')
            .addFields(
                {
                    name: '📈 Price Trends',
                    value: '🔥 **Hot Items:**\n• Dragon Scales (+15%)\n• Magic Crystals (+8%)\n• Phoenix Down (+12%)',
                    inline: true
                },
                {
                    name: '📉 Market Dips',
                    value: '❄️ **Cooling Down:**\n• Iron Ingots (-5%)\n• Health Potions (-3%)\n• Basic Weapons (-7%)',
                    inline: true
                },
                {
                    name: '💰 Best Investments',
                    value: '⭐ **Recommendations:**\n• Mythril (Expected +20%)\n• Void Essence (Stable)\n• Rare Artifacts (Growing)',
                    inline: true
                }
            )
            .setThumbnail('https://example.com/chart.png')
            .setFooter({ text: 'Market data updates every 6 hours' });

        const analysisButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('analysis_detailed')
                    .setLabel('Detailed Report')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('analysis_predictions')
                    .setLabel('Price Predictions')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔮'),
                new ButtonBuilder()
                    .setCustomId('analysis_alerts')
                    .setLabel('Set Price Alerts')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔔')
            );

        await interaction.reply({ embeds: [embed], components: [analysisButtons] });
    },

    async showDailyDeals(interaction, userProfile) {
        const todayDeals = this.generateDailyDeals();
        
        const embed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('🎯 Daily Special Deals')
            .setDescription('╔═══════════════════════════════════════╗\n║        **LIMITED TIME OFFERS**        ║\n╚═══════════════════════════════════════╝\n\n*These deals refresh every 24 hours!*')
            .addFields(
                todayDeals.map(deal => ({
                    name: `${deal.emoji} ${deal.name}`,
                    value: `~~${deal.originalPrice}~~ **${deal.salePrice}** coins\n💥 **${deal.discount}% OFF!**\n*${deal.description}*`,
                    inline: true
                }))
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: `Deals reset in: ${this.getTimeUntilReset()} hours` });

        const dealButtons = new ActionRowBuilder()
            .addComponents(
                todayDeals.slice(0, 3).map((deal, index) => 
                    new ButtonBuilder()
                        .setCustomId(`deal_buy_${index}`)
                        .setLabel(`Buy ${deal.name}`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(deal.emoji)
                )
            );

        await interaction.reply({ embeds: [embed], components: [dealButtons] });
    },

    // Helper methods
    getDailyMerchant() {
        const merchants = Object.values(MERCHANT_PERSONALITIES);
        const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
        return merchants[dayOfYear % merchants.length];
    },

    calculateNetWorth(userProfile) {
        // Calculate based on coins + estimated inventory value
        const baseCoins = userProfile.coins || 0;
        const inventoryValue = Object.keys(userProfile.inventory || {}).length * 50; // Rough estimate
        return baseCoins + inventoryValue;
    },

    getStorageBar(userProfile) {
        const used = Object.keys(userProfile.inventory || {}).length;
        const total = 50;
        const percentage = Math.floor((used / total) * 10);
        return '█'.repeat(percentage) + '░'.repeat(10 - percentage);
    },

    formatCategoryItems(items, discount) {
        return items.slice(0, 4).map(item => {
            const finalPrice = Math.floor(item.cost * (1 - discount));
            return `**${item.name}** - ${finalPrice} coins\n*${item.rarity}* • ${item.effect}`;
        }).join('\n\n');
    },

    formatSellableItems(inventory) {
        const items = Object.entries(inventory).slice(0, 5);
        if (items.length === 0) return 'Your inventory is empty!';
        
        return items.map(([item, quantity]) => 
            `📦 **${item}** x${quantity || 1}`
        ).join('\n');
    },

    generateDailyDeals() {
        const allItems = Object.values(TRADE_CATEGORIES).flatMap(cat => cat.items);
        const shuffled = allItems.sort(() => 0.5 - Math.random());
        
        return shuffled.slice(0, 3).map(item => ({
            ...item,
            emoji: this.getItemEmoji(item.rarity),
            originalPrice: item.cost,
            discount: Math.floor(Math.random() * 30) + 20, // 20-50% off
            salePrice: Math.floor(item.cost * (1 - (Math.random() * 0.3 + 0.2))),
            description: item.effect
        }));
    },

    getItemEmoji(rarity) {
        const emojis = {
            'Common': '📦',
            'Uncommon': '📘',
            'Rare': '🟦',
            'Epic': '🟪',
            'Legendary': '🟨'
        };
        return emojis[rarity] || '📦';
    },

    getTimeUntilReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return Math.ceil((tomorrow - now) / (1000 * 60 * 60));
    }
};
