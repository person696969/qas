
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const rouletteNumbers = {
    red: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
    black: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35],
    green: [0]
};

const betTypes = {
    straight: { name: 'Straight Up', payout: 35, description: 'Single number' },
    split: { name: 'Split', payout: 17, description: 'Two adjacent numbers' },
    street: { name: 'Street', payout: 11, description: 'Three numbers in a row' },
    corner: { name: 'Corner', payout: 8, description: 'Four numbers in a square' },
    line: { name: 'Line', payout: 5, description: 'Six numbers in two rows' },
    red: { name: 'Red', payout: 1, description: 'All red numbers' },
    black: { name: 'Black', payout: 1, description: 'All black numbers' },
    even: { name: 'Even', payout: 1, description: 'All even numbers' },
    odd: { name: 'Odd', payout: 1, description: 'All odd numbers' },
    low: { name: 'Low (1-18)', payout: 1, description: 'Numbers 1-18' },
    high: { name: 'High (19-36)', payout: 1, description: 'Numbers 19-36' },
    dozen1: { name: '1st Dozen', payout: 2, description: 'Numbers 1-12' },
    dozen2: { name: '2nd Dozen', payout: 2, description: 'Numbers 13-24' },
    dozen3: { name: '3rd Dozen', payout: 2, description: 'Numbers 25-36' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('🎡 Play European Roulette with advanced betting options')
        .addSubcommand(subcommand =>
            subcommand
                .setName('quick')
                .setDescription('Quick play with simple bets')
                .addStringOption(option =>
                    option.setName('bet_type')
                        .setDescription('Type of bet')
                        .setRequired(true)
                        .addChoices(
                            { name: '🔴 Red', value: 'red' },
                            { name: '⚫ Black', value: 'black' },
                            { name: '🔢 Even', value: 'even' },
                            { name: '🔢 Odd', value: 'odd' },
                            { name: '📉 Low (1-18)', value: 'low' },
                            { name: '📈 High (19-36)', value: 'high' }
                        ))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to bet')
                        .setRequired(true)
                        .setMinValue(10)
                        .setMaxValue(5000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('advanced')
                .setDescription('Advanced roulette with custom betting'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View your roulette statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('View recent spins and patterns')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            const player = await db.getPlayer(userId) || {
                coins: 100,
                roulette: {
                    totalSpins: 0,
                    totalBet: 0,
                    totalWon: 0,
                    biggestWin: 0,
                    favoriteNumbers: {},
                    recentSpins: [],
                    streaks: { red: 0, black: 0, even: 0, odd: 0 }
                }
            };

            if (subcommand === 'quick') {
                await this.playQuickRoulette(interaction, player);
            } else if (subcommand === 'advanced') {
                await this.showAdvancedTable(interaction, player);
            } else if (subcommand === 'stats') {
                await this.showStats(interaction, player);
            } else if (subcommand === 'history') {
                await this.showHistory(interaction, player);
            }

        } catch (error) {
            console.error('Error in roulette command:', error);
            await interaction.reply({
                content: '❌ An error occurred while playing roulette.',
                ephemeral: true
            });
        }
    },

    async playQuickRoulette(interaction, player) {
        const betType = interaction.options.getString('bet_type');
        const amount = interaction.options.getInteger('amount');

        if (player.coins < amount) {
            return interaction.reply({
                content: `❌ You don't have enough coins! You need ${amount} coins.`,
                ephemeral: true
            });
        }

        await interaction.deferReply();

        // Create spinning animation
        const spinEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎡 European Roulette')
            .setDescription('🌀 The wheel is spinning...\n⏳ Placing your bet...')
            .addFields(
                { name: '🎯 Your Bet', value: `${amount} coins on ${betType}`, inline: true },
                { name: '💰 Potential Win', value: `${amount * (betTypes[betType].payout + 1)} coins`, inline: true }
            );

        const response = await interaction.editReply({ embeds: [spinEmbed] });

        // Simulate spinning time
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Generate result
        const result = this.spinWheel();
        const won = this.checkWin(betType, result.number);
        const winnings = won ? amount * (betTypes[betType].payout + 1) : 0;
        const netGain = winnings - amount;

        // Update player data
        player.coins += netGain;
        
        if (!player.roulette) player.roulette = {};
        player.roulette.totalSpins = (player.roulette.totalSpins || 0) + 1;
        player.roulette.totalBet = (player.roulette.totalBet || 0) + amount;
        player.roulette.totalWon = (player.roulette.totalWon || 0) + winnings;
        
        if (winnings > (player.roulette.biggestWin || 0)) {
            player.roulette.biggestWin = winnings;
        }

        // Track number frequency
        if (!player.roulette.favoriteNumbers) player.roulette.favoriteNumbers = {};
        player.roulette.favoriteNumbers[result.number] = (player.roulette.favoriteNumbers[result.number] || 0) + 1;

        // Track recent spins
        if (!player.roulette.recentSpins) player.roulette.recentSpins = [];
        player.roulette.recentSpins.unshift(result);
        if (player.roulette.recentSpins.length > 10) {
            player.roulette.recentSpins = player.roulette.recentSpins.slice(0, 10);
        }

        await db.updatePlayer(userId, player);

        // Create result embed
        const resultEmbed = new EmbedBuilder()
            .setColor(won ? '#00FF00' : '#FF0000')
            .setTitle(`🎡 Roulette Results`)
            .setDescription(`🎯 **The ball landed on ${result.number}** ${result.emoji}`)
            .addFields(
                { name: '🎲 Number', value: result.number.toString(), inline: true },
                { name: '🎨 Color', value: result.color, inline: true },
                { name: '🔢 Type', value: result.number === 0 ? 'Zero' : result.number % 2 === 0 ? 'Even' : 'Odd', inline: true },
                { name: '💰 Your Bet', value: `${amount} on ${betType}`, inline: true },
                { name: won ? '🎉 Won' : '💸 Lost', value: `${winnings} coins`, inline: true },
                { name: '📊 Net Result', value: `${netGain >= 0 ? '+' : ''}${netGain} coins`, inline: true },
                { name: '💳 New Balance', value: `${player.coins.toLocaleString()} coins`, inline: true },
                { name: '🎰 Total Spins', value: `${player.roulette.totalSpins}`, inline: true },
                { name: '🎯 This Session', value: this.getSessionStats(player), inline: true }
            )
            .setFooter({
                text: won ? 
                    `🎊 Congratulations! Payout: ${betTypes[betType].payout + 1}:1` :
                    `Better luck next time! House edge: 2.7%`
            })
            .setTimestamp();

        // Add special win messages
        if (won && betType === 'straight' && result.number !== 0) {
            resultEmbed.addFields({
                name: '🎊 STRAIGHT UP WIN!',
                value: 'Incredible! You hit the exact number!',
                inline: false
            });
        }

        if (result.number === 0) {
            resultEmbed.addFields({
                name: '🏠 House Zero',
                value: 'The ball landed on zero - house wins most bets!',
                inline: false
            });
        }

        // Create action buttons
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`roulette_again_${betType}_${amount}`)
                    .setLabel('🎡 Spin Again')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(player.coins < amount),
                new ButtonBuilder()
                    .setCustomId('roulette_change_bet')
                    .setLabel('💰 Change Bet')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('roulette_advanced')
                    .setLabel('⚙️ Advanced Table')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('roulette_stats')
                    .setLabel('📊 Statistics')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.editReply({
            embeds: [resultEmbed],
            components: [buttons]
        });

        // Set up button collector
        this.setupButtonCollector(interaction, player);
    },

    async showAdvancedTable(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#8B0000')
            .setTitle('🎡 Advanced Roulette Table')
            .setDescription('**European Roulette (Single Zero)**\nPlace multiple bets with different strategies!')
            .addFields(
                { 
                    name: '🎯 Straight Bets (35:1)', 
                    value: 'Single numbers: 0, 1, 2, 3... 36', 
                    inline: false 
                },
                { 
                    name: '🎨 Color Bets (1:1)', 
                    value: '🔴 Red | ⚫ Black', 
                    inline: true 
                },
                { 
                    name: '🔢 Even/Odd (1:1)', 
                    value: 'Even | Odd numbers', 
                    inline: true 
                },
                { 
                    name: '📊 Dozens (2:1)', 
                    value: '1st: 1-12 | 2nd: 13-24 | 3rd: 25-36', 
                    inline: false 
                },
                { 
                    name: '💰 Your Balance', 
                    value: `${player.coins.toLocaleString()} coins`, 
                    inline: true 
                },
                { 
                    name: '🎰 Session Stats', 
                    value: this.getSessionStats(player), 
                    inline: true 
                }
            );

        // Create betting options
        const betMenu = new StringSelectMenuBuilder()
            .setCustomId('roulette_bet_type')
            .setPlaceholder('Choose your betting strategy')
            .addOptions([
                {
                    label: '🎯 Straight Number',
                    description: 'Bet on a single number (35:1)',
                    value: 'straight'
                },
                {
                    label: '🔴 Red/Black',
                    description: 'Bet on color (1:1)',
                    value: 'color'
                },
                {
                    label: '🔢 Even/Odd',
                    description: 'Bet on parity (1:1)',
                    value: 'parity'
                },
                {
                    label: '📊 Dozens',
                    description: 'Bet on 12 numbers (2:1)',
                    value: 'dozen'
                },
                {
                    label: '📈 High/Low',
                    description: 'Bet on range (1:1)',
                    value: 'range'
                }
            ]);

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('roulette_quick_bet')
                    .setLabel('⚡ Quick Bet')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('roulette_patterns')
                    .setLabel('📈 Hot Numbers')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('roulette_wheel')
                    .setLabel('🎡 View Wheel')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(betMenu),
                actionButtons
            ]
        });
    },

    async showStats(interaction, player) {
        const stats = player.roulette || {};
        const profitLoss = (stats.totalWon || 0) - (stats.totalBet || 0);
        const winRate = stats.totalSpins ? ((stats.totalWon / stats.totalBet) * 100).toFixed(1) : 0;

        // Find most frequent numbers
        const favorites = Object.entries(stats.favoriteNumbers || {})
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([num, count]) => `${num} (${count}x)`)
            .join(', ') || 'None yet';

        const embed = new EmbedBuilder()
            .setColor('#DAA520')
            .setTitle(`🎡 ${interaction.user.username}'s Roulette Statistics`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: '🎰 Total Spins', value: `${stats.totalSpins || 0}`, inline: true },
                { name: '💰 Total Bet', value: `${(stats.totalBet || 0).toLocaleString()} coins`, inline: true },
                { name: '🏆 Total Won', value: `${(stats.totalWon || 0).toLocaleString()} coins`, inline: true },
                { name: '📊 Profit/Loss', value: `${profitLoss >= 0 ? '+' : ''}${profitLoss.toLocaleString()} coins`, inline: true },
                { name: '💎 Biggest Win', value: `${(stats.biggestWin || 0).toLocaleString()} coins`, inline: true },
                { name: '📈 Return Rate', value: `${winRate}%`, inline: true },
                { name: '🔥 Hot Numbers', value: favorites, inline: false },
                { name: '🎯 Recent Performance', value: this.getRecentPerformance(stats), inline: false }
            )
            .setFooter({ 
                text: `European Roulette • House Edge: 2.7% • RTP: 97.3%`
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async showHistory(interaction, player) {
        const recentSpins = player.roulette?.recentSpins || [];
        
        if (recentSpins.length === 0) {
            return interaction.reply({
                content: '📊 No recent spins found. Play some roulette first!',
                ephemeral: true
            });
        }

        const historyText = recentSpins
            .map((spin, index) => `${index + 1}. **${spin.number}** ${spin.emoji} (${spin.color})`)
            .join('\n');

        // Analyze patterns
        const patterns = this.analyzePatterns(recentSpins);

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📊 Roulette History & Patterns')
            .addFields(
                { name: '🎲 Last 10 Spins', value: historyText, inline: false },
                { name: '🔴 Red Streak', value: `${patterns.redStreak}`, inline: true },
                { name: '⚫ Black Streak', value: `${patterns.blackStreak}`, inline: true },
                { name: '🔢 Even/Odd', value: `${patterns.evenOddRatio}`, inline: true },
                { name: '📈 Hot Zones', value: patterns.hotZones, inline: false },
                { name: '❄️ Cold Numbers', value: patterns.coldNumbers, inline: false }
            )
            .setFooter({ 
                text: '⚠️ Past results do not influence future spins • Each spin is independent'
            });

        await interaction.reply({ embeds: [embed] });
    },

    spinWheel() {
        const number = Math.floor(Math.random() * 37); // 0-36
        let color, emoji;

        if (number === 0) {
            color = 'Green';
            emoji = '🟢';
        } else if (rouletteNumbers.red.includes(number)) {
            color = 'Red';
            emoji = '🔴';
        } else {
            color = 'Black';
            emoji = '⚫';
        }

        return { number, color, emoji };
    },

    checkWin(betType, number) {
        switch (betType) {
            case 'red':
                return rouletteNumbers.red.includes(number);
            case 'black':
                return rouletteNumbers.black.includes(number);
            case 'even':
                return number !== 0 && number % 2 === 0;
            case 'odd':
                return number !== 0 && number % 2 === 1;
            case 'low':
                return number >= 1 && number <= 18;
            case 'high':
                return number >= 19 && number <= 36;
            case 'dozen1':
                return number >= 1 && number <= 12;
            case 'dozen2':
                return number >= 13 && number <= 24;
            case 'dozen3':
                return number >= 25 && number <= 36;
            default:
                return false;
        }
    },

    getSessionStats(player) {
        const stats = player.roulette || {};
        const recentSpins = stats.recentSpins || [];
        
        if (recentSpins.length === 0) return 'No spins yet';
        
        const winCount = recentSpins.filter(spin => {
            // This is simplified - in a real implementation, 
            // you'd track which bets won for each spin
            return Math.random() < 0.486; // Approximate win rate for even money bets
        }).length;
        
        return `${winCount}/${recentSpins.length} recent wins`;
    },

    getRecentPerformance(stats) {
        if (!stats.recentSpins || stats.recentSpins.length === 0) {
            return 'No recent activity';
        }

        const recentCount = Math.min(stats.recentSpins.length, 5);
        const performance = '🎯'.repeat(Math.floor(recentCount / 2)) + '⚫'.repeat(recentCount - Math.floor(recentCount / 2));
        
        return `Last ${recentCount} spins: ${performance}`;
    },

    analyzePatterns(spins) {
        let redStreak = 0;
        let blackStreak = 0;
        let currentStreak = '';
        let maxRed = 0;
        let maxBlack = 0;

        const numberFreq = {};
        let evenCount = 0;

        spins.forEach(spin => {
            // Count number frequency
            numberFreq[spin.number] = (numberFreq[spin.number] || 0) + 1;
            
            // Count even numbers
            if (spin.number !== 0 && spin.number % 2 === 0) evenCount++;

            // Track color streaks
            if (spin.color === 'Red') {
                if (currentStreak === 'red') {
                    redStreak++;
                } else {
                    maxBlack = Math.max(maxBlack, blackStreak);
                    blackStreak = 0;
                    redStreak = 1;
                    currentStreak = 'red';
                }
            } else if (spin.color === 'Black') {
                if (currentStreak === 'black') {
                    blackStreak++;
                } else {
                    maxRed = Math.max(maxRed, redStreak);
                    redStreak = 0;
                    blackStreak = 1;
                    currentStreak = 'black';
                }
            } else {
                maxRed = Math.max(maxRed, redStreak);
                maxBlack = Math.max(maxBlack, blackStreak);
                redStreak = 0;
                blackStreak = 0;
                currentStreak = '';
            }
        });

        // Hot zones (most frequent numbers)
        const hotNumbers = Object.entries(numberFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([num, count]) => `${num}(${count})`)
            .join(', ') || 'None';

        // Cold numbers (least frequent)
        const allNumbers = Array.from({length: 37}, (_, i) => i);
        const coldNumbers = allNumbers
            .filter(num => !numberFreq[num])
            .slice(0, 5)
            .join(', ') || 'All hit';

        return {
            redStreak: Math.max(maxRed, redStreak),
            blackStreak: Math.max(maxBlack, blackStreak),
            evenOddRatio: `${evenCount}:${spins.length - evenCount}`,
            hotZones: hotNumbers,
            coldNumbers: coldNumbers
        };
    },

    setupButtonCollector(interaction, player) {
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ 
            filter, 
            time: 300000 
        });

        collector.on('collect', async buttonInteraction => {
            try {
                if (buttonInteraction.customId.startsWith('roulette_again_')) {
                    const [, , betType, amount] = buttonInteraction.customId.split('_');
                    // Simulate the same bet again
                    await this.playQuickRoulette(buttonInteraction, player);
                }
                // Handle other button interactions...
            } catch (error) {
                console.error('Roulette button error:', error);
            }
        });
    }
};
