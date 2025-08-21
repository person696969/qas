
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

// Quality levels and their bonuses
const qualityLevels = {
    poor: { multiplier: 0.8, chance: 0.15, color: '#8B8B8B', emoji: '💔' },
    common: { multiplier: 1.0, chance: 0.40, color: '#FFFFFF', emoji: '⚪' },
    uncommon: { multiplier: 1.2, chance: 0.25, color: '#32CD32', emoji: '🟢' },
    rare: { multiplier: 1.5, chance: 0.12, color: '#4169E1', emoji: '🔷' },
    epic: { multiplier: 2.0, chance: 0.06, color: '#9932CC', emoji: '🟣' },
    legendary: { multiplier: 3.0, chance: 0.02, color: '#FFD700', emoji: '⭐' }
};

const recipes = {
    weapons: [
        { id: 'iron_sword', name: 'Iron Sword', materials: { iron: 5, wood: 2 }, level: 1, stats: { attack: 15 }, emoji: '⚔️', value: 200 },
        { id: 'steel_axe', name: 'Steel Battle Axe', materials: { steel: 3, wood: 3 }, level: 5, stats: { attack: 25 }, emoji: '🪓', value: 400 },
        { id: 'magic_staff', name: 'Enchanted Staff', materials: { crystal: 2, wood: 4, gem: 1 }, level: 8, stats: { magic: 30 }, emoji: '🔮', value: 800 },
        { id: 'dragon_blade', name: 'Dragon Slayer Blade', materials: { dragon_scale: 1, mythril: 5, gem: 3 }, level: 15, stats: { attack: 50 }, emoji: '🗡️', value: 2000 }
    ],
    armor: [
        { id: 'leather_armor', name: 'Leather Armor', materials: { leather: 6, thread: 4 }, level: 1, stats: { defense: 10 }, emoji: '🥼', value: 150 },
        { id: 'chain_mail', name: 'Chain Mail', materials: { iron: 8, leather: 2 }, level: 4, stats: { defense: 20 }, emoji: '🛡️', value: 350 },
        { id: 'plate_armor', name: 'Steel Plate Armor', materials: { steel: 10, leather: 4 }, level: 10, stats: { defense: 35 }, emoji: '🛡️', value: 800 },
        { id: 'dragon_armor', name: 'Dragon Scale Armor', materials: { dragon_scale: 3, mythril: 2 }, level: 18, stats: { defense: 60 }, emoji: '🛡️', value: 2500 }
    ],
    tools: [
        { id: 'pickaxe', name: 'Iron Pickaxe', materials: { iron: 3, wood: 2 }, level: 1, stats: { mining: 15 }, emoji: '⛏️', value: 120 },
        { id: 'fishing_rod', name: 'Master Fishing Rod', materials: { wood: 4, thread: 6, hook: 1 }, level: 3, stats: { fishing: 20 }, emoji: '🎣', value: 200 },
        { id: 'compass', name: 'Magic Compass', materials: { crystal: 1, iron: 2, gem: 1 }, level: 6, stats: { exploration: 25 }, emoji: '🧭', value: 500 },
        { id: 'telescope', name: 'Star Telescope', materials: { glass: 3, crystal: 2, mythril: 1 }, level: 12, stats: { discovery: 40 }, emoji: '🔭', value: 1200 }
    ],
    potions: [
        { id: 'health_potion', name: 'Health Potion', materials: { herb: 3, water: 1 }, level: 1, stats: { healing: 50 }, emoji: '🧪', value: 50 },
        { id: 'mana_potion', name: 'Mana Restoration', materials: { crystal: 1, herb: 2, water: 1 }, level: 3, stats: { mana: 40 }, emoji: '💙', value: 80 },
        { id: 'strength_elixir', name: 'Strength Elixir', materials: { dragon_blood: 1, herb: 4, gem: 1 }, level: 8, stats: { strength: 30 }, emoji: '💪', value: 300 },
        { id: 'invisibility', name: 'Invisibility Potion', materials: { shadow_essence: 1, herb: 5, crystal: 2 }, level: 12, stats: { stealth: 60 }, emoji: '👻', value: 500 }
    ],
    accessories: [
        { id: 'power_ring', name: 'Ring of Power', materials: { gold: 3, gem: 2 }, level: 5, stats: { all: 5 }, emoji: '💍', value: 400 },
        { id: 'speed_boots', name: 'Boots of Speed', materials: { leather: 4, feather: 6, gem: 1 }, level: 7, stats: { speed: 25 }, emoji: '👢', value: 600 },
        { id: 'wisdom_amulet', name: 'Amulet of Wisdom', materials: { crystal: 3, gold: 2, ancient_rune: 1 }, level: 10, stats: { wisdom: 30 }, emoji: '🔮', value: 800 },
        { id: 'dragon_pendant', name: 'Dragon Heart Pendant', materials: { dragon_heart: 1, mythril: 3, gem: 5 }, level: 20, stats: { all: 15 }, emoji: '💎', value: 3000 }
    ]
};

