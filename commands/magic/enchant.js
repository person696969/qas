
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const ENCHANTMENTS = {
    sharpness: {
        name: '⚔️ Sharpness',
        description: 'Increases weapon damage significantly',
        type: 'weapon',
        levels: 5,
        materials: { magic_dust: 2, gems: 1 },
        effects: { damage: 0.15 },
        rarity: 'common',
        discoveryLevel: 1
    },
    protection: {
        name: '🛡️ Protection',
        description: 'Reduces incoming damage from all sources',
        type: 'armor',
        levels: 4,
        materials: { magic_dust: 2, iron_ore: 3 },
        effects: { defense: 0.10 },
        rarity: 'common',
        discoveryLevel: 1
    },
    fire_aspect: {
        name: '🔥 Fire Aspect',
        description: 'Weapons deal burning damage over time',
        type: 'weapon',
        levels: 3,
        materials: { fire_crystal: 1, magic_dust: 3 },
        effects: { fire_damage: 0.20 },
        rarity: 'uncommon',
        discoveryLevel: 3
    },
    frost_bite: {
        name: '❄️ Frost Bite',
        description: 'Chance to freeze enemies on hit',
        type: 'weapon',
        levels: 3,
        materials: { ice_crystal: 1, magic_dust: 3 },
        effects: { freeze_chance: 0.15 },
        rarity: 'uncommon',
        discoveryLevel: 3
    },
    fortune: {
        name: '💎 Fortune',
        description: 'Increases resource gathering yields',
        type: 'tool',
        levels: 4,
        materials: { lucky_clover: 1, gems: 2 },
        effects: { yield_bonus: 0.25 },
        rarity: 'rare',
        discoveryLevel: 5
    },
    unbreaking: {
        name: '🔧 Unbreaking',
        description: 'Dramatically reduces durability loss',
        type: 'all',
        levels: 3,
        materials: { reinforced_metal: 2, magic_dust: 1 },
        effects: { durability_bonus: 0.33 },
        rarity: 'uncommon',
        discoveryLevel: 2
    },
    mending: {
        name: '✨ Mending',
        description: 'Repairs item using experience points',
        type: 'all',
        levels: 1,
        materials: { phoenix_feather: 1, life_essence: 2 },
        effects: { auto_repair: true },
        rarity: 'epic',
        discoveryLevel: 8
    },
    soul_bound: {
        name: '👻 Soul Bound',
        description: 'Item cannot be lost on death',
        type: 'all',
        levels: 1,
        materials: { soul_gem: 1, dark_essence: 3 },
        effects: { death_protection: true },
        rarity: 'legendary',
        discoveryLevel: 10
    },
    lightning_strike: {
        name: '⚡ Lightning Strike',
        description: 'Chance to call down lightning on enemies',
        type: 'weapon',
        levels: 4,
        materials: { storm_crystal: 2, conductive_metal: 1 },
        effects: { lightning_damage: 0.30 },
        rarity: 'rare',
        discoveryLevel: 6
    },
    void_walker: {
        name: '🌌 Void Walker',
        description: 'Allows walking through certain barriers',
        type: 'boots',
        levels: 2,
        materials: { void_essence: 3, shadow_cloth: 2 },
        effects: { phase_walk: true },
        rarity: 'legendary',
        discoveryLevel: 12
    },
    time_dilation: {
        name: '⏰ Time Dilation',
        description: 'Slows down time during combat',
        type: 'accessory',
        levels: 3,
        materials: { temporal_crystal: 1, clockwork_gears: 2 },
        effects: { time_slow: 0.25 },
        rarity: 'mythic',
        discoveryLevel: 15
    }
};

