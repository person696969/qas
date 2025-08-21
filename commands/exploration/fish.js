
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const fish = [
    { id: 'minnow', name: 'Tiny Minnow', rarity: 'common', value: 5, chance: 30, emoji: '🐟', size: 'tiny' },
    { id: 'trout', name: 'Rainbow Trout', rarity: 'common', value: 15, chance: 25, emoji: '🐟', size: 'small' },
    { id: 'bass', name: 'Large Bass', rarity: 'uncommon', value: 35, chance: 15, emoji: '🐠', size: 'medium' },
    { id: 'salmon', name: 'Wild Salmon', rarity: 'uncommon', value: 50, chance: 12, emoji: '🐟', size: 'medium' },
    { id: 'tuna', name: 'Bluefin Tuna', rarity: 'rare', value: 100, chance: 8, emoji: '🐟', size: 'large' },
    { id: 'shark', name: 'Tiger Shark', rarity: 'rare', value: 200, chance: 5, emoji: '🦈', size: 'huge' },
    { id: 'kraken', name: 'Baby Kraken', rarity: 'legendary', value: 500, chance: 2, emoji: '🐙', size: 'massive' },
    { id: 'sea_dragon', name: 'Sea Dragon', rarity: 'mythical', value: 1000, chance: 0.5, emoji: '🐉', size: 'legendary' }
];

const treasures = [
    { id: 'bottle', name: 'Message in a Bottle', value: 25, chance: 5, emoji: '🍼' },
    { id: 'chest', name: 'Sunken Treasure Chest', value: 100, chance: 2, emoji: '📦' },
    { id: 'pearl', name: 'Giant Pearl', value: 200, chance: 1, emoji: '🔮' },
    { id: 'crown', name: 'Lost Crown', value: 500, chance: 0.5, emoji: '👑' }
];

