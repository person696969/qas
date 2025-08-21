
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

// Enhanced fish types with detailed properties
const fishTypes = {
    common: {
        fish: [
            { name: 'Herring', value: 8, emoji: '🐟', xp: 5, description: 'A shiny silver fish common in coastal waters' },
            { name: 'Mackerel', value: 12, emoji: '🐟', xp: 7, description: 'A striped fish with tender meat' },
            { name: 'Cod', value: 15, emoji: '🐟', xp: 10, description: 'A white fish prized by chefs' },
            { name: 'Anchovy', value: 6, emoji: '🐟', xp: 4, description: 'Small but flavorful fish' },
            { name: 'Sardine', value: 7, emoji: '🐟', xp: 5, description: 'Perfect for grilling whole' }
        ],
        chance: 0.55,
        color: '#32CD32'
    },
    uncommon: {
        fish: [
            { name: 'Salmon', value: 25, emoji: '🐠', xp: 15, description: 'Pink-fleshed fish that swims upstream' },
            { name: 'Tuna', value: 35, emoji: '🐠', xp: 20, description: 'Fast-swimming fish with rich flavor' },
            { name: 'Bass', value: 30, emoji: '🐠', xp: 18, description: 'Freshwater fighter with firm flesh' },
            { name: 'Rainbow Trout', value: 28, emoji: '🐠', xp: 16, description: 'Beautiful fish with rainbow stripes' },
            { name: 'Sea Bream', value: 32, emoji: '🐠', xp: 19, description: 'Delicate white fish from warm waters' }
        ],
        chance: 0.30,
        color: '#4169E1'
    },
    rare: {
        fish: [
            { name: 'Swordfish', value: 75, emoji: '🦈', xp: 40, description: 'Majestic fish with a sword-like bill' },
            { name: 'Marlin', value: 85, emoji: '🦈', xp: 45, description: 'Powerful deep-sea predator' },
            { name: 'Giant Squid', value: 100, emoji: '🦑', xp: 50, description: 'Mysterious creature from the depths' },
            { name: 'Manta Ray', value: 90, emoji: '🦈', xp: 48, description: 'Graceful giant of the ocean' },
            { name: 'Shark', value: 120, emoji: '🦈', xp: 60, description: 'Apex predator of the seas' }
        ],
        chance: 0.12,
        color: '#9932CC'
    },
    legendary: {
        fish: [
            { name: 'Golden Fish', value: 300, emoji: '✨', xp: 100, description: 'Mythical fish that grants wishes' },
            { name: 'Kraken', value: 500, emoji: '🐙', xp: 150, description: 'Legendary sea monster of immense size' },
            { name: 'Leviathan', value: 750, emoji: '🐋', xp: 200, description: 'Ancient whale of colossal proportions' },
            { name: 'Dragon Fish', value: 1000, emoji: '🐉', xp: 250, description: 'Mystical serpent of the deepest trenches' },
            { name: 'Phoenix Koi', value: 1200, emoji: '🔥', xp: 300, description: 'Reborn fish that burns with eternal flame' }
        ],
        chance: 0.03,
        color: '#FFD700'
    }
};

