
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../../database.js');

const EXCAVATION_SITES = {
    rocky_hillside: {
        name: '🪨 Rocky Hillside',
        depth: 'Surface',
        minLevel: 1,
        energyCost: 15,
        emoji: '🪨',
        finds: {
            common: ['iron_ore', 'coal', 'small_gems', 'stone'],
            uncommon: ['silver_ore', 'copper_ore', 'quartz'],
            rare: ['gold_ore', 'precious_gems'],
            legendary: ['ancient_coin']
        },
        description: 'Easy surface mining with basic materials',
        color: '#8B7355',
        dangers: ['rockslide', 'cave_in'],
        tools_required: ['basic_pickaxe']
    },
    ancient_quarry: {
        name: '🏛️ Ancient Quarry',
        depth: 'Medium',
        minLevel: 5,
        energyCost: 25,
        emoji: '🏛️',
        finds: {
            common: ['silver_ore', 'crystals', 'fossil_fragments'],
            uncommon: ['gold_ore', 'rare_crystals', 'ancient_pottery'],
            rare: ['precious_metals', 'artifact_fragments'],
            legendary: ['ancient_relic', 'mysterious_tablet']
        },
        description: 'Abandoned quarry with historical artifacts',
        color: '#DAA520',
        dangers: ['unstable_ground', 'ancient_traps'],
        tools_required: ['iron_pickaxe', 'archaeology_kit']
    },
    deep_mine_shafts: {
        name: '⚡ Deep Mine Shafts',
        depth: 'Deep',
        minLevel: 10,
        energyCost: 40,
        emoji: '⚡',
        finds: {
            common: ['gold_ore', 'rare_crystals', 'underground_artifacts'],
            uncommon: ['platinum_ore', 'magical_crystals', 'gemstones'],
            rare: ['mythril_ore', 'enchanted_gems'],
            legendary: ['dragon_scales', 'ancient_treasure']
        },
        description: 'Dangerous deep mining with valuable rewards',
        color: '#4169E1',
        dangers: ['gas_leak', 'equipment_failure', 'underground_creatures'],
        tools_required: ['steel_pickaxe', 'safety_equipment', 'headlamp']
    },
    earths_core: {
        name: '🌋 Earth\'s Core',
        depth: 'Extreme',
        minLevel: 15,
        energyCost: 60,
        emoji: '🌋',
        finds: {
            common: ['mythril', 'dragon_gems', 'ancient_relics'],
            uncommon: ['celestial_crystals', 'elemental_stones'],
            rare: ['core_fragments', 'primordial_essence'],
            legendary: ['world_gem', 'creation_shard', 'eternal_flame']
        },
        description: 'Ultimate excavation site with legendary treasures',
        color: '#FF4500',
        dangers: ['volcanic_eruption', 'extreme_heat', 'elemental_guardians'],
        tools_required: ['masterwork_pickaxe', 'heat_protection', 'magical_ward']
    }
};

const MINING_EQUIPMENT = {
    pickaxes: {
        basic_pickaxe: { name: '⛏️ Basic Pickaxe', cost: 100, durability: 50, efficiency: 1.0, level: 1 },
        iron_pickaxe: { name: '⛏️ Iron Pickaxe', cost: 300, durability: 100, efficiency: 1.3, level: 3 },
        steel_pickaxe: { name: '⛏️ Steel Pickaxe', cost: 800, durability: 200, efficiency: 1.6, level: 7 },
        masterwork_pickaxe: { name: '⛏️ Masterwork Pickaxe', cost: 2000, durability: 500, efficiency: 2.0, level: 12 }
    },
    safety: {
        safety_helmet: { name: '⛑️ Safety Helmet', cost: 150, protection: 'head_injury' },
        safety_equipment: { name: '🦺 Safety Equipment', cost: 400, protection: 'general_danger' },
        heat_protection: { name: '🔥 Heat Protection', cost: 1000, protection: 'extreme_heat' }
    },
    utilities: {
        headlamp: { name: '💡 Headlamp', cost: 200, benefit: 'visibility' },
        archaeology_kit: { name: '🔍 Archaeology Kit', cost: 500, benefit: 'artifact_bonus' },
        magical_ward: { name: '✨ Magical Ward', cost: 1500, benefit: 'magic_protection' }
    }
};