const ENCHANTING_MATERIALS = {
    magic_dust: { name: '✨ Magic Dust', rarity: 'common', description: 'Sparkling powder from magical creatures' },
    gems: { name: '💎 Gems', rarity: 'uncommon', description: 'Precious stones with natural magic' },
    fire_crystal: { name: '🔥 Fire Crystal', rarity: 'rare', description: 'Crystallized flame essence' },
    ice_crystal: { name: '❄️ Ice Crystal', rarity: 'rare', description: 'Frozen magic in crystal form' },
    storm_crystal: { name: '⚡ Storm Crystal', rarity: 'rare', description: 'Lightning captured in crystal' },
    lucky_clover: { name: '🍀 Lucky Clover', rarity: 'uncommon', description: 'Four-leaf clover with fortune magic' },
    reinforced_metal: { name: '🔩 Reinforced Metal', rarity: 'common', description: 'Magically strengthened metal alloy' },
    phoenix_feather: { name: '🪶 Phoenix Feather', rarity: 'legendary', description: 'Feather from the immortal phoenix' },
    life_essence: { name: '💚 Life Essence', rarity: 'rare', description: 'Concentrated life force energy' },
    soul_gem: { name: '💀 Soul Gem', rarity: 'legendary', description: 'Gem containing trapped souls' },
    dark_essence: { name: '🌑 Dark Essence', rarity: 'rare', description: 'Essence of shadow and darkness' },
    void_essence: { name: '🌌 Void Essence', rarity: 'legendary', description: 'Matter from the space between worlds' },
    temporal_crystal: { name: '⏰ Temporal Crystal', rarity: 'mythic', description: 'Crystal that bends time itself' },
    conductive_metal: { name: '🔌 Conductive Metal', rarity: 'uncommon', description: 'Metal that channels electricity' },
    shadow_cloth: { name: '🦇 Shadow Cloth', rarity: 'rare', description: 'Fabric woven from pure shadow' },
    clockwork_gears: { name: '⚙️ Clockwork Gears', rarity: 'rare', description: 'Precision gears from ancient machines' }
};

