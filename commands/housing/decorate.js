
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../../database.js');

const DECORATION_CATEGORIES = {
    furniture: {
        name: 'Furniture',
        emoji: '🪑',
        description: 'Comfortable and functional furniture pieces',
        items: {
            luxury_sofa: { name: 'Luxury Sofa', cost: 800, comfort: 4, style: 4, rarity: 'rare' },
            antique_desk: { name: 'Antique Writing Desk', cost: 1200, utility: 4, style: 5, rarity: 'epic' },
            royal_bed: { name: 'Royal Four-Poster Bed', cost: 1500, comfort: 5, style: 5, rarity: 'epic' },
            enchanted_bookshelf: { name: 'Enchanted Bookshelf', cost: 2000, utility: 5, style: 4, magic: 2, rarity: 'legendary' },
            crystal_table: { name: 'Crystal Dining Table', cost: 1000, utility: 3, style: 5, rarity: 'rare' },
            velvet_chair: { name: 'Velvet Armchair', cost: 600, comfort: 3, style: 4, rarity: 'uncommon' },
            marble_counter: { name: 'Marble Kitchen Counter', cost: 1800, utility: 4, style: 5, rarity: 'rare' }
        }
    },
    decor: {
        name: 'Wall Decor',
        emoji: '🖼️',
        description: 'Beautiful artwork and wall decorations',
        items: {
            masterpiece_painting: { name: 'Renaissance Masterpiece', cost: 3000, style: 6, prestige: 3, rarity: 'legendary' },
            ancient_tapestry: { name: 'Ancient Tapestry', cost: 1500, style: 4, history: 2, rarity: 'epic' },
            magic_mirror: { name: 'Enchanted Mirror', cost: 2500, utility: 3, style: 4, magic: 3, rarity: 'epic' },
            trophy_case: { name: 'Achievement Trophy Case', cost: 1200, prestige: 4, utility: 2, rarity: 'rare' },
            crystal_sconce: { name: 'Crystal Wall Sconce', cost: 800, style: 4, lighting: 2, rarity: 'uncommon' },
            family_portrait: { name: 'Noble Family Portrait', cost: 1000, style: 3, prestige: 2, rarity: 'rare' }
        }
    },
    flooring: {
        name: 'Flooring',
        emoji: '🟫',
        description: 'Elegant flooring options for every room',
        items: {
            marble_tiles: { name: 'Marble Floor Tiles', cost: 2000, utility: 4, style: 5, durability: 5, rarity: 'epic' },
            persian_carpet: { name: 'Persian Silk Carpet', cost: 2500, comfort: 5, style: 6, rarity: 'legendary' },
            hardwood_floor: { name: 'Polished Hardwood', cost: 1500, style: 4, durability: 4, rarity: 'rare' },
            enchanted_stones: { name: 'Glowing Runestones', cost: 3500, style: 5, magic: 4, rarity: 'legendary' },
            golden_tiles: { name: 'Golden Mosaic Tiles', cost: 4000, style: 6, prestige: 5, rarity: 'legendary' }
        }
    },
    lighting: {
        name: 'Lighting',
        emoji: '💡',
        description: 'Illumination that sets the perfect mood',
        items: {
            crystal_chandelier: { name: 'Crystal Chandelier', cost: 3000, utility: 5, style: 6, lighting: 5, rarity: 'legendary' },
            magical_orbs: { name: 'Floating Light Orbs', cost: 2000, utility: 4, style: 5, magic: 3, rarity: 'epic' },
            candelabra: { name: 'Silver Candelabra', cost: 800, utility: 2, style: 4, ambiance: 3, rarity: 'rare' },
            lanterns: { name: 'Elven Lanterns', cost: 1200, utility: 3, style: 4, magic: 1, rarity: 'rare' },
            fireplace: { name: 'Grand Stone Fireplace', cost: 2500, comfort: 5, style: 4, warmth: 5, rarity: 'epic' }
        }
    },
    plants: {
        name: 'Plants & Nature',
        emoji: '🌿',
        description: 'Bring life and nature into your space',
        items: {
            world_tree_sapling: { name: 'World Tree Sapling', cost: 5000, style: 6, magic: 5, nature: 6, rarity: 'legendary' },
            crystal_flowers: { name: 'Crystal Flower Garden', cost: 2000, style: 5, magic: 2, beauty: 4, rarity: 'epic' },
            healing_herbs: { name: 'Medicinal Herb Garden', cost: 1500, utility: 4, nature: 3, healing: 3, rarity: 'rare' },
            bonsai_collection: { name: 'Ancient Bonsai Collection', cost: 1800, style: 5, tranquility: 4, rarity: 'epic' },
            vine_walls: { name: 'Living Vine Walls', cost: 1000, style: 3, nature: 4, air_quality: 3, rarity: 'uncommon' }
        }
    },
    mystical: {
        name: 'Mystical Items',
        emoji: '🔮',
        description: 'Magical and mysterious decorative items',
        items: {
            scrying_orb: { name: 'Ancient Scrying Orb', cost: 4000, magic: 6, utility: 3, mystery: 5, rarity: 'legendary' },
            rune_circle: { name: 'Power Rune Circle', cost: 3500, magic: 5, style: 4, power: 4, rarity: 'legendary' },
            crystal_altar: { name: 'Crystal Meditation Altar', cost: 2500, magic: 4, tranquility: 5, style: 4, rarity: 'epic' },
            spell_components: { name: 'Organized Spell Components', cost: 1800, magic: 3, utility: 4, organization: 3, rarity: 'rare' },
            enchanted_fountain: { name: 'Enchanted Water Fountain', cost: 3000, magic: 4, style: 5, tranquility: 4, rarity: 'epic' }
        }
    }
};

