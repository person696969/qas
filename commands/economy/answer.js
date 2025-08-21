
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('answer')
        .setDescription('🤔 Answer a clue in your current treasure hunt')
        .addStringOption(option =>
            option.setName('answer')
                .setDescription('Your answer to the current clue')
                .setRequired(true)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const userId = interaction.user.id;
            const userAnswer = interaction.options.getString('answer').toLowerCase().trim();

            // Get current hunt
            const hunt = await db.getHunt(userId);
            if (!hunt || !hunt.active) {
                const embed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('❌ No Active Hunt')
                    .setDescription('You don\'t have an active treasure hunt!')
                    .addFields(
                        { name: '🗺️ Start a Hunt', value: 'Use `/treasure` to begin a new adventure!', inline: true },
                        { name: '💡 Tip', value: 'Treasure hunts offer great rewards and experience!', inline: true }
                    )
                    .setTimestamp();

                const button = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('start_hunt')
                            .setLabel('🗺️ Start New Hunt')
                            .setStyle(ButtonStyle.Primary)
                    );

                await interaction.editReply({ embeds: [embed], components: [button] });
                return;
            }

            const currentClue = hunt.currentClue;
            
            if (userAnswer === currentClue.answer.toLowerCase()) {
                // Correct answer!
                let userData = await db.getPlayer(userId);
                if (!userData) {
                    userData = {
                        inventory: { coins: 100, items: [] },
                        stats: { experience: 0, level: 1, treasureHunts: 0 }
                    };
                }

                const baseReward = currentClue.reward || 100;
                const streakBonus = Math.floor((hunt.solvedClues.length + 1) * 25);
                const totalReward = baseReward + streakBonus;
                const experienceGained = 15 + (hunt.solvedClues.length * 5);
                
                userData.inventory.coins = (userData.inventory.coins || 0) + totalReward;
                userData.stats.experience = (userData.stats.experience || 0) + experienceGained;
                
                // Progress the hunt
                hunt.solvedClues.push({
                    ...currentClue,
                    solvedAt: Date.now(),
                    timeToSolve: Date.now() - hunt.clueStartTime
                });
                
                if (hunt.solvedClues.length >= hunt.totalClues) {
                    // Hunt completed!
                    const completionBonus = Math.floor(Math.random() * 200) + 300;
                    const perfectBonus = hunt.solvedClues.length === hunt.totalClues ? 100 : 0;
                    const totalCompletionReward = completionBonus + perfectBonus;
                    
                    userData.inventory.coins += totalCompletionReward;
                    userData.stats.experience += 50;
                    userData.stats.treasureHunts = (userData.stats.treasureHunts || 0) + 1;

                    // Add special completion item
                    if (!userData.inventory.items) userData.inventory.items = [];
                    userData.inventory.items.push({
                        id: 'treasure_map_fragment',
                        name: 'Treasure Map Fragment',
                        category: 'treasure',
                        value: 200,
                        rarity: 'rare',
                        emoji: '🗞️',
                        obtainedAt: Date.now(),
                        source: 'treasure_hunt_completion'
                    });
                    
                    const embed = new EmbedBuilder()
                        .setColor('#FFD700')
                        .setTitle('🎉 Treasure Hunt Completed!')
                        .setDescription(`**Magnificent! You've discovered all the treasures!**\n\n🏆 **Perfect Hunt Bonus!**`)
                        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: '💰 Clue Reward', value: `${totalReward} coins`, inline: true },
                            { name: '🌟 Completion Bonus', value: `${totalCompletionReward} coins`, inline: true },
                            { name: '✨ Experience Gained', value: `${experienceGained + 50} XP`, inline: true },
                            { name: '🎯 Hunt Statistics', value: `**Clues Solved:** ${hunt.solvedClues.length}/${hunt.totalClues}\n**Hunt Duration:** ${this.formatDuration(Date.now() - hunt.startTime)}\n**Average Time per Clue:** ${this.formatDuration(this.getAverageTime(hunt))}`, inline: false },
                            { name: '🎁 Special Reward', value: '📜 **Treasure Map Fragment** added to inventory!', inline: false }
                        )
                        .setFooter({ text: `Total Earnings: ${totalReward + totalCompletionReward} coins | Hunt #${userData.stats.treasureHunts}` })
                        .setTimestamp();

                    const buttons = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('start_new_hunt')
                                .setLabel('🗺️ Start New Hunt')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId('view_inventory')
                                .setLabel('🎒 View Inventory')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId('hunt_leaderboard')
                                .setLabel('🏆 Leaderboard')
                                .setStyle(ButtonStyle.Secondary)
                        );
                    
                    await db.deleteHunt(userId);
                    await db.setPlayer(userId, userData);
                    await interaction.editReply({ embeds: [embed], components: [buttons] });
                    return;
                }

                // Get next clue
                hunt.currentClue = hunt.remainingClues.shift();
                hunt.clueStartTime = Date.now();
                await db.setHunt(userId, hunt);
                await db.setPlayer(userId, userData);

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Correct Answer!')
                    .setDescription(`**Excellent deduction!** You've solved the clue!`)
                    .setThumbnail('https://cdn.discordapp.com/emojis/✅.png')
                    .addFields(
                        { name: '💰 Clue Reward', value: `+${totalReward} coins (Base: ${baseReward} + Streak: ${streakBonus})`, inline: true },
                        { name: '✨ Experience', value: `+${experienceGained} XP`, inline: true },
                        { name: '📈 Progress', value: `${hunt.solvedClues.length}/${hunt.totalClues} clues solved`, inline: true },
                        { name: '🔍 Next Clue', value: `**"${hunt.currentClue.text}"**`, inline: false },
                        { name: '💡 Hint Available', value: hunt.currentClue.hint ? `*"${hunt.currentClue.hint}"*` : '*No hint available*', inline: false }
                    )
                    .setFooter({ text: `Solve time: ${this.formatDuration(Date.now() - (hunt.clueStartTime - (Date.now() - hunt.clueStartTime)))}` })
                    .setTimestamp();

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('get_hint')
                            .setLabel('💡 Get Hint')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(!hunt.currentClue.hint),
                        new ButtonBuilder()
                            .setCustomId('hunt_progress')
                            .setLabel('📊 View Progress')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('abandon_hunt')
                            .setLabel('❌ Abandon Hunt')
                            .setStyle(ButtonStyle.Danger)
                    );

                await interaction.editReply({ embeds: [embed], components: [buttons] });
            } else {
                // Wrong answer
                const attemptsLeft = 3 - (hunt.attempts || 0);
                hunt.attempts = (hunt.attempts || 0) + 1;

                if (hunt.attempts >= 3) {
                    // Too many wrong attempts - hunt failed
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('💀 Hunt Failed!')
                        .setDescription('**Too many incorrect attempts!** Your treasure hunt has ended.')
                        .addFields(
                            { name: '📊 Final Statistics', value: `**Clues Solved:** ${hunt.solvedClues.length}/${hunt.totalClues}\n**Attempts Made:** ${hunt.attempts}\n**Hunt Duration:** ${this.formatDuration(Date.now() - hunt.startTime)}`, inline: false },
                            { name: '💰 Consolation Prize', value: 'You receive 25 coins for your effort!', inline: true }
                        )
                        .setFooter({ text: 'Better luck next time! Practice makes perfect.' })
                        .setTimestamp();

                    // Give small consolation prize
                    let userData = await db.getPlayer(userId);
                    if (userData) {
                        userData.inventory.coins = (userData.inventory.coins || 0) + 25;
                        await db.setPlayer(userId, userData);
                    }

                    const button = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('start_new_hunt')
                                .setLabel('🗺️ Try Again')
                                .setStyle(ButtonStyle.Primary)
                        );

                    await db.deleteHunt(userId);
                    await interaction.editReply({ embeds: [embed], components: [button] });
                    return;
                }

                await db.setHunt(userId, hunt);

                const embed = new EmbedBuilder()
                    .setColor('#FF9900')
                    .setTitle('❌ Incorrect Answer')
                    .setDescription(`**"${userAnswer}"** is not the correct answer. Try again!`)
                    .addFields(
                        { name: '🎯 Current Clue', value: `**"${currentClue.text}"**`, inline: false },
                        { name: '💡 Hint', value: currentClue.hint ? `*"${currentClue.hint}"*` : '*No hint available for this clue*', inline: false },
                        { name: '⚠️ Attempts Remaining', value: `${attemptsLeft} out of 3`, inline: true },
                        { name: '📈 Progress', value: `${hunt.solvedClues.length}/${hunt.totalClues} clues solved`, inline: true }
                    )
                    .setFooter({ text: 'Think carefully about your next answer!' })
                    .setTimestamp();

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('think_again')
                            .setLabel('🤔 Think Again')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('get_hint')
                            .setLabel('💡 Need a Hint?')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(!currentClue.hint),
                        new ButtonBuilder()
                            .setCustomId('abandon_hunt')
                            .setLabel('🏃 Give Up')
                            .setStyle(ButtonStyle.Danger)
                    );

                await interaction.editReply({ embeds: [embed], components: [buttons] });
            }
        } catch (error) {
            console.error('Error in answer command:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Error')
                .setDescription('There was an error processing your answer. Please try again.')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    },

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    },

    getAverageTime(hunt) {
        if (hunt.solvedClues.length === 0) return 0;
        
        const totalTime = hunt.solvedClues.reduce((sum, clue) => sum + (clue.timeToSolve || 0), 0);
        return Math.floor(totalTime / hunt.solvedClues.length);
    }
};
