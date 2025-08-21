
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

// Comprehensive fishing skill tree
const fishingSkills = {
    basic: {
        name: 'Basic Techniques',
        description: 'Fundamental fishing skills every angler needs',
        color: '#32CD32',
        icon: '🎣',
        perks: [
            { 
                level: 1, 
                name: 'Fish Sense', 
                description: '+5% catch rate for all fish', 
                bonus: { catchRate: 0.05 },
                cost: 0
            },
            { 
                level: 3, 
                name: 'Quick Cast', 
                description: '+10% fishing speed, -5 energy cost', 
                bonus: { speed: 0.10, energyCost: -5 },
                cost: 2
            },
            { 
                level: 5, 
                name: 'Line Master', 
                description: '+15% rod durability, resist line breaks', 
                bonus: { durability: 0.15, lineBreakResist: 0.20 },
                cost: 3
            },
            { 
                level: 8, 
                name: 'Patient Angler', 
                description: '+20% rare fish chance when waiting', 
                bonus: { rareChance: 0.20, waitingBonus: true },
                cost: 4
            },
            { 
                level: 10, 
                name: 'Bait Efficiency', 
                description: '25% chance to not consume bait', 
                bonus: { baitSaving: 0.25 },
                cost: 5
            }
        ]
    },
    advanced: {
        name: 'Advanced Mastery',
        description: 'Specialized techniques for experienced anglers',
        color: '#4169E1',
        icon: '🌊',
        perks: [
            { 
                level: 15, 
                name: 'Deep Sea Fisher', 
                description: 'Unlock deep water fishing, +30% value', 
                bonus: { deepWaterAccess: true, fishValue: 0.30 },
                cost: 8
            },
            { 
                level: 18, 
                name: 'Weather Master', 
                description: '+50% catches in storms, immunity to weather', 
                bonus: { stormBonus: 0.50, weatherImmunity: true },
                cost: 10
            },
            { 
                level: 20, 
                name: 'Trophy Hunter', 
                description: '+25% legendary fish chance', 
                bonus: { legendaryChance: 0.25 },
                cost: 12
            },
            { 
                level: 23, 
                name: 'School Detector', 
                description: 'Detect fish schools for guaranteed catches', 
                bonus: { schoolDetection: true, guaranteedCatch: 0.15 },
                cost: 15
            },
            { 
                level: 25, 
                name: 'Master Angler', 
                description: '+100% XP gain, unlock master techniques', 
                bonus: { xpMultiplier: 1.0, masterTechniques: true },
                cost: 20
            }
        ]
    },
    expert: {
        name: 'Legendary Mastery',
        description: 'Elite skills of legendary fishing masters',
        color: '#9932CC',
        icon: '👑',
        perks: [
            { 
                level: 30, 
                name: 'Fish Whisperer', 
                description: 'Communicate with fish, locate legendary species', 
                bonus: { fishCommunication: true, legendaryLocator: true },
                cost: 25
            },
            { 
                level: 35, 
                name: 'Perfect Cast', 
                description: '+50% critical catch rate, +200% value on crits', 
                bonus: { criticalChance: 0.50, criticalMultiplier: 2.0 },
                cost: 30
            },
            { 
                level: 40, 
                name: 'Time Master', 
                description: 'Slow time during fishing, +5 seconds reaction time', 
                bonus: { timeControl: true, reactionBonus: 5 },
                cost: 35
            },
            { 
                level: 45, 
                name: 'Ocean\'s Blessing', 
                description: 'Sea creatures assist you, +500% rare spawns', 
                bonus: { oceanBlessing: true, rareSpawns: 5.0 },
                cost: 40
            },
            { 
                level: 50, 
                name: 'Poseidon\'s Champion', 
                description: 'Ultimate fishing mastery, control over all waters', 
                bonus: { ultimateMastery: true, waterControl: true },
                cost: 50
            }
        ]
    },
    mystical: {
        name: 'Mystical Arts',
        description: 'Magical fishing techniques beyond mortal understanding',
        color: '#FFD700',
        icon: '✨',
        perks: [
            { 
                level: 25, 
                name: 'Mana Fishing', 
                description: 'Use MP instead of energy, magical fish attraction', 
                bonus: { manaFishing: true, magicalAttraction: 0.30 },
                cost: 18
            },
            { 
                level: 30, 
                name: 'Dimensional Angler', 
                description: 'Fish from other dimensions, unique species', 
                bonus: { dimensionalFishing: true, uniqueSpecies: true },
                cost: 25
            },
            { 
                level: 35, 
                name: 'Time Rift Casting', 
                description: 'Cast lines through time, catch prehistoric fish', 
                bonus: { timeRiftFishing: true, prehistoricFish: true },
                cost: 30
            },
            { 
                level: 40, 
                name: 'Stellar Fisher', 
                description: 'Fish among the stars, cosmic species', 
                bonus: { stellarFishing: true, cosmicFish: true },
                cost: 40
            },
            { 
                level: 50, 
                name: 'Reality Bender', 
                description: 'Bend reality itself, create new fish species', 
                bonus: { realityControl: true, speciesCreation: true },
                cost: 50
            }
        ]
    }
};

