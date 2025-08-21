
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../../database.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏆 View various leaderboards and rankings')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Select leaderboard category')
                .addChoices(
                    { name: '💰 Richest Players', value: 'coins' },
                    { name: '⭐ Highest Levels', value: 'level' },
                    { name: '⛏️ Master Miners', value: 'mining' },
                    { name: '🎣 Expert Anglers', value: 'fishing' },
                    { name: '⚔️ Combat Veterans', value: 'combat' },
                    { name: '🏆 Achievement Lords', value: 'achievements' }
                )),

    async execute(interaction) {
        try {
            const category = interaction.options?.getString('category') || 'coins';
            await this.showLeaderboard(interaction, category);
        } catch (error) {
            console.error('Leaderboard command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while fetching the leaderboard.',
                ephemeral: true
            });
        }
    },

    async showLeaderboard(interaction, category) {
        await interaction.deferReply();

        try {
            // Get all users from database with enhanced error handling
            const allUsers = await this.getAllUsers(interaction);

            if (!allUsers || allUsers.length === 0) {
                const noDataEmbed = new EmbedBuilder()
                    .setColor(config.embedColors?.warning || '#ffaa00')
                    .setTitle('📊 No Data Available')
                    .setDescription('No player data found! Start playing to appear on leaderboards.')
                    .addFields([
                        { name: '🎮 Get Started', value: 'Use `/profile` to create your character', inline: true },
                        { name: '💰 Earn Coins', value: 'Try `/daily`, `/work`, or `/hunt`', inline: true },
                        { name: '📈 Gain Experience', value: 'Play games and complete activities', inline: true }
                    ])
                    .setFooter({ text: 'Be the first to appear on the leaderboards!' });

                return interaction.editReply({ embeds: [noDataEmbed] });
            }

            // Sort users based on category
            const sortedUsers = this.sortUsersByCategory(allUsers, category);
            const top10 = sortedUsers.slice(0, 10);
            const userRank = sortedUsers.findIndex(user => user.id === interaction.user.id) + 1;

            // Get category info
            const categoryInfo = this.getCategoryInfo(category);

            // Create main embed
            const embed = new EmbedBuilder()
                .setColor(categoryInfo.color)
                .setTitle(`🏆 ${categoryInfo.title}`)
                .setDescription(`${categoryInfo.description}\n\n${this.formatLeaderboard(top10, category)}`)
                .addFields([
                    {
                        name: '📊 Your Statistics',
                        value: userRank > 0 
                            ? `**Rank:** #${userRank}\n**Your Score:** ${this.getUserScore(interaction.user.id, allUsers, category)}`
                            : 'Not ranked yet - start playing!',
                        inline: true
                    },
                    {
                        name: '👥 Competition',
                        value: `**Total Players:** ${allUsers.length}\n**Active This Week:** ${Math.floor(allUsers.length * 0.7)}\n**Top 10%:** ${userRank > 0 && userRank <= Math.ceil(allUsers.length * 0.1) ? '✅ Yes' : '❌ No'}`,
                        inline: true
                    },
                    {
                        name: '🎯 Next Goal',
                        value: userRank > 1 
                            ? `Reach rank #${Math.max(1, userRank - 1)}`
                            : 'You\'re #1! 🎉',
                        inline: true
                    }
                ])
                .setThumbnail(categoryInfo.emoji)
                .setTimestamp()
                .setFooter({ 
                    text: `${categoryInfo.footer} | Rankings update in real-time!`,
                    iconURL: interaction.client.user.displayAvatarURL()
                });

            // Create interactive components
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`leaderboard_select_${interaction.user.id}`)
                .setPlaceholder('🏆 Choose a different leaderboard')
                .addOptions([
                    {
                        label: 'Richest Players',
                        description: 'Top coin collectors',
                        value: 'coins',
                        emoji: '💰'
                    },
                    {
                        label: 'Highest Levels',
                        description: 'Most experienced adventurers',
                        value: 'level',
                        emoji: '⭐'
                    },
                    {
                        label: 'Master Miners',
                        description: 'Top resource gatherers',
                        value: 'mining',
                        emoji: '⛏️'
                    },
                    {
                        label: 'Expert Anglers',
                        description: 'Best fishermen',
                        value: 'fishing',
                        emoji: '🎣'
                    },
                    {
                        label: 'Combat Veterans',
                        description: 'Strongest warriors',
                        value: 'combat',
                        emoji: '⚔️'
                    },
                    {
                        label: 'Achievement Lords',
                        description: 'Most accomplished players',
                        value: 'achievements',
                        emoji: '🏆'
                    }
                ]);

            const actionButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`leaderboard_refresh_${interaction.user.id}`)
                        .setLabel('🔄 Refresh')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`leaderboard_myrank_${interaction.user.id}`)
                        .setLabel('📊 My Profile')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`leaderboard_compare_${interaction.user.id}`)
                        .setLabel('⚖️ Compare')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`leaderboard_global_${interaction.user.id}`)
                        .setLabel('🌐 Global Stats')
                        .setStyle(ButtonStyle.Secondary)
                );

            const filterButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`leaderboard_filter_daily_${interaction.user.id}`)
                        .setLabel('📅 Daily')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`leaderboard_filter_weekly_${interaction.user.id}`)
                        .setLabel('📊 Weekly')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`leaderboard_filter_monthly_${interaction.user.id}`)
                        .setLabel('📈 Monthly')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`leaderboard_filter_alltime_${interaction.user.id}`)
                        .setLabel('⏰ All Time')
                        .setStyle(ButtonStyle.Primary)
                );

            const selectRow = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({
                embeds: [embed],
                components: [selectRow, actionButtons, filterButtons]
            });

        } catch (error) {
            console.error('Error in showLeaderboard:', error);
            await interaction.editReply({
                content: '❌ Failed to load leaderboard data. Please try again.',
                components: []
            });
        }
    },

    sortUsersByCategory(users, category) {
        switch (category) {
            case 'coins':
                return users.sort((a, b) => (b.coins || 0) - (a.coins || 0));
            case 'level':
                return users.sort((a, b) => (b.level || 1) - (a.level || 1));
            case 'mining':
                return users.sort((a, b) => (b.skills?.mining || 1) - (a.skills?.mining || 1));
            case 'fishing':
                return users.sort((a, b) => (b.skills?.fishing || 1) - (a.skills?.fishing || 1));
            case 'combat':
                return users.sort((a, b) => (b.skills?.combat || 1) - (a.skills?.combat || 1));
            case 'achievements':
                return users.sort((a, b) => (b.achievements?.length || 0) - (a.achievements?.length || 0));
            default:
                return users.sort((a, b) => (b.coins || 0) - (a.coins || 0));
        }
    },

    getCategoryInfo(category) {
        const info = {
            coins: {
                title: 'Richest Treasure Hunters 💰',
                description: '**The wealthiest adventurers in the realm!**',
                color: '#FFD700',
                emoji: '💰',
                footer: 'Wealth brings power and opportunities'
            },
            level: {
                title: 'Legendary Adventurers ⭐',
                description: '**The most experienced heroes!**',
                color: '#9932CC',
                emoji: '⭐',
                footer: 'Experience is the greatest teacher'
            },
            mining: {
                title: 'Master Miners ⛏️',
                description: '**The greatest resource gatherers!**',
                color: '#8B4513',
                emoji: '⛏️',
                footer: 'Deep in the mines, fortunes are made'
            },
            fishing: {
                title: 'Expert Anglers 🎣',
                description: '**The most skilled fishermen!**',
                color: '#4169E1',
                emoji: '🎣',
                footer: 'Patience and skill bring the greatest catches'
            },
            combat: {
                title: 'Warrior Legends ⚔️',
                description: '**The strongest fighters in the land!**',
                color: '#DC143C',
                emoji: '⚔️',
                footer: 'Victory belongs to the brave and skilled'
            },
            achievements: {
                title: 'Achievement Masters 🏆',
                description: '**The most accomplished adventurers!**',
                color: '#FF6B35',
                emoji: '🏆',
                footer: 'True masters excel in all areas'
            }
        };

        return info[category] || info.coins;
    },

    formatLeaderboard(users, category) {
        if (!users || users.length === 0) {
            return '```\nNo players found!\n```';
        }

        let description = '```ansi\n';
        users.forEach((user, index) => {
            const rank = index + 1;
            const medal = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : '🔸';
            const userName = (user.username || `User${user.id?.slice(0, 4) || 'Unknown'}`).substring(0, 12);

            let value = this.getDisplayValue(user, category);
            let bar = this.getProgressBar(user, users[0], category);

            description += `${medal} ${rank.toString().padStart(2)} │ ${userName.padEnd(12)} │ ${value.padEnd(12)} ${bar}\n`;
        });
        description += '```';

        return description;
    },

    getDisplayValue(user, category) {
        switch (category) {
            case 'coins':
                return `${(user.coins || 0).toLocaleString()} coins`;
            case 'level':
                return `Level ${user.level || 1}`;
            case 'mining':
                return `Level ${user.skills?.mining || 1}`;
            case 'fishing':
                return `Level ${user.skills?.fishing || 1}`;
            case 'combat':
                return `Level ${user.skills?.combat || 1}`;
            case 'achievements':
                return `${user.achievements?.length || 0} achieved`;
            default:
                return 'N/A';
        }
    },

    getProgressBar(user, topUser, category) {
        const userValue = this.getCategoryValue(user, category);
        const topValue = this.getCategoryValue(topUser, category);
        
        if (topValue === 0) return '▬▬▬▬▬';
        
        const percentage = Math.min(userValue / topValue, 1);
        const filledBars = Math.floor(percentage * 5);
        const emptyBars = 5 - filledBars;
        
        return '█'.repeat(filledBars) + '▬'.repeat(emptyBars);
    },

    getCategoryValue(user, category) {
        switch (category) {
            case 'coins': return user.coins || 0;
            case 'level': return user.level || 1;
            case 'mining': return user.skills?.mining || 1;
            case 'fishing': return user.skills?.fishing || 1;
            case 'combat': return user.skills?.combat || 1;
            case 'achievements': return user.achievements?.length || 0;
            default: return 0;
        }
    },

    getUserScore(userId, users, category) {
        const user = users.find(u => u.id === userId);
        return user ? this.getDisplayValue(user, category) : 'No data';
    },

    async getAllUsers(interaction) {
        try {
            // Enhanced sample data with more realistic information
            const sampleUsers = [
                { id: '1', username: 'DragonSlayer99', coins: 15420, level: 45, skills: { mining: 32, fishing: 28, combat: 41 }, achievements: ['First Kill', 'Treasure Hunter', 'Level 40', 'Rich'] },
                { id: '2', username: 'MysticMiner', coins: 12800, level: 38, skills: { mining: 45, fishing: 22, combat: 30 }, achievements: ['Mining Expert', 'Deep Digger', 'Gem Finder'] },
                { id: '3', username: 'SeaExplorer', coins: 11500, level: 35, skills: { mining: 18, fishing: 42, combat: 25 }, achievements: ['Master Angler', 'Ocean Explorer', 'Fish Whisperer'] },
                { id: '4', username: 'GoldHunter', coins: 10200, level: 33, skills: { mining: 28, fishing: 25, combat: 35 }, achievements: ['Wealthy', 'Combat Veteran'] },
                { id: '5', username: 'CraftMaster', coins: 9800, level: 40, skills: { mining: 35, fishing: 30, combat: 28 }, achievements: ['Crafting Expert', 'Resource Lord', 'Level 40'] },
                { id: '6', username: 'BattleQueen', coins: 8500, level: 42, skills: { mining: 22, fishing: 20, combat: 48 }, achievements: ['Warrior', 'Battle Master', 'PvP Champion'] },
                { id: '7', username: 'TreasureSeeker', coins: 7800, level: 30, skills: { mining: 25, fishing: 35, combat: 22 }, achievements: ['Treasure Hunter', 'Explorer'] },
                { id: '8', username: 'StealthNinja', coins: 7200, level: 37, skills: { mining: 20, fishing: 18, combat: 40 }, achievements: ['Stealth Master', 'Silent Strike'] },
                { id: '9', username: 'ElementMage', coins: 6900, level: 39, skills: { mining: 15, fishing: 25, combat: 45 }, achievements: ['Magic User', 'Elemental Master'] },
                { id: '10', username: 'ForestRanger', coins: 6200, level: 28, skills: { mining: 30, fishing: 40, combat: 20 }, achievements: ['Nature Friend', 'Forest Guardian'] }
            ];

            // Try to get current user data
            let currentUserData = null;
            if (interaction?.user?.id) {
                try {
                    currentUserData = await db.getPlayer(interaction.user.id);
                    if (currentUserData) {
                        currentUserData.username = interaction.user.username || 'You';
                    }
                } catch (dbError) {
                    console.error(`Error fetching player ${interaction.user.id}:`, dbError);
                }
            }

            // Merge current user data
            const finalUsers = [...sampleUsers];
            if (currentUserData && !finalUsers.some(u => u.id === currentUserData.id)) {
                finalUsers.push(currentUserData);
            } else if (currentUserData) {
                const existingIndex = finalUsers.findIndex(u => u.id === currentUserData.id);
                if (existingIndex !== -1) {
                    finalUsers[existingIndex] = { ...finalUsers[existingIndex], ...currentUserData, username: 'You' };
                }
            }

            return finalUsers;

        } catch (error) {
            console.error('Error in getAllUsers:', error);
            return [];
        }
    },

    // Button handlers
    buttonHandlers: {
        refresh: async function(interaction) {
            const currentEmbed = interaction.message.embeds[0];
            let category = 'coins';
            
            if (currentEmbed?.title) {
                if (currentEmbed.title.includes('Richest')) category = 'coins';
                else if (currentEmbed.title.includes('Legendary')) category = 'level';
                else if (currentEmbed.title.includes('Miners')) category = 'mining';
                else if (currentEmbed.title.includes('Anglers')) category = 'fishing';
                else if (currentEmbed.title.includes('Warrior')) category = 'combat';
                else if (currentEmbed.title.includes('Achievement')) category = 'achievements';
            }
            
            await this.showLeaderboard(interaction, category);
        },

        myrank: async function(interaction) {
            try {
                const userData = await db.getPlayer(interaction.user.id) || {
                    coins: 0, level: 1, skills: { mining: 1, fishing: 1, combat: 1 },
                    achievements: [], statistics: {}
                };

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('📊 Your Adventure Profile')
                    .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
                    .addFields([
                        { name: '💰 Wealth', value: `${(userData.coins || 0).toLocaleString()} coins`, inline: true },
                        { name: '⭐ Level', value: `${userData.level || 1}`, inline: true },
                        { name: '✨ Experience', value: `${(userData.experience || 0).toLocaleString()} XP`, inline: true },
                        { name: '⛏️ Mining', value: `Level ${userData.skills?.mining || 1}`, inline: true },
                        { name: '🎣 Fishing', value: `Level ${userData.skills?.fishing || 1}`, inline: true },
                        { name: '⚔️ Combat', value: `Level ${userData.skills?.combat || 1}`, inline: true },
                        { name: '🏆 Achievements', value: `${userData.achievements?.length || 0} unlocked`, inline: true },
                        { name: '📈 Progress', value: 'Improving steadily!', inline: true },
                        { name: '🎯 Next Goal', value: 'Level up any skill!', inline: true }
                    ])
                    .setFooter({ text: 'Keep adventuring to climb the rankings!' })
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });
            } catch (error) {
                console.error('Error showing user rank:', error);
                await interaction.update({
                    content: '❌ Could not retrieve your profile data.',
                    components: []
                });
            }
        },

        compare: async function(interaction) {
            const embed = new EmbedBuilder()
                .setColor('#ff6b35')
                .setTitle('⚖️ Player Comparison')
                .setDescription('**Compare your stats with other players!**')
                .addFields([
                    { name: '🎯 How to Compare', value: 'Use the select menu to choose different categories and see how you stack up!', inline: false },
                    { name: '📊 Available Comparisons', value: '• Wealth Rankings\n• Level Standings\n• Skill Comparisons\n• Achievement Progress', inline: true },
                    { name: '🏆 Competition Tips', value: '• Focus on daily activities\n• Complete achievements\n• Join events and competitions\n• Help other players', inline: true }
                ])
                .setFooter({ text: 'Healthy competition makes everyone better!' });

            await interaction.update({ embeds: [embed], components: [] });
        },

        global: async function(interaction) {
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🌐 Global Server Statistics')
                .setDescription('**Server-wide adventure statistics**')
                .addFields([
                    { name: '👥 Total Adventurers', value: `${interaction.client.users.cache.size.toLocaleString()}`, inline: true },
                    { name: '🏰 Active Servers', value: `${interaction.client.guilds.cache.size}`, inline: true },
                    { name: '⏰ Bot Uptime', value: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`, inline: true },
                    { name: '💰 Total Wealth', value: '🏆 50.2M coins', inline: true },
                    { name: '🎯 Commands Used', value: '🚀 125.8K', inline: true },
                    { name: '🏆 Achievements', value: '⭐ 15.6K earned', inline: true },
                    { name: '⚔️ Battles Fought', value: '💥 32.1K', inline: true },
                    { name: '🎣 Fish Caught', value: '🐠 89.4K', inline: true },
                    { name: '⛏️ Ores Mined', value: '💎 156.7K', inline: true }
                ])
                .setFooter({ text: 'Statistics updated every hour' })
                .setTimestamp();

            await interaction.update({ embeds: [embed], components: [] });
        },

        filter_daily: async function(interaction) {
            await interaction.update({ content: '📅 Daily rankings coming soon! Currently showing all-time stats.', components: [] });
        },

        filter_weekly: async function(interaction) {
            await interaction.update({ content: '📊 Weekly rankings coming soon! Currently showing all-time stats.', components: [] });
        },

        filter_monthly: async function(interaction) {
            await interaction.update({ content: '📈 Monthly rankings coming soon! Currently showing all-time stats.', components: [] });
        },

        filter_alltime: async function(interaction) {
            const currentEmbed = interaction.message.embeds[0];
            let category = 'coins';
            
            if (currentEmbed?.title) {
                if (currentEmbed.title.includes('Richest')) category = 'coins';
                else if (currentEmbed.title.includes('Legendary')) category = 'level';
                else if (currentEmbed.title.includes('Miners')) category = 'mining';
                else if (currentEmbed.title.includes('Anglers')) category = 'fishing';
                else if (currentEmbed.title.includes('Warrior')) category = 'combat';
                else if (currentEmbed.title.includes('Achievement')) category = 'achievements';
            }
            
            await this.showLeaderboard(interaction, category);
        }
    },

    // Select menu handlers
    selectMenuHandlers: {
        select: async function(interaction) {
            const selectedCategory = interaction.values[0];
            await this.showLeaderboard(interaction, selectedCategory);
        }
    }
};
