
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const magicalPlants = {
    rose_of_life: {
        name: 'Rose of Life',
        emoji: '🌹',
        growthTime: 7200000, // 2 hours
        waterNeeded: 5,
        seedCost: 200,
        rarity: 'rare',
        effect: 'healing',
        baseYield: { min: 1, max: 3 },
        sellPrice: 150,
        experience: 100,
        level: 10,
        description: 'A mystical rose that can heal wounds and restore vitality'
    },
    golden_apple: {
        name: 'Golden Apple Tree',
        emoji: '🍎',
        growthTime: 14400000, // 4 hours
        waterNeeded: 8,
        seedCost: 500,
        rarity: 'legendary',
        effect: 'wisdom',
        baseYield: { min: 1, max: 2 },
        sellPrice: 400,
        experience: 200,
        level: 15,
        description: 'Grants wisdom and knowledge to those who consume its fruit'
    },
    mana_herb: {
        name: 'Mana Herb',
        emoji: '🌿',
        growthTime: 5400000, // 1.5 hours
        waterNeeded: 4,
        seedCost: 150,
        rarity: 'uncommon',
        effect: 'mana',
        baseYield: { min: 2, max: 5 },
        sellPrice: 80,
        experience: 75,
        level: 8,
        description: 'Restores magical energy and enhances spell casting'
    },
    mystic_mushroom: {
        name: 'Mystic Mushroom',
        emoji: '🍄',
        growthTime: 10800000, // 3 hours
        waterNeeded: 6,
        seedCost: 300,
        rarity: 'rare',
        effect: 'vision',
        baseYield: { min: 1, max: 4 },
        sellPrice: 200,
        experience: 120,
        level: 12,
        description: 'Provides mystical visions and enhances perception'
    },
    dream_flower: {
        name: 'Dream Flower',
        emoji: '🌺',
        growthTime: 18000000, // 5 hours
        waterNeeded: 7,
        seedCost: 400,
        rarity: 'epic',
        effect: 'dreams',
        baseYield: { min: 1, max: 2 },
        sellPrice: 350,
        experience: 180,
        level: 18,
        description: 'Influences dreams and can reveal hidden truths'
    },
    phoenix_feather_fern: {
        name: 'Phoenix Feather Fern',
        emoji: '🔥',
        growthTime: 21600000, // 6 hours
        waterNeeded: 10,
        seedCost: 800,
        rarity: 'legendary',
        effect: 'rebirth',
        baseYield: { min: 1, max: 1 },
        sellPrice: 1000,
        experience: 300,
        level: 25,
        description: 'Rare fern that grants the power of resurrection'
    }
};