const materials = {
    wood: { name: 'Wood', emoji: '🪵', rarity: 'common', sources: ['forage', 'explore'] },
    iron: { name: 'Iron Ore', emoji: '⚫', rarity: 'common', sources: ['mine'] },
    leather: { name: 'Leather', emoji: '🟤', rarity: 'common', sources: ['hunt', 'shop'] },
    thread: { name: 'Thread', emoji: '🧵', rarity: 'common', sources: ['shop', 'craft'] },
    steel: { name: 'Steel Ingot', emoji: '⚪', rarity: 'uncommon', sources: ['smelt', 'shop'] },
    crystal: { name: 'Magic Crystal', emoji: '💎', rarity: 'rare', sources: ['mine', 'dungeon'] },
    gem: { name: 'Precious Gem', emoji: '💍', rarity: 'rare', sources: ['mine', 'treasure'] },
    dragon_scale: { name: 'Dragon Scale', emoji: '🐉', rarity: 'legendary', sources: ['battle', 'dungeon'] },
    mythril: { name: 'Mythril', emoji: '✨', rarity: 'legendary', sources: ['deep_mine', 'quest'] },
    herb: { name: 'Magical Herb', emoji: '🌿', rarity: 'common', sources: ['forage', 'garden'] },
    water: { name: 'Pure Water', emoji: '💧', rarity: 'common', sources: ['well', 'river'] },
    gold: { name: 'Gold Ingot', emoji: '🥇', rarity: 'uncommon', sources: ['mine', 'treasure'] },
    glass: { name: 'Crystal Glass', emoji: '🔍', rarity: 'uncommon', sources: ['craft', 'shop'] },
    feather: { name: 'Phoenix Feather', emoji: '🪶', rarity: 'rare', sources: ['hunt', 'quest'] },
    ancient_rune: { name: 'Ancient Rune', emoji: '📜', rarity: 'epic', sources: ['dungeon', 'archaeology'] },
    dragon_heart: { name: 'Dragon Heart', emoji: '❤️', rarity: 'legendary', sources: ['dragon_hunt'] },
    dragon_blood: { name: 'Dragon Blood', emoji: '🩸', rarity: 'epic', sources: ['dragon_battle'] },
    shadow_essence: { name: 'Shadow Essence', emoji: '🌫️', rarity: 'epic', sources: ['shadow_realm'] },
    hook: { name: 'Fishing Hook', emoji: '🪝', rarity: 'common', sources: ['shop', 'craft'] }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('craft')
        .setDescription('🔨 Craft powerful equipment and useful items!')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Choose crafting action')
                .setRequired(false)
                .addChoices(
                    { name: '🔨 Craft Item', value: 'craft' },
                    { name: '📋 View Recipes', value: 'recipes' },
                    { name: '📦 Check Materials', value: 'materials' },
                    { name: '🏗️ Crafting Station', value: 'station' },
                    { name: '⚡ Quick Craft', value: 'quick' },
                    { name: '🎯 Mass Production', value: 'mass' }
                ))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Item category to craft or view')
                .setRequired(false)
                .addChoices(
                    { name: '⚔️ Weapons', value: 'weapons' },
                    { name: '🛡️ Armor', value: 'armor' },
                    { name: '🔧 Tools', value: 'tools' },
                    { name: '🧪 Potions', value: 'potions' },
                    { name: '💍 Accessories', value: 'accessories' }
                ))
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Specific item to craft')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('Number of items to craft (for mass production)')
                .setMinValue(1)
                .setMaxValue(10)),
    
    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const action = interaction.options?.getString('action') || 'station';
            const category = interaction.options?.getString('category');
            const itemName = interaction.options?.getString('item');
            const quantity = interaction.options?.getInteger('quantity') || 1;
            
            switch (action) {
                case 'craft':
                    await this.craftItem(interaction, itemName, category);
                    break;
                case 'recipes':
                    await this.showRecipes(interaction, category);
                    break;
                case 'materials':
                    await this.showMaterials(interaction);
                    break;
                case 'quick':
                    await this.quickCraft(interaction);
                    break;
                case 'mass':
                    await this.massCraft(interaction, itemName, quantity);
                    break;
                default:
                    await this.showCraftingStation(interaction);
            }
        } catch (error) {
            console.error('Error in craft command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing the craft command.',
                ephemeral: true
            });
        }
    },
    
    async showCraftingStation(interaction) {
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || {
            inventory: { items: [], materials: {} },
            crafting: { level: 1, experience: 0, recipes: [], specialization: null },
            stats: { level: 1 },
            workbench: { level: 1, durability: 100 }
        };
        
        const craftingData = userData.crafting || { level: 1, experience: 0, recipes: [] };
        const materials = userData.inventory?.materials || {};
        const workbench = userData.workbench || { level: 1, durability: 100 };
        
        const embed = new EmbedBuilder()
            .setColor('#CD853F')
            .setTitle('🏗️ Master Crafting Station')
            .setDescription('**🔨 Welcome to your personal workshop!**\n\nCraft powerful equipment, brew magical potions, and create legendary items to aid your adventures.')
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields([
                {
                    name: '🎯 Crafting Mastery',
                    value: `⭐ **Level:** ${craftingData.level}\n🎯 **XP:** ${craftingData.experience}/${craftingData.level * 100}\n📖 **Recipes:** ${craftingData.recipes?.length || 0}\n🎨 **Specialization:** ${craftingData.specialization || 'None'}`,
                    inline: true
                },
                {
                    name: '🏗️ Workbench Status',
                    value: `🔧 **Level:** ${workbench.level}\n💪 **Efficiency:** ${workbench.level * 25}%\n🛡️ **Durability:** ${workbench.durability}%\n⚡ **Bonus:** +${workbench.level * 10}% success`,
                    inline: true
                },
                {
                    name: '📦 Material Storage',
                    value: this.formatMaterialList(materials) || '📭 No materials available',
                    inline: true
                }
            ]);
        
        // Calculate craftable items
        const craftableItems = this.getAllCraftableItems(userData);
        
        embed.addFields([
            {
                name: '🔨 Available Crafting Options',
                value: `⚔️ **Weapons:** ${this.getCraftableItems(userData, 'weapons').length} available\n🛡️ **Armor:** ${this.getCraftableItems(userData, 'armor').length} available\n🔧 **Tools:** ${this.getCraftableItems(userData, 'tools').length} available\n🧪 **Potions:** ${this.getCraftableItems(userData, 'potions').length} available\n💍 **Accessories:** ${this.getCraftableItems(userData, 'accessories').length} available`,
                inline: false
            },
            {
                name: '🎮 Quick Actions',
                value: '• 🔍 Browse recipes by category\n• 📦 Check required materials\n• ⚡ Quick craft available items\n• 🎯 Mass production mode\n• 🏗️ Upgrade your workbench',
                inline: false
            }
        ]);
        
        // Progress bar for crafting XP
        const xpProgress = this.createProgressBar(craftingData.experience, craftingData.level * 100);
        embed.addFields([
            {
                name: '📊 Experience Progress',
                value: `${xpProgress}`,
                inline: false
            }
        ]);
        
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('craft_category_select')
            .setPlaceholder('🔨 Choose a crafting category...')
            .addOptions([
                {
                    label: 'Weapons & Combat Gear',
                    description: `${this.getCraftableItems(userData, 'weapons').length} items craftable`,
                    value: 'craft_weapons',
                    emoji: '⚔️'
                },
                {
                    label: 'Armor & Protection',
                    description: `${this.getCraftableItems(userData, 'armor').length} items craftable`,
                    value: 'craft_armor',
                    emoji: '🛡️'
                },
                {
                    label: 'Tools & Utilities',
                    description: `${this.getCraftableItems(userData, 'tools').length} items craftable`,
                    value: 'craft_tools',
                    emoji: '🔧'
                },
                {
                    label: 'Potions & Consumables',
                    description: `${this.getCraftableItems(userData, 'potions').length} items craftable`,
                    value: 'craft_potions',
                    emoji: '🧪'
                },
                {
                    label: 'Accessories & Jewelry',
                    description: `${this.getCraftableItems(userData, 'accessories').length} items craftable`,
                    value: 'craft_accessories',
                    emoji: '💍'
                }
            ]);
            
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('craft_quick_craft')
                    .setLabel('⚡ Quick Craft')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(craftableItems.length === 0),
                new ButtonBuilder()
                    .setCustomId('craft_materials')
                    .setLabel('📦 My Materials')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('craft_recipes')
                    .setLabel('📖 Recipe Book')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('craft_workbench')
                    .setLabel('🏗️ Upgrade Workbench')
                    .setStyle(ButtonStyle.Success)
            );
            
        const utilityButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('gather_materials')
                    .setLabel('🌿 Gather Materials')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('craft_specialization')
                    .setLabel('🎯 Specialization')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('craft_mass_produce')
                    .setLabel('🏭 Mass Production')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        const components = [
            new ActionRowBuilder().addComponents(categorySelect),
            actionButtons,
            utilityButtons
        ];
        
        await interaction.editReply({ embeds: [embed], components });
    },
    
    async craftItem(interaction, itemName, category) {
        const userId = interaction.user.id;
        
        if (!itemName && !category) {
            return interaction.editReply({
                content: '❌ Please specify an item to craft or select a category!',
                ephemeral: true
            });
        }
        
        // Find the recipe
        let recipe = null;
        let recipeCategory = null;
        
        if (itemName) {
            for (const [cat, recipeList] of Object.entries(recipes)) {
                const found = recipeList.find(r => 
                    r.id === itemName.toLowerCase() || 
                    r.name.toLowerCase().includes(itemName.toLowerCase())
                );
                if (found) {
                    recipe = found;
                    recipeCategory = cat;
                    break;
                }
            }
        }
        
        if (!recipe) {
            return interaction.editReply({
                content: '❌ Recipe not found! Use `/craft recipes` to see available recipes.',
                ephemeral: true
            });
        }
        
        const userData = await db.getPlayer(userId) || {
            inventory: { items: [], materials: {} },
            crafting: { level: 1, experience: 0 },
            workbench: { level: 1, durability: 100 },
            coins: 0
        };
        
        const craftingLevel = userData.crafting?.level || 1;
        const userMaterials = userData.inventory?.materials || {};
        const workbench = userData.workbench || { level: 1, durability: 100 };
        
        // Check crafting level
        if (craftingLevel < recipe.level) {
            return interaction.editReply({
                content: `❌ **Insufficient Crafting Level!**\n\nYour crafting level (${craftingLevel}) is too low!\nYou need **Level ${recipe.level}** to craft **${recipe.name}**.\n\n💡 *Craft lower-level items to gain experience!*`,
                ephemeral: true
            });
        }
        
        // Check materials
        const missingMaterials = [];
        const requiredMaterials = [];
        
        for (const [material, required] of Object.entries(recipe.materials)) {
            const available = userMaterials[material] || 0;
            const materialInfo = materials[material] || { name: material, emoji: '📦' };
            
            requiredMaterials.push(`${materialInfo.emoji} **${required}x** ${materialInfo.name}`);
            
            if (available < required) {
                missingMaterials.push(`${materialInfo.emoji} **${required - available}x** ${materialInfo.name} *(need ${required}, have ${available})*`);
            }
        }
        
        if (missingMaterials.length > 0) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Insufficient Materials')
                .setDescription(`**Cannot craft ${recipe.emoji} ${recipe.name}**\n\nYou're missing some required materials!`)
                .addFields([
                    { 
                        name: '📋 Required Materials', 
                        value: requiredMaterials.join('\n'), 
                        inline: false 
                    },
                    { 
                        name: '❌ Missing Materials', 
                        value: missingMaterials.join('\n'), 
                        inline: false 
                    },
                    { 
                        name: '💡 How to Obtain Materials', 
                        value: '• Use `/mine` to find ores and gems\n• Use `/forage` to gather herbs and wood\n• Use `/hunt` for leather and rare materials\n• Visit the `/shop` to purchase materials\n• Complete `/quest` for rare components', 
                        inline: false 
                    }
                ])
                .setFooter({ text: 'Gather the missing materials and try again!' });
                
            return interaction.editReply({ embeds: [embed], ephemeral: true });
        }
        
        // Calculate success rate
        const baseSuccessRate = 85;
        const levelBonus = Math.min((craftingLevel - recipe.level + 1) * 5, 15);
        const workbenchBonus = workbench.level * 2;
        const durabilityPenalty = workbench.durability < 50 ? (50 - workbench.durability) / 2 : 0;
        
        const successRate = Math.min(95, Math.max(50, baseSuccessRate + levelBonus + workbenchBonus - durabilityPenalty));
        
        // Determine quality
        const quality = this.determineQuality(successRate, craftingLevel, recipe.level);
        const qualityData = qualityLevels[quality];
        
        // Show crafting confirmation
        const confirmEmbed = new EmbedBuilder()
            .setColor('#4ECDC4')
            .setTitle('🔨 Confirm Crafting')
            .setDescription(`**Ready to craft ${recipe.emoji} ${recipe.name}?**`)
            .addFields([
                {
                    name: '📋 Required Materials',
                    value: requiredMaterials.join('\n'),
                    inline: true
                },
                {
                    name: '⚡ Item Stats',
                    value: Object.entries(recipe.stats).map(([stat, value]) => `+${Math.floor(value * qualityData.multiplier)} ${stat}`).join('\n'),
                    inline: true
                },
                {
                    name: '🎯 Crafting Info',
                    value: `**Success Rate:** ${successRate}%\n**Expected Quality:** ${qualityData.emoji} ${quality}\n**Experience Gain:** ${recipe.level * 10} XP\n**Estimated Value:** ${Math.floor(recipe.value * qualityData.multiplier)} coins`,
                    inline: false
                }
            ])
            .setFooter({ text: `Workbench Level ${workbench.level} | Durability: ${workbench.durability}%` });
        
        const confirmButton = new ButtonBuilder()
            .setCustomId('craft_confirm')
            .setLabel('🔨 Start Crafting')
            .setStyle(ButtonStyle.Primary);
            
        const cancelButton = new ButtonBuilder()
            .setCustomId('craft_cancel')
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Secondary);
            
        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
        
        const response = await interaction.editReply({
            embeds: [confirmEmbed],
            components: [row]
        });
        
        // Wait for confirmation
        try {
            const filter = i => i.user.id === interaction.user.id;
            const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });
            
            if (confirmation.customId === 'craft_confirm') {
                await this.processCrafting(confirmation, userData, recipe, recipeCategory, quality, successRate);
            } else {
                await confirmation.update({
                    content: '❌ Crafting cancelled.',
                    embeds: [],
                    components: []
                });
            }
        } catch (e) {
            await interaction.editReply({
                content: '⏰ Crafting confirmation expired.',
                embeds: [],
                components: []
            });
        }
    },
    
    async processCrafting(interaction, userData, recipe, category, quality, successRate) {
        const success = Math.random() * 100 <= successRate;
        const qualityData = qualityLevels[quality];
        
        // Remove materials regardless of success
        for (const [material, required] of Object.entries(recipe.materials)) {
            userData.inventory.materials[material] = (userData.inventory.materials[material] || 0) - required;
        }
        
        // Reduce workbench durability
        userData.workbench.durability = Math.max(0, (userData.workbench.durability || 100) - Math.random() * 5);
        
        if (success) {
            // Create the item
            const craftedItem = {
                id: recipe.id,
                name: recipe.name,
                category: category,
                stats: {},
                quality: quality,
                crafted: true,
                craftedBy: interaction.user.id,
                craftedDate: Date.now(),
                emoji: recipe.emoji,
                value: Math.floor(recipe.value * qualityData.multiplier),
                durability: 100,
                level: 1
            };
            
            // Apply quality multiplier to stats
            for (const [stat, value] of Object.entries(recipe.stats)) {
                craftedItem.stats[stat] = Math.floor(value * qualityData.multiplier);
            }
            
            // Add to inventory
            if (!userData.inventory.items) userData.inventory.items = [];
            userData.inventory.items.push(craftedItem);
            
            // Add crafting experience
            const expGain = recipe.level * 10 * qualityData.multiplier;
            userData.crafting.experience = (userData.crafting.experience || 0) + Math.floor(expGain);
            
            // Check for level up
            const requiredExp = userData.crafting.level * 100;
            let leveledUp = false;
            
            while (userData.crafting.experience >= requiredExp) {
                userData.crafting.experience -= requiredExp;
                userData.crafting.level++;
                leveledUp = true;
            }
            
            await db.setPlayer(interaction.user.id, userData);
            
            const successEmbed = new EmbedBuilder()
                .setColor(qualityData.color)
                .setTitle('✨ Crafting Successful!')
                .setDescription(`**You have successfully crafted a ${qualityData.emoji} ${quality} quality item!**`)
                .addFields([
                    { 
                        name: '🎁 Item Crafted', 
                        value: `${qualityData.emoji} **${craftedItem.name}** *(${quality})*`, 
                        inline: true 
                    },
                    { 
                        name: '⚡ Item Stats', 
                        value: Object.entries(craftedItem.stats).map(([stat, value]) => `+${value} ${stat}`).join('\n') || 'No stat bonuses', 
                        inline: true 
                    },
                    { 
                        name: '🎯 Rewards', 
                        value: `+${Math.floor(expGain)} crafting XP\n💰 Est. Value: ${craftedItem.value} coins`, 
                        inline: true 
                    }
                ])
                .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png')
                .setTimestamp();
                
            if (leveledUp) {
                successEmbed.addFields([
                    { 
                        name: '🎉 Level Up!', 
                        value: `Your crafting level increased to **${userData.crafting.level}**!\n🔓 New recipes and features unlocked!`, 
                        inline: false 
                    }
                ]);
            }
            
            const actionButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('craft_again')
                        .setLabel('🔨 Craft Another')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('view_item')
                        .setLabel('🔍 View Item')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('equip_item')
                        .setLabel('⚡ Equip Item')
                        .setStyle(ButtonStyle.Success)
                );
            
            await interaction.update({ embeds: [successEmbed], components: [actionButtons] });
            
        } else {
            // Crafting failed
            const failEmbed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('💔 Crafting Failed!')
                .setDescription('**The crafting attempt was unsuccessful!**\n\nYour materials have been consumed, but you gained some experience from the attempt.')
                .addFields([
                    { 
                        name: '📦 Materials Lost', 
                        value: Object.entries(recipe.materials).map(([mat, qty]) => {
                            const matInfo = materials[mat] || { name: mat, emoji: '📦' };
                            return `${matInfo.emoji} ${qty}x ${matInfo.name}`;
                        }).join('\n'), 
                        inline: false 
                    },
                    { 
                        name: '🎯 Experience Gained', 
                        value: `+${Math.floor(recipe.level * 5)} crafting XP\n*(Failure still teaches valuable lessons!)*`, 
                        inline: false 
                    },
                    { 
                        name: '💡 Tips for Success', 
                        value: '• Upgrade your workbench for better success rates\n• Maintain your equipment regularly\n• Practice with easier recipes first\n• Consider specializing in a crafting discipline', 
                        inline: false 
                    }
                ])
                .setFooter({ text: 'Don\'t give up! Every master craftsman has faced failures.' });
            
            // Give small amount of experience for failure
            userData.crafting.experience = (userData.crafting.experience || 0) + Math.floor(recipe.level * 5);
            await db.setPlayer(interaction.user.id, userData);
            
            const retryButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('craft_retry')
                        .setLabel('🔄 Try Again')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('gather_materials')
                        .setLabel('🌿 Gather More Materials')
                        .setStyle(ButtonStyle.Success)
                );
            
            await interaction.update({ embeds: [failEmbed], components: [retryButton] });
        }
    },
    
    async showRecipes(interaction, category) {
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || { crafting: { level: 1 } };
        const craftingLevel = userData.crafting?.level || 1;
        
        if (!category) {
            // Show all categories overview
            const embed = new EmbedBuilder()
                .setColor('#4ECDC4')
                .setTitle('📖 Master Craftsman\'s Recipe Collection')
                .setDescription('**🔥 Complete crafting recipe compendium**\n\nDiscover all available recipes organized by category. Each category offers unique items with different requirements and rewards.')
                .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png');
                
            Object.entries(recipes).forEach(([cat, recipeList]) => {
                const availableRecipes = recipeList.filter(recipe => craftingLevel >= recipe.level);
                const totalRecipes = recipeList.length;
                const categoryEmoji = this.getCategoryEmoji(cat);
                const difficultyRange = `Lv.${Math.min(...recipeList.map(r => r.level))}-${Math.max(...recipeList.map(r => r.level))}`;
                
                embed.addFields([{
                    name: `${categoryEmoji} ${this.getCategoryName(cat)}`,
                    value: `📋 **Available:** ${availableRecipes.length}/${totalRecipes} recipes\n🎯 **Level Range:** ${difficultyRange}\n💡 ${this.getCategoryDescription(cat)}\n🔓 **Unlocked:** ${availableRecipes.length > 0 ? '✅' : '❌'}`,
                    inline: true
                }]);
            });
            
            embed.addFields([
                {
                    name: '🎓 Your Crafting Progression',
                    value: `**Current Level:** ${craftingLevel}\n**Experience:** ${userData.crafting?.experience || 0}/${craftingLevel * 100}\n**Total Recipes:** ${this.getTotalUnlockedRecipes(userData)}/${this.getTotalRecipes()}\n\n*Level up by crafting items to unlock new recipes!*`,
                    inline: false
                }
            ]);
            
        } else {
            // Show specific category
            const categoryRecipes = recipes[category] || [];
            const categoryName = this.getCategoryName(category);
            const categoryEmoji = this.getCategoryEmoji(category);
            
            const embed = new EmbedBuilder()
                .setColor('#4ECDC4')
                .setTitle(`${categoryEmoji} ${categoryName} Recipe Book`)
                .setDescription(`**${categoryRecipes.length} unique recipes in this category**\n\nMaster the art of ${categoryName.toLowerCase()} crafting!`)
                .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png');
                
            categoryRecipes.forEach(recipe => {
                const canCraft = craftingLevel >= recipe.level;
                const materialsText = Object.entries(recipe.materials).map(([mat, qty]) => {
                    const matInfo = materials[mat] || { name: mat, emoji: '📦' };
                    return `${matInfo.emoji}${qty}`;
                }).join(' ');
                
                const statsText = Object.entries(recipe.stats).map(([stat, value]) => 
                    `+${value} ${stat}`
                ).join(', ');
                
                const statusEmoji = canCraft ? '✅' : '🔒';
                const difficultyColor = recipe.level <= 5 ? '🟢' : recipe.level <= 10 ? '🟡' : recipe.level <= 15 ? '🟠' : '🔴';
                
                embed.addFields([{
                    name: `${statusEmoji} ${recipe.emoji} ${recipe.name}`,
                    value: `${difficultyColor} **Level ${recipe.level}** | 💰 **${recipe.value}** coins\n📦 **Materials:** ${materialsText}\n⚡ **Effects:** ${statsText}${canCraft ? '' : '\n❌ *Requires crafting level ' + recipe.level + '*'}`,
                    inline: true
                }]);
            });
            
            if (categoryRecipes.length === 0) {
                embed.addFields([{
                    name: '📭 No Recipes Available',
                    value: 'This category doesn\'t have any recipes yet. Check back later for updates!',
                    inline: false
                }]);
            }
        }
        
        const navigationButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('craft_station')
                    .setLabel('← Back to Workshop')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('craft_materials_guide')
                    .setLabel('📦 Material Guide')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('craft_tips')
                    .setLabel('💡 Crafting Tips')
                    .setStyle(ButtonStyle.Success)
            );
            
        await interaction.editReply({ embeds: [embed], components: [navigationButtons] });
    },
    
    async showMaterials(interaction) {
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || { inventory: { materials: {} } };
        const userMaterials = userData.inventory?.materials || {};
        
        const embed = new EmbedBuilder()
            .setColor('#95A5A6')
            .setTitle('📦 Material Inventory & Guide')
            .setDescription('**🔍 Your current materials and where to find more**')
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
        
        // Group materials by rarity
        const materialsByRarity = {
            common: [],
            uncommon: [],
            rare: [],
            epic: [],
            legendary: []
        };
        
        Object.entries(materials).forEach(([id, material]) => {
            const quantity = userMaterials[id] || 0;
            const rarity = material.rarity || 'common';
            
            materialsByRarity[rarity].push({
                ...material,
                id,
                quantity
            });
        });
        
        // Display materials by rarity
        Object.entries(materialsByRarity).forEach(([rarity, materialList]) => {
            if (materialList.length === 0) return;
            
            const rarityEmojis = {
                common: '⚪',
                uncommon: '🟢',
                rare: '🔷',
                epic: '🟣',
                legendary: '⭐'
            };
            
            const materialText = materialList.map(mat => {
                const quantityText = mat.quantity > 0 ? `**${mat.quantity}x**` : '0x';
                const sourcesText = mat.sources ? mat.sources.slice(0, 2).join(', ') : 'unknown';
                return `${mat.emoji} ${quantityText} ${mat.name}\n  *Sources: ${sourcesText}*`;
            }).join('\n\n');
            
            if (materialText) {
                embed.addFields([{
                    name: `${rarityEmojis[rarity]} ${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Materials`,
                    value: materialText || 'None available',
                    inline: false
                }]);
            }
        });
        
        // Add material gathering guide
        embed.addFields([
            {
                name: '🌟 Material Gathering Guide',
                value: '**🌿 Foraging:** Wood, herbs, water\n**⛏️ Mining:** Ores, gems, crystals\n**🏹 Hunting:** Leather, feathers, rare drops\n**🏪 Shopping:** Basic materials and tools\n**⚔️ Combat:** Dragon materials, essence\n**🏛️ Quests:** Ancient runes, artifacts',
                inline: false
            }
        ]);
        
        const totalMaterials = Object.values(userMaterials).reduce((sum, qty) => sum + qty, 0);
        embed.setFooter({ text: `Total materials: ${totalMaterials} | Material types: ${Object.keys(userMaterials).length}/${Object.keys(materials).length}` });
        
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('gather_materials')
                    .setLabel('🌿 Gather Materials')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('material_exchange')
                    .setLabel('🔄 Material Exchange')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('craft_station')
                    .setLabel('← Back to Workshop')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        await interaction.editReply({ embeds: [embed], components: [actionButtons] });
    },
    
    async quickCraft(interaction) {
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || { 
            inventory: { materials: {} },
            crafting: { level: 1 } 
        };
        
        const craftableItems = this.getAllCraftableItems(userData);
        
        if (craftableItems.length === 0) {
            return interaction.editReply({
                content: '❌ **No items available for quick crafting!**\n\nYou need more materials or higher crafting level.\nUse `/craft materials` to see what you need.',
                ephemeral: true
            });
        }
        
        // Sort by value and take top 10
        const bestItems = craftableItems
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        
        const embed = new EmbedBuilder()
            .setColor('#4ECDC4')
            .setTitle('⚡ Quick Craft Menu')
            .setDescription('**🔥 Ready-to-craft items**\n\nThese items can be crafted immediately with your current materials!')
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png');
        
        bestItems.forEach((item, index) => {
            const statsText = Object.entries(item.stats).map(([stat, value]) => 
                `+${value} ${stat}`
            ).join(', ');
            
            embed.addFields([{
                name: `${index + 1}. ${item.emoji} ${item.name}`,
                value: `🎯 **Level ${item.level}** | 💰 **${item.value}** coins\n⚡ **Effects:** ${statsText}\n📦 **Category:** ${item.category}`,
                inline: true
            }]);
        });
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('quick_craft_select')
            .setPlaceholder('⚡ Choose an item to craft instantly...')
            .addOptions(bestItems.map((item, index) => ({
                label: item.name,
                description: `Level ${item.level} | ${item.category}`,
                value: `${item.category}_${item.id}`,
                emoji: item.emoji
            })));
        
        const components = [
            new ActionRowBuilder().addComponents(selectMenu),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('craft_station')
                    .setLabel('← Back to Workshop')
                    .setStyle(ButtonStyle.Secondary)
            )
        ];
        
        await interaction.editReply({ embeds: [embed], components });
    },
    
    async massCraft(interaction, itemName, quantity) {
        if (!itemName) {
            return interaction.editReply({
                content: '❌ Please specify an item for mass production!',
                ephemeral: true
            });
        }
        
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || {
            inventory: { materials: {} },
            crafting: { level: 1 }
        };
        
        // Find recipe
        let recipe = null;
        let category = null;
        
        for (const [cat, recipeList] of Object.entries(recipes)) {
            const found = recipeList.find(r => 
                r.id === itemName.toLowerCase() || 
                r.name.toLowerCase().includes(itemName.toLowerCase())
            );
            if (found) {
                recipe = found;
                category = cat;
                break;
            }
        }
        
        if (!recipe) {
            return interaction.editReply({
                content: '❌ Recipe not found for mass production!',
                ephemeral: true
            });
        }
        
        // Check if user can craft multiple
        const userMaterials = userData.inventory?.materials || {};
        const maxCraftable = Math.min(...Object.entries(recipe.materials).map(([mat, req]) => 
            Math.floor((userMaterials[mat] || 0) / req)
        ));
        
        if (maxCraftable === 0) {
            return interaction.editReply({
                content: `❌ You don't have enough materials to craft even one ${recipe.name}!`,
                ephemeral: true
            });
        }
        
        const actualQuantity = Math.min(quantity, maxCraftable, 10); // Cap at 10
        
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🏭 Mass Production Setup')
            .setDescription(`**Preparing to mass produce ${recipe.emoji} ${recipe.name}**`)
            .addFields([
                {
                    name: '📊 Production Details',
                    value: `**Quantity:** ${actualQuantity} items\n**Max Possible:** ${maxCraftable} items\n**Total Materials Needed:** ${Object.entries(recipe.materials).map(([mat, qty]) => {
                        const matInfo = materials[mat] || { name: mat, emoji: '📦' };
                        return `${matInfo.emoji} ${qty * actualQuantity}x ${matInfo.name}`;
                    }).join(', ')}`,
                    inline: false
                },
                {
                    name: '⚡ Expected Results',
                    value: `**Total Experience:** ~${recipe.level * 10 * actualQuantity} XP\n**Estimated Value:** ~${recipe.value * actualQuantity} coins\n**Production Time:** ~${actualQuantity * 2} seconds`,
                    inline: false
                }
            ]);
        
        const confirmButton = new ButtonBuilder()
            .setCustomId('mass_craft_confirm')
            .setLabel(`🏭 Start Mass Production`)
            .setStyle(ButtonStyle.Primary);
            
        const cancelButton = new ButtonBuilder()
            .setCustomId('mass_craft_cancel')
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Secondary);
            
        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
        
        // Store production data temporarily
        this.tempProductionData = {
            userId,
            recipe,
            category,
            quantity: actualQuantity
        };
        
        await interaction.editReply({ embeds: [embed], components: [row] });
    },
    
    // Helper methods
    getAllCraftableItems(userData) {
        const craftingLevel = userData.crafting?.level || 1;
        const userMaterials = userData.inventory?.materials || {};
        const allCraftable = [];
        
        Object.entries(recipes).forEach(([category, recipeList]) => {
            recipeList.forEach(recipe => {
                if (craftingLevel >= recipe.level) {
                    const canCraft = Object.entries(recipe.materials).every(([mat, req]) => 
                        (userMaterials[mat] || 0) >= req
                    );
                    
                    if (canCraft) {
                        allCraftable.push({ ...recipe, category });
                    }
                }
            });
        });
        
        return allCraftable;
    },
    
    getCraftableItems(userData, category) {
        const categoryRecipes = recipes[category] || [];
        const craftingLevel = userData.crafting?.level || 1;
        const userMaterials = userData.inventory?.materials || {};
        
        return categoryRecipes.filter(recipe => {
            if (craftingLevel < recipe.level) return false;
            
            return Object.entries(recipe.materials).every(([material, required]) => 
                (userMaterials[material] || 0) >= required
            );
        });
    },
    
    formatMaterialList(materials) {
        const entries = Object.entries(materials)
            .filter(([_, qty]) => qty > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8);
            
        if (entries.length === 0) return null;
        
        return entries.map(([id, qty]) => {
            const matInfo = materials[id] || { name: id, emoji: '📦' };
            return `${matInfo.emoji} **${qty}x** ${matInfo.name}`;
        }).join('\n');
    },
    
    determineQuality(successRate, craftingLevel, recipeLevel) {
        const levelDiff = craftingLevel - recipeLevel;
        const qualityRoll = Math.random() * 100;
        
        // Higher success rate and level difference improve quality chances
        const qualityBonus = Math.max(0, levelDiff * 5) + Math.max(0, successRate - 75);
        
        if (qualityRoll + qualityBonus >= 98) return 'legendary';
        if (qualityRoll + qualityBonus >= 94) return 'epic';
        if (qualityRoll + qualityBonus >= 88) return 'rare';
        if (qualityRoll + qualityBonus >= 75) return 'uncommon';
        if (qualityRoll + qualityBonus >= 60) return 'common';
        return 'poor';
    },
    
    createProgressBar(current, max) {
        const barLength = 20;
        const progress = Math.min(Math.max(0, current), max);
        const filledLength = Math.floor((progress / max) * barLength);
        const emptyLength = barLength - filledLength;
        
        return '█'.repeat(filledLength) + '░'.repeat(emptyLength) + 
               ` ${current}/${max} (${Math.floor((current/max) * 100)}%)`;
    },
    
    getCategoryName(category) {
        const names = {
            weapons: 'Weapons & Combat Gear',
            armor: 'Armor & Protection',
            tools: 'Tools & Utilities',
            potions: 'Potions & Consumables',
            accessories: 'Accessories & Jewelry'
        };
        return names[category] || 'Unknown Category';
    },
    
    getCategoryEmoji(category) {
        const emojis = {
            weapons: '⚔️',
            armor: '🛡️',
            tools: '🔧',
            potions: '🧪',
            accessories: '💍'
        };
        return emojis[category] || '📦';
    },
    
    getCategoryDescription(category) {
        const descriptions = {
            weapons: 'Swords, axes, and magical weapons for combat',
            armor: 'Protective gear for dangerous adventures',
            tools: 'Utility items for exploration and gathering',
            potions: 'Consumables for temporary boosts and healing',
            accessories: 'Rings, amulets, and enhancement items'
        };
        return descriptions[category] || 'Various crafted items';
    },
    
    getTotalUnlockedRecipes(userData) {
        const craftingLevel = userData.crafting?.level || 1;
        let total = 0;
        
        Object.values(recipes).forEach(recipeList => {
            total += recipeList.filter(recipe => craftingLevel >= recipe.level).length;
        });
        
        return total;
    },
    
    getTotalRecipes() {
        return Object.values(recipes).reduce((total, recipeList) => total + recipeList.length, 0);
    }
};
