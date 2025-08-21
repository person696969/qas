
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');
const { handleError } = require('../../utils/errorHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('💰 Claim your daily treasure reward!')
        .addBooleanOption(option =>
            option.setName('notify')
                .setDescription('Get notified when your next daily is ready')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const userId = interaction.user.id;
            const now = Date.now();
            const notify = interaction.options.getBoolean('notify') ?? false;

            // Get user data
            let userData = await db.getPlayer(userId);
            if (!userData) {
                userData = {
                    coins: 100,
                    inventory: { coins: 0 },
                    stats: { streak: 0, totalEarned: 0 },
                    dailyStreak: { count: 0, lastClaim: 0 },
                    settings: { notifications: false }
                };
                await db.setPlayer(userId, userData);
            }
        
            // Ensure necessary objects exist
            userData.inventory = userData.inventory || { coins: 0 };
            userData.stats = userData.stats || { streak: 0, totalEarned: 0 };
            userData.dailyStreak = userData.dailyStreak || { count: 0, lastClaim: 0 };
            userData.settings = userData.settings || { notifications: false };

            // Check if user already claimed today
            const lastClaim = userData.dailyStreak.lastClaim || 0;
            const timeSinceLastClaim = now - lastClaim;
            const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            
            if (timeSinceLastClaim < oneDay) {
                const timeUntilNext = oneDay - timeSinceLastClaim;
                const hours = Math.floor(timeUntilNext / (60 * 60 * 1000));
                const minutes = Math.floor((timeUntilNext % (60 * 60 * 1000)) / (60 * 1000));
                
                // Update notification setting if requested
                if (notify !== userData.settings.notifications) {
                    userData.settings.notifications = notify;
                    await db.setPlayer(userId, userData);
                }

                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('⏰ Daily Reward Already Claimed!')
                    .setDescription('**You\'ve already claimed your daily treasure today!**\n\n⏳ Come back tomorrow for more rewards!')
                    .addFields([
                        { name: '⏱️ Time Until Next Claim', value: `${hours}h ${minutes}m`, inline: true },
                        { name: '🔥 Current Streak', value: `${userData.dailyStreak.count} days`, inline: true },
                        { name: '💰 Current Balance', value: `${userData.inventory.coins} coins`, inline: true },
                        { name: '📊 Streak Rewards', value: `Next milestone: ${Math.ceil(userData.dailyStreak.count / 5) * 5} days\nBonus: ${Math.ceil(userData.dailyStreak.count / 5) * 50} coins`, inline: false }
                    ])
                    .setFooter({ text: notify ? 'You will be notified when your next daily is ready!' : 'Use /daily notify:true to get notified' })
                    .setTimestamp();

                const waitButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('daily_stats')
                            .setLabel('📊 View Stats')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('daily_leaderboard')
                            .setLabel('🏆 Streak Rankings')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('daily_tips')
                            .setLabel('💡 Earning Tips')
                            .setStyle(ButtonStyle.Secondary)
                    );
                    
                await interaction.editReply({ embeds: [embed], components: [waitButtons] });
                return;
            }
            
            // Calculate streak and rewards
            const isStreakValid = timeSinceLastClaim <= oneDay * 2; // Allow 48 hours for streak
            const currentStreak = isStreakValid ? userData.dailyStreak.count + 1 : 1;
            
            // Calculate rewards
            const baseReward = 100;
            const streakBonus = Math.floor(currentStreak / 5) * 50; // +50 coins every 5 day streak
            const dailyBonus = Math.min(currentStreak * 5, 100); // Up to 100 bonus coins
            const totalReward = baseReward + streakBonus + dailyBonus;

            // Special milestone rewards
            let milestoneBonus = 0;
            let milestoneReward = '';
            if (currentStreak % 30 === 0) {
                milestoneBonus = 2000;
                milestoneReward = 'Monthly Champion Badge';
            } else if (currentStreak % 14 === 0) {
                milestoneBonus = 750;
                milestoneReward = 'Bi-Weekly Dedication Token';
            } else if (currentStreak % 7 === 0) {
                milestoneBonus = 300;
                milestoneReward = 'Weekly Warrior Emblem';
            }

            // Update user data
            userData.inventory.coins += totalReward + milestoneBonus;
            userData.dailyStreak.count = currentStreak;
            userData.dailyStreak.lastClaim = now;
            userData.stats.totalEarned += totalReward + milestoneBonus;
            userData.settings.notifications = notify;

            // Save updated data
            await db.setPlayer(userId, userData);

            // Create reward embed
            const rewardEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('💰 Daily Reward Claimed Successfully!')
                .setDescription(`**🎉 Congratulations! You've earned ${totalReward + milestoneBonus} coins!**\n\n✨ Your dedication to treasure hunting pays off!`)
                .addFields([
                    { name: '💰 Reward Breakdown', value: 
                        `🎯 Base Reward: ${baseReward} coins\n` +
                        `🔥 Streak Bonus: ${streakBonus} coins\n` +
                        `⭐ Daily Bonus: ${dailyBonus} coins\n` +
                        `${milestoneBonus > 0 ? `🏆 Milestone Bonus: ${milestoneBonus} coins\n` : ''}` +
                        `💎 **Total: ${totalReward + milestoneBonus} coins**`, 
                        inline: true 
                    },
                    { name: '🔥 Daily Streak', value: `${currentStreak} days\n${currentStreak > 1 ? '🎯' : '🌟'} ${isStreakValid ? 'Streak maintained!' : 'New streak started!'}`, inline: true },
                    { name: '💎 New Balance', value: `${userData.inventory.coins.toLocaleString()} coins\n📈 +${((totalReward + milestoneBonus) / (userData.inventory.coins - totalReward - milestoneBonus) * 100).toFixed(1)}% increase`, inline: true },
                    { name: '📊 Progress Stats', value: `📅 Total Days: ${userData.dailyStreak.count}\n💰 Total Earned: ${userData.stats.totalEarned.toLocaleString()} coins\n🏆 Avg Daily: ${Math.floor(userData.stats.totalEarned / Math.max(userData.dailyStreak.count, 1))} coins`, inline: false }
                ])
                .setFooter({ text: notify ? 'You will be notified when your next daily is ready!' : 'Use /daily notify:true to get notified' })
                .setTimestamp();

            // Add milestone message if applicable
            if (milestoneBonus > 0) {
                rewardEmbed.addFields([{
                    name: '🎉 Milestone Achievement!',
                    value: `🏆 **${currentStreak}-Day Streak Milestone!**\n💎 Bonus: ${milestoneBonus} coins\n🎖️ Reward: ${milestoneReward}`,
                    inline: false
                }]);
            }

            // Add next milestone info
            const nextMilestone = Math.ceil(currentStreak / 5) * 5;
            const daysToMilestone = nextMilestone - currentStreak;
            rewardEmbed.addFields([{
                name: '🎯 Next Milestone',
                value: `🏁 ${nextMilestone} days (${daysToMilestone} days away)\n💰 Bonus: ${Math.ceil(currentStreak / 5 + 1) * 50} coins`,
                inline: false
            }]);

            // Add buttons for related commands
            const actionButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('daily_invest')
                        .setLabel('💹 Invest Rewards')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('daily_shop')
                        .setLabel('🛍️ Visit Shop')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('daily_profile')
                        .setLabel('👤 View Profile')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('daily_work')
                        .setLabel('💼 Work More')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({
                embeds: [rewardEmbed],
                components: [actionButtons]
            });

            // Set reminder if notifications are enabled
            if (notify) {
                setTimeout(() => {
                    interaction.followUp({
                        content: `🔔 <@${userId}> Your daily reward is ready to claim! Don't break your ${currentStreak}-day streak!`,
                        ephemeral: true
                    }).catch(console.error);
                }, oneDay);
            }
        } catch (error) {
            await handleError(interaction, error);
        }
    },

    async handleButton(interaction) {
        try {
            const [action] = interaction.customId.split('_').slice(1);
            
            switch (action) {
                case 'invest':
                    const investCommand = interaction.client.commands.get('invest');
                    if (investCommand) await investCommand.execute(interaction);
                    break;
                case 'shop':
                    const shopCommand = interaction.client.commands.get('shop');
                    if (shopCommand) await shopCommand.execute(interaction);
                    break;
                case 'profile':
                    const profileCommand = interaction.client.commands.get('profile');
                    if (profileCommand) await profileCommand.execute(interaction);
                    break;
                case 'work':
                    const workCommand = interaction.client.commands.get('work');
                    if (workCommand) await workCommand.execute(interaction);
                    break;
                case 'stats':
                    await this.showDailyStats(interaction);
                    break;
                case 'leaderboard':
                    await this.showStreakLeaderboard(interaction);
                    break;
                case 'tips':
                    await this.showEarningTips(interaction);
                    break;
                default:
                    await interaction.reply({ content: '❌ Unknown action!', ephemeral: true });
            }
        } catch (error) {
            await handleError(interaction, error);
        }
    },

    async showDailyStats(interaction) {
        const userData = await db.getPlayer(interaction.user.id);
        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📊 Your Daily Reward Statistics')
            .addFields([
                { name: '🔥 Current Streak', value: `${userData.dailyStreak?.count || 0} days`, inline: true },
                { name: '💰 Total Earned', value: `${userData.stats?.totalEarned || 0} coins`, inline: true },
                { name: '📅 Average Per Day', value: `${Math.floor((userData.stats?.totalEarned || 0) / Math.max(userData.dailyStreak?.count || 1, 1))} coins`, inline: true }
            ]);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async showStreakLeaderboard(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Daily Streak Leaderboard')
            .setDescription('Top treasure hunters by daily streak:')
            .addFields([
                { name: '🥇 Champion', value: 'Player1 - 45 days', inline: true },
                { name: '🥈 Elite', value: 'Player2 - 38 days', inline: true },
                { name: '🥉 Master', value: 'Player3 - 32 days', inline: true }
            ]);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async showEarningTips(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('💡 Earning Tips & Strategies')
            .setDescription('**Maximize your treasure hunting profits:**')
            .addFields([
                { name: '🎯 Daily Commands', value: '• `/work` - Earn coins through jobs\n• `/hunt` - Find treasures\n• `/invest` - Grow your wealth', inline: false },
                { name: '🔥 Streak Benefits', value: '• 5+ days: +50 coin bonus\n• 7+ days: Weekly rewards\n• 30+ days: Monthly bonuses', inline: false },
                { name: '⚡ Pro Tips', value: '• Set daily reminders\n• Invest surplus coins\n• Complete daily quests', inline: false }
            ]);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
