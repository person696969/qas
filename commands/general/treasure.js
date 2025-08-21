
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');
const config = require('../../config.js');

const treasureLocations = [
    { 
        name: 'Ancient Cave', 
        difficulty: 'easy', 
        baseReward: 50, 
        emoji: '🕳️',
        description: 'A mysterious cave filled with ancient secrets',
        dangers: ['Bats', 'Dark passages', 'Loose rocks'],
        treasures: ['Gold coins', 'Ancient pottery', 'Gemstones']
    },
    { 
        name: 'Mystic Forest', 
        difficulty: 'medium', 
        baseReward: 100, 
        emoji: '🌲',
        description: 'An enchanted forest where magic flows freely',
        dangers: ['Wild creatures', 'Magical traps', 'Getting lost'],
        treasures: ['Enchanted items', 'Rare herbs', 'Magic crystals']
    },
    { 
        name: 'Dragon\'s Lair', 
        difficulty: 'hard', 
        baseReward: 200, 
        emoji: '🐲',
        description: 'The legendary home of an ancient dragon',
        dangers: ['Dragon fire', 'Deadly traps', 'Extreme heat'],
        treasures: ['Dragon scales', 'Royal treasure', 'Legendary weapons']
    },
    { 
        name: 'Underwater Grotto', 
        difficulty: 'medium', 
        baseReward: 120, 
        emoji: '🌊',
        description: 'A beautiful underwater cavern system',
        dangers: ['Drowning', 'Sea monsters', 'Strong currents'],
        treasures: ['Pearls', 'Coral jewelry', 'Sunken treasures']
    },
    { 
        name: 'Frozen Peaks', 
        difficulty: 'hard', 
        baseReward: 180, 
        emoji: '🏔️',
        description: 'Treacherous mountain peaks covered in eternal snow',
        dangers: ['Avalanches', 'Extreme cold', 'Ice creatures'],
        treasures: ['Ice crystals', 'Frozen artifacts', 'Yeti fur']
    },
    {
        name: 'Haunted Mansion',
        difficulty: 'expert',
        baseReward: 300,
        emoji: '🏚️',
        description: 'A spooky mansion with dark secrets',
        dangers: ['Ghosts', 'Cursed objects', 'Evil spirits'],
        treasures: ['Antique jewelry', 'Cursed gold', 'Spirit crystals']
    }
];

const treasures = [
    { name: 'Gold Coins', rarity: 'common', value: 25, emoji: '🪙', description: 'Standard golden currency' },
    { name: 'Silver Goblet', rarity: 'uncommon', value: 75, emoji: '🏆', description: 'An ornate drinking vessel' },
    { name: 'Rare Gem', rarity: 'rare', value: 150, emoji: '💎', description: 'A brilliantly cut precious stone' },
    { name: 'Ancient Artifact', rarity: 'epic', value: 300, emoji: '🏺', description: 'A relic from a lost civilization' },
    { name: 'Legendary Relic', rarity: 'legendary', value: 500, emoji: '⭐', description: 'An item of immense power and value' },
    { name: 'Mystic Orb', rarity: 'mythical', value: 1000, emoji: '🔮', description: 'A sphere containing ancient magic' }
];

