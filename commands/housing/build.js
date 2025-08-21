
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../../database.js');

const BUILDING_TYPES = {
    house: {
        name: '🏠 Cozy Cottage',
        description: 'A warm and inviting starter home for adventurers',
        cost: { wood: 50, stone: 30, nails: 20, coins: 1000 },
        build_time: 300000, // 5 minutes
        capacity: { storage: 100, residents: 2, rooms: 4 },
        unlocks: ['bedroom', 'kitchen', 'living_room'],
        bonuses: { comfort: 5, rest_bonus: 0.1 }
    },
    mansion: {
        name: '🏰 Grand Estate',
        description: 'A luxurious mansion showcasing your wealth and status',
        cost: { wood: 200, marble: 100, gold_ingot: 50, coins: 15000 },
        build_time: 1800000, // 30 minutes
        capacity: { storage: 500, residents: 10, rooms: 12 },
        unlocks: ['library', 'treasury', 'ballroom', 'wine_cellar'],
        requires: 'house',
        bonuses: { prestige: 50, income_bonus: 0.15 }
    },
    workshop: {
        name: '🔨 Master Workshop',
        description: 'A fully equipped crafting facility for creating masterpieces',
        cost: { wood: 75, iron_ingot: 40, tools: 15, coins: 3500 },
        build_time: 900000, // 15 minutes
        capacity: { workbenches: 5, storage: 200 },
        unlocks: ['forge', 'enchanting_table', 'alchemy_station'],
        bonuses: { crafting_bonus: 0.25, quality_bonus: 0.15 }
    },
    warehouse: {
        name: '📦 Storage Complex',
        description: 'Massive storage facility for your growing collection',
        cost: { wood: 100, stone: 150, steel_beams: 25, coins: 7500 },
        build_time: 1200000, // 20 minutes
        capacity: { storage: 2000, organization: 10 },
        unlocks: ['sorting_system', 'security_vault', 'climate_control'],
        bonuses: { storage_efficiency: 0.3, item_preservation: 0.2 }
    },
    garden: {
        name: '🌺 Botanical Paradise',
        description: 'A serene sanctuary for growing rare plants and herbs',
        cost: { seeds: 50, fertile_soil: 100, water_crystals: 25, coins: 2500 },
        build_time: 600000, // 10 minutes
        capacity: { plant_slots: 30, greenhouse_space: 10 },
        unlocks: ['greenhouse', 'herb_garden', 'magical_grove'],
        bonuses: { growth_bonus: 0.40, harvest_quality: 0.25 }
    },
    stable: {
        name: '🐎 Premier Stables',
        description: 'Luxurious accommodations for mounts and magical creatures',
        cost: { wood: 80, hay: 60, horseshoes: 15, coins: 4000 },
        build_time: 1080000, // 18 minutes
        capacity: { mount_slots: 8, care_facilities: 5 },
        unlocks: ['training_ground', 'breeding_pen', 'medical_bay'],
        bonuses: { mount_care: 0.30, training_speed: 0.20 }
    },
    tower: {
        name: '🗼 Mystic Tower',
        description: 'A towering spire dedicated to magical research and study',
        cost: { stone: 200, crystal: 75, mithril: 25, coins: 20000 },
        build_time: 2400000, // 40 minutes
        capacity: { laboratories: 3, library_floors: 5, storage: 300 },
        unlocks: ['observatory', 'portal_room', 'elemental_chamber'],
        requires: 'house',
        bonuses: { magic_power: 0.35, research_speed: 0.25 }
    }
};

