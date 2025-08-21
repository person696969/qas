
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('💸 Advanced money transfer services with security features')
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Send coins to another player')
                .addUserOption(option =>
                    option.setName('recipient')
                        .setDescription('The player to send coins to')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount of coins to transfer')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1000000))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Optional message with the transfer')
                        .setRequired(false)
                        .setMaxLength(200))
                .addBooleanOption(option =>
                    option.setName('anonymous')
                        .setDescription('Send anonymously (higher fee)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('request')
                .setDescription('Request coins from another player')
                .addUserOption(option =>
                    option.setName('from')
                        .setDescription('Player to request coins from')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to request')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100000))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for the request')
                        .setRequired(false)
                        .setMaxLength(150)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('View your transfer history and statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pending')
                .setDescription('Manage pending transfer requests'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('limits')
                .setDescription('View your transfer limits and upgrade options'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('schedule')
                .setDescription('Schedule recurring transfers (Premium feature)')
                .addUserOption(option =>
                    option.setName('recipient')
                        .setDescription('Recipient for scheduled transfer')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount per transfer')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('frequency')
                        .setDescription('Transfer frequency')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Daily', value: 'daily' },
                            { name: 'Weekly', value: 'weekly' },
                            { name: 'Monthly', value: 'monthly' }
                        ))),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;
            
            let player = await db.getPlayer(userId);
            if (!player) {
                const embed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('❌ Account Required')
                    .setDescription('You need to create a profile first! Use `/profile` to get started.')
                    .setFooter({ text: 'New to our transfer services?' });
                
                return interaction.editReply({ embeds: [embed] });
            }

            // Initialize transfer structure if needed
            if (!player.transfers) {
                player.transfers = {
                    history: [],
                    pending: [],
                    scheduled: [],
                    totalSent: 0,
                    totalReceived: 0,
                    transferCount: 0,
                    trustScore: 100,
                    dailyLimit: 50000,
                    monthlyLimit: 500000,
                    dailyUsed: 0,
                    monthlyUsed: 0,
                    lastReset: Date.now(),
                    premiumFeatures: false
                };
                await db.updatePlayer(userId, player);
            }

            switch (subcommand) {
                case 'send':
                    await this.handleSendTransfer(interaction, player);
                    break;
                case 'request':
                    await this.handleRequestMoney(interaction, player);
                    break;
                case 'history':
                    await this.handleTransferHistory(interaction, player);
                    break;
                case 'pending':
                    await this.handlePendingRequests(interaction, player);
                    break;
                case 'limits':
                    await this.handleTransferLimits(interaction, player);
                    break;
                case 'schedule':
                    await this.handleScheduledTransfers(interaction, player);
                    break;
            }

        } catch (error) {
            console.error('Error in transfer command:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Transfer Service Error')
                .setDescription('An error occurred while processing your transfer. Please try again later.')
                .setFooter({ text: 'If this persists, contact our support team' });
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },

    async handleSendTransfer(interaction, player) {
        const recipient = interaction.options.getUser('recipient');
        const amount = interaction.options.getInteger('amount');
        const message = interaction.options.getString('message') || '';
        const anonymous = interaction.options.getBoolean('anonymous') || false;
        const userId = interaction.user.id;

        // Validation checks
        if (recipient.id === userId) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Invalid Transfer')
                .setDescription('You cannot transfer coins to yourself!')
                .setFooter({ text: 'Try sending to a friend instead' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        if (recipient.bot) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Invalid Recipient')
                .setDescription('You cannot transfer coins to bots!')
                .setFooter({ text: 'Only transfer to real players' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        // Check if recipient exists
        const recipientData = await db.getPlayer(recipient.id);
        if (!recipientData) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Recipient Not Found')
                .setDescription(`${recipient.displayName} needs to create a profile first!`)
                .addFields({
                    name: '💡 How to Fix',
                    value: `Ask ${recipient.displayName} to use \`/profile\` to create their account first.`
                })
                .setFooter({ text: 'Both sender and recipient need active profiles' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        // Reset daily/monthly limits if needed
        this.resetTransferLimits(player);

        // Calculate fees
        const feeStructure = this.calculateTransferFees(amount, anonymous, player.transfers.trustScore);
        const totalCost = amount + feeStructure.totalFee;

        // Check balance
        if (player.coins < totalCost) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Insufficient Funds')
                .setDescription(`You need ${totalCost.toLocaleString()} coins for this transfer.`)
                .addFields(
                    { name: '💰 Your Balance', value: `${(player.coins || 0).toLocaleString()} coins`, inline: true },
                    { name: '💸 Transfer Amount', value: `${amount.toLocaleString()} coins`, inline: true },
                    { name: '💳 Total Cost', value: `${totalCost.toLocaleString()} coins (includes fees)`, inline: true },
                    { name: '📊 Fee Breakdown', value: `**Transfer Fee:** ${feeStructure.transferFee} coins\n**Processing Fee:** ${feeStructure.processingFee} coins\n**Anonymous Fee:** ${feeStructure.anonymousFee} coins`, inline: false }
                )
                .setFooter({ text: 'Earn more coins to complete your transfer' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        // Check transfer limits
        if (player.transfers.dailyUsed + amount > player.transfers.dailyLimit) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Daily Limit Exceeded')
                .setDescription('This transfer would exceed your daily limit.')
                .addFields(
                    { name: '📊 Daily Usage', value: `${player.transfers.dailyUsed.toLocaleString()} / ${player.transfers.dailyLimit.toLocaleString()} coins`, inline: true },
                    { name: '💸 Remaining Today', value: `${(player.transfers.dailyLimit - player.transfers.dailyUsed).toLocaleString()} coins`, inline: true },
                    { name: '⏰ Limit Reset', value: 'Tomorrow at midnight', inline: true }
                )
                .setFooter({ text: 'Upgrade to Premium for higher limits!' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        // Create transfer confirmation
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('💸 **Transfer Confirmation**')
            .setDescription('**Adventurer Transfer Services**\n\n*Please review your transfer details carefully*')
            .addFields(
                {
                    name: '👤 **Transfer Details**',
                    value: `**To:** ${anonymous ? '🎭 Anonymous Recipient' : recipient.displayName}\n**Amount:** ${amount.toLocaleString()} coins\n**Message:** ${message || '*No message*'}\n**Type:** ${anonymous ? 'Anonymous' : 'Standard'} Transfer`,
                    inline: true
                },
                {
                    name: '💳 **Cost Breakdown**',
                    value: `**Transfer Amount:** ${amount.toLocaleString()} coins\n**Transfer Fee:** ${feeStructure.transferFee} coins\n**Processing Fee:** ${feeStructure.processingFee} coins\n**Total Cost:** ${totalCost.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '📊 **Account Impact**',
                    value: `**Current Balance:** ${player.coins.toLocaleString()} coins\n**After Transfer:** ${(player.coins - totalCost).toLocaleString()} coins\n**Daily Limit Used:** ${((player.transfers.dailyUsed + amount) / player.transfers.dailyLimit * 100).toFixed(1)}%\n**Trust Score:** ${player.transfers.trustScore}/100`,
                    inline: true
                }
            );

        if (feeStructure.savings > 0) {
            embed.addFields({
                name: '💰 **Trust Score Benefits**',
                value: `Your excellent trust score saved you ${feeStructure.savings} coins in fees!`,
                inline: false
            });
        }

        embed.setFooter({ text: 'Transfers are processed instantly and cannot be reversed' })
            .setTimestamp();

        // Action buttons
        const confirmButton = new ButtonBuilder()
            .setCustomId('transfer_confirm')
            .setLabel('Confirm Transfer')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');

        const cancelButton = new ButtonBuilder()
            .setCustomId('transfer_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌');

        const editButton = new ButtonBuilder()
            .setCustomId('transfer_edit')
            .setLabel('Edit Details')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️');

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton, editButton);

        const response = await interaction.editReply({
            embeds: [embed],
            components: [row]
        });

        // Handle button interactions
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000 // 5 minutes
        });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                return buttonInteraction.reply({
                    content: '❌ You cannot interact with someone else\'s transfer!',
                    ephemeral: true
                });
            }

            try {
                await buttonInteraction.deferUpdate();

                switch (buttonInteraction.customId) {
                    case 'transfer_confirm':
                        await this.processTransfer(buttonInteraction, player, recipient, amount, feeStructure, message, anonymous);
                        break;
                    
                    case 'transfer_cancel':
                        const cancelEmbed = new EmbedBuilder()
                            .setColor('#808080')
                            .setTitle('❌ Transfer Cancelled')
                            .setDescription('Your transfer has been cancelled. No coins were moved.')
                            .setFooter({ text: 'You can start a new transfer anytime' });
                        
                        await buttonInteraction.editReply({
                            embeds: [cancelEmbed],
                            components: []
                        });
                        break;
                    
                    case 'transfer_edit':
                        const editEmbed = new EmbedBuilder()
                            .setColor('#4169E1')
                            .setTitle('✏️ Edit Transfer')
                            .setDescription('To edit your transfer details, please cancel and start a new transfer with `/transfer send`.')
                            .setFooter({ text: 'We ensure security by requiring fresh transfers for edits' });
                        
                        await buttonInteraction.editReply({
                            embeds: [editEmbed],
                            components: []
                        });
                        break;
                }
            } catch (error) {
                console.error('Transfer button interaction error:', error);
            }
        });

        collector.on('end', () => {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle('⏰ Transfer Expired')
                .setDescription('Your transfer confirmation has timed out. Please start a new transfer.');
            
            interaction.editReply({
                embeds: [timeoutEmbed],
                components: []
            }).catch(() => {});
        });
    },

    async handleRequestMoney(interaction, player) {
        const fromUser = interaction.options.getUser('from');
        const amount = interaction.options.getInteger('amount');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const userId = interaction.user.id;

        if (fromUser.id === userId) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Invalid Request')
                .setDescription('You cannot request money from yourself!')
                .setFooter({ text: 'Try requesting from a friend instead' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        // Check if target user exists
        const fromUserData = await db.getPlayer(fromUser.id);
        if (!fromUserData) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ User Not Found')
                .setDescription(`${fromUser.displayName} needs to create a profile first!`)
                .setFooter({ text: 'Both users need active profiles' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        // Initialize transfers object if needed for target user
        if (!fromUserData.transfers) {
            fromUserData.transfers = {
                history: [],
                pending: [],
                scheduled: [],
                totalSent: 0,
                totalReceived: 0,
                transferCount: 0,
                trustScore: 100,
                dailyLimit: 50000,
                monthlyLimit: 500000,
                dailyUsed: 0,
                monthlyUsed: 0,
                lastReset: Date.now(),
                premiumFeatures: false
            };
        }

        // Check for duplicate requests
        const existingRequest = fromUserData.transfers.pending.find(req => 
            req.from === userId && req.type === 'money_request'
        );

        if (existingRequest) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Duplicate Request')
                .setDescription(`You already have a pending money request to ${fromUser.displayName}.`)
                .addFields({
                    name: '📋 Existing Request',
                    value: `**Amount:** ${existingRequest.amount.toLocaleString()} coins\n**Date:** ${new Date(existingRequest.timestamp).toLocaleDateString()}`
                })
                .setFooter({ text: 'Wait for them to respond or cancel your existing request' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        // Create money request
        const requestId = Date.now().toString();
        const request = {
            id: requestId,
            type: 'money_request',
            from: userId,
            fromName: interaction.user.displayName,
            amount: amount,
            reason: reason,
            timestamp: Date.now(),
            status: 'pending'
        };

        fromUserData.transfers.pending.push(request);
        await db.updatePlayer(fromUser.id, fromUserData);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('📤 **Money Request Sent**')
            .setDescription(`Your money request has been sent to ${fromUser.displayName}!`)
            .addFields(
                { name: '💰 Amount Requested', value: `${amount.toLocaleString()} coins`, inline: true },
                { name: '📝 Reason', value: reason, inline: true },
                { name: '📋 Request ID', value: `#${requestId.slice(-6)}`, inline: true }
            )
            .setFooter({ text: 'They will receive a notification and can approve or deny your request' })
            .setTimestamp();

        // Try to notify the recipient
        try {
            const notificationEmbed = new EmbedBuilder()
                .setColor('#4169E1')
                .setTitle('💰 **Money Request Received**')
                .setDescription(`${interaction.user.displayName} has requested money from you!`)
                .addFields(
                    { name: '💸 Amount', value: `${amount.toLocaleString()} coins`, inline: true },
                    { name: '📝 Reason', value: reason, inline: true },
                    { name: '⏰ Received', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                )
                .setFooter({ text: 'Use /transfer pending to manage this request' });

            await fromUser.send({ embeds: [notificationEmbed] });
        } catch (error) {
            // DM failed, but request was still sent
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleTransferHistory(interaction, player) {
        const transfers = player.transfers || { history: [] };
        const history = transfers.history || [];

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📊 **Transfer History & Statistics**')
            .setDescription('**Complete Transfer Activity Report**\n\n*Track all your sending and receiving activity*')
            .addFields(
                {
                    name: '💰 **Overall Statistics**',
                    value: `**Total Sent:** ${(transfers.totalSent || 0).toLocaleString()} coins\n**Total Received:** ${(transfers.totalReceived || 0).toLocaleString()} coins\n**Net Flow:** ${((transfers.totalReceived || 0) - (transfers.totalSent || 0)).toLocaleString()} coins\n**Transfer Count:** ${transfers.transferCount || 0} transactions`,
                    inline: true
                },
                {
                    name: '📈 **Performance Metrics**',
                    value: `**Trust Score:** ${transfers.trustScore || 100}/100\n**Average Transfer:** ${history.length > 0 ? Math.floor((transfers.totalSent || 0) / Math.max(history.length, 1)).toLocaleString() : '0'} coins\n**Success Rate:** ${this.calculateSuccessRate(history)}%\n**Account Status:** ${this.getAccountStatus(transfers)}`,
                    inline: true
                },
                {
                    name: '🎯 **Current Limits**',
                    value: `**Daily Limit:** ${transfers.dailyLimit.toLocaleString()} coins\n**Daily Used:** ${transfers.dailyUsed.toLocaleString()} coins\n**Monthly Limit:** ${transfers.monthlyLimit.toLocaleString()} coins\n**Remaining Today:** ${(transfers.dailyLimit - transfers.dailyUsed).toLocaleString()} coins`,
                    inline: true
                }
            );

        // Add recent transfer history
        if (history.length > 0) {
            const recentTransfers = history.slice(-5).reverse().map(transfer => {
                const typeEmoji = transfer.type === 'sent' ? '📤' : '📥';
                const statusEmoji = transfer.status === 'completed' ? '✅' : transfer.status === 'failed' ? '❌' : '⏳';
                return `${typeEmoji} ${statusEmoji} **${transfer.amount.toLocaleString()}** coins ${transfer.type === 'sent' ? 'to' : 'from'} ${transfer.otherParty}\n└ ${new Date(transfer.timestamp).toLocaleDateString()} • ${transfer.status}`;
            }).join('\n\n');
            
            embed.addFields({
                name: '📋 **Recent Activity**',
                value: recentTransfers,
                inline: false
            });
        } else {
            embed.addFields({
                name: '📋 **Recent Activity**',
                value: 'No transfer history found. Start sending or receiving coins to see your activity here!',
                inline: false
            });
        }

        // Action buttons
        const detailedButton = new ButtonBuilder()
            .setCustomId('transfer_detailed_history')
            .setLabel('Detailed History')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📊');

        const exportButton = new ButtonBuilder()
            .setCustomId('transfer_export_history')
            .setLabel('Export Data')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📄');

        const analyticsButton = new ButtonBuilder()
            .setCustomId('transfer_analytics')
            .setLabel('Analytics')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📈');

        const row = new ActionRowBuilder().addComponents(detailedButton, exportButton, analyticsButton);

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    },

    async handlePendingRequests(interaction, player) {
        const pending = player.transfers?.pending || [];
        
        if (pending.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ No Pending Requests')
                .setDescription('You have no pending transfer requests!')
                .setFooter({ text: 'All caught up!' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📋 **Pending Transfer Requests**')
            .setDescription('**Review and manage your pending requests**\n\n*Take action on requests sent to you*');

        // Group requests by type
        const moneyRequests = pending.filter(req => req.type === 'money_request');
        
        if (moneyRequests.length > 0) {
            const requestsList = moneyRequests.slice(0, 5).map(req => {
                const timeAgo = new Date(req.timestamp).toLocaleDateString();
                return `💰 **${req.amount.toLocaleString()}** coins from **${req.fromName}**\n└ *${req.reason}* • ${timeAgo}`;
            }).join('\n\n');
            
            embed.addFields({
                name: `💸 Money Requests (${moneyRequests.length})`,
                value: requestsList,
                inline: false
            });
        }

        // Create select menu for managing requests
        if (pending.length > 0) {
            const options = pending.slice(0, 10).map(req => ({
                label: `${req.amount.toLocaleString()} coins from ${req.fromName}`,
                description: req.reason.slice(0, 50),
                value: req.id,
                emoji: '💰'
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('manage_pending_request')
                .setPlaceholder('Select a request to manage...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
        } else {
            await interaction.editReply({ embeds: [embed] });
        }
    },

    async handleTransferLimits(interaction, player) {
        const transfers = player.transfers || {};
        this.resetTransferLimits(player);

        const currentTier = this.getAccountTier(player);
        const nextTier = this.getNextTier(currentTier);

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📊 **Transfer Limits & Account Tiers**')
            .setDescription('**Understanding Your Transfer Capacity**\n\n*Increase limits by improving your account standing*')
            .addFields(
                {
                    name: '🎯 **Current Tier: ' + currentTier.name + '**',
                    value: `**Daily Limit:** ${transfers.dailyLimit.toLocaleString()} coins\n**Monthly Limit:** ${transfers.monthlyLimit.toLocaleString()} coins\n**Trust Score:** ${transfers.trustScore}/100\n**Transfer Fee:** ${currentTier.feeRate * 100}%`,
                    inline: true
                },
                {
                    name: '📈 **Usage Today**',
                    value: `**Used:** ${transfers.dailyUsed.toLocaleString()} coins\n**Remaining:** ${(transfers.dailyLimit - transfers.dailyUsed).toLocaleString()} coins\n**Usage:** ${(transfers.dailyUsed / transfers.dailyLimit * 100).toFixed(1)}%\n**Resets:** Tomorrow`,
                    inline: true
                },
                {
                    name: '📊 **This Month**',
                    value: `**Used:** ${transfers.monthlyUsed.toLocaleString()} coins\n**Remaining:** ${(transfers.monthlyLimit - transfers.monthlyUsed).toLocaleString()} coins\n**Usage:** ${(transfers.monthlyUsed / transfers.monthlyLimit * 100).toFixed(1)}%\n**Resets:** Next month`,
                    inline: true
                }
            );

        if (nextTier) {
            embed.addFields({
                name: `🌟 **Next Tier: ${nextTier.name}**`,
                value: `**Daily Limit:** ${nextTier.dailyLimit.toLocaleString()} coins\n**Monthly Limit:** ${nextTier.monthlyLimit.toLocaleString()} coins\n**Requirements:** ${nextTier.requirements}\n**Benefits:** ${nextTier.benefits}`,
                inline: false
            });
        }

        const upgradeButton = new ButtonBuilder()
            .setCustomId('transfer_upgrade_tier')
            .setLabel('Upgrade Tier')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⭐')
            .setDisabled(!nextTier);

        const detailsButton = new ButtonBuilder()
            .setCustomId('transfer_tier_details')
            .setLabel('All Tiers')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📋');

        const row = new ActionRowBuilder().addComponents(upgradeButton, detailsButton);

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    },

    async handleScheduledTransfers(interaction, player) {
        if (!player.transfers?.premiumFeatures) {
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('⭐ Premium Feature')
                .setDescription('**Scheduled Transfers** are available with Premium Transfer Services!')
                .addFields(
                    { name: '🌟 Premium Benefits', value: '• Schedule recurring transfers\n• Lower fees on all transactions\n• Higher daily/monthly limits\n• Priority customer support', inline: true },
                    { name: '💰 Upgrade Cost', value: '25,000 coins (one-time)', inline: true },
                    { name: '💡 Worth It?', value: 'Pays for itself after 100 transfers!', inline: true }
                )
                .setFooter({ text: 'Upgrade to unlock advanced transfer features' });

            const upgradeButton = new ButtonBuilder()
                .setCustomId('transfer_upgrade_premium')
                .setLabel('Upgrade to Premium')
                .setStyle(ButtonStyle.Success)
                .setEmoji('⭐')
                .setDisabled(player.coins < 25000);

            const row = new ActionRowBuilder().addComponents(upgradeButton);

            return interaction.editReply({
                embeds: [embed],
                components: [row]
            });
        }

        // Handle scheduled transfers for premium users
        const scheduled = player.transfers.scheduled || [];
        
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('⏰ **Scheduled Transfers**')
            .setDescription('**Automatic Transfer Management**\n\n*Set up recurring payments for convenience*');

        if (scheduled.length > 0) {
            const scheduleList = scheduled.map(transfer => 
                `💰 **${transfer.amount.toLocaleString()}** coins to **${transfer.recipientName}**\n└ Every ${transfer.frequency} • Next: ${new Date(transfer.nextExecution).toLocaleDateString()}`
            ).join('\n\n');
            
            embed.addFields({
                name: '📋 Active Schedules',
                value: scheduleList,
                inline: false
            });
        } else {
            embed.addFields({
                name: '📋 Active Schedules',
                value: 'No scheduled transfers configured.',
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    // Helper methods
    calculateTransferFees(amount, anonymous, trustScore) {
        const baseFeeRate = 0.02; // 2% base fee
        const trustDiscount = Math.max(0, (trustScore - 50) / 50 * 0.01); // Up to 1% discount
        const effectiveFeeRate = Math.max(0.005, baseFeeRate - trustDiscount); // Minimum 0.5% fee
        
        const transferFee = Math.ceil(amount * effectiveFeeRate);
        const processingFee = Math.min(50, Math.ceil(amount * 0.001)); // Max 50 coins processing fee
        const anonymousFee = anonymous ? Math.ceil(amount * 0.01) : 0; // 1% extra for anonymous
        
        const totalFee = transferFee + processingFee + anonymousFee;
        const savings = Math.floor(amount * trustDiscount);
        
        return {
            transferFee,
            processingFee,
            anonymousFee,
            totalFee,
            savings
        };
    },

    resetTransferLimits(player) {
        const now = Date.now();
        const lastReset = player.transfers.lastReset || now;
        const daysSinceReset = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));
        
        if (daysSinceReset >= 1) {
            player.transfers.dailyUsed = 0;
            player.transfers.lastReset = now;
        }
        
        // Reset monthly limits (simplified - you'd want proper month calculation)
        const monthsSinceReset = Math.floor(daysSinceReset / 30);
        if (monthsSinceReset >= 1) {
            player.transfers.monthlyUsed = 0;
        }
    },

    getAccountTier(player) {
        const trustScore = player.transfers?.trustScore || 100;
        const transferCount = player.transfers?.transferCount || 0;
        
        if (trustScore >= 95 && transferCount >= 100) {
            return {
                name: 'Platinum Elite',
                dailyLimit: 250000,
                monthlyLimit: 2500000,
                feeRate: 0.005,
                benefits: 'Minimum fees, maximum limits'
            };
        } else if (trustScore >= 85 && transferCount >= 50) {
            return {
                name: 'Gold Premium',
                dailyLimit: 150000,
                monthlyLimit: 1500000,
                feeRate: 0.01,
                benefits: 'Reduced fees, high limits'
            };
        } else if (trustScore >= 70 && transferCount >= 20) {
            return {
                name: 'Silver Standard',
                dailyLimit: 75000,
                monthlyLimit: 750000,
                feeRate: 0.015,
                benefits: 'Good limits, standard fees'
            };
        } else {
            return {
                name: 'Bronze Basic',
                dailyLimit: 50000,
                monthlyLimit: 500000,
                feeRate: 0.02,
                benefits: 'Standard service'
            };
        }
    },

    getNextTier(currentTier) {
        const tiers = {
            'Bronze Basic': {
                name: 'Silver Standard',
                dailyLimit: 75000,
                monthlyLimit: 750000,
                requirements: '70+ trust score, 20+ transfers',
                benefits: 'Higher limits, better rates'
            },
            'Silver Standard': {
                name: 'Gold Premium',
                dailyLimit: 150000,
                monthlyLimit: 1500000,
                requirements: '85+ trust score, 50+ transfers',
                benefits: 'Premium support, lower fees'
            },
            'Gold Premium': {
                name: 'Platinum Elite',
                dailyLimit: 250000,
                monthlyLimit: 2500000,
                requirements: '95+ trust score, 100+ transfers',
                benefits: 'Exclusive perks, minimum fees'
            }
        };
        
        return tiers[currentTier.name] || null;
    },

    calculateSuccessRate(history) {
        if (history.length === 0) return 100;
        const successful = history.filter(t => t.status === 'completed').length;
        return Math.floor((successful / history.length) * 100);
    },

    getAccountStatus(transfers) {
        const trustScore = transfers.trustScore || 100;
        if (trustScore >= 95) return '🌟 Excellent';
        if (trustScore >= 85) return '⭐ Very Good';
        if (trustScore >= 70) return '✅ Good';
        if (trustScore >= 50) return '⚠️ Fair';
        return '🚨 Needs Improvement';
    },

    async processTransfer(interaction, sender, recipient, amount, feeStructure, message, anonymous) {
        const userId = interaction.user.id;
        const totalCost = amount + feeStructure.totalFee;

        // Double-check balance (race condition protection)
        const freshSender = await db.getPlayer(userId);
        if (freshSender.coins < totalCost) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Transfer Failed')
                .setDescription('Insufficient funds. Your balance may have changed.');
            
            return interaction.editReply({ embeds: [errorEmbed], components: [] });
        }

        // Get fresh recipient data
        const recipientData = await db.getPlayer(recipient.id);
        if (!recipientData) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Transfer Failed')
                .setDescription('Recipient account not found.');
            
            return interaction.editReply({ embeds: [errorEmbed], components: [] });
        }

        // Process the transfer
        freshSender.coins -= totalCost;
        freshSender.transfers.dailyUsed += amount;
        freshSender.transfers.monthlyUsed += amount;
        freshSender.transfers.totalSent += amount;
        freshSender.transfers.transferCount += 1;

        // Add to sender's history
        freshSender.transfers.history.push({
            type: 'sent',
            amount: amount,
            otherParty: anonymous ? 'Anonymous' : recipient.displayName,
            message: message,
            timestamp: Date.now(),
            status: 'completed',
            fees: feeStructure.totalFee
        });

        // Update recipient
        recipientData.coins += amount;
        if (!recipientData.transfers) recipientData.transfers = { history: [], totalReceived: 0 };
        recipientData.transfers.totalReceived += amount;

        // Add to recipient's history
        recipientData.transfers.history.push({
            type: 'received',
            amount: amount,
            otherParty: anonymous ? 'Anonymous Sender' : interaction.user.displayName,
            message: message,
            timestamp: Date.now(),
            status: 'completed'
        });

        // Save both accounts
        await db.updatePlayer(userId, freshSender);
        await db.updatePlayer(recipient.id, recipientData);

        // Create success embed
        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ **Transfer Successful!**')
            .setDescription('Your transfer has been completed successfully!')
            .addFields(
                { name: '💸 Amount Sent', value: `${amount.toLocaleString()} coins`, inline: true },
                { name: '👤 Recipient', value: anonymous ? '🎭 Anonymous' : recipient.displayName, inline: true },
                { name: '💳 Total Cost', value: `${totalCost.toLocaleString()} coins`, inline: true },
                { name: '💰 Your New Balance', value: `${freshSender.coins.toLocaleString()} coins`, inline: true },
                { name: '🎯 Transfer ID', value: `#${Date.now().toString().slice(-8)}`, inline: true },
                { name: '⏰ Completed', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
            );

        if (message) {
            successEmbed.addFields({
                name: '💬 Your Message',
                value: `"${message}"`,
                inline: false
            });
        }

        successEmbed.setFooter({ 
            text: 'Thank you for using Adventurer Transfer Services!' 
        })
        .setTimestamp();

        // Try to notify recipient
        try {
            const notificationEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('💰 **Coins Received!**')
                .setDescription(`You received ${amount.toLocaleString()} coins!`)
                .addFields(
                    { name: 'From', value: anonymous ? '🎭 Anonymous Sender' : interaction.user.displayName, inline: true },
                    { name: 'Amount', value: `${amount.toLocaleString()} coins`, inline: true },
                    { name: 'Your Balance', value: `${recipientData.coins.toLocaleString()} coins`, inline: true }
                );

            if (message && !anonymous) {
                notificationEmbed.addFields({
                    name: '💬 Message',
                    value: `"${message}"`,
                    inline: false
                });
            }

            await recipient.send({ embeds: [notificationEmbed] });
        } catch (error) {
            // DM failed, but transfer was successful
        }

        await interaction.editReply({
            embeds: [successEmbed],
            components: []
        });
    }
};
