
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('🎒 View and manage your treasure inventory!')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Filter items by category')
                .setRequired(false)
                .addChoices(
                    { name: '⚔️ Weapons', value: 'weapons' },
                    { name: '🛡️ Armor', value: 'armor' },
                    { name: '💍 Accessories', value: 'accessories' },
                    { name: '🔧 Tools', value: 'tools' },
                    { name: '🧪 Consumables', value: 'consumables' },
                    { name: '🔨 Materials', value: 'materials' },
                    { name: '💎 Treasures', value: 'treasures' }
                ))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('View another user\'s inventory (if public)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('sort')
                .setDescription('Sort items by specific criteria')
                .setRequired(false)
                .addChoices(
                    { name: '💰 Value (High to Low)', value: 'value_desc' },
                    { name: '💰 Value (Low to High)', value: 'value_asc' },
                    { name: '⭐ Rarity', value: 'rarity' },
                    { name: '📅 Date Acquired', value: 'date' },
                    { name: '🔤 Name', value: 'name' }
                )),

    async execute(interaction) {
        const category = interaction.options?.getString('category');
        const targetUser = interaction.options?.getUser('user') || interaction.user;
        const sortBy = interaction.options?.getString('sort') || 'rarity';
        const isOwnInventory = targetUser.id === interaction.user.id;

        try {
            const userData = await db.getPlayer(targetUser.id);
            if (!userData) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Profile Not Found')
                    .setDescription(`${isOwnInventory ? 'You don\'t' : 'This user doesn\'t'} have a treasure hunter profile yet!\n\n${isOwnInventory ? 'Start your adventure with `/daily` or `/work`!' : 'They need to start their adventure first!'}`)
                    .setFooter({ text: isOwnInventory ? 'Use /help to learn about available commands' : '' });

                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const inventory = userData.inventory || { items: [], coins: 0 };
            const items = this.processItems(inventory.items || []);
            
            // Filter by category if specified
            const filteredItems = category ? 
                items.filter(item => item.type === category) : 
                items;

            // Sort items
            const sortedItems = this.sortItems(filteredItems, sortBy);

            const embed = new EmbedBuilder()
                .setColor('#8B4513')
                .setTitle(`🎒 ${isOwnInventory ? 'Your' : `${targetUser.displayName}'s`} Treasure Inventory`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setDescription(`**${isOwnInventory ? 'Manage your precious collection' : 'Viewing their treasure collection'}**${category ? `\n🔍 Filtered by: **${category}**` : ''}`);

            // Inventory statistics
            const stats = this.calculateStats(items, userData);
            embed.addFields([
                {
                    name: '📊 Inventory Overview',
                    value: `**Total Items:** ${items.length}\n**Unique Types:** ${new Set(items.map(i => i.type)).size}\n**Categories:** ${Object.keys(this.groupByCategory(items)).length}`,
                    inline: true
                },
                {
                    name: '💰 Financial Status',
                    value: `**Wallet:** ${(userData.coins || 0).toLocaleString()} coins\n**Item Value:** ${stats.totalValue.toLocaleString()} coins\n**Net Worth:** ${(stats.totalValue + (userData.coins || 0)).toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '⭐ Quality Metrics',
                    value: `**Legendary:** ${stats.rarity.legendary || 0}\n**Epic:** ${stats.rarity.epic || 0}\n**Rare:** ${stats.rarity.rare || 0}`,
                    inline: true
                }
            ]);

            if (sortedItems.length === 0) {
                embed.addFields([{
                    name: '📦 Empty Inventory',
                    value: category ? 
                        `No items found in the **${category}** category.\nTry browsing other categories or start collecting!` : 
                        'This inventory is empty.\n\n🚀 **Get started:**\n• Use `/shop` to buy items\n• Try `/hunt` to find treasures\n• Use `/work` to earn coins',
                    inline: false
                }]);
            } else {
                // Group items by category for better display
                const groupedItems = this.groupByCategory(sortedItems);
                const categories = Object.keys(groupedItems).slice(0, 6);

                categories.forEach(type => {
                    const typeItems = groupedItems[type];
                    const typeIcon = this.getTypeIcon(type);
                    const itemCounts = {};
                    
                    typeItems.forEach(item => {
                        const key = `${item.name} ${item.rarity}`;
                        itemCounts[key] = (itemCounts[key] || 0) + 1;
                    });

                    const itemList = Object.entries(itemCounts)
                        .slice(0, 4)
                        .map(([name, count]) => {
                            const [itemName, rarity] = name.split(' ');
                            const rarityIcon = this.getRarityIcon(rarity);
                            return `${rarityIcon} ${itemName} ${count > 1 ? `(×${count})` : ''}`;
                        })
                        .join('\n');

                    const totalValue = typeItems.reduce((sum, item) => sum + (item.value || 0), 0);

                    embed.addFields([{
                        name: `${typeIcon} ${type.charAt(0).toUpperCase() + type.slice(1)} (${typeItems.length})`,
                        value: `${itemList}${Object.keys(itemCounts).length > 4 ? `\n*+${Object.keys(itemCounts).length - 4} more*` : ''}\n💰 ${totalValue.toLocaleString()} coins`,
                        inline: true
                    }]);
                });

                if (categories.length > 6) {
                    embed.setFooter({ 
                        text: `Showing 6 of ${Object.keys(groupedItems).length} categories • Use filters to see more • Sorted by ${sortBy}` 
                    });
                } else {
                    embed.setFooter({ text: `Sorted by ${sortBy} • ${sortedItems.length} total items` });
                }
            }

            // Create interactive components
            const components = [];

            if (items.length > 0) {
                // Category filter dropdown
                const groupedItems = this.groupByCategory(items);
                const categorySelect = new StringSelectMenuBuilder()
                    .setCustomId(`inventory_filter_${targetUser.id}`)
                    .setPlaceholder('🔍 Filter by category...')
                    .addOptions([
                        { label: 'All Items', value: 'all', emoji: '📦', description: `View all ${items.length} items` },
                        ...Object.keys(groupedItems).map(type => ({
                            label: `${this.getTypeIcon(type)} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                            value: type,
                            description: `${groupedItems[type].length} items`,
                            emoji: this.getTypeIcon(type)
                        }))
                    ]);

                components.push(new ActionRowBuilder().addComponents(categorySelect));

                // Sort options dropdown
                const sortSelect = new StringSelectMenuBuilder()
                    .setCustomId(`inventory_sort_${targetUser.id}`)
                    .setPlaceholder('🔄 Change sorting...')
                    .addOptions([
                        { label: 'By Rarity', value: 'rarity', emoji: '⭐', description: 'Legendary to common' },
                        { label: 'By Value (High)', value: 'value_desc', emoji: '💰', description: 'Most valuable first' },
                        { label: 'By Value (Low)', value: 'value_asc', emoji: '💸', description: 'Least valuable first' },
                        { label: 'By Name', value: 'name', emoji: '🔤', description: 'Alphabetical order' },
                        { label: 'By Date', value: 'date', emoji: '📅', description: 'Recently acquired first' }
                    ]);

                components.push(new ActionRowBuilder().addComponents(sortSelect));
            }

            // Action buttons
            const actionButtons = new ActionRowBuilder();
            
            if (isOwnInventory && items.length > 0) {
                actionButtons.addComponents(
                    new ButtonBuilder()
                        .setCustomId('inventory_equip')
                        .setLabel('⚔️ Quick Equip')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('inventory_sell')
                        .setLabel('💰 Quick Sell')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('inventory_organize')
                        .setLabel('📚 Organize')
                        .setStyle(ButtonStyle.Primary)
                );
            }

            actionButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId('inventory_refresh')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('inventory_details')
                    .setLabel('📊 Detailed View')
                    .setStyle(ButtonStyle.Secondary)
            );

            if (actionButtons.components.length > 0) {
                components.push(actionButtons);
            }

            await interaction.reply({
                embeds: [embed],
                components: components.length > 0 ? components : undefined
            });

        } catch (error) {
            console.error('Inventory command error:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Inventory Error')
                .setDescription('An error occurred while loading the inventory. Please try again.')
                .addFields([
                    { name: '🔧 Troubleshooting', value: '• Check if your profile exists\n• Try again in a few moments\n• Contact support if issue persists', inline: false }
                ]);

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },

    // Helper methods
    processItems(items) {
        const itemDatabase = {
            'iron_sword': { name: 'Iron Sword', type: 'weapons', rarity: 'common', value: 150 },
            'steel_armor': { name: 'Steel Armor', type: 'armor', rarity: 'uncommon', value: 300 },
            'health_potion': { name: 'Health Potion', type: 'consumables', rarity: 'common', value: 50 },
            'magic_ring': { name: 'Magic Ring', type: 'accessories', rarity: 'rare', value: 500 },
            'dragon_scale': { name: 'Dragon Scale', type: 'materials', rarity: 'legendary', value: 1000 }
        };

        return items.map(item => {
            const details = itemDatabase[item.id] || {
                name: item.id || 'Unknown Item',
                type: item.type || 'materials',
                rarity: item.rarity || 'common',
                value: item.value || 10
            };
            return { ...item, ...details };
        }).filter(item => item.name !== 'Unknown Item');
    },

    sortItems(items, sortBy) {
        switch (sortBy) {
            case 'value_desc':
                return items.sort((a, b) => (b.value || 0) - (a.value || 0));
            case 'value_asc':
                return items.sort((a, b) => (a.value || 0) - (b.value || 0));
            case 'rarity':
                const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
                return items.sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));
            case 'name':
                return items.sort((a, b) => a.name.localeCompare(b.name));
            case 'date':
                return items.sort((a, b) => (b.obtained || 0) - (a.obtained || 0));
            default:
                return items;
        }
    },

    groupByCategory(items) {
        return items.reduce((groups, item) => {
            const category = item.type || 'materials';
            if (!groups[category]) groups[category] = [];
            groups[category].push(item);
            return groups;
        }, {});
    },

    calculateStats(items, userData) {
        const stats = {
            totalValue: items.reduce((sum, item) => sum + (item.value || 0), 0),
            rarity: {},
            types: {},
            equipped: Object.keys(userData.equipment || {}).length
        };

        items.forEach(item => {
            stats.rarity[item.rarity] = (stats.rarity[item.rarity] || 0) + 1;
            stats.types[item.type] = (stats.types[item.type] || 0) + 1;
        });

        return stats;
    },

    getTypeIcon(type) {
        const icons = {
            weapons: '⚔️',
            armor: '🛡️',
            accessories: '💍',
            tools: '🔧',
            consumables: '🧪',
            materials: '🔨',
            treasures: '💎',
            special: '⭐'
        };
        return icons[type] || '📦';
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
    }
};