const RESEARCH_PROJECTS = {
    elemental_mastery: {
        name: '🔥❄️⚡ Elemental Mastery',
        description: 'Research advanced elemental enchantments',
        duration: 2 * 60 * 60 * 1000, // 2 hours
        cost: 500,
        unlocks: ['fire_aspect', 'frost_bite', 'lightning_strike']
    },
    ancient_wisdom: {
        name: '📚 Ancient Wisdom',
        description: 'Study forgotten enchanting techniques',
        duration: 4 * 60 * 60 * 1000, // 4 hours
        cost: 1000,
        unlocks: ['mending', 'soul_bound']
    },
    void_studies: {
        name: '🌌 Void Studies',
        description: 'Explore the mysteries of the void',
        duration: 6 * 60 * 60 * 1000, // 6 hours
        cost: 2000,
        unlocks: ['void_walker', 'time_dilation']
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enchant')
        .setDescription('✨ Master the art of magical enchantment with advanced systems')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Choose your enchanting action')
                .addChoices(
                    { name: '🔮 Enchantment Workshop', value: 'workshop' },
                    { name: '📚 Research New Enchantments', value: 'research' },
                    { name: '⚡ Enchant Item', value: 'enchant' },
                    { name: '🔍 Analyze Item', value: 'analyze' },
                    { name: '📊 View Statistics', value: 'stats' }
                ))
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item to enchant or analyze')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('enchantment')
                .setDescription('Enchantment to apply')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const action = interaction.options.getString('action') || 'workshop';
            const userId = interaction.user.id;
            let userData = await db.getPlayer(userId) || {};

            // Initialize enchanting data
            if (!userData.enchanting) {
                userData.enchanting = {
                    level: 1,
                    experience: 0,
                    discovered_enchantments: ['sharpness', 'protection', 'unbreaking'],
                    successful_enchants: 0,
                    failed_enchants: 0,
                    research_points: 0,
                    active_research: null,
                    mastery_points: {},
                    enchanting_table_level: 1
                };
            }

            switch (action) {
                case 'workshop':
                    await this.showEnchantingWorkshop(interaction, userData);
                    break;
                case 'research':
                    await this.handleResearch(interaction, userData);
                    break;
                case 'enchant':
                    await this.handleEnchanting(interaction, userData);
                    break;
                case 'analyze':
                    await this.handleAnalyze(interaction, userData);
                    break;
                case 'stats':
                    await this.showStatistics(interaction, userData);
                    break;
            }

        } catch (error) {
            console.error('Enchanting command error:', error);
            await interaction.editReply({
                content: '❌ A magical disturbance occurred in the enchanting workshop. Please try again.',
                ephemeral: true
            });
        }
    },

    async showEnchantingWorkshop(interaction, userData) {
        const enchantingLevel = userData.enchanting.level;
        const successRate = this.calculateSuccessRate(userData);

        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('✨ Master Enchantment Workshop')
            .setDescription('╔══════════════════════════════════════╗\n║        **ARCANE ENCHANTMENTS**       ║\n╚══════════════════════════════════════╝\n\n*Where mundane items become legendary artifacts*')
            .setThumbnail('https://example.com/enchanting_table.png')
            .addFields([
                {
                    name: '🧙‍♂️ **Master Enchanter Stats**',
                    value: `**Level:** ${enchantingLevel} ⭐\n**Experience:** ${userData.enchanting.experience} XP\n**Success Rate:** ${successRate}%\n**Table Level:** ${userData.enchanting.enchanting_table_level}`,
                    inline: true
                },
                {
                    name: '📊 **Workshop Statistics**',
                    value: `**Successful:** ${userData.enchanting.successful_enchants} ✅\n**Failed:** ${userData.enchanting.failed_enchants} ❌\n**Discovered:** ${userData.enchanting.discovered_enchantments.length}/${Object.keys(ENCHANTMENTS).length}\n**Research Points:** ${userData.enchanting.research_points} 🔬`,
                    inline: true
                },
                {
                    name: '🎒 **Available Materials**',
                    value: this.formatMaterialsInventory(userData.inventory || {}) || 'No materials available',
                    inline: true
                }
            ]);

        // Show discovered enchantments by rarity
        const enchantmentsByRarity = this.groupEnchantmentsByRarity(userData.enchanting.discovered_enchantments);
        
        Object.entries(enchantmentsByRarity).forEach(([rarity, enchants]) => {
            if (enchants.length > 0) {
                const rarityColor = this.getRarityColor(rarity);
                const enchantList = enchants.map(key => {
                    const enchant = ENCHANTMENTS[key];
                    const mastery = userData.enchanting.mastery_points[key] || 0;
                    return `${enchant.name} (${mastery}⭐)`;
                }).join('\n');

                embed.addFields({
                    name: `${this.getRarityEmoji(rarity)} **${rarity.toUpperCase()} Enchantments**`,
                    value: enchantList,
                    inline: true
                });
            }
        });

        // Workshop actions
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('enchant_item_menu')
                    .setLabel('⚡ Enchant Item')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔮'),
                new ButtonBuilder()
                    .setCustomId('research_menu')
                    .setLabel('🔬 Research')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📚'),
                new ButtonBuilder()
                    .setCustomId('analyze_item_menu')
                    .setLabel('🔍 Analyze')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('upgrade_table')
                    .setLabel('⬆️ Upgrade Table')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🛠️')
            );

        // Enchantment selection menu
        const availableEnchantments = userData.enchanting.discovered_enchantments
            .map(key => {
                const enchant = ENCHANTMENTS[key];
                return {
                    label: enchant.name.replace(/⚔️|🛡️|💎|🔥|❄️|⚡|🔧|✨|👻|🌌|⏰/g, '').trim(),
                    value: key,
                    description: `${enchant.description.substring(0, 50)}...`,
                    emoji: enchant.name.split(' ')[0]
                };
            });

        let components = [actionButtons];

        if (availableEnchantments.length > 0) {
            const enchantSelect = new StringSelectMenuBuilder()
                .setCustomId('enchantment_details')
                .setPlaceholder('🔍 View enchantment details...')
                .addOptions(availableEnchantments.slice(0, 25)); // Discord limit

            components.unshift(new ActionRowBuilder().addComponents(enchantSelect));
        }

        // Show active research if any
        if (userData.enchanting.active_research) {
            const research = RESEARCH_PROJECTS[userData.enchanting.active_research.project];
            const timeLeft = userData.enchanting.active_research.endTime - Date.now();
            
            if (timeLeft > 0) {
                embed.addFields({
                    name: '🔬 **Active Research**',
                    value: `**${research.name}**\nCompletes: <t:${Math.floor(userData.enchanting.active_research.endTime / 1000)}:R>`,
                    inline: false
                });
            }
        }

        embed.setFooter({ 
            text: '💡 Tip: Higher level enchantments require rare materials and advanced research!' 
        });

        await interaction.editReply({ embeds: [embed], components });
    },

    async handleResearch(interaction, userData) {
        if (userData.enchanting.active_research) {
            const research = RESEARCH_PROJECTS[userData.enchanting.active_research.project];
            const timeLeft = userData.enchanting.active_research.endTime - Date.now();

            if (timeLeft > 0) {
                await interaction.editReply({
                    content: `🔬 You're already researching **${research.name}**!\nCompletes: <t:${Math.floor(userData.enchanting.active_research.endTime / 1000)}:R>`,
                    ephemeral: true
                });
                return;
            } else {
                // Research completed, unlock enchantments
                const completedResearch = userData.enchanting.active_research;
                const project = RESEARCH_PROJECTS[completedResearch.project];
                
                project.unlocks.forEach(enchantKey => {
                    if (!userData.enchanting.discovered_enchantments.includes(enchantKey)) {
                        userData.enchanting.discovered_enchantments.push(enchantKey);
                    }
                });

                userData.enchanting.experience += 200;
                userData.enchanting.research_points += 50;
                userData.enchanting.active_research = null;

                await db.updatePlayer(interaction.user.id, userData);

                const completionEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎉 Research Complete!')
                    .setDescription(`**${project.name}** research has been completed!`)
                    .addFields([
                        {
                            name: '🔓 **New Enchantments Unlocked**',
                            value: project.unlocks.map(key => ENCHANTMENTS[key].name).join('\n'),
                            inline: false
                        },
                        {
                            name: '📈 **Rewards**',
                            value: `**Experience:** +200 XP\n**Research Points:** +50 RP\n**Enchantments:** ${project.unlocks.length} new`,
                            inline: false
                        }
                    ]);

                await interaction.editReply({ embeds: [completionEmbed] });
                return;
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#4B0082')
            .setTitle('🔬 Enchantment Research Laboratory')
            .setDescription('╔══════════════════════════════════════╗\n║        **ARCANE RESEARCH**           ║\n╚══════════════════════════════════════╝\n\n*Unlock the secrets of advanced enchantments*')
            .addFields([
                {
                    name: '🧪 **Your Research Status**',
                    value: `**Level:** ${userData.enchanting.level}\n**Research Points:** ${userData.enchanting.research_points}\n**Completed Projects:** ${this.getCompletedResearch(userData)}`,
                    inline: true
                }
            ]);

        // Show available research projects
        Object.entries(RESEARCH_PROJECTS).forEach(([key, project]) => {
            const canStart = userData.gold >= project.cost && userData.enchanting.level >= (project.requiredLevel || 1);
            const alreadyCompleted = this.hasCompletedResearch(userData, key);
            
            embed.addFields({
                name: `${project.name} ${canStart && !alreadyCompleted ? '✅' : alreadyCompleted ? '✔️' : '❌'}`,
                value: `**${project.description}**\n\n` +
                       `⏱️ **Duration:** ${project.duration / (60 * 60 * 1000)}h\n` +
                       `💰 **Cost:** ${project.cost} gold\n` +
                       `🔓 **Unlocks:** ${project.unlocks.map(k => ENCHANTMENTS[k].name).join(', ')}\n` +
                       `📊 **Status:** ${alreadyCompleted ? 'Completed' : canStart ? 'Available' : 'Locked'}`,
                inline: false
            });
        });

        // Research selection menu
        const availableProjects = Object.entries(RESEARCH_PROJECTS)
            .filter(([key, project]) => 
                userData.gold >= project.cost && 
                !this.hasCompletedResearch(userData, key) &&
                userData.enchanting.level >= (project.requiredLevel || 1)
            )
            .map(([key, project]) => ({
                label: project.name.replace(/🔥❄️⚡|📚|🌌/g, '').trim(),
                value: key,
                description: `${project.duration / (60 * 60 * 1000)}h - ${project.cost} gold`,
                emoji: project.name.split(' ')[0]
            }));

        if (availableProjects.length > 0) {
            const researchSelect = new StringSelectMenuBuilder()
                .setCustomId('start_research')
                .setPlaceholder('🚀 Start a research project...')
                .addOptions(availableProjects);

            const components = [new ActionRowBuilder().addComponents(researchSelect)];
            await interaction.editReply({ embeds: [embed], components });
        } else {
            embed.addFields({
                name: '⚠️ **No Available Research**',
                value: 'Either all projects are completed, or you need more gold/experience to start new research.',
                inline: false
            });
            
            await interaction.editReply({ embeds: [embed] });
        }
    },

    async handleEnchanting(interaction, userData) {
        const itemName = interaction.options.getString('item');
        const enchantmentKey = interaction.options.getString('enchantment');

        if (!itemName || !enchantmentKey) {
            await interaction.editReply({
                content: '❌ Please specify both an item and enchantment! Use the workshop interface for guided enchanting.',
                ephemeral: true
            });
            return;
        }

        const enchantment = ENCHANTMENTS[enchantmentKey];
        if (!enchantment) {
            await interaction.editReply({
                content: '❌ Invalid enchantment specified!',
                ephemeral: true
            });
            return;
        }

        // Check if user knows this enchantment
        if (!userData.enchanting.discovered_enchantments.includes(enchantmentKey)) {
            await interaction.editReply({
                content: `❌ You haven't discovered **${enchantment.name}** yet! Use research to unlock it.`,
                ephemeral: true
            });
            return;
        }

        // Check if user has the item
        if (!userData.inventory?.items?.includes(itemName)) {
            await interaction.editReply({
                content: `❌ You don't have **${itemName}** in your inventory.`,
                ephemeral: true
            });
            return;
        }

        // Check materials
        const hasAllMaterials = Object.entries(enchantment.materials).every(([material, amount]) => {
            return (userData.inventory[material] || 0) >= amount;
        });

        if (!hasAllMaterials) {
            const missingMaterials = Object.entries(enchantment.materials)
                .filter(([material, amount]) => (userData.inventory[material] || 0) < amount)
                .map(([material, amount]) => `${ENCHANTING_MATERIALS[material].name} (need ${amount}, have ${userData.inventory[material] || 0})`)
                .join('\n');

            await interaction.editReply({
                content: `❌ **Missing Materials:**\n${missingMaterials}`,
                ephemeral: true
            });
            return;
        }

        // Calculate costs and success rate
        const goldCost = this.calculateEnchantingCost(enchantment, userData.enchanting.level);
        const successRate = this.calculateEnchantmentSuccessRate(enchantment, userData);

        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('⚡ Enchantment Preparation')
            .setDescription(`Prepare to enchant **${itemName}** with **${enchantment.name}**?`)
            .addFields([
                {
                    name: '🎯 **Enchantment Details**',
                    value: `**Type:** ${enchantment.type}\n**Rarity:** ${enchantment.rarity}\n**Max Level:** ${enchantment.levels}\n**Effect:** ${enchantment.description}`,
                    inline: true
                },
                {
                    name: '💰 **Costs**',
                    value: `**Gold:** ${goldCost}\n**Materials:** ${Object.entries(enchantment.materials).map(([mat, amt]) => `${amt}x ${ENCHANTING_MATERIALS[mat].name}`).join(', ')}`,
                    inline: true
                },
                {
                    name: '📊 **Success Info**',
                    value: `**Success Rate:** ${successRate}%\n**Your Level:** ${userData.enchanting.level}\n**Table Level:** ${userData.enchanting.enchanting_table_level}`,
                    inline: true
                },
                {
                    name: '✨ **Enchantment Effects**',
                    value: this.formatEnchantmentEffects(enchantment),
                    inline: false
                }
            ]);

        const proceedButton = new ButtonBuilder()
            .setCustomId(`enchant_proceed_${itemName}_${enchantmentKey}`)
            .setLabel('⚡ Begin Enchanting')
            .setStyle(ButtonStyle.Primary);

        const cancelButton = new ButtonBuilder()
            .setCustomId('enchant_cancel')
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(proceedButton, cancelButton);

        await interaction.editReply({ embeds: [embed], components: [row] });
    },

    async handleAnalyze(interaction, userData) {
        const itemName = interaction.options.getString('item');

        if (!itemName) {
            await interaction.editReply({
                content: '❌ Please specify an item to analyze!',
                ephemeral: true
            });
            return;
        }

        // Check if item exists in inventory
        if (!userData.inventory?.items?.includes(itemName)) {
            await interaction.editReply({
                content: `❌ You don't have **${itemName}** in your inventory.`,
                ephemeral: true
            });
            return;
        }

        // Analyze the item for enchantment compatibility
        const compatibleEnchantments = this.getCompatibleEnchantments(itemName, userData.enchanting.discovered_enchantments);
        const itemType = this.determineItemType(itemName);
        const currentEnchantments = this.getItemEnchantments(itemName, userData);

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🔍 Item Analysis Report')
            .setDescription(`**Analyzing: ${itemName}**\n\n*Magical properties and enchantment compatibility*`)
            .addFields([
                {
                    name: '📊 **Item Properties**',
                    value: `**Type:** ${itemType}\n**Quality:** ${this.getItemQuality(itemName)}\n**Enchantability:** ${this.getEnchantability(itemName)}/100`,
                    inline: true
                },
                {
                    name: '✨ **Current Enchantments**',
                    value: currentEnchantments.length > 0 ? currentEnchantments.join('\n') : 'None',
                    inline: true
                },
                {
                    name: '🎯 **Enchantment Slots**',
                    value: `**Used:** ${currentEnchantments.length}/3\n**Available:** ${3 - currentEnchantments.length}`,
                    inline: true
                }
            ]);

        if (compatibleEnchantments.length > 0) {
            const enchantmentList = compatibleEnchantments.map(key => {
                const enchant = ENCHANTMENTS[key];
                const successRate = this.calculateEnchantmentSuccessRate(enchant, userData);
                return `${enchant.name} (${successRate}% success)`;
            }).join('\n');

            embed.addFields({
                name: '🔮 **Compatible Enchantments**',
                value: enchantmentList,
                inline: false
            });
        } else {
            embed.addFields({
                name: '⚠️ **No Compatible Enchantments**',
                value: 'This item cannot be enchanted with your current knowledge.',
                inline: false
            });
        }

        // Recommendations
        const recommendations = this.getEnchantingRecommendations(itemName, itemType, userData);
        if (recommendations.length > 0) {
            embed.addFields({
                name: '💡 **Recommendations**',
                value: recommendations.join('\n'),
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async showStatistics(interaction, userData) {
        const totalEnchantments = userData.enchanting.successful_enchants + userData.enchanting.failed_enchants;
        const successPercentage = totalEnchantments > 0 ? 
            Math.round((userData.enchanting.successful_enchants / totalEnchantments) * 100) : 0;

        const embed = new EmbedBuilder()
            .setColor('#8A2BE2')
            .setTitle(`🔮 ${interaction.user.displayName}'s Enchanting Mastery`)
            .setDescription('╔══════════════════════════════════════╗\n║        **ENCHANTER STATISTICS**      ║\n╚══════════════════════════════════════╝')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields([
                {
                    name: '📊 **Overall Progress**',
                    value: `**Level:** ${userData.enchanting.level} ⭐\n**Experience:** ${userData.enchanting.experience} XP\n**Next Level:** ${this.getXPToNextLevel(userData.enchanting)} XP\n**Research Points:** ${userData.enchanting.research_points} 🔬`,
                    inline: true
                },
                {
                    name: '🎯 **Success Metrics**',
                    value: `**Success Rate:** ${successPercentage}%\n**Successful:** ${userData.enchanting.successful_enchants} ✅\n**Failed:** ${userData.enchanting.failed_enchants} ❌\n**Total Attempts:** ${totalEnchantments}`,
                    inline: true
                },
                {
                    name: '🔮 **Knowledge Base**',
                    value: `**Discovered:** ${userData.enchanting.discovered_enchantments.length}/${Object.keys(ENCHANTMENTS).length}\n**Table Level:** ${userData.enchanting.enchanting_table_level}\n**Mastery Points:** ${this.getTotalMasteryPoints(userData)}`,
                    inline: true
                }
            ]);

        // Show mastery by enchantment type
        const masteryByType = this.getMasteryByType(userData);
        Object.entries(masteryByType).forEach(([type, data]) => {
            if (data.total > 0) {
                embed.addFields({
                    name: `${this.getTypeEmoji(type)} **${type.charAt(0).toUpperCase() + type.slice(1)} Mastery**`,
                    value: `**Mastery Points:** ${data.total}\n**Enchantments:** ${data.count}\n**Average:** ${Math.round(data.total / data.count)}`,
                    inline: true
                });
            }
        });

        // Achievement tracking
        const achievements = this.getEnchantingAchievements(userData);
        if (achievements.length > 0) {
            embed.addFields({
                name: '🏆 **Recent Achievements**',
                value: achievements.slice(0, 5).join('\n'),
                inline: false
            });
        }

        // Progress to next milestone
        const nextMilestone = this.getNextMilestone(userData);
        if (nextMilestone) {
            embed.addFields({
                name: '🎯 **Next Milestone**',
                value: `**${nextMilestone.name}**\n${nextMilestone.progress}`,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    // Helper methods
    calculateSuccessRate(userData) {
        const baseRate = 60;
        const levelBonus = userData.enchanting.level * 3;
        const experienceBonus = Math.floor(userData.enchanting.experience / 50);
        const tableBonus = userData.enchanting.enchanting_table_level * 2;
        return Math.min(95, baseRate + levelBonus + experienceBonus + tableBonus);
    },

    calculateEnchantmentSuccessRate(enchantment, userData) {
        const baseRate = this.calculateSuccessRate(userData);
        const rarityPenalty = { common: 0, uncommon: -5, rare: -10, epic: -15, legendary: -20, mythic: -25 }[enchantment.rarity] || 0;
        const masteryBonus = (userData.enchanting.mastery_points[enchantment.name] || 0) * 2;
        
        return Math.max(15, Math.min(95, baseRate + rarityPenalty + masteryBonus));
    },

    calculateEnchantingCost(enchantment, level) {
        const baseCost = { common: 100, uncommon: 250, rare: 500, epic: 1000, legendary: 2000, mythic: 5000 }[enchantment.rarity] || 100;
        return Math.floor(baseCost * (1 + level * 0.1));
    },

    formatMaterialsInventory(inventory) {
        const materials = Object.entries(ENCHANTING_MATERIALS)
            .map(([key, material]) => {
                const amount = inventory[key] || 0;
                const emoji = material.name.split(' ')[0];
                return `${emoji} ${amount}`;
            })
            .join(' • ');

        return materials || 'No materials found';
    },

    formatEnchantmentEffects(enchantment) {
        return Object.entries(enchantment.effects)
            .map(([effect, value]) => {
                if (typeof value === 'boolean') {
                    return `**${effect.replace(/_/g, ' ')}:** ${value ? 'Enabled' : 'Disabled'}`;
                } else {
                    return `**${effect.replace(/_/g, ' ')}:** +${Math.round(value * 100)}%`;
                }
            })
            .join('\n');
    },

    groupEnchantmentsByRarity(discoveredEnchantments) {
        const groups = { common: [], uncommon: [], rare: [], epic: [], legendary: [], mythic: [] };
        
        discoveredEnchantments.forEach(key => {
            const enchant = ENCHANTMENTS[key];
            if (enchant && groups[enchant.rarity]) {
                groups[enchant.rarity].push(key);
            }
        });
        
        return groups;
    },

    getRarityColor(rarity) {
        const colors = {
            common: 0x808080,
            uncommon: 0x00FF00,
            rare: 0x0080FF,
            epic: 0x8000FF,
            legendary: 0xFF8000,
            mythic: 0xFF0080
        };
        return colors[rarity] || 0x808080;
    },

    getRarityEmoji(rarity) {
        const emojis = {
            common: '⚪',
            uncommon: '🟢',
            rare: '🔵',
            epic: '🟣',
            legendary: '🟡',
            mythic: '🔴'
        };
        return emojis[rarity] || '⚪';
    },

    getCompatibleEnchantments(itemName, discoveredEnchantments) {
        const itemType = this.determineItemType(itemName);
        
        return discoveredEnchantments.filter(key => {
            const enchant = ENCHANTMENTS[key];
            return enchant.type === 'all' || enchant.type === itemType || 
                   (enchant.type === 'tool' && (itemType === 'weapon' || itemType === 'tool'));
        });
    },

    determineItemType(itemName) {
        const weapons = ['sword', 'axe', 'bow', 'staff', 'dagger', 'mace'];
        const armor = ['helmet', 'chestplate', 'leggings', 'boots', 'shield'];
        const tools = ['pickaxe', 'shovel', 'hoe', 'fishing_rod'];
        
        const lowerName = itemName.toLowerCase();
        
        if (weapons.some(weapon => lowerName.includes(weapon))) return 'weapon';
        if (armor.some(piece => lowerName.includes(piece))) return 'armor';
        if (tools.some(tool => lowerName.includes(tool))) return 'tool';
        
        return 'accessory';
    },

    getItemQuality(itemName) {
        // Mock quality determination - could be enhanced
        const qualities = ['Poor', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
        return qualities[Math.floor(Math.random() * qualities.length)];
    },

    getEnchantability(itemName) {
        // Mock enchantability - could be enhanced based on item properties
        return Math.floor(Math.random() * 40) + 60; // 60-100
    },

    getItemEnchantments(itemName, userData) {
        // Mock current enchantments - would need to be tracked in database
        return []; // Return array of current enchantment names
    },

    getEnchantingRecommendations(itemName, itemType, userData) {
        const recommendations = [];
        const level = userData.enchanting.level;
        
        if (level < 5) {
            recommendations.push('• Start with common enchantments like Sharpness or Protection');
        }
        
        if (itemType === 'weapon') {
            recommendations.push('• Fire Aspect and Lightning Strike work well on weapons');
        }
        
        if (itemType === 'armor') {
            recommendations.push('• Protection and Unbreaking are essential for armor');
        }
        
        return recommendations;
    },

    getXPToNextLevel(enchantingData) {
        const currentLevel = enchantingData.level;
        const requiredXP = currentLevel * 100;
        const currentXP = enchantingData.experience % 100;
        return requiredXP - currentXP;
    },

    getTotalMasteryPoints(userData) {
        if (!userData.enchanting.mastery_points) return 0;
        return Object.values(userData.enchanting.mastery_points).reduce((sum, points) => sum + points, 0);
    },

    getMasteryByType(userData) {
        const mastery = { weapon: { total: 0, count: 0 }, armor: { total: 0, count: 0 }, tool: { total: 0, count: 0 }, all: { total: 0, count: 0 } };
        
        userData.enchanting.discovered_enchantments.forEach(key => {
            const enchant = ENCHANTMENTS[key];
            const points = userData.enchanting.mastery_points[key] || 0;
            
            if (enchant && mastery[enchant.type]) {
                mastery[enchant.type].total += points;
                mastery[enchant.type].count++;
            }
        });
        
        return mastery;
    },

    getTypeEmoji(type) {
        const emojis = { weapon: '⚔️', armor: '🛡️', tool: '🔧', all: '✨', accessory: '💎' };
        return emojis[type] || '📦';
    },

    getEnchantingAchievements(userData) {
        const achievements = [];
        
        if (userData.enchanting.successful_enchants >= 10) {
            achievements.push('🏆 Apprentice Enchanter - 10 successful enchantments');
        }
        
        if (userData.enchanting.level >= 10) {
            achievements.push('⭐ Master Enchanter - Reached level 10');
        }
        
        if (userData.enchanting.discovered_enchantments.length >= 8) {
            achievements.push('📚 Scholar - Discovered 8+ enchantments');
        }
        
        return achievements;
    },

    getNextMilestone(userData) {
        const level = userData.enchanting.level;
        const successfulEnchants = userData.enchanting.successful_enchants;
        
        if (level < 10) {
            return {
                name: 'Master Enchanter',
                progress: `Level ${level}/10`
            };
        }
        
        if (successfulEnchants < 50) {
            return {
                name: 'Enchanting Veteran',
                progress: `${successfulEnchants}/50 successful enchantments`
            };
        }
        
        return null;
    },

    hasCompletedResearch(userData, projectKey) {
        // Mock implementation - would need to track completed research in database
        return false;
    },

    getCompletedResearch(userData) {
        // Mock implementation - would return count of completed research projects
        return 0;
    }
};
