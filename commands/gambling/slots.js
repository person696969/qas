
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const slotMachines = {
    classic: {
        name: '🎰 Classic Slots',
        symbols: ['🍒', '🍋', '🍊', '🍇', '🔔'],
        minBet: 1,
        maxBet: 100,
        payouts: {
            '🍒🍒🍒': 5, '🍋🍋🍋': 8, '🍊🍊🍊': 10,
            '🍇🍇🍇': 15, '🔔🔔🔔': 25
        }
    },
    deluxe: {
        name: '💎 Deluxe Slots',
        symbols: ['💎', '7️⃣', '⭐', '🔔', '🍀', '💰'],
        minBet: 10,
        maxBet: 1000,
        payouts: {
            '💎💎💎': 100, '7️⃣7️⃣7️⃣': 50, '⭐⭐⭐': 30,
            '🔔🔔🔔': 25, '🍀🍀🍀': 20, '💰💰💰': 15
        }
    },
    progressive: {
        name: '🎊 Progressive Jackpot',
        symbols: ['👑', '💎', '⚡', '🌟', '🎆', '🎯'],
        minBet: 25,
        maxBet: 2500,
        payouts: {
            '👑👑👑': 500, '💎💎💎': 200, '⚡⚡⚡': 100,
            '🌟🌟🌟': 75, '🎆🎆🎆': 50, '🎯🎯🎯': 40
        },
        jackpot: true
    },
    mega: {
        name: '🚀 Mega Slots',
        symbols: ['🚀', '🌌', '⭐', '💫', '🌠', '🔮'],
        minBet: 50,
        maxBet: 5000,
        payouts: {
            '🚀🚀🚀': 1000, '🌌🌌🌌': 500, '⭐⭐⭐': 250,
            '💫💫💫': 150, '🌠🌠🌠': 100, '🔮🔮🔮': 75
        },
        specialFeatures: true
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('🎰 Play various slot machines with different themes')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Play a slot machine')
                .addStringOption(option =>
                    option.setName('machine')
                        .setDescription('Choose slot machine type')
                        .setRequired(true)
                        .addChoices(
                            { name: '🎰 Classic Slots', value: 'classic' },
                            { name: '💎 Deluxe Slots', value: 'deluxe' },
                            { name: '🎊 Progressive Jackpot', value: 'progressive' },
                            { name: '🚀 Mega Slots', value: 'mega' }
                        ))
                .addIntegerOption(option =>
                    option.setName('bet')
                        .setDescription('Amount to bet')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('machines')
                .setDescription('View all available slot machines'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('jackpot')
                .setDescription('Check current progressive jackpot'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View your slot machine statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('autoplay')
                .setDescription('Set up automatic slot play')
                .addIntegerOption(option =>
                    option.setName('spins')
                        .setDescription('Number of auto spins')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100))
                .addIntegerOption(option =>
                    option.setName('bet_per_spin')
                        .setDescription('Bet amount per spin')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1000))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            const player = await db.getPlayer(userId) || {
                coins: 100,
                slots: {
                    totalSpins: 0,
                    totalBet: 0,
                    totalWon: 0,
                    biggestWin: 0,
                    jackpotsWon: 0,
                    machineStats: {},
                    achievements: []
                }
            };

            switch (subcommand) {
                case 'play':
                    await this.playSlots(interaction, player);
                    break;
                case 'machines':
                    await this.showMachines(interaction, player);
                    break;
                case 'jackpot':
                    await this.showJackpot(interaction);
                    break;
                case 'stats':
                    await this.showStats(interaction, player);
                    break;
                case 'autoplay':
                    await this.setupAutoplay(interaction, player);
                    break;
            }

        } catch (error) {
            console.error('Error in slots command:', error);
            await interaction.reply({
                content: '❌ An error occurred while playing slots.',
                ephemeral: true
            });
        }
    },

    async playSlots(interaction, player) {
        const machineType = interaction.options.getString('machine');
        const bet = interaction.options.getInteger('bet');
        const machine = slotMachines[machineType];

        if (!machine) {
            return interaction.reply({
                content: '❌ Invalid slot machine type!',
                ephemeral: true
            });
        }

        if (bet < machine.minBet || bet > machine.maxBet) {
            return interaction.reply({
                content: `❌ Bet must be between ${machine.minBet} and ${machine.maxBet} coins for ${machine.name}!`,
                ephemeral: true
            });
        }

        if (player.coins < bet) {
            return interaction.reply({
                content: `❌ You don't have enough coins! You need ${bet} coins.`,
                ephemeral: true
            });
        }

        await interaction.deferReply();

        // Create spinning animation
        const spinEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(machine.name)
            .setDescription('🎰 **SPINNING...**\n\n❓ | ❓ | ❓\n\n✨ Good luck! ✨')
            .addFields(
                { name: '💰 Bet', value: `${bet} coins`, inline: true },
                { name: '🎯 Machine', value: machineType, inline: true },
                { name: '🎲 Spin #', value: `${(player.slots?.totalSpins || 0) + 1}`, inline: true }
            );

        await interaction.editReply({ embeds: [spinEmbed] });

        // Simulate spinning time
        const spinTime = Math.random() * 2000 + 2000; // 2-4 seconds
        await new Promise(resolve => setTimeout(resolve, spinTime));

        // Generate result
        const result = this.spinReels(machine, bet);
        const winnings = result.winnings;
        const netGain = winnings - bet;

        // Update player data
        player.coins += netGain;
        
        if (!player.slots) player.slots = {};
        player.slots.totalSpins = (player.slots.totalSpins || 0) + 1;
        player.slots.totalBet = (player.slots.totalBet || 0) + bet;
        player.slots.totalWon = (player.slots.totalWon || 0) + winnings;
        
        if (winnings > (player.slots.biggestWin || 0)) {
            player.slots.biggestWin = winnings;
        }

        if (result.jackpot) {
            player.slots.jackpotsWon = (player.slots.jackpotsWon || 0) + 1;
        }

        // Track machine-specific stats
        if (!player.slots.machineStats) player.slots.machineStats = {};
        if (!player.slots.machineStats[machineType]) {
            player.slots.machineStats[machineType] = { spins: 0, won: 0, totalBet: 0 };
        }
        player.slots.machineStats[machineType].spins += 1;
        player.slots.machineStats[machineType].totalBet += bet;
        player.slots.machineStats[machineType].won += winnings;

        // Check for achievements
        this.checkAchievements(player, result, machineType);

        await db.updatePlayer(interaction.user.id, player);

        // Create result embed
        const resultEmbed = new EmbedBuilder()
            .setColor(winnings > 0 ? '#00FF00' : '#FF0000')
            .setTitle(machine.name)
            .setDescription(`🎰 **${result.reels.join(' | ')}**\n\n${result.message}`)
            .addFields(
                { name: '💰 Bet', value: `${bet} coins`, inline: true },
                { name: winnings > 0 ? '🎉 Won' : '💸 Lost', value: `${winnings} coins`, inline: true },
                { name: '📊 Net', value: `${netGain >= 0 ? '+' : ''}${netGain} coins`, inline: true },
                { name: '💳 Balance', value: `${player.coins.toLocaleString()} coins`, inline: true },
                { name: '🎲 Total Spins', value: `${player.slots.totalSpins}`, inline: true },
                { name: '🏆 Biggest Win', value: `${player.slots.biggestWin} coins`, inline: true }
            );

        if (result.jackpot) {
            resultEmbed.addFields({
                name: '🎊 JACKPOT! 🎊',
                value: `You won the progressive jackpot! ${result.jackpotAmount} coins!`,
                inline: false
            });
        }

        if (result.bonus) {
            resultEmbed.addFields({
                name: '🎁 Bonus Feature',
                value: result.bonus,
                inline: false
            });
        }

        if (player.slots.achievements && player.slots.achievements.length > 0) {
            const recentAchievement = player.slots.achievements[player.slots.achievements.length - 1];
            resultEmbed.addFields({
                name: '🏆 Achievement Unlocked!',
                value: recentAchievement,
                inline: false
            });
        }

        resultEmbed.setFooter({
            text: winnings > 0 ? 
                `🎊 Payout: ${(winnings/bet).toFixed(1)}x your bet!` :
                `🎰 Machine RTP: ${this.getMachineRTP(machineType)}%`
        });

        // Create action buttons
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`slots_spin_${machineType}_${bet}`)
                    .setLabel('🎰 Spin Again')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(player.coins < bet),
                new ButtonBuilder()
                    .setCustomId(`slots_change_bet_${machineType}`)
                    .setLabel('💰 Change Bet')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('slots_machines')
                    .setLabel('🎯 Other Machines')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('slots_maxbet')
                    .setLabel('🚀 Max Bet')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(player.coins < machine.maxBet)
            );

        await interaction.editReply({
            embeds: [resultEmbed],
            components: [buttons]
        });

        // Set up button collector
        this.setupButtonCollector(interaction, machineType, player);
    },

    async showMachines(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#4B0082')
            .setTitle('🎰 Slot Machine Lounge')
            .setDescription('**Choose your adventure!** Each machine offers different risks and rewards.')
            .addFields(
                { name: '💰 Your Balance', value: `${player.coins.toLocaleString()} coins`, inline: true },
                { name: '🎲 Total Spins', value: `${player.slots?.totalSpins || 0}`, inline: true },
                { name: '🏆 Jackpots Won', value: `${player.slots?.jackpotsWon || 0}`, inline: true }
            );

        Object.entries(slotMachines).forEach(([type, machine]) => {
            const playerStats = player.slots?.machineStats?.[type];
            const personalRTP = playerStats ? 
                ((playerStats.won / playerStats.totalBet) * 100).toFixed(1) : 'N/A';

            embed.addFields({
                name: machine.name,
                value: `**Bet Range:** ${machine.minBet} - ${machine.maxBet} coins\n` +
                       `**Symbols:** ${machine.symbols.slice(0, 3).join('')}...\n` +
                       `**Your RTP:** ${personalRTP}%\n` +
                       `**Your Spins:** ${playerStats?.spins || 0}`,
                inline: true
            });
        });

        // Machine selection menu
        const machineMenu = new StringSelectMenuBuilder()
            .setCustomId('slots_select_machine')
            .setPlaceholder('Select a slot machine')
            .addOptions([
                {
                    label: '🎰 Classic Slots',
                    description: 'Low risk, steady wins (1-100 coins)',
                    value: 'classic',
                    emoji: '🎰'
                },
                {
                    label: '💎 Deluxe Slots',
                    description: 'Medium risk, good payouts (10-1000 coins)',
                    value: 'deluxe',
                    emoji: '💎'
                },
                {
                    label: '🎊 Progressive Jackpot',
                    description: 'High risk, massive jackpots (25-2500 coins)',
                    value: 'progressive',
                    emoji: '🎊'
                },
                {
                    label: '🚀 Mega Slots',
                    description: 'Extreme risk, astronomical wins (50-5000 coins)',
                    value: 'mega',
                    emoji: '🚀'
                }
            ]);

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('slots_lucky_pick')
                    .setLabel('🍀 Lucky Pick')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('slots_strategy_guide')
                    .setLabel('📚 Strategy Guide')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('slots_leaderboard')
                    .setLabel('🏆 Leaderboard')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(machineMenu),
                actionButtons
            ]
        });
    },

    async showJackpot(interaction) {
        // Calculate current progressive jackpot
        const baseJackpot = 10000;
        const currentTime = Date.now();
        const timeSeed = Math.floor(currentTime / 3600000); // Changes every hour
        const jackpotAmount = baseJackpot + (timeSeed % 50000); // Fluctuates

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎊 PROGRESSIVE JACKPOT 🎊')
            .setDescription('**The jackpot that keeps growing!**')
            .addFields(
                { 
                    name: '💰 Current Jackpot', 
                    value: `**${jackpotAmount.toLocaleString()} COINS!**`, 
                    inline: false 
                },
                { 
                    name: '🎯 How to Win', 
                    value: 'Get 👑👑👑 on Progressive Jackpot machine', 
                    inline: true 
                },
                { 
                    name: '💎 Minimum Bet', 
                    value: '25 coins per spin', 
                    inline: true 
                },
                { 
                    name: '📈 Jackpot Growth', 
                    value: 'Increases with every spin!', 
                    inline: true 
                },
                { 
                    name: '🏆 Recent Winners', 
                    value: 'anonymous: 45,230 coins\nLuckyPlayer: 38,950 coins\nJackpotKing: 52,100 coins', 
                    inline: false 
                },
                { 
                    name: '🎲 Odds', 
                    value: '~1 in 15,000 spins', 
                    inline: true 
                },
                { 
                    name: '⏰ Last Won', 
                    value: '2 hours ago', 
                    inline: true 
                },
                { 
                    name: '🔥 Hot Streak', 
                    value: 'Due soon!', 
                    inline: true 
                }
            )
            .setFooter({ 
                text: '💡 Jackpot updates every hour • Play responsibly'
            })
            .setTimestamp();

        const playButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('slots_play_progressive')
                    .setLabel('🎊 Play for Jackpot')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('slots_jackpot_history')
                    .setLabel('📊 Jackpot History')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ 
            embeds: [embed], 
            components: [playButton] 
        });
    },

    async showStats(interaction, player) {
        const stats = player.slots || {};
        const profitLoss = (stats.totalWon || 0) - (stats.totalBet || 0);
        const winRate = stats.totalSpins ? ((stats.totalWon / stats.totalBet) * 100).toFixed(1) : 0;

        // Find favorite machine
        const machineStats = stats.machineStats || {};
        const favoriteMachine = Object.entries(machineStats)
            .sort(([,a], [,b]) => b.spins - a.spins)[0];

        const embed = new EmbedBuilder()
            .setColor('#8A2BE2')
            .setTitle(`🎰 ${interaction.user.username}'s Slot Stats`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: '🎲 Total Spins', value: `${stats.totalSpins || 0}`, inline: true },
                { name: '💰 Total Bet', value: `${(stats.totalBet || 0).toLocaleString()} coins`, inline: true },
                { name: '🏆 Total Won', value: `${(stats.totalWon || 0).toLocaleString()} coins`, inline: true },
                { name: '📊 Profit/Loss', value: `${profitLoss >= 0 ? '+' : ''}${profitLoss.toLocaleString()} coins`, inline: true },
                { name: '📈 Return Rate', value: `${winRate}%`, inline: true },
                { name: '💎 Biggest Win', value: `${(stats.biggestWin || 0).toLocaleString()} coins`, inline: true },
                { name: '🎊 Jackpots Won', value: `${stats.jackpotsWon || 0}`, inline: true },
                { name: '🎯 Favorite Machine', value: favoriteMachine ? `${slotMachines[favoriteMachine[0]].name}` : 'None yet', inline: true },
                { name: '🏅 Achievements', value: `${(stats.achievements || []).length}/10 unlocked`, inline: true }
            );

        // Machine breakdown
        if (Object.keys(machineStats).length > 0) {
            const breakdown = Object.entries(machineStats)
                .map(([machine, data]) => {
                    const rtp = ((data.won / data.totalBet) * 100).toFixed(1);
                    return `${slotMachines[machine].name}: ${data.spins} spins (${rtp}% RTP)`;
                })
                .join('\n');

            embed.addFields({
                name: '🎰 Machine Breakdown',
                value: breakdown,
                inline: false
            });
        }

        // Recent achievements
        if (stats.achievements && stats.achievements.length > 0) {
            const recentAchievements = stats.achievements.slice(-3).join('\n');
            embed.addFields({
                name: '🏆 Recent Achievements',
                value: recentAchievements,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    },

    spinReels(machine, bet) {
        const symbols = machine.symbols;
        const reels = Array(3).fill().map(() => symbols[Math.floor(Math.random() * symbols.length)]);
        
        let winnings = 0;
        let message = '❌ No match';
        let jackpot = false;
        let bonus = null;

        // Check for exact matches in payouts
        const combination = reels.join('');
        for (const [combo, multiplier] of Object.entries(machine.payouts)) {
            if (combination === combo) {
                winnings = bet * multiplier;
                message = `🎉 ${combo} - ${multiplier}x win!`;
                
                // Check for jackpot
                if (machine.jackpot && combo === '👑👑👑') {
                    const jackpotAmount = 10000 + Math.floor(Math.random() * 50000);
                    winnings += jackpotAmount;
                    jackpot = true;
                    message = `🎊 PROGRESSIVE JACKPOT! 🎊`;
                }
                break;
            }
        }

        // Check for two of a kind
        if (winnings === 0) {
            const symbol = reels[0];
            const matches = reels.filter(s => s === symbol).length;
            
            if (matches >= 2) {
                winnings = Math.floor(bet * 1.5);
                message = `✨ ${symbol} pair - 1.5x win!`;
            }
        }

        // Special features for mega slots
        if (machine.specialFeatures && Math.random() < 0.1) {
            if (reels.includes('🔮')) {
                bonus = '🔮 Crystal Ball Bonus: +50% to next 3 spins!';
                winnings = Math.floor(winnings * 1.5);
            }
        }

        // Wild symbol bonus
        if (reels.includes('⭐') && winnings === 0) {
            winnings = bet;
            message = '⭐ Wild symbol save!';
        }

        return {
            reels,
            winnings,
            message,
            jackpot,
            bonus,
            jackpotAmount: jackpot ? 10000 + Math.floor(Math.random() * 50000) : 0
        };
    },

    checkAchievements(player, result, machineType) {
        if (!player.slots.achievements) player.slots.achievements = [];
        
        const achievements = player.slots.achievements;
        const stats = player.slots;

        // First spin achievement
        if (stats.totalSpins === 1 && !achievements.includes('🎰 First Spin')) {
            achievements.push('🎰 First Spin');
        }

        // Jackpot achievement
        if (result.jackpot && !achievements.includes('🎊 Jackpot Winner')) {
            achievements.push('🎊 Jackpot Winner');
        }

        // High roller achievement
        if (stats.totalBet >= 10000 && !achievements.includes('💰 High Roller')) {
            achievements.push('💰 High Roller');
        }

        // Big win achievement
        if (result.winnings >= 1000 && !achievements.includes('💎 Big Winner')) {
            achievements.push('💎 Big Winner');
        }

        // Spin milestones
        if (stats.totalSpins >= 100 && !achievements.includes('🎲 Century Club')) {
            achievements.push('🎲 Century Club');
        }

        if (stats.totalSpins >= 1000 && !achievements.includes('🌟 Slot Master')) {
            achievements.push('🌟 Slot Master');
        }
    },

    getMachineRTP(machineType) {
        const rtpValues = {
            classic: 94.5,
            deluxe: 96.2,
            progressive: 93.8,
            mega: 95.1
        };
        return rtpValues[machineType] || 95.0;
    },

    setupButtonCollector(interaction, machineType, player) {
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ 
            filter, 
            time: 300000 
        });

        collector.on('collect', async buttonInteraction => {
            try {
                if (buttonInteraction.customId.startsWith('slots_spin_')) {
                    const [, , machine, betAmount] = buttonInteraction.customId.split('_');
                    // Play again with same bet
                    await this.playSlots(buttonInteraction, player);
                }
                // Handle other button interactions...
            } catch (error) {
                console.error('Slots button error:', error);
            }
        });
    }
};
