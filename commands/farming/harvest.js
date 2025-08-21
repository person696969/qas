
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

const crops = {
    wheat: {
        name: 'Wheat',
        emoji: '🌾',
        growthTime: 2 * 60 * 60 * 1000, // 2 hours
        yield: { min: 3, max: 6 },
        cost: 25,
        sellPrice: 20,
        xp: 10,
        level: 1
    },
    carrot: {
        name: 'Carrot',
        emoji: '🥕',
        growthTime: 3 * 60 * 60 * 1000, // 3 hours
        yield: { min: 4, max: 8 },
        cost: 40,
        sellPrice: 30,
        xp: 15,
        level: 3
    },
    potato: {
        name: 'Potato',
        emoji: '🥔',
        growthTime: 4 * 60 * 60 * 1000, // 4 hours
        yield: { min: 5, max: 10 },
        cost: 50,
        sellPrice: 35,
        xp: 20,
        level: 5
    },
    corn: {
        name: 'Corn',
        emoji: '🌽',
        growthTime: 6 * 60 * 60 * 1000, // 6 hours
        yield: { min: 8, max: 15 },
        cost: 75,
        sellPrice: 45,
        xp: 30,
        level: 8
    },
    pumpkin: {
        name: 'Pumpkin',
        emoji: '🎃',
        growthTime: 8 * 60 * 60 * 1000, // 8 hours
        yield: { min: 1, max: 3 },
        cost: 100,
        sellPrice: 80,
        xp: 40,
        level: 10
    },
    strawberry: {
        name: 'Strawberry',
        emoji: '🍓',
        growthTime: 5 * 60 * 60 * 1000, // 5 hours
        yield: { min: 6, max: 12 },
        cost: 60,
        sellPrice: 40,
        xp: 25,
        level: 7
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('harvest')
        .setDescription('🌾 Harvest your grown crops')
        .addSubcommand(subcommand =>
            subcommand
                .setName('plot')
                .setDescription('Harvest a specific plot')
                .addIntegerOption(option =>
                    option.setName('number')
                        .setDescription('Plot number to harvest')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('Harvest all ready crops'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check harvest status of all plots'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sell')
                .setDescription('Sell harvested crops')
                .addStringOption(option =>
                    option.setName('crop')
                        .setDescription('Type of crop to sell')
                        .setRequired(true)
                        .addChoices(
                            { name: '🌾 Wheat', value: 'wheat' },
                            { name: '🥕 Carrot', value: 'carrot' },
                            { name: '🥔 Potato', value: 'potato' },
                            { name: '🌽 Corn', value: 'corn' },
                            { name: '🎃 Pumpkin', value: 'pumpkin' },
                            { name: '🍓 Strawberry', value: 'strawberry' }
                        ))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to sell (leave empty for all)')
                        .setRequired(false))),

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

            // Initialize farming data if it doesn't exist
            if (!player.farming) {
                player.farming = {
                    plots: [],
                    experience: 0,
                    level: 1,
                    harvests: 0,
                    totalValue: 0,
                    bestHarvest: 0,
                    streakDays: 0,
                    lastHarvest: 0
                };
            }

            if (!player.farming.plots || player.farming.plots.length === 0) {
                await interaction.editReply({
                    content: '❌ You don\'t have any farming plots! Use `/crop plant` to start farming.',
                    ephemeral: true
                });
                return;
            }

            switch (subcommand) {
                case 'plot':
                    await this.harvestPlot(interaction, player);
                    break;
                case 'all':
                    await this.harvestAll(interaction, player);
                    break;
                case 'status':
                    await this.showStatus(interaction, player);
                    break;
                case 'sell':
                    await this.sellCrops(interaction, player);
                    break;
            }

        } catch (error) {
            console.error('Error in harvest command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while harvesting your crops.',
                ephemeral: true
            });
        }
    },

    async harvestPlot(interaction, player) {
        const plotNumber = interaction.options.getInteger('number');

        if (plotNumber < 1 || plotNumber > player.farming.plots.length) {
            await interaction.editReply({
                content: '❌ Invalid plot number!',
                ephemeral: true
            });
            return;
        }

        const plot = player.farming.plots[plotNumber - 1];
        if (!plot.plantedAt || !plot.crop) {
            await interaction.editReply({
                content: '❌ This plot is empty!',
                ephemeral: true
            });
            return;
        }

        const cropData = crops[plot.crop];
        const currentTime = Date.now();
        const growthTime = currentTime - plot.plantedAt;
        
        if (growthTime < cropData.growthTime) {
            const timeLeft = cropData.growthTime - growthTime;
            const progress = Math.floor((growthTime / cropData.growthTime) * 100);
            
            await interaction.editReply({
                content: `⏳ Your ${cropData.emoji} ${cropData.name} is not ready yet!\n**Progress:** ${progress}%\n**Ready:** <t:${Math.floor((plot.plantedAt + cropData.growthTime) / 1000)}:R>`,
                ephemeral: true
            });
            return;
        }

        // Calculate harvest results
        const harvestResult = this.calculateHarvest(player, plot, cropData);
        
        // Update player data
        this.updatePlayerAfterHarvest(player, plot, cropData, harvestResult);

        // Clear the plot
        plot.crop = null;
        plot.plantedAt = null;
        plot.wateredAt = null;
        plot.fertilized = false;

        await db.updatePlayer(userId, player);

        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('🌾 Harvest Successful!')
            .setDescription(`You harvested your ${cropData.emoji} **${cropData.name}** from plot ${plotNumber}!`)
            .addFields(
                { name: '🎁 Yield', value: `${harvestResult.yield}x ${cropData.name}`, inline: true },
                { name: '💰 Value', value: `${harvestResult.value} coins`, inline: true },
                { name: '🎯 Experience', value: `+${harvestResult.experience} XP`, inline: true },
                { name: '🏆 Quality', value: harvestResult.quality, inline: true },
                { name: '⚡ Bonus', value: `+${harvestResult.bonusPercentage}%`, inline: true },
                { name: '👨‍🌾 Farming Level', value: player.farming.level.toString(), inline: true }
            );

        // Check for level up
        if (harvestResult.levelUp) {
            embed.addFields({
                name: '🎉 Level Up!',
                value: `Congratulations! You reached farming level ${player.farming.level}!\nYou can now grow more advanced crops!`,
                inline: false
            });
        }

        // Check for achievements
        if (harvestResult.achievements.length > 0) {
            embed.addFields({
                name: '🏆 Achievements Unlocked!',
                value: harvestResult.achievements.join('\n'),
                inline: false
            });
        }

        // Add action buttons
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('sell_harvest')
                    .setLabel('Sell Crops')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('plant_again')
                    .setLabel('Plant Again')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🌱'),
                new ButtonBuilder()
                    .setCustomId('harvest_status')
                    .setLabel('Farm Status')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });
    },

    async harvestAll(interaction, player) {
        const currentTime = Date.now();
        const readyPlots = [];

        // Check which plots are ready
        player.farming.plots.forEach((plot, index) => {
            if (plot.plantedAt && plot.crop) {
                const cropData = crops[plot.crop];
                const growthTime = currentTime - plot.plantedAt;
                
                if (growthTime >= cropData.growthTime) {
                    readyPlots.push({ index, plot, cropData });
                }
            }
        });

        if (readyPlots.length === 0) {
            await interaction.editReply({
                content: '❌ No crops are ready for harvest!',
                ephemeral: true
            });
            return;
        }

        let totalYield = 0;
        let totalValue = 0;
        let totalExperience = 0;
        let harvestedCrops = {};
        let achievements = [];

        // Process each ready plot
        readyPlots.forEach(({ index, plot, cropData }) => {
            const harvestResult = this.calculateHarvest(player, plot, cropData);
            
            totalYield += harvestResult.yield;
            totalValue += harvestResult.value;
            totalExperience += harvestResult.experience;
            
            if (!harvestedCrops[plot.crop]) {
                harvestedCrops[plot.crop] = { yield: 0, data: cropData };
            }
            harvestedCrops[plot.crop].yield += harvestResult.yield;
            
            this.updatePlayerAfterHarvest(player, plot, cropData, harvestResult);
            
            // Clear the plot
            plot.crop = null;
            plot.plantedAt = null;
            plot.wateredAt = null;
            plot.fertilized = false;
        });

        const oldLevel = player.farming.level;
        player.farming.level = Math.floor(player.farming.experience / 100) + 1;
        const levelUp = player.farming.level > oldLevel;

        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🌾 Mass Harvest Complete!')
            .setDescription(`You harvested ${readyPlots.length} plots simultaneously!`)
            .addFields(
                { name: '📊 Summary', value: `**Plots Harvested:** ${readyPlots.length}\n**Total Yield:** ${totalYield} items\n**Total Value:** ${totalValue} coins`, inline: false }
            );

        // Show detailed breakdown
        let cropsText = '';
        Object.entries(harvestedCrops).forEach(([cropType, data]) => {
            cropsText += `${data.data.emoji} ${data.data.name}: ${data.yield}\n`;
        });

        embed.addFields(
            { name: '🎁 Harvested Crops', value: cropsText, inline: true },
            { name: '🎯 Experience Gained', value: `+${totalExperience} XP`, inline: true },
            { name: '👨‍🌾 Farming Level', value: player.farming.level.toString(), inline: true }
        );

        if (levelUp) {
            embed.addFields({
                name: '🎉 Level Up!',
                value: `Congratulations! You reached farming level ${player.farming.level}!`,
                inline: false
            });
        }

        // Check for mass harvest achievements
        if (readyPlots.length >= 5) {
            achievements.push('🏆 Mass Producer - Harvested 5+ plots at once');
        }
        if (totalValue >= 1000) {
            achievements.push('💰 Big Harvest - Earned 1000+ coins in one harvest');
        }

        if (achievements.length > 0) {
            embed.addFields({
                name: '🏆 Achievements Unlocked!',
                value: achievements.join('\n'),
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async showStatus(interaction, player) {
        const currentTime = Date.now();
        
        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('📊 Harvest Status')
            .setDescription('**Farm Overview and Harvest Schedule**')
            .addFields(
                { name: '👨‍🌾 Farming Level', value: player.farming.level.toString(), inline: true },
                { name: '🌾 Total Harvests', value: player.farming.harvests.toString(), inline: true },
                { name: '💰 Total Value Earned', value: `${player.farming.totalValue} coins`, inline: true }
            );

        // Plot status with harvest times
        let plotStatus = '';
        let readyCount = 0;
        let growingCount = 0;

        player.farming.plots.forEach((plot, index) => {
            if (plot.plantedAt && plot.crop) {
                const cropData = crops[plot.crop];
                const growthTime = currentTime - plot.plantedAt;
                const progress = Math.min(100, Math.floor((growthTime / cropData.growthTime) * 100));
                const isReady = growthTime >= cropData.growthTime;
                
                if (isReady) {
                    readyCount++;
                    plotStatus += `**Plot ${index + 1}:** ${cropData.emoji} ${cropData.name} ✅ **READY!**\n`;
                } else {
                    growingCount++;
                    const timeLeft = cropData.growthTime - growthTime;
                    plotStatus += `**Plot ${index + 1}:** ${cropData.emoji} ${cropData.name} (${progress}%)\n`;
                    plotStatus += `└ Ready <t:${Math.floor((plot.plantedAt + cropData.growthTime) / 1000)}:R>\n`;
                }
            } else {
                plotStatus += `**Plot ${index + 1}:** Empty 🌱\n`;
            }
        });

        embed.addFields(
            { name: '🎯 Quick Stats', value: `**Ready:** ${readyCount}\n**Growing:** ${growingCount}\n**Empty:** ${player.farming.plots.length - readyCount - growingCount}`, inline: true },
            { name: '🏡 Plot Details', value: plotStatus || 'No plots available', inline: false }
        );

        // Show inventory if exists
        if (player.inventory && player.inventory.crops && Object.keys(player.inventory.crops).length > 0) {
            let inventoryText = '';
            Object.entries(player.inventory.crops).forEach(([cropType, amount]) => {
                const cropData = crops[cropType];
                if (cropData && amount > 0) {
                    inventoryText += `${cropData.emoji} ${cropData.name}: ${amount}\n`;
                }
            });
            
            if (inventoryText) {
                embed.addFields({
                    name: '📦 Stored Crops',
                    value: inventoryText,
                    inline: true
                });
            }
        }

        // Action buttons
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('harvest_ready')
                    .setLabel(`Harvest Ready (${readyCount})`)
                    .setStyle(readyCount > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setEmoji('🌾')
                    .setDisabled(readyCount === 0),
                new ButtonBuilder()
                    .setCustomId('plant_empty')
                    .setLabel('Plant Empty Plots')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🌱'),
                new ButtonBuilder()
                    .setCustomId('sell_crops')
                    .setLabel('Sell Crops')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💰')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });
    },

    async sellCrops(interaction, player) {
        const cropType = interaction.options.getString('crop');
        const amount = interaction.options.getInteger('amount');

        if (!player.inventory || !player.inventory.crops || !player.inventory.crops[cropType] || player.inventory.crops[cropType] === 0) {
            await interaction.editReply({
                content: '❌ You don\'t have any of that crop to sell!',
                ephemeral: true
            });
            return;
        }

        const cropData = crops[cropType];
        const availableAmount = player.inventory.crops[cropType];
        const sellAmount = amount ? Math.min(amount, availableAmount) : availableAmount;
        const totalValue = sellAmount * cropData.sellPrice;

        // Apply market bonus for level
        const marketBonus = 1 + (player.farming.level - 1) * 0.05; // 5% bonus per level
        const finalValue = Math.floor(totalValue * marketBonus);

        player.inventory.crops[cropType] -= sellAmount;
        player.coins = (player.coins || 0) + finalValue;
        player.farming.totalValue = (player.farming.totalValue || 0) + finalValue;

        if (player.inventory.crops[cropType] === 0) {
            delete player.inventory.crops[cropType];
        }

        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💰 Crops Sold!')
            .setDescription(`You sold ${sellAmount}x ${cropData.emoji} **${cropData.name}**!`)
            .addFields(
                { name: '💵 Base Price', value: `${cropData.sellPrice} coins each`, inline: true },
                { name: '⚡ Market Bonus', value: `+${Math.floor((marketBonus - 1) * 100)}%`, inline: true },
                { name: '💰 Total Earned', value: `${finalValue} coins`, inline: true },
                { name: '💳 New Balance', value: `${player.coins} coins`, inline: true }
            );

        if (player.inventory.crops[cropType] > 0) {
            embed.addFields({
                name: '📦 Remaining',
                value: `${player.inventory.crops[cropType]} ${cropData.name}`,
                inline: true
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    calculateHarvest(player, plot, cropData) {
        // Base yield calculation
        const baseYield = Math.floor(Math.random() * (cropData.yield.max - cropData.yield.min + 1)) + cropData.yield.min;
        
        let multiplier = 1.0;
        let bonuses = [];
        
        // Level bonus (5% per level above crop requirement)
        if (player.farming.level > cropData.level) {
            const levelBonus = (player.farming.level - cropData.level) * 0.05;
            multiplier += levelBonus;
            bonuses.push(`Level: +${Math.floor(levelBonus * 100)}%`);
        }
        
        // Water bonus
        if (plot.wateredAt && (Date.now() - plot.wateredAt) < 3600000) { // Watered within last hour
            multiplier += 0.15;
            bonuses.push('Watered: +15%');
        }
        
        // Fertilizer bonus
        if (plot.fertilized) {
            multiplier += 0.25;
            bonuses.push('Fertilized: +25%');
        }
        
        // Perfect timing bonus (harvested within 10% of optimal time)
        const growthTime = Date.now() - plot.plantedAt;
        const optimalTime = cropData.growthTime;
        const timingRatio = growthTime / optimalTime;
        
        if (timingRatio <= 1.1) {
            multiplier += 0.1;
            bonuses.push('Perfect Timing: +10%');
        }
        
        // Calculate final yield
        const finalYield = Math.floor(baseYield * multiplier);
        const value = finalYield * cropData.sellPrice;
        const bonusPercentage = Math.floor((multiplier - 1) * 100);
        
        // Quality determination
        let quality = 'Normal';
        if (multiplier >= 1.5) quality = 'Excellent';
        else if (multiplier >= 1.3) quality = 'High';
        else if (multiplier >= 1.1) quality = 'Good';
        
        // Experience calculation
        let experience = cropData.xp;
        if (quality === 'Excellent') experience *= 2;
        else if (quality === 'High') experience *= 1.5;
        else if (quality === 'Good') experience *= 1.2;
        
        return {
            yield: finalYield,
            value: value,
            experience: Math.floor(experience),
            quality: quality,
            bonusPercentage: bonusPercentage,
            bonuses: bonuses,
            achievements: []
        };
    },

    updatePlayerAfterHarvest(player, plot, cropData, harvestResult) {
        // Add to inventory
        if (!player.inventory) player.inventory = {};
        if (!player.inventory.crops) player.inventory.crops = {};
        player.inventory.crops[plot.crop] = (player.inventory.crops[plot.crop] || 0) + harvestResult.yield;
        
        // Update farming stats
        player.farming.experience += harvestResult.experience;
        player.farming.harvests += 1;
        player.farming.totalValue = (player.farming.totalValue || 0) + harvestResult.value;
        
        // Check for best harvest record
        if (harvestResult.value > (player.farming.bestHarvest || 0)) {
            player.farming.bestHarvest = harvestResult.value;
            harvestResult.achievements.push('🏆 New Record - Best harvest value!');
        }
        
        // Level up check
        const oldLevel = player.farming.level;
        player.farming.level = Math.floor(player.farming.experience / 100) + 1;
        harvestResult.levelUp = player.farming.level > oldLevel;
        
        // Update last harvest time for streak tracking
        const today = new Date().toDateString();
        const lastHarvestDate = player.farming.lastHarvest ? new Date(player.farming.lastHarvest).toDateString() : null;
        
        if (lastHarvestDate !== today) {
            if (lastHarvestDate === new Date(Date.now() - 86400000).toDateString()) {
                // Consecutive day
                player.farming.streakDays = (player.farming.streakDays || 0) + 1;
            } else {
                // Streak broken or first harvest
                player.farming.streakDays = 1;
            }
            player.farming.lastHarvest = Date.now();
        }
        
        // Streak achievements
        if (player.farming.streakDays === 7) {
            harvestResult.achievements.push('🔥 Weekly Farmer - 7 day harvest streak!');
        } else if (player.farming.streakDays === 30) {
            harvestResult.achievements.push('🔥 Dedicated Farmer - 30 day harvest streak!');
        }
        
        // Harvest count achievements
        if (player.farming.harvests === 100) {
            harvestResult.achievements.push('🏆 Harvest Master - 100 total harvests!');
        } else if (player.farming.harvests === 500) {
            harvestResult.achievements.push('🏆 Harvest Legend - 500 total harvests!');
        }
    }
};