// Enhanced locations with unique properties
const locations = {
    coast: {
        name: 'Coastal Waters',
        emoji: '🌊',
        description: 'Calm waters perfect for beginners',
        modifier: 1.0,
        minLevel: 1,
        specialBonus: 'None',
        weather: 'Clear skies'
    },
    river: {
        name: 'Mountain River',
        emoji: '🏞️',
        description: 'Fast-flowing waters with fresh fish',
        modifier: 1.2,
        minLevel: 3,
        specialBonus: '+20% Uncommon fish',
        weather: 'Cool breeze'
    },
    deep: {
        name: 'Deep Ocean',
        emoji: '🌊',
        description: 'Dangerous depths with valuable catches',
        modifier: 1.5,
        minLevel: 10,
        specialBonus: '+50% Rare fish',
        weather: 'Rough seas'
    },
    mystic: {
        name: 'Mystic Lake',
        emoji: '✨',
        description: 'Magical waters harboring legendary creatures',
        modifier: 2.0,
        minLevel: 20,
        specialBonus: '+200% Legendary fish',
        weather: 'Aurora lights'
    },
    abyss: {
        name: 'Abyssal Depths',
        emoji: '🌑',
        description: 'The darkest depths where monsters dwell',
        modifier: 3.0,
        minLevel: 30,
        specialBonus: 'Exclusive legendary fish',
        weather: 'Eternal darkness'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cast')
        .setDescription('🎣 Cast your line in mystical waters')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Choose your fishing destination')
                .setRequired(false)
                .addChoices(
                    { name: '🌊 Coastal Waters (Level 1+)', value: 'coast' },
                    { name: '🏞️ Mountain River (Level 3+)', value: 'river' },
                    { name: '🌊 Deep Ocean (Level 10+)', value: 'deep' },
                    { name: '✨ Mystic Lake (Level 20+)', value: 'mystic' },
                    { name: '🌑 Abyssal Depths (Level 30+)', value: 'abyss' }
                ))
        .addStringOption(option =>
            option.setName('bait')
                .setDescription('Select your bait type')
                .setRequired(false)
                .addChoices(
                    { name: '🪱 Worms (1.2x)', value: 'worm' },
                    { name: '🐟 Minnows (1.5x)', value: 'minnow' },
                    { name: '🦐 Magic Shrimp (2.0x)', value: 'shrimp' },
                    { name: '⭐ Celestial Lure (3.0x)', value: 'celestial' }
                ))
        .addBooleanOption(option =>
            option.setName('auto_sell')
                .setDescription('Automatically sell common fish')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const userId = interaction.user.id;
            const location = interaction.options.getString('location') || 'coast';
            const baitType = interaction.options.getString('bait');
            const autoSell = interaction.options.getBoolean('auto_sell') || false;

            // Get player data with enhanced defaults
            const player = await db.getPlayer(userId) || {
                fishingLevel: 1,
                fishingExp: 0,
                equipment: {
                    rod: 'wooden_rod',
                    bait: ['worm', 'worm', 'worm'],
                    accessories: []
                },
                fishCaught: {
                    common: 0,
                    uncommon: 0,
                    rare: 0,
                    legendary: 0
                },
                achievements: [],
                coins: 100,
                rodDurability: 50,
                energy: 100,
                streak: 0
            };

            const selectedLocation = locations[location];

            // Level requirement check
            if (player.fishingLevel < selectedLocation.minLevel) {
                const levelEmbed = new EmbedBuilder()
                    .setColor('#FF4500')
                    .setTitle('🚫 Access Restricted')
                    .setDescription(`**${selectedLocation.emoji} ${selectedLocation.name}** requires Fishing Level **${selectedLocation.minLevel}**!`)
                    .addFields(
                        { name: 'Your Level', value: player.fishingLevel.toString(), inline: true },
                        { name: 'Required', value: selectedLocation.minLevel.toString(), inline: true },
                        { name: 'Levels Needed', value: (selectedLocation.minLevel - player.fishingLevel).toString(), inline: true }
                    )
                    .setFooter({ text: 'Keep fishing to level up and unlock new areas!' });

                await interaction.editReply({ embeds: [levelEmbed] });
                return;
            }

            // Energy check
            const energyCost = Math.floor(10 + (selectedLocation.minLevel * 2));
            if (player.energy < energyCost) {
                const energyEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('😴 Not Enough Energy')
                    .setDescription(`Fishing at **${selectedLocation.name}** requires **${energyCost}** energy!`)
                    .addFields(
                        { name: 'Your Energy', value: `${player.energy}/100`, inline: true },
                        { name: 'Required', value: energyCost.toString(), inline: true },
                        { name: 'Rest Time', value: '30 minutes', inline: true }
                    )
                    .setFooter({ text: 'Energy regenerates over time or use energy potions!' });

                await interaction.editReply({ embeds: [energyEmbed] });
                return;
            }

            // Rod durability check
            if (player.rodDurability <= 0) {
                const repairEmbed = new EmbedBuilder()
                    .setColor('#DC143C')
                    .setTitle('🔧 Rod Broken')
                    .setDescription('Your fishing rod is completely broken and needs repair!')
                    .addFields(
                        { name: 'Current Durability', value: '0/100', inline: true },
                        { name: 'Repair Cost', value: '100 coins', inline: true },
                        { name: 'Visit', value: 'Tackle Shop', inline: true }
                    )
                    .setFooter({ text: 'Use /tackle repair to fix your rod!' });

                await interaction.editReply({ embeds: [repairEmbed] });
                return;
            }

            // Bait availability check
            if (baitType && !player.equipment.bait.includes(baitType)) {
                const baitEmbed = new EmbedBuilder()
                    .setColor('#FF6347')
                    .setTitle('🎣 No Bait Available')
                    .setDescription(`You don't have any **${baitType}** bait!`)
                    .addFields({
                        name: 'Available Bait',
                        value: player.equipment.bait.length > 0 
                            ? player.equipment.bait.join(', ')
                            : 'None - visit the tackle shop!',
                        inline: false
                    })
                    .setFooter({ text: 'Use /tackle shop to buy more bait!' });

                await interaction.editReply({ embeds: [baitEmbed] });
                return;
            }

            // Calculate fishing success and bonuses
            let catchModifier = selectedLocation.modifier;
            let baitBonus = 1.0;
            let baitName = 'None';

            // Apply bait bonuses
            if (baitType) {
                switch (baitType) {
                    case 'worm': 
                        baitBonus = 1.2; 
                        baitName = '🪱 Worms';
                        break;
                    case 'minnow': 
                        baitBonus = 1.5; 
                        baitName = '🐟 Minnows';
                        break;
                    case 'shrimp': 
                        baitBonus = 2.0; 
                        baitName = '🦐 Magic Shrimp';
                        break;
                    case 'celestial': 
                        baitBonus = 3.0; 
                        baitName = '⭐ Celestial Lure';
                        break;
                }
            }

            // Rod quality bonus
            const rodBonuses = {
                wooden_rod: 1.0,
                bamboo_rod: 1.2,
                carbon_rod: 1.5,
                mythril_rod: 2.0,
                legendary_rod: 3.0
            };
            const rodBonus = rodBonuses[player.equipment.rod] || 1.0;

            // Level and streak bonuses
            const levelBonus = 1 + (player.fishingLevel * 0.02);
            const streakBonus = 1 + Math.min(player.streak * 0.01, 0.5);

            const totalMultiplier = catchModifier * baitBonus * rodBonus * levelBonus * streakBonus;

            // Determine what was caught
            const catchRoll = Math.random() * totalMultiplier;
            let fishRarity = 'common';
            let rarityBonus = 0;

            if (catchRoll > 0.97) {
                fishRarity = 'legendary';
                rarityBonus = 200;
            } else if (catchRoll > 0.88) {
                fishRarity = 'rare';
                rarityBonus = 100;
            } else if (catchRoll > 0.58) {
                fishRarity = 'uncommon';
                rarityBonus = 50;
            }

            const fishCategory = fishTypes[fishRarity];
            const caughtFish = fishCategory.fish[Math.floor(Math.random() * fishCategory.fish.length)];

            // Update player stats
            const expGain = caughtFish.xp + rarityBonus + Math.floor(selectedLocation.minLevel * 2);
            const oldLevel = player.fishingLevel;
            
            player.energy -= energyCost;
            player.rodDurability = Math.max(0, player.rodDurability - 1);
            player.fishingExp += expGain;
            player.fishCaught[fishRarity]++;
            player.streak++;

            // Level up calculation
            while (player.fishingExp >= Math.pow(player.fishingLevel, 2) * 100) {
                player.fishingLevel++;
            }

            // Auto-sell logic
            let coinGain = 0;
            let soldFish = false;
            if (autoSell && fishRarity === 'common') {
                coinGain = caughtFish.value;
                player.coins += coinGain;
                soldFish = true;
            } else {
                // Add to inventory
                if (!player.inventory) player.inventory = {};
                if (!player.inventory.fish) player.inventory.fish = {};
                player.inventory.fish[caughtFish.name] = (player.inventory.fish[caughtFish.name] || 0) + 1;
            }

            // Remove used bait
            if (baitType) {
                const baitIndex = player.equipment.bait.indexOf(baitType);
                if (baitIndex > -1) {
                    player.equipment.bait.splice(baitIndex, 1);
                }
            }

            // Check for achievements
            const newAchievements = [];
            const totalCaught = Object.values(player.fishCaught).reduce((a, b) => a + b, 0);
            
            if (totalCaught === 1) newAchievements.push('🎣 First Catch');
            if (totalCaught === 100) newAchievements.push('🐟 Century Fisher');
            if (player.fishCaught.legendary >= 1 && !player.achievements.includes('🐉 Legend Hunter')) {
                newAchievements.push('🐉 Legend Hunter');
            }
            if (player.streak === 10) newAchievements.push('🔥 Hot Streak');

            player.achievements = [...(player.achievements || []), ...newAchievements];

            await db.updatePlayer(userId, player);

            // Create detailed result embed
            const resultEmbed = new EmbedBuilder()
                .setColor(fishCategory.color)
                .setTitle(`🎣 Fishing Results - ${selectedLocation.emoji} ${selectedLocation.name}`)
                .setDescription(`**${caughtFish.emoji} Caught a ${caughtFish.name}!**\n*${caughtFish.description}*`)
                .addFields(
                    { name: '💰 Value', value: `${caughtFish.value} coins`, inline: true },
                    { name: '✨ Experience', value: `+${expGain} XP`, inline: true },
                    { name: '🎯 Rarity', value: fishRarity.toUpperCase(), inline: true },
                    { name: '🎣 Rod Condition', value: `${player.rodDurability}/100`, inline: true },
                    { name: '⚡ Energy', value: `${player.energy}/100`, inline: true },
                    { name: '🔥 Streak', value: `${player.streak} catches`, inline: true },
                    { name: '🎣 Fishing Level', value: `${player.fishingLevel} (${player.fishingExp}/${Math.pow(player.fishingLevel, 2) * 100} XP)`, inline: true },
                    { name: '🌊 Location Bonus', value: selectedLocation.specialBonus, inline: true },
                    { name: '🎪 Bait Used', value: baitName, inline: true }
                );

            if (soldFish) {
                resultEmbed.addFields({
                    name: '💸 Auto-Sold',
                    value: `+${coinGain} coins`,
                    inline: true
                });
            }

            if (player.fishingLevel > oldLevel) {
                resultEmbed.addFields({
                    name: '🎉 LEVEL UP!',
                    value: `Fishing Level ${oldLevel} → ${player.fishingLevel}!`,
                    inline: false
                });
            }

            if (newAchievements.length > 0) {
                resultEmbed.addFields({
                    name: '🏆 New Achievements!',
                    value: newAchievements.join('\n'),
                    inline: false
                });
            }

            // Create action buttons
            const actionRow1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`cast_again_${location}`)
                        .setLabel('Cast Again')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎣')
                        .setDisabled(player.energy < energyCost || player.rodDurability <= 0),
                    new ButtonBuilder()
                        .setCustomId('fishing_inventory')
                        .setLabel('Fish Bag')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🎒'),
                    new ButtonBuilder()
                        .setCustomId('sell_fish')
                        .setLabel('Sell Fish')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('💰')
                );

            const actionRow2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('tackle_shop')
                        .setLabel('Tackle Shop')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🏪'),
                    new ButtonBuilder()
                        .setCustomId('fishing_stats')
                        .setLabel('Statistics')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📊'),
                    new ButtonBuilder()
                        .setCustomId('change_location')
                        .setLabel('Change Location')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🗺️')
                );

            await interaction.editReply({
                embeds: [resultEmbed],
                components: [actionRow1, actionRow2]
            });

        } catch (error) {
            console.error('Error in cast command:', error);
            await interaction.editReply({
                content: '❌ An unexpected error occurred while fishing. The fish got away!',
                ephemeral: true
            });
        }
    }
};