// Achievement system
const fishingAchievements = {
    catches: {
        'First Catch': { requirement: 1, reward: '50 coins', emoji: '🎣' },
        'Century Club': { requirement: 100, reward: '500 coins + Tackle Box', emoji: '💯' },
        'Legendary Hunter': { requirement: 1, type: 'legendary', reward: '1000 coins + Master Rod', emoji: '👑' },
        'Deep Sea Explorer': { requirement: 50, location: 'deep', reward: 'Depth Charge Lure', emoji: '🌊' },
        'Mythical Angler': { requirement: 10, type: 'legendary', reward: 'Poseidon\'s Blessing', emoji: '🔱' }
    },
    skills: {
        'Skill Novice': { requirement: 5, reward: 'Skill Point', emoji: '📚' },
        'Skill Adept': { requirement: 15, reward: '2 Skill Points', emoji: '🎓' },
        'Skill Master': { requirement: 30, reward: '5 Skill Points', emoji: '👨‍🎓' },
        'Skill Grandmaster': { requirement: 50, reward: 'Legendary Skill Unlock', emoji: '🏆' }
    },
    special: {
        'Perfect Day': { requirement: 'perfect_conditions', reward: 'Weather Control Rod', emoji: '🌈' },
        'Streak Master': { requirement: 25, type: 'streak', reward: 'Streak Multiplier', emoji: '🔥' },
        'Market Mogul': { requirement: 10000, type: 'coins_earned', reward: 'Golden Hook', emoji: '💰' }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fishingskills')
        .setDescription('🎣 Master the art of fishing through skills and progression')
        .addSubcommand(subcommand =>
            subcommand
                .setName('overview')
                .setDescription('📊 View your complete fishing profile'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('perks')
                .setDescription('🌟 Browse and unlock fishing perks')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Skill category to focus on')
                        .setRequired(false)
                        .addChoices(
                            { name: '🎣 Basic Techniques', value: 'basic' },
                            { name: '🌊 Advanced Mastery', value: 'advanced' },
                            { name: '👑 Legendary Mastery', value: 'expert' },
                            { name: '✨ Mystical Arts', value: 'mystical' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('achievements')
                .setDescription('🏆 View fishing achievements and rewards'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mastery')
                .setDescription('👑 Check your fishing mastery levels'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('🥇 Compare your skills with other anglers'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('🔄 Reset skill points (costs coins)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('simulate')
                .setDescription('🎮 Practice fishing scenarios')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            // Get enhanced player data
            const player = await db.getPlayer(userId) || {
                fishingLevel: 1,
                fishingExp: 0,
                skillPoints: 0,
                unlockedPerks: [],
                fishCaught: {
                    common: 0,
                    uncommon: 0,
                    rare: 0,
                    legendary: 0
                },
                achievements: [],
                masteryPoints: {
                    basic: 0,
                    advanced: 0,
                    expert: 0,
                    mystical: 0
                },
                streakRecord: 0,
                coinsEarned: 0,
                perfectDays: 0
            };

            switch (subcommand) {
                case 'overview':
                    await this.showOverview(interaction, player);
                    break;
                case 'perks':
                    await this.showPerks(interaction, player, interaction.options.getString('category'));
                    break;
                case 'achievements':
                    await this.showAchievements(interaction, player);
                    break;
                case 'mastery':
                    await this.showMastery(interaction, player);
                    break;
                case 'leaderboard':
                    await this.showLeaderboard(interaction, player);
                    break;
                case 'reset':
                    await this.showReset(interaction, player);
                    break;
                case 'simulate':
                    await this.showSimulation(interaction, player);
                    break;
            }

        } catch (error) {
            console.error('Error in fishing skills command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while accessing your fishing skills.',
                ephemeral: true
            });
        }
    },

    async showOverview(interaction, player) {
        const totalFish = Object.values(player.fishCaught).reduce((a, b) => a + b, 0);
        const nextLevelExp = Math.pow(player.fishingLevel, 2) * 100;
        const progressPercent = Math.floor((player.fishingExp / nextLevelExp) * 100);
        
        // Calculate total bonuses from perks
        const totalBonuses = this.calculateTotalBonuses(player.unlockedPerks);
        
        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle(`🎣 ${interaction.user.displayName}'s Fishing Profile`)
            .setDescription('**Master Angler Statistics & Progression**')
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { 
                    name: '📈 **Level & Experience**', 
                    value: `**Level:** ${player.fishingLevel}\n**XP:** ${player.fishingExp}/${nextLevelExp}\n**Progress:** ${this.createProgressBar(player.fishingExp, nextLevelExp)} ${progressPercent}%`, 
                    inline: true 
                },
                { 
                    name: '🎯 **Skill Points**', 
                    value: `**Available:** ${player.skillPoints}\n**Spent:** ${player.unlockedPerks.length}\n**Total Earned:** ${player.skillPoints + player.unlockedPerks.length}`, 
                    inline: true 
                },
                { 
                    name: '🐟 **Catch Statistics**', 
                    value: `**Total Catches:** ${totalFish}\n**Common:** ${player.fishCaught.common}\n**Uncommon:** ${player.fishCaught.uncommon}\n**Rare:** ${player.fishCaught.rare}\n**Legendary:** ${player.fishCaught.legendary}`, 
                    inline: true 
                }
            );

        // Add mastery levels
        const masteryData = Object.entries(player.masteryPoints).map(([category, points]) => {
            const level = Math.floor(points / 10);
            return `**${fishingSkills[category].name}:** Level ${level}`;
        }).join('\n');

        embed.addFields({
            name: '🏆 **Mastery Levels**',
            value: masteryData,
            inline: true
        });

        // Add active bonuses
        if (Object.keys(totalBonuses).length > 0) {
            const bonusText = Object.entries(totalBonuses).map(([bonus, value]) => {
                if (bonus === 'catchRate') return `+${Math.round(value * 100)}% Catch Rate`;
                if (bonus === 'fishValue') return `+${Math.round(value * 100)}% Fish Value`;
                if (bonus === 'xpMultiplier') return `+${Math.round(value * 100)}% XP Gain`;
                if (bonus === 'energyCost') return `${value} Energy Cost`;
                if (bonus === 'durability') return `+${Math.round(value * 100)}% Rod Durability`;
                return `${bonus}: ${value}`;
            }).join('\n');

            embed.addFields({
                name: '⚡ **Active Bonuses**',
                value: bonusText,
                inline: true
            });
        }

        // Add recent achievements
        const recentAchievements = player.achievements.slice(-3);
        if (recentAchievements.length > 0) {
            embed.addFields({
                name: '🏅 **Recent Achievements**',
                value: recentAchievements.join('\n'),
                inline: true
            });
        }

        // Special stats
        embed.addFields({
            name: '📊 **Special Stats**',
            value: `**Best Streak:** ${player.streakRecord}\n**Coins Earned:** ${player.coinsEarned}\n**Perfect Days:** ${player.perfectDays}\n**Rank:** ${this.calculateRank(player.fishingLevel)}`,
            inline: false
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('skills_perks')
                    .setLabel('View Perks')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🌟'),
                new ButtonBuilder()
                    .setCustomId('skills_achievements')
                    .setLabel('Achievements')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('skills_leaderboard')
                    .setLabel('Leaderboard')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🥇'),
                new ButtonBuilder()
                    .setCustomId('skills_simulate')
                    .setLabel('Practice')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎮')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    async showPerks(interaction, player, category) {
        const selectedCategory = category || 'basic';
        const skillCategory = fishingSkills[selectedCategory];

        const embed = new EmbedBuilder()
            .setColor(skillCategory.color)
            .setTitle(`${skillCategory.icon} ${skillCategory.name}`)
            .setDescription(skillCategory.description)
            .addFields({
                name: '💡 **Available Skill Points**',
                value: player.skillPoints.toString(),
                inline: true
            });

        // Show perks in this category
        skillCategory.perks.forEach(perk => {
            const isUnlocked = player.unlockedPerks.includes(perk.name);
            const canUnlock = player.fishingLevel >= perk.level && player.skillPoints >= perk.cost && !isUnlocked;
            const status = isUnlocked ? '✅ Unlocked' : canUnlock ? '🔓 Available' : '🔒 Locked';
            
            let bonusText = Object.entries(perk.bonus).map(([key, value]) => {
                if (key === 'catchRate') return `+${Math.round(value * 100)}% catch rate`;
                if (key === 'speed') return `+${Math.round(value * 100)}% speed`;
                if (key === 'energyCost') return `${value} energy cost`;
                if (key === 'durability') return `+${Math.round(value * 100)}% durability`;
                if (key === 'fishValue') return `+${Math.round(value * 100)}% fish value`;
                if (key === 'xpMultiplier') return `+${Math.round(value * 100)}% XP`;
                return `${key}: ${value}`;
            }).join(', ');

            embed.addFields({
                name: `${status} **Level ${perk.level} - ${perk.name}** (${perk.cost} SP)`,
                value: `*${perk.description}*\n**Bonuses:** ${bonusText}`,
                inline: false
            });
        });

        // Category selection menu
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('skills_category_select')
            .setPlaceholder('Select a skill category...')
            .addOptions(
                Object.entries(fishingSkills).map(([key, skill]) => ({
                    label: skill.name,
                    value: key,
                    description: skill.description.slice(0, 50) + '...',
                    emoji: skill.icon
                }))
            );

        const actionRow1 = new ActionRowBuilder().addComponents(categorySelect);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('skills_unlock_perk')
                    .setLabel('Unlock Perk')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🌟')
                    .setDisabled(player.skillPoints === 0),
                new ButtonBuilder()
                    .setCustomId('skills_reset_confirm')
                    .setLabel('Reset Skills')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('skills_overview')
                    .setLabel('Back to Overview')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

        await interaction.editReply({ 
            embeds: [embed], 
            components: [actionRow1, buttons] 
        });
    },

    async showAchievements(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Fishing Achievements')
            .setDescription('**Your legendary accomplishments on the water**')
            .addFields({
                name: '📊 **Achievement Progress**',
                value: `**Unlocked:** ${player.achievements.length}\n**Total Available:** ${Object.keys(fishingAchievements.catches).length + Object.keys(fishingAchievements.skills).length + Object.keys(fishingAchievements.special).length}\n**Completion:** ${Math.round((player.achievements.length / (Object.keys(fishingAchievements.catches).length + Object.keys(fishingAchievements.skills).length + Object.keys(fishingAchievements.special).length)) * 100)}%`,
                inline: false
            });

        // Catch achievements
        let catchAchievements = '';
        Object.entries(fishingAchievements.catches).forEach(([name, achievement]) => {
            const isCompleted = player.achievements.includes(name);
            const progress = this.getAchievementProgress(player, name, achievement);
            const status = isCompleted ? '✅' : progress >= achievement.requirement ? '🎁' : '🔄';
            
            catchAchievements += `${status} ${achievement.emoji} **${name}**\n`;
            catchAchievements += `   *${achievement.reward}*\n`;
            if (!isCompleted) {
                catchAchievements += `   Progress: ${progress}/${achievement.requirement}\n`;
            }
            catchAchievements += '\n';
        });

        embed.addFields({
            name: '🎣 **Fishing Achievements**',
            value: catchAchievements || 'None unlocked yet',
            inline: false
        });

        // Skill achievements
        let skillAchievements = '';
        Object.entries(fishingAchievements.skills).forEach(([name, achievement]) => {
            const isCompleted = player.achievements.includes(name);
            const progress = player.fishingLevel;
            const status = isCompleted ? '✅' : progress >= achievement.requirement ? '🎁' : '🔄';
            
            skillAchievements += `${status} ${achievement.emoji} **${name}**\n`;
            skillAchievements += `   *${achievement.reward}*\n`;
            if (!isCompleted && achievement.requirement > 0) {
                skillAchievements += `   Progress: ${progress}/${achievement.requirement}\n`;
            }
            skillAchievements += '\n';
        });

        embed.addFields({
            name: '🎓 **Skill Achievements**',
            value: skillAchievements || 'None unlocked yet',
            inline: false
        });

        // Special achievements
        let specialAchievements = '';
        Object.entries(fishingAchievements.special).forEach(([name, achievement]) => {
            const isCompleted = player.achievements.includes(name);
            const status = isCompleted ? '✅' : '🔒';
            
            specialAchievements += `${status} ${achievement.emoji} **${name}**\n`;
            specialAchievements += `   *${achievement.reward}*\n\n`;
        });

        embed.addFields({
            name: '⭐ **Special Achievements**',
            value: specialAchievements || 'None unlocked yet',
            inline: false
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('achievements_claim')
                    .setLabel('Claim Rewards')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎁'),
                new ButtonBuilder()
                    .setCustomId('achievements_progress')
                    .setLabel('Detailed Progress')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📈'),
                new ButtonBuilder()
                    .setCustomId('skills_overview')
                    .setLabel('Back to Overview')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    async showMastery(interaction, player) {
        const masteryLevels = {
            novice: { threshold: 0, title: 'Novice Angler', emoji: '🎣', color: '#32CD32' },
            apprentice: { threshold: 100, title: 'Apprentice Fisher', emoji: '🐟', color: '#4169E1' },
            journeyman: { threshold: 500, title: 'Journeyman Angler', emoji: '🐠', color: '#9932CC' },
            expert: { threshold: 2000, title: 'Expert Fisher', emoji: '🦈', color: '#FF6347' },
            master: { threshold: 5000, title: 'Master of Waters', emoji: '👑', color: '#FFD700' },
            grandmaster: { threshold: 10000, title: 'Grandmaster Angler', emoji: '🔱', color: '#FF1493' },
            legend: { threshold: 25000, title: 'Legendary Fisher', emoji: '🌟', color: '#00CED1' }
        };

        const totalCatches = Object.values(player.fishCaught).reduce((a, b) => a + b, 0);
        let currentMastery = 'novice';
        let nextMastery = 'apprentice';

        // Determine current mastery level
        for (const [level, data] of Object.entries(masteryLevels)) {
            if (totalCatches >= data.threshold) {
                currentMastery = level;
                const levels = Object.keys(masteryLevels);
                const currentIndex = levels.indexOf(level);
                nextMastery = levels[currentIndex + 1] || null;
            }
        }

        const current = masteryLevels[currentMastery];
        const next = nextMastery ? masteryLevels[nextMastery] : null;

        const embed = new EmbedBuilder()
            .setColor(current.color)
            .setTitle(`${current.emoji} Fishing Mastery - ${current.title}`)
            .setDescription('**Your journey to becoming a legendary angler**')
            .addFields(
                { 
                    name: '🎯 **Current Mastery**', 
                    value: `**Title:** ${current.title}\n**Total Catches:** ${totalCatches}\n**Rank:** ${Object.keys(masteryLevels).indexOf(currentMastery) + 1}/7`, 
                    inline: true 
                }
            );

        if (next) {
            const progress = totalCatches - current.threshold;
            const required = next.threshold - current.threshold;
            const percentage = Math.floor((progress / required) * 100);

            embed.addFields({
                name: '📈 **Progress to Next Rank**',
                value: `**Next Title:** ${next.title}\n**Progress:** ${progress}/${required}\n**Completion:** ${this.createProgressBar(progress, required)} ${percentage}%`,
                inline: true
            });
        } else {
            embed.addFields({
                name: '👑 **Legendary Status**',
                value: 'You have achieved the highest mastery level!\nYou are truly a legend among anglers.',
                inline: true
            });
        }

        // Mastery bonuses
        const masteryBonus = Object.keys(masteryLevels).indexOf(currentMastery) * 10;
        embed.addFields({
            name: '⚡ **Mastery Bonuses**',
            value: `**XP Bonus:** +${masteryBonus}%\n**Coin Bonus:** +${masteryBonus}%\n**Rare Fish Chance:** +${masteryBonus}%\n**Rod Durability:** +${masteryBonus}%`,
            inline: false
        });

        // Category masteries
        let categoryMasteries = '';
        Object.entries(player.masteryPoints).forEach(([category, points]) => {
            const level = Math.floor(points / 10);
            const skillData = fishingSkills[category];
            categoryMasteries += `${skillData.icon} **${skillData.name}:** Level ${level}\n`;
        });

        embed.addFields({
            name: '🏆 **Category Masteries**',
            value: categoryMasteries || 'No specializations yet',
            inline: true
        });

        // Mastery rewards
        const rewards = [
            'Legendary Rod Skins',
            'Exclusive Fishing Spots',
            'Master Angler Title',
            'Bonus Skill Points',
            'Rare Bait Types',
            'Weather Control',
            'Time Dilation'
        ];

        embed.addFields({
            name: '🎁 **Mastery Rewards**',
            value: rewards.slice(0, Object.keys(masteryLevels).indexOf(currentMastery) + 1).map(reward => `✅ ${reward}`).join('\n') || 'Keep fishing to unlock rewards!',
            inline: true
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mastery_detailed')
                    .setLabel('Detailed Analysis')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('mastery_compare')
                    .setLabel('Compare with Friends')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👥'),
                new ButtonBuilder()
                    .setCustomId('skills_overview')
                    .setLabel('Back to Overview')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    // Utility functions
    createProgressBar(current, max) {
        const barLength = 20;
        const progress = Math.min(Math.max(0, current), max);
        const filledLength = Math.floor((progress / max) * barLength);
        const emptyLength = barLength - filledLength;
        
        return '🟦'.repeat(filledLength) + '⬜'.repeat(emptyLength);
    },

    calculateTotalBonuses(unlockedPerks) {
        const totalBonuses = {};
        
        Object.values(fishingSkills).forEach(category => {
            category.perks.forEach(perk => {
                if (unlockedPerks.includes(perk.name)) {
                    Object.entries(perk.bonus).forEach(([bonus, value]) => {
                        totalBonuses[bonus] = (totalBonuses[bonus] || 0) + value;
                    });
                }
            });
        });

        return totalBonuses;
    },

    calculateRank(level) {
        if (level >= 50) return '🌟 Grandmaster';
        if (level >= 40) return '👑 Master';
        if (level >= 30) return '🦈 Expert';
        if (level >= 20) return '🐠 Advanced';
        if (level >= 10) return '🐟 Intermediate';
        if (level >= 5) return '🎣 Novice';
        return '🐛 Beginner';
    },

    getAchievementProgress(player, name, achievement) {
        if (achievement.type === 'legendary') {
            return player.fishCaught.legendary || 0;
        }
        if (achievement.location === 'deep') {
            return player.locationCatches?.deep || 0;
        }
        if (achievement.type === 'streak') {
            return player.streakRecord || 0;
        }
        if (achievement.type === 'coins_earned') {
            return player.coinsEarned || 0;
        }
        
        return Object.values(player.fishCaught).reduce((a, b) => a + b, 0);
    }
};
