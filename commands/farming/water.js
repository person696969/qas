
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

const crops = {
    wheat: {
        name: 'Wheat',
        emoji: '🌾',
        growthTime: 2 * 60 * 60 * 1000, // 2 hours
        yield: { min: 3, max: 6 },
        cost: 25,
        xp: 10,
        level: 1,
        waterNeeded: 2
    },
    carrot: {
        name: 'Carrot',
        emoji: '🥕',
        growthTime: 3 * 60 * 60 * 1000, // 3 hours
        yield: { min: 4, max: 8 },
        cost: 40,
        xp: 15,
        level: 3,
        waterNeeded: 3
    },
    potato: {
        name: 'Potato',
        emoji: '🥔',
        growthTime: 4 * 60 * 60 * 1000, // 4 hours
        yield: { min: 5, max: 10 },
        cost: 50,
        xp: 20,
        level: 5,
        waterNeeded: 2
    },
    corn: {
        name: 'Corn',
        emoji: '🌽',
        growthTime: 6 * 60 * 60 * 1000, // 6 hours
        yield: { min: 8, max: 15 },
        cost: 75,
        xp: 30,
        level: 8,
        waterNeeded: 4
    },
    pumpkin: {
        name: 'Pumpkin',
        emoji: '🎃',
        growthTime: 8 * 60 * 60 * 1000, // 8 hours
        yield: { min: 1, max: 3 },
        cost: 100,
        xp: 40,
        level: 10,
        waterNeeded: 5
    },
    strawberry: {
        name: 'Strawberry',
        emoji: '🍓',
        growthTime: 5 * 60 * 60 * 1000, // 5 hours
        yield: { min: 6, max: 12 },
        cost: 60,
        xp: 25,
        level: 6,
        waterNeeded: 3
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('water')
        .setDescription('💧 Water your crops to boost their growth')
        .addIntegerOption(option =>
            option.setName('plot')
                .setDescription('Plot number to water (leave empty to see all plots)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(6))
        .addBooleanOption(option =>
            option.setName('all')
                .setDescription('Water all crops at once')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const plotNumber = interaction.options.getInteger('plot');
            const waterAll = interaction.options.getBoolean('all');
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
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
                    unlockedPlots: 3,
                    wateringCan: 'basic'
                };
            }

            if (!plotNumber && !waterAll) {
                await this.showWateringMenu(interaction, player);
                return;
            }

            if (waterAll) {
                await this.waterAllCrops(interaction, player);
            } else {
                await this.waterSpecificPlot(interaction, player, plotNumber);
            }

        } catch (error) {
            console.error('Error in water command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while watering crops.',
                ephemeral: true
            });
        }
    },

    async showWateringMenu(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('💧 Irrigation & Watering System')
            .setDescription('╔═══════════════════════════════════════╗\n║         **WATERING CENTER**           ║\n╚═══════════════════════════════════════╝')
            .addFields(
                { name: '👨‍🌾 Farming Level', value: `**Level ${player.farming.level}**`, inline: true },
                { name: '🪣 Watering Can', value: `**${this.getWateringCanName(player.farming.wateringCan)}**`, inline: true },
                { name: '💧 Water Quality', value: '**Premium**', inline: true }
            );

        // Show current plots that need watering
        let plotsStatus = '';
        let cropsNeedingWater = 0;
        const currentTime = Date.now();

        player.farming.plots.forEach((plot, index) => {
            if (index < player.farming.unlockedPlots) {
                if (plot.crop) {
                    const crop = crops[plot.crop];
                    const waterCooldown = 2 * 60 * 60 * 1000; // 2 hours between waterings
                    const canWater = !plot.lastWatered || (currentTime - plot.lastWatered) >= waterCooldown;
                    const growthProgress = Math.min(100, Math.floor(((currentTime - plot.plantedAt) / crop.growthTime) * 100));
                    
                    plotsStatus += `**Plot ${index + 1}:** ${crop.emoji} ${crop.name}\n`;
                    plotsStatus += `   └ Water Level: ${plot.water}/${crop.waterNeeded} ${plot.water >= crop.waterNeeded ? '💧✅' : '💧❌'}\n`;
                    plotsStatus += `   └ Growth: ${this.getProgressBar(growthProgress)} ${growthProgress}%\n`;
                    plotsStatus += `   └ Status: ${canWater ? '✅ Can water' : `⏰ Wait ${this.formatTime(waterCooldown - (currentTime - plot.lastWatered))}`}\n\n`;
                    
                    if (canWater && plot.water < crop.waterNeeded) {
                        cropsNeedingWater++;
                    }
                } else {
                    plotsStatus += `**Plot ${index + 1}:** 🌱 Empty\n\n`;
                }
            }
        });

        embed.addFields({ name: '🏡 Farm Water Status', value: plotsStatus || 'No crops planted yet!', inline: false });

        // Watering benefits info
        const benefitsInfo = [
            '🌱 **Growth Boost:** +15% faster growth when well-watered',
            '🎁 **Better Yields:** +20% harvest when water needs are met',
            '💪 **Crop Health:** Prevents diseases and pest damage',
            '⭐ **Quality Bonus:** Higher quality crops sell for more',
            '🌟 **Experience:** Gain farming XP from caring for crops'
        ].join('\n');

        embed.addFields({ name: '💡 Watering Benefits', value: benefitsInfo, inline: false });

        // Weather bonus
        const weatherBonus = this.getWeatherBonus();
        if (weatherBonus) {
            embed.addFields({ name: '🌤️ Weather Bonus', value: weatherBonus, inline: false });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('water_all_crops')
                    .setLabel(`Water All (${cropsNeedingWater} crops)`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💧')
                    .setDisabled(cropsNeedingWater === 0),
                new ButtonBuilder()
                    .setCustomId('water_upgrade_can')
                    .setLabel('Upgrade Watering Can')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🪣'),
                new ButtonBuilder()
                    .setCustomId('water_fertilize')
                    .setLabel('Add Fertilizer')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🧪'),
                new ButtonBuilder()
                    .setCustomId('water_automated')
                    .setLabel('Setup Auto-Water')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🤖')
            );

        // Individual plot buttons if there are crops
        const plotButtons = [];
        player.farming.plots.forEach((plot, index) => {
            if (plot.crop && index < player.farming.unlockedPlots) {
                const crop = crops[plot.crop];
                const canWater = !plot.lastWatered || (Date.now() - plot.lastWatered) >= 2 * 60 * 60 * 1000;
                
                plotButtons.push(
                    new ButtonBuilder()
                        .setCustomId(`water_plot_${index + 1}`)
                        .setLabel(`Plot ${index + 1}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(crop.emoji)
                        .setDisabled(!canWater || plot.water >= crop.waterNeeded)
                );
            }
        });

        const components = [buttons];
        if (plotButtons.length > 0) {
            const plotRow = new ActionRowBuilder().addComponents(plotButtons.slice(0, 5));
            components.push(plotRow);
        }

        await interaction.editReply({ embeds: [embed], components });
    },

    async waterSpecificPlot(interaction, player, plotNumber) {
        if (plotNumber > player.farming.unlockedPlots) {
            await interaction.editReply({
                content: `❌ Plot ${plotNumber} is not unlocked! You have ${player.farming.unlockedPlots} plots available.`,
                ephemeral: true
            });
            return;
        }

        const plot = player.farming.plots[plotNumber - 1];
        if (!plot.crop) {
            await interaction.editReply({
                content: `❌ Plot ${plotNumber} is empty! Plant a crop first.`,
                ephemeral: true
            });
            return;
        }

        const crop = crops[plot.crop];
        const currentTime = Date.now();
        const waterCooldown = 2 * 60 * 60 * 1000; // 2 hours

        // Check watering cooldown
        if (plot.lastWatered && (currentTime - plot.lastWatered) < waterCooldown) {
            const timeLeft = waterCooldown - (currentTime - plot.lastWatered);
            await interaction.editReply({
                content: `💧 Plot ${plotNumber} was recently watered! You can water again <t:${Math.floor((plot.lastWatered + waterCooldown) / 1000)}:R>`,
                ephemeral: true
            });
            return;
        }

        // Check if crop needs more water
        if (plot.water >= crop.waterNeeded) {
            await interaction.editReply({
                content: `💧 ${crop.emoji} ${crop.name} in Plot ${plotNumber} has enough water (${plot.water}/${crop.waterNeeded})!`,
                ephemeral: true
            });
            return;
        }

        // Apply watering
        const wateringCanBonus = this.getWateringCanBonus(player.farming.wateringCan);
        const waterAmount = Math.min(wateringCanBonus, crop.waterNeeded - plot.water);
        
        plot.water += waterAmount;
        plot.lastWatered = currentTime;

        // Apply growth boost
        const growthBoost = 0.15; // 15% faster growth
        if (plot.water >= crop.waterNeeded) {
            plot.plantedAt -= Math.floor(crop.growthTime * growthBoost);
        }

        // Add farming experience
        if (!player.skills) player.skills = {};
        if (!player.skills.farming) player.skills.farming = { level: 1, exp: 0 };
        player.skills.farming.exp += 3 * waterAmount;

        // Level up check
        const oldLevel = player.farming.level;
        if (player.skills.farming.exp >= player.skills.farming.level * 100) {
            player.skills.farming.level++;
            player.farming.level = player.skills.farming.level;
            player.skills.farming.exp = 0;
        }

        await db.updatePlayer(interaction.user.id, player);

        const growthTime = Date.now() - plot.plantedAt;
        const growthPercent = Math.min(100, Math.floor((growthTime / crop.growthTime) * 100));
        const timeUntilReady = Math.max(0, crop.growthTime - growthTime);

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('💧 Crop Successfully Watered!')
            .setDescription(`You carefully watered your **${crop.emoji} ${crop.name}** in Plot ${plotNumber}!`)
            .addFields(
                { name: '💧 Water Applied', value: `+${waterAmount} water`, inline: true },
                { name: '🌊 Current Water Level', value: `${plot.water}/${crop.waterNeeded} ${plot.water >= crop.waterNeeded ? '✅' : '💧'}`, inline: true },
                { name: '🌱 Growth Progress', value: `${this.getProgressBar(growthPercent)} ${growthPercent}%`, inline: true },
                { name: '⏰ Time Until Ready', value: timeUntilReady > 0 ? this.formatTime(timeUntilReady) : '✅ Ready to harvest!', inline: true },
                { name: '🎯 XP Gained', value: `+${3 * waterAmount} farming XP`, inline: true },
                { name: '🪣 Watering Can', value: this.getWateringCanName(player.farming.wateringCan), inline: true }
            );

        if (plot.water >= crop.waterNeeded) {
            embed.addFields({
                name: '🌟 Water Requirements Met!',
                value: 'This crop will have +20% yield and +15% faster growth!',
                inline: false
            });
        }

        if (player.farming.level > oldLevel) {
            embed.addFields({
                name: '🎉 Level Up!',
                value: `Your farming skill is now level ${player.farming.level}! New features unlocked!`,
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('water_another_plot')
                    .setLabel('Water Another Plot')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💧'),
                new ButtonBuilder()
                    .setCustomId('water_fertilize_plot')
                    .setLabel('Add Fertilizer')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🧪'),
                new ButtonBuilder()
                    .setCustomId('water_view_farm')
                    .setLabel('View Farm Status')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏡')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    async waterAllCrops(interaction, player) {
        const currentTime = Date.now();
        const waterCooldown = 2 * 60 * 60 * 1000; // 2 hours
        let wateredCrops = 0;
        let totalXP = 0;
        let totalWaterUsed = 0;

        const wateringCanBonus = this.getWateringCanBonus(player.farming.wateringCan);
        const wateringResults = [];

        player.farming.plots.forEach((plot, index) => {
            if (plot.crop && index < player.farming.unlockedPlots) {
                const crop = crops[plot.crop];
                const canWater = !plot.lastWatered || (currentTime - plot.lastWatered) >= waterCooldown;
                
                if (canWater && plot.water < crop.waterNeeded) {
                    const waterAmount = Math.min(wateringCanBonus, crop.waterNeeded - plot.water);
                    plot.water += waterAmount;
                    plot.lastWatered = currentTime;
                    
                    // Apply growth boost
                    if (plot.water >= crop.waterNeeded) {
                        plot.plantedAt -= Math.floor(crop.growthTime * 0.15);
                    }
                    
                    wateredCrops++;
                    totalWaterUsed += waterAmount;
                    totalXP += 3 * waterAmount;
                    
                    wateringResults.push({
                        plotNumber: index + 1,
                        crop: crop,
                        waterAdded: waterAmount,
                        totalWater: plot.water,
                        maxWater: crop.waterNeeded
                    });
                }
            }
        });

        if (wateredCrops === 0) {
            await interaction.editReply({
                content: '💧 No crops need watering right now! Either they\'re well-watered or on cooldown.',
                ephemeral: true
            });
            return;
        }

        // Add farming experience
        if (!player.skills) player.skills = {};
        if (!player.skills.farming) player.skills.farming = { level: 1, exp: 0 };
        player.skills.farming.exp += totalXP;

        const oldLevel = player.farming.level;
        if (player.skills.farming.exp >= player.skills.farming.level * 100) {
            player.skills.farming.level++;
            player.farming.level = player.skills.farming.level;
            player.skills.farming.exp = 0;
        }

        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('💧 Mass Watering Complete!')
            .setDescription(`Successfully watered **${wateredCrops}** crops across your farm!`)
            .addFields(
                { name: '🌊 Total Water Used', value: `${totalWaterUsed} units`, inline: true },
                { name: '🎯 XP Gained', value: `+${totalXP} farming XP`, inline: true },
                { name: '🪣 Watering Can', value: this.getWateringCanName(player.farming.wateringCan), inline: true }
            );

        // Show detailed results
        let resultsText = '';
        wateringResults.forEach(result => {
            resultsText += `**Plot ${result.plotNumber}:** ${result.crop.emoji} ${result.crop.name}\n`;
            resultsText += `   └ Added ${result.waterAdded} water (${result.totalWater}/${result.maxWater}) ${result.totalWater >= result.maxWater ? '✅' : '💧'}\n`;
        });

        embed.addFields({ name: '🏡 Watering Results', value: resultsText, inline: false });

        if (player.farming.level > oldLevel) {
            embed.addFields({
                name: '🎉 Level Up!',
                value: `Your farming skill increased to level ${player.farming.level}!`,
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('water_fertilize_all')
                    .setLabel('Fertilize All')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🧪'),
                new ButtonBuilder()
                    .setCustomId('water_check_growth')
                    .setLabel('Check Growth')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🌱'),
                new ButtonBuilder()
                    .setCustomId('water_upgrade_system')
                    .setLabel('Upgrade System')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔧')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    getWateringCanName(canType) {
        const cans = {
            basic: '🪣 Basic Watering Can',
            bronze: '🥉 Bronze Watering Can',
            silver: '🥈 Silver Watering Can',
            gold: '🥇 Gold Watering Can',
            enchanted: '✨ Enchanted Watering Can'
        };
        return cans[canType] || cans.basic;
    },

    getWateringCanBonus(canType) {
        const bonuses = {
            basic: 1,
            bronze: 2,
            silver: 3,
            gold: 4,
            enchanted: 5
        };
        return bonuses[canType] || 1;
    },

    getWeatherBonus() {
        const weather = ['sunny', 'rainy', 'cloudy', 'stormy'][Math.floor(Math.random() * 4)];
        const weatherBonuses = {
            rainy: '🌧️ **Rainy Weather:** Natural watering reduces water consumption by 50%!',
            sunny: '☀️ **Sunny Weather:** Crops grow 10% faster today!',
            cloudy: '☁️ **Cloudy Weather:** Perfect growing conditions, +5% yield!',
            stormy: '⛈️ **Stormy Weather:** Crops may need extra care...'
        };
        return weatherBonuses[weather];
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
