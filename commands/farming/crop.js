
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const crops = {
    wheat: {
        name: 'Wheat',
        emoji: '🌾',
        growthTime: 1800000, // 30 minutes
        waterNeeded: 2,
        seedCost: 50,
        baseYield: { min: 3, max: 6 },
        sellPrice: 25,
        experience: 20,
        level: 1,
        seasons: ['spring', 'summer', 'fall']
    },
    carrot: {
        name: 'Carrot',
        emoji: '🥕',
        growthTime: 3600000, // 1 hour
        waterNeeded: 3,
        seedCost: 75,
        baseYield: { min: 4, max: 8 },
        sellPrice: 35,
        experience: 30,
        level: 3,
        seasons: ['spring', 'fall', 'winter']
    },
    potato: {
        name: 'Potato',
        emoji: '🥔',
        growthTime: 5400000, // 1.5 hours
        waterNeeded: 4,
        seedCost: 100,
        baseYield: { min: 5, max: 10 },
        sellPrice: 40,
        experience: 40,
        level: 5,
        seasons: ['spring', 'summer', 'fall']
    },
    tomato: {
        name: 'Tomato',
        emoji: '🍅',
        growthTime: 7200000, // 2 hours
        waterNeeded: 5,
        seedCost: 150,
        baseYield: { min: 6, max: 12 },
        sellPrice: 50,
        experience: 50,
        level: 8,
        seasons: ['spring', 'summer']
    },
    herbs: {
        name: 'Herbs',
        emoji: '🌿',
        growthTime: 10800000, // 3 hours
        waterNeeded: 6,
        seedCost: 200,
        baseYield: { min: 2, max: 5 },
        sellPrice: 80,
        experience: 75,
        level: 12,
        seasons: ['spring', 'summer', 'fall']
    },
    magic_flower: {
        name: 'Magic Flower',
        emoji: '🌸',
        growthTime: 21600000, // 6 hours
        waterNeeded: 8,
        seedCost: 500,
        baseYield: { min: 1, max: 3 },
        sellPrice: 300,
        experience: 150,
        level: 20,
        seasons: ['spring', 'summer']
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crop')
        .setDescription('🌾 Manage your crops and farming operations')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View information about available crops'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('plant')
                .setDescription('Plant crops in your farm plots')
                .addStringOption(option =>
                    option.setName('crop')
                        .setDescription('Type of crop to plant')
                        .setRequired(true)
                        .addChoices(
                            { name: '🌾 Wheat', value: 'wheat' },
                            { name: '🥕 Carrot', value: 'carrot' },
                            { name: '🥔 Potato', value: 'potato' },
                            { name: '🍅 Tomato', value: 'tomato' },
                            { name: '🌿 Herbs', value: 'herbs' },
                            { name: '🌸 Magic Flower', value: 'magic_flower' }
                        ))
                .addIntegerOption(option =>
                    option.setName('plot')
                        .setDescription('Plot number to plant in')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('harvest')
                .setDescription('Harvest mature crops')
                .addIntegerOption(option =>
                    option.setName('plot')
                        .setDescription('Plot number to harvest')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check the status of all your crops'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sell')
                .setDescription('Sell harvested crops')
                .addStringOption(option =>
                    option.setName('crop')
                        .setDescription('Type of crop to sell')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to sell')
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
                    plots: [
                        { crop: null, water: 0, plantedAt: null, health: 100 },
                        { crop: null, water: 0, plantedAt: null, health: 100 },
                        { crop: null, water: 0, plantedAt: null, health: 100 }
                    ],
                    experience: 0,
                    level: 1,
                    lastWater: 0,
                    harvests: 0,
                    achievements: [],
                    inventory: {}
                };
            }

            switch (subcommand) {
                case 'info':
                    await this.showCropInfo(interaction, player);
                    break;
                case 'plant':
                    await this.plantCrop(interaction, player);
                    break;
                case 'harvest':
                    await this.harvestCrop(interaction, player);
                    break;
                case 'status':
                    await this.showStatus(interaction, player);
                    break;
                case 'sell':
                    await this.sellCrops(interaction, player);
                    break;
            }

        } catch (error) {
            console.error('Error in crop command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing crops.',
                ephemeral: true
            });
        }
    },

    async showCropInfo(interaction, player) {
        const currentSeason = this.getCurrentSeason();
        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('🌾 Crop Information')
            .setDescription(`**Current Season:** ${currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1)} 🌱\n\nChoose a crop to see detailed information:`)
            .addFields(
                { name: '👨‍🌾 Your Farming Level', value: player.farming.level.toString(), inline: true },
                { name: '💰 Available Coins', value: player.coins.toString(), inline: true },
                { name: '🏡 Available Plots', value: player.farming.plots.length.toString(), inline: true }
            );

        const options = Object.entries(crops).map(([key, crop]) => ({
            label: crop.name,
            description: `${this.formatTime(crop.growthTime)} | ${crop.seedCost} coins | Level ${crop.level}`,
            value: key,
            emoji: crop.emoji
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('crop_info_select')
            .setPlaceholder('Select a crop to view details')
            .addOptions(options);

        const components = [new ActionRowBuilder().addComponents(selectMenu)];

        const response = await interaction.editReply({
            embeds: [embed],
            components: components
        });

        const filter = i => i.user.id === interaction.user.id;
        const collector = response.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async selectInteraction => {
            try {
                const cropKey = selectInteraction.values[0];
                const crop = crops[cropKey];
                const canPlant = player.farming.level >= crop.level;
                const inSeason = crop.seasons.includes(currentSeason);

                const detailEmbed = new EmbedBuilder()
                    .setColor(canPlant ? '#32CD32' : '#FF6347')
                    .setTitle(`${crop.emoji} ${crop.name} Details`)
                    .setDescription(`${canPlant ? '✅' : '❌'} **Available** | ${inSeason ? '🌱' : '❄️'} **${inSeason ? 'In Season' : 'Out of Season'}**`)
                    .addFields(
                        { name: '💰 Seed Cost', value: `${crop.seedCost} coins`, inline: true },
                        { name: '⏰ Growth Time', value: this.formatTime(crop.growthTime), inline: true },
                        { name: '💧 Water Needed', value: crop.waterNeeded.toString(), inline: true },
                        { name: '📊 Level Required', value: crop.level.toString(), inline: true },
                        { name: '🌱 Base Yield', value: `${crop.baseYield.min}-${crop.baseYield.max}`, inline: true },
                        { name: '💵 Sell Price', value: `${crop.sellPrice} coins each`, inline: true },
                        { name: '🎯 Experience', value: `+${crop.experience} XP`, inline: true },
                        { name: '🗓️ Best Seasons', value: crop.seasons.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', '), inline: true },
                        { name: '💡 Profit Potential', value: `${(crop.sellPrice * crop.baseYield.min) - crop.seedCost} - ${(crop.sellPrice * crop.baseYield.max) - crop.seedCost} coins`, inline: true }
                    );

                await selectInteraction.update({
                    embeds: [detailEmbed],
                    components: components
                });
            } catch (error) {
                console.error('Error in crop info selection:', error);
            }
        });
    },

    async plantCrop(interaction, player) {
        const cropType = interaction.options.getString('crop');
        const plotNumber = interaction.options.getInteger('plot');
        const crop = crops[cropType];

        // Check requirements
        if (player.farming.level < crop.level) {
            await interaction.editReply({
                content: `❌ You need farming level ${crop.level} to plant ${crop.name}!`,
                ephemeral: true
            });
            return;
        }

        if (player.coins < crop.seedCost) {
            await interaction.editReply({
                content: `❌ You need ${crop.seedCost} coins to buy ${crop.name} seeds!`,
                ephemeral: true
            });
            return;
        }

        // Find available plot
        let targetPlot = plotNumber ? plotNumber - 1 : player.farming.plots.findIndex(plot => !plot.crop);
        
        if (plotNumber && (plotNumber < 1 || plotNumber > player.farming.plots.length)) {
            await interaction.editReply({
                content: '❌ Invalid plot number!',
                ephemeral: true
            });
            return;
        }

        if (targetPlot === -1) {
            await interaction.editReply({
                content: '❌ All plots are occupied! Harvest your crops first.',
                ephemeral: true
            });
            return;
        }

        if (player.farming.plots[targetPlot].crop) {
            await interaction.editReply({
                content: `❌ Plot ${targetPlot + 1} already has crops growing!`,
                ephemeral: true
            });
            return;
        }

        // Plant the crop
        player.coins -= crop.seedCost;
        player.farming.plots[targetPlot] = {
            crop: cropType,
            water: 0,
            plantedAt: Date.now(),
            health: 100
        };

        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('🌱 Crop Planted Successfully!')
            .setDescription(`You planted ${crop.emoji} **${crop.name}** in plot ${targetPlot + 1}!`)
            .addFields(
                { name: '💰 Cost', value: `${crop.seedCost} coins`, inline: true },
                { name: '⏰ Ready In', value: this.formatTime(crop.growthTime), inline: true },
                { name: '💧 Water Needed', value: `0/${crop.waterNeeded}`, inline: true },
                { name: '🎯 Expected XP', value: `+${crop.experience}`, inline: true },
                { name: '💰 Remaining Coins', value: player.coins.toString(), inline: true },
                { name: '📅 Ready At', value: `<t:${Math.floor((Date.now() + crop.growthTime) / 1000)}:F>`, inline: true }
            )
            .setFooter({ text: 'Remember to water your crops for better yields!' });

        await interaction.editReply({ embeds: [embed] });
    },

    async harvestCrop(interaction, player) {
        const plotNumber = interaction.options.getInteger('plot');
        
        if (plotNumber && (plotNumber < 1 || plotNumber > player.farming.plots.length)) {
            await interaction.editReply({
                content: '❌ Invalid plot number!',
                ephemeral: true
            });
            return;
        }

        // If no plot specified, harvest all ready crops
        if (!plotNumber) {
            await this.harvestAllReady(interaction, player);
            return;
        }

        const plot = player.farming.plots[plotNumber - 1];
        if (!plot.crop) {
            await interaction.editReply({
                content: `❌ Plot ${plotNumber} is empty!`,
                ephemeral: true
            });
            return;
        }

        const crop = crops[plot.crop];
        const growthTime = Date.now() - plot.plantedAt;
        
        if (growthTime < crop.growthTime || plot.water < crop.waterNeeded) {
            const timeLeft = crop.growthTime - growthTime;
            const progress = Math.floor((growthTime / crop.growthTime) * 100);
            
            await interaction.editReply({
                content: `❌ The ${crop.name} isn't ready yet!\n**Progress:** ${progress}%\n**Water:** ${plot.water}/${crop.waterNeeded}\n**Ready:** <t:${Math.floor((plot.plantedAt + crop.growthTime) / 1000)}:R>`,
                ephemeral: true
            });
            return;
        }

        // Calculate harvest yield
        const yield = await this.calculateYield(player, plot, crop);
        
        // Add to inventory
        if (!player.farming.inventory[plot.crop]) {
            player.farming.inventory[plot.crop] = 0;
        }
        player.farming.inventory[plot.crop] += yield;

        // Award experience
        player.farming.experience += crop.experience;
        player.farming.harvests += 1;

        // Check for level up
        const oldLevel = player.farming.level;
        player.farming.level = Math.floor(player.farming.experience / 100) + 1;

        // Clear plot
        player.farming.plots[plotNumber - 1] = {
            crop: null,
            water: 0,
            plantedAt: null,
            health: 100
        };

        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🌾 Harvest Complete!')
            .setDescription(`You harvested ${yield}x ${crop.emoji} **${crop.name}** from plot ${plotNumber}!`)
            .addFields(
                { name: '🎯 Experience Gained', value: `+${crop.experience} XP`, inline: true },
                { name: '👨‍🌾 Farming Level', value: player.farming.level.toString(), inline: true },
                { name: '📦 Total in Storage', value: player.farming.inventory[plot.crop].toString(), inline: true }
            );

        if (player.farming.level > oldLevel) {
            embed.addFields({
                name: '🎉 Level Up!',
                value: `Congratulations! You reached farming level ${player.farming.level}!`,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async harvestAllReady(interaction, player) {
        const readyPlots = [];
        const currentTime = Date.now();

        player.farming.plots.forEach((plot, index) => {
            if (plot.crop) {
                const crop = crops[plot.crop];
                const growthTime = currentTime - plot.plantedAt;
                if (growthTime >= crop.growthTime && plot.water >= crop.waterNeeded) {
                    readyPlots.push({ index, plot, crop });
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

        let totalExperience = 0;
        let harvestedCrops = {};

        for (const { index, plot, crop } of readyPlots) {
            const yield = await this.calculateYield(player, plot, crop);
            
            if (!player.farming.inventory[plot.crop]) {
                player.farming.inventory[plot.crop] = 0;
            }
            player.farming.inventory[plot.crop] += yield;

            if (!harvestedCrops[plot.crop]) {
                harvestedCrops[plot.crop] = { yield: 0, crop };
            }
            harvestedCrops[plot.crop].yield += yield;

            totalExperience += crop.experience;
            player.farming.harvests += 1;

            // Clear plot
            player.farming.plots[index] = {
                crop: null,
                water: 0,
                plantedAt: null,
                health: 100
            };
        }

        player.farming.experience += totalExperience;
        const oldLevel = player.farming.level;
        player.farming.level = Math.floor(player.farming.experience / 100) + 1;

        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🌾 Mass Harvest Complete!')
            .setDescription(`You harvested ${readyPlots.length} plots!`);

        let harvestText = '';
        Object.entries(harvestedCrops).forEach(([cropType, data]) => {
            harvestText += `${data.crop.emoji} ${data.crop.name}: ${data.yield}\n`;
        });

        embed.addFields(
            { name: '🎁 Harvested Crops', value: harvestText, inline: true },
            { name: '🎯 Total Experience', value: `+${totalExperience} XP`, inline: true },
            { name: '👨‍🌾 Farming Level', value: player.farming.level.toString(), inline: true }
        );

        if (player.farming.level > oldLevel) {
            embed.addFields({
                name: '🎉 Level Up!',
                value: `Congratulations! You reached farming level ${player.farming.level}!`,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async showStatus(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('🏡 Farm Status')
            .setDescription('**Your farming empire overview:**')
            .addFields(
                { name: '👨‍🌾 Farming Level', value: player.farming.level.toString(), inline: true },
                { name: '🎯 Experience', value: `${player.farming.experience}/100`, inline: true },
                { name: '🌾 Total Harvests', value: player.farming.harvests.toString(), inline: true }
            );

        // Plot status
        let plotStatus = '';
        const currentTime = Date.now();

        player.farming.plots.forEach((plot, index) => {
            if (plot.crop) {
                const crop = crops[plot.crop];
                const growthTime = currentTime - plot.plantedAt;
                const progress = Math.min(100, Math.floor((growthTime / crop.growthTime) * 100));
                const isReady = growthTime >= crop.growthTime && plot.water >= crop.waterNeeded;
                
                plotStatus += `**Plot ${index + 1}:** ${crop.emoji} ${crop.name}\n`;
                plotStatus += `Progress: ${this.getProgressBar(progress)} ${progress}%\n`;
                plotStatus += `Water: ${plot.water}/${crop.waterNeeded} ${isReady ? '✅' : '💧'}\n\n`;
            } else {
                plotStatus += `**Plot ${index + 1}:** Empty 🌱\n\n`;
            }
        });

        embed.addFields({ name: '🏡 Plot Status', value: plotStatus, inline: false });

        // Inventory
        if (Object.keys(player.farming.inventory).length > 0) {
            let inventoryText = '';
            Object.entries(player.farming.inventory).forEach(([cropType, amount]) => {
                const crop = crops[cropType];
                inventoryText += `${crop.emoji} ${crop.name}: ${amount}\n`;
            });
            embed.addFields({ name: '📦 Stored Crops', value: inventoryText, inline: true });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async sellCrops(interaction, player) {
        const cropType = interaction.options.getString('crop');
        const amount = interaction.options.getInteger('amount');

        if (!player.farming.inventory[cropType] || player.farming.inventory[cropType] === 0) {
            await interaction.editReply({
                content: '❌ You don\'t have any of that crop to sell!',
                ephemeral: true
            });
            return;
        }

        const crop = crops[cropType];
        const availableAmount = player.farming.inventory[cropType];
        const sellAmount = amount ? Math.min(amount, availableAmount) : availableAmount;
        const totalValue = sellAmount * crop.sellPrice;

        player.farming.inventory[cropType] -= sellAmount;
        player.coins += totalValue;

        if (player.farming.inventory[cropType] === 0) {
            delete player.farming.inventory[cropType];
        }

        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💰 Crops Sold!')
            .setDescription(`You sold ${sellAmount}x ${crop.emoji} **${crop.name}**!`)
            .addFields(
                { name: '💵 Price per Unit', value: `${crop.sellPrice} coins`, inline: true },
                { name: '💰 Total Earned', value: `${totalValue} coins`, inline: true },
                { name: '💳 New Balance', value: `${player.coins} coins`, inline: true }
            );

        if (player.farming.inventory[cropType] > 0) {
            embed.addFields({
                name: '📦 Remaining',
                value: `${player.farming.inventory[cropType]} ${crop.name}`,
                inline: true
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async calculateYield(player, plot, crop) {
        // Base yield
        const baseYield = Math.floor(Math.random() * (crop.baseYield.max - crop.baseYield.min + 1)) + crop.baseYield.min;
        
        // Bonuses
        let multiplier = 1.0;
        
        // Water bonus
        if (plot.water > crop.waterNeeded) {
            multiplier += 0.2; // 20% bonus for extra water
        }
        
        // Level bonus
        multiplier += (player.farming.level - 1) * 0.05; // 5% per level above 1
        
        // Health bonus
        multiplier += (plot.health / 100) * 0.1; // Up to 10% for perfect health
        
        return Math.floor(baseYield * multiplier);
    },

    getCurrentSeason() {
        const month = new Date().getMonth();
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'fall';
        return 'winter';
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