const expeditionTypes = {
    quick: { duration: 300000, multiplier: 1, name: 'Quick Hunt' }, // 5 minutes
    standard: { duration: 900000, multiplier: 1.5, name: 'Standard Expedition' }, // 15 minutes
    extended: { duration: 1800000, multiplier: 2, name: 'Extended Expedition' } // 30 minutes
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('treasure')
        .setDescription('🏴‍☠️ Embark on epic treasure hunting adventures!')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Choose a location to search for treasure')
                .addChoices(
                    ...treasureLocations.map(loc => ({ 
                        name: `${loc.emoji} ${loc.name} (${loc.difficulty})`, 
                        value: loc.name.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '') 
                    }))
                ))
        .addStringOption(option =>
            option.setName('expedition')
                .setDescription('Choose expedition duration')
                .addChoices(
                    { name: '⚡ Quick Hunt (5min, 1x rewards)', value: 'quick' },
                    { name: '🗺️ Standard Expedition (15min, 1.5x rewards)', value: 'standard' },
                    { name: '🏛️ Extended Expedition (30min, 2x rewards)', value: 'extended' }
                )),

    async execute(interaction) {
        try {
            const selectedLocation = interaction.options.getString('location');
            const expeditionType = interaction.options.getString('expedition') || 'quick';
            
            if (selectedLocation) {
                await this.huntTreasure(interaction, selectedLocation, expeditionType);
            } else {
                await this.showTreasureMap(interaction);
            }
        } catch (error) {
            console.error('Treasure command error:', error);
            await interaction.reply({
                content: '❌ An error occurred during your treasure hunt.',
                ephemeral: true
            });
        }
    },

    async showTreasureMap(interaction) {
        const userData = await db.getPlayer(interaction.user.id);
        
        // Check for active expeditions
        const activeExpeditions = this.getActiveExpeditions(interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🗺️ Treasure Hunter\'s Atlas')
            .setDescription('**Welcome, brave adventurer!** Choose your destination and expedition type wisely.\n\n*The greater the risk, the greater the reward...*')
            .addFields([
                {
                    name: '📍 Available Locations',
                    value: treasureLocations.map(loc => {
                        const difficultyEmoji = { easy: '🟢', medium: '🟡', hard: '🔴', expert: '⚫' };
                        return `${loc.emoji} **${loc.name}** ${difficultyEmoji[loc.difficulty]}\n` +
                               `   • *${loc.description}*\n` +
                               `   • **Reward:** ${loc.baseReward}+ coins\n` +
                               `   • **Dangers:** ${loc.dangers.slice(0, 2).join(', ')}\n`;
                    }).join('\n'),
                    inline: false
                },
                {
                    name: '💰 Your Status',
                    value: `**Coins:** ${userData.coins?.toLocaleString() || 0}\n**Level:** ${userData.level || 1}\n**Energy:** ${this.getEnergyLevel(userData)}%\n**Total Hunts:** ${userData.statistics?.treasuresFound || 0}`,
                    inline: true
                },
                {
                    name: '🎒 Equipment Status',
                    value: `**Weapon:** ${this.getEquipmentStatus(userData, 'weapon')}\n**Armor:** ${this.getEquipmentStatus(userData, 'armor')}\n**Tools:** ${this.getEquipmentStatus(userData, 'tools')}\n**Luck Charm:** ${this.hasLuckCharm(userData) ? '✅' : '❌'}`,
                    inline: true
                },
                {
                    name: '📊 Hunt Statistics',
                    value: `**Success Rate:** ${this.calculateSuccessRate(userData)}%\n**Best Find:** ${this.getBestFind(userData)}\n**Favorite Location:** ${this.getFavoriteLocation(userData)}\n**Hunt Streak:** ${userData.statistics?.huntStreak || 0}`,
                    inline: true
                }
            ])
            .setFooter({ text: 'Each expedition costs energy and time. Choose your path carefully!' })
            .setTimestamp()
            .setThumbnail('https://cdn.discordapp.com/emojis/🗺️.png');

        if (activeExpeditions.length > 0) {
            embed.addFields([
                {
                    name: '🚀 Active Expeditions',
                    value: activeExpeditions.map(exp => 
                        `${exp.location.emoji} ${exp.location.name} - ${this.getTimeRemaining(exp.endTime)}`
                    ).join('\n'),
                    inline: false
                }
            ]);
        }

        const locationSelect = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`treasure_location_${interaction.user.id}`)
                    .setPlaceholder('🗺️ Select a treasure location')
                    .addOptions(
                        treasureLocations.map(loc => {
                            const difficultyEmoji = { easy: '🟢', medium: '🟡', hard: '🔴', expert: '⚫' };
                            return {
                                label: loc.name,
                                description: `${loc.difficulty} difficulty - ${loc.baseReward}+ base coins`,
                                value: loc.name.toLowerCase().replace(/\s+/g, '_').replace(/'/g, ''),
                                emoji: loc.emoji
                            };
                        })
                    )
            );

        const expeditionSelect = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`treasure_expedition_${interaction.user.id}`)
                    .setPlaceholder('⏱️ Choose expedition duration')
                    .addOptions([
                        {
                            label: 'Quick Hunt',
                            description: '5 minutes - 1x rewards - Fast results',
                            value: 'quick',
                            emoji: '⚡'
                        },
                        {
                            label: 'Standard Expedition',
                            description: '15 minutes - 1.5x rewards - Balanced approach',
                            value: 'standard',
                            emoji: '🗺️'
                        },
                        {
                            label: 'Extended Expedition',
                            description: '30 minutes - 2x rewards - Maximum rewards',
                            value: 'extended',
                            emoji: '🏛️'
                        }
                    ])
            );

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`treasure_random_${interaction.user.id}`)
                    .setLabel('🎲 Random Adventure')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`treasure_records_${interaction.user.id}`)
                    .setLabel('📊 Hunt Records')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`treasure_equipment_${interaction.user.id}`)
                    .setLabel('🎒 Equipment')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`treasure_guide_${interaction.user.id}`)
                    .setLabel('📖 Hunter\'s Guide')
                    .setStyle(ButtonStyle.Success)
            );

        const response = { embeds: [embed], components: [locationSelect, expeditionSelect, actionButtons] };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(response);
        } else {
            await interaction.reply(response);
        }
    },

    async huntTreasure(interaction, locationKey, expeditionType = 'quick') {
        const location = treasureLocations.find(loc => 
            loc.name.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '') === locationKey
        );
        
        if (!location) {
            await interaction.reply({
                content: '❌ Invalid treasure location selected.',
                ephemeral: true
            });
            return;
        }

        // Check if user has enough energy
        const userData = await db.getPlayer(interaction.user.id);
        const energyRequired = this.getEnergyRequired(location.difficulty, expeditionType);
        const currentEnergy = this.getEnergyLevel(userData);
        
        if (currentEnergy < energyRequired) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B35')
                .setTitle('⚡ Insufficient Energy')
                .setDescription('You don\'t have enough energy for this expedition!')
                .addFields([
                    { name: '⚡ Current Energy', value: `${currentEnergy}%`, inline: true },
                    { name: '⚡ Required Energy', value: `${energyRequired}%`, inline: true },
                    { name: '⏰ Energy Recovery', value: 'Recovers 10% every hour', inline: true }
                ])
                .setFooter({ text: 'Rest or try an easier location!' });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        await interaction.deferReply();

        const expedition = expeditionTypes[expeditionType];
        const huntingEmbed = new EmbedBuilder()
            .setColor('#FF9800')
            .setTitle(`${location.emoji} Beginning ${expedition.name}...`)
            .setDescription(`🔍 You venture into **${location.name}**, searching for hidden treasures...\n\n*${location.description}*`)
            .addFields([
                { name: '📍 Location', value: location.name, inline: true },
                { name: '⚡ Difficulty', value: location.difficulty.toUpperCase(), inline: true },
                { name: '⏱️ Duration', value: `${expedition.duration / 60000} minutes`, inline: true },
                { name: '🎯 Base Reward', value: `${location.baseReward} coins`, inline: true },
                { name: '✨ Multiplier', value: `${expedition.multiplier}x`, inline: true },
                { name: '⏱️ Status', value: 'Searching...', inline: true },
                { name: '⚠️ Dangers Present', value: location.dangers.join('\n'), inline: false }
            ])
            .setFooter({ text: 'Adventure in progress... Please wait!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [huntingEmbed] });

        // Simulate hunting with progressive updates
        setTimeout(async () => {
            await this.sendProgressUpdate(interaction, location, 25);
        }, expedition.duration * 0.25);

        setTimeout(async () => {
            await this.sendProgressUpdate(interaction, location, 50);
        }, expedition.duration * 0.5);

        setTimeout(async () => {
            await this.sendProgressUpdate(interaction, location, 75);
        }, expedition.duration * 0.75);

        // Final result
        setTimeout(async () => {
            await this.processTreasureHunt(interaction, location, expedition, userData);
        }, expedition.duration);
    },

    async sendProgressUpdate(interaction, location, progress) {
        const updates = {
            25: '🔍 Exploring deeper into the location...',
            50: '💎 Found signs of treasure nearby...',
            75: '⚡ Getting close to something valuable...'
        };

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle(`${location.emoji} ${location.name} - ${progress}% Complete`)
            .setDescription(updates[progress])
            .addFields([
                { name: '📊 Progress', value: `${'█'.repeat(Math.floor(progress/10))}${'░'.repeat(10-Math.floor(progress/10))} ${progress}%`, inline: false }
            ]);

        await interaction.editReply({ embeds: [embed] });
    },

    async processTreasureHunt(interaction, location, expedition, userData) {
        // Calculate success probability
        const baseSuccess = { easy: 0.8, medium: 0.6, hard: 0.4, expert: 0.25 };
        const levelBonus = Math.min(0.2, (userData.level || 1) * 0.02);
        const equipmentBonus = this.getEquipmentBonus(userData);
        const luckBonus = this.hasLuckCharm(userData) ? 0.1 : 0;
        
        const successRate = baseSuccess[location.difficulty] + levelBonus + equipmentBonus + luckBonus;
        const isSuccessful = Math.random() < successRate;
        
        if (isSuccessful) {
            await this.handleSuccessfulHunt(interaction, location, expedition, userData);
        } else {
            await this.handleFailedHunt(interaction, location, expedition, userData);
        }
    },

    async handleSuccessfulHunt(interaction, location, expedition, userData) {
        // Determine treasure rarity based on location and luck
        const rarity = this.determineTreasureRarity(location, userData);
        const foundTreasure = treasures.filter(t => t.rarity === rarity)[Math.floor(Math.random() * treasures.filter(t => t.rarity === rarity).length)];
        
        // Calculate rewards
        const baseReward = location.baseReward;
        const treasureValue = foundTreasure.value;
        const expeditionMultiplier = expedition.multiplier;
        const levelMultiplier = 1 + ((userData.level || 1) - 1) * 0.05;
        const luckMultiplier = this.hasLuckCharm(userData) ? 1.15 : 1;
        
        const totalReward = Math.floor((baseReward + treasureValue) * expeditionMultiplier * levelMultiplier * luckMultiplier);
        const experienceGained = Math.floor(totalReward * 0.1);
        
        // Update user data
        const updatedStats = {
            ...userData.statistics,
            treasuresFound: (userData.statistics?.treasuresFound || 0) + 1,
            totalCoinsEarned: (userData.statistics?.totalCoinsEarned || 0) + totalReward,
            huntStreak: (userData.statistics?.huntStreak || 0) + 1,
            lastHuntTime: Date.now()
        };

        await db.updatePlayer(interaction.user.id, {
            coins: userData.coins + totalReward,
            experience: userData.experience + experienceGained,
            statistics: updatedStats,
            energy: Math.max(0, this.getEnergyLevel(userData) - this.getEnergyRequired(location.difficulty, expedition.name.toLowerCase().split(' ')[0]))
        });

        // Check for achievements
        const achievements = this.checkHuntAchievements(updatedStats);

        const rarityColors = {
            common: '#8B4513',
            uncommon: '#32CD32',
            rare: '#4169E1',
            epic: '#9932CC',
            legendary: '#FFD700',
            mythical: '#FF1493'
        };

        const successEmbed = new EmbedBuilder()
            .setColor(rarityColors[rarity])
            .setTitle(`🎉 Treasure Discovered at ${location.name}!`)
            .setDescription(`**Incredible!** You discovered a **${rarity.toUpperCase()}** treasure!\n\n*${foundTreasure.description}*`)
            .addFields([
                { name: '💎 Treasure Found', value: `${foundTreasure.emoji} **${foundTreasure.name}**`, inline: true },
                { name: '🏆 Rarity', value: rarity.charAt(0).toUpperCase() + rarity.slice(1), inline: true },
                { name: '💰 Base Value', value: `${foundTreasure.value} coins`, inline: true },
                { name: '📍 Location Bonus', value: `+${location.baseReward} coins`, inline: true },
                { name: '⏱️ Expedition Bonus', value: `${expedition.multiplier}x multiplier`, inline: true },
                { name: '⭐ Level Bonus', value: `${((levelMultiplier - 1) * 100).toFixed(1)}%`, inline: true },
                { name: '🍀 Luck Bonus', value: this.hasLuckCharm(userData) ? '+15%' : 'None', inline: true },
                { name: '🎯 Total Earned', value: `**${totalReward.toLocaleString()} coins**`, inline: true },
                { name: '⚡ Experience', value: `+${experienceGained} XP`, inline: true },
                { name: '💳 New Balance', value: `${(userData.coins + totalReward).toLocaleString()} coins`, inline: true },
                { name: '🔥 Hunt Streak', value: `${updatedStats.huntStreak}`, inline: true },
                { name: '🏆 Total Hunts', value: `${updatedStats.treasuresFound}`, inline: true }
            ])
            .setFooter({ text: `Found at ${location.emoji} ${location.name} • ${expedition.name}` })
            .setTimestamp()
            .setThumbnail(interaction.user.displayAvatarURL());

        if (achievements.length > 0) {
            successEmbed.addFields([
                { name: '🏅 New Achievements!', value: achievements.join('\n'), inline: false }
            ]);
        }

        const continueButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`treasure_again_${interaction.user.id}`)
                    .setLabel('🔄 Hunt Again')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`treasure_map_${interaction.user.id}`)
                    .setLabel('🗺️ Treasure Map')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`treasure_celebrate_${interaction.user.id}`)
                    .setLabel('🎉 Celebrate')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`treasure_share_${interaction.user.id}`)
                    .setLabel('📢 Share Discovery')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [successEmbed], components: [continueButtons] });
    },

    async handleFailedHunt(interaction, location, expedition, userData) {
        const failureReasons = {
            easy: ['The treasure was better hidden than expected!', 'You were distracted by beautiful scenery!', 'Small creatures led you astray!'],
            medium: ['Wild creatures scared you away!', 'You lost your way in the maze-like passages!', 'Magical barriers blocked your path!'],
            hard: ['Dangerous traps forced you to retreat!', 'Extreme conditions overwhelmed you!', 'Powerful guardians defended the treasure!'],
            expert: ['Ancient curses repelled you!', 'Legendary guardians appeared!', 'The treasure was protected by divine magic!']
        };
        
        const randomReason = failureReasons[location.difficulty][Math.floor(Math.random() * failureReasons[location.difficulty].length)];
        const consolationReward = Math.floor(location.baseReward * 0.1);
        const experienceGained = 5;
        
        // Update user with small consolation
        await db.updatePlayer(interaction.user.id, {
            coins: userData.coins + consolationReward,
            experience: userData.experience + experienceGained,
            statistics: {
                ...userData.statistics,
                huntStreak: 0, // Reset streak on failure
                lastHuntTime: Date.now()
            },
            energy: Math.max(0, this.getEnergyLevel(userData) - this.getEnergyRequired(location.difficulty, expedition.name.toLowerCase().split(' ')[0]))
        });
        
        const failureEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle(`${location.emoji} Hunt Failed at ${location.name}`)
            .setDescription(`**${randomReason}**\n\nDespite the setback, you gained valuable experience and found some small treasures along the way.`)
            .addFields([
                { name: '📍 Location', value: location.name, inline: true },
                { name: '⚡ Difficulty', value: location.difficulty.toUpperCase(), inline: true },
                { name: '⏱️ Expedition', value: expedition.name, inline: true },
                { name: '💰 Consolation Reward', value: `${consolationReward} coins`, inline: true },
                { name: '⚡ Experience Gained', value: `+${experienceGained} XP`, inline: true },
                { name: '🔥 Hunt Streak', value: 'Reset to 0', inline: true },
                { name: '💡 What Went Wrong?', value: this.getFailureAdvice(location.difficulty), inline: false },
                { name: '🎯 Success Tips', value: '• Level up for better chances\n• Upgrade your equipment\n• Try easier locations first\n• Use luck charms', inline: false }
            ])
            .setFooter({ text: 'Every failure teaches us something new!' })
            .setTimestamp();

        const retryButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`treasure_retry_${interaction.user.id}_${location.name.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '')}`)
                    .setLabel('🔄 Try Again')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`treasure_easier_${interaction.user.id}`)
                    .setLabel('🟢 Easier Location')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`treasure_tips_${interaction.user.id}`)
                    .setLabel('💡 Get Tips')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`treasure_equipment_${interaction.user.id}`)
                    .setLabel('🎒 Check Equipment')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [failureEmbed], components: [retryButtons] });
    },

    // Helper functions
    getEnergyLevel(userData) {
        const lastHunt = userData.statistics?.lastHuntTime || 0;
        const hoursSince = (Date.now() - lastHunt) / (1000 * 60 * 60);
        return Math.min(100, Math.floor(hoursSince * 10)); // 10% per hour recovery
    },

    getEnergyRequired(difficulty, expeditionType) {
        const base = { easy: 20, medium: 30, hard: 40, expert: 50 };
        const expedition = { quick: 1, standard: 1.2, extended: 1.5 };
        return Math.floor(base[difficulty] * (expedition[expeditionType] || 1));
    },

    getEquipmentBonus(userData) {
        // Simplified equipment bonus calculation
        return 0.1; // 10% base bonus
    },

    hasLuckCharm(userData) {
        return userData.inventory?.luckCharm || false;
    },

    determineTreasureRarity(location, userData) {
        const baseRarities = {
            easy: { common: 0.6, uncommon: 0.3, rare: 0.1 },
            medium: { common: 0.4, uncommon: 0.4, rare: 0.15, epic: 0.05 },
            hard: { common: 0.2, uncommon: 0.3, rare: 0.3, epic: 0.15, legendary: 0.05 },
            expert: { uncommon: 0.1, rare: 0.3, epic: 0.3, legendary: 0.25, mythical: 0.05 }
        };

        const rarities = baseRarities[location.difficulty];
        const random = Math.random();
        let cumulative = 0;

        for (const [rarity, chance] of Object.entries(rarities)) {
            cumulative += chance;
            if (random <= cumulative) return rarity;
        }

        return 'common';
    },

    checkHuntAchievements(stats) {
        const achievements = [];
        if (stats.treasuresFound === 1) achievements.push('🏆 First Treasure Found');
        if (stats.treasuresFound === 10) achievements.push('🎯 Treasure Hunter');
        if (stats.treasuresFound === 50) achievements.push('🏴‍☠️ Master Hunter');
        if (stats.huntStreak === 5) achievements.push('🔥 Hot Streak');
        if (stats.huntStreak === 10) achievements.push('⚡ Legendary Streak');
        return achievements;
    },

    getFailureAdvice(difficulty) {
        const advice = {
            easy: 'Even easy locations can be tricky. Make sure you\'re well-prepared!',
            medium: 'Medium locations require better equipment and higher levels.',
            hard: 'Hard locations need careful planning and strong equipment.',
            expert: 'Expert locations are for the most skilled hunters only!'
        };
        return advice[difficulty];
    },

    getEquipmentStatus(userData, type) {
        // Simplified equipment status
        return 'Basic'; // Could be enhanced with actual equipment system
    },

    calculateSuccessRate(userData) {
        const hunts = userData.statistics?.treasuresFound || 0;
        const attempts = hunts + Math.floor(hunts * 0.3); // Estimate attempts
        return attempts > 0 ? Math.floor((hunts / attempts) * 100) : 0;
    },

    getBestFind(userData) {
        return userData.statistics?.bestFind || 'None yet';
    },

    getFavoriteLocation(userData) {
        return userData.statistics?.favoriteLocation || 'Not set';
    },

    getActiveExpeditions(userId) {
        // Placeholder for active expedition tracking
        return [];
    },

    getTimeRemaining(endTime) {
        const remaining = endTime - Date.now();
        if (remaining <= 0) return 'Completed';
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }
};