const ROOM_TYPES = {
    bedroom: { name: 'Bedroom', emoji: '🛏️', compatible: ['furniture', 'decor', 'lighting', 'plants'] },
    living_room: { name: 'Living Room', emoji: '🛋️', compatible: ['furniture', 'decor', 'flooring', 'lighting', 'plants'] },
    kitchen: { name: 'Kitchen', emoji: '👨‍🍳', compatible: ['furniture', 'flooring', 'lighting'] },
    study: { name: 'Study', emoji: '📚', compatible: ['furniture', 'decor', 'lighting', 'mystical'] },
    garden: { name: 'Garden', emoji: '🌺', compatible: ['plants', 'lighting', 'mystical'] },
    workshop: { name: 'Workshop', emoji: '🔨', compatible: ['furniture', 'lighting'] },
    treasury: { name: 'Treasury', emoji: '💰', compatible: ['furniture', 'decor', 'mystical'] },
    library: { name: 'Library', emoji: '📚', compatible: ['furniture', 'decor', 'lighting', 'mystical'] }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('decorate')
        .setDescription('🎨 Transform your house with beautiful decorations')
        .addSubcommand(subcommand =>
            subcommand
                .setName('shop')
                .setDescription('Browse and purchase decorations')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Category of decorations to browse')
                        .setRequired(false)
                        .addChoices(
                            { name: '🪑 Furniture', value: 'furniture' },
                            { name: '🖼️ Wall Decor', value: 'decor' },
                            { name: '🟫 Flooring', value: 'flooring' },
                            { name: '💡 Lighting', value: 'lighting' },
                            { name: '🌿 Plants & Nature', value: 'plants' },
                            { name: '🔮 Mystical Items', value: 'mystical' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('place')
                .setDescription('Place decorations in your rooms')
                .addStringOption(option =>
                    option.setName('room')
                        .setDescription('Room to decorate')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('inventory')
                .setDescription('View your decoration collection'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('showcase')
                .setDescription('Display your decorated rooms')
                .addStringOption(option =>
                    option.setName('room')
                        .setDescription('Room to showcase')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('themes')
                .setDescription('Apply decoration themes to rooms')
                .addStringOption(option =>
                    option.setName('theme')
                        .setDescription('Theme to apply')
                        .setRequired(false)
                        .addChoices(
                            { name: '👑 Royal Palace', value: 'royal' },
                            { name: '🧙‍♂️ Wizard\'s Tower', value: 'magical' },
                            { name: '🌿 Nature Sanctuary', value: 'natural' },
                            { name: '⚡ Modern Minimalist', value: 'modern' },
                            { name: '🏺 Ancient Temple', value: 'ancient' }
                        ))),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                return await interaction.editReply({
                    embeds: [this.createErrorEmbed('❌ Profile Required', 'You need to create a profile first! Use `/profile` to get started.')],
                    ephemeral: true
                });
            }

            // Check if player has housing
            if (!player.housing?.rooms || player.housing.rooms.length === 0) {
                return await interaction.editReply({
                    embeds: [this.createErrorEmbed('🏠 House Required', 'You need to build some rooms first!\n\n💡 *Use `/build` to construct your first building.*')],
                    ephemeral: true
                });
            }

            // Initialize decoration data
            if (!player.housing.decorations) {
                player.housing.decorations = {
                    inventory: [],
                    placed: {},
                    themes: {},
                    collections: [],
                    achievements: [],
                    total_spent: 0,
                    style_points: 0
                };
            }

            switch (subcommand) {
                case 'shop':
                    await this.handleShop(interaction, player);
                    break;
                case 'place':
                    await this.handlePlace(interaction, player);
                    break;
                case 'inventory':
                    await this.handleInventory(interaction, player);
                    break;
                case 'showcase':
                    await this.handleShowcase(interaction, player);
                    break;
                case 'themes':
                    await this.handleThemes(interaction, player);
                    break;
            }

        } catch (error) {
            console.error('Error in decorate command:', error);
            await interaction.editReply({
                embeds: [this.createErrorEmbed('🎨 Decoration Error', 'Something went wrong with the decoration system. Please try again.')],
                ephemeral: true
            });
        }
    },

    async handleShop(interaction, player) {
        const category = interaction.options.getString('category');

        if (category) {
            await this.showCategoryShop(interaction, player, category);
        } else {
            await this.showMainShop(interaction, player);
        }
    },

    async showMainShop(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏪 Celestial Decoration Emporium')
            .setDescription('╔═══════════════════════════════════════╗\n║        **Premium Interior Design**        ║\n║       *Transform Your Living Space*       ║\n╚═══════════════════════════════════════════╝\n\n🎨 *Discover exquisite decorations for every taste*')
            .addFields(
                {
                    name: '💰 **Your Budget**',
                    value: `**💎 Coins:** ${player.coins || 0}\n**⭐ Style Points:** ${player.housing.decorations.style_points}\n**🛍️ Total Spent:** ${player.housing.decorations.total_spent}`,
                    inline: true
                },
                {
                    name: '📊 **Collection Status**',
                    value: `**📦 Owned Items:** ${player.housing.decorations.inventory.length}\n**🏠 Placed Items:** ${Object.values(player.housing.decorations.placed).flat().length}\n**🏆 Collections:** ${player.housing.decorations.collections.length}`,
                    inline: true
                },
                {
                    name: '🎁 **Today\'s Special**',
                    value: `**20% OFF** Crystal Chandeliers!\n**NEW** Mystical Item Collection\n**RARE** World Tree Saplings Available`,
                    inline: true
                }
            );

        // Add category showcases
        Object.entries(DECORATION_CATEGORIES).forEach(([key, category]) => {
            const itemCount = Object.keys(category.items).length;
            const priceRange = this.getCategoryPriceRange(category.items);
            
            embed.addFields({
                name: `${category.emoji} **${category.name}** (${itemCount} items)`,
                value: `*${category.description}*\n💰 Price Range: ${priceRange.min} - ${priceRange.max} coins`,
                inline: true
            });
        });

        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('shop_category_select')
            .setPlaceholder('🎯 Choose a category to browse...')
            .addOptions(
                Object.entries(DECORATION_CATEGORIES).map(([key, category]) => ({
                    label: category.name,
                    value: key,
                    description: category.description,
                    emoji: category.emoji
                }))
            );

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_featured')
                    .setLabel('Featured Items')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⭐'),
                new ButtonBuilder()
                    .setCustomId('shop_collections')
                    .setLabel('Collections')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📚'),
                new ButtonBuilder()
                    .setCustomId('shop_search')
                    .setLabel('Search Items')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('shop_wishlist')
                    .setLabel('Wishlist')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❤️')
            );

        const selectRow = new ActionRowBuilder().addComponents(categorySelect);

        await interaction.editReply({
            embeds: [embed],
            components: [selectRow, actionButtons]
        });

        await this.setupShopCollector(interaction, player);
    },

    async showCategoryShop(interaction, player, categoryKey) {
        const category = DECORATION_CATEGORIES[categoryKey];
        if (!category) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('❌ Invalid Category', 'The selected category doesn\'t exist.')],
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle(`${category.emoji} ${category.name} Collection`)
            .setDescription(`╔═══════════════════════════════════════╗\n║        **${category.name} Showcase**        ║\n╚═══════════════════════════════════════╝\n\n${category.description}`)
            .addFields(
                {
                    name: '💎 **Your Budget**',
                    value: `${player.coins || 0} coins`,
                    inline: true
                },
                {
                    name: '📊 **Category Stats**',
                    value: `**Items:** ${Object.keys(category.items).length}\n**Owned:** ${this.getOwnedCount(player, categoryKey)}\n**Rarity:** Mixed`,
                    inline: true
                },
                {
                    name: '🎯 **Filters**',
                    value: `All rarities shown\nSorted by popularity`,
                    inline: true
                }
            );

        // Group items by rarity
        const itemsByRarity = this.groupItemsByRarity(category.items);
        
        Object.entries(itemsByRarity).forEach(([rarity, items]) => {
            const rarityEmoji = this.getRarityEmoji(rarity);
            const itemList = Object.entries(items).slice(0, 3).map(([key, item]) => {
                const owned = this.isItemOwned(player, key);
                const canAfford = (player.coins || 0) >= item.cost;
                const status = owned ? '✅' : canAfford ? '💰' : '❌';
                
                return `${status} **${item.name}**\n├ 💰 ${item.cost} coins\n└ ${this.formatItemStats(item)}`;
            }).join('\n\n');

            embed.addFields({
                name: `${rarityEmoji} **${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Items**`,
                value: itemList + (Object.keys(items).length > 3 ? `\n\n*+${Object.keys(items).length - 3} more items*` : ''),
                inline: false
            });
        });

        const itemSelect = new StringSelectMenuBuilder()
            .setCustomId(`shop_item_select_${categoryKey}`)
            .setPlaceholder('🛒 Select an item to purchase...')
            .addOptions(
                Object.entries(category.items).slice(0, 25).map(([key, item]) => {
                    const owned = this.isItemOwned(player, key);
                    const canAfford = (player.coins || 0) >= item.cost;
                    return {
                        label: item.name + (owned ? ' ✅' : ''),
                        value: key,
                        description: `${item.cost} coins | ${item.rarity} | ${canAfford ? 'Affordable' : 'Too expensive'}`,
                        emoji: this.getRarityEmoji(item.rarity)
                    };
                })
            );

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_back_main')
                    .setLabel('Back to Shop')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⬅️'),
                new ButtonBuilder()
                    .setCustomId(`shop_filter_${categoryKey}`)
                    .setLabel('Filter Items')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId(`shop_preview_${categoryKey}`)
                    .setLabel('Preview Room')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👁️')
            );

        const selectRow = new ActionRowBuilder().addComponents(itemSelect);

        await interaction.editReply({
            embeds: [embed],
            components: [selectRow, actionButtons]
        });
    },

    async handlePlace(interaction, player) {
        const roomName = interaction.options.getString('room');
        
        if (player.housing.decorations.inventory.length === 0) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('📦 Empty Inventory', 'You don\'t have any decorations to place!\n\n💡 *Visit the decoration shop to buy some items first.*')],
                ephemeral: true
            });
        }

        if (roomName) {
            await this.showRoomPlacement(interaction, player, roomName);
        } else {
            await this.showRoomSelection(interaction, player);
        }
    },

    async showRoomSelection(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('🏠 Room Decoration Manager')
            .setDescription('╔═══════════════════════════════════════╗\n║        **Interior Design Studio**        ║\n╚═══════════════════════════════════════╝\n\n🎨 *Select a room to decorate with your collection*')
            .addFields(
                {
                    name: '📦 **Available Decorations**',
                    value: `**Total Items:** ${player.housing.decorations.inventory.length}\n**Style Points:** ${player.housing.decorations.style_points}\n**Themes Applied:** ${Object.keys(player.housing.decorations.themes).length}`,
                    inline: true
                },
                {
                    name: '🏠 **Room Statistics**',
                    value: `**Total Rooms:** ${player.housing.rooms.length}\n**Decorated:** ${Object.keys(player.housing.decorations.placed).length}\n**Completion:** ${Math.round(Object.keys(player.housing.decorations.placed).length / player.housing.rooms.length * 100)}%`,
                    inline: true
                }
            );

        // Show room status
        player.housing.rooms.forEach(room => {
            const roomDecorations = player.housing.decorations.placed[room.type] || [];
            const stylePoints = this.calculateRoomStyle(roomDecorations);
            const completion = this.getRoomCompletionStatus(room.type, roomDecorations);
            
            embed.addFields({
                name: `${ROOM_TYPES[room.type]?.emoji || '🏠'} **${room.type.charAt(0).toUpperCase() + room.type.slice(1)}**`,
                value: `**Items:** ${roomDecorations.length}\n**Style:** ${stylePoints} points\n**Status:** ${completion}`,
                inline: true
            });
        });

        const roomSelect = new StringSelectMenuBuilder()
            .setCustomId('place_room_select')
            .setPlaceholder('🎯 Choose a room to decorate...')
            .addOptions(
                player.housing.rooms.map(room => {
                    const roomInfo = ROOM_TYPES[room.type] || { name: room.type, emoji: '🏠' };
                    const decorationCount = (player.housing.decorations.placed[room.type] || []).length;
                    return {
                        label: `${roomInfo.name} (${decorationCount} items)`,
                        value: room.type,
                        description: `Decorate your ${roomInfo.name.toLowerCase()}`,
                        emoji: roomInfo.emoji
                    };
                })
            );

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('place_quick_decorate')
                    .setLabel('Quick Decorate')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚡'),
                new ButtonBuilder()
                    .setCustomId('place_bulk_manage')
                    .setLabel('Bulk Management')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('place_room_themes')
                    .setLabel('Apply Themes')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎨')
            );

        const selectRow = new ActionRowBuilder().addComponents(roomSelect);

        await interaction.editReply({
            embeds: [embed],
            components: [selectRow, actionButtons]
        });

        await this.setupPlaceCollector(interaction, player);
    },

    async handleInventory(interaction, player) {
        if (player.housing.decorations.inventory.length === 0) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('📦 Empty Collection', 'Your decoration inventory is empty!\n\n💡 *Visit the shop to start building your collection.*')],
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('📦 Your Decoration Collection')
            .setDescription('╔═══════════════════════════════════════╗\n║        **Personal Interior Catalog**        ║\n╚═══════════════════════════════════════╝\n\n✨ *Your carefully curated collection of fine decorations*')
            .addFields(
                {
                    name: '📊 **Collection Overview**',
                    value: `**Total Items:** ${player.housing.decorations.inventory.length}\n**Total Value:** ${this.calculateCollectionValue(player.housing.decorations.inventory)} coins\n**Rarest Item:** ${this.getRarestItem(player.housing.decorations.inventory)}`,
                    inline: true
                },
                {
                    name: '🎯 **Usage Statistics**',
                    value: `**Items Placed:** ${Object.values(player.housing.decorations.placed).flat().length}\n**Available:** ${player.housing.decorations.inventory.length - Object.values(player.housing.decorations.placed).flat().length}\n**Style Points:** ${player.housing.decorations.style_points}`,
                    inline: true
                }
            );

        // Group inventory by category
        const inventoryByCategory = this.groupInventoryByCategory(player.housing.decorations.inventory);

        Object.entries(inventoryByCategory).forEach(([categoryKey, items]) => {
            const category = DECORATION_CATEGORIES[categoryKey];
            if (category && items.length > 0) {
                const itemList = items.slice(0, 4).map(item => {
                    const itemData = this.findItemData(item.id);
                    const status = item.placed_in ? `📍 ${item.placed_in}` : '📦 Storage';
                    return `${this.getRarityEmoji(itemData.rarity)} **${itemData.name}**\n└ ${status}`;
                }).join('\n\n');

                embed.addFields({
                    name: `${category.emoji} **${category.name}** (${items.length})`,
                    value: itemList + (items.length > 4 ? `\n\n*+${items.length - 4} more items*` : ''),
                    inline: false
                });
            }
        });

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('inventory_organize')
                    .setLabel('Organize Items')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('inventory_search')
                    .setLabel('Search Collection')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('inventory_statistics')
                    .setLabel('Detailed Stats')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('inventory_export')
                    .setLabel('Export List')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('📤')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [actionButtons]
        });
    },

    async handleShowcase(interaction, player) {
        const roomName = interaction.options.getString('room');

        if (Object.keys(player.housing.decorations.placed).length === 0) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('🏠 No Decorations', 'You haven\'t decorated any rooms yet!\n\n💡 *Start decorating to create beautiful showcases.*')],
                ephemeral: true
            });
        }

        if (roomName) {
            await this.showRoomShowcase(interaction, player, roomName);
        } else {
            await this.showAllRoomsShowcase(interaction, player);
        }
    },

    async showAllRoomsShowcase(interaction, player) {
        const totalStylePoints = Object.values(player.housing.decorations.placed)
            .flat()
            .reduce((total, item) => total + this.calculateItemStylePoints(item), 0);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Home Showcase Gallery')
            .setDescription('╔═══════════════════════════════════════╗\n║        **Your Interior Masterpiece**        ║\n║       *A Tour of Elegant Living*        ║\n╚═══════════════════════════════════════╝\n\n✨ *Welcome to your beautifully decorated home*')
            .addFields(
                {
                    name: '🌟 **Showcase Statistics**',
                    value: `**Total Style Points:** ${totalStylePoints}\n**Decorated Rooms:** ${Object.keys(player.housing.decorations.placed).length}\n**Total Items:** ${Object.values(player.housing.decorations.placed).flat().length}`,
                    inline: true
                },
                {
                    name: '🏅 **Home Rating**',
                    value: `**Overall Grade:** ${this.getHomeRating(totalStylePoints)}\n**Prestige Level:** ${this.getPrestigeLevel(player)}\n**Visitor Appeal:** ${this.getVisitorAppeal(player)}`,
                    inline: true
                }
            );

        // Showcase each decorated room
        Object.entries(player.housing.decorations.placed).forEach(([roomType, decorations]) => {
            const roomInfo = ROOM_TYPES[roomType] || { name: roomType, emoji: '🏠' };
            const roomStylePoints = this.calculateRoomStyle(decorations);
            const roomTheme = player.housing.decorations.themes[roomType] || 'None';
            const topItems = decorations.slice(0, 3).map(item => {
                const itemData = this.findItemData(item.id);
                return `${this.getRarityEmoji(itemData.rarity)} ${itemData.name}`;
            }).join('\n');

            embed.addFields({
                name: `${roomInfo.emoji} **${roomInfo.name}** (${roomStylePoints} style points)`,
                value: `**Theme:** ${roomTheme}\n**Featured Items:**\n${topItems}${decorations.length > 3 ? `\n*+${decorations.length - 3} more items*` : ''}`,
                inline: true
            });
        });

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('showcase_virtual_tour')
                    .setLabel('Virtual Tour')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🚶‍♂️'),
                new ButtonBuilder()
                    .setCustomId('showcase_share')
                    .setLabel('Share Home')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📤'),
                new ButtonBuilder()
                    .setCustomId('showcase_photography')
                    .setLabel('Photo Session')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📸'),
                new ButtonBuilder()
                    .setCustomId('showcase_feedback')
                    .setLabel('Get Feedback')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💭')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [actionButtons]
        });
    },

    async handleThemes(interaction, player) {
        const themeName = interaction.options.getString('theme');

        if (themeName) {
            await this.applyTheme(interaction, player, themeName);
        } else {
            await this.showThemeSelection(interaction, player);
        }
    },

    // Utility Functions
    createErrorEmbed(title, description) {
        return new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    },

    getCategoryPriceRange(items) {
        const prices = Object.values(items).map(item => item.cost);
        return {
            min: Math.min(...prices),
            max: Math.max(...prices)
        };
    },

    getRarityEmoji(rarity) {
        const emojis = {
            common: '⚪',
            uncommon: '🟢',
            rare: '🔵',
            epic: '🟣',
            legendary: '🟠',
            mythic: '🔴'
        };
        return emojis[rarity] || '⚪';
    },

    groupItemsByRarity(items) {
        const grouped = {};
        Object.entries(items).forEach(([key, item]) => {
            if (!grouped[item.rarity]) grouped[item.rarity] = {};
            grouped[item.rarity][key] = item;
        });
        return grouped;
    },

    formatItemStats(item) {
        const stats = [];
        if (item.comfort) stats.push(`Comfort: ${item.comfort}`);
        if (item.style) stats.push(`Style: ${item.style}`);
        if (item.utility) stats.push(`Utility: ${item.utility}`);
        if (item.magic) stats.push(`Magic: ${item.magic}`);
        if (item.prestige) stats.push(`Prestige: ${item.prestige}`);
        return stats.join(' | ') || 'Decorative';
    },

    isItemOwned(player, itemKey) {
        return player.housing.decorations.inventory.some(item => item.id === itemKey);
    },

    getOwnedCount(player, categoryKey) {
        const categoryItems = Object.keys(DECORATION_CATEGORIES[categoryKey].items);
        return player.housing.decorations.inventory.filter(item => 
            categoryItems.includes(item.id)
        ).length;
    },

    calculateRoomStyle(decorations) {
        return decorations.reduce((total, item) => {
            const itemData = this.findItemData(item.id);
            return total + (itemData?.style || 0);
        }, 0);
    },

    getRoomCompletionStatus(roomType, decorations) {
        const minItems = 3;
        const optimalItems = 8;
        
        if (decorations.length === 0) return '🔴 Empty';
        if (decorations.length < minItems) return '🟡 Basic';
        if (decorations.length < optimalItems) return '🟢 Well Decorated';
        return '🌟 Masterfully Designed';
    },

    findItemData(itemId) {
        for (const category of Object.values(DECORATION_CATEGORIES)) {
            if (category.items[itemId]) {
                return category.items[itemId];
            }
        }
        return null;
    },

    groupInventoryByCategory(inventory) {
        const grouped = {};
        inventory.forEach(item => {
            for (const [categoryKey, category] of Object.entries(DECORATION_CATEGORIES)) {
                if (category.items[item.id]) {
                    if (!grouped[categoryKey]) grouped[categoryKey] = [];
                    grouped[categoryKey].push(item);
                    break;
                }
            }
        });
        return grouped;
    },

    calculateCollectionValue(inventory) {
        return inventory.reduce((total, item) => {
            const itemData = this.findItemData(item.id);
            return total + (itemData?.cost || 0);
        }, 0);
    },

    getRarestItem(inventory) {
        const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
        let rarest = null;
        let highestRarity = 0;

        inventory.forEach(item => {
            const itemData = this.findItemData(item.id);
            if (itemData) {
                const rarityValue = rarityOrder[itemData.rarity] || 0;
                if (rarityValue > highestRarity) {
                    highestRarity = rarityValue;
                    rarest = itemData.name;
                }
            }
        });

        return rarest || 'None';
    },

    calculateItemStylePoints(item) {
        const itemData = this.findItemData(item.id);
        if (!itemData) return 0;
        
        let points = itemData.style || 0;
        points += (itemData.comfort || 0) * 0.5;
        points += (itemData.utility || 0) * 0.3;
        points += (itemData.magic || 0) * 0.8;
        points += (itemData.prestige || 0) * 1.2;
        
        return Math.round(points);
    },

    getHomeRating(stylePoints) {
        if (stylePoints >= 500) return 'S+ Legendary';
        if (stylePoints >= 350) return 'S Masterpiece';
        if (stylePoints >= 250) return 'A+ Exceptional';
        if (stylePoints >= 150) return 'A Beautiful';
        if (stylePoints >= 100) return 'B+ Nice';
        if (stylePoints >= 50) return 'B Decent';
        return 'C Basic';
    },

    getPrestigeLevel(player) {
        const prestigePoints = player.housing.decorations.total_spent / 1000;
        if (prestigePoints >= 50) return 'Elite Collector';
        if (prestigePoints >= 25) return 'Serious Decorator';
        if (prestigePoints >= 10) return 'Interior Enthusiast';
        if (prestigePoints >= 5) return 'Style Conscious';
        return 'Getting Started';
    },

    getVisitorAppeal(player) {
        const totalItems = Object.values(player.housing.decorations.placed).flat().length;
        if (totalItems >= 30) return '🌟 Instagram Worthy';
        if (totalItems >= 20) return '✨ Highly Appealing';
        if (totalItems >= 15) return '💫 Very Attractive';
        if (totalItems >= 10) return '🌸 Pleasant';
        if (totalItems >= 5) return '🏠 Homey';
        return '🚧 Work in Progress';
    },

    async setupShopCollector(interaction, player) {
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

        collector.on('collect', async i => {
            await i.deferUpdate();

            try {
                const customId = i.customId;
                const values = i.values;

                if (customId === 'shop_category_select' && values && values.length > 0) {
                    await this.showCategoryShop(i, player, values[0]);
                } else if (customId.startsWith('shop_item_select_')) {
                    const category = customId.split('_')[3];
                    if (values && values.length > 0) {
                        await this.showItemPurchase(i, player, category, values[0]);
                    }
                } else if (customId === 'shop_back_main') {
                    await this.showMainShop(i, player);
                }
                // Add other shop interactions here
            } catch (error) {
                console.error('Shop collector error:', error);
            }
        });
    },

    async setupPlaceCollector(interaction, player) {
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

        collector.on('collect', async i => {
            await i.deferUpdate();

            try {
                const customId = i.customId;
                const values = i.values;

                if (customId === 'place_room_select' && values && values.length > 0) {
                    await this.showRoomPlacement(i, player, values[0]);
                }
                // Add other placement interactions here
            } catch (error) {
                console.error('Place collector error:', error);
            }
        });
    },

    async showItemPurchase(interaction, player, category, itemKey) {
        // Implementation for item purchase dialog
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#32CD32')
                .setTitle('💰 Purchase Item')
                .setDescription('Item purchase system coming soon!')],
            components: []
        });
    },

    async showRoomPlacement(interaction, player, roomName) {
        // Implementation for room decoration interface
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#8B4513')
                .setTitle('🎨 Room Decoration')
                .setDescription('Room placement system coming soon!')],
            components: []
        });
    },

    async showThemeSelection(interaction, player) {
        // Implementation for theme selection
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#9932CC')
                .setTitle('🎨 Decoration Themes')
                .setDescription('Theme system coming soon!')],
            components: []
        });
    },

    async applyTheme(interaction, player, themeName) {
        // Implementation for applying themes
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('✨ Theme Applied')
                .setDescription('Theme application coming soon!')],
            components: []
        });
    }
};