const ROOM_UPGRADES = {
    bedroom: {
        name: '🛏️ Master Suite',
        description: 'Luxurious bedroom that provides exceptional rest and comfort',
        cost: { wood: 25, silk: 15, gold: 10, coins: 750 },
        effects: { health_regen: 0.20, comfort: 15, rest_quality: 0.25 }
    },
    kitchen: {
        name: '👨‍🍳 Gourmet Kitchen',
        description: 'Professional-grade kitchen for culinary excellence',
        cost: { iron_ingot: 20, wood: 15, spices: 10, coins: 1200 },
        effects: { cooking_bonus: 0.25, food_quality: 0.30, storage: 75 }
    },
    library: {
        name: '📚 Grand Library',
        description: 'Vast collection of knowledge that accelerates learning',
        cost: { paper: 100, ink: 25, wood: 50, coins: 2500 },
        effects: { exp_bonus: 0.15, research_speed: 0.35, wisdom: 10 }
    },
    forge: {
        name: '⚒️ Legendary Forge',
        description: 'Master-crafted forge capable of creating legendary items',
        cost: { steel_ingot: 40, coal: 75, fire_gems: 15, coins: 4000 },
        effects: { crafting_quality: 0.40, weapon_bonus: 0.25, efficiency: 0.20 }
    },
    treasury: {
        name: '💰 Secure Vault',
        description: 'Impenetrable treasury for your most valuable possessions',
        cost: { steel_ingot: 50, gems: 30, locks: 20, coins: 8000 },
        effects: { security: 0.99, passive_income: 150, insurance: 0.5 }
    },
    greenhouse: {
        name: '🌿 Climate Greenhouse',
        description: 'Advanced growing facility with perfect environmental control',
        cost: { glass: 50, pipes: 25, crystals: 20, coins: 3500 },
        effects: { growth_rate: 0.50, crop_quality: 0.35, year_round: true }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('build')
        .setDescription('🏗️ Construct and upgrade buildings on your property')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of building to construct')
                .setRequired(false)
                .addChoices(
                    { name: '🏠 Cozy Cottage', value: 'house' },
                    { name: '🏰 Grand Estate', value: 'mansion' },
                    { name: '🔨 Master Workshop', value: 'workshop' },
                    { name: '📦 Storage Complex', value: 'warehouse' },
                    { name: '🌺 Botanical Paradise', value: 'garden' },
                    { name: '🐎 Premier Stables', value: 'stable' },
                    { name: '🗼 Mystic Tower', value: 'tower' }
                ))
        .addStringOption(option =>
            option.setName('room')
                .setDescription('Room or upgrade to add')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('rush')
                .setDescription('Rush construction for double cost but instant completion')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const userId = interaction.user.id;
            let userData = await db.getUserData(userId) || {};
            
            // Initialize building data
            if (!userData.buildings) {
                userData.buildings = {
                    owned: {},
                    under_construction: {},
                    rooms: {},
                    total_built: 0,
                    construction_level: 1,
                    blueprints: [],
                    achievements: [],
                    prestige: 0
                };
            }

            // Initialize inventory if needed
            if (!userData.inventory) {
                userData.inventory = {};
            }

            const buildingType = interaction.options.getString('type');
            const roomType = interaction.options.getString('room');
            const rushBuild = interaction.options.getBoolean('rush') || false;
            
            if (!buildingType && !roomType) {
                await this.showBuildingHub(interaction, userData);
            } else if (buildingType) {
                await this.startConstruction(interaction, userData, buildingType, rushBuild);
            } else if (roomType) {
                await this.buildRoom(interaction, userData, roomType);
            }
            
        } catch (error) {
            console.error('Building command error:', error);
            await interaction.editReply({
                embeds: [this.createErrorEmbed('🚫 Construction Error', 'An unexpected error occurred during construction. Please try again.')],
                ephemeral: true
            });
        }
    },

    async showBuildingHub(interaction, userData) {
        // Check for completed constructions
        const completed = await this.checkConstructionProgress(userData);
        if (completed.length > 0) {
            await db.updateUser(interaction.user.id, userData);
        }
        
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('🏗️ Master Builder\'s Headquarters')
            .setDescription('╔═══════════════════════════════════════╗\n║        **Construction Command Center**        ║\n║       *Design Your Dream Property*       ║\n╚═══════════════════════════════════════════╝\n\n🎯 *Transform your vision into architectural reality*')
            .addFields(
                {
                    name: '🏘️ **Your Estate Portfolio**',
                    value: this.formatOwnedBuildings(userData.buildings.owned),
                    inline: true
                },
                {
                    name: '⚒️ **Builder Statistics**',
                    value: `**🏗️ Construction Level:** ${userData.buildings.construction_level}\n**🏆 Total Built:** ${userData.buildings.total_built}\n**🔥 Active Projects:** ${Object.keys(userData.buildings.under_construction).length}\n**⭐ Prestige:** ${userData.buildings.prestige}`,
                    inline: true
                },
                {
                    name: '💰 **Available Resources**',
                    value: this.formatBuildingResources(userData.inventory || {}),
                    inline: true
                }
            );

        // Show construction progress if any
        if (Object.keys(userData.buildings.under_construction).length > 0) {
            const constructionStatus = Object.entries(userData.buildings.under_construction)
                .map(([building, data]) => {
                    const remaining = Math.max(0, data.completion_time - Date.now());
                    const remainingMinutes = Math.ceil(remaining / 60000);
                    const progress = Math.max(0, 100 - (remaining / data.total_time * 100));
                    const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
                    return `🏗️ **${BUILDING_TYPES[building].name}**\n\`${progressBar}\` ${progress.toFixed(1)}%\n⏰ ${remainingMinutes}m remaining`;
                })
                .join('\n\n');

            embed.addFields({
                name: '🚧 **Construction Progress**',
                value: constructionStatus,
                inline: false
            });
        }

        // Add achievements if any
        if (userData.buildings.achievements?.length > 0) {
            embed.addFields({
                name: '🏆 **Construction Achievements**',
                value: userData.buildings.achievements.slice(-3).map(a => `🎖️ ${a}`).join('\n'),
                inline: false
            });
        }

        const buildingSelect = new StringSelectMenuBuilder()
            .setCustomId('building_select')
            .setPlaceholder('🏗️ Choose a building to construct...')
            .addOptions(
                Object.entries(BUILDING_TYPES).map(([key, building]) => {
                    const canBuild = this.canBuild(userData, key);
                    const owned = userData.buildings.owned[key] ? ' ✅' : '';
                    return {
                        label: building.name + owned,
                        value: key,
                        description: `${this.formatCostShort(building.cost)} | ${canBuild ? 'Available' : 'Requirements not met'}`,
                        emoji: building.name.split(' ')[0]
                    };
                })
            );

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('building_rooms')
                    .setLabel('Room Designer')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🚪'),
                new ButtonBuilder()
                    .setCustomId('building_blueprints')
                    .setLabel('Blueprints')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📐'),
                new ButtonBuilder()
                    .setCustomId('building_market')
                    .setLabel('Material Market')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏪'),
                new ButtonBuilder()
                    .setCustomId('building_showcase')
                    .setLabel('Property Tour')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🎪')
            );

        const selectRow = new ActionRowBuilder().addComponents(buildingSelect);

        await interaction.editReply({
            embeds: [embed],
            components: [selectRow, actionButtons]
        });

        await this.setupBuildingCollector(interaction, userData);
    },

    async startConstruction(interaction, userData, buildingType, rushBuild) {
        const building = BUILDING_TYPES[buildingType];
        
        if (!building) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('❌ Invalid Selection', 'The selected building type doesn\'t exist.')],
                ephemeral: true
            });
        }

        // Check if already owned
        if (userData.buildings.owned[buildingType]) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('🏠 Already Owned', `You already own a ${building.name}!\n\n💡 *Consider upgrading it or building additional rooms.*`)],
                ephemeral: true
            });
        }

        // Check if already under construction
        if (userData.buildings.under_construction[buildingType]) {
            const remaining = Math.max(0, userData.buildings.under_construction[buildingType].completion_time - Date.now());
            const remainingMinutes = Math.ceil(remaining / 60000);
            
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('⏳ Construction in Progress', `${building.name} is already under construction!\n\n🕒 **Completion:** ${remainingMinutes} minutes remaining\n💡 *Use rush mode to complete instantly for extra cost.*`)],
                ephemeral: true
            });
        }

        // Check requirements
        if (building.requires && !userData.buildings.owned[building.requires]) {
            return await interaction.editReply({
                embeds: [this.createErrorEmbed('🚫 Prerequisites Missing', `You need to own a **${BUILDING_TYPES[building.requires].name}** first!\n\n📋 *Build the required structure before proceeding.*`)],
                ephemeral: true
            });
        }

        // Check materials and cost
        const canAfford = Object.entries(building.cost).every(([material, amount]) => {
            if (material === 'coins') {
                return (userData.coins || 0) >= amount;
            }
            return (userData.inventory[material] || 0) >= amount;
        });

        if (!canAfford) {
            const missingItems = Object.entries(building.cost)
                .filter(([material, amount]) => {
                    if (material === 'coins') {
                        return (userData.coins || 0) < amount;
                    }
                    return (userData.inventory[material] || 0) < amount;
                })
                .map(([material, amount]) => {
                    const have = material === 'coins' ? (userData.coins || 0) : (userData.inventory[material] || 0);
                    return `• **${material}:** ${have}/${amount} ${amount > have ? '❌' : '✅'}`;
                })
                .join('\n');

            return await interaction.editReply({
                embeds: [this.createResourceEmbed(building, missingItems)],
                ephemeral: true
            });
        }

        // Calculate costs and time
        let totalCost = { ...building.cost };
        let buildTime = building.build_time;
        let rushCost = 0;

        if (rushBuild) {
            rushCost = Object.entries(building.cost).reduce((total, [material, amount]) => {
                return total + (material === 'coins' ? amount : amount * 10);
            }, 0);
            buildTime = 0;
        }

        const embed = new EmbedBuilder()
            .setColor('#FF8C00')
            .setTitle(`🏗️ ${building.name} Construction`)
            .setDescription(`╔══════════════════════════════════════╗\n║        **Construction Planning**        ║\n╚══════════════════════════════════════╝\n\n${building.description}`)
            .addFields(
                {
                    name: '📋 **Project Details**',
                    value: `**🏗️ Building:** ${building.name}\n**⏱️ Construction Time:** ${rushBuild ? 'Instant' : this.formatTime(buildTime)}\n**🎯 Difficulty:** ${this.getBuildingDifficulty(buildingType)}`,
                    inline: true
                },
                {
                    name: '💰 **Resource Cost**',
                    value: Object.entries(building.cost)
                        .map(([material, amount]) => `• ${material}: ${amount}`)
                        .join('\n') + (rushBuild ? `\n\n**💎 Rush Cost:** ${rushCost} coins` : ''),
                    inline: true
                },
                {
                    name: '🎁 **Upon Completion**',
                    value: `**📦 Storage:** +${building.capacity.storage || 0}\n**🏠 Capacity:** ${building.capacity.residents || 'N/A'} residents\n**🔓 Unlocks:** ${building.unlocks?.join(', ') || 'Various features'}`,
                    inline: true
                },
                {
                    name: '⭐ **Building Bonuses**',
                    value: Object.entries(building.bonuses || {})
                        .map(([bonus, value]) => `• ${bonus.replace('_', ' ')}: +${typeof value === 'number' && value < 1 ? Math.round(value * 100) + '%' : value}`)
                        .join('\n') || 'No special bonuses',
                    inline: false
                }
            )
            .setFooter({ text: rushBuild ? '⚡ Rush construction will complete instantly!' : '🕒 Check back when construction is complete' })
            .setTimestamp();

        const confirmButton = new ButtonBuilder()
            .setCustomId(`build_confirm_${buildingType}_${rushBuild}`)
            .setLabel(rushBuild ? 'Rush Build' : 'Start Construction')
            .setStyle(rushBuild ? ButtonStyle.Danger : ButtonStyle.Primary)
            .setEmoji(rushBuild ? '⚡' : '🏗️');

        const customizeButton = new ButtonBuilder()
            .setCustomId(`build_customize_${buildingType}`)
            .setLabel('Customize Design')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🎨');

        const cancelButton = new ButtonBuilder()
            .setCustomId('build_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌');

        const row = new ActionRowBuilder()
            .addComponents(confirmButton, customizeButton, cancelButton);

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });

        await this.setupConstructionCollector(interaction, userData, buildingType, rushBuild, rushCost);
    },

    async setupBuildingCollector(interaction, userData) {
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

        collector.on('collect', async i => {
            await i.deferUpdate();

            try {
                const customId = i.customId;
                const values = i.values;

                if (customId === 'building_select' && values && values.length > 0) {
                    await this.startConstruction(i, userData, values[0], false);
                } else if (customId === 'building_rooms') {
                    await this.showRoomDesigner(i, userData);
                } else if (customId === 'building_blueprints') {
                    await this.showBlueprints(i, userData);
                } else if (customId === 'building_market') {
                    await this.showMaterialMarket(i, userData);
                } else if (customId === 'building_showcase') {
                    await this.showPropertyTour(i, userData);
                }
            } catch (error) {
                console.error('Collector error:', error);
                await i.editReply({
                    embeds: [this.createErrorEmbed('⚠️ Processing Error', 'Something went wrong. Please try again.')],
                    components: []
                });
            }
        });

        collector.on('end', () => {
            // Collector cleanup
        });
    },

    async setupConstructionCollector(interaction, userData, buildingType, rushBuild, rushCost) {
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            await i.deferUpdate();

            if (i.customId === 'build_cancel') {
                await i.editReply({
                    embeds: [this.createErrorEmbed('❌ Construction Cancelled', 'Construction project has been cancelled.')],
                    components: []
                });
                return;
            }

            if (i.customId.startsWith('build_confirm_')) {
                await this.executeConstruction(i, userData, buildingType, rushBuild, rushCost);
            } else if (i.customId.startsWith('build_customize_')) {
                await this.showCustomization(i, userData, buildingType);
            }
        });
    },

    async executeConstruction(interaction, userData, buildingType, rushBuild, rushCost) {
        const building = BUILDING_TYPES[buildingType];
        const currentTime = Date.now();

        // Consume materials
        Object.entries(building.cost).forEach(([material, amount]) => {
            if (material === 'coins') {
                userData.coins = (userData.coins || 0) - amount;
            } else {
                userData.inventory[material] = (userData.inventory[material] || 0) - amount;
            }
        });

        if (rushBuild) {
            userData.coins = (userData.coins || 0) - rushCost;
            // Instant completion
            userData.buildings.owned[buildingType] = {
                built_at: currentTime,
                level: 1,
                condition: 100,
                rush_built: true,
                customizations: []
            };
            userData.buildings.total_built++;
        } else {
            // Start construction
            userData.buildings.under_construction[buildingType] = {
                started_at: currentTime,
                completion_time: currentTime + building.build_time,
                total_time: building.build_time,
                progress: 0
            };
        }

        await db.updateUser(interaction.user.id, userData);

        if (rushBuild) {
            const completionEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🎉 Construction Complete!')
                .setDescription(`╔══════════════════════════════════════╗\n║        **${building.name} Ready!**        ║\n╚══════════════════════════════════════╝\n\n✨ *Your new building is ready for use!*`)
                .addFields(
                    {
                        name: '🏗️ **Project Summary**',
                        value: `**Building:** ${building.name}\n**Completion:** Instant (Rush Built)\n**Status:** Fully Operational`,
                        inline: true
                    },
                    {
                        name: '🎁 **New Features Unlocked**',
                        value: `**Storage:** +${building.capacity.storage}\n**Rooms Available:** ${building.unlocks?.join(', ')}\n**Special Bonuses:** Active`,
                        inline: true
                    },
                    {
                        name: '🚀 **Next Steps**',
                        value: '• Add rooms and decorations\n• Explore new building options\n• Upgrade existing structures\n• Show off your property!',
                        inline: false
                    }
                )
                .setFooter({ text: '🎊 Congratulations on your new building!' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [completionEmbed],
                components: []
            });
        } else {
            const constructionEmbed = new EmbedBuilder()
                .setColor('#FF8C00')
                .setTitle('🏗️ Construction Started!')
                .setDescription(`╔══════════════════════════════════════╗\n║        **Building in Progress**        ║\n╚══════════════════════════════════════╝\n\n⚒️ *Construction crews are hard at work!*`)
                .addFields(
                    {
                        name: '⏱️ **Timeline**',
                        value: `**Started:** <t:${Math.floor(currentTime / 1000)}:R>\n**Duration:** ${this.formatTime(building.build_time)}\n**Completion:** <t:${Math.floor((currentTime + building.build_time) / 1000)}:R>`,
                        inline: true
                    },
                    {
                        name: '📋 **Resources Used**',
                        value: Object.entries(building.cost)
                            .map(([material, amount]) => `• ${material}: ${amount}`)
                            .join('\n'),
                        inline: true
                    },
                    {
                        name: '💡 **Pro Tips**',
                        value: '• Check progress with `/build`\n• Gather materials for rooms\n• Plan your next construction\n• Rush build option available',
                        inline: false
                    }
                )
                .setFooter({ text: '⚡ Tip: Use rush building to complete instantly for extra cost' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [constructionEmbed],
                components: []
            });
        }
    },

    async checkConstructionProgress(userData) {
        const now = Date.now();
        const completed = [];

        Object.entries(userData.buildings.under_construction).forEach(([buildingType, data]) => {
            if (now >= data.completion_time) {
                completed.push(buildingType);
            }
        });

        // Move completed buildings to owned
        completed.forEach(buildingType => {
            userData.buildings.owned[buildingType] = {
                built_at: Date.now(),
                level: 1,
                condition: 100,
                rush_built: false
            };
            delete userData.buildings.under_construction[buildingType];
            userData.buildings.total_built++;

            // Add achievement
            if (!userData.buildings.achievements) userData.buildings.achievements = [];
            userData.buildings.achievements.push(`Built ${BUILDING_TYPES[buildingType].name}`);
        });

        return completed;
    },

    // Utility Functions
    createErrorEmbed(title, description) {
        return new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    },

    createResourceEmbed(building, missingItems) {
        return new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('💰 Insufficient Resources')
            .setDescription(`╔══════════════════════════════════════╗\n║        **Resource Requirements**        ║\n╚══════════════════════════════════════╝\n\nYou need more materials for **${building.name}**`)
            .addFields(
                {
                    name: '❌ **Missing Resources**',
                    value: missingItems,
                    inline: false
                },
                {
                    name: '💡 **How to Obtain Materials**',
                    value: '• 🗿 **Stone/Wood:** Mining & Exploration\n• 🔧 **Tools/Nails:** Blacksmith crafting\n• 💎 **Gems/Gold:** Treasure hunting\n• 🏪 **All Materials:** Trading Post',
                    inline: false
                }
            )
            .setFooter({ text: '💡 Visit the Material Market for current prices' })
            .setTimestamp();
    },

    formatOwnedBuildings(owned) {
        if (Object.keys(owned).length === 0) {
            return '🏚️ No buildings owned yet\n\n*Start with a cozy cottage!*';
        }

        return Object.entries(owned)
            .map(([type, data]) => {
                const building = BUILDING_TYPES[type];
                const condition = data.condition >= 80 ? '🟢' : data.condition >= 50 ? '🟡' : '🔴';
                return `${building.name} ${condition}\n├ Level ${data.level} | Built <t:${Math.floor(data.built_at / 1000)}:R>\n└ Condition: ${data.condition}%`;
            })
            .join('\n\n');
    },

    formatBuildingResources(inventory) {
        const resources = ['wood', 'stone', 'iron_ingot', 'steel_ingot', 'nails', 'tools', 'glass', 'marble'];
        const resourceList = resources
            .map(resource => {
                const amount = inventory[resource] || 0;
                const emoji = amount > 50 ? '🟢' : amount > 10 ? '🟡' : '🔴';
                return `${emoji} ${resource}: ${amount}`;
            })
            .join('\n');

        return resourceList || '📦 No building resources';
    },

    formatCost(cost) {
        return Object.entries(cost)
            .map(([material, amount]) => `${material}: ${amount}`)
            .join(', ');
    },

    formatCostShort(cost) {
        const items = Object.keys(cost).length;
        const totalCoins = cost.coins || 0;
        return `${items} materials, ${totalCoins} coins`;
    },

    formatTime(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m`;
    },

    getBuildingDifficulty(buildingType) {
        const difficulties = {
            house: 'Beginner',
            workshop: 'Easy',
            garden: 'Easy',
            stable: 'Intermediate',
            warehouse: 'Intermediate',
            mansion: 'Advanced',
            tower: 'Master'
        };
        return difficulties[buildingType] || 'Intermediate';
    },

    canBuild(userData, buildingType) {
        const building = BUILDING_TYPES[buildingType];
        
        // Check if already owned
        if (userData.buildings.owned[buildingType]) return false;
        
        // Check requirements
        if (building.requires && !userData.buildings.owned[building.requires]) return false;
        
        return true;
    },

    async showRoomDesigner(interaction, userData) {
        // Room designer implementation would go here
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#8B4513')
                .setTitle('🚪 Room Designer')
                .setDescription('Room customization coming soon!')],
            components: []
        });
    },

    async showBlueprints(interaction, userData) {
        // Blueprints implementation would go here
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#4169E1')
                .setTitle('📐 Building Blueprints')
                .setDescription('Advanced blueprints coming soon!')],
            components: []
        });
    },

    async showMaterialMarket(interaction, userData) {
        // Material market implementation would go here
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#32CD32')
                .setTitle('🏪 Material Market')
                .setDescription('Trading post coming soon!')],
            components: []
        });
    },

    async showPropertyTour(interaction, userData) {
        // Property showcase implementation would go here
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎪 Property Showcase')
                .setDescription('Virtual tours coming soon!')],
            components: []
        });
    }
};
