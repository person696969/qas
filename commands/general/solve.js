
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('solve')
        .setDescription('🎯 Submit your answer to the current treasure hunt riddle!')
        .addStringOption(option =>
            option.setName('answer')
                .setDescription('Your answer to the riddle')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of puzzle to solve')
                .addChoices(
                    { name: '🏴‍☠️ Treasure Hunt', value: 'hunt' },
                    { name: '🧩 Riddle Challenge', value: 'riddle' },
                    { name: '🗺️ Mystery Quest', value: 'quest' }
                )),
    
    async execute(interaction) {
        const answer = interaction.options.getString('answer').toLowerCase().trim();
        const puzzleType = interaction.options.getString('type') || 'hunt';
        const userId = interaction.user.id;
        
        try {
            if (puzzleType === 'hunt') {
                await this.solveHunt(interaction, answer, userId);
            } else if (puzzleType === 'riddle') {
                await this.solveRiddle(interaction, answer, userId);
            } else {
                await this.solveQuest(interaction, answer, userId);
            }
        } catch (error) {
            console.error('Solve command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your answer.',
                ephemeral: true
            });
        }
    },

    async solveHunt(interaction, answer, userId) {
        // Initialize activeHunts if it doesn't exist
        if (!interaction.client.activeHunts) {
            interaction.client.activeHunts = new Map();
        }

        // Check if user has an active hunt
        if (!interaction.client.activeHunts.has(userId)) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B35')
                .setTitle('❌ No Active Hunt')
                .setDescription('You don\'t have any active treasure hunts!')
                .addFields([
                    { name: '🗺️ Start a Hunt', value: 'Use `/hunt` to begin your adventure!', inline: false },
                    { name: '🎯 Available Hunts', value: '• Easy Hunts (100-120 coins)\n• Medium Hunts (240-280 coins)\n• Hard Hunts (460-540 coins)\n• Expert Hunts (1000-1500 coins)', inline: false }
                ])
                .setFooter({ text: 'Adventure awaits! Start your treasure hunt today!' });
                
            const huntButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('start_hunt')
                        .setLabel('🏴‍☠️ Start Hunt')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('hunt_tutorial')
                        .setLabel('📚 How to Hunt')
                        .setStyle(ButtonStyle.Secondary)
                );

            return interaction.reply({ embeds: [embed], components: [huntButton] });
        }
        
        const hunt = interaction.client.activeHunts.get(userId);
        hunt.attempts++;
        
        // Check if answer is correct
        const isCorrect = this.checkAnswerMatch(answer, hunt.answer);
        
        if (isCorrect) {
            await this.handleCorrectHunt(interaction, hunt, userId);
        } else {
            await this.handleIncorrectHunt(interaction, hunt, userId, answer);
        }
    },

    async solveRiddle(interaction, answer, userId) {
        // Check for active riddle (assumes riddle command has activeRiddles)
        const riddleCommand = interaction.client.commands.get('riddle');
        if (!riddleCommand || !riddleCommand.activeRiddles || !riddleCommand.activeRiddles.has(userId)) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B35')
                .setTitle('❌ No Active Riddle')
                .setDescription('You don\'t have any active riddles!')
                .addFields([
                    { name: '🧩 Start a Riddle', value: 'Use `/riddle` to begin!', inline: true },
                    { name: '🎯 Difficulty Levels', value: 'Easy • Medium • Hard • Expert', inline: true }
                ])
                .setFooter({ text: 'Challenge your mind with our riddles!' });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        await riddleCommand.checkAnswer(interaction, answer);
    },

    async solveQuest(interaction, answer, userId) {
        const embed = new EmbedBuilder()
            .setColor('#9C27B0')
            .setTitle('🗺️ Mystery Quest')
            .setDescription('Quest solving feature coming soon!')
            .addFields([
                { name: '🚧 Under Development', value: 'We\'re working on exciting quest adventures!', inline: false },
                { name: '🎮 Available Now', value: '• Treasure Hunts (`/hunt`)\n• Riddle Challenges (`/riddle`)', inline: false }
            ])
            .setFooter({ text: 'Stay tuned for more adventures!' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    checkAnswerMatch(userAnswer, correctAnswer) {
        const user = userAnswer.toLowerCase().trim();
        const correct = correctAnswer.toLowerCase().trim();
        
        // Exact match
        if (user === correct) return true;
        
        // Contains match
        if (user.includes(correct) || correct.includes(user)) return true;
        
        // Similar words (simple similarity check)
        if (user.length > 3 && correct.length > 3) {
            const similarity = this.calculateSimilarity(user, correct);
            return similarity > 0.8;
        }
        
        return false;
    },

    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    },

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    },

    async handleCorrectHunt(interaction, hunt, userId) {
        interaction.client.activeHunts.delete(userId);
        
        // Calculate rewards and bonuses
        let baseReward = hunt.reward;
        const timeBonus = this.calculateTimeBonus(hunt.startTime, hunt.difficulty);
        const attemptBonus = this.calculateAttemptBonus(hunt.attempts, hunt.maxAttempts);
        const totalReward = Math.floor(baseReward + timeBonus + attemptBonus);
        
        // Get user data and update
        const userData = await db.getPlayer(userId);
        const updatedData = {
            coins: userData.coins + totalReward,
            experience: userData.experience + Math.floor(totalReward * 0.1),
            statistics: {
                ...userData.statistics,
                huntsCompleted: (userData.statistics?.huntsCompleted || 0) + 1,
                totalEarned: (userData.statistics?.totalEarned || 0) + totalReward,
                lastHunt: Date.now()
            }
        };
        
        // Check for achievements
        const achievements = this.checkAchievements(updatedData.statistics);
        if (achievements.length > 0) {
            updatedData.achievements = [...(userData.achievements || []), ...achievements];
        }
        
        await db.updatePlayer(userId, updatedData);
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎉 Treasure Found!')
            .setDescription(`**Congratulations!** You solved the riddle correctly!`)
            .addFields([
                { name: '✅ Correct Answer', value: `"${hunt.answer}"`, inline: true },
                { name: '💰 Base Reward', value: `${baseReward} coins`, inline: true },
                { name: '⚡ Time Bonus', value: `+${timeBonus} coins`, inline: true },
                { name: '🎯 Attempt Bonus', value: `+${attemptBonus} coins`, inline: true },
                { name: '🏆 Total Earned', value: `**${totalReward} coins**`, inline: true },
                { name: '📊 Stats', value: `Attempts: ${hunt.attempts}/${hunt.maxAttempts}\nDifficulty: ${hunt.difficulty.toUpperCase()}`, inline: true },
                { name: '💎 New Balance', value: `${updatedData.coins} coins`, inline: true },
                { name: '⭐ Experience', value: `+${Math.floor(totalReward * 0.1)} XP`, inline: true },
                { name: '🏆 Hunts Completed', value: `${updatedData.statistics.huntsCompleted}`, inline: true }
            ])
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: 'Amazing work, treasure hunter!' })
            .setTimestamp();
            
        if (achievements.length > 0) {
            embed.addFields([
                { name: '🏅 New Achievements!', value: achievements.join('\n'), inline: false }
            ]);
        }
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('hunt_again')
                    .setLabel('🗺️ Hunt Again')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('profile_view')
                    .setLabel('📊 View Profile')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('shop_visit')
                    .setLabel('🛒 Visit Shop')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('leaderboard_check')
                    .setLabel('🏆 Leaderboard')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
    },

    async handleIncorrectHunt(interaction, hunt, userId, answer) {
        const attemptsLeft = hunt.maxAttempts - hunt.attempts;
        
        if (attemptsLeft <= 0) {
            // Hunt failed
            interaction.client.activeHunts.delete(userId);
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('💀 Hunt Failed!')
                .setDescription('You\'ve run out of attempts! The treasure remains hidden...')
                .addFields([
                    { name: '❌ Your Answer', value: `"${answer}"`, inline: true },
                    { name: '✅ Correct Answer', value: `"${hunt.answer}"`, inline: true },
                    { name: '🎯 Attempts Used', value: `${hunt.attempts}/${hunt.maxAttempts}`, inline: true },
                    { name: '💡 Learning', value: 'Study the answer to improve next time!', inline: false },
                    { name: '🎯 Difficulty', value: hunt.difficulty.toUpperCase(), inline: true },
                    { name: '💰 Missed Reward', value: `${hunt.reward} coins`, inline: true }
                ])
                .setFooter({ text: 'Don\'t give up! Every failure teaches us something.' })
                .setTimestamp();
                
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('hunt_again')
                        .setLabel('🔄 Try Again')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('hunt_easier')
                        .setLabel('🟢 Easier Hunt')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('hint_community')
                        .setLabel('💡 Community Tips')
                        .setStyle(ButtonStyle.Secondary)
                );
                
            await interaction.reply({ embeds: [embed], components: [buttons] });
        } else {
            // Wrong answer but attempts remaining
            interaction.client.activeHunts.set(userId, hunt);
            
            // Provide encouraging hints based on closeness
            const similarity = this.calculateSimilarity(answer, hunt.answer);
            let encouragement = 'Keep thinking...';
            
            if (similarity > 0.5) {
                encouragement = 'You\'re getting closer!';
            } else if (similarity > 0.3) {
                encouragement = 'You\'re on the right track!';
            }
            
            const embed = new EmbedBuilder()
                .setColor('#FF9800')
                .setTitle('❌ Incorrect Answer')
                .setDescription(`"${answer}" is not quite right. ${encouragement}`)
                .addFields([
                    { name: '🎯 Attempts Left', value: `${attemptsLeft}`, inline: true },
                    { name: '💰 Potential Reward', value: `${hunt.reward} coins`, inline: true },
                    { name: '⏱️ Time Elapsed', value: `${Math.floor((Date.now() - hunt.startTime) / 1000)}s`, inline: true },
                    { name: '🧩 Riddle', value: `*"${hunt.question}"*`, inline: false },
                    { name: '💡 Tip', value: 'Think about the key words in the riddle!', inline: false }
                ])
                .setFooter({ text: 'Use /hint for a clue or keep trying!' })
                .setTimestamp();
                
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('hunt_hint')
                        .setLabel('💡 Get Hint (50 coins)')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('hunt_think')
                        .setLabel('🤔 Think More')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('hunt_abandon')
                        .setLabel('🚪 Give Up')
                        .setStyle(ButtonStyle.Danger)
                );
                
            await interaction.reply({ embeds: [embed], components: [buttons] });
        }
    },

    calculateTimeBonus(startTime, difficulty) {
        const timeElapsed = (Date.now() - startTime) / 1000;
        const timeThresholds = {
            easy: 60,    // 1 minute
            medium: 120, // 2 minutes
            hard: 180,   // 3 minutes
            expert: 300  // 5 minutes
        };
        
        const threshold = timeThresholds[difficulty] || 120;
        if (timeElapsed < threshold) {
            return Math.floor((threshold - timeElapsed) * 2);
        }
        return 0;
    },

    calculateAttemptBonus(attempts, maxAttempts) {
        if (attempts === 1) return 50; // First try bonus
        if (attempts === 2) return 25; // Second try bonus
        if (attempts === 3) return 10; // Third try bonus
        return 0;
    },

    checkAchievements(stats) {
        const achievements = [];
        
        if (stats.huntsCompleted === 1) achievements.push('🏆 First Hunt Complete');
        if (stats.huntsCompleted === 10) achievements.push('🎯 Hunt Master');
        if (stats.huntsCompleted === 50) achievements.push('🏴‍☠️ Treasure Legend');
        if (stats.huntsCompleted === 100) achievements.push('👑 Hunt Champion');
        if (stats.totalEarned >= 10000) achievements.push('💰 Wealthy Adventurer');
        if (stats.totalEarned >= 50000) achievements.push('💎 Treasure Tycoon');
        
        return achievements;
    }
};
