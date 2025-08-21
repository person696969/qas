
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

// Define comprehensive crafting categories and their recipes
const craftingRecipes = {
    weapons: {
        emoji: '⚔️',
        name: 'Weapons & Combat Gear',
        description: 'Forge powerful weapons to dominate in battle',
        items: {
            'iron_sword': {
                name: 'Iron Sword',
                materials: { 'iron_ingot': 3, 'wood': 1, 'leather': 1 },
                level: 1,
                experience: 25,
                value: 150,
                stats: { attack: 15, durability: 100 },
                rarity: 'common',
                description: 'A reliable starter weapon for aspiring warriors'
            },
            'steel_blade': {
                name: 'Steel Blade',
                materials: { 'steel_ingot': 4, 'leather': 1, 'gem': 1 },
                level: 3,
                experience: 50,
                value: 350,
                stats: { attack: 25, critical: 5 },
                rarity: 'uncommon',
                description: 'Sharper and more durable than iron weapons'
            },
            'mythril_rapier': {
                name: 'Mythril Rapier',
                materials: { 'mythril_ingot': 3, 'magic_essence': 2, 'silver': 2 },
                level: 5,
                experience: 100,
                value: 800,
                stats: { attack: 35, speed: 10, magic: 5 },
                rarity: 'rare',
                description: 'A swift and elegant weapon imbued with magic'
            },
            'dragon_slayer': {
                name: 'Dragon Slayer Sword',
                materials: { 'dragon_scale': 2, 'mythril_ingot': 5, 'ancient_rune': 1 },
                level: 10,
                experience: 250,
                value: 2500,
                stats: { attack: 60, fire_resist: 25, dragon_damage: 50 },
                rarity: 'epic',
                description: 'Legendary weapon specifically crafted to slay dragons'
            },
            'excalibur': {
                name: 'Excalibur',
                materials: { 'celestial_metal': 1, 'holy_essence': 3, 'time_crystal': 1 },
                level: 20,
                experience: 500,
                value: 10000,
                stats: { attack: 100, all_resist: 15, holy_damage: 75 },
                rarity: 'legendary',
                description: 'The ultimate weapon of legend, said to choose its wielder'
            }
        }
    },
    armor: {
        emoji: '🛡️',
        name: 'Armor & Protection',
        description: 'Craft defensive gear to survive the toughest battles',
        items: {
            'leather_armor': {
                name: 'Leather Armor',
                materials: { 'leather': 5, 'thread': 2, 'buckle': 3 },
                level: 1,
                experience: 30,
                value: 120,
                stats: { defense: 10, speed: 5 },
                rarity: 'common',
                description: 'Basic protection for novice adventurers'
            },
            'iron_platemail': {
                name: 'Iron Platemail',
                materials: { 'iron_ingot': 5, 'leather': 2, 'chain': 4 },
                level: 3,
                experience: 60,
                value: 400,
                stats: { defense: 25, weight: 10 },
                rarity: 'uncommon',
                description: 'Heavy armor that provides excellent protection'
            },
            'mythril_armor': {
                name: 'Mythril Chainmail',
                materials: { 'mythril_ingot': 6, 'magic_cloth': 3, 'reinforcement': 2 },
                level: 5,
                experience: 120,
                value: 1200,
                stats: { defense: 40, magic_resist: 15, weight: -5 },
                rarity: 'rare',
                description: 'Lightweight yet strong armor with magical properties'
            },
            'dragon_armor': {
                name: 'Dragon Scale Armor',
                materials: { 'dragon_scale': 8, 'fire_essence': 3, 'ancient_technique': 1 },
                level: 12,
                experience: 300,
                value: 3500,
                stats: { defense: 70, fire_resist: 50, intimidation: 20 },
                rarity: 'epic',
                description: 'Nearly impenetrable armor made from dragon scales'
            },
            'celestial_robes': {
                name: 'Celestial Robes',
                materials: { 'starweave': 5, 'cosmic_essence': 4, 'divine_blessing': 1 },
                level: 18,
                experience: 450,
                value: 8000,
                stats: { defense: 45, magic_resist: 75, mana_regen: 25 },
                rarity: 'legendary',
                description: 'Robes woven from the fabric of space itself'
            }
        }
    },
    accessories: {
        emoji: '💍',
        name: 'Accessories & Jewelry',
        description: 'Enhance your abilities with magical accessories',
        items: {
            'lucky_charm': {
                name: 'Lucky Charm',
                materials: { 'silver_ingot': 1, 'magic_dust': 2, 'rabbit_foot': 1 },
                level: 2,
                experience: 40,
                value: 150,
                stats: { luck: 10, treasure_find: 5 },
                rarity: 'common',
                description: 'A simple charm that brings good fortune'
            },
            'power_ring': {
                name: 'Ring of Power',
                materials: { 'gold_ingot': 2, 'ruby': 1, 'enchantment': 1 },
                level: 4,
                experience: 80,
                value: 600,
                stats: { all_stats: 5, mana: 20 },
                rarity: 'uncommon',
                description: 'Enhances all of the wearer\'s natural abilities'
            },
            'wisdom_amulet': {
                name: 'Amulet of Wisdom',
                materials: { 'sapphire': 2, 'ancient_knowledge': 1, 'platinum': 3 },
                level: 6,
                experience: 150,
                value: 1500,
                stats: { intelligence: 15, exp_gain: 10, spell_power: 20 },
                rarity: 'rare',
                description: 'Grants the wearer enhanced learning and magical abilities'
            },
            'time_keeper': {
                name: 'Timekeeper\'s Watch',
                materials: { 'time_crystal': 1, 'clockwork': 5, 'temporal_essence': 2 },
                level: 15,
                experience: 400,
                value: 5000,
                stats: { time_manipulation: 25, cooldown_reduction: 15, haste: 20 },
                rarity: 'epic',
                description: 'Allows limited manipulation of time flow'
            },
            'phoenix_pendant': {
                name: 'Phoenix Heart Pendant',
                materials: { 'phoenix_heart': 1, 'eternal_flame': 3, 'rebirth_essence': 2 },
                level: 20,
                experience: 600,
                value: 12000,
                stats: { fire_immunity: 100, resurrection: 1, regeneration: 50 },
                rarity: 'legendary',
                description: 'Grants the legendary power of resurrection'
            }
        }
    },
    potions: {
        emoji: '🧪',
        name: 'Potions & Elixirs',
        description: 'Brew magical potions for temporary enhancements',
        items: {
            'health_potion': {
                name: 'Health Potion',
                materials: { 'red_herb': 3, 'spring_water': 1, 'vial': 1 },
                level: 1,
                experience: 15,
                value: 50,
                stats: { healing: 100, duration: 0 },
                rarity: 'common',
                description: 'Instantly restores health when consumed'
            },
            'mana_elixir': {
                name: 'Mana Elixir',
                materials: { 'blue_herb': 2, 'crystal_water': 1, 'magic_catalyst': 1 },
                level: 2,
                experience: 25,
                value: 75,
                stats: { mana_restore: 80, duration: 0 },
                rarity: 'common',
                description: 'Replenishes magical energy reserves'
            },
            'strength_brew': {
                name: 'Strength Brew',
                materials: { 'power_flower': 2, 'giant_blood': 1, 'enhancer': 1 },
                level: 4,
                experience: 60,
                value: 200,
                stats: { strength_boost: 25, duration: 600 },
                rarity: 'uncommon',
                description: 'Temporarily increases physical strength'
            },
            'invisibility_draught': {
                name: 'Invisibility Draught',
                materials: { 'shadow_bloom': 3, 'void_essence': 1, 'stealth_oil': 2 },
                level: 8,
                experience: 150,
                value: 800,
                stats: { invisibility: 100, duration: 300 },
                rarity: 'rare',
                description: 'Grants temporary invisibility to the drinker'
            },
            'gods_nectar': {
                name: 'Nectar of the Gods',
                materials: { 'ambrosia': 1, 'divine_essence': 3, 'immortal_tears': 1 },
                level: 16,
                experience: 350,
                value: 5000,
                stats: { all_stats: 50, duration: 1800, invulnerability: 30 },
                rarity: 'legendary',
                description: 'Grants temporary god-like powers'
            }
        }
    },
    tools: {
        emoji: '🔧',
        name: 'Tools & Utilities',
        description: 'Craft specialized tools for various professions',
        items: {
            'iron_pickaxe': {
                name: 'Iron Pickaxe',
                materials: { 'iron_ingot': 3, 'hardwood': 2, 'binding': 1 },
                level: 1,
                experience: 20,
                value: 100,
                stats: { mining_speed: 15, durability: 200 },
                rarity: 'common',
                description: 'Essential tool for mining operations'
            },
            'master_fishing_rod': {
                name: 'Master Fishing Rod',
                materials: { 'bamboo': 4, 'silk_line': 3, 'golden_hook': 1 },
                level: 3,
                experience: 50,
                value: 300,
                stats: { fishing_skill: 20, rare_catch: 10 },
                rarity: 'uncommon',
                description: 'Professional fishing equipment for skilled anglers'
            },
            'archaeologist_kit': {
                name: 'Archaeologist\'s Kit',
                materials: { 'precision_tools': 5, 'magnifying_glass': 1, 'preservation_kit': 3 },
                level: 6,
                experience: 100,
                value: 800,
                stats: { artifact_find: 25, historical_knowledge: 15 },
                rarity: 'rare',
                description: 'Complete kit for archaeological expeditions'
            },
            'alchemist_apparatus': {
                name: 'Master Alchemist\'s Apparatus',
                materials: { 'glass_components': 8, 'precision_burner': 2, 'measurement_tools': 5 },
                level: 10,
                experience: 200,
                value: 2000,
                stats: { alchemy_skill: 30, potion_quality: 20, success_rate: 15 },
                rarity: 'epic',
                description: 'Professional alchemy equipment for master brewers'
            },
            'creation_forge': {
                name: 'Divine Creation Forge',
                materials: { 'celestial_metal': 2, 'eternal_flame': 5, 'creation_rune': 1 },
                level: 18,
                experience: 400,
                value: 15000,
                stats: { crafting_mastery: 50, divine_creation: 25, legendary_chance: 10 },
                rarity: 'legendary',
                description: 'The ultimate crafting tool, capable of creating divine items'
            }
        }
    }
};

