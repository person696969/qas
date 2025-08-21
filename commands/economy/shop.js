
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const SHOP_CATEGORIES = {
    weapons: { name: '⚔️ Weapons', emoji: '⚔️', description: 'Swords, axes, and magical weapons' },
    armor: { name: '🛡️ Armor', emoji: '🛡️', description: 'Protective gear and shields' },
    accessories: { name: '💍 Accessories', emoji: '💍', description: 'Rings, amulets, and charms' },
    tools: { name: '🔧 Tools', emoji: '🔧', description: 'Mining picks, fishing rods, and utilities' },
    consumables: { name: '🧪 Consumables', emoji: '🧪', description: 'Potions, food, and temporary items' },
    materials: { name: '🔨 Materials', emoji: '🔨', description: 'Crafting components and resources' },
    special: { name: '⭐ Special Items', emoji: '⭐', description: 'Rare and unique treasures' },
    pets: { name: '🐾 Companions', emoji: '🐾', description: 'Loyal pets and companions' }
};

const SHOP_ITEMS = {
    weapons: [
        { id: 'iron_sword', name: 'Iron Sword', price: 500, rarity: 'common', description: 'A sturdy iron blade for new adventurers', stats: { attack: 15 } },
        { id: 'steel_blade', name: 'Steel Blade', price: 1200, rarity: 'uncommon', description: 'Sharp steel sword with excellent balance', stats: { attack: 25 } },
        { id: 'enchanted_sword', name: 'Enchanted Sword', price: 3000, rarity: 'rare', description: 'Magically enhanced blade with fire enchantment', stats: { attack: 40, fire: 10 } },
        { id: 'dragon_slayer', name: 'Dragon Slayer', price: 8000, rarity: 'epic', description: 'Legendary weapon forged to slay dragons', stats: { attack: 75, crit: 20 } },
        { id: 'excalibur', name: 'Excalibur', price: 25000, rarity: 'legendary', description: 'The legendary sword of kings', stats: { attack: 150, all_stats: 25 } }
    ],
    armor: [
        { id: 'leather_armor', name: 'Leather Armor', price: 300, rarity: 'common', description: 'Basic protection for starting adventurers', stats: { defense: 10 } },
        { id: 'chainmail', name: 'Chainmail Armor', price: 800, rarity: 'uncommon', description: 'Flexible metal protection', stats: { defense: 20 } },
        { id: 'plate_armor', name: 'Plate Armor', price: 2000, rarity: 'rare', description: 'Heavy steel plate armor', stats: { defense: 35, health: 50 } },
        { id: 'dragon_scale', name: 'Dragon Scale Mail', price: 6000, rarity: 'epic', description: 'Armor crafted from dragon scales', stats: { defense: 60, fire_resist: 50 } },
        { id: 'celestial_armor', name: 'Celestial Armor', price: 20000, rarity: 'legendary', description: 'Divine armor blessed by the gods', stats: { defense: 100, all_resist: 25 } }
    ],
    consumables: [
        { id: 'health_potion', name: 'Health Potion', price: 50, rarity: 'common', description: 'Restores 100 HP instantly', effect: 'heal_100' },
        { id: 'mana_potion', name: 'Mana Potion', price: 75, rarity: 'common', description: 'Restores 50 MP instantly', effect: 'mana_50' },
        { id: 'strength_elixir', name: 'Strength Elixir', price: 200, rarity: 'uncommon', description: 'Temporarily increases attack by 25%', effect: 'str_boost' },
        { id: 'lucky_charm', name: 'Lucky Charm', price: 500, rarity: 'rare', description: 'Increases luck for 1 hour', effect: 'luck_boost' },
        { id: 'phoenix_tear', name: 'Phoenix Tear', price: 2000, rarity: 'epic', description: 'Automatically revives upon death', effect: 'revive' }
    ],
    tools: [
        { id: 'iron_pickaxe', name: 'Iron Pickaxe', price: 400, rarity: 'common', description: 'Basic mining tool', stats: { mining: 15 } },
        { id: 'fishing_rod', name: 'Fishing Rod', price: 250, rarity: 'common', description: 'Catch fish in various waters', stats: { fishing: 10 } },
        { id: 'treasure_detector', name: 'Treasure Detector', price: 1500, rarity: 'uncommon', description: 'Helps locate hidden treasures', stats: { detection: 25 } },
        { id: 'master_tools', name: 'Master\'s Toolkit', price: 5000, rarity: 'rare', description: 'Professional grade tools for experts', stats: { all_skills: 20 } }
    ],
    accessories: [
        { id: 'power_ring', name: 'Ring of Power', price: 800, rarity: 'uncommon', description: 'Increases overall effectiveness', stats: { power: 15 } },
        { id: 'speed_amulet', name: 'Amulet of Speed', price: 1200, rarity: 'rare', description: 'Greatly increases movement speed', stats: { speed: 30 } },
        { id: 'mages_pendant', name: 'Mage\'s Pendant', price: 2500, rarity: 'epic', description: 'Amplifies magical abilities', stats: { magic: 40, mana: 100 } }
    ],
    materials: [
        { id: 'iron_ore', name: 'Iron Ore', price: 25, rarity: 'common', description: 'Basic crafting material' },
        { id: 'gold_ore', name: 'Gold Ore', price: 100, rarity: 'uncommon', description: 'Valuable crafting material' },
        { id: 'mithril', name: 'Mithril', price: 500, rarity: 'rare', description: 'Rare and lightweight metal' },
        { id: 'dragon_essence', name: 'Dragon Essence', price: 2000, rarity: 'epic', description: 'Powerful magical essence' }
    ],
    pets: [
        { id: 'wolf_pup', name: 'Wolf Pup', price: 1000, rarity: 'uncommon', description: 'A loyal companion that grows stronger', ability: 'Pack Hunter' },
        { id: 'phoenix_chick', name: 'Phoenix Chick', price: 5000, rarity: 'epic', description: 'A mythical bird that brings good fortune', ability: 'Rebirth' },
        { id: 'dragon_hatchling', name: 'Dragon Hatchling', price: 15000, rarity: 'legendary', description: 'A baby dragon with immense potential', ability: 'Dragon Breath' }
    ]
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('🛒 Browse and purchase items from the treasure hunter shop!')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Browse specific item category')
                .setRequired(false)
                .addChoices(
                    ...Object.entries(SHOP_CATEGORIES).map(([key, cat]) => ({
                        name: cat.name,
                        value: key
                    }))
                ))
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Buy specific item directly')
                .setRequired(false)
                .setAutocomplete(true))
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('Number of items to buy')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(50))
        .addStringOption(option =>
            option.setName('filter')
                .setDescription('Filter items by criteria')
                .setRequired(false)
                .addChoices(
                    { name: '💰 Affordable (under 1000)', value: 'affordable' },
                    { name: '💎 Premium (over 1000)', value: 'premium' },
                    { name: '⭐ High Quality (rare+)', value: 'quality' },
                    { name: '🔥 New Arrivals', value: 'new' }
                )),

    async execute(interaction) {
        const category = interaction.options?.getString('category');
        const itemName = interaction.options?.getString('item');
        const quantity = interaction.options?.getInteger('quantity') || 1;
        const filter = interaction.options?.getString('filter');

        if (itemName) {
            await this.handleDirectPurchase(interaction, itemName, quantity);
        } else if (category) {
            await this.showCategory(interaction, category, filter);
        } else {
            await this.showMainShop(interaction, filter);
        }
    },

    async showMainShop(interaction, filter) {
        const userData = await db.getPlayer(interaction.user.id) || { coins: 0 };
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏪 Treasure Hunter\'s Emporium')
            .setDescription('**Welcome to the finest shop in all the realms!**\n\n✨ *Your one-stop destination for all adventuring needs*')
            .setThumbnail('https://cdn.discordapp.com/emojis/treasure_chest.png')
            .addFields([
                {
                    name: '💰 Your Purchasing Power',
                    value: `**Current Balance:** ${userData.coins.toLocaleString()} coins\n**Member Status:** ${this.getMembershipStatus(userData.coins)}\n**Available Discounts:** ${this.getAvailableDiscounts(userData)}`,
                    inline: true
                },
                {
                    name: '🏪 Shop Features',
                    value: '• ⚡ Instant delivery to inventory\n• 🛡️ Quality guarantee on all items\n• 💰 Bulk discounts available\n• 🔄 Free returns within 24 hours',
                    inline: true
                },
                {
                    name: '🎯 Today\'s Specials',
                    value: this.getDailySpecials(),
                    inline: true
                }
            ]);

        // Add category previews with item counts and price ranges
        Object.entries(SHOP_CATEGORIES).forEach(([key, cat]) => {
            const items = SHOP_ITEMS[key] || [];
            const filteredItems = this.applyFilter(items, filter, userData.coins);
            const priceRange = this.getPriceRange(filteredItems);
            const preview = filteredItems.slice(0, 3).map(item => `• ${item.name} (${item.price.toLocaleString()})`).join('\n');
            
            embed.addFields([{
                name: `${cat.emoji} ${cat.name} (${filteredItems.length} items)`,
                value: `${cat.description}\n💰 ${priceRange}\n\n${preview || '*No items available*'}${filteredItems.length > 3 ? `\n*+${filteredItems.length - 3} more items*` : ''}`,
                inline: true
            }]);
        });

        // Add shopping statistics
        embed.addFields([{
            name: '📊 Shopping Statistics',
            value: `**Items in Stock:** ${this.getTotalItemCount()}\n**Categories:** ${Object.keys(SHOP_CATEGORIES).length}\n**Price Range:** ${this.getGlobalPriceRange()}\n**New Items This Week:** ${this.getNewItemCount()}`,
            inline: false
        }]);

        // Filter dropdown
        const filterSelect = new StringSelectMenuBuilder()
            .setCustomId('shop_filter_select')
            .setPlaceholder('🔍 Apply filters to browse items...')
            .addOptions([
                { label: 'All Items', description: 'View all available items', value: 'all', emoji: '📦' },
                { label: 'Affordable Items', description: 'Items under 1000 coins', value: 'affordable', emoji: '💰' },
                { label: 'Premium Items', description: 'High-value items over 1000 coins', value: 'premium', emoji: '💎' },
                { label: 'High Quality', description: 'Rare, epic, and legendary items', value: 'quality', emoji: '⭐' },
                { label: 'New Arrivals', description: 'Recently added items', value: 'new', emoji: '🔥' }
            ]);

        // Category dropdown
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('shop_category_select')
            .setPlaceholder('🛒 Choose a category to browse...')
            .addOptions([
                ...Object.entries(SHOP_CATEGORIES).map(([key, cat]) => ({
                    label: cat.name,
                    description: `${cat.description} (${(SHOP_ITEMS[key] || []).length} items)`,
                    value: `shop_${key}`,
                    emoji: cat.emoji
                })),
                {
                    label: 'Featured Collection',
                    description: 'Hand-picked premium items',
                    value: 'shop_featured',
                    emoji: '✨'
                },
                {
                    label: 'Flash Sale',
                    description: 'Limited time discounted items',
                    value: 'shop_sale',
                    emoji: '🏷️'
                }
            ]);

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_search')
                    .setLabel('🔍 Search Items')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('shop_cart')
                    .setLabel('🛒 Shopping Cart')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('shop_wishlist')
                    .setLabel('❤️ Wishlist')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('shop_history')
                    .setLabel('📋 Purchase History')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('shop_rewards')
                    .setLabel('🎁 Loyalty Rewards')
                    .setStyle(ButtonStyle.Success)
            );

        const components = [
            new ActionRowBuilder().addComponents(filterSelect),
            new ActionRowBuilder().addComponents(categorySelect),
            actionButtons
        ];

        await interaction.reply({ embeds: [embed], components });
    },

    async showCategory(interaction, category, filter) {
        const userData = await db.getPlayer(interaction.user.id) || { coins: 0 };
        const items = SHOP_ITEMS[category] || [];
        const filteredItems = this.applyFilter(items, filter, userData.coins);
        
        if (filteredItems.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ No Items Found')
                .setDescription(`No items found in the **${SHOP_CATEGORIES[category]?.name || category}** category with the current filter.`)
                .addFields([
                    { name: '💡 Suggestions', value: '• Try removing filters\n• Check other categories\n• Come back later for new stock', inline: false }
                ]);

            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const categoryInfo = SHOP_CATEGORIES[category];
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`${categoryInfo.emoji} ${categoryInfo.name}`)
            .setDescription(`**${filteredItems.length} premium items available**\n\n${categoryInfo.description}${filter ? `\n🔍 *Filtered by: ${filter}*` : ''}`)
            .addFields([
                {
                    name: '💰 Your Budget',
                    value: `${userData.coins.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '📊 Price Range',
                    value: this.getPriceRange(filteredItems),
                    inline: true
                },
                {
                    name: '⭐ Quality Distribution',
                    value: this.getQualityRange(filteredItems),
                    inline: true
                }
            ]);

        // Sort items by rarity and price
        const sortedItems = this.sortItems(filteredItems);

        // Add items to embed (max 8 per page)
        const itemsToShow = sortedItems.slice(0, 8);
        itemsToShow.forEach(item => {
            const affordable = userData.coins >= item.price;
            const priceDisplay = affordable ? 
                `💰 ${item.price.toLocaleString()} coins` : 
                `💰 ~~${item.price.toLocaleString()}~~ coins ❌`;
            
            const statsDisplay = this.formatItemStats(item);
            const rarityIcon = this.getRarityIcon(item.rarity);

            embed.addFields([{
                name: `${rarityIcon} ${item.name}`,
                value: `${item.description}\n${priceDisplay}${statsDisplay ? `\n📊 ${statsDisplay}` : ''}${item.effect ? `\n✨ ${item.effect}` : ''}${item.ability ? `\n🎯 ${item.ability}` : ''}`,
                inline: true
            }]);
        });

        if (sortedItems.length > 8) {
            embed.setFooter({ 
                text: `Showing 8 of ${sortedItems.length} items • Use navigation to see more` 
            });
        }

        // Item selection dropdown
        const itemSelect = new StringSelectMenuBuilder()
            .setCustomId(`shop_buy_select_${category}`)
            .setPlaceholder('💰 Select an item to purchase...')
            .addOptions(itemsToShow.map(item => ({
                label: item.name,
                description: `${item.price.toLocaleString()} coins - ${item.rarity}`,
                value: `buy_${item.id}`,
                emoji: this.getRarityIcon(item.rarity)
            })));

        const navigationButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_main')
                    .setLabel('← Back to Shop')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`shop_sort_${category}`)
                    .setLabel('🔄 Sort Options')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`shop_compare_${category}`)
                    .setLabel('⚖️ Compare Items')
                    .setStyle(ButtonStyle.Primary)
            );

        if (sortedItems.length > 8) {
            navigationButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`shop_next_${category}_8`)
                    .setLabel('Next Page →')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        const components = [
            new ActionRowBuilder().addComponents(itemSelect),
            navigationButtons
        ];

        await interaction.reply({ embeds: [embed], components });
    },

    async handleDirectPurchase(interaction, itemQuery, quantity) {
        const userData = await db.getPlayer(interaction.user.id) || { coins: 0, inventory: { items: [] } };
        
        // Find item by name or ID
        const item = this.findItem(itemQuery);

        if (!item) {
            const suggestions = this.getSimilarItems(itemQuery);
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Item Not Found')
                .setDescription(`Item "${itemQuery}" not found in our shop.`)
                .addFields([
                    { name: '💡 Did you mean:', value: suggestions.length > 0 ? suggestions.join('\n') : 'No similar items found', inline: false },
                    { name: '🔍 Search Tips', value: '• Check spelling\n• Use `/shop` to browse categories\n• Try partial names', inline: false }
                ]);

            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const totalCost = item.price * quantity;
        
        if (userData.coins < totalCost) {
            const shortfall = totalCost - userData.coins;
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('💸 Insufficient Funds')
                .setDescription(`You need **${shortfall.toLocaleString()}** more coins to purchase ${quantity}x ${item.name}!`)
                .addFields([
                    { name: '💰 Your Balance', value: `${userData.coins.toLocaleString()} coins`, inline: true },
                    { name: '🛒 Total Cost', value: `${totalCost.toLocaleString()} coins`, inline: true },
                    { name: '📊 Breakdown', value: `${item.price.toLocaleString()} × ${quantity} = ${totalCost.toLocaleString()}`, inline: true },
                    { name: '💡 Earn More Coins', value: '• `/daily` - Daily rewards\n• `/work` - Job opportunities\n• `/hunt` - Treasure hunting\n• `/invest` - Investment returns', inline: false }
                ]);

            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Apply bulk discount
        const { discountedCost, savedAmount, discountPercentage } = this.calculateDiscount(totalCost, quantity);

        // Process purchase
        for (let i = 0; i < quantity; i++) {
            userData.inventory.items.push({
                id: item.id,
                obtained: Date.now(),
                source: 'shop',
                price_paid: item.price
            });
        }

        userData.coins -= discountedCost;

        // Update purchase history
        userData.purchaseHistory = userData.purchaseHistory || [];
        userData.purchaseHistory.push({
            item: item.name,
            quantity,
            cost: discountedCost,
            date: Date.now()
        });

        await db.updatePlayer(interaction.user.id, userData);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎉 Purchase Successful!')
            .setDescription(`**${quantity}x ${item.name}** successfully added to your inventory!`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields([
                { 
                    name: '🛒 Purchase Details', 
                    value: `**Item:** ${item.name}\n**Quantity:** ${quantity}\n**Unit Price:** ${item.price.toLocaleString()} coins\n**Total Cost:** ${discountedCost.toLocaleString()} coins`, 
                    inline: true 
                },
                { 
                    name: '💰 Financial Update', 
                    value: `**Previous Balance:** ${(userData.coins + discountedCost).toLocaleString()} coins\n**Amount Spent:** ${discountedCost.toLocaleString()} coins\n**New Balance:** ${userData.coins.toLocaleString()} coins`, 
                    inline: true 
                },
                { 
                    name: '📦 Inventory Update', 
                    value: `**Items Added:** ${quantity}\n**Total Items:** ${userData.inventory.items.length}\n**Item Value:** ${(item.price * quantity).toLocaleString()} coins`, 
                    inline: true 
                }
            ]);

        if (savedAmount > 0) {
            embed.addFields([{
                name: '🎁 Bulk Discount Applied!',
                value: `**Discount:** ${discountPercentage}% off\n**Savings:** ${savedAmount.toLocaleString()} coins\n**Final Price:** ${discountedCost.toLocaleString()} coins`,
                inline: false
            }]);
        }

        // Add item benefits
        if (item.stats || item.effect || item.ability) {
            let benefits = '';
            if (item.stats) benefits += `📊 **Stats:** ${this.formatItemStats(item)}\n`;
            if (item.effect) benefits += `✨ **Effect:** ${item.effect}\n`;
            if (item.ability) benefits += `🎯 **Ability:** ${item.ability}`;
            
            embed.addFields([{ name: '🌟 Item Benefits', value: benefits, inline: false }]);
        }

        embed.setFooter({ text: 'Use /inventory to view your items • Use /equip to use your new gear!' });

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_main')
                    .setLabel('🛒 Continue Shopping')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('inventory_view')
                    .setLabel('🎒 View Inventory')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`equip_${item.id}`)
                    .setLabel('⚔️ Equip Item')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!this.isEquippable(item)),
                new ButtonBuilder()
                    .setCustomId('shop_receipt')
                    .setLabel('📄 View Receipt')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [actionButtons] });
    },

    // Autocomplete handler
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const allItems = this.getAllItems();

        const filtered = allItems
            .filter(item => item.name.toLowerCase().includes(focusedValue))
            .slice(0, 25)
            .map(item => ({
                name: `${item.name} (${item.price.toLocaleString()} coins - ${item.rarity})`,
                value: item.id
            }));

        await interaction.respond(filtered);
    },

    // Helper methods
    getAllItems() {
        return Object.values(SHOP_ITEMS).flat();
    },

    findItem(query) {
        const allItems = this.getAllItems();
        return allItems.find(item => 
            item.id === query || 
            item.name.toLowerCase().includes(query.toLowerCase())
        );
    },

    getSimilarItems(query) {
        const allItems = this.getAllItems();
        return allItems
            .filter(item => 
                item.name.toLowerCase().includes(query.toLowerCase()) ||
                query.toLowerCase().includes(item.name.toLowerCase())
            )
            .slice(0, 3)
            .map(item => `• ${item.name} (${item.price.toLocaleString()} coins)`);
    },

    applyFilter(items, filter, userCoins) {
        if (!filter || filter === 'all') return items;

        switch (filter) {
            case 'affordable':
                return items.filter(item => item.price <= Math.min(userCoins, 1000));
            case 'premium':
                return items.filter(item => item.price > 1000);
            case 'quality':
                return items.filter(item => ['rare', 'epic', 'legendary'].includes(item.rarity));
            case 'new':
                return items.slice(-5); // Last 5 items as "new"
            default:
                return items;
        }
    },

    sortItems(items) {
        const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
        return items.sort((a, b) => {
            const rarityDiff = (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
            return rarityDiff !== 0 ? rarityDiff : a.price - b.price;
        });
    },

    getPriceRange(items) {
        if (items.length === 0) return 'No items';
        const prices = items.map(i => i.price).sort((a, b) => a - b);
        return `${prices[0].toLocaleString()} - ${prices[prices.length - 1].toLocaleString()} coins`;
    },

    getGlobalPriceRange() {
        const allItems = this.getAllItems();
        const prices = allItems.map(i => i.price).sort((a, b) => a - b);
        return `${prices[0].toLocaleString()} - ${prices[prices.length - 1].toLocaleString()} coins`;
    },

    getQualityRange(items) {
        const rarities = [...new Set(items.map(i => i.rarity))];
        return rarities.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ');
    },

    getTotalItemCount() {
        return this.getAllItems().length;
    },

    getNewItemCount() {
        return Math.floor(Math.random() * 5) + 3; // Mock new items
    },

    getMembershipStatus(coins) {
        if (coins >= 100000) return '👑 Platinum Member';
        if (coins >= 50000) return '💎 Gold Member';
        if (coins >= 10000) return '🥈 Silver Member';
        return '🥉 Bronze Member';
    },

    getAvailableDiscounts(userData) {
        const discounts = [];
        if (userData.coins >= 10000) discounts.push('5% VIP Discount');
        if ((userData.purchaseHistory || []).length >= 10) discounts.push('Loyalty 10% Off');
        return discounts.length > 0 ? discounts.join(', ') : 'None';
    },

    getDailySpecials() {
        const specials = [
            '🎯 All Weapons: 15% off',
            '🛡️ Armor Sets: Buy 2 Get 1 Free',
            '🧪 Potions: 25% bulk discount',
            '🐾 Pet Adoption: Free accessories'
        ];
        return specials.slice(0, 3).join('\n');
    },

    calculateDiscount(totalCost, quantity) {
        let discountPercentage = 0;
        
        if (quantity >= 20) discountPercentage = 15;
        else if (quantity >= 10) discountPercentage = 10;
        else if (quantity >= 5) discountPercentage = 5;
        
        const savedAmount = Math.floor(totalCost * discountPercentage / 100);
        const discountedCost = totalCost - savedAmount;
        
        return { discountedCost, savedAmount, discountPercentage };
    },

    formatItemStats(item) {
        if (!item.stats) return '';
        
        return Object.entries(item.stats)
            .map(([stat, value]) => `${this.getStatIcon(stat)}${value}`)
            .join(' ');
    },

    getStatIcon(stat) {
        const icons = {
            attack: '⚔️',
            defense: '🛡️',
            health: '❤️',
            speed: '⚡',
            luck: '🍀',
            power: '💪',
            magic: '🔮',
            mining: '⛏️',
            fishing: '🎣'
        };
        return icons[stat.toLowerCase()] || '📊';
    },

    getRarityIcon(rarity) {
        const icons = {
            legendary: '🌟',
            epic: '💜',
            rare: '💙',
            uncommon: '💚',
            common: '⚪'
        };
        return icons[rarity] || '⚪';
    },

    isEquippable(item) {
        return ['weapons', 'armor', 'accessories', 'tools'].includes(this.getItemCategory(item.id));
    },

    getItemCategory(itemId) {
        for (const [category, items] of Object.entries(SHOP_ITEMS)) {
            if (items.some(item => item.id === itemId)) {
                return category;
            }
        }
        return 'materials';
    }
};
