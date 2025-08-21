
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const SLOT_SYMBOLS = {
    '💎': { value: 1000, name: 'Diamond', rarity: 'legendary' },
    '🏆': { value: 500, name: 'Trophy', rarity: 'epic' },
    '⭐': { value: 250, name: 'Star', rarity: 'rare' },
    '💰': { value: 100, name: 'Money Bag', rarity: 'uncommon' },
    '🍀': { value: 50, name: 'Lucky Clover', rarity: 'common' },
    '🎯': { value: 30, name: 'Target', rarity: 'common' },
    '⚔️': { value: 20, name: 'Sword', rarity: 'common' },
    '🔮': { value: 15, name: 'Crystal Ball', rarity: 'common' }
};

const SLOT_MACHINES = {
    classic: {
        name: '🎰 Classic Slots',
        description: 'Traditional 3-reel slot machine',
        minBet: 10,
        maxBet: 500,
        multiplier: 1.0,
        emoji: '🎰'
    },
    diamond: {
        name: '💎 Diamond Slots',
        description: 'Premium slots with better odds',
        minBet: 25,
        maxBet: 1000,
        multiplier: 1.5,
        emoji: '💎'
    },
    mega: {
        name: '🌟 Mega Slots',
        description: 'High-stakes slots with massive payouts',
        minBet: 100,
        maxBet: 5000,
        multiplier: 3.0,
        emoji: '🌟'
    },
    lucky: {
        name: '🍀 Lucky Slots',
        description: 'Slots with higher win frequency',
        minBet: 5,
        maxBet: 250,
        multiplier: 0.8,
        emoji: '🍀'
    }
};

