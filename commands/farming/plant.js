
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const crops = {
    wheat: {
        name: 'Wheat',
        emoji: '🌾',
        growthTime: 2 * 60 * 60 * 1000, // 2 hours
        cost: 25,
        sellPrice: 40,
        experience: 10,
        level: 1,
        waterNeeded: 2,
        baseYield: { min: 3, max: 6 },
        description: 'A basic crop perfect for beginners',
        season: ['spring', 'summer']
    },
    carrot: {
        name: 'Carrot',
        emoji: '🥕',
        growthTime: 3 * 60 * 60 * 1000, // 3 hours
        cost: 40,
        sellPrice: 65,
        experience: 15,
        level: 3,
        waterNeeded: 3,
        baseYield: { min: 4, max: 8 },
        description: 'Orange root vegetable with good profits',
        season: ['spring', 'fall']
    },
    potato: {
        name: 'Potato',
        emoji: '🥔',
        growthTime: 4 * 60 * 60 * 1000, // 4 hours
        cost: 50,
        sellPrice: 80,
        experience: 20,
        level: 5,
        waterNeeded: 2,
        baseYield: { min: 5, max: 10 },
        description: 'Versatile tuber with reliable yields',
        season: ['spring', 'summer', 'fall']
    },
    corn: {
        name: 'Corn',
        emoji: '🌽',
        growthTime: 6 * 60 * 60 * 1000, // 6 hours
        cost: 75,
        sellPrice: 125,
        experience: 30,
        level: 8,
        waterNeeded: 4,
        baseYield: { min: 8, max: 15 },
        description: 'Golden kernels of substantial value',
        season: ['summer']
    },
    pumpkin: {
        name: 'Pumpkin',
        emoji: '🎃',
        growthTime: 8 * 60 * 60 * 1000, // 8 hours
        cost: 100,
        sellPrice: 180,
        experience: 40,
        level: 10,
        waterNeeded: 5,
        baseYield: { min: 1, max: 3 },
        description: 'Large orange gourds for special occasions',
        season: ['fall']
    },
    strawberry: {
        name: 'Strawberry',
        emoji: '🍓',
        growthTime: 5 * 60 * 60 * 1000, // 5 hours
        cost: 60,
        sellPrice: 100,
        experience: 25,
        level: 6,
        waterNeeded: 3,
        baseYield: { min: 6, max: 12 },
        description: 'Sweet berries loved by all',
        season: ['spring', 'summer']
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('plant')
        .setDescription('🌱 Plant crops on your farm')
        .addStringOption(option =>
            option.setName('crop')
                .setDescription('Type of crop to plant')
                .setRequired(false)
                .addChoices(
                    { name: '🌾 Wheat (Level 1) - 25 coins', value: 'wheat' },
                    { name: '🥕 Carrot (Level 3) - 40 coins', value: 'carrot' },
                    { name: '🥔 Potato (Level 5) - 50 coins', value: 'potato' },
                    { name: '🌽 Corn (Level 8) - 75 coins', value: 'corn' },
                    { name: '🎃 Pumpkin (Level 10) - 100 coins', value: 'pumpkin' },
                    { name: '🍓 Strawberry (Level 6) - 60 coins', value: 'strawberry' }
                ))
        .addIntegerOption(option =>
            option.setName('plot')
                .setDescription('Plot number to plant in (1-6)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(6)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const userId = interaction.user.id;
            const cropType = interaction.options.getString('crop');
            const plotNumber = interaction.options.getInteger('plot');

            let player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first! Use `/profile` to start.',
                    ephemeral: true
                });
                return;
            }

            // Initialize farming data
            if (!player.farming) {
                player.farming = {
                    level: 1,
                    experience: 0,
                    plots: Array(3).fill().map(() => ({
                        crop: null,
                        plantedAt: null,
                        water: 0,
                        health: 100,
                        fertilized: false
                    })),
                    inventory: {},
                    harvests: 0,
                    totalValue: 0,
                    unlockedPlots: 3
                };
            }

            // Ensure player has enough plots
            while (player.farming.plots.length < player.farming.unlockedPlots) {
                player.farming.plots.push({
                    crop: null,
                    plantedAt: null,
                    water: 0,
                    health: 100,
                    fertilized: false
                });
            }

            if (!cropType && !plotNumber) {
                await this.showPlantingMenu(interaction, player);
                return;
            }

            if (!cropType) {
                await interaction.editReply({
                    content: '❌ Please specify a crop to plant!',
                    ephemeral: true
                });
                return;
            }

            await this.plantCrop(interaction, player, cropType, plotNumber);

        } catch (error) {
            console.error('Error in plant command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while planting. Please try again.',
                ephemeral: true
            });
        }
    },

    async showPlantingMenu(interaction, player) {
        const currentSeason = this.getCurrentSeason();
        
        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('🌱 Seed Store & Planting Hub')
            .setDescription('╔═══════════════════════════════════════╗\n║           **FARMING CENTER**            ║\n╚═══════════════════════════════════════╝')
            .addFields(
                { name: '👨‍🌾 Farming Level', value: `**Level ${player.farming.level}** (${player.farming.experience}/100 XP)`, inline: true },
                { name: '💰 Available Coins', value: `**${player.coins || 0}** coins`, inline: true },
                { name: '🌤️ Current Season', value: `**${currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1)}**`, inline: true }
            );

        // Available crops display
        let cropsList = '';
        Object.entries(crops).forEach(([key, crop]) => {
            const canPlant = player.farming.level >= crop.level;
            const inSeason = crop.season.includes(currentSeason);
            const status = canPlant ? (inSeason ? '🌱' : '❄️') : '🔒';
            const seasonBonus = inSeason ? ' **(+20% yield!)**' : '';
            
            cropsList += `${status} ${crop.emoji} **${crop.name}** - ${crop.cost} coins\n`;
            cropsList += `   └ Level ${crop.level} • ${this.formatTime(crop.growthTime)} • ${crop.description}${seasonBonus}\n\n`;
        });

        embed.addFields({ name: '🛒 Available Seeds', value: cropsList, inline: false });

        // Plot status
        let plotStatus = '';
        player.farming.plots.forEach((plot, index) => {
            if (index < player.farming.unlockedPlots) {
                if (plot.crop) {
                    const crop = crops[plot.crop];
                    const timeLeft = crop.growthTime - (Date.now() - plot.plantedAt);
                    const isReady = timeLeft <= 0;
                    const progress = Math.min(100, Math.floor(((Date.now() - plot.plantedAt) / crop.growthTime) * 100));
                    
                    plotStatus += `**Plot ${index + 1}:** ${crop.emoji} ${crop.name}\n`;
                    plotStatus += `   └ ${isReady ? '✅ Ready to harvest!' : `⏰ ${this.formatTime(timeLeft)} remaining`}\n`;
                    plotStatus += `   └ ${this.getProgressBar(progress)} ${progress}%\n`;
                } else {
                    plotStatus += `**Plot ${index + 1}:** 🌱 Empty - Ready for planting\n`;
                }
                plotStatus += '\n';
            }
        });

        embed.addFields({ name: '🏡 Farm Status', value: plotStatus, inline: false });

        // Seasonal information
        const seasonalInfo = this.getSeasonalInfo(currentSeason);
        embed.addFields({ name: '🌟 Seasonal Bonus', value: seasonalInfo, inline: false });

        // Create crop selection menu
        const cropSelect = new StringSelectMenuBuilder()
            .setCustomId('plant_crop_select')
            .setPlaceholder('🌱 Choose a crop to plant')
            .addOptions(
                Object.entries(crops).map(([key, crop]) => {
                    const canPlant = player.farming.level >= crop.level;
                    const inSeason = crop.season.includes(currentSeason);
                    
                    return {
                        label: `${crop.name} (${crop.cost} coins)`,
                        value: key,
                        description: `Level ${crop.level} • ${this.formatTime(crop.growthTime)} • ${crop.description.substring(0, 40)}`,
                        emoji: crop.emoji,
                        default: false
                    };
                })
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('plant_mass_plant')
                    .setLabel('Mass Plant')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🌾'),
                new ButtonBuilder()
                    .setCustomId('plant_fertilize')
                    .setLabel('Fertilize All')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🧪'),
                new ButtonBuilder()
                    .setCustomId('plant_upgrade_farm')
                    .setLabel('Upgrade Farm')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏗️'),
                new ButtonBuilder()
                    .setCustomId('plant_harvest_all')
                    .setLabel('Harvest All')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🎁')
            );

        const selectRow = new ActionRowBuilder().addComponents(cropSelect);

        await interaction.editReply({
            embeds: [embed],
            components: [selectRow, buttons]
        });
    },

    async plantCrop(interaction, player, cropType, plotNumber) {
        const crop = crops[cropType];
        
        if (!crop) {
            await interaction.editReply({
                content: '❌ Invalid crop type!',
                ephemeral: true
            });
            return;
        }

        // Check level requirement
        if (player.farming.level < crop.level) {
            await interaction.editReply({
                content: `❌ You need farming level ${crop.level} to plant ${crop.name}! Current level: ${player.farming.level}`,
                ephemeral: true
            });
            return;
        }

        // Check if player has enough coins
        if ((player.coins || 0) < crop.cost) {
            await interaction.editReply({
                content: `❌ You need ${crop.cost} coins to plant ${crop.name}! You have ${player.coins || 0} coins.`,
                ephemeral: true
            });
            return;
        }

        // Find empty plot or use specified plot
        let targetPlot;
        if (plotNumber) {
            if (plotNumber > player.farming.unlockedPlots) {
                await interaction.editReply({
                    content: `❌ Plot ${plotNumber} is not unlocked! You have ${player.farming.unlockedPlots} plots available.`,
                    ephemeral: true
                });
                return;
            }
            
            targetPlot = plotNumber - 1;
            if (player.farming.plots[targetPlot].crop) {
                await interaction.editReply({
                    content: `❌ Plot ${plotNumber} already has ${crops[player.farming.plots[targetPlot].crop].name} planted!`,
                    ephemeral: true
                });
                return;
            }
        } else {
            targetPlot = player.farming.plots.findIndex(plot => !plot.crop);
            if (targetPlot === -1) {
                await interaction.editReply({
                    content: '❌ All your plots are occupied! Harvest some crops first or specify a plot number.',
                    ephemeral: true
                });
                return;
            }
        }

        // Plant the crop
        player.coins -= crop.cost;
        player.farming.plots[targetPlot] = {
            crop: cropType,
            plantedAt: Date.now(),
            water: 0,
            health: 100,
            fertilized: false
        };

        await db.updatePlayer(interaction.user.id, player);

        // Check for seasonal bonus
        const currentSeason = this.getCurrentSeason();
        const seasonalBonus = crop.season.includes(currentSeason);

        const embed = new EmbedBuilder()
            .setColor('#90EE90')
            .setTitle('🌱 Crop Successfully Planted!')
            .setDescription(`You planted **${crop.emoji} ${crop.name}** in Plot ${targetPlot + 1}!`)
            .addFields(
                { name: '💰 Cost', value: `${crop.cost} coins`, inline: true },
                { name: '⏰ Growth Time', value: this.formatTime(crop.growthTime), inline: true },
                { name: '🌊 Water Needed', value: `${crop.waterNeeded} waters`, inline: true },
                { name: '🎯 Expected XP', value: `${crop.experience} XP`, inline: true },
                { name: '💰 Remaining Coins', value: `${player.coins} coins`, inline: true },
                { name: '🌤️ Season', value: seasonalBonus ? '🌟 **In Season! (+20% yield)**' : 'Out of season', inline: true }
            )
            .setFooter({ text: 'Remember to water your crops for better yields!' })
            .setTimestamp();

        if (seasonalBonus) {
            embed.setColor('#FFD700');
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('plant_another')
                    .setLabel('Plant Another')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🌱'),
                new ButtonBuilder()
                    .setCustomId('plant_water_now')
                    .setLabel('Water This Crop')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💧'),
                new ButtonBuilder()
                    .setCustomId('plant_view_farm')
                    .setLabel('View Farm')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏡')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    getCurrentSeason() {
        const month = new Date().getMonth();
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'fall';
        return 'winter';
    },

    getSeasonalInfo(season) {
        const seasonInfo = {
            spring: '🌸 Spring brings +20% yield to Wheat, Carrots, Potatoes, and Strawberries!',
            summer: '☀️ Summer enhances Wheat, Corn, Potatoes, and Strawberries with +20% yield!',
            fall: '🍂 Fall season boosts Carrots, Potatoes, and Pumpkins with +20% yield!',
            winter: '❄️ Winter is harsh - no seasonal bonuses, but crops still grow indoors!'
        };
        return seasonInfo[season] || 'Season information unavailable.';
    },

    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    },

    getProgressBar(progress) {
        const filled = Math.floor(progress / 10);
        const empty = 10 - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
};
