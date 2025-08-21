
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const gamblingGames = {
    slots: {
        name: '🎰 Slot Machine',
        description: 'Classic three-reel slot machine',
        minBet: 10,
        maxBet: 5000,
        symbols: ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '⭐', '🔔'],
        payouts: {
            three_match: { '💎': 50, '7️⃣': 25, '⭐': 15, '🔔': 12, '🍇': 10, '🍊': 8, '🍋': 6, '🍒': 5 },
            two_match: 2
        }
    },
    dice: {
        name: '🎲 Dice Battle',
        description: 'Roll dice against the house',
        minBet: 5,
        maxBet: 2000,
        modes: ['single', 'double', 'triple']
    },
    coinflip: {
        name: '🪙 Coin Flip',
        description: 'Call heads or tails',
        minBet: 1,
        maxBet: 1000,
        payout: 2
    },
    blackjack: {
        name: '🃏 Blackjack',
        description: 'Beat the dealer to 21',
        minBet: 25,
        maxBet: 3000,
        payouts: { blackjack: 2.5, win: 2, push: 1 }
    },
    roulette: {
        name: '🎡 Roulette',
        description: 'European roulette wheel',
        minBet: 10,
        maxBet: 2500,
        payouts: { single: 36, color: 2, even_odd: 2, dozen: 3 }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('🎰 Access the premium gambling suite!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Play a gambling game')
                .addStringOption(option =>
                    option.setName('game')
                        .setDescription('Choose your game')
                        .setRequired(true)
                        .addChoices(
                            { name: '🎰 Slot Machine', value: 'slots' },
                            { name: '🎲 Dice Battle', value: 'dice' },
                            { name: '🪙 Coin Flip', value: 'coinflip' },
                            { name: '🃏 Blackjack', value: 'blackjack' },
                            { name: '🎡 Roulette', value: 'roulette' }
                        ))
                .addIntegerOption(option =>
                    option.setName('bet')
                        .setDescription('Amount to bet')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View your gambling statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View top gamblers'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('Configure gambling preferences')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            const player = await db.getPlayer(userId) || {
                coins: 100,
                gambling: {
                    totalBet: 0,
                    totalWon: 0,
                    gamesPlayed: 0,
                    biggestWin: 0,
                    winStreak: 0,
                    bestStreak: 0,
                    preferences: {
                        autoPlay: false,
                        quickBet: false,
                        riskLevel: 'medium'
                    }
                }
            };

            if (subcommand === 'play') {
                const game = interaction.options.getString('game');
                const bet = interaction.options.getInteger('bet');
                
                await this.playGame(interaction, game, bet, player);
                
            } else if (subcommand === 'stats') {
                await this.showStats(interaction, player);
                
            } else if (subcommand === 'leaderboard') {
                await this.showLeaderboard(interaction);
                
            } else if (subcommand === 'settings') {
                await this.showSettings(interaction, player);
            }

        } catch (error) {
            console.error('Error in gamble command:', error);
            await interaction.reply({
                content: '❌ An error occurred while gambling.',
                ephemeral: true
            });
        }
    },

    async playGame(interaction, gameType, bet, player) {
        const game = gamblingGames[gameType];
        
        if (!game) {
            return interaction.reply({
                content: '❌ Invalid game type!',
                ephemeral: true
            });
        }

        if (bet < game.minBet || bet > game.maxBet) {
            return interaction.reply({
                content: `❌ Bet must be between ${game.minBet} and ${game.maxBet} coins!`,
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

        // Play the game
        const result = await this.executeGame(gameType, bet, player);
        
        // Update player stats
        const netGain = result.winnings - bet;
        player.coins += netGain;
        
        if (!player.gambling) player.gambling = {};
        player.gambling.totalBet = (player.gambling.totalBet || 0) + bet;
        player.gambling.totalWon = (player.gambling.totalWon || 0) + result.winnings;
        player.gambling.gamesPlayed = (player.gambling.gamesPlayed || 0) + 1;
        
        if (result.winnings > (player.gambling.biggestWin || 0)) {
            player.gambling.biggestWin = result.winnings;
        }

        if (result.won) {
            player.gambling.winStreak = (player.gambling.winStreak || 0) + 1;
            if (player.gambling.winStreak > (player.gambling.bestStreak || 0)) {
                player.gambling.bestStreak = player.gambling.winStreak;
            }
        } else {
            player.gambling.winStreak = 0;
        }

        await db.updatePlayer(interaction.user.id, player);

        // Create result embed
        const embed = new EmbedBuilder()
            .setColor(result.won ? '#00FF00' : '#FF0000')
            .setTitle(`${game.name} Results`)
            .setDescription(result.description)
            .addFields(
                { name: '💰 Bet Amount', value: `${bet.toLocaleString()} coins`, inline: true },
                { name: result.won ? '🎉 Won' : '💸 Lost', value: `${result.winnings.toLocaleString()} coins`, inline: true },
                { name: '📊 Net Result', value: `${netGain >= 0 ? '+' : ''}${netGain.toLocaleString()} coins`, inline: true },
                { name: '💳 Balance', value: `${player.coins.toLocaleString()} coins`, inline: true },
                { name: '🔥 Win Streak', value: `${player.gambling.winStreak || 0}`, inline: true },
                { name: '🎯 Win Rate', value: `${this.calculateWinRate(player)}%`, inline: true }
            )
            .setFooter({ 
                text: result.won ? 
                    `Congratulations! • Game #${player.gambling.gamesPlayed}` : 
                    `Better luck next time! • Game #${player.gambling.gamesPlayed}`
            })
            .setTimestamp();

        if (result.jackpot) {
            embed.addFields({
                name: '🎊 JACKPOT!',
                value: 'You hit the ultimate prize!',
                inline: false
            });
        }

        if (result.specialMessage) {
            embed.addFields({
                name: '✨ Special',
                value: result.specialMessage,
                inline: false
            });
        }

        // Create interactive buttons
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`gamble_again_${gameType}_${bet}`)
                    .setLabel('🎰 Play Again')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(player.coins < bet),
                new ButtonBuilder()
                    .setCustomId('gambling_stats')
                    .setLabel('📊 My Stats')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('change_bet')
                    .setLabel('💰 Change Bet')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('cashout')
                    .setLabel('🏦 Cash Out')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.editReply({ 
            embeds: [embed], 
            components: [buttons] 
        });

        // Set up button collector
        this.setupButtonCollector(interaction, gameType, player);
    },

    async executeGame(gameType, bet, player) {
        switch (gameType) {
            case 'slots':
                return this.playSlots(bet, player);
            case 'dice':
                return this.playDice(bet, player);
            case 'coinflip':
                return this.playCoinFlip(bet, player);
            case 'blackjack':
                return this.playBlackjack(bet, player);
            case 'roulette':
                return this.playRoulette(bet, player);
            default:
                return { won: false, winnings: 0, description: 'Invalid game' };
        }
    },

    playSlots(bet, player) {
        const symbols = gamblingGames.slots.symbols;
        const reels = Array(3).fill().map(() => symbols[Math.floor(Math.random() * symbols.length)]);
        
        let winnings = 0;
        let won = false;
        let jackpot = false;
        let specialMessage = '';

        // Check for three of a kind
        if (reels[0] === reels[1] && reels[1] === reels[2]) {
            won = true;
            const symbol = reels[0];
            const multiplier = gamblingGames.slots.payouts.three_match[symbol] || 5;
            winnings = bet * multiplier;
            
            if (symbol === '💎') {
                jackpot = true;
                specialMessage = 'DIAMOND JACKPOT! 💎✨';
            } else if (symbol === '7️⃣') {
                specialMessage = 'Lucky Sevens! 🍀';
            }
        }
        // Check for two of a kind
        else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
            won = true;
            winnings = bet * gamblingGames.slots.payouts.two_match;
        }

        // Luck bonus
        const luckBonus = Math.random() < (player.gambling?.winStreak || 0) * 0.01;
        if (luckBonus && !won) {
            won = true;
            winnings = bet;
            specialMessage = 'Lucky streak bonus! 🍀';
        }

        return {
            won,
            winnings,
            jackpot,
            specialMessage,
            description: `**${reels[0]} | ${reels[1]} | ${reels[2]}**\n\n${won ? (jackpot ? '🎊 JACKPOT! 🎊' : '🎉 Winner!') : '❌ No match'}`
        };
    },

    playDice(bet, player) {
        const playerRoll = Math.floor(Math.random() * 6) + 1;
        const houseRoll = Math.floor(Math.random() * 6) + 1;
        
        let winnings = 0;
        let won = false;
        let specialMessage = '';

        if (playerRoll > houseRoll) {
            won = true;
            winnings = bet * 2;
            if (playerRoll === 6 && houseRoll === 1) {
                winnings = bet * 4;
                specialMessage = 'Perfect roll! Maximum difference! 🎯';
            }
        } else if (playerRoll === houseRoll) {
            winnings = bet; // Push
            specialMessage = 'Tie game - bet returned! 🤝';
        }

        return {
            won: playerRoll >= houseRoll,
            winnings,
            specialMessage,
            description: `🎲 **Your Roll:** ${playerRoll}\n🏠 **House Roll:** ${houseRoll}\n\n${playerRoll > houseRoll ? '🎉 You win!' : playerRoll === houseRoll ? '🤝 Tie!' : '❌ House wins'}`
        };
    },

    playCoinFlip(bet, player) {
        const choices = ['heads', 'tails'];
        const playerChoice = choices[Math.floor(Math.random() * 2)];
        const result = choices[Math.floor(Math.random() * 2)];
        const won = playerChoice === result;

        return {
            won,
            winnings: won ? bet * 2 : 0,
            description: `🪙 **You called:** ${playerChoice}\n🪙 **Result:** ${result}\n\n${won ? '🎉 Correct call!' : '❌ Wrong call'}`
        };
    },

    playBlackjack(bet, player) {
        const drawCard = () => Math.min(Math.floor(Math.random() * 13) + 1, 10);
        
        const playerCards = [drawCard(), drawCard()];
        const dealerCards = [drawCard(), drawCard()];
        
        const playerTotal = playerCards.reduce((a, b) => a + b, 0);
        const dealerTotal = dealerCards.reduce((a, b) => a + b, 0);
        
        let winnings = 0;
        let won = false;
        let specialMessage = '';

        if (playerTotal === 21) {
            won = true;
            winnings = Math.floor(bet * 2.5);
            specialMessage = 'BLACKJACK! 🃏✨';
        } else if (playerTotal > 21) {
            // Player bust
        } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
            won = true;
            winnings = bet * 2;
        } else if (playerTotal === dealerTotal) {
            winnings = bet; // Push
            specialMessage = 'Push - bet returned! 🤝';
        }

        return {
            won: playerTotal <= 21 && (dealerTotal > 21 || playerTotal >= dealerTotal),
            winnings,
            specialMessage,
            description: `🃏 **Your Hand:** ${playerCards.join(' + ')} = **${playerTotal}**\n🏠 **Dealer:** ${dealerCards.join(' + ')} = **${dealerTotal}**\n\n${playerTotal === 21 ? '🃏 BLACKJACK!' : playerTotal > 21 ? '💥 Bust!' : dealerTotal > 21 ? '🏠 Dealer bust!' : `${playerTotal} vs ${dealerTotal}`}`
        };
    },

    playRoulette(bet, player) {
        const number = Math.floor(Math.random() * 37); // 0-36
        const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(number);
        const isBlack = number !== 0 && !isRed;
        
        // Simple red/black bet
        const playerBet = Math.random() < 0.5 ? 'red' : 'black';
        const won = (playerBet === 'red' && isRed) || (playerBet === 'black' && isBlack);
        
        const color = number === 0 ? 'green' : isRed ? 'red' : 'black';
        let specialMessage = '';
        
        if (number === 0) {
            specialMessage = 'House wins on green zero! 🏠';
        }

        return {
            won: won && number !== 0,
            winnings: won && number !== 0 ? bet * 2 : 0,
            specialMessage,
            description: `🎡 **Ball landed on:** ${number} (${color})\n🎯 **You bet:** ${playerBet}\n\n${number === 0 ? '🏠 House wins!' : won ? `🎉 ${color} wins!` : `❌ ${color} loses!`}`
        };
    },

    async showStats(interaction, player) {
        const stats = player.gambling || {};
        const winRate = this.calculateWinRate(player);
        const profitLoss = (stats.totalWon || 0) - (stats.totalBet || 0);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🎰 ${interaction.user.username}'s Gambling Stats`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: '🎮 Games Played', value: `${stats.gamesPlayed || 0}`, inline: true },
                { name: '🎯 Win Rate', value: `${winRate}%`, inline: true },
                { name: '🔥 Current Streak', value: `${stats.winStreak || 0}`, inline: true },
                { name: '💰 Total Bet', value: `${(stats.totalBet || 0).toLocaleString()} coins`, inline: true },
                { name: '🏆 Total Won', value: `${(stats.totalWon || 0).toLocaleString()} coins`, inline: true },
                { name: '📊 Net P/L', value: `${profitLoss >= 0 ? '+' : ''}${profitLoss.toLocaleString()} coins`, inline: true },
                { name: '💎 Biggest Win', value: `${(stats.biggestWin || 0).toLocaleString()} coins`, inline: true },
                { name: '🌟 Best Streak', value: `${stats.bestStreak || 0} wins`, inline: true },
                { name: '💳 Current Balance', value: `${player.coins.toLocaleString()} coins`, inline: true }
            )
            .setFooter({ 
                text: `Gambler since ${new Date().toLocaleDateString()} • Remember to gamble responsibly!`
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async showSettings(interaction, player) {
        const preferences = player.gambling?.preferences || {};
        
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('⚙️ Gambling Settings')
            .setDescription('Configure your gambling preferences:')
            .addFields(
                { name: '🔄 Auto Play', value: preferences.autoPlay ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: '⚡ Quick Bet', value: preferences.quickBet ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: '⚠️ Risk Level', value: preferences.riskLevel || 'Medium', inline: true }
            );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('gambling_settings')
            .setPlaceholder('Choose a setting to modify')
            .addOptions([
                {
                    label: 'Toggle Auto Play',
                    description: 'Automatically play with last bet amount',
                    value: 'autoplay'
                },
                {
                    label: 'Toggle Quick Bet',
                    description: 'Skip confirmation dialogs',
                    value: 'quickbet'
                },
                {
                    label: 'Set Risk Level',
                    description: 'Low, Medium, or High risk tolerance',
                    value: 'risk'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.reply({ embeds: [embed], components: [row] });
    },

    setupButtonCollector(interaction, gameType, player) {
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ 
            filter, 
            time: 300000 // 5 minutes
        });

        collector.on('collect', async buttonInteraction => {
            try {
                if (buttonInteraction.customId.startsWith('gamble_again_')) {
                    const [, , game, betAmount] = buttonInteraction.customId.split('_');
                    await this.playGame(buttonInteraction, game, parseInt(betAmount), player);
                }
                // Handle other buttons...
            } catch (error) {
                console.error('Button interaction error:', error);
            }
        });
    },

    calculateWinRate(player) {
        const stats = player.gambling || {};
        if (!stats.gamesPlayed) return 0;
        
        const wins = stats.totalWon > stats.totalBet ? 
            Math.floor(stats.gamesPlayed * 0.4) : // Estimate based on profit
            Math.floor(stats.gamesPlayed * 0.3); // Conservative estimate
            
        return Math.floor((wins / stats.gamesPlayed) * 100);
    }
};
