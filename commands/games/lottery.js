
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const LOTTERY_GAMES = {
    quick_draw: {
        name: '⚡ Quick Draw',
        description: 'Instant win lottery with immediate results',
        ticketCost: 25,
        maxPayout: 1000,
        odds: 0.15, // 15% win chance
        emoji: '⚡'
    },
    daily_jackpot: {
        name: '💎 Daily Jackpot',
        description: 'Big prizes drawn every 24 hours',
        ticketCost: 100,
        maxPayout: 10000,
        odds: 0.05, // 5% win chance
        emoji: '💎'
    },
    super_lottery: {
        name: '🌟 Super Lottery',
        description: 'Massive weekly jackpot with life-changing prizes',
        ticketCost: 500,
        maxPayout: 50000,
        odds: 0.01, // 1% win chance
        emoji: '🌟'
    },
    scratch_card: {
        name: '🃏 Scratch Card',
        description: 'Reveal symbols to win instant prizes',
        ticketCost: 50,
        maxPayout: 2500,
        odds: 0.25, // 25% win chance
        emoji: '🃏'
    }
};

const PRIZE_TIERS = {
    small: { min: 50, max: 200, weight: 50 },
    medium: { min: 201, max: 500, weight: 25 },
    large: { min: 501, max: 1500, weight: 15 },
    jackpot: { min: 1501, max: 5000, weight: 8 },
    mega: { min: 5001, max: 15000, weight: 2 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lottery')
        .setDescription('🎰 Try your luck in various lottery games!')
        .addStringOption(option =>
            option.setName('game')
                .setDescription('Choose a lottery game')
                .setRequired(false)
                .addChoices(
                    { name: '⚡ Quick Draw (25 coins)', value: 'quick_draw' },
                    { name: '💎 Daily Jackpot (100 coins)', value: 'daily_jackpot' },
                    { name: '🌟 Super Lottery (500 coins)', value: 'super_lottery' },
                    { name: '🃏 Scratch Card (50 coins)', value: 'scratch_card' }
                ))
        .addIntegerOption(option =>
            option.setName('tickets')
                .setDescription('Number of tickets to buy (1-10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const gameType = interaction.options?.getString('game');
        const ticketCount = interaction.options?.getInteger('tickets') || 1;

        // Get player data
        const player = await db.getPlayer(userId);
        if (!player) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Profile Required')
                .setDescription('You need a game profile to play the lottery!')
                .setFooter({ text: 'Use /daily to create your profile!' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (!gameType) {
            return this.showLotteryHub(interaction, player);
        }

        return this.playLottery(interaction, player, gameType, ticketCount);
    },

    async showLotteryHub(interaction, player) {
        const currentJackpots = {
            daily_jackpot: Math.floor(Math.random() * 5000) + 15000,
            super_lottery: Math.floor(Math.random() * 25000) + 75000
        };

        // Calculate player's lottery stats
        const lotteryStats = player.lotteryStats || {
            totalTickets: 0,
            totalWins: 0,
            totalWinnings: 0,
            biggestWin: 0,
            gamesPlayed: 0
        };

        const embed = new EmbedBuilder()
            .setColor('#FF1493')
            .setTitle('🎰 Mystical Lottery Palace')
            .setDescription('**"Fortune favors the brave!"**\n\nWelcome to the most exciting lottery games in the realm!')
            .addFields(
                { name: '💰 Your Coins', value: `${player.coins.toLocaleString()}`, inline: true },
                { name: '🎫 Total Tickets Bought', value: `${lotteryStats.totalTickets}`, inline: true },
                { name: '🏆 Total Wins', value: `${lotteryStats.totalWins}`, inline: true },
                { name: '💎 Current Daily Jackpot', value: `${currentJackpots.daily_jackpot.toLocaleString()} coins`, inline: true },
                { name: '🌟 Current Super Jackpot', value: `${currentJackpots.super_lottery.toLocaleString()} coins`, inline: true },
                { name: '📊 Win Rate', value: `${lotteryStats.totalTickets > 0 ? ((lotteryStats.totalWins / lotteryStats.totalTickets) * 100).toFixed(1) : 0}%`, inline: true }
            );

        // Add game descriptions
        Object.entries(LOTTERY_GAMES).forEach(([key, game]) => {
            const winChance = (game.odds * 100).toFixed(1);
            embed.addFields({
                name: `${game.emoji} ${game.name}`,
                value: `**Cost:** ${game.ticketCost} coins\n**Max Prize:** ${game.maxPayout.toLocaleString()} coins\n**Win Chance:** ~${winChance}%\n*${game.description}*`,
                inline: true
            });
        });

        // Game selection buttons
        const gameButtons = Object.entries(LOTTERY_GAMES).map(([key, game]) => 
            new ButtonBuilder()
                .setCustomId(`lottery_play_${key}`)
                .setLabel(`${game.name}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(game.emoji)
                .setDisabled(player.coins < game.ticketCost)
        );

        const utilityButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('lottery_history')
                    .setLabel('🏆 Recent Winners')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('lottery_stats')
                    .setLabel('📊 Your Stats')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('lottery_rules')
                    .setLabel('📋 Rules & Odds')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Split buttons into rows (max 5 per row)
        const rows = [];
        for (let i = 0; i < gameButtons.length; i += 2) {
            rows.push(new ActionRowBuilder().addComponents(gameButtons.slice(i, i + 2)));
        }
        rows.push(utilityButtons);

        await interaction.reply({ embeds: [embed], components: rows });
    },

    async playLottery(interaction, player, gameType, ticketCount) {
        const game = LOTTERY_GAMES[gameType];
        const totalCost = game.ticketCost * ticketCount;

        if (player.coins < totalCost) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('💰 Insufficient Funds')
                .setDescription(`You need **${totalCost} coins** to buy ${ticketCount} ticket(s)!`)
                .addFields(
                    { name: 'Your Coins', value: `${player.coins}`, inline: true },
                    { name: 'Cost per Ticket', value: `${game.ticketCost}`, inline: true },
                    { name: 'Total Cost', value: `${totalCost}`, inline: true }
                );
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Deduct ticket cost
        player.coins -= totalCost;

        // Initialize lottery stats if needed
        if (!player.lotteryStats) {
            player.lotteryStats = {
                totalTickets: 0,
                totalWins: 0,
                totalWinnings: 0,
                biggestWin: 0,
                gamesPlayed: 0
            };
        }

        player.lotteryStats.totalTickets += ticketCount;
        player.lotteryStats.gamesPlayed++;

        let totalWinnings = 0;
        let winningTickets = 0;
        let results = [];

        // Process each ticket
        for (let i = 1; i <= ticketCount; i++) {
            const isWinner = Math.random() < game.odds;
            
            if (isWinner) {
                const winAmount = this.calculateWinAmount(game);
                totalWinnings += winAmount;
                winningTickets++;
                results.push({ ticket: i, won: true, amount: winAmount });
            } else {
                results.push({ ticket: i, won: false, amount: 0 });
            }
        }

        // Update player stats and coins
        if (totalWinnings > 0) {
            player.coins += totalWinnings;
            player.lotteryStats.totalWins += winningTickets;
            player.lotteryStats.totalWinnings += totalWinnings;
            
            if (totalWinnings > player.lotteryStats.biggestWin) {
                player.lotteryStats.biggestWin = totalWinnings;
            }
        }

        await db.updatePlayer(interaction.user.id, player);

        // Create results embed
        const embed = new EmbedBuilder()
            .setColor(totalWinnings > 0 ? '#00FF7F' : '#FF6347')
            .setTitle(`${game.emoji} ${game.name} Results`)
            .setDescription(totalWinnings > 0 ? 
                `🎉 **Congratulations!** You won with ${winningTickets}/${ticketCount} ticket(s)!` :
                `😔 Better luck next time! None of your ${ticketCount} ticket(s) won.`)
            .addFields(
                { name: '🎫 Tickets Played', value: `${ticketCount}`, inline: true },
                { name: '💰 Total Cost', value: `${totalCost} coins`, inline: true },
                { name: '🏆 Total Winnings', value: `${totalWinnings} coins`, inline: true },
                { name: '📊 Net Result', value: `${totalWinnings - totalCost >= 0 ? '+' : ''}${totalWinnings - totalCost} coins`, inline: true },
                { name: '💳 Remaining Coins', value: `${player.coins} coins`, inline: true },
                { name: '🎯 Win Rate This Game', value: `${winningTickets}/${ticketCount} (${((winningTickets/ticketCount)*100).toFixed(1)}%)`, inline: true }
            );

        // Add detailed results if multiple tickets
        if (ticketCount > 1) {
            const resultText = results.map(r => 
                `Ticket ${r.ticket}: ${r.won ? `🏆 Won ${r.amount} coins` : '❌ No prize'}`
            ).join('\n');
            
            embed.addFields({ 
                name: '🎫 Individual Results', 
                value: resultText.length > 1024 ? 
                    `${resultText.substring(0, 1000)}...\n*Results truncated*` : 
                    resultText, 
                inline: false 
            });
        }

        // Special effects for big wins
        if (totalWinnings >= 1000) {
            embed.setColor('#FFD700');
            embed.setTitle(`🌟 ${game.emoji} MASSIVE WIN! ${game.name} Results`);
            
            if (totalWinnings >= 5000) {
                embed.setTitle(`💎 ${game.emoji} JACKPOT! ${game.name} Results`);
                embed.setDescription(`🎊 **INCREDIBLE!** You hit a massive jackpot worth ${totalWinnings} coins! 🎊`);
            }
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`lottery_play_again_${gameType}`)
                    .setLabel('🎰 Play Again')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(player.coins < game.ticketCost),
                new ButtonBuilder()
                    .setCustomId('lottery_different_game')
                    .setLabel('🎲 Try Different Game')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('lottery_celebration')
                    .setLabel('🎉 Celebrate')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(totalWinnings === 0)
            );

        await interaction.reply({ embeds: [embed], components: [buttons] });

        // Add special celebration for big wins
        if (totalWinnings >= 2000) {
            setTimeout(async () => {
                const celebrationEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🎊 Winner Celebration!')
                    .setDescription(`🎉 ${interaction.user.username} just won **${totalWinnings} coins** in the ${game.name}! 🎉`)
                    .setThumbnail(interaction.user.displayAvatarURL());
                
                await interaction.followUp({ embeds: [celebrationEmbed] });
            }, 2000);
        }
    },

    calculateWinAmount(game) {
        // Weighted random selection of prize tiers
        const totalWeight = Object.values(PRIZE_TIERS).reduce((sum, tier) => sum + tier.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const [tierName, tier] of Object.entries(PRIZE_TIERS)) {
            random -= tier.weight;
            if (random <= 0) {
                // Random amount within the tier range
                const amount = Math.floor(Math.random() * (tier.max - tier.min + 1)) + tier.min;
                // Cap at game's max payout
                return Math.min(amount, game.maxPayout);
            }
        }
        
        // Fallback
        return Math.floor(Math.random() * 100) + 50;
    }
};