// Material information with detailed properties
const materialDatabase = {
    // Common Materials
    iron_ingot: { name: 'Iron Ingot', emoji: '⚫', rarity: 'common', sources: ['mining', 'smelting'], value: 25 },
    wood: { name: 'Hardwood', emoji: '🪵', rarity: 'common', sources: ['forestry', 'lumber'], value: 15 },
    leather: { name: 'Cured Leather', emoji: '🟤', rarity: 'common', sources: ['hunting', 'tanning'], value: 20 },
    thread: { name: 'Strong Thread', emoji: '🧵', rarity: 'common', sources: ['textile', 'shop'], value: 5 },
    
    // Uncommon Materials
    steel_ingot: { name: 'Steel Ingot', emoji: '⚪', rarity: 'uncommon', sources: ['advanced_smelting'], value: 75 },
    silver_ingot: { name: 'Silver Ingot', emoji: '🥈', rarity: 'uncommon', sources: ['mining', 'trading'], value: 50 },
    gold_ingot: { name: 'Gold Ingot', emoji: '🥇', rarity: 'uncommon', sources: ['mining', 'treasure'], value: 100 },
    
    // Rare Materials  
    mythril_ingot: { name: 'Mythril Ingot', emoji: '✨', rarity: 'rare', sources: ['deep_mining', 'dungeons'], value: 300 },
    magic_essence: { name: 'Magic Essence', emoji: '🔮', rarity: 'rare', sources: ['alchemy', 'magic_creatures'], value: 200 },
    ruby: { name: 'Ruby Gem', emoji: '💎', rarity: 'rare', sources: ['mining', 'treasure'], value: 400 },
    sapphire: { name: 'Sapphire Gem', emoji: '💍', rarity: 'rare', sources: ['mining', 'treasure'], value: 450 },
    
    // Epic Materials
    dragon_scale: { name: 'Dragon Scale', emoji: '🐲', rarity: 'epic', sources: ['dragon_hunting'], value: 1000 },
    ancient_rune: { name: 'Ancient Rune', emoji: '📜', rarity: 'epic', sources: ['archaeology', 'ancient_sites'], value: 800 },
    time_crystal: { name: 'Time Crystal', emoji: '⏰', rarity: 'epic', sources: ['temporal_rifts'], value: 1500 },
    
    // Legendary Materials
    celestial_metal: { name: 'Celestial Metal', emoji: '🌟', rarity: 'legendary', sources: ['divine_quests'], value: 5000 },
    phoenix_heart: { name: 'Phoenix Heart', emoji: '❤️‍🔥', rarity: 'legendary', sources: ['phoenix_encounter'], value: 8000 },
    divine_essence: { name: 'Divine Essence', emoji: '✨', rarity: 'legendary', sources: ['divine_blessing'], value: 10000 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recipes')
        .setDescription('📖 Browse and discover crafting recipes')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Recipe category to explore')
                .setRequired(false)
                .addChoices(
                    { name: '⚔️ Weapons & Combat Gear', value: 'weapons' },
                    { name: '🛡️ Armor & Protection', value: 'armor' },
                    { name: '💍 Accessories & Jewelry', value: 'accessories' },
                    { name: '🧪 Potions & Elixirs', value: 'potions' },
                    { name: '🔧 Tools & Utilities', value: 'tools' }
                ))
        .addStringOption(option =>
            option.setName('search')
                .setDescription('Search for specific recipes')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('filter')
                .setDescription('Filter recipes by criteria')
                .setRequired(false)
                .addChoices(
                    { name: '🟢 Craftable Now', value: 'craftable' },
                    { name: '🔒 Locked Recipes', value: 'locked' },
                    { name: '⭐ Rare & Above', value: 'rare' },
                    { name: '💰 High Value', value: 'valuable' },
                    { name: '⚡ Quick Craft', value: 'quick' }
                )),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const category = interaction.options.getString('category');
            const searchTerm = interaction.options.getString('search');
            const filter = interaction.options.getString('filter');
            const userId = interaction.user.id;
            
            // Get player data
            const player = await db.getPlayer(userId) || {
                level: 1,
                craftingLevel: 1,
                inventory: { materials: {} },
                recipes: { known: [], discovered: [] },
                crafting: { level: 1, experience: 0, specialization: null }
            };

            if (searchTerm) {
                await this.handleSearch(interaction, player, searchTerm);
            } else if (category) {
                await this.showCategoryRecipes(interaction, player, category, filter);
            } else {
                await this.showRecipeOverview(interaction, player, filter);
            }

        } catch (error) {
            console.error('Error in recipes command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while browsing recipes. Please try again.',
                ephemeral: true
            });
        }
    },

    async showRecipeOverview(interaction, player, filter) {
        const craftingLevel = player.crafting?.level || 1;
        
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('📖 Master Recipe Compendium')
            .setDescription('**🔥 Comprehensive crafting recipe collection**\n\nExplore all available recipes organized by category. Master the art of creation and forge legendary items!')
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png')
            .addFields([
                {
                    name: '👤 Your Crafting Profile',
                    value: `🎯 **Level:** ${craftingLevel}\n📊 **Experience:** ${player.crafting?.experience || 0}/${craftingLevel * 100}\n🎨 **Specialization:** ${player.crafting?.specialization || 'None'}\n📖 **Known Recipes:** ${this.getKnownRecipeCount(player)}/${this.getTotalRecipeCount()}`,
                    inline: false
                }
            ]);

        // Add category overview
        Object.entries(craftingRecipes).forEach(([categoryId, categoryData]) => {
            const categoryRecipes = Object.values(categoryData.items);
            const availableCount = this.getAvailableRecipeCount(player, categoryRecipes);
            const craftableCount = this.getCraftableRecipeCount(player, categoryRecipes);
            const valueRange = this.getValueRange(categoryRecipes);
            
            embed.addFields([{
                name: `${categoryData.emoji} ${categoryData.name}`,
                value: `📋 **Available:** ${availableCount}/${categoryRecipes.length} recipes\n🔨 **Craftable:** ${craftableCount} items\n💰 **Value Range:** ${valueRange.min} - ${valueRange.max} coins\n💡 *${categoryData.description}*`,
                inline: true
            }]);
        });

        // Add discovery progress
        const totalRecipes = this.getTotalRecipeCount();
        const knownRecipes = this.getKnownRecipeCount(player);
        const progressBar = this.createProgressBar(knownRecipes, totalRecipes);
        
        embed.addFields([
            {
                name: '🔍 Discovery Progress',
                value: `${progressBar}\n**${knownRecipes}/${totalRecipes}** recipes discovered`,
                inline: false
            },
            {
                name: '🌟 Quick Actions',
                value: '• 🔍 **Search** for specific recipes\n• 📂 **Browse** by category\n• 🔨 **Filter** craftable items\n• ⭐ **Discover** rare recipes\n• 🎯 **Specialize** in a discipline',
                inline: false
            }
        ]);

        // Create category selection menu
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('recipe_category_select')
            .setPlaceholder('📂 Choose a category to explore...')
            .addOptions(Object.entries(craftingRecipes).map(([id, data]) => ({
                label: data.name,
                description: `${Object.keys(data.items).length} recipes | ${data.description.substring(0, 50)}...`,
                value: `recipe_${id}`,
                emoji: data.emoji
            })));

        const filterSelect = new StringSelectMenuBuilder()
            .setCustomId('recipe_filter_select')
            .setPlaceholder('🔍 Apply filters...')
            .addOptions([
                { label: 'Show All Recipes', description: 'Display all available recipes', value: 'filter_all', emoji: '📋' },
                { label: 'Craftable Now', description: 'Only recipes you can craft immediately', value: 'filter_craftable', emoji: '🟢' },
                { label: 'Locked Recipes', description: 'Recipes requiring higher levels', value: 'filter_locked', emoji: '🔒' },
                { label: 'Rare & Legendary', description: 'High-tier recipes only', value: 'filter_rare', emoji: '⭐' },
                { label: 'High Value Items', description: 'Most valuable recipes', value: 'filter_valuable', emoji: '💰' }
            ]);

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('recipe_search')
                    .setLabel('🔍 Search Recipes')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('recipe_favorites')
                    .setLabel('⭐ My Favorites')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('recipe_random')
                    .setLabel('🎲 Random Recipe')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('crafting_station')
                    .setLabel('🔨 Crafting Station')
                    .setStyle(ButtonStyle.Primary)
            );

        const components = [
            new ActionRowBuilder().addComponents(categorySelect),
            new ActionRowBuilder().addComponents(filterSelect),
            actionButtons
        ];

        await interaction.editReply({ embeds: [embed], components });
    },

    async showCategoryRecipes(interaction, player, category, filter) {
        const categoryData = craftingRecipes[category];
        if (!categoryData) {
            return interaction.editReply({
                content: '❌ Invalid recipe category selected.',
                ephemeral: true
            });
        }

        const craftingLevel = player.crafting?.level || 1;
        const recipes = Object.values(categoryData.items);
        
        // Apply filters
        let filteredRecipes = recipes;
        if (filter === 'craftable') {
            filteredRecipes = recipes.filter(recipe => this.canCraftRecipe(player, recipe));
        } else if (filter === 'locked') {
            filteredRecipes = recipes.filter(recipe => !this.isRecipeAvailable(player, recipe));
        } else if (filter === 'rare') {
            filteredRecipes = recipes.filter(recipe => ['rare', 'epic', 'legendary'].includes(recipe.rarity));
        } else if (filter === 'valuable') {
            filteredRecipes = recipes.filter(recipe => recipe.value >= 1000);
        }

        const embed = new EmbedBuilder()
            .setColor(this.getRarityColor(categoryData.rarity || 'common'))
            .setTitle(`${categoryData.emoji} ${categoryData.name}`)
            .setDescription(`**${categoryData.description}**\n\n${filteredRecipes.length} recipes ${filter ? `(${filter} filter)` : 'available'}`)
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png');

        // Group recipes by rarity for better organization
        const recipesByRarity = this.groupRecipesByRarity(filteredRecipes);
        
        Object.entries(recipesByRarity).forEach(([rarity, rarityRecipes]) => {
            if (rarityRecipes.length === 0) return;
            
            const rarityEmoji = this.getRarityEmoji(rarity);
            const recipeText = rarityRecipes.map(recipe => {
                const canCraft = this.canCraftRecipe(player, recipe);
                const isAvailable = this.isRecipeAvailable(player, recipe);
                const statusIcon = canCraft ? '✅' : isAvailable ? '⚡' : '🔒';
                
                const materialsPreview = Object.entries(recipe.materials).slice(0, 3).map(([mat, qty]) => {
                    const matInfo = materialDatabase[mat] || { emoji: '📦' };
                    return `${matInfo.emoji}${qty}`;
                }).join(' ');
                
                return `${statusIcon} **${recipe.name}**\n  ${rarityEmoji} Lv.${recipe.level} | ${materialsPreview} | ${recipe.value}💰`;
            }).join('\n\n');

            embed.addFields([{
                name: `${rarityEmoji} ${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Recipes`,
                value: recipeText || 'None available',
                inline: false
            }]);
        });

        if (filteredRecipes.length === 0) {
            embed.addFields([{
                name: '📭 No Recipes Found',
                value: filter ? 
                    `No recipes match the "${filter}" filter in this category.` :
                    'This category doesn\'t have any recipes available yet.',
                inline: false
            }]);
        }

        // Add category statistics
        const stats = this.getCategoryStatistics(player, recipes);
        embed.addFields([{
            name: '📊 Category Statistics',
            value: `**Available:** ${stats.available}/${recipes.length}\n**Craftable:** ${stats.craftable}\n**Average Level:** ${stats.avgLevel}\n**Total Value:** ${stats.totalValue.toLocaleString()} coins`,
            inline: false
        }]);

        // Create recipe selection menu if there are recipes to show
        const components = [];
        
        if (filteredRecipes.length > 0) {
            const recipeSelect = new StringSelectMenuBuilder()
                .setCustomId('recipe_detail_select')
                .setPlaceholder('📖 View detailed recipe information...')
                .addOptions(filteredRecipes.slice(0, 25).map(recipe => ({
                    label: recipe.name,
                    description: `Level ${recipe.level} | ${recipe.rarity} | ${recipe.value} coins`,
                    value: `recipe_detail_${category}_${Object.keys(categoryData.items).find(key => categoryData.items[key] === recipe)}`,
                    emoji: this.getRarityEmoji(recipe.rarity)
                })));
            
            components.push(new ActionRowBuilder().addComponents(recipeSelect));
        }

        const navigationButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('recipe_overview')
                    .setLabel('← Recipe Overview')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('recipe_materials')
                    .setLabel('📦 Material Guide')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('quick_craft_category')
                    .setLabel('⚡ Quick Craft')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(stats.craftable === 0)
            );

        components.push(navigationButtons);

        await interaction.editReply({ embeds: [embed], components });
    },

    async handleSearch(interaction, player, searchTerm) {
        const searchResults = this.searchRecipes(searchTerm.toLowerCase());
        
        if (searchResults.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('🔍 Search Results')
                .setDescription(`No recipes found matching **"${searchTerm}"**`)
                .addFields([{
                    name: '💡 Search Tips',
                    value: '• Try searching for item names\n• Use material names\n• Search by category (weapons, armor, etc.)\n• Try partial words or keywords',
                    inline: false
                }]);
                
            return interaction.editReply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor('#4ECDC4')
            .setTitle(`🔍 Search Results for "${searchTerm}"`)
            .setDescription(`Found **${searchResults.length}** matching recipes`)
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png');

        searchResults.slice(0, 10).forEach(result => {
            const canCraft = this.canCraftRecipe(player, result.recipe);
            const isAvailable = this.isRecipeAvailable(player, result.recipe);
            const statusIcon = canCraft ? '✅' : isAvailable ? '⚡' : '🔒';
            const rarityEmoji = this.getRarityEmoji(result.recipe.rarity);
            
            const materialsText = Object.entries(result.recipe.materials).map(([mat, qty]) => {
                const matInfo = materialDatabase[mat] || { name: mat, emoji: '📦' };
                return `${matInfo.emoji} ${qty}x ${matInfo.name}`;
            }).join(', ');

            embed.addFields([{
                name: `${statusIcon} ${rarityEmoji} ${result.recipe.name}`,
                value: `**Category:** ${result.category}\n**Level:** ${result.recipe.level} | **Value:** ${result.recipe.value} coins\n**Materials:** ${materialsText}\n*${result.recipe.description}*`,
                inline: false
            }]);
        });

        if (searchResults.length > 10) {
            embed.setFooter({ text: `Showing first 10 results. ${searchResults.length - 10} more found.` });
        }

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('recipe_overview')
                    .setLabel('← Back to Overview')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('refine_search')
                    .setLabel('🔍 Refine Search')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.editReply({ embeds: [embed], components: [actionButtons] });
    },

    // Helper methods
    searchRecipes(searchTerm) {
        const results = [];
        
        Object.entries(craftingRecipes).forEach(([categoryId, categoryData]) => {
            Object.entries(categoryData.items).forEach(([recipeId, recipe]) => {
                if (
                    recipe.name.toLowerCase().includes(searchTerm) ||
                    recipe.description.toLowerCase().includes(searchTerm) ||
                    categoryData.name.toLowerCase().includes(searchTerm) ||
                    Object.keys(recipe.materials).some(mat => mat.toLowerCase().includes(searchTerm))
                ) {
                    results.push({
                        category: categoryData.name,
                        categoryId,
                        recipeId,
                        recipe
                    });
                }
            });
        });
        
        return results.sort((a, b) => b.recipe.value - a.recipe.value);
    },

    canCraftRecipe(player, recipe) {
        const craftingLevel = player.crafting?.level || 1;
        const materials = player.inventory?.materials || {};
        
        if (craftingLevel < recipe.level) return false;
        
        return Object.entries(recipe.materials).every(([material, required]) => 
            (materials[material] || 0) >= required
        );
    },

    isRecipeAvailable(player, recipe) {
        const craftingLevel = player.crafting?.level || 1;
        return craftingLevel >= recipe.level;
    },

    getKnownRecipeCount(player) {
        const knownRecipes = player.recipes?.known || [];
        return knownRecipes.length;
    },

    getTotalRecipeCount() {
        return Object.values(craftingRecipes).reduce(
            (total, category) => total + Object.keys(category.items).length,
            0
        );
    },

    getAvailableRecipeCount(player, recipes) {
        return recipes.filter(recipe => this.isRecipeAvailable(player, recipe)).length;
    },

    getCraftableRecipeCount(player, recipes) {
        return recipes.filter(recipe => this.canCraftRecipe(player, recipe)).length;
    },

    getValueRange(recipes) {
        const values = recipes.map(r => r.value);
        return {
            min: Math.min(...values),
            max: Math.max(...values)
        };
    },

    groupRecipesByRarity(recipes) {
        const groups = { common: [], uncommon: [], rare: [], epic: [], legendary: [] };
        
        recipes.forEach(recipe => {
            const rarity = recipe.rarity || 'common';
            if (groups[rarity]) {
                groups[rarity].push(recipe);
            }
        });
        
        return groups;
    },

    getCategoryStatistics(player, recipes) {
        const available = this.getAvailableRecipeCount(player, recipes);
        const craftable = this.getCraftableRecipeCount(player, recipes);
        const avgLevel = Math.round(recipes.reduce((sum, r) => sum + r.level, 0) / recipes.length);
        const totalValue = recipes.reduce((sum, r) => sum + r.value, 0);
        
        return { available, craftable, avgLevel, totalValue };
    },

    getRarityEmoji(rarity) {
        const emojis = {
            common: '⚪',
            uncommon: '🟢',
            rare: '🔷',
            epic: '🟣',
            legendary: '⭐'
        };
        return emojis[rarity] || '⚪';
    },

    getRarityColor(rarity) {
        const colors = {
            common: '#FFFFFF',
            uncommon: '#32CD32',
            rare: '#4169E1',
            epic: '#9932CC',
            legendary: '#FFD700'
        };
        return colors[rarity] || '#FFFFFF';
    },

    createProgressBar(current, max) {
        const barLength = 20;
        const progress = Math.min(Math.max(0, current), max);
        const filledLength = Math.floor((progress / max) * barLength);
        const emptyLength = barLength - filledLength;
        
        return '█'.repeat(filledLength) + '░'.repeat(emptyLength) + 
               ` ${current}/${max} (${Math.floor((current/max) * 100)}%)`;
    }
};
