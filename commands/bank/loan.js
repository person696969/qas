
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loan')
        .setDescription('💰 Advanced lending services and credit management')
        .addSubcommand(subcommand =>
            subcommand
                .setName('request')
                .setDescription('Apply for a new loan with customizable terms')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Loan amount requested')
                        .setRequired(true)
                        .setMinValue(100)
                        .setMaxValue(1000000))
                .addStringOption(option =>
                    option.setName('term')
                        .setDescription('Loan repayment period')
                        .setRequired(false)
                        .addChoices(
                            { name: '📅 7 Days (Higher interest)', value: '7' },
                            { name: '📅 14 Days (Standard)', value: '14' },
                            { name: '📅 30 Days (Lower interest)', value: '30' },
                            { name: '📅 60 Days (Lowest interest)', value: '60' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('repay')
                .setDescription('Make loan payments')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Payment amount')
                        .setRequired(true)
                        .setMinValue(1))
                .addBooleanOption(option =>
                    option.setName('full_payoff')
                        .setDescription('Pay off the entire loan')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View detailed loan information and payment schedule'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('refinance')
                .setDescription('Refinance existing loan for better terms'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('View your complete lending history and credit score')),

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
                    .setFooter({ text: 'New to our banking services?' });
                
                return interaction.editReply({ embeds: [embed] });
            }

            // Initialize loan structure if needed
            if (!player.loan) {
                player.loan = {
                    active: false,
                    amount: 0,
                    originalAmount: 0,
                    interestRate: 0.1,
                    term: 14,
                    startDate: null,
                    nextPayment: null,
                    minimumPayment: 0,
                    paymentHistory: [],
                    creditScore: 700,
                    totalLoansCount: 0,
                    defaultCount: 0
                };
            }

            switch (subcommand) {
                case 'request':
                    await this.handleLoanRequest(interaction, player);
                    break;
                case 'repay':
                    await this.handleRepayment(interaction, player);
                    break;
                case 'status':
                    await this.handleLoanStatus(interaction, player);
                    break;
                case 'refinance':
                    await this.handleRefinance(interaction, player);
                    break;
                case 'history':
                    await this.handleLoanHistory(interaction, player);
                    break;
            }

        } catch (error) {
            console.error('Error in loan command:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Loan Service Error')
                .setDescription('An error occurred while processing your loan request. Please try again later.')
                .setFooter({ text: 'If this persists, contact our support team' });
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },

    async handleLoanRequest(interaction, player) {
        const requestedAmount = interaction.options.getInteger('amount');
        const termDays = parseInt(interaction.options.getString('term') || '14');

        // Check if player already has an active loan
        if (player.loan.active && player.loan.amount > 0) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Existing Loan Active')
                .setDescription('You already have an outstanding loan! Please repay your current loan before applying for a new one.')
                .addFields(
                    { name: '💰 Current Loan Balance', value: `${player.loan.amount.toLocaleString()} coins`, inline: true },
                    { name: '📅 Next Payment Due', value: `<t:${Math.floor(player.loan.nextPayment / 1000)}:R>`, inline: true }
                )
                .setFooter({ text: 'Use /loan repay to make payments on your current loan' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        // Calculate loan eligibility based on level and credit score
        const playerLevel = player.level || 1;
        const creditScore = player.loan.creditScore || 700;
        const maxLoanAmount = this.calculateMaxLoan(playerLevel, creditScore);

        if (requestedAmount > maxLoanAmount) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Loan Amount Too High')
                .setDescription('The requested loan amount exceeds your credit limit.')
                .addFields(
                    { name: '🎯 Your Credit Limit', value: `${maxLoanAmount.toLocaleString()} coins`, inline: true },
                    { name: '📊 Credit Score', value: `${creditScore}/850`, inline: true },
                    { name: '⭐ Player Level', value: `Level ${playerLevel}`, inline: true },
                    { name: '💡 Improvement Tips', value: 'Increase your level and maintain good payment history to raise your credit limit!', inline: false }
                )
                .setFooter({ text: 'Your creditworthiness determines your loan eligibility' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        // Calculate loan terms
        const loanTerms = this.calculateLoanTerms(requestedAmount, termDays, creditScore);
        
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('💰 **Loan Application Review**')
            .setDescription(`**Adventurer's Credit Union**\n\n*Review your loan terms carefully before accepting*`)
            .addFields(
                {
                    name: '💵 **Loan Details**',
                    value: `**Principal:** ${requestedAmount.toLocaleString()} coins\n` +
                           `**Interest Rate:** ${(loanTerms.interestRate * 100).toFixed(2)}% (${termDays} days)\n` +
                           `**Total Interest:** ${loanTerms.totalInterest.toLocaleString()} coins\n` +
                           `**Total Repayment:** ${loanTerms.totalRepayment.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '📅 **Payment Schedule**',
                    value: `**Term Length:** ${termDays} days\n` +
                           `**Daily Payment:** ${loanTerms.dailyPayment.toLocaleString()} coins\n` +
                           `**Minimum Payment:** ${loanTerms.minimumPayment.toLocaleString()} coins\n` +
                           `**First Payment Due:** <t:${Math.floor(loanTerms.firstPaymentDate / 1000)}:R>`,
                    inline: true
                },
                {
                    name: '📊 **Your Credit Profile**',
                    value: `**Credit Score:** ${creditScore}/850\n` +
                           `**Available Credit:** ${(maxLoanAmount - requestedAmount).toLocaleString()} coins\n` +
                           `**Loan History:** ${player.loan.totalLoansCount} loans\n` +
                           `**Payment Rating:** ${this.getCreditRating(creditScore)}`,
                    inline: true
                }
            )
            .addFields({
                name: '⚠️ **Important Terms & Conditions**',
                value: `• Late payments incur 5% penalty fees\n• Missing 3+ payments may result in account suspension\n• Early repayment saves on interest costs\n• This loan will be reported to the Adventurer Credit Bureau`,
                inline: false
            })
            .setFooter({ text: 'By accepting, you agree to our lending terms and conditions' })
            .setTimestamp();

        const acceptButton = new ButtonBuilder()
            .setCustomId('loan_accept')
            .setLabel('Accept Loan')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');

        const declineButton = new ButtonBuilder()
            .setCustomId('loan_decline')
            .setLabel('Decline')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌');

        const calculateButton = new ButtonBuilder()
            .setCustomId('loan_calculator')
            .setLabel('Payment Calculator')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🧮');

        const row = new ActionRowBuilder().addComponents(acceptButton, declineButton, calculateButton);

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
                    content: '❌ You cannot interact with someone else\'s loan application!',
                    ephemeral: true
                });
            }

            try {
                await buttonInteraction.deferUpdate();

                switch (buttonInteraction.customId) {
                    case 'loan_accept':
                        await this.processLoanApproval(buttonInteraction, player, requestedAmount, loanTerms);
                        break;
                    
                    case 'loan_decline':
                        const declineEmbed = new EmbedBuilder()
                            .setColor('#808080')
                            .setTitle('❌ Loan Application Declined')
                            .setDescription('Your loan application has been cancelled. You can apply again anytime.')
                            .setFooter({ text: 'Thank you for considering Adventurer\'s Credit Union' });
                        
                        await buttonInteraction.editReply({
                            embeds: [declineEmbed],
                            components: []
                        });
                        break;
                    
                    case 'loan_calculator':
                        await this.showLoanCalculator(buttonInteraction, requestedAmount, termDays, creditScore);
                        break;
                }
            } catch (error) {
                console.error('Loan button interaction error:', error);
            }
        });

        collector.on('end', () => {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle('⏰ Loan Application Expired')
                .setDescription('Your loan application has timed out. Please submit a new application if you still need funding.');
            
            interaction.editReply({
                embeds: [timeoutEmbed],
                components: []
            }).catch(() => {});
        });
    },

    async handleRepayment(interaction, player) {
        const paymentAmount = interaction.options.getInteger('amount');
        const fullPayoff = interaction.options.getBoolean('full_payoff') || false;

        if (!player.loan.active || player.loan.amount <= 0) {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ No Outstanding Loans')
                .setDescription('You don\'t have any outstanding loans! You\'re debt-free!')
                .setFooter({ text: 'Great financial management!' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        const actualPayment = fullPayoff ? player.loan.amount : Math.min(paymentAmount, player.loan.amount);
        
        if (player.coins < actualPayment) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Insufficient Funds')
                .setDescription(`You need ${actualPayment.toLocaleString()} coins to make this payment.`)
                .addFields(
                    { name: '💰 Your Balance', value: `${(player.coins || 0).toLocaleString()} coins`, inline: true },
                    { name: '💸 Payment Required', value: `${actualPayment.toLocaleString()} coins`, inline: true },
                    { name: '🏦 Shortfall', value: `${(actualPayment - (player.coins || 0)).toLocaleString()} coins`, inline: true }
                )
                .setFooter({ text: 'Earn more coins through various activities!' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        // Process payment
        player.coins -= actualPayment;
        player.loan.amount -= actualPayment;
        
        // Add to payment history
        if (!player.loan.paymentHistory) player.loan.paymentHistory = [];
        player.loan.paymentHistory.push({
            amount: actualPayment,
            date: Date.now(),
            balanceAfter: player.loan.amount,
            onTime: true // You could implement late payment detection
        });

        // Update credit score for good payment
        if (player.loan.creditScore < 850) {
            player.loan.creditScore = Math.min(850, player.loan.creditScore + 2);
        }

        const isFullyPaid = player.loan.amount <= 0;
        
        if (isFullyPaid) {
            player.loan.active = false;
            player.loan.amount = 0;
            // Bonus credit score increase for full payoff
            player.loan.creditScore = Math.min(850, player.loan.creditScore + 10);
        }

        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor(isFullyPaid ? '#00FF00' : '#32CD32')
            .setTitle(isFullyPaid ? '🎉 Loan Fully Paid!' : '💰 Payment Successful')
            .setDescription(isFullyPaid ? 
                `Congratulations! You've successfully paid off your loan of ${actualPayment.toLocaleString()} coins!` :
                `Successfully paid ${actualPayment.toLocaleString()} coins towards your loan.`
            )
            .addFields(
                { name: '💳 Remaining Balance', value: isFullyPaid ? '0 coins (PAID OFF!)' : `${player.loan.amount.toLocaleString()} coins`, inline: true },
                { name: '💰 Your New Balance', value: `${player.coins.toLocaleString()} coins`, inline: true },
                { name: '📈 Credit Score', value: `${player.loan.creditScore}/850 (+${isFullyPaid ? 12 : 2})`, inline: true }
            );

        if (!isFullyPaid) {
            embed.addFields({
                name: '📅 Next Steps',
                value: `Keep making payments to improve your credit score and unlock better loan terms!`,
                inline: false
            });
        } else {
            embed.addFields({
                name: '🌟 Benefits Unlocked',
                value: `• Improved credit limit\n• Better interest rates on future loans\n• Access to premium lending products`,
                inline: false
            });
        }

        embed.setFooter({ text: isFullyPaid ? 'Debt-free living is the best living!' : 'Thank you for your payment' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleLoanStatus(interaction, player) {
        if (!player.loan.active || player.loan.amount <= 0) {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Loan Status: Clear')
                .setDescription('**You have no outstanding loans!**\n\nYou\'re currently debt-free and in excellent standing.')
                .addFields(
                    { name: '📊 Credit Profile', value: `**Credit Score:** ${player.loan.creditScore || 700}/850\n**Rating:** ${this.getCreditRating(player.loan.creditScore || 700)}\n**Total Loans:** ${player.loan.totalLoansCount || 0}`, inline: true },
                    { name: '💰 Available Credit', value: `**Max Loan:** ${this.calculateMaxLoan(player.level || 1, player.loan.creditScore || 700).toLocaleString()} coins\n**Status:** Pre-approved\n**Rate:** Starting at ${(this.getBaseInterestRate(player.loan.creditScore || 700) * 100).toFixed(2)}%`, inline: true }
                )
                .setFooter({ text: 'Ready to apply for a new loan? Use /loan request' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        // Calculate payment statistics
        const totalPaid = (player.loan.paymentHistory || []).reduce((sum, payment) => sum + payment.amount, 0);
        const originalLoan = player.loan.originalAmount || player.loan.amount;
        const progressPercent = ((originalLoan - player.loan.amount) / originalLoan * 100).toFixed(1);
        
        const embed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('💰 **Active Loan Status**')
            .setDescription('**Comprehensive Loan Overview**\n\n*Stay on track with your payment schedule*')
            .addFields(
                {
                    name: '💵 **Current Loan Details**',
                    value: `**Outstanding Balance:** ${player.loan.amount.toLocaleString()} coins\n` +
                           `**Original Amount:** ${originalLoan.toLocaleString()} coins\n` +
                           `**Progress:** ${progressPercent}% paid off\n` +
                           `**Interest Rate:** ${(player.loan.interestRate * 100).toFixed(2)}%`,
                    inline: true
                },
                {
                    name: '📅 **Payment Information**',
                    value: `**Next Payment:** <t:${Math.floor((player.loan.nextPayment || Date.now()) / 1000)}:R>\n` +
                           `**Minimum Payment:** ${player.loan.minimumPayment.toLocaleString()} coins\n` +
                           `**Total Paid:** ${totalPaid.toLocaleString()} coins\n` +
                           `**Payments Made:** ${(player.loan.paymentHistory || []).length}`,
                    inline: true
                },
                {
                    name: '📊 **Account Standing**',
                    value: `**Credit Score:** ${player.loan.creditScore}/850\n` +
                           `**Payment Status:** ${this.getPaymentStatus(player.loan)}\n` +
                           `**Late Payments:** ${this.countLatePayments(player.loan)}\n` +
                           `**Account Status:** ${player.loan.amount > 0 ? 'Active' : 'Paid Off'}`,
                    inline: true
                }
            );

        // Add payment schedule if available
        if (player.loan.term) {
            const daysRemaining = Math.ceil((player.loan.nextPayment - Date.now()) / (1000 * 60 * 60 * 24));
            const estimatedPayoffDate = new Date(Date.now() + (daysRemaining * 24 * 60 * 60 * 1000));
            
            embed.addFields({
                name: '⏰ **Timeline**',
                value: `**Days Remaining:** ${Math.max(0, daysRemaining)} days\n**Estimated Payoff:** ${estimatedPayoffDate.toDateString()}\n**Early Payoff Savings:** ${this.calculateEarlyPayoffSavings(player.loan)} coins`,
                inline: false
            });
        }

        // Payment action buttons
        const makePaymentButton = new ButtonBuilder()
            .setCustomId('loan_make_payment')
            .setLabel('Make Payment')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💰');

        const payoffButton = new ButtonBuilder()
            .setCustomId('loan_full_payoff')
            .setLabel('Pay Off Loan')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎯')
            .setDisabled(player.coins < player.loan.amount);

        const historyButton = new ButtonBuilder()
            .setCustomId('loan_payment_history')
            .setLabel('Payment History')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋');

        const refinanceButton = new ButtonBuilder()
            .setCustomId('loan_refinance_options')
            .setLabel('Refinance Options')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔄');

        const row = new ActionRowBuilder().addComponents(makePaymentButton, payoffButton, historyButton, refinanceButton);

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    },

    async handleRefinance(interaction, player) {
        if (!player.loan.active || player.loan.amount <= 0) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ No Active Loan')
                .setDescription('You don\'t have an active loan to refinance.')
                .setFooter({ text: 'Apply for a new loan with /loan request' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        const currentRate = player.loan.interestRate;
        const newRate = this.getBaseInterestRate(player.loan.creditScore);
        const savings = (currentRate - newRate) * player.loan.amount;

        if (savings <= 0) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Refinancing Not Beneficial')
                .setDescription('Based on your current credit score, refinancing would not improve your loan terms.')
                .addFields(
                    { name: 'Current Rate', value: `${(currentRate * 100).toFixed(2)}%`, inline: true },
                    { name: 'Potential New Rate', value: `${(newRate * 100).toFixed(2)}%`, inline: true },
                    { name: 'Credit Score', value: `${player.loan.creditScore}/850`, inline: true }
                )
                .setFooter({ text: 'Improve your credit score to unlock better rates!' });
            
            return interaction.editReply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🔄 **Refinancing Options Available**')
            .setDescription('**Lower Your Interest Rate**\n\n*Save money with improved loan terms*')
            .addFields(
                {
                    name: '💰 **Current Loan**',
                    value: `**Balance:** ${player.loan.amount.toLocaleString()} coins\n**Interest Rate:** ${(currentRate * 100).toFixed(2)}%\n**Monthly Cost:** ${Math.floor(player.loan.amount * currentRate / 30).toLocaleString()} coins/day`,
                    inline: true
                },
                {
                    name: '🌟 **New Terms**',
                    value: `**Balance:** ${player.loan.amount.toLocaleString()} coins\n**New Interest Rate:** ${(newRate * 100).toFixed(2)}%\n**New Monthly Cost:** ${Math.floor(player.loan.amount * newRate / 30).toLocaleString()} coins/day`,
                    inline: true
                },
                {
                    name: '💡 **Your Savings**',
                    value: `**Interest Savings:** ${savings.toLocaleString()} coins\n**Rate Reduction:** ${((currentRate - newRate) * 100).toFixed(2)}%\n**Refinance Fee:** 500 coins`,
                    inline: true
                }
            );

        const approveButton = new ButtonBuilder()
            .setCustomId('refinance_approve')
            .setLabel('Approve Refinancing')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')
            .setDisabled(player.coins < 500);

        const declineButton = new ButtonBuilder()
            .setCustomId('refinance_decline')
            .setLabel('Keep Current Loan')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌');

        const row = new ActionRowBuilder().addComponents(approveButton, declineButton);

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    },

    async handleLoanHistory(interaction, player) {
        const creditScore = player.loan.creditScore || 700;
        const paymentHistory = player.loan.paymentHistory || [];
        const totalLoans = player.loan.totalLoansCount || 0;
        
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📊 **Credit History & Loan Profile**')
            .setDescription('**Comprehensive Financial History**\n\n*Track your borrowing journey and credit development*')
            .addFields(
                {
                    name: '📈 **Credit Profile**',
                    value: `**Credit Score:** ${creditScore}/850\n**Rating:** ${this.getCreditRating(creditScore)}\n**Score Change:** +${this.calculateScoreChange(player.loan)} (last 30 days)\n**Risk Level:** ${this.getRiskLevel(creditScore)}`,
                    inline: true
                },
                {
                    name: '💳 **Borrowing Summary**',
                    value: `**Total Loans Taken:** ${totalLoans}\n**Current Outstanding:** ${player.loan.amount || 0} coins\n**Total Payments Made:** ${paymentHistory.length}\n**Payment Success Rate:** ${this.getPaymentSuccessRate(paymentHistory)}%`,
                    inline: true
                },
                {
                    name: '🎯 **Available Credit**',
                    value: `**Max Loan Amount:** ${this.calculateMaxLoan(player.level || 1, creditScore).toLocaleString()} coins\n**Best Available Rate:** ${(this.getBaseInterestRate(creditScore) * 100).toFixed(2)}%\n**Pre-approval Status:** ${creditScore >= 650 ? 'Approved' : 'Review Required'}`,
                    inline: true
                }
            );

        // Add recent payment history
        if (paymentHistory.length > 0) {
            const recentPayments = paymentHistory.slice(-5).reverse().map(payment => 
                `💰 **${payment.amount.toLocaleString()}** coins - ${new Date(payment.date).toLocaleDateString()} ${payment.onTime ? '✅' : '⚠️'}`
            ).join('\n');
            
            embed.addFields({
                name: '📋 **Recent Payment History**',
                value: recentPayments || 'No payment history available',
                inline: false
            });
        }

        // Add credit improvement tips
        const tips = this.getCreditImprovementTips(creditScore);
        embed.addFields({
            name: '💡 **Credit Improvement Tips**',
            value: tips,
            inline: false
        });

        embed.setFooter({ text: 'Building good credit opens doors to better financial opportunities' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    // Helper Methods
    calculateMaxLoan(playerLevel, creditScore) {
        const baseAmount = playerLevel * 1000;
        const creditMultiplier = creditScore / 700; // 700 is average credit
        return Math.floor(baseAmount * creditMultiplier);
    },

    calculateLoanTerms(amount, termDays, creditScore) {
        const baseRate = this.getBaseInterestRate(creditScore);
        const termMultiplier = termDays <= 7 ? 1.5 : termDays <= 14 ? 1.2 : termDays <= 30 ? 1.0 : 0.8;
        const interestRate = baseRate * termMultiplier;
        
        const totalInterest = Math.floor(amount * interestRate);
        const totalRepayment = amount + totalInterest;
        const dailyPayment = Math.ceil(totalRepayment / termDays);
        const minimumPayment = Math.floor(dailyPayment * 0.5);
        const firstPaymentDate = Date.now() + (24 * 60 * 60 * 1000); // Tomorrow
        
        return {
            interestRate,
            totalInterest,
            totalRepayment,
            dailyPayment,
            minimumPayment,
            firstPaymentDate
        };
    },

    getBaseInterestRate(creditScore) {
        if (creditScore >= 800) return 0.05;
        if (creditScore >= 750) return 0.08;
        if (creditScore >= 700) return 0.12;
        if (creditScore >= 650) return 0.15;
        if (creditScore >= 600) return 0.20;
        return 0.25;
    },

    getCreditRating(creditScore) {
        if (creditScore >= 800) return '🌟 Excellent';
        if (creditScore >= 750) return '⭐ Very Good';
        if (creditScore >= 700) return '✅ Good';
        if (creditScore >= 650) return '📈 Fair';
        if (creditScore >= 600) return '⚠️ Poor';
        return '🚨 Very Poor';
    },

    getRiskLevel(creditScore) {
        if (creditScore >= 750) return 'Low Risk';
        if (creditScore >= 650) return 'Medium Risk';
        return 'High Risk';
    },

    getPaymentStatus(loan) {
        if (!loan.nextPayment) return 'No Payments Due';
        if (Date.now() > loan.nextPayment) return '⚠️ Payment Overdue';
        return '✅ Current';
    },

    countLatePayments(loan) {
        return (loan.paymentHistory || []).filter(payment => !payment.onTime).length;
    },

    calculateEarlyPayoffSavings(loan) {
        // Simplified calculation - in reality this would be more complex
        return Math.floor(loan.amount * loan.interestRate * 0.3);
    },

    calculateScoreChange(loan) {
        // Mock calculation - you'd track this over time
        return Math.floor(Math.random() * 20) + 10;
    },

    getPaymentSuccessRate(paymentHistory) {
        if (paymentHistory.length === 0) return 100;
        const onTimePayments = paymentHistory.filter(p => p.onTime).length;
        return Math.floor((onTimePayments / paymentHistory.length) * 100);
    },

    getCreditImprovementTips(creditScore) {
        if (creditScore >= 800) {
            return '🌟 Excellent credit! Maintain your payment habits and consider premium lending products.';
        } else if (creditScore >= 700) {
            return '📈 Good credit! Make all payments on time and consider paying down existing debt faster.';
        } else if (creditScore >= 650) {
            return '💪 Fair credit. Focus on timely payments and avoid taking on too much debt.';
        } else {
            return '🎯 Building credit takes time. Start with smaller loans, pay on time, and be patient.';
        }
    },

    async processLoanApproval(interaction, player, amount, terms) {
        // Grant the loan
        player.coins += amount;
        player.loan = {
            active: true,
            amount: terms.totalRepayment,
            originalAmount: amount,
            interestRate: terms.interestRate,
            term: terms.termDays,
            startDate: Date.now(),
            nextPayment: terms.firstPaymentDate,
            minimumPayment: terms.minimumPayment,
            paymentHistory: [],
            creditScore: player.loan.creditScore || 700,
            totalLoansCount: (player.loan.totalLoansCount || 0) + 1,
            defaultCount: player.loan.defaultCount || 0
        };

        await db.updatePlayer(interaction.user.id, player);

        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎉 **Loan Approved!**')
            .setDescription(`**Congratulations!** Your loan has been approved and ${amount.toLocaleString()} coins have been added to your account.`)
            .addFields(
                { name: '💰 Loan Amount', value: `${amount.toLocaleString()} coins`, inline: true },
                { name: '📅 First Payment Due', value: `<t:${Math.floor(terms.firstPaymentDate / 1000)}:R>`, inline: true },
                { name: '💳 Total Repayment', value: `${terms.totalRepayment.toLocaleString()} coins`, inline: true },
                { name: '📋 What\'s Next?', value: 'Make your payments on time to build credit and avoid penalties. You can check your loan status anytime with `/loan status`.', inline: false }
            )
            .setFooter({ text: 'Welcome to Adventurer\'s Credit Union!' })
            .setTimestamp();

        await interaction.editReply({
            embeds: [successEmbed],
            components: []
        });
    },

    async showLoanCalculator(interaction, amount, termDays, creditScore) {
        const terms = this.calculateLoanTerms(amount, termDays, creditScore);
        
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🧮 **Loan Payment Calculator**')
            .setDescription('**Detailed Payment Breakdown**\n\n*Understanding your loan costs*')
            .addFields(
                { name: '💵 Principal', value: `${amount.toLocaleString()} coins`, inline: true },
                { name: '📈 Interest', value: `${terms.totalInterest.toLocaleString()} coins`, inline: true },
                { name: '💰 Total Cost', value: `${terms.totalRepayment.toLocaleString()} coins`, inline: true },
                { name: '📅 Daily Payment', value: `${terms.dailyPayment.toLocaleString()} coins`, inline: true },
                { name: '⏰ Term Length', value: `${termDays} days`, inline: true },
                { name: '📊 APR', value: `${(terms.interestRate * 365 * 100).toFixed(1)}%`, inline: true }
            );

        const backButton = new ButtonBuilder()
            .setCustomId('loan_back_to_application')
            .setLabel('Back to Application')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('↩️');

        const row = new ActionRowBuilder().addComponents(backButton);

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    }
};
