
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');
const { handleError } = require('../../utils/errorHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('💰 Purchase items directly from the marketplace!')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item name or ID to purchase')
                .setRequired(false)
                .setAutocomplete(true))
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('Number of items to buy')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Browse items by category')
                .setRequired(false)
                .addChoices(
                    { name: '⚔️ Weapons', value: 'weapons' },
                    { name: '🛡️ Armor', value: 'armor' },
                    { name: '🧪 Potions', value: 'potions' },
                    { name: '🔧 Tools', value: 'tools' },
                    { name: '💍 Accessories', value: 'accessories' },
                    { name: '🎯 Special Items', value: 'special' }
                )),

    async execute(interaction) {
        try {
            const itemName = interaction.options?.getString('item');
            const quantity = interaction.options?.getInteger('quantity') || 1;
            const category = interaction.options?.getString('category');

            if (itemName) {
                await this.handleDirectPurchase(interaction, itemName, quantity);
            } else if (category) {
                await this.showCategoryItems(interaction, category);
            } else {
                await this.showMarketplace(interaction);
            }
        } catch (error) {
            await handleError(interaction, error);
        }
    },

    async showMarketplace(interaction) {
        const userData = await db.getPlayer(interaction.user.id) || { coins: 0 };
        
        const marketplace = {
            featured: [
                { name: 'Dragon Sword', price: 5000, rarity: 'legendary', description: 'Legendary weapon forged from dragon scales' },
                { name: 'Health Elixir', price: 150, rarity: 'common', description: 'Restores 100 HP instantly' },
                { name: 'Lucky Charm', price: 800, rarity: 'rare', description: 'Increases luck by 15%' }
            ],
            dailyDeals: [
                { name: 'Iron Armor', price: 750, originalPrice: 1000, discount: 25 },
                { name: 'Speed Boots', price: 600, originalPrice: 800, discount: 25 }
            ]
        };

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.marketplace || '#FFD700')
            .setTitle('🏪 Grand Marketplace')
            .setDescription('**Welcome to the finest trading hub in the realm!**\n*Discover rare treasures, powerful equipment, and magical items.*')
            .setThumbnail('https://i.imgur.com/marketplace.png')
            .addFields([
                {
                    name: '💰 Your Wallet',
                    value: `${userData.coins.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '🎯 Today\'s Featured',
                    value: marketplace.featured.map(item => 
                        `**${item.name}** - ${item.price.toLocaleString()} coins`
                    ).join('\n'),
                    inline: true
                },
                {
                    name: '🏷️ Daily Deals',
                    value: marketplace.dailyDeals.map(item => 
                        `**${item.name}** - ~~${item.originalPrice}~~ **${item.price}** coins (-${item.discount}%)`
                    ).join('\n'),
                    inline: true
                },
                {
                    name: '🛍️ Quick Tips',
                    value: '• Use `/buy item:<name>` for direct purchase\n• Check categories for organized browsing\n• Bulk purchases offer discounts\n• Daily deals refresh every 24 hours',
                    inline: false
                }
            ])
            .setFooter({ text: 'Use the buttons below to browse categories or search for specific items!' })
            .setTimestamp();

        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('buy_category_select')
            .setPlaceholder('🛒 Choose a category to browse...')
            .addOptions([
                { label: '⚔️ Weapons', description: 'Swords, axes, bows and more', value: 'weapons', emoji: '⚔️' },
                { label: '🛡️ Armor', description: 'Protection for every adventure', value: 'armor', emoji: '🛡️' },
                { label: '🧪 Potions', description: 'Magical brews and elixirs', value: 'potions', emoji: '🧪' },
                { label: '🔧 Tools', description: 'Essential equipment for crafting', value: 'tools', emoji: '🔧' },
                { label: '💍 Accessories', description: 'Rings, amulets and charms', value: 'accessories', emoji: '💍' },
                { label: '🎯 Special Items', description: 'Rare and unique treasures', value: 'special', emoji: '🎯' }
            ]);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('buy_search')
                    .setLabel('🔍 Search Items')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('buy_featured')
                    .setLabel('⭐ Featured Items')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('buy_deals')
                    .setLabel('🏷️ Daily Deals')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('buy_cart')
                    .setLabel('🛒 View Cart')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(categorySelect),
                buttons
            ]
        });
    },

    async showCategoryItems(interaction, category) {
        const userData = await db.getPlayer(interaction.user.id) || { coins: 0 };
        
        const categoryItems = this.getItemsByCategory(category);
        const categoryInfo = this.getCategoryInfo(category);

        const embed = new EmbedBuilder()
            .setColor(categoryInfo.color)
            .setTitle(`${categoryInfo.emoji} ${categoryInfo.name}`)
            .setDescription(`**${categoryItems.length} premium items available**\n*${categoryInfo.description}*`)
            .addFields([
                {
                    name: '💰 Your Budget',
                    value: `${userData.coins.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '📊 Price Range',
                    value: this.getPriceRange(categoryItems),
                    inline: true
                },
                {
                    name: '⭐ Quality Range',
                    value: this.getQualityRange(categoryItems),
                    inline: true
                }
            ]);

        // Add items to embed (max 8 per page)
        const itemsToShow = categoryItems.slice(0, 8);
        itemsToShow.forEach(item => {
            const affordable = userData.coins >= item.price;
            const priceDisplay = affordable ? 
                `💰 ${item.price.toLocaleString()} coins` : 
                `💰 ~~${item.price.toLocaleString()}~~ coins ❌`;
            
            embed.addFields([{
                name: `${this.getRarityIcon(item.rarity)} ${item.name}`,
                value: `${item.description}\n${priceDisplay}${item.stats ? `\n📊 ${item.stats}` : ''}`,
                inline: true
            }]);
        });

        if (categoryItems.length > 8) {
            embed.setFooter({ 
                text: `Showing 8 of ${categoryItems.length} items. Use navigation to see more.` 
            });
        }

        const itemSelect = new StringSelectMenuBuilder()
            .setCustomId(`buy_item_select_${category}`)
            .setPlaceholder('💰 Select an item to purchase...')
            .addOptions(itemsToShow.map(item => ({
                label: item.name,
                description: `${item.price.toLocaleString()} coins - ${item.rarity}`,
                value: `purchase_${item.id}`,
                emoji: this.getRarityIcon(item.rarity)
            })));

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('buy_main')
                    .setLabel('← Back to Marketplace')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`buy_sort_${category}`)
                    .setLabel('🔄 Sort Items')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`buy_filter_${category}`)
                    .setLabel('🔍 Filter Items')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(itemSelect),
                buttons
            ]
        });
    },

    async handleDirectPurchase(interaction, itemQuery, quantity) {
        const userData = await db.getPlayer(interaction.user.id) || { coins: 0, inventory: { items: [] } };
        
        // Find item by name or ID
        const item = this.findItem(itemQuery);
        
        if (!item) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.error || '#FF0000')
                .setTitle('❌ Item Not Found')
                .setDescription(`Could not find item: **${itemQuery}**`)
                .addFields([
                    { name: '💡 Suggestions', value: '• Check spelling\n• Use `/buy` to browse categories\n• Try searching by item ID', inline: false }
                ]);

            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const totalCost = item.price * quantity;
        
        if (userData.coins < totalCost) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.error || '#FF0000')
                .setTitle('💸 Insufficient Funds')
                .setDescription(`You need **${(totalCost - userData.coins).toLocaleString()}** more coins!`)
                .addFields([
                    { name: '💰 Your Balance', value: `${userData.coins.toLocaleString()} coins`, inline: true },
                    { name: '🛒 Total Cost', value: `${totalCost.toLocaleString()} coins`, inline: true },
                    { name: '💡 Earn More Coins', value: 'Try `/daily`, `/work`, or `/hunt`!', inline: false }
                ]);

            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Apply bulk discount
        let discount = 0;
        if (quantity >= 10) discount = 0.15;
        else if (quantity >= 5) discount = 0.10;
        else if (quantity >= 3) discount = 0.05;
        
        const discountedCost = Math.floor(totalCost * (1 - discount));
        const savedAmount = totalCost - discountedCost;

        // Process purchase
        for (let i = 0; i < quantity; i++) {
            userData.inventory.items.push({
                id: item.id,
                obtained: Date.now(),
                source: 'marketplace'
            });
        }

        userData.coins -= discountedCost;

        await db.updatePlayer(interaction.user.id, {
            coins: userData.coins,
            inventory: userData.inventory
        });

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.success || '#00FF00')
            .setTitle('🎉 Purchase Successful!')
            .setDescription(`**${quantity}x ${item.name}** added to your inventory!`)
            .addFields([
                { name: '💰 Total Cost', value: `${discountedCost.toLocaleString()} coins`, inline: true },
                { name: '💰 Remaining', value: `${userData.coins.toLocaleString()} coins`, inline: true },
                { name: '📦 Items Received', value: `${quantity}x ${item.name}`, inline: true }
            ]);

        if (savedAmount > 0) {
            embed.addFields([
                { name: '🎁 Bulk Discount Applied!', value: `Saved ${savedAmount.toLocaleString()} coins (${Math.floor(discount * 100)}% off)`, inline: false }
            ]);
        }

        embed.setFooter({ text: 'Thank you for your purchase! Use /inventory to view your items.' });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('buy_again')
                    .setLabel('🛒 Buy More')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('inventory_view')
                    .setLabel('🎒 View Inventory')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [buttons] });
    },

    // Helper methods
    getItemsByCategory(category) {
        const items = {
            weapons: [
                { id: 'iron_sword', name: 'Iron Sword', price: 500, rarity: 'common', description: 'A sturdy iron blade', stats: 'ATK +15' },
                { id: 'dragon_sword', name: 'Dragon Sword', price: 5000, rarity: 'legendary', description: 'Forged from dragon scales', stats: 'ATK +50, FIRE +25' }
            ],
            armor: [
                { id: 'leather_armor', name: 'Leather Armor', price: 300, rarity: 'common', description: 'Basic protection', stats: 'DEF +10' },
                { id: 'dragon_armor', name: 'Dragon Armor', price: 4000, rarity: 'epic', description: 'Scales of ancient dragons', stats: 'DEF +40, RES +20' }
            ],
            potions: [
                { id: 'health_potion', name: 'Health Potion', price: 50, rarity: 'common', description: 'Restores 50 HP', stats: 'HEAL +50' },
                { id: 'greater_health', name: 'Greater Health Potion', price: 150, rarity: 'uncommon', description: 'Restores 150 HP', stats: 'HEAL +150' }
            ]
        };
        return items[category] || [];
    },

    getCategoryInfo(category) {
        const info = {
            weapons: { name: 'Weapons Arsenal', emoji: '⚔️', color: '#FF6B6B', description: 'Deadly tools for combat and adventure' },
            armor: { name: 'Armor Shop', emoji: '🛡️', color: '#4ECDC4', description: 'Protection for every situation' },
            potions: { name: 'Alchemy Lab', emoji: '🧪', color: '#45B7D1', description: 'Magical brews and healing elixirs' },
            tools: { name: 'Tool Workshop', emoji: '🔧', color: '#F39C12', description: 'Essential equipment for crafting' },
            accessories: { name: 'Jeweler\'s Collection', emoji: '💍', color: '#9B59B6', description: 'Enchanted rings, amulets, and charms' },
            special: { name: 'Rare Treasures', emoji: '🎯', color: '#E74C3C', description: 'Unique and legendary artifacts' }
        };
        return info[category] || { name: 'Unknown', emoji: '❓', color: '#95A5A6', description: 'Mystery category' };
    },

    findItem(query) {
        // This would search through all available items
        const allItems = [
            { id: 'health_potion', name: 'Health Potion', price: 50, rarity: 'common' },
            { id: 'iron_sword', name: 'Iron Sword', price: 500, rarity: 'common' },
            { id: 'dragon_sword', name: 'Dragon Sword', price: 5000, rarity: 'legendary' }
        ];
        
        return allItems.find(item => 
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            item.id === query.toLowerCase()
        );
    },

    getPriceRange(items) {
        if (items.length === 0) return 'N/A';
        const prices = items.map(i => i.price).sort((a, b) => a - b);
        return `${prices[0].toLocaleString()} - ${prices[prices.length - 1].toLocaleString()} coins`;
    },

    getQualityRange(items) {
        const rarities = [...new Set(items.map(i => i.rarity))];
        return rarities.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ');
    },

    getRarityIcon(rarity) {
        const icons = {
            common: '⚪',
            uncommon: '🟢',
            rare: '🔵',
            epic: '🟣',
            legendary: '🟡'
        };
        return icons[rarity] || '⚪';
    }
};
