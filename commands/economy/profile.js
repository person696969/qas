
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('📊 View your adventurer profile and statistics')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('View another user\'s profile')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('section')
                .setDescription('View specific profile section')
                .setRequired(false)
                .addChoices(
                    { name: '📊 Overview', value: 'overview' },
                    { name: '📈 Statistics', value: 'stats' },
                    { name: '🏆 Achievements', value: 'achievements' },
                    { name: '⚔️ Equipment', value: 'equipment' },
                    { name: '🐾 Pets & Companions', value: 'pets' }
                )),
    
    async execute(interaction) {
        const targetUser = interaction.options?.getUser('user') || interaction.user;
        const section = interaction.options?.getString('section') || 'overview';
        const userId = targetUser.id;
        const isOwnProfile = userId === interaction.user.id;
        
        try {
            // Get user data
            const userData = await db.getPlayer(userId);
            if (!userData) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Profile Not Found')
                    .setDescription(`${isOwnProfile ? 'You don\'t' : `${targetUser.displayName} doesn't`} have an adventurer profile yet!`)
                    .addFields([
                        {
                            name: '🚀 Get Started',
                            value: isOwnProfile ? 
                                '• Use `/daily` to claim your first reward\n• Try `/work` to earn coins\n• Use `/hunt` to find treasures' :
                                'They need to start their adventure first!',
                            inline: false
                        }
                    ])
                    .setFooter({ text: isOwnProfile ? 'Your adventure awaits!' : '' });

                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            switch (section) {
                case 'stats':
                    await this.showStatistics(interaction, userData, targetUser, isOwnProfile);
                    break;
                case 'achievements':
                    await this.showAchievements(interaction, userData, targetUser, isOwnProfile);
                    break;
                case 'equipment':
                    await this.showEquipment(interaction, userData, targetUser, isOwnProfile);
                    break;
                case 'pets':
                    await this.showPets(interaction, userData, targetUser, isOwnProfile);
                    break;
                default:
                    await this.showOverview(interaction, userData, targetUser, isOwnProfile);
            }
        } catch (error) {
            console.error('Profile command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while loading the profile. Please try again.',
                ephemeral: true
            });
        }
    },

    async showOverview(interaction, userData, targetUser, isOwnProfile) {
        // Initialize default values
        const defaultData = {
            coins: 0,
            inventory: { items: [] },
            stats: {
                huntsCompleted: 0,
                totalEarned: 0,
                battlesWon: 0,
                dungeonClears: 0,
                level: 1,
                experience: 0,
                joinDate: Date.now()
            },
            equipment: {},
            achievements: [],
            titles: [],
            pets: [],
            dailyStreak: { count: 0 }
        };

        // Merge user data with defaults
        const profile = { ...defaultData, ...userData };
        profile.stats = { ...defaultData.stats, ...userData.stats };
        profile.inventory = { ...defaultData.inventory, ...userData.inventory };

        // Calculate level and experience
        const currentLevel = profile.stats.level || 1;
        const currentXP = profile.stats.experience || 0;
        const xpForNextLevel = currentLevel * 100;
        const xpProgress = currentXP % 100;
        const xpPercentage = (xpProgress / 100) * 100;

        // Calculate user's rank
        const userRank = await this.calculateUserRank(userData, profile.stats.totalEarned);
        
        // Get active title
        const activeTitle = profile.titles?.find(t => t.active)?.name || 'Novice Adventurer';
        
        // Calculate play time
        const joinDate = profile.stats.joinDate || Date.now();
        const playTime = Math.floor((Date.now() - joinDate) / (1000 * 60 * 60 * 24));

        // Calculate net worth
        const itemValue = this.calculateInventoryValue(profile.inventory.items || []);
        const netWorth = (profile.coins || 0) + itemValue;

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle(`👑 ${targetUser.displayName}'s Adventure Profile`)
            .setDescription(`**${activeTitle}** • Level ${currentLevel} Adventurer\n\n🌟 *${isOwnProfile ? 'Your' : 'Their'} journey through the realm of treasures and adventures*`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields([
                {
                    name: '💰 Wealth & Assets',
                    value: `💎 **${(profile.coins || 0).toLocaleString()}** coins\n🎒 **${(profile.inventory.items || []).length}** items\n💼 **${netWorth.toLocaleString()}** total worth\n🏆 **#${userRank}** global rank`,
                    inline: true
                },
                {
                    name: '📈 Progress & Level',
                    value: `⭐ Level **${currentLevel}**\n🎯 **${currentXP.toLocaleString()}** total XP\n📊 **${xpProgress}/100** to next (${xpPercentage.toFixed(1)}%)\n🔥 **${profile.dailyStreak?.count || 0}** day streak`,
                    inline: true
                },
                {
                    name: '🎮 Adventure Statistics',
                    value: `🗺️ **${profile.stats.huntsCompleted || 0}** hunts completed\n⚔️ **${profile.stats.battlesWon || 0}** battles won\n🏰 **${profile.stats.dungeonClears || 0}** dungeons cleared\n🎲 **${this.calculateQuestsCompleted(profile)}** quests finished`,
                    inline: true
                },
                {
                    name: '💎 Lifetime Achievements',
                    value: `💰 **${(profile.stats.totalEarned || 0).toLocaleString()}** coins earned\n📅 **${playTime}** days adventuring\n🏅 **${(profile.achievements || []).length}** achievements\n⚡ Last active: ${this.getLastActiveTime(profile)}`,
                    inline: true
                },
                {
                    name: '🛡️ Current Equipment',
                    value: this.getEquipmentSummary(profile.equipment),
                    inline: true
                },
                {
                    name: '🐾 Companions & Pets',
                    value: this.getPetsSummary(profile.pets),
                    inline: true
                }
            ])
            .setFooter({ 
                text: `Adventure started ${new Date(joinDate).toLocaleDateString()} • Profile ID: ${targetUser.id.slice(-6)}` 
            })
            .setTimestamp();

        // Add recent achievements if any
        if ((profile.achievements || []).length > 0) {
            const recentAchievements = profile.achievements.slice(-3).join(' • ');
            embed.addFields([{
                name: '🏅 Recent Achievements',
                value: recentAchievements + (profile.achievements.length > 3 ? ` • +${profile.achievements.length - 3} more` : ''),
                inline: false
            }]);
        }

        // Add progress bar for XP
        const progressBar = this.createProgressBar(xpProgress, 100, 10);
        embed.addFields([{
            name: '📊 Experience Progress',
            value: `${progressBar}\n${xpProgress}/100 XP (${xpPercentage.toFixed(1)}% to Level ${currentLevel + 1})`,
            inline: false
        }]);

        // Create navigation components
        const sectionSelect = new StringSelectMenuBuilder()
            .setCustomId(`profile_section_${targetUser.id}`)
            .setPlaceholder('📋 Navigate to different sections...')
            .addOptions([
                { label: 'Overview', description: 'General profile information', value: 'overview', emoji: '📊' },
                { label: 'Detailed Statistics', description: 'Comprehensive stats and metrics', value: 'stats', emoji: '📈' },
                { label: 'Achievements', description: 'Unlocked achievements and badges', value: 'achievements', emoji: '🏆' },
                { label: 'Equipment', description: 'Current gear and equipment', value: 'equipment', emoji: '⚔️' },
                { label: 'Pets & Companions', description: 'Collected pets and companions', value: 'pets', emoji: '🐾' }
            ]);

        const actionButtons = new ActionRowBuilder();
        
        if (isOwnProfile) {
            actionButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId('profile_inventory')
                    .setLabel('🎒 View Inventory')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('profile_settings')
                    .setLabel('⚙️ Settings')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('profile_backup')
                    .setLabel('💾 Backup Profile')
                    .setStyle(ButtonStyle.Secondary)
            );
        } else {
            actionButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`profile_challenge_${targetUser.id}`)
                    .setLabel('⚔️ Challenge')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`profile_trade_${targetUser.id}`)
                    .setLabel('🤝 Trade Request')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`profile_compare_${targetUser.id}`)
                    .setLabel('📊 Compare Stats')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        actionButtons.addComponents(
            new ButtonBuilder()
                .setCustomId('profile_refresh')
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Secondary)
        );

        const components = [
            new ActionRowBuilder().addComponents(sectionSelect),
            actionButtons
        ];

        await interaction.reply({ embeds: [embed], components });
    },

    async showStatistics(interaction, userData, targetUser, isOwnProfile) {
        const stats = userData.stats || {};
        
        const embed = new EmbedBuilder()
            .setColor('#FF6347')
            .setTitle(`📈 ${targetUser.displayName}'s Detailed Statistics`)
            .setDescription('**Comprehensive performance metrics and analytics**')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields([
                {
                    name: '💰 Economic Performance',
                    value: `**Total Earned:** ${(stats.totalEarned || 0).toLocaleString()} coins\n**Current Balance:** ${(userData.coins || 0).toLocaleString()} coins\n**Daily Average:** ${Math.floor((stats.totalEarned || 0) / Math.max(stats.activeDays || 1, 1)).toLocaleString()} coins\n**Highest Single Earn:** ${(stats.highestEarn || 0).toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '🎮 Adventure Metrics',
                    value: `**Hunts Completed:** ${stats.huntsCompleted || 0}\n**Success Rate:** ${stats.huntsCompleted > 0 ? Math.floor(((stats.huntsCompleted || 0) / (stats.huntsAttempted || stats.huntsCompleted || 1)) * 100) : 0}%\n**Battles Won:** ${stats.battlesWon || 0}\n**Dungeons Cleared:** ${stats.dungeonClears || 0}`,
                    inline: true
                },
                {
                    name: '📊 Activity Summary',
                    value: `**Days Active:** ${stats.activeDays || 1}\n**Commands Used:** ${stats.commandsUsed || 0}\n**Login Streak:** ${userData.dailyStreak?.count || 0} days\n**Last Login:** ${this.getLastActiveTime(userData)}`,
                    inline: true
                }
            ]);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async showAchievements(interaction, userData, targetUser, isOwnProfile) {
        const achievements = userData.achievements || [];
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🏆 ${targetUser.displayName}'s Achievements`)
            .setDescription(`**${achievements.length} achievements unlocked**`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

        if (achievements.length === 0) {
            embed.addFields([{
                name: '📝 No Achievements Yet',
                value: isOwnProfile ? 
                    'Start your adventure to unlock achievements!\n• Complete your first hunt\n• Earn your first 1000 coins\n• Maintain a 7-day streak' :
                    'This adventurer hasn\'t unlocked any achievements yet.',
                inline: false
            }]);
        } else {
            // Group achievements by category
            const categories = this.groupAchievementsByCategory(achievements);
            Object.entries(categories).forEach(([category, achievementList]) => {
                embed.addFields([{
                    name: `${this.getCategoryIcon(category)} ${category}`,
                    value: achievementList.join('\n'),
                    inline: true
                }]);
            });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async showEquipment(interaction, userData, targetUser, isOwnProfile) {
        const equipment = userData.equipment || {};
        
        const embed = new EmbedBuilder()
            .setColor('#C0C0C0')
            .setTitle(`⚔️ ${targetUser.displayName}'s Equipment`)
            .setDescription('**Current gear and equipment loadout**')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

        const equipmentSlots = {
            weapon: { name: 'Primary Weapon', emoji: '⚔️' },
            armor: { name: 'Body Armor', emoji: '🛡️' },
            helmet: { name: 'Helmet', emoji: '⛑️' },
            boots: { name: 'Boots', emoji: '👢' },
            accessory: { name: 'Accessory', emoji: '💍' }
        };

        Object.entries(equipmentSlots).forEach(([slot, info]) => {
            const item = equipment[slot];
            embed.addFields([{
                name: `${info.emoji} ${info.name}`,
                value: item ? `**${item.name}**\n${item.description || 'No description'}` : '*No item equipped*',
                inline: true
            }]);
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async showPets(interaction, userData, targetUser, isOwnProfile) {
        const pets = userData.pets || [];
        
        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle(`🐾 ${targetUser.displayName}'s Companions`)
            .setDescription(`**${pets.length} companions collected**`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

        if (pets.length === 0) {
            embed.addFields([{
                name: '🐕 No Companions Yet',
                value: isOwnProfile ? 
                    'Find companions during your adventures!\n• Explore dungeons\n• Complete special quests\n• Visit the pet shop' :
                    'This adventurer hasn\'t found any companions yet.',
                inline: false
            }]);
        } else {
            pets.slice(0, 6).forEach(pet => {
                embed.addFields([{
                    name: `${pet.emoji || '🐕'} ${pet.name}`,
                    value: `**Level:** ${pet.level || 1}\n**Type:** ${pet.type || 'Companion'}\n**Ability:** ${pet.ability || 'None'}`,
                    inline: true
                }]);
            });

            if (pets.length > 6) {
                embed.setFooter({ text: `Showing 6 of ${pets.length} companions` });
            }
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    // Helper methods
    async calculateUserRank(userData, totalEarned) {
        // In a real implementation, this would query the database for all users
        return Math.floor(Math.random() * 1000) + 1; // Mock rank for now
    },

    calculateInventoryValue(items) {
        const itemValues = {
            'iron_sword': 150,
            'steel_armor': 300,
            'health_potion': 50,
            'magic_ring': 500
        };

        return items.reduce((total, item) => {
            return total + (itemValues[item.id] || 10);
        }, 0);
    },

    calculateQuestsCompleted(profile) {
        return (profile.stats?.questsCompleted || 0) + Math.floor((profile.stats?.huntsCompleted || 0) / 5);
    },

    getLastActiveTime(profile) {
        const lastActive = profile.stats?.lastActive || profile.dailyStreak?.lastClaim || Date.now();
        const timeDiff = Date.now() - lastActive;
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        
        if (hours < 1) return 'Recently';
        if (hours < 24) return `${hours} hours ago`;
        const days = Math.floor(hours / 24);
        return `${days} days ago`;
    },

    getEquipmentSummary(equipment) {
        if (!equipment || Object.keys(equipment).length === 0) {
            return 'No equipment equipped\n*Visit the shop to gear up!*';
        }

        const equipped = Object.keys(equipment).length;
        const slots = 5; // Total equipment slots
        return `⚔️ ${equipment.weapon?.name || 'None'}\n🛡️ ${equipment.armor?.name || 'None'}\n💍 ${equipment.accessory?.name || 'None'}\n📊 ${equipped}/${slots} slots filled`;
    },

    getPetsSummary(pets) {
        if (!pets || pets.length === 0) {
            return 'No companions found\n*Explore to find friends!*';
        }

        if (pets.length <= 3) {
            return pets.map(pet => `${pet.emoji || '🐕'} ${pet.name}`).join('\n');
        }

        return pets.slice(0, 2).map(pet => `${pet.emoji || '🐕'} ${pet.name}`).join('\n') + `\n*+${pets.length - 2} more companions*`;
    },

    createProgressBar(current, max, length) {
        const filled = Math.floor((current / max) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    },

    groupAchievementsByCategory(achievements) {
        // Mock implementation - group achievements by category
        return {
            'Economic': achievements.filter(a => a.includes('coin') || a.includes('earn')),
            'Combat': achievements.filter(a => a.includes('battle') || a.includes('fight')),
            'Exploration': achievements.filter(a => a.includes('hunt') || a.includes('explore'))
        };
    },

    getCategoryIcon(category) {
        const icons = {
            'Economic': '💰',
            'Combat': '⚔️',
            'Exploration': '🗺️',
            'Social': '👥',
            'Special': '⭐'
        };
        return icons[category] || '🏆';
    }
};