const locations = {
    pond: { name: 'Village Pond', level: 1, multiplier: 1.0, special: 0.05, emoji: '🏞️', color: 0x7CFC00 },
    river: { name: 'Mountain River', level: 3, multiplier: 1.3, special: 0.08, emoji: '🏔️', color: 0x4169E1 },
    lake: { name: 'Crystal Lake', level: 5, multiplier: 1.6, special: 0.12, emoji: '💎', color: 0x20B2AA },
    ocean: { name: 'Deep Ocean', level: 8, multiplier: 2.0, special: 0.15, emoji: '🌊', color: 0x006994 },
    abyss: { name: 'Abyssal Depths', level: 15, multiplier: 3.0, special: 0.25, emoji: '🕳️', color: 0x000080 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('🎣 Cast your line and catch fish in various waters!')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Choose fishing location')
                .setRequired(false)
                .addChoices(
                    { name: '🏞️ Village Pond (Easy)', value: 'pond' },
                    { name: '🏔️ Mountain River (Medium)', value: 'river' },
                    { name: '💎 Crystal Lake (Hard)', value: 'lake' },
                    { name: '🌊 Deep Ocean (Expert)', value: 'ocean' },
                    { name: '🕳️ Abyssal Depths (Legendary)', value: 'abyss' }
                ))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('How long to fish (in minutes)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(30)),
    
    async execute(interaction) {
        try {
            const location = interaction.options?.getString('location');
            const duration = interaction.options?.getInteger('duration');
            const userId = interaction.user.id;
            
            let userData = await db.getPlayer(userId);
            if (!userData) {
                userData = {
                    inventory: { coins: 100, items: [] },
                    stats: { fishing: 1, fishingExp: 0 },
                    cooldowns: {}
                };
                await db.setPlayer(userId, userData);
            }

            // Initialize fishing data if missing
            if (!userData.stats) userData.stats = { fishing: 1, fishingExp: 0 };
            if (!userData.cooldowns) userData.cooldowns = {};
            if (!userData.inventory) userData.inventory = { coins: 100, items: [] };

            if (!location) {
                await this.showFishingMenu(interaction, userData);
                return;
            }

            // Check cooldown
            const lastFish = userData.cooldowns?.fishing || 0;
            const cooldownTime = 30000; // 30 seconds
            const timeSinceLastFish = Date.now() - lastFish;
            
            if (timeSinceLastFish < cooldownTime) {
                const timeLeft = Math.ceil((cooldownTime - timeSinceLastFish) / 1000);
                const embed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('⏰ Fishing Cooldown')
                    .setDescription(`You need to wait **${timeLeft} seconds** before fishing again!`)
                    .addFields({ name: '💡 Tip', value: 'Use this time to check your inventory or visit the shop!' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }
            
            const locationData = locations[location];
            if (!locationData) {
                await interaction.reply({ content: '❌ Invalid location selected!', ephemeral: true });
                return;
            }

            const fishingLevel = userData.stats?.fishing || 1;
            
            if (fishingLevel < locationData.level) {
                const embed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('🚫 Location Locked')
                    .setDescription(`You need fishing level **${locationData.level}** to fish at ${locationData.name}!`)
                    .addFields(
                        { name: '🎯 Your Level', value: `${fishingLevel}`, inline: true },
                        { name: '📈 Required Level', value: `${locationData.level}`, inline: true },
                        { name: '💡 How to Level Up', value: 'Fish at easier locations to gain experience!', inline: false }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }
            
            await interaction.deferReply();
            
            // Simulate fishing
            const fishingDuration = duration || 10;
            const results = this.simulateFishing(location, fishingDuration, fishingLevel);
            
            // Update user data
            userData.stats.fishingExp = (userData.stats.fishingExp || 0) + results.experience;
            userData.inventory.coins = (userData.inventory.coins || 0) + results.totalValue;
            userData.cooldowns.fishing = Date.now();
            
            // Add caught items to inventory
            if (!userData.inventory.items) userData.inventory.items = [];
            results.items.forEach(item => {
                userData.inventory.items.push({
                    id: item.id,
                    name: item.name,
                    category: item.category || 'fish',
                    value: item.value,
                    rarity: item.rarity || 'common',
                    emoji: item.emoji,
                    caughtAt: Date.now(),
                    caughtLocation: location,
                    size: item.size
                });
            });
            
            // Check for level up
            const newLevel = Math.floor(userData.stats.fishingExp / 100) + 1;
            const leveledUp = newLevel > fishingLevel;
            if (leveledUp) {
                userData.stats.fishing = newLevel;
            }
            
            // Update fishing statistics
            userData.stats.totalFish = (userData.stats.totalFish || 0) + results.fish.length;
            userData.stats.fishingTime = (userData.stats.fishingTime || 0) + fishingDuration;
            userData.stats.biggestCatch = Math.max(userData.stats.biggestCatch || 0, results.biggestValue || 0);
            
            await db.setPlayer(userId, userData);
            
            // Create enhanced results embed
            const embed = new EmbedBuilder()
                .setColor(locationData.color)
                .setTitle(`🎣 Fishing Results: ${locationData.name}`)
                .setDescription(`**${fishingDuration} minutes of peaceful fishing**\n${results.specialEvent ? `✨ ${results.specialEvent}` : ''}`)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .addFields([
                    {
                        name: '🎣 Fishing Session',
                        value: `📍 **Location:** ${locationData.name}\n⏰ **Duration:** ${fishingDuration} minutes\n🎯 **Your Level:** ${userData.stats.fishing}\n${leveledUp ? '🎉 **LEVEL UP!**' : ''}`,
                        inline: true
                    },
                    {
                        name: '🐟 Catch Summary',
                        value: `🐠 **Fish Caught:** ${results.fish.length}\n🎁 **Treasures Found:** ${results.treasures.length}\n💰 **Total Value:** ${results.totalValue} coins\n💎 **Best Catch:** ${results.biggestValue || 0} coins`,
                        inline: true
                    },
                    {
                        name: '📈 Experience & Stats',
                        value: `🎯 **XP Gained:** +${results.experience}\n📊 **Total XP:** ${userData.stats.fishingExp}\n🏆 **Total Fish:** ${userData.stats.totalFish}\n⏱️ **Fishing Time:** ${userData.stats.fishingTime}m`,
                        inline: true
                    }
                ]);
                
            // Add caught fish details with enhanced formatting
            if (results.fish.length > 0) {
                const fishByRarity = this.groupByRarity(results.fish);
                let fishText = '';
                
                Object.entries(fishByRarity).forEach(([rarity, fishList]) => {
                    if (fishList.length > 0) {
                        const rarityEmoji = this.getRarityEmoji(rarity);
                        fishText += `${rarityEmoji} **${rarity.toUpperCase()}** (${fishList.length})\n`;
                        fishList.forEach(fishItem => {
                            fishText += `   ${fishItem.emoji} ${fishItem.name} *(${fishItem.value} coins)*\n`;
                        });
                        fishText += '\n';
                    }
                });
                
                embed.addFields([
                    { name: '🐠 Fish Caught', value: fishText || 'No fish this time!', inline: false }
                ]);
            }
            
            // Add treasures found
            if (results.treasures.length > 0) {
                const treasureText = results.treasures.map(treasure => 
                    `${treasure.emoji} **${treasure.name}** *(${treasure.value} coins)*`
                ).join('\n');
                
                embed.addFields([
                    { name: '🏴‍☠️ Treasures Discovered', value: treasureText, inline: false }
                ]);
            }
            
            // Enhanced action buttons
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('fish_again')
                        .setLabel('🎣 Fish Again')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(timeSinceLastFish < cooldownTime),
                    new ButtonBuilder()
                        .setCustomId('fishing_records')
                        .setLabel('📊 View Records')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('sell_catch')
                        .setLabel('💰 Sell Catch')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(results.totalValue === 0),
                    new ButtonBuilder()
                        .setCustomId('cook_fish')
                        .setLabel('🍳 Cook Fish')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(results.fish.length === 0)
                );
                
            await interaction.editReply({ embeds: [embed], components: [buttons] });
            
        } catch (error) {
            console.error('Fishing command error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fishing. Please try again.',
                ephemeral: true
            });
        }
    },

    async showFishingMenu(interaction, userData) {
        const embed = new EmbedBuilder()
            .setColor('#4682B4')
            .setTitle('🎣 Fishing Expedition Center')
            .setDescription('╔═══════════════════════════════════════╗\n║          **FISHING HEADQUARTERS**           ║\n╚═══════════════════════════════════════╝')
            .setThumbnail('https://cdn.discordapp.com/emojis/🎣.png')
            .addFields(
                {
                    name: '🎯 **Fishing Stats**',
                    value: `**Level:** ${userData.stats.fishing || 1}\n**Experience:** ${userData.stats.fishingExp || 0}\n**Total Fish Caught:** ${userData.stats.totalFish || 0}\n**Best Catch Value:** ${userData.stats.biggestCatch || 0} coins`,
                    inline: true
                },
                {
                    name: '⚡ **Current Status**',
                    value: `**Energy:** 100/100\n**Rod Condition:** Excellent\n**Bait:** Standard\n**Weather:** Perfect`,
                    inline: true
                },
                {
                    name: '🏆 **Today\'s Progress**',
                    value: `**Fish Caught:** ${userData.stats.dailyFish || 0}\n**Treasures Found:** ${userData.stats.dailyTreasures || 0}\n**Coins Earned:** ${userData.stats.dailyCoins || 0}💰`,
                    inline: true
                }
            );

        // Add location information
        let locationsText = '';
        Object.entries(locations).forEach(([key, location]) => {
            const canAccess = userData.stats.fishing >= location.level;
            const status = canAccess ? '✅' : '🔒';
            locationsText += `${status} ${location.emoji} **${location.name}** *(Level ${location.level}+)*\n`;
            locationsText += `   Multiplier: ${location.multiplier}x • Special: ${(location.special * 100).toFixed(1)}%\n\n`;
        });

        embed.addFields({
            name: '🗺️ **Available Locations**',
            value: locationsText,
            inline: false
        });

        const locationSelect = new StringSelectMenuBuilder()
            .setCustomId('fishing_location')
            .setPlaceholder('🎯 Select a fishing location')
            .addOptions(
                Object.entries(locations).map(([key, location]) => ({
                    label: location.name,
                    value: key,
                    description: `Level ${location.level}+ • ${location.multiplier}x multiplier`,
                    emoji: location.emoji
                }))
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('fishing_equipment')
                    .setLabel('Manage Equipment')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎣'),
                new ButtonBuilder()
                    .setCustomId('fishing_leaderboard')
                    .setLabel('Leaderboard')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('fishing_shop')
                    .setLabel('Fishing Shop')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏪')
            );

        const selectRow = new ActionRowBuilder().addComponents(locationSelect);

        await interaction.reply({
            embeds: [embed],
            components: [selectRow, buttons]
        });
    },
    
    simulateFishing(location, duration, fishingLevel) {
        const locationData = locations[location];
        const results = {
            fish: [],
            treasures: [],
            items: [],
            totalValue: 0,
            experience: duration * 3,
            biggestValue: 0
        };
        
        const attempts = duration * (1 + Math.floor(fishingLevel / 3));
        
        for (let i = 0; i < attempts; i++) {
            const fishChance = Math.random() * 100;
            let cumulativeChance = 0;
            
            for (const fishItem of fish) {
                const adjustedChance = fishItem.chance * locationData.multiplier;
                cumulativeChance += adjustedChance;
                
                if (fishChance <= cumulativeChance) {
                    results.fish.push(fishItem);
                    results.items.push(fishItem);
                    results.totalValue += fishItem.value;
                    results.biggestValue = Math.max(results.biggestValue, fishItem.value);
                    
                    if (fishItem.rarity === 'rare') results.experience += 15;
                    else if (fishItem.rarity === 'legendary') results.experience += 30;
                    else if (fishItem.rarity === 'mythical') results.experience += 50;
                    
                    break;
                }
            }
            
            const treasureChance = Math.random() * 100;
            if (treasureChance <= locationData.special * 100) {
                let treasureCumulativeChance = 0;
                for (const treasure of treasures) {
                    treasureCumulativeChance += treasure.chance;
                    if (Math.random() * 100 <= treasureCumulativeChance) {
                        results.treasures.push(treasure);
                        results.items.push({ ...treasure, category: 'treasure' });
                        results.totalValue += treasure.value;
                        results.experience += 25;
                        break;
                    }
                }
            }
        }
        
        if (Math.random() < 0.1) {
            const events = [
                'A school of fish swims by, increasing your catch!',
                'You spot a rare fishing spot and cast your line perfectly!',
                'The weather conditions are absolutely perfect for fishing!',
                'A friendly dolphin helps guide fish to your hook!',
                'You discover an ancient fishing technique carved in nearby stones!'
            ];
            results.specialEvent = events[Math.floor(Math.random() * events.length)];
            results.experience += 20;
            
            if (Math.random() < 0.5) {
                const bonusFish = fish[Math.floor(Math.random() * fish.length)];
                results.fish.push(bonusFish);
                results.items.push(bonusFish);
                results.totalValue += bonusFish.value;
            }
        }
        
        return results;
    },
    
    groupByRarity(items) {
        const grouped = {};
        items.forEach(item => {
            if (!grouped[item.rarity]) grouped[item.rarity] = [];
            grouped[item.rarity].push(item);
        });
        return grouped;
    },
    
    getRarityEmoji(rarity) {
        const emojis = {
            common: '⚪',
            uncommon: '🟢',
            rare: '🔵',
            legendary: '🟣',
            mythical: '🌟'
        };
        return emojis[rarity] || '⚪';
    }
};