const gardenUpgrades = {
    greenhouse: {
        name: 'Enchanted Greenhouse',
        cost: 2000,
        effect: 'weather_protection',
        description: 'Protects plants from bad weather (+20% growth speed)'
    },
    magical_sprinkler: {
        name: 'Magical Sprinkler System',
        cost: 1500,
        effect: 'auto_water',
        description: 'Automatically waters plants every hour'
    },
    fertility_circle: {
        name: 'Fertility Circle',
        cost: 3000,
        effect: 'yield_boost',
        description: 'Increases plant yield by 50%'
    },
    moonwell: {
        name: 'Moonwell',
        cost: 5000,
        effect: 'night_growth',
        description: 'Plants grow 2x faster during night hours'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('garden')
        .setDescription('🌱 Tend to your magical garden')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your magical garden'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('plant')
                .setDescription('Plant new magical seeds')
                .addStringOption(option =>
                    option.setName('seed')
                        .setDescription('Type of seed to plant')
                        .setRequired(true)
                        .addChoices(
                            { name: '🌹 Rose of Life', value: 'rose_of_life' },
                            { name: '🍎 Golden Apple', value: 'golden_apple' },
                            { name: '🌿 Mana Herb', value: 'mana_herb' },
                            { name: '🍄 Mystic Mushroom', value: 'mystic_mushroom' },
                            { name: '🌺 Dream Flower', value: 'dream_flower' },
                            { name: '🔥 Phoenix Feather Fern', value: 'phoenix_feather_fern' }
                        ))
                .addIntegerOption(option =>
                    option.setName('plot')
                        .setDescription('Plot number to plant in')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('water')
                .setDescription('Water your magical plants')
                .addIntegerOption(option =>
                    option.setName('plot')
                        .setDescription('Which plot to water')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('harvest')
                .setDescription('Harvest mature magical plants')
                .addIntegerOption(option =>
                    option.setName('plot')
                        .setDescription('Which plot to harvest')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('upgrade')
                .setDescription('Upgrade your magical garden')
                .addStringOption(option =>
                    option.setName('upgrade')
                        .setDescription('Type of upgrade')
                        .setRequired(true)
                        .addChoices(
                            { name: '🏠 Enchanted Greenhouse', value: 'greenhouse' },
                            { name: '💧 Magical Sprinkler', value: 'magical_sprinkler' },
                            { name: '🌙 Fertility Circle', value: 'fertility_circle' },
                            { name: '🌊 Moonwell', value: 'moonwell' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('alchemy')
                .setDescription('Use harvested plants for alchemy')
                .addStringOption(option =>
                    option.setName('recipe')
                        .setDescription('Alchemical recipe to create')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            let player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first!',
                    ephemeral: true
                });
                return;
            }

            // Initialize garden data if it doesn't exist
            if (!player.garden) {
                player.garden = {
                    plots: [
                        { plant: null, water: 0, plantedAt: null, health: 100, magical_energy: 0 },
                        { plant: null, water: 0, plantedAt: null, health: 100, magical_energy: 0 }
                    ],
                    experience: 0,
                    level: 1,
                    lastWater: 0,
                    harvests: 0,
                    inventory: {},
                    upgrades: [],
                    moonPhase: this.getCurrentMoonPhase()
                };
            }

            switch (subcommand) {
                case 'view':
                    await this.viewGarden(interaction, player);
                    break;
                case 'plant':
                    await this.plantSeed(interaction, player);
                    break;
                case 'water':
                    await this.waterPlants(interaction, player);
                    break;
                case 'harvest':
                    await this.harvestPlants(interaction, player);
                    break;
                case 'upgrade':
                    await this.upgradeGarden(interaction, player);
                    break;
                case 'alchemy':
                    await this.performAlchemy(interaction, player);
                    break;
            }

        } catch (error) {
            console.error('Error in garden command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while tending to your garden.',
                ephemeral: true
            });
        }
    },

    async viewGarden(interaction, player) {
        const currentMoonPhase = this.getCurrentMoonPhase();
        const timeOfDay = this.getTimeOfDay();
        
        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('🌱 Mystical Garden')
            .setDescription(`**Welcome to your enchanted sanctuary**\n\n${this.getMoonEmoji(currentMoonPhase)} **Moon Phase:** ${currentMoonPhase}\n${this.getTimeEmoji(timeOfDay)} **Time:** ${timeOfDay}`)
            .addFields(
                { name: '🧙‍♂️ Garden Level', value: player.garden.level.toString(), inline: true },
                { name: '✨ Experience', value: `${player.garden.experience}/${player.garden.level * 150}`, inline: true },
                { name: '🌿 Total Harvests', value: player.garden.harvests.toString(), inline: true }
            );

        // Plot status
        let plotStatus = '';
        const currentTime = Date.now();

        player.garden.plots.forEach((plot, index) => {
            if (plot.plant) {
                const plant = magicalPlants[plot.plant];
                const growthTime = currentTime - plot.plantedAt;
                const progress = Math.min(100, Math.floor((growthTime / plant.growthTime) * 100));
                const isReady = growthTime >= plant.growthTime && plot.water >= plant.waterNeeded;
                
                plotStatus += `**Plot ${index + 1}:** ${plant.emoji} ${plant.name}\n`;
                plotStatus += `Progress: ${this.getMagicalProgressBar(progress, plot.magical_energy)} ${progress}%\n`;
                plotStatus += `Water: ${plot.water}/${plant.waterNeeded} | Magic: ${plot.magical_energy}/10\n`;
                plotStatus += `Status: ${isReady ? '🌟 Ready!' : '⏳ Growing...'}\n\n`;
            } else {
                plotStatus += `**Plot ${index + 1}:** Empty ✨\n*Ready for magical seeds*\n\n`;
            }
        });

        embed.addFields({ name: '🏡 Garden Plots', value: plotStatus, inline: false });

        // Upgrades
        if (player.garden.upgrades.length > 0) {
            let upgradeText = '';
            player.garden.upgrades.forEach(upgradeKey => {
                const upgrade = gardenUpgrades[upgradeKey];
                upgradeText += `✅ ${upgrade.name}\n`;
            });
            embed.addFields({ name: '🔮 Active Upgrades', value: upgradeText, inline: true });
        }

        // Inventory
        if (Object.keys(player.garden.inventory).length > 0) {
            let inventoryText = '';
            Object.entries(player.garden.inventory).forEach(([plantType, amount]) => {
                const plant = magicalPlants[plantType];
                inventoryText += `${plant.emoji} ${plant.name}: ${amount}\n`;
            });
            embed.addFields({ name: '📦 Magical Inventory', value: inventoryText, inline: true });
        }

        // Buttons
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('garden_plant')
                    .setLabel('Plant Seeds')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🌱'),
                new ButtonBuilder()
                    .setCustomId('garden_water')
                    .setLabel('Water Plants')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💧'),
                new ButtonBuilder()
                    .setCustomId('garden_harvest')
                    .setLabel('Harvest')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🌟'),
                new ButtonBuilder()
                    .setCustomId('garden_upgrade')
                    .setLabel('Upgrades')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔮')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });
    },

    async plantSeed(interaction, player) {
        const seedType = interaction.options.getString('seed');
        const plotNumber = interaction.options.getInteger('plot');
        const plant = magicalPlants[seedType];

        // Check requirements
        if (player.garden.level < plant.level) {
            await interaction.editReply({
                content: `❌ You need garden level ${plant.level} to plant ${plant.name}!`,
                ephemeral: true
            });
            return;
        }

        if (player.coins < plant.seedCost) {
            await interaction.editReply({
                content: `❌ You need ${plant.seedCost} coins to buy ${plant.name} seeds!`,
                ephemeral: true
            });
            return;
        }

        // Find available plot
        let targetPlot = plotNumber ? plotNumber - 1 : player.garden.plots.findIndex(plot => !plot.plant);
        
        if (plotNumber && (plotNumber < 1 || plotNumber > player.garden.plots.length)) {
            await interaction.editReply({
                content: '❌ Invalid plot number!',
                ephemeral: true
            });
            return;
        }

        if (targetPlot === -1) {
            await interaction.editReply({
                content: '❌ All plots are occupied! Harvest your plants first.',
                ephemeral: true
            });
            return;
        }

        if (player.garden.plots[targetPlot].plant) {
            await interaction.editReply({
                content: `❌ Plot ${targetPlot + 1} already has a plant growing!`,
                ephemeral: true
            });
            return;
        }

        // Plant the seed
        player.coins -= plant.seedCost;
        player.garden.plots[targetPlot] = {
            plant: seedType,
            water: 0,
            plantedAt: Date.now(),
            health: 100,
            magical_energy: 0
        };

        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('✨ Magical Seed Planted!')
            .setDescription(`You planted ${plant.emoji} **${plant.name}** in plot ${targetPlot + 1}!`)
            .addFields(
                { name: '💰 Cost', value: `${plant.seedCost} coins`, inline: true },
                { name: '⏰ Growth Time', value: this.formatTime(plant.growthTime), inline: true },
                { name: '💧 Water Needed', value: `0/${plant.waterNeeded}`, inline: true },
                { name: '🌟 Rarity', value: plant.rarity.charAt(0).toUpperCase() + plant.rarity.slice(1), inline: true },
                { name: '🔮 Effect', value: plant.effect.charAt(0).toUpperCase() + plant.effect.slice(1), inline: true },
                { name: '📅 Ready At', value: `<t:${Math.floor((Date.now() + plant.growthTime) / 1000)}:F>`, inline: true }
            )
            .setFooter({ text: 'Channel magical energy into your plants for better yields!' });

        await interaction.editReply({ embeds: [embed] });
    },

    async waterPlants(interaction, player) {
        const plotNumber = interaction.options.getInteger('plot');
        const currentTime = Date.now();
        const waterCooldown = 1800000; // 30 minutes

        if (plotNumber) {
            // Water specific plot
            if (plotNumber < 1 || plotNumber > player.garden.plots.length) {
                await interaction.editReply({
                    content: '❌ Invalid plot number!',
                    ephemeral: true
                });
                return;
            }

            const plot = player.garden.plots[plotNumber - 1];
            if (!plot.plant) {
                await interaction.editReply({
                    content: `❌ Plot ${plotNumber} is empty!`,
                    ephemeral: true
                });
                return;
            }

            if (currentTime - player.garden.lastWater < waterCooldown) {
                const remainingTime = Math.ceil((waterCooldown - (currentTime - player.garden.lastWater)) / 60000);
                await interaction.editReply({
                    content: `⏳ You must wait ${remainingTime} more minutes before watering again.`,
                    ephemeral: true
                });
                return;
            }

            const plant = magicalPlants[plot.plant];
            if (plot.water >= plant.waterNeeded) {
                await interaction.editReply({
                    content: '❌ This plant has enough water!',
                    ephemeral: true
                });
                return;
            }

            player.garden.lastWater = currentTime;
            plot.water += 1;
            plot.magical_energy += Math.floor(Math.random() * 3) + 1; // 1-3 magical energy

            await db.updatePlayer(interaction.user.id, player);

            const embed = new EmbedBuilder()
                .setColor('#00BFFF')
                .setTitle('💧 Magical Watering Complete')
                .setDescription(`You watered your ${plant.emoji} **${plant.name}** with enchanted water!`)
                .addFields(
                    { name: 'Water Level', value: `${plot.water}/${plant.waterNeeded}`, inline: true },
                    { name: 'Magical Energy', value: `${plot.magical_energy}/10`, inline: true },
                    { name: 'Growth Progress', value: this.getGrowthProgress(plot, plant), inline: true }
                );

            await interaction.editReply({ embeds: [embed] });
        } else {
            // Water all plants
            await this.waterAllPlants(interaction, player);
        }
    },

    async waterAllPlants(interaction, player) {
        const currentTime = Date.now();
        const waterCooldown = 1800000; // 30 minutes

        if (currentTime - player.garden.lastWater < waterCooldown) {
            const remainingTime = Math.ceil((waterCooldown - (currentTime - player.garden.lastWater)) / 60000);
            await interaction.editReply({
                content: `⏳ You must wait ${remainingTime} more minutes before watering again.`,
                ephemeral: true
            });
            return;
        }

        let wateredPlants = 0;
        let totalMagicalEnergy = 0;

        player.garden.plots.forEach(plot => {
            if (plot.plant) {
                const plant = magicalPlants[plot.plant];
                if (plot.water < plant.waterNeeded) {
                    plot.water += 1;
                    const energyGain = Math.floor(Math.random() * 3) + 1;
                    plot.magical_energy += energyGain;
                    totalMagicalEnergy += energyGain;
                    wateredPlants++;
                }
            }
        });

        if (wateredPlants === 0) {
            await interaction.editReply({
                content: '❌ All plants have enough water!',
                ephemeral: true
            });
            return;
        }

        player.garden.lastWater = currentTime;
        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setTitle('💧 Mass Watering Complete!')
            .setDescription(`You watered ${wateredPlants} plants with mystical water!`)
            .addFields(
                { name: 'Plants Watered', value: wateredPlants.toString(), inline: true },
                { name: 'Total Magical Energy', value: `+${totalMagicalEnergy}`, inline: true },
                { name: 'Next Watering', value: `<t:${Math.floor((currentTime + waterCooldown) / 1000)}:R>`, inline: true }
            );

        await interaction.editReply({ embeds: [embed] });
    },

    async harvestPlants(interaction, player) {
        const plotNumber = interaction.options.getInteger('plot');
        
        if (plotNumber) {
            // Harvest specific plot
            if (plotNumber < 1 || plotNumber > player.garden.plots.length) {
                await interaction.editReply({
                    content: '❌ Invalid plot number!',
                    ephemeral: true
                });
                return;
            }

            const plot = player.garden.plots[plotNumber - 1];
            if (!plot.plant) {
                await interaction.editReply({
                    content: `❌ Plot ${plotNumber} is empty!`,
                    ephemeral: true
                });
                return;
            }

            await this.harvestSinglePlot(interaction, player, plotNumber - 1);
        } else {
            // Harvest all ready plants
            await this.harvestAllReady(interaction, player);
        }
    },

    async harvestSinglePlot(interaction, player, plotIndex) {
        const plot = player.garden.plots[plotIndex];
        const plant = magicalPlants[plot.plant];
        const currentTime = Date.now();
        const growthTime = currentTime - plot.plantedAt;
        
        if (growthTime < plant.growthTime || plot.water < plant.waterNeeded) {
            const timeLeft = plant.growthTime - growthTime;
            const progress = Math.floor((growthTime / plant.growthTime) * 100);
            
            await interaction.editReply({
                content: `❌ The ${plant.name} isn't ready yet!\n**Progress:** ${progress}%\n**Water:** ${plot.water}/${plant.waterNeeded}\n**Ready:** <t:${Math.floor((plot.plantedAt + plant.growthTime) / 1000)}:R>`,
                ephemeral: true
            });
            return;
        }

        // Calculate magical yield
        const yield = await this.calculateMagicalYield(player, plot, plant);
        
        // Add to inventory
        if (!player.garden.inventory[plot.plant]) {
            player.garden.inventory[plot.plant] = 0;
        }
        player.garden.inventory[plot.plant] += yield;

        // Award experience
        let experienceGain = plant.experience;
        if (plot.magical_energy >= 10) {
            experienceGain *= 1.5; // 50% bonus for maximum magical energy
        }

        player.garden.experience += Math.floor(experienceGain);
        player.garden.harvests += 1;

        // Check for level up
        const oldLevel = player.garden.level;
        const expNeeded = player.garden.level * 150;
        if (player.garden.experience >= expNeeded) {
            player.garden.level++;
            player.garden.experience -= expNeeded;
        }

        // Clear plot
        player.garden.plots[plotIndex] = {
            plant: null,
            water: 0,
            plantedAt: null,
            health: 100,
            magical_energy: 0
        };

        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🌟 Magical Harvest Complete!')
            .setDescription(`You harvested ${yield}x ${plant.emoji} **${plant.name}** from plot ${plotIndex + 1}!`)
            .addFields(
                { name: '🎯 Experience Gained', value: `+${Math.floor(experienceGain)} XP`, inline: true },
                { name: '🧙‍♂️ Garden Level', value: player.garden.level.toString(), inline: true },
                { name: '📦 Total in Storage', value: player.garden.inventory[plot.plant].toString(), inline: true },
                { name: '✨ Magical Properties', value: `**Effect:** ${plant.effect}\n**Rarity:** ${plant.rarity}`, inline: false }
            );

        if (player.garden.level > oldLevel) {
            embed.addFields({
                name: '🎉 Level Up!',
                value: `Your magical garden reached level ${player.garden.level}! You can now plant more exotic seeds.`,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async harvestAllReady(interaction, player) {
        const readyPlots = [];
        const currentTime = Date.now();

        player.garden.plots.forEach((plot, index) => {
            if (plot.plant) {
                const plant = magicalPlants[plot.plant];
                const growthTime = currentTime - plot.plantedAt;
                if (growthTime >= plant.growthTime && plot.water >= plant.waterNeeded) {
                    readyPlots.push({ index, plot, plant });
                }
            }
        });

        if (readyPlots.length === 0) {
            await interaction.editReply({
                content: '❌ No plants are ready for harvest!',
                ephemeral: true
            });
            return;
        }

        let totalExperience = 0;
        let harvestedPlants = {};

        for (const { index, plot, plant } of readyPlots) {
            const yield = await this.calculateMagicalYield(player, plot, plant);
            
            if (!player.garden.inventory[plot.plant]) {
                player.garden.inventory[plot.plant] = 0;
            }
            player.garden.inventory[plot.plant] += yield;

            if (!harvestedPlants[plot.plant]) {
                harvestedPlants[plot.plant] = { yield: 0, plant };
            }
            harvestedPlants[plot.plant].yield += yield;

            let experienceGain = plant.experience;
            if (plot.magical_energy >= 10) {
                experienceGain *= 1.5;
            }
            totalExperience += Math.floor(experienceGain);
            player.garden.harvests += 1;

            // Clear plot
            player.garden.plots[index] = {
                plant: null,
                water: 0,
                plantedAt: null,
                health: 100,
                magical_energy: 0
            };
        }

        player.garden.experience += totalExperience;
        const oldLevel = player.garden.level;
        const expNeeded = player.garden.level * 150;
        if (player.garden.experience >= expNeeded) {
            player.garden.level++;
            player.garden.experience -= expNeeded;
        }

        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🌟 Mass Magical Harvest!')
            .setDescription(`You harvested ${readyPlots.length} plots of mystical plants!`);

        let harvestText = '';
        Object.entries(harvestedPlants).forEach(([plantType, data]) => {
            harvestText += `${data.plant.emoji} ${data.plant.name}: ${data.yield}\n`;
        });

        embed.addFields(
            { name: '🎁 Harvested Plants', value: harvestText, inline: true },
            { name: '🎯 Total Experience', value: `+${totalExperience} XP`, inline: true },
            { name: '🧙‍♂️ Garden Level', value: player.garden.level.toString(), inline: true }
        );

        if (player.garden.level > oldLevel) {
            embed.addFields({
                name: '🎉 Level Up!',
                value: `Your magical garden reached level ${player.garden.level}!`,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async upgradeGarden(interaction, player) {
        const upgradeType = interaction.options.getString('upgrade');
        const upgrade = gardenUpgrades[upgradeType];

        if (player.garden.upgrades.includes(upgradeType)) {
            await interaction.editReply({
                content: '❌ You already have this upgrade!',
                ephemeral: true
            });
            return;
        }

        if (player.coins < upgrade.cost) {
            await interaction.editReply({
                content: `❌ You need ${upgrade.cost} coins for this upgrade!`,
                ephemeral: true
            });
            return;
        }

        player.coins -= upgrade.cost;
        player.garden.upgrades.push(upgradeType);

        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('🔮 Garden Upgraded!')
            .setDescription(`You purchased **${upgrade.name}**!`)
            .addFields(
                { name: 'Cost', value: `${upgrade.cost} coins`, inline: true },
                { name: 'Effect', value: upgrade.description, inline: false },
                { name: 'Remaining Coins', value: player.coins.toString(), inline: true }
            );

        await interaction.editReply({ embeds: [embed] });
    },

    async performAlchemy(interaction, player) {
        // Implementation for alchemy system
        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('🧪 Magical Alchemy')
            .setDescription('Alchemy system coming soon!')
            .addFields({
                name: 'Available Soon',
                value: 'Transform your magical plants into powerful potions and enchantments.',
                inline: false
            });

        await interaction.editReply({ embeds: [embed] });
    },

    async calculateMagicalYield(player, plot, plant) {
        // Base yield
        const baseYield = Math.floor(Math.random() * (plant.baseYield.max - plant.baseYield.min + 1)) + plant.baseYield.min;
        
        // Bonuses
        let multiplier = 1.0;
        
        // Magical energy bonus
        multiplier += (plot.magical_energy / 10) * 0.5; // Up to 50% bonus for max magical energy
        
        // Level bonus
        multiplier += (player.garden.level - 1) * 0.1; // 10% per level above 1
        
        // Moon phase bonus
        const moonPhase = this.getCurrentMoonPhase();
        if (moonPhase === 'full') {
            multiplier += 0.3; // 30% bonus during full moon
        } else if (moonPhase === 'new') {
            multiplier += 0.1; // 10% bonus during new moon
        }
        
        // Time of day bonus (night plants grow better at night)
        const timeOfDay = this.getTimeOfDay();
        if (timeOfDay === 'night' && player.garden.upgrades.includes('moonwell')) {
            multiplier += 0.2; // 20% bonus for night growth with moonwell
        }
        
        // Upgrade bonuses
        if (player.garden.upgrades.includes('fertility_circle')) {
            multiplier += 0.5; // 50% yield boost
        }
        
        return Math.floor(baseYield * multiplier);
    },

    getCurrentMoonPhase() {
        const phases = ['new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 'full', 'waning_gibbous', 'third_quarter', 'waning_crescent'];
        const dayOfMonth = new Date().getDate();
        return phases[dayOfMonth % phases.length];
    },

    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    },

    getMoonEmoji(phase) {
        const emojis = {
            'new': '🌑',
            'waxing_crescent': '🌒',
            'first_quarter': '🌓',
            'waxing_gibbous': '🌔',
            'full': '🌕',
            'waning_gibbous': '🌖',
            'third_quarter': '🌗',
            'waning_crescent': '🌘'
        };
        return emojis[phase] || '🌑';
    },

    getTimeEmoji(time) {
        const emojis = {
            'morning': '🌅',
            'afternoon': '☀️',
            'evening': '🌇',
            'night': '🌙'
        };
        return emojis[time] || '🌤️';
    },

    getMagicalProgressBar(progress, magicalEnergy) {
        const filled = Math.floor(progress / 10);
        const empty = 10 - filled;
        const magicLevel = Math.floor(magicalEnergy / 2);
        const stars = '✨'.repeat(Math.min(magicLevel, 5));
        return '█'.repeat(filled) + '░'.repeat(empty) + ` ${stars}`;
    },

    getGrowthProgress(plot, plant) {
        const currentTime = Date.now();
        const growthTime = currentTime - plot.plantedAt;
        const progress = Math.min(100, Math.floor((growthTime / plant.growthTime) * 100));
        return `${progress}%`;
    },

    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
};
