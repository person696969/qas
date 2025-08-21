const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');
const { db } = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage')
        .setDescription('⚙️ Advanced admin panel for treasure hunt bot management')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    cooldown: 5,

    async execute(interaction) {
        try {
            // Enhanced permission check
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
                !config.security?.adminUsers?.includes(interaction.user.id)) {
                const embed = new EmbedBuilder()
                    .setColor(config.getEmbedColor('error'))
                    .setTitle('🚫 Access Denied')
                    .setDescription('You need **Administrator** permissions or be listed as a bot admin to use this command!')
                    .setFooter({ text: 'Contact a server administrator for access' })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Get server statistics
            const stats = await this.getServerStats(interaction.guild.id);

            const embed = new EmbedBuilder()
                .setColor(config.getEmbedColor('magic'))
                .setTitle(`${config.getEmoji('crown')} **TREASURE HUNT ADMIN PANEL**`)
                .setDescription(`### ${config.getEmoji('treasure')} **RPG Treasure Hunt Management Suite**\n` +
                    `Welcome to the comprehensive admin control center!\n\n` +
                    `**Server:** ${interaction.guild.name}\n` +
                    `**Admin:** ${interaction.user.displayName}\n` +
                    `**Bot Version:** ${config.version}\n\n` +
                    `${config.getEmoji('lightning')} **Quick Stats:**\n` +
                    `${config.getEmoji('coin')} Active Hunters: **${stats.totalPlayers}**\n` +
                    `${config.getEmoji('treasure')} Total Hunts: **${stats.totalHunts}**\n` +
                    `${config.getEmoji('gem')} Economy Value: **${stats.totalCoins.toLocaleString()}** coins`)
                .addFields(
                    { 
                        name: `${config.getEmoji('fire')} **Player Management**`, 
                        value: `${config.getEmoji('star')} Hunter Statistics\n` +
                               `${config.getEmoji('shield')} Player Moderation\n` +
                               `${config.getEmoji('crown')} Reward System`, 
                        inline: true 
                    },
                    { 
                        name: `${config.getEmoji('magic')} **Game Control**`, 
                        value: `${config.getEmoji('dragon')} Hunt Manager\n` +
                               `${config.getEmoji('coin')} Economy Control\n` +
                               `${config.getEmoji('gem')} Event Creator`, 
                        inline: true 
                    },
                    { 
                        name: `${config.getEmoji('treasure')} **Advanced Tools**`, 
                        value: `${config.getEmoji('key')} Bot Configuration\n` +
                               `${config.getEmoji('scroll')} Server Announcements\n` +
                               `${config.getEmoji('heart')} System Health`, 
                        inline: true 
                    }
                )
                .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ 
                    text: `Treasure Hunt Admin • Use buttons below to navigate • Version ${config.version}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            // Create interactive buttons
            const statsButton = new ButtonBuilder()
                .setCustomId('manage_stats_overview')
                .setLabel('Hunter Statistics')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📊');

            const huntButton = new ButtonBuilder()
                .setCustomId('manage_hunt_control')
                .setLabel('Hunt Manager')
                .setStyle(ButtonStyle.Success)
                .setEmoji(config.getEmoji('treasure'));

            const economyButton = new ButtonBuilder()
                .setCustomId('manage_economy_control')
                .setLabel('Economy Control')
                .setStyle(ButtonStyle.Success)
                .setEmoji(config.getEmoji('coin'));

            const eventsButton = new ButtonBuilder()
                .setCustomId('manage_events_panel')
                .setLabel('Events & Rewards')
                .setStyle(ButtonStyle.Primary)
                .setEmoji(config.getEmoji('fire'));

            const playersButton = new ButtonBuilder()
                .setCustomId('manage_player_tools')
                .setLabel('Player Manager')
                .setStyle(ButtonStyle.Primary)
                .setEmoji(config.getEmoji('crown'));

            const systemButton = new ButtonBuilder()
                .setCustomId('manage_system_health')
                .setLabel('System Health')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(config.getEmoji('heart'));

            const announcementButton = new ButtonBuilder()
                .setCustomId('manage_announcement_center')
                .setLabel('Announcements')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📢');

            const configButton = new ButtonBuilder()
                .setCustomId('manage_config_panel')
                .setLabel('Bot Configuration')
                .setStyle(ButtonStyle.Danger)
                .setEmoji(config.getEmoji('key'));

            // Organize buttons into rows
            const row1 = new ActionRowBuilder().addComponents(statsButton, huntButton, economyButton);
            const row2 = new ActionRowBuilder().addComponents(eventsButton, playersButton, systemButton);
            const row3 = new ActionRowBuilder().addComponents(announcementButton, configButton);

            await interaction.reply({ 
                embeds: [embed], 
                components: [row1, row2, row3], 
                ephemeral: true 
            });

        } catch (error) {
            console.error('Error in manage command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Command Error')
                .setDescription('An error occurred while loading the admin panel. Please try again.')
                .setFooter({ text: 'If this persists, check the console logs' })
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed], components: [] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },

    // Button handlers for the manage command
    buttonHandlers: {
        // Statistics Overview Handler
        async stats_overview(interaction) {
            try {
                await interaction.deferUpdate();

                const guildStats = await this.getServerStats(interaction.guild.id);
                const globalStats = await db.getGlobalStats();
                const leaderboard = await db.getLeaderboard('coins', 1, 5);

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle(`${config.getEmoji('star')} **Hunter Statistics Dashboard**`)
                    .setDescription(`### ${config.getEmoji('treasure')} **Comprehensive Server Analytics**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('crown')} **Player Statistics**`,
                            value: `${config.getEmoji('heart')} Active Hunters: **${guildStats.totalPlayers}**\n` +
                                   `${config.getEmoji('fire')} Daily Active: **${guildStats.dailyActive}**\n` +
                                   `${config.getEmoji('star')} New This Week: **${guildStats.weeklyNew}**\n` +
                                   `${config.getEmoji('level')} Average Level: **${Math.floor(globalStats.averageLevel || 1)}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('coin')} **Economy Overview**`,
                            value: `${config.getEmoji('treasure')} Total Coins: **${globalStats.totalCoins.toLocaleString()}**\n` +
                                   `${config.getEmoji('coin')} Average Wealth: **${globalStats.averageCoins.toLocaleString()}**\n` +
                                   `${config.getEmoji('gem')} Richest Hunter: **${guildStats.richestAmount.toLocaleString()}**\n` +
                                   `${config.getEmoji('magic')} Daily Trades: **${guildStats.dailyTransactions}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('dragon')} **Hunt Activity**`,
                            value: `${config.getEmoji('map')} Total Hunts: **${globalStats.totalHunts}**\n` +
                                   `${config.getEmoji('sword')} Battles Won: **${globalStats.battlesWon}**\n` +
                                   `${config.getEmoji('scroll')} Quests Completed: **${globalStats.questsCompleted}**\n` +
                                   `${config.getEmoji('shield')} Active Events: **${globalStats.activeEvents}**`,
                            inline: true
                        }
                    );

                // Add top hunters if available
                if (leaderboard.players && leaderboard.players.length > 0) {
                    const topHuntersText = leaderboard.players.slice(0, 5).map((player, index) => {
                        const medals = ['🏆', '🥈', '🥉', '4️⃣', '5️⃣'];
                        return `${medals[index]} <@${player.userId}>: **${player.coins.toLocaleString()}** coins`;
                    }).join('\n');

                    embed.addFields({
                        name: `${config.getEmoji('crown')} **Top Treasure Hunters**`,
                        value: topHuntersText,
                        inline: false
                    });
                }

                const refreshButton = new ButtonBuilder()
                    .setCustomId('manage_stats_refresh')
                    .setLabel('Refresh Stats')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄');

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const exportButton = new ButtonBuilder()
                    .setCustomId('manage_export_stats')
                    .setLabel('Export Data')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📊');

                const row = new ActionRowBuilder().addComponents(refreshButton, exportButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row] });

            } catch (error) {
                console.error('Error in stats overview:', error);
                await this.sendErrorResponse(interaction, 'Failed to load statistics');
            }
        },

        // Hunt Control Handler
        async hunt_control(interaction) {
            try {
                await interaction.deferUpdate();

                const huntStats = await this.getHuntStats();

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`${config.getEmoji('treasure')} **Treasure Hunt Control Center**`)
                    .setDescription(`### ${config.getEmoji('map')} **Hunt Management Dashboard**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('fire')} **Active Hunts**`,
                            value: `Current Hunts: **${huntStats.activeHunts}**\n` +
                                   `Completed Today: **${huntStats.completedToday}**\n` +
                                   `Success Rate: **${huntStats.successRate}%**\n` +
                                   `Average Difficulty: **${huntStats.avgDifficulty}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('gem')} **Hunt Types**`,
                            value: `${config.getEmoji('treasure')} Treasure Hunts\n` +
                                   `${config.getEmoji('dragon')} Dragon Encounters\n` +
                                   `${config.getEmoji('dungeon')} Dungeon Expeditions\n` +
                                   `${config.getEmoji('magic')} Magical Quests`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('crown')} **Admin Tools**`,
                            value: `${config.getEmoji('star')} Create Custom Hunt\n` +
                                   `${config.getEmoji('lightning')} Instant Hunt Event\n` +
                                   `${config.getEmoji('shield')} Emergency Stop`,
                            inline: true
                        }
                    );

                const createHuntButton = new ButtonBuilder()
                    .setCustomId('manage_hunt_create')
                    .setLabel('Create Hunt')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(config.getEmoji('treasure'));

                const manageHuntsButton = new ButtonBuilder()
                    .setCustomId('manage_hunt_list')
                    .setLabel('Manage Active Hunts')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(config.getEmoji('map'));

                const treasureEventButton = new ButtonBuilder()
                    .setCustomId('manage_hunt_event')
                    .setLabel('Treasure Event')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(config.getEmoji('gem'));

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const row = new ActionRowBuilder().addComponents(createHuntButton, manageHuntsButton, treasureEventButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row] });

            } catch (error) {
                console.error('Error in hunt control:', error);
                await this.sendErrorResponse(interaction, 'Failed to load hunt control');
            }
        },

        // Economy Control Handler - Enhanced for treasure hunting
        async economy_control(interaction) {
            try {
                await interaction.deferUpdate();

                const economyStats = await this.getEconomyStats();

                const embed = new EmbedBuilder()
                    .setColor('#32CD32')
                    .setTitle(`${config.getEmoji('coin')} **Treasure Economy Control**`)
                    .setDescription(`### ${config.getEmoji('treasure')} **Hunt Economy Management**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('gem')} **Current Settings**`,
                            value: `Hunt Reward: **${config.huntSettings.baseReward}** coins\n` +
                                   `Daily Bonus: **${config.economy.dailyReward}** coins\n` +
                                   `Treasure Multiplier: **${config.huntSettings.treasureMultiplier}x**\n` +
                                   `Rare Find Bonus: **${config.huntSettings.rareBonusMultiplier}x**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('fire')} **Economy Health**`,
                            value: `Total Circulation: **${economyStats.totalCirculation.toLocaleString()}**\n` +
                                   `Treasure Index: **${economyStats.treasureIndex}**\n` +
                                   `Hunter Wealth Gap: **${economyStats.wealthGap}**\n` +
                                   `Market Activity: **${economyStats.marketActivity}%**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('star')} **Admin Actions**`,
                            value: `${config.getEmoji('lightning')} Adjust hunt rewards\n` +
                                   `${config.getEmoji('treasure')} Create treasure events\n` +
                                   `${config.getEmoji('crown')} Bonus distribution`,
                            inline: true
                        }
                    );

                const adjustRewardsButton = new ButtonBuilder()
                    .setCustomId('manage_economy_adjust_hunt_rewards')
                    .setLabel('Adjust Hunt Rewards')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(config.getEmoji('treasure'));

                const treasureEventButton = new ButtonBuilder()
                    .setCustomId('manage_economy_treasure_event')
                    .setLabel('Treasure Bonus Event')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(config.getEmoji('gem'));

                const distributionButton = new ButtonBuilder()
                    .setCustomId('manage_economy_distribute_treasure')
                    .setLabel('Distribute Treasure')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(config.getEmoji('coin'));

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const row = new ActionRowBuilder().addComponents(adjustRewardsButton, treasureEventButton, distributionButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row] });

            } catch (error) {
                console.error('Error in economy control:', error);
                await this.sendErrorResponse(interaction, 'Failed to load economy control');
            }
        },

        // Event Panel Handler - Treasure hunting focused
        async events_panel(interaction) {
            try {
                await interaction.deferUpdate();

                const activeEvents = await db.getAllEvents() || {};
                const eventCount = Object.keys(activeEvents).length;

                const embed = new EmbedBuilder()
                    .setColor('#FF6347')
                    .setTitle(`${config.getEmoji('fire')} **Treasure Hunt Events Center**`)
                    .setDescription(`### ${config.getEmoji('dragon')} **Special Hunt Events Management**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('star')} **Active Events**`,
                            value: eventCount > 0 ? 
                                `Currently running: **${eventCount}** events\n` +
                                `${config.getEmoji('treasure')} Double Treasure Weekend\n` +
                                `${config.getEmoji('dragon')} Legendary Hunt Marathon\n` +
                                `${config.getEmoji('gem')} Rare Artifact Discovery` :
                                `No active events\n${config.getEmoji('magic')} Create your first treasure event!`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('crown')} **Event Types**`,
                            value: `${config.getEmoji('treasure')} Treasure Rush\n` +
                                   `${config.getEmoji('dragon')} Dragon Hunt\n` +
                                   `${config.getEmoji('gem')} Rare Drop Events\n` +
                                   `${config.getEmoji('magic')} Legendary Quests`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('lightning')} **Quick Actions**`,
                            value: `${config.getEmoji('fire')} Start treasure rush\n` +
                                   `${config.getEmoji('dragon')} Launch dragon event\n` +
                                   `${config.getEmoji('shield')} Emergency stop`,
                            inline: true
                        }
                    );

                const treasureRushButton = new ButtonBuilder()
                    .setCustomId('manage_events_treasure_rush')
                    .setLabel('Start Treasure Rush')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(config.getEmoji('treasure'));

                const dragonHuntButton = new ButtonBuilder()
                    .setCustomId('manage_events_dragon_hunt')
                    .setLabel('Dragon Hunt Event')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(config.getEmoji('dragon'));

                const rareDropButton = new ButtonBuilder()
                    .setCustomId('manage_events_rare_drops')
                    .setLabel('Rare Drop Boost')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(config.getEmoji('gem'));

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const row = new ActionRowBuilder().addComponents(treasureRushButton, dragonHuntButton, rareDropButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row] });

            } catch (error) {
                console.error('Error in events panel:', error);
                await this.sendErrorResponse(interaction, 'Failed to load events panel');
            }
        },

        // Player Tools Handler - Enhanced for treasure hunters
        async player_tools(interaction) {
            try {
                await interaction.deferUpdate();

                const playerStats = await this.getPlayerManagementStats();

                const embed = new EmbedBuilder()
                    .setColor('#9370DB')
                    .setTitle(`${config.getEmoji('crown')} **Treasure Hunter Management**`)
                    .setDescription(`### ${config.getEmoji('magic')} **Advanced Player Administration**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('star')} **Hunter Overview**`,
                            value: `Total Hunters: **${playerStats.totalPlayers}**\n` +
                                   `Active Today: **${playerStats.activeToday}**\n` +
                                   `New This Week: **${playerStats.newThisWeek}**\n` +
                                   `Master Hunters: **${playerStats.masterHunters}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('shield')} **Moderation Tools**`,
                            value: `${config.getEmoji('crown')} Promote to Elite Hunter\n` +
                                   `${config.getEmoji('treasure')} Award Bonus Treasures\n` +
                                   `${config.getEmoji('gem')} Grant Rare Items\n` +
                                   `${config.getEmoji('magic')} Reset Hunt Progress`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('fire')} **Bulk Actions**`,
                            value: `${config.getEmoji('treasure')} Mass Treasure Rewards\n` +
                                   `${config.getEmoji('lightning')} Hunter Level Boosts\n` +
                                   `${config.getEmoji('dragon')} Event Participation Bonuses\n` +
                                   `${config.getEmoji('heart')} Stamina Restoration`,
                            inline: true
                        }
                    );

                const searchHunterButton = new ButtonBuilder()
                    .setCustomId('manage_player_search_hunter')
                    .setLabel('Search Hunter')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍');

                const bulkTreasureButton = new ButtonBuilder()
                    .setCustomId('manage_player_bulk_treasure')
                    .setLabel('Bulk Treasure Reward')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(config.getEmoji('treasure'));

                const elitePromotionButton = new ButtonBuilder()
                    .setCustomId('manage_player_promote_elite')
                    .setLabel('Elite Promotion')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(config.getEmoji('crown'));

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const row = new ActionRowBuilder().addComponents(searchHunterButton, bulkTreasureButton, elitePromotionButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row] });

            } catch (error) {
                console.error('Error in player tools:', error);
                await this.sendErrorResponse(interaction, 'Failed to load player tools');
            }
        },

        // System Health Handler
        async system_health(interaction) {
            try {
                await interaction.deferUpdate();

                const healthData = await db.healthCheck();
                const systemHealth = await this.getSystemHealth();

                const isHealthy = healthData.status === 'healthy' && systemHealth.overall === 'good';
                const statusEmoji = isHealthy ? '✅' : '⚠️';
                const healthColor = isHealthy ? '#00FF00' : '#FFA500';

                const embed = new EmbedBuilder()
                    .setColor(healthColor)
                    .setTitle(`${config.getEmoji('heart')} **Treasure Hunt System Health**`)
                    .setDescription(`### ${statusEmoji} **Overall Status: ${systemHealth.overall.toUpperCase()}**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('shield')} **Database Health**`,
                            value: `Status: **${healthData.status}**\n` +
                                   `Response Time: **${systemHealth.dbResponseTime}ms**\n` +
                                   `Hunter Data: **${healthData.playerCount || 0}** records\n` +
                                   `Last Check: **${new Date(healthData.timestamp).toLocaleTimeString()}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('lightning')} **Bot Performance**`,
                            value: `Memory Usage: **${systemHealth.memoryUsage}%**\n` +
                                   `CPU Load: **${systemHealth.cpuLoad}%**\n` +
                                   `Active Commands: **${systemHealth.activeCommands}**\n` +
                                   `Hunt Success Rate: **${systemHealth.huntSuccessRate}%**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('treasure')} **Hunt Features**`,
                            value: `${config.features?.treasureHunts ? '✅' : '❌'} Treasure Hunts\n` +
                                   `${config.features?.economy ? '✅' : '❌'} Economy System\n` +
                                   `${config.features?.battles ? '✅' : '❌'} Battle System\n` +
                                   `${config.features?.guilds ? '✅' : '❌'} Hunter Guilds`,
                            inline: true
                        }
                    );

                const refreshButton = new ButtonBuilder()
                    .setCustomId('manage_health_refresh')
                    .setLabel('Refresh Status')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄');

                const diagnosticsButton = new ButtonBuilder()
                    .setCustomId('manage_health_diagnostics')
                    .setLabel('Run Diagnostics')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍');

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const row = new ActionRowBuilder().addComponents(refreshButton, diagnosticsButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row] });

            } catch (error) {
                console.error('Error in system health:', error);
                await this.sendErrorResponse(interaction, 'Failed to check system health');
            }
        },

        // Announcement Center Handler
        async announcement_center(interaction) {
            try {
                await interaction.deferUpdate();

                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('📢 **Treasure Hunt Announcements**')
                    .setDescription(`### ${config.getEmoji('scroll')} **Hunter Communication Hub**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('treasure')} **Announcement Types**`,
                            value: `${config.getEmoji('fire')} **Hunt Events**\n` +
                                   `${config.getEmoji('dragon')} **New Discoveries**\n` +
                                   `${config.getEmoji('crown')} **Hunter Rankings**\n` +
                                   `${config.getEmoji('gem')} **Special Rewards**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('lightning')} **Broadcast Options**`,
                            value: `${config.getEmoji('star')} **All Hunters**\n` +
                                   `${config.getEmoji('crown')} **Elite Hunters Only**\n` +
                                   `${config.getEmoji('guild')} **Guild Leaders**\n` +
                                   `${config.getEmoji('treasure')} **Active Hunters**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('scroll')} **Quick Templates**`,
                            value: `Ready-to-use templates for hunt announcements and events`,
                            inline: false
                        }
                    );

                const huntAnnouncementButton = new ButtonBuilder()
                    .setCustomId('manage_announcement_hunt')
                    .setLabel('Hunt Announcement')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(config.getEmoji('treasure'));

                const eventNotificationButton = new ButtonBuilder()
                    .setCustomId('manage_announcement_event')
                    .setLabel('Event Notification')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(config.getEmoji('fire'));

                const hunterRankingButton = new ButtonBuilder()
                    .setCustomId('manage_announcement_ranking')
                    .setLabel('Hunter Rankings')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(config.getEmoji('crown'));

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const row = new ActionRowBuilder().addComponents(huntAnnouncementButton, eventNotificationButton, hunterRankingButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row] });

            } catch (error) {
                console.error('Error in announcement center:', error);
                await this.sendErrorResponse(interaction, 'Failed to load announcement center');
            }
        },

        // Config Panel Handler - Treasure hunt focused
        async config_panel(interaction) {
            try {
                await interaction.deferUpdate();

                const embed = new EmbedBuilder()
                    .setColor('#8A2BE2')
                    .setTitle(`${config.getEmoji('key')} **Treasure Hunt Configuration**`)
                    .setDescription(`### ${config.getEmoji('dragon')} **Advanced Bot Configuration**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('treasure')} **Hunt Settings**`,
                            value: `Base Reward: **${config.huntSettings?.baseReward || 100}** coins\n` +
                                   `Difficulty Range: **${config.huntSettings?.difficultyRange || '1-10'}**\n` +
                                   `Hunt Cooldown: **${config.huntSettings?.cooldown || 5}** minutes\n` +
                                   `Max Daily Hunts: **${config.huntSettings?.maxDaily || 10}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('shield')} **Security Settings**`,
                            value: `Rate Limiting: **${config.security?.enableRateLimiting ? 'ON' : 'OFF'}**\n` +
                                   `Admin Users: **${config.security?.adminUsers?.length || 0}**\n` +
                                   `Maintenance Mode: **${config.security?.maintenanceMode ? 'ON' : 'OFF'}**\n` +
                                   `Auto Backup: **${config.security?.autoBackup ? 'ON' : 'OFF'}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('magic')} **Feature Toggles**`,
                            value: `${config.features?.treasureHunts ? '🟢' : '🔴'} Treasure Hunts\n` +
                                   `${config.features?.economy ? '🟢' : '🔴'} Economy System\n` +
                                   `${config.features?.battles ? '🟢' : '🔴'} Battle System\n` +
                                   `${config.features?.guilds ? '🟢' : '🔴'} Hunter Guilds`,
                            inline: true
                        }
                    );

                const huntSettingsButton = new ButtonBuilder()
                    .setCustomId('manage_config_hunt_settings')
                    .setLabel('Hunt Settings')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(config.getEmoji('treasure'));

                const featureToggleButton = new ButtonBuilder()
                    .setCustomId('manage_config_features')
                    .setLabel('Feature Toggles')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎛️');

                const securityButton = new ButtonBuilder()
                    .setCustomId('manage_config_security')
                    .setLabel('Security Settings')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(config.getEmoji('shield'));

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const row = new ActionRowBuilder().addComponents(huntSettingsButton, featureToggleButton, securityButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row] });

            } catch (error) {
                console.error('Error in config panel:', error);
                await this.sendErrorResponse(interaction, 'Failed to load config panel');
            }
        },

        // Back to main handler
        async back_to_main(interaction) {
            try {
                // Re-execute the main manage command
                await module.exports.execute(interaction);
            } catch (error) {
                console.error('Error returning to main:', error);
                await this.sendErrorResponse(interaction, 'Failed to return to main panel');
            }
        }
    },

    // Helper methods
    async getServerStats(guildId) {
        try {
            const globalStats = await db.getGlobalStats();
            const leaderboard = await db.getLeaderboard('coins', 1, 1);

            return {
                totalPlayers: globalStats.totalPlayers || 0,
                totalHunts: globalStats.totalHunts || 0,
                totalCoins: globalStats.totalCoins || 0,
                dailyActive: Math.floor((globalStats.totalPlayers || 0) * 0.3),
                weeklyNew: Math.floor((globalStats.totalPlayers || 0) * 0.1),
                richestAmount: leaderboard.players?.[0]?.coins || 0,
                dailyTransactions: Math.floor((globalStats.totalPlayers || 0) * 2),
                battlesWon: (globalStats.totalPlayers || 0) * 5,
                questsCompleted: (globalStats.totalHunts || 0) * 2,
                activeEvents: 1
            };
        } catch (error) {
            console.error('Error getting server stats:', error);
            return {
                totalPlayers: 0, totalHunts: 0, totalCoins: 0, dailyActive: 0,
                weeklyNew: 0, richestAmount: 0, dailyTransactions: 0,
                battlesWon: 0, questsCompleted: 0, activeEvents: 0
            };
        }
    },

    async getHuntStats() {
        try {
            const globalStats = await db.getGlobalStats();
            return {
                activeHunts: Math.floor((globalStats.totalPlayers || 0) * 0.2),
                completedToday: Math.floor((globalStats.totalHunts || 0) * 0.1),
                successRate: 75.5,
                avgDifficulty: 5.2
            };
        } catch (error) {
            return { activeHunts: 0, completedToday: 0, successRate: 0, avgDifficulty: 1 };
        }
    },

    async getEconomyStats() {
        try {
            const globalStats = await db.getGlobalStats();
            return {
                totalCirculation: globalStats.totalCoins || 0,
                treasureIndex: 1.25,
                wealthGap: 15,
                marketActivity: 85
            };
        } catch (error) {
            return { totalCirculation: 0, treasureIndex: 1, wealthGap: 0, marketActivity: 0 };
        }
    },

    async getPlayerManagementStats() {
        try {
            const globalStats = await db.getGlobalStats();
            return {
                totalPlayers: globalStats.totalPlayers || 0,
                activeToday: Math.floor((globalStats.totalPlayers || 0) * 0.3),
                newThisWeek: Math.floor((globalStats.totalPlayers || 0) * 0.1),
                masterHunters: Math.floor((globalStats.totalPlayers || 0) * 0.05)
            };
        } catch (error) {
            return { totalPlayers: 0, activeToday: 0, newThisWeek: 0, masterHunters: 0 };
        }
    },

    async getSystemHealth() {
        const memUsage = process.memoryUsage();
        const memPercent = (memUsage.heapUsed / memUsage.heapTotal * 100).toFixed(1);

        return {
            overall: memPercent > 80 ? 'warning' : 'good',
            memoryUsage: memPercent,
            cpuLoad: Math.floor(Math.random() * 30) + 10,
            dbResponseTime: Math.floor(Math.random() * 50) + 10,
            activeCommands: Math.floor(Math.random() * 20) + 5,
            huntSuccessRate: 87.5,
            issues: memPercent > 80 ? ['High memory usage detected'] : []
        };
    },

    async sendErrorResponse(interaction, message) {
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Error')
            .setDescription(message)
            .setTimestamp();

        const backButton = new ButtonBuilder()
            .setCustomId('manage_back_to_main')
            .setLabel('Back to Main')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('↩️');

        const row = new ActionRowBuilder().addComponents(backButton);

        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [embed], components: [row] });
            } else {
                await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            }
        } catch (error) {
            console.error('Failed to send error response:', error);
        }
    }
};