const BET_AMOUNTS = [10, 25, 50, 100, 250, 500];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('🎰 Try your luck at the magical slot machines!')
        .addStringOption(option =>
            option.setName('machine')
                .setDescription('Choose a slot machine')
                .setRequired(false)
                .addChoices(
                    { name: '🎰 Classic Slots', value: 'classic' },
                    { name: '💎 Diamond Slots', value: 'diamond' },
                    { name: '🌟 Mega Slots', value: 'mega' },
                    { name: '🍀 Lucky Slots', value: 'lucky' }
                ))
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(false)
                .setMinValue(5)
                .setMaxValue(5000)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const machineType = interaction.options?.getString('machine') || 'classic';
        const betAmount = interaction.options?.getInteger('bet');

        // Get player data
        const player = await db.getPlayer(userId);
        if (!player) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Profile Required')
                .setDescription('You need a game profile to play slots!')
                .setFooter({ text: 'Use /daily to create your profile!' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const machine = SLOT_MACHINES[machineType];

        if (!betAmount) {
            return this.showSlotHub(interaction, player, machine);
        }

        return this.playSlots(interaction, player, machine, betAmount);
    },

    async showSlotHub(interaction, player, selectedMachine) {
        // Calculate player's slot stats
        const slotStats = player.slotStats || {
            totalSpins: 0,
            totalWins: 0,
            totalWagered: 0,
            totalWon: 0,
            biggestWin: 0,
            jackpots: 0
        };

        const embed = new EmbedBuilder()
            .setColor('#FF1493')
            .setTitle('🎰 Enchanted Casino Floor')
            .setDescription(`**"Spin to win fantastic treasures!"**\n\nWelcome to the most thrilling slot machines in the realm!`)
            .addFields(
                { name: '💰 Your Coins', value: `${player.coins.toLocaleString()}`, inline: true },
                { name: '🎰 Total Spins', value: `${slotStats.totalSpins}`, inline: true },
                { name: '🏆 Win Rate', value: `${slotStats.totalSpins > 0 ? ((slotStats.totalWins / slotStats.totalSpins) * 100).toFixed(1) : 0}%`, inline: true },
                { name: `${selectedMachine.emoji} Current Machine`, value: selectedMachine.name, inline: true },
                { name: '💎 Biggest Win', value: `${slotStats.biggestWin.toLocaleString()} coins`, inline: true },
                { name: '🎊 Jackpots Hit', value: `${slotStats.jackpots}`, inline: true }
            );

        // Add machine details
        embed.addFields({
            name: '🎰 Machine Details',
            value: `**${selectedMachine.name}**\n${selectedMachine.description}\n` +
                   `💰 Bet Range: ${selectedMachine.minBet} - ${selectedMachine.maxBet} coins\n` +
                   `⚡ Multiplier: ${selectedMachine.multiplier}x\n` +
                   `🎯 Special: ${this.getMachineSpecial(selectedMachine)}`,
            inline: false
        });

        // Add payout table
        const payoutTable = Object.entries(SLOT_SYMBOLS)
            .sort(([,a], [,b]) => b.value - a.value)
            .map(([symbol, data]) => `${symbol}${symbol}${symbol} = ${data.value}x`)
            .join('\n');

        embed.addFields({
            name: '💰 Payout Table (3 matching symbols)',
            value: payoutTable,
            inline: false
        });

        // Quick bet buttons
        const availableBets = BET_AMOUNTS.filter(amount => 
            amount >= selectedMachine.minBet && 
            amount <= selectedMachine.maxBet && 
            player.coins >= amount
        );

        const betButtons = availableBets.slice(0, 5).map(amount => 
            new ButtonBuilder()
                .setCustomId(`slots_bet_${amount}`)
                .setLabel(`Bet ${amount}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎰')
        );

        const utilityButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('slots_max_bet')
                    .setLabel('🚀 Max Bet')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(player.coins < selectedMachine.maxBet),
                new ButtonBuilder()
                    .setCustomId('slots_change_machine')
                    .setLabel('🔄 Change Machine')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('slots_auto_spin')
                    .setLabel('⚡ Auto Spin')
                    .setStyle(ButtonStyle.Success)
            );

        const rows = [];
        if (betButtons.length > 0) {
            // Split bet buttons into rows
            for (let i = 0; i < betButtons.length; i += 3) {
                rows.push(new ActionRowBuilder().addComponents(betButtons.slice(i, i + 3)));
            }
        }
        rows.push(utilityButtons);

        // Store machine selection
        interaction.client.selectedMachines = interaction.client.selectedMachines || new Map();
        interaction.client.selectedMachines.set(userId, selectedMachine);

        await interaction.reply({ embeds: [embed], components: rows });
    },

    async playSlots(interaction, player, machine, betAmount) {
        if (betAmount < machine.minBet || betAmount > machine.maxBet) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Invalid Bet Amount')
                .setDescription(`Bet must be between ${machine.minBet} and ${machine.maxBet} coins for ${machine.name}!`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (player.coins < betAmount) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('💰 Insufficient Funds')
                .setDescription(`You need ${betAmount} coins to make this bet!`)
                .addFields(
                    { name: 'Your Coins', value: `${player.coins}`, inline: true },
                    { name: 'Bet Amount', value: `${betAmount}`, inline: true }
                );
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Deduct bet amount
        player.coins -= betAmount;

        // Generate slot results
        const reels = this.spinReels(machine);
        const winResult = this.calculateWin(reels, betAmount, machine);

        // Initialize slot stats if needed
        if (!player.slotStats) {
            player.slotStats = {
                totalSpins: 0,
                totalWins: 0,
                totalWagered: 0,
                totalWon: 0,
                biggestWin: 0,
                jackpots: 0
            };
        }

        // Update stats
        player.slotStats.totalSpins++;
        player.slotStats.totalWagered += betAmount;

        if (winResult.totalWin > 0) {
            player.coins += winResult.totalWin;
            player.slotStats.totalWins++;
            player.slotStats.totalWon += winResult.totalWin;

            if (winResult.totalWin > player.slotStats.biggestWin) {
                player.slotStats.biggestWin = winResult.totalWin;
            }

            if (winResult.isJackpot) {
                player.slotStats.jackpots++;
            }
        }

        await db.updatePlayer(interaction.user.id, player);

        // Create animated result
        await this.showSpinAnimation(interaction, machine, reels, winResult, betAmount, player);
    },

    async showSpinAnimation(interaction, machine, reels, winResult, betAmount, player) {
        // Initial spinning animation
        const spinEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`${machine.emoji} ${machine.name} - SPINNING!`)
            .setDescription('🎰 The reels are spinning...')
            .addFields(
                { name: '🎲 Reels', value: '🌀 🌀 🌀', inline: false },
                { name: '💰 Bet', value: `${betAmount} coins`, inline: true },
                { name: '🎯 Machine', value: machine.name, inline: true }
            );

        const message = await interaction.reply({ embeds: [spinEmbed] });

        // Show intermediate spin states
        setTimeout(async () => {
            const partialEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`${machine.emoji} ${machine.name} - SPINNING!`)
                .setDescription('🎰 First reel stopped...')
                .addFields({
                    name: '🎲 Reels',
                    value: `${reels[0]} 🌀 🌀`,
                    inline: false
                });

            await message.edit({ embeds: [partialEmbed] });
        }, 1500);

        setTimeout(async () => {
            const partialEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`${machine.emoji} ${machine.name} - SPINNING!`)
                .setDescription('🎰 Second reel stopped...')
                .addFields({
                    name: '🎲 Reels',
                    value: `${reels[0]} ${reels[1]} 🌀`,
                    inline: false
                });

            await message.edit({ embeds: [partialEmbed] });
        }, 2500);

        // Final result
        setTimeout(async () => {
            const resultColor = winResult.totalWin > 0 ? 
                (winResult.isJackpot ? '#FFD700' : '#00FF7F') : '#FF6347';

            const resultEmbed = new EmbedBuilder()
                .setColor(resultColor)
                .setTitle(winResult.isJackpot ? 
                    `🎊 ${machine.emoji} JACKPOT! ${machine.name}` :
                    winResult.totalWin > 0 ?
                        `🏆 ${machine.emoji} WINNER! ${machine.name}` :
                        `${machine.emoji} ${machine.name} - Try Again!`)
                .setDescription(winResult.isJackpot ?
                    '🎊 **INCREDIBLE JACKPOT!** 🎊' :
                    winResult.totalWin > 0 ?
                        '🎉 **Congratulations, you won!** 🎉' :
                        '😔 Better luck next time!')
                .addFields(
                    { name: '🎲 Final Result', value: `${reels[0]} ${reels[1]} ${reels[2]}`, inline: false },
                    { name: '💰 Bet Amount', value: `${betAmount} coins`, inline: true },
                    { name: '🏆 Winnings', value: `${winResult.totalWin} coins`, inline: true },
                    { name: '📊 Net Result', value: `${winResult.totalWin - betAmount >= 0 ? '+' : ''}${winResult.totalWin - betAmount} coins`, inline: true },
                    { name: '💳 Balance', value: `${player.coins} coins`, inline: true },
                    { name: '🎯 Win Type', value: winResult.winType || 'No match', inline: true },
                    { name: '⚡ Multiplier', value: `${machine.multiplier}x`, inline: true }
                );

            if (winResult.matchDetails) {
                resultEmbed.addFields({
                    name: '🎯 Match Details',
                    value: winResult.matchDetails,
                    inline: false
                });
            }

            const playAgainButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`slots_same_bet_${betAmount}`)
                        .setLabel(`🎰 Same Bet (${betAmount})`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(player.coins < betAmount),
                    new ButtonBuilder()
                        .setCustomId('slots_different_bet')
                        .setLabel('💰 Different Bet')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('slots_celebrate')
                        .setLabel('🎉 Celebrate')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(winResult.totalWin === 0),
                    new ButtonBuilder()
                        .setCustomId('slots_quit')
                        .setLabel('🚪 Cash Out')
                        .setStyle(ButtonStyle.Danger)
                );

            await message.edit({ embeds: [resultEmbed], components: [playAgainButtons] });

            // Add special effects for big wins
            if (winResult.totalWin >= betAmount * 10) {
                setTimeout(async () => {
                    const celebrationEmbed = new EmbedBuilder()
                        .setColor('#FFD700')
                        .setTitle('🎊 BIG WIN CELEBRATION!')
                        .setDescription(`🎉 ${interaction.user.username} just won **${winResult.totalWin} coins** on the ${machine.name}! 🎉`)
                        .setThumbnail(interaction.user.displayAvatarURL());
                    
                    await interaction.followUp({ embeds: [celebrationEmbed] });
                }, 2000);
            }
        }, 3500);
    },

    spinReels(machine) {
        const symbols = Object.keys(SLOT_SYMBOLS);
        const weights = this.getSymbolWeights(machine);
        
        return [
            this.weightedRandomSymbol(symbols, weights),
            this.weightedRandomSymbol(symbols, weights),
            this.weightedRandomSymbol(symbols, weights)
        ];
    },

    getSymbolWeights(machine) {
        // Adjust weights based on machine type
        const baseWeights = {
            '💎': 1,
            '🏆': 3,
            '⭐': 6,
            '💰': 12,
            '🍀': 18,
            '🎯': 25,
            '⚔️': 20,
            '🔮': 15
        };

        // Lucky slots have better rare symbol odds
        if (machine.name.includes('Lucky')) {
            baseWeights['💎'] *= 2;
            baseWeights['🏆'] *= 1.5;
            baseWeights['⭐'] *= 1.3;
        }

        return baseWeights;
    },

    weightedRandomSymbol(symbols, weights) {
        const totalWeight = symbols.reduce((sum, symbol) => sum + weights[symbol], 0);
        let random = Math.random() * totalWeight;
        
        for (const symbol of symbols) {
            random -= weights[symbol];
            if (random <= 0) return symbol;
        }
        
        return symbols[symbols.length - 1];
    },

    calculateWin(reels, betAmount, machine) {
        const [reel1, reel2, reel3] = reels;
        let totalWin = 0;
        let winType = null;
        let matchDetails = null;
        let isJackpot = false;

        // Check for three of a kind (jackpot)
        if (reel1 === reel2 && reel2 === reel3) {
            const symbol = SLOT_SYMBOLS[reel1];
            totalWin = Math.floor(betAmount * symbol.value * machine.multiplier / 100);
            winType = `Triple ${symbol.name}`;
            matchDetails = `Three ${reel1} symbols!`;
            isJackpot = symbol.value >= 500;
        }
        // Check for two of a kind
        else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
            const matchingSymbol = reel1 === reel2 ? reel1 : reel2 === reel3 ? reel2 : reel1;
            const symbol = SLOT_SYMBOLS[matchingSymbol];
            totalWin = Math.floor(betAmount * symbol.value * machine.multiplier / 500); // Smaller payout for pairs
            winType = `Pair of ${symbol.name}`;
            matchDetails = `Two ${matchingSymbol} symbols!`;
        }
        // Check for any diamonds (small consolation prize)
        else if (reels.includes('💎')) {
            totalWin = Math.floor(betAmount * 0.5 * machine.multiplier);
            winType = 'Diamond Bonus';
            matchDetails = 'Lucky diamond appeared!';
        }

        return {
            totalWin,
            winType,
            matchDetails,
            isJackpot
        };
    },

    getMachineSpecial(machine) {
        const specials = {
            'Classic Slots': 'Balanced gameplay',
            'Diamond Slots': 'Higher diamond chances',
            'Mega Slots': 'Massive multipliers',
            'Lucky Slots': 'More frequent wins'
        };
        return specials[machine.name] || 'Standard features';
    }
};
