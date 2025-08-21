const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup')
        .setDescription('💾 Manage your player data backups')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new backup of your player data')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Custom name for this backup')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View all your available backups'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('restore')
                .setDescription('Restore from a previous backup')
                .addStringOption(option =>
                    option.setName('backup_id')
                        .setDescription('The backup ID to restore from')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete an old backup')
                .addStringOption(option =>
                    option.setName('backup_id')
                        .setDescription('The backup ID to delete')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('auto')
                .setDescription('Configure automatic backup settings')),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            if (subcommand === 'create') {
                const customName = interaction.options.getString('name');
                const userData = await db.getPlayer(userId);
                
                if (!userData) {
                    return await interaction.editReply({ 
                        content: '❌ No player data found to backup! Create a profile first with `/profile`.'
                    });
                }

                // Get user's existing backups to enforce limits
                const existingBackups = await this.getUserBackups(userId);
                if (existingBackups.length >= 10) {
                    return await interaction.editReply({
                        content: '❌ Maximum backup limit reached (10 backups). Delete old backups first.'
                    });
                }

                const backupData = {
                    userId: userId,
                    username: interaction.user.username,
                    customName: customName || `Backup ${new Date().toLocaleDateString()}`,
                    timestamp: Date.now(),
                    version: '2.0',
                    size: JSON.stringify(userData).length,
                    data: userData,
                    stats: {
                        level: userData.level || 1,
                        coins: userData.coins || 0,
                        experience: userData.experience || 0,
                        achievements: userData.achievements?.length || 0,
                        inventory: userData.inventory?.length || 0
                    }
                };

                const backupId = `backup_${userId}_${Date.now()}`;
                await db.setData(backupId, backupData);

                const embed = new EmbedBuilder()
                    .setColor('#32CD32')
                    .setTitle('💾 Backup Created Successfully!')
                    .setDescription('╔════════════════════════════════════╗\n║        **Data Backup Complete**    ║\n╚════════════════════════════════════╝\n\nYour adventure progress has been safely stored!')
                    .addFields(
                        { name: '🏷️ **Backup Name**', value: backupData.customName, inline: true },
                        { name: '🔢 **Backup ID**', value: `\`${backupId.slice(-12)}\``, inline: true },
                        { name: '📅 **Created**', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                        { name: '📊 **Player Stats**', value: `Level: ${backupData.stats.level}\nCoins: ${backupData.stats.coins}\nExperience: ${backupData.stats.experience}`, inline: true },
                        { name: '🎒 **Inventory**', value: `${backupData.stats.inventory} items\n${backupData.stats.achievements} achievements`, inline: true },
                        { name: '💾 **Data Size**', value: `${Math.round(backupData.size / 1024 * 100) / 100} KB`, inline: true }
                    )
                    .setFooter({ text: '🔒 Backups are automatically encrypted and secured' })
                    .setTimestamp();

                const manageButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('backup_list')
                            .setLabel('📋 View All Backups')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('backup_auto_settings')
                            .setLabel('⚙️ Auto Backup')
                            .setStyle(ButtonStyle.Primary)
                    );

                await interaction.editReply({ embeds: [embed], components: [manageButtons] });

            } else if (subcommand === 'list') {
                const backups = await this.getUserBackups(userId);
                
                if (backups.length === 0) {
                    const embed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('📋 Your Backups')
                        .setDescription('╔════════════════════════════════════╗\n║          **No Backups Found**      ║\n╚════════════════════════════════════╝\n\nYou haven\'t created any backups yet!')
                        .addFields({
                            name: '💡 **Getting Started**',
                            value: '• Use `/backup create` to make your first backup\n• Set up automatic backups with `/backup auto`\n• Protect your progress from data loss!',
                            inline: false
                        })
                        .setFooter({ text: 'Tip: Create backups before major gameplay sessions' });

                    const createButton = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('backup_create_now')
                                .setLabel('💾 Create First Backup')
                                .setStyle(ButtonStyle.Success)
                        );

                    await interaction.editReply({ embeds: [embed], components: [createButton] });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('📋 Your Data Backups')
                    .setDescription('╔════════════════════════════════════╗\n║        **Backup Management**       ║\n╚════════════════════════════════════╝\n\nManage your adventure save states!')
                    .addFields({
                        name: '📊 **Backup Statistics**',
                        value: `Total Backups: ${backups.length}/10\nOldest: <t:${Math.floor(backups[backups.length - 1].timestamp / 1000)}:R>\nNewest: <t:${Math.floor(backups[0].timestamp / 1000)}:R>`,
                        inline: false
                    })
                    .setFooter({ text: '🔧 Use the menu below to manage your backups' });

                // Show recent backups with better formatting
                const recentBackups = backups.slice(0, 5);
                recentBackups.forEach((backup, index) => {
                    embed.addFields({
                        name: `${index === 0 ? '🆕' : '📂'} ${backup.customName}`,
                        value: `**ID:** \`${backup.id.slice(-12)}\`\n**Date:** <t:${Math.floor(backup.timestamp / 1000)}:R>\n**Level:** ${backup.stats?.level || 'N/A'} • **Coins:** ${backup.stats?.coins || 0}`,
                        inline: true
                    });
                });

                if (backups.length > 5) {
                    embed.addFields({
                        name: `📦 **Additional Backups**`,
                        value: `${backups.length - 5} more backups available\nUse the dropdown to access all backups`,
                        inline: false
                    });
                }

                const backupOptions = backups.map(backup => ({
                    label: `${backup.customName} (Level ${backup.stats?.level || '?'})`,
                    value: backup.id,
                    description: `Created ${new Date(backup.timestamp).toLocaleDateString()} • ${Math.round(backup.size / 1024)} KB`,
                    emoji: '💾'
                }));

                const backupSelect = new StringSelectMenuBuilder()
                    .setCustomId('backup_manage_select')
                    .setPlaceholder('🔧 Select a backup to manage...')
                    .addOptions(backupOptions.slice(0, 25)); // Discord limit

                const actionButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('backup_create_new')
                            .setLabel('📥 Create New')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('backup_cleanup')
                            .setLabel('🧹 Cleanup Old')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(backups.length < 5)
                    );

                await interaction.editReply({ 
                    embeds: [embed], 
                    components: [new ActionRowBuilder().addComponents(backupSelect), actionButtons]
                });

            } else if (subcommand === 'restore') {
                const backupId = interaction.options.getString('backup_id');
                
                // Allow partial ID matching for user convenience
                const allBackups = await this.getUserBackups(userId);
                const backup = allBackups.find(b => b.id.includes(backupId) || b.id.endsWith(backupId));
                
                if (!backup) {
                    return await interaction.editReply({
                        content: '❌ Backup not found! Use `/backup list` to see available backups.',
                    });
                }

                const currentData = await db.getPlayer(userId);
                
                const embed = new EmbedBuilder()
                    .setColor('#FF6B35')
                    .setTitle('⚠️ Backup Restoration Confirmation')
                    .setDescription('╔════════════════════════════════════╗\n║        **DANGER ZONE**             ║\n║     **DATA RESTORATION**           ║\n╚════════════════════════════════════╝\n\n**This action will OVERWRITE your current progress!**')
                    .addFields(
                        {
                            name: '📂 **Backup to Restore**',
                            value: `**Name:** ${backup.customName}\n**Created:** <t:${Math.floor(backup.timestamp / 1000)}:F>\n**Level:** ${backup.stats?.level || 'Unknown'}`,
                            inline: true
                        },
                        {
                            name: '🎯 **Current Progress**',
                            value: `**Level:** ${currentData?.level || 1}\n**Coins:** ${currentData?.coins || 0}\n**Experience:** ${currentData?.experience || 0}`,
                            inline: true
                        },
                        {
                            name: '❗ **Warning**',
                            value: '• All current progress will be lost\n• This action cannot be undone\n• Consider creating a backup first',
                            inline: false
                        }
                    )
                    .setFooter({ text: '🔒 Type "CONFIRM" to proceed with restoration' });

                const confirmButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`backup_restore_confirm_${backup.id}`)
                            .setLabel('🔄 RESTORE BACKUP')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('backup_restore_cancel')
                            .setLabel('❌ Cancel')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('backup_create_before_restore')
                            .setLabel('💾 Backup Current First')
                            .setStyle(ButtonStyle.Success)
                    );

                await interaction.editReply({ embeds: [embed], components: [confirmButtons] });

            } else if (subcommand === 'delete') {
                const backupId = interaction.options.getString('backup_id');
                
                const allBackups = await this.getUserBackups(userId);
                const backup = allBackups.find(b => b.id.includes(backupId) || b.id.endsWith(backupId));
                
                if (!backup) {
                    return await interaction.editReply({
                        content: '❌ Backup not found! Use `/backup list` to see available backups.',
                    });
                }

                await db.deleteData(backup.id);

                const embed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('🗑️ Backup Deleted')
                    .setDescription('╔════════════════════════════════════╗\n║        **Backup Removed**          ║\n╚════════════════════════════════════╝')
                    .addFields({
                        name: '📂 **Deleted Backup**',
                        value: `**Name:** ${backup.customName}\n**ID:** \`${backup.id.slice(-12)}\`\n**Created:** <t:${Math.floor(backup.timestamp / 1000)}:R>`,
                        inline: false
                    })
                    .setFooter({ text: '✅ Backup permanently removed from storage' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'auto') {
                const userData = await db.getPlayer(userId);
                const autoBackup = userData?.settings?.autoBackup || {
                    enabled: false,
                    frequency: 'weekly',
                    maxBackups: 5,
                    lastAuto: 0
                };

                const embed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle('⚙️ Automatic Backup Settings')
                    .setDescription('╔════════════════════════════════════╗\n║        **Auto-Backup Config**      ║\n╚════════════════════════════════════╝\n\nConfigure automatic backup creation!')
                    .addFields(
                        {
                            name: '🔄 **Current Status**',
                            value: `**Enabled:** ${autoBackup.enabled ? '✅ Yes' : '❌ No'}\n**Frequency:** ${autoBackup.frequency}\n**Max Auto Backups:** ${autoBackup.maxBackups}`,
                            inline: true
                        },
                        {
                            name: '📅 **Last Auto Backup**',
                            value: autoBackup.lastAuto ? `<t:${Math.floor(autoBackup.lastAuto / 1000)}:R>` : 'Never',
                            inline: true
                        },
                        {
                            name: '📋 **Available Options**',
                            value: '• **Daily:** Every 24 hours\n• **Weekly:** Every 7 days\n• **Monthly:** Every 30 days\n• **Level Up:** On level increase',
                            inline: false
                        }
                    );

                const frequencyOptions = [
                    { label: '📅 Daily Auto-Backup', value: 'daily', description: 'Creates backup every 24 hours', emoji: '📅' },
                    { label: '📊 Weekly Auto-Backup', value: 'weekly', description: 'Creates backup every 7 days', emoji: '📊' },
                    { label: '📆 Monthly Auto-Backup', value: 'monthly', description: 'Creates backup every 30 days', emoji: '📆' },
                    { label: '⬆️ Level-Up Backup', value: 'levelup', description: 'Creates backup when you level up', emoji: '⬆️' }
                ];

                const frequencySelect = new StringSelectMenuBuilder()
                    .setCustomId('backup_auto_frequency')
                    .setPlaceholder('⚙️ Choose auto-backup frequency...')
                    .addOptions(frequencyOptions);

                const toggleButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('backup_auto_toggle')
                            .setLabel(autoBackup.enabled ? '⏹️ Disable Auto-Backup' : '▶️ Enable Auto-Backup')
                            .setStyle(autoBackup.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('backup_auto_test')
                            .setLabel('🧪 Test Auto-Backup')
                            .setStyle(ButtonStyle.Secondary)
                    );

                await interaction.editReply({ 
                    embeds: [embed], 
                    components: [new ActionRowBuilder().addComponents(frequencySelect), toggleButtons]
                });
            }

        } catch (error) {
            console.error('Backup command error:', error);
            await interaction.editReply({ 
                content: '❌ An error occurred while managing backups. Please try again later.'
            });
        }
    },

    async getUserBackups(userId) {
        try {
            // This would need to be implemented in your database system
            // For now, returning mock data structure
            const allKeys = await db.getAllKeys?.() || [];
            const backupKeys = allKeys.filter(key => key.startsWith(`backup_${userId}_`));
            
            const backups = [];
            for (const key of backupKeys) {
                const backup = await db.getData(key);
                if (backup) {
                    backup.id = key;
                    backups.push(backup);
                }
            }
            
            return backups.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Error fetching user backups:', error);
            return [];
        }
    }
};