const MINING_ACHIEVEMENTS = {
    first_dig: { name: 'First Steps', description: 'Complete your first excavation', reward: 100 },
    surface_master: { name: 'Surface Master', description: 'Complete 10 surface excavations', reward: 500 },
    deep_explorer: { name: 'Deep Explorer', description: 'Reach the deep mine shafts', reward: 1000 },
    legendary_finder: { name: 'Legendary Finder', description: 'Find a legendary item', reward: 2000 },
    core_runner: { name: 'Core Runner', description: 'Survive the Earth\'s Core', reward: 5000 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('excavate')
        .setDescription('⛏️ Dig deep for precious gems and ancient artifacts')
        .addSubcommand(subcommand =>
            subcommand
                .setName('dig')
                .setDescription('Start excavation at a site')
                .addStringOption(option =>
                    option.setName('site')
                        .setDescription('Excavation site')
                        .setRequired(false)
                        .addChoices(
                            { name: '🪨 Rocky Hillside', value: 'rocky_hillside' },
                            { name: '🏛️ Ancient Quarry', value: 'ancient_quarry' },
                            { name: '⚡ Deep Mine Shafts', value: 'deep_mine_shafts' },
                            { name: '🌋 Earth\'s Core', value: 'earths_core' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sites')
                .setDescription('View all excavation sites'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('equipment')
                .setDescription('Manage mining equipment'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('progress')
                .setDescription('View mining progress and achievements')),
    
    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const userId = interaction.user.id;
            let player = await db.getPlayer(userId) || {};
            
            // Initialize mining data
            if (!player.mining) {
                player.mining = {
                    level: 1,
                    experience: 0,
                    equipment: { pickaxe: 'basic_pickaxe' },
                    discoveries: [],
                    achievements: [],
                    site_progress: {},
                    active_excavation: null
                };
            }

            // Initialize inventory
            if (!player.inventory) {
                player.inventory = { coins: 100, materials: {}, equipment: [] };
            }

            const subcommand = interaction.options.getSubcommand();
            
            switch (subcommand) {
                case 'dig':
                    const site = interaction.options.getString('site');
                    if (site) {
                        await this.startExcavation(interaction, player, site);
                    } else {
                        await this.showExcavationSites(interaction, player);
                    }
                    break;
                case 'sites':
                    await this.showExcavationSites(interaction, player);
                    break;
                case 'equipment':
                    await this.showEquipmentShop(interaction, player);
                    break;
                case 'progress':
                    await this.showMiningProgress(interaction, player);
                    break;
                default:
                    await this.showExcavationSites(interaction, player);
            }
            
        } catch (error) {
            console.error('Excavate command error:', error);
            await interaction.editReply({
                content: '❌ An error occurred during excavation. Please try again.',
                ephemeral: true
            });
        }
    },

    async showExcavationSites(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('⛏️ Excavation Command Center')
            .setDescription('╔═══════════════════════════════════════╗\n║        **EXCAVATION SITES**           ║\n╚═══════════════════════════════════════╝\n\n*Choose your mining destination wisely*')
            .setThumbnail('https://cdn.discordapp.com/emojis/⛏️.png')
            .addFields(
                {
                    name: '⛏️ **Miner Profile**',
                    value: `**Level:** ${player.mining?.level || 1}\n**Experience:** ${player.mining?.experience || 0}\n**Current Pickaxe:** ${this.getEquipmentName(player.mining?.equipment?.pickaxe || 'basic_pickaxe')}\n**Stamina:** ${player.stamina || 100}/100`,
                    inline: true
                },
                {
                    name: '🏆 **Mining Statistics**',
                    value: `**Sites Discovered:** ${Object.keys(player.mining?.site_progress || {}).length}/4\n**Total Excavations:** ${this.getTotalExcavations(player)}\n**Legendary Finds:** ${this.getLegendaryFinds(player)}`,
                    inline: true
                }
            );

        // Add excavation sites
        Object.entries(EXCAVATION_SITES).forEach(([key, site]) => {
            const canAccess = (player.mining?.level || 1) >= site.minLevel;
            const hasTools = this.hasRequiredTools(player, site.tools_required);
            const progress = player.mining?.site_progress?.[key] || { excavations: 0, discoveries: [] };
            
            let statusText = `**Depth:** ${site.depth} | **Min Level:** ${site.minLevel}\n`;
            statusText += `**Energy Cost:** ${site.energyCost} | **Excavations:** ${progress.excavations}\n`;
            statusText += `**Status:** ${canAccess ? (hasTools ? '✅ Ready' : '⚠️ Missing Tools') : '🔒 Locked'}\n`;
            statusText += `**Discoveries:** ${progress.discoveries.length}`;

            embed.addFields({
                name: `${site.emoji} **${site.name}**`,
                value: statusText,
                inline: true
            });
        });

        const siteSelect = new StringSelectMenuBuilder()
            .setCustomId('excavation_site_select')
            .setPlaceholder('⛏️ Select an excavation site')
            .addOptions(
                Object.entries(EXCAVATION_SITES)
                    .filter(([_, site]) => (player.mining?.level || 1) >= site.minLevel)
                    .map(([key, site]) => ({
                        label: site.name,
                        value: key,
                        description: `${site.depth} depth | ${site.energyCost} energy | Level ${site.minLevel}+`,
                        emoji: site.emoji
                    }))
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mining_equipment_shop')
                    .setLabel('Equipment Shop')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🛒'),
                new ButtonBuilder()
                    .setCustomId('mining_achievements')
                    .setLabel('Achievements')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('mining_guide')
                    .setLabel('Mining Guide')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📚'),
                new ButtonBuilder()
                    .setCustomId('expedition_planning')
                    .setLabel('Plan Expedition')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🗺️')
            );

        const components = siteSelect.options.length > 0 ? 
            [new ActionRowBuilder().addComponents(siteSelect), buttons] : [buttons];

        await interaction.editReply({
            embeds: [embed],
            components
        });
    },

    async startExcavation(interaction, player, siteKey) {
        const site = EXCAVATION_SITES[siteKey];
        if (!site) {
            await interaction.editReply({
                content: '❌ Invalid excavation site!',
                ephemeral: true
            });
            return;
        }

        // Check requirements
        if ((player.mining?.level || 1) < site.minLevel) {
            await interaction.editReply({
                content: `❌ You need mining level ${site.minLevel} to access ${site.name}!`,
                ephemeral: true
            });
            return;
        }

        if ((player.stamina || 100) < site.energyCost) {
            await interaction.editReply({
                content: `❌ You need ${site.energyCost} stamina to excavate at ${site.name}!`,
                ephemeral: true
            });
            return;
        }

        if (!this.hasRequiredTools(player, site.tools_required)) {
            await interaction.editReply({
                content: `❌ You need the following tools: ${site.tools_required.join(', ')}`,
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(site.color)
            .setTitle(`${site.emoji} Excavation Planning`)
            .setDescription(`╔═══════════════════════════════════════╗\n║          **${site.name.toUpperCase()}**          ║\n╚═══════════════════════════════════════╝`)
            .addFields(
                {
                    name: '📍 **Site Information**',
                    value: `${site.description}\n\n**Depth:** ${site.depth}\n**Energy Required:** ${site.energyCost}\n**Danger Level:** ${this.getDangerLevel(site.dangers)}`,
                    inline: true
                },
                {
                    name: '🎯 **Potential Finds**',
                    value: `**Common:** ${site.finds.common.join(', ')}\n**Rare:** ${site.finds.rare.join(', ')}\n**Legendary:** ${site.finds.legendary.join(', ')}`,
                    inline: true
                },
                {
                    name: '⚠️ **Known Dangers**',
                    value: site.dangers.map(danger => `• ${danger.replace(/_/g, ' ')}`).join('\n'),
                    inline: true
                }
            )
            .setFooter({ text: `Your current stamina: ${player.stamina || 100}/100` });

        const excavationMethods = new StringSelectMenuBuilder()
            .setCustomId(`excavation_method_${siteKey}`)
            .setPlaceholder('⛏️ Choose your excavation method')
            .addOptions([
                {
                    label: 'Careful Excavation',
                    value: 'careful',
                    description: '75% success rate, lower rewards, minimal risk',
                    emoji: '🕐'
                },
                {
                    label: 'Standard Digging',
                    value: 'standard',
                    description: '60% success rate, normal rewards, moderate risk',
                    emoji: '⛏️'
                },
                {
                    label: 'Aggressive Mining',
                    value: 'aggressive',
                    description: '45% success rate, higher rewards, increased risk',
                    emoji: '💥'
                },
                {
                    label: 'Precision Extraction',
                    value: 'precision',
                    description: '90% success rate, focus on artifacts, requires special tools',
                    emoji: '🔍'
                }
            ]);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`quick_excavate_${siteKey}`)
                    .setLabel('Quick Excavation')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚡'),
                new ButtonBuilder()
                    .setCustomId('excavation_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId(`site_info_${siteKey}`)
                    .setLabel('Detailed Info')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(excavationMethods), buttons]
        });
    },

    async showEquipmentShop(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#CD853F')
            .setTitle('🛒 Mining Equipment Shop')
            .setDescription('╔═══════════════════════════════════════╗\n║         **EQUIPMENT CATALOG**         ║\n╚═══════════════════════════════════════╝')
            .addFields({
                name: '💰 **Your Balance**',
                value: `${(player.inventory?.coins || 0).toLocaleString()} coins`,
                inline: true
            });

        // Add equipment categories
        Object.entries(MINING_EQUIPMENT).forEach(([category, items]) => {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            const itemsList = Object.entries(items)
                .map(([key, item]) => {
                    const owned = this.hasEquipment(player, key);
                    const status = owned ? '✅' : '💰';
                    return `${status} **${item.name}** - ${item.cost} coins`;
                })
                .join('\n');

            embed.addFields({
                name: `🔧 **${categoryName}**`,
                value: itemsList,
                inline: true
            });
        });

        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('equipment_category_select')
            .setPlaceholder('🔧 Select equipment category')
            .addOptions([
                {
                    label: 'Pickaxes',
                    value: 'pickaxes',
                    description: 'Essential digging tools',
                    emoji: '⛏️'
                },
                {
                    label: 'Safety Equipment',
                    value: 'safety',
                    description: 'Protection gear for dangerous sites',
                    emoji: '🦺'
                },
                {
                    label: 'Utility Tools',
                    value: 'utilities',
                    description: 'Specialized mining accessories',
                    emoji: '🔧'
                }
            ]);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('equipment_upgrade')
                    .setLabel('Upgrade Equipment')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⬆️'),
                new ButtonBuilder()
                    .setCustomId('equipment_repair')
                    .setLabel('Repair Services')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔨'),
                new ButtonBuilder()
                    .setCustomId('equipment_insurance')
                    .setLabel('Equipment Insurance')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🛡️')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(categorySelect), buttons]
        });
    },

    async showMiningProgress(interaction, player) {
        const miningData = player.mining || {};
        const level = miningData.level || 1;
        const experience = miningData.experience || 0;
        const nextLevelXP = level * 1000;

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('📊 Mining Progress & Achievements')
            .setDescription('╔═══════════════════════════════════════╗\n║         **MINING STATISTICS**         ║\n╚═══════════════════════════════════════╝')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                {
                    name: '⛏️ **Miner Profile**',
                    value: `**Level:** ${level}\n**Experience:** ${experience.toLocaleString()}/${nextLevelXP.toLocaleString()}\n**Progress:** ${this.getProgressBar(experience, nextLevelXP)}`,
                    inline: false
                },
                {
                    name: '🏆 **Achievements**',
                    value: this.getAchievementsList(player),
                    inline: true
                },
                {
                    name: '💎 **Discovery Log**',
                    value: this.getDiscoveryLog(player),
                    inline: true
                }
            );

        // Site progress
        Object.entries(EXCAVATION_SITES).forEach(([key, site]) => {
            const progress = miningData.site_progress?.[key] || { excavations: 0, discoveries: [] };
            const accessibility = (level >= site.minLevel) ? '✅' : '🔒';
            
            embed.addFields({
                name: `${accessibility} ${site.emoji} ${site.name}`,
                value: `**Excavations:** ${progress.excavations}\n**Unique Finds:** ${progress.discoveries.length}\n**Mastery:** ${this.getSiteMastery(progress.excavations)}%`,
                inline: true
            });
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mining_statistics_detailed')
                    .setLabel('Detailed Statistics')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📈'),
                new ButtonBuilder()
                    .setCustomId('mining_leaderboard')
                    .setLabel('Global Leaderboard')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('mining_goals')
                    .setLabel('Set Goals')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎯')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });
    },

    // Helper methods
    getEquipmentName(equipmentKey) {
        for (const category of Object.values(MINING_EQUIPMENT)) {
            if (category[equipmentKey]) {
                return category[equipmentKey].name;
            }
        }
        return equipmentKey;
    },

    hasRequiredTools(player, requiredTools) {
        const equipment = player.mining?.equipment || {};
        const inventory = player.inventory?.equipment || [];
        
        return requiredTools.every(tool => 
            equipment[tool] || inventory.some(item => item.id === tool)
        );
    },

    hasEquipment(player, equipmentKey) {
        const equipment = player.mining?.equipment || {};
        const inventory = player.inventory?.equipment || [];
        
        return equipment[equipmentKey] || inventory.some(item => item.id === equipmentKey);
    },

    getDangerLevel(dangers) {
        const level = dangers.length;
        if (level <= 1) return '🟢 Low';
        if (level <= 2) return '🟡 Medium';
        if (level <= 3) return '🟠 High';
        return '🔴 Extreme';
    },

    getTotalExcavations(player) {
        const siteProgress = player.mining?.site_progress || {};
        return Object.values(siteProgress).reduce((total, progress) => total + (progress.excavations || 0), 0);
    },

    getLegendaryFinds(player) {
        const discoveries = player.mining?.discoveries || [];
        return discoveries.filter(item => item.rarity === 'legendary').length;
    },

    getProgressBar(current, max) {
        const percentage = Math.floor((current / max) * 20);
        const filled = '█'.repeat(percentage);
        const empty = '░'.repeat(20 - percentage);
        return `${filled}${empty} ${Math.floor((current / max) * 100)}%`;
    },

    getAchievementsList(player) {
        const achievements = player.mining?.achievements || [];
        if (achievements.length === 0) return 'No achievements yet';
        
        return achievements.slice(0, 5).map(achievement => 
            `🏅 ${MINING_ACHIEVEMENTS[achievement]?.name || achievement}`
        ).join('\n');
    },

    getDiscoveryLog(player) {
        const discoveries = player.mining?.discoveries || [];
        if (discoveries.length === 0) return 'No discoveries yet';
        
        return discoveries.slice(-5).map(discovery => 
            `💎 ${discovery.name || discovery}`
        ).join('\n');
    },

    getSiteMastery(excavations) {
        return Math.min(100, Math.floor(excavations * 2));
    }
};
