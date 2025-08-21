
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('solve')
        .setDescription('💡 Solve riddles, hunts, challenges, and puzzles!')
        .addStringOption(option =>
            option.setName('answer')
                .setDescription('Your answer to the current challenge')
                .setRequired(true)
                .setMaxLength(100))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Specify what type of challenge to solve')
                .setRequired(false)
                .addChoices(
                    { name: '🗺️ Treasure Hunt', value: 'hunt' },
                    { name: '🧩 Riddle Challenge', value: 'riddle' },
                    { name: '🎯 Active Challenge', value: 'challenge' },
                    { name: '🎓 Trivia Question', value: 'trivia' }
                )),

    async execute(interaction) {
        const userId = interaction.user.id;
        const answer = interaction.options.getString('answer').toLowerCase().trim();
        const solveType = interaction.options.getString('type');

        // Get player data
        const player = await db.getPlayer(userId);
        if (!player) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Profile Required')
                .setDescription('You need a game profile to solve challenges!')
                .setFooter({ text: 'Use /daily to create your profile!' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Auto-detect challenge type if not specified
        if (!solveType) {
            return this.autoSolve(interaction, userId, answer, player);
        }

        // Solve specific challenge type
        switch (solveType) {
            case 'hunt':
                return this.solveTreasureHunt(interaction, userId, answer, player);
            case 'riddle':
                return this.solveRiddleChallenge(interaction, userId, answer);
            case 'challenge':
                return this.solveActiveChallenge(interaction, userId, answer);
            case 'trivia':
                return this.solveTriviaChallenge(interaction, userId, answer);
            default:
                return this.autoSolve(interaction, userId, answer, player);
        }
    },

    async autoSolve(interaction, userId, answer, player) {
        // Priority order: hunt -> riddle challenges -> trivia challenges -> general riddles
        
        // Check for active treasure hunt
        if (interaction.client.activeHunts && interaction.client.activeHunts.has(userId)) {
            return this.solveTreasureHunt(interaction, userId, answer, player);
        }

        // Check for riddle challenges
        if (interaction.client.riddleChallenges) {
            for (const [challengeId, challenge] of interaction.client.riddleChallenges) {
                if (challenge.players.includes(userId)) {
                    return this.solveRiddleChallenge(interaction, userId, answer, challengeId);
                }
            }
        }

        // Check for trivia challenges
        if (interaction.client.triviaChallenges) {
            for (const [challengeId, challenge] of interaction.client.triviaChallenges) {
                if (challenge.players.includes(userId)) {
                    return this.solveTriviaChallenge(interaction, userId, answer, challengeId);
                }
            }
        }

        // No active challenges found
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.warning)
            .setTitle('🤷‍♂️ No Active Challenges')
            .setDescription('You don\'t have any active challenges to solve!')
            .addFields(
                { name: '🗺️ Start a Hunt', value: 'Use `/hunt` to begin treasure hunting', inline: true },
                { name: '🧩 Try Riddles', value: 'Use `/riddle` for brain teasers', inline: true },
                { name: '🎯 Challenge Others', value: 'Use `/challenge @user` for competitions', inline: true }
            )
            .setFooter({ text: 'Start an activity first, then use /solve!' });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async solveTreasureHunt(interaction, userId, answer, player) {
        const hunt = interaction.client.activeHunts.get(userId);
        
        if (!hunt) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ No Active Hunt')
                .setDescription('You don\'t have an active treasure hunt!')
                .setFooter({ text: 'Use /hunt to start a new adventure!' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check if hunt has expired
        if (Date.now() > hunt.expires) {
            interaction.client.activeHunts.delete(userId);
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('⏰ Hunt Expired')
                .setDescription('Your treasure hunt has expired!')
                .setFooter({ text: 'Use /hunt to start a new adventure!' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        hunt.attempts++;

        // Check if answer is correct
        if (answer === hunt.currentAnswer) {
            return this.handleCorrectHuntAnswer(interaction, userId, hunt, player);
        } else {
            return this.handleIncorrectHuntAnswer(interaction, userId, hunt, answer);
        }
    },

    async handleCorrectHuntAnswer(interaction, userId, hunt, player) {
        hunt.cluesFound++;
        
        // Import hunt difficulties and themes
        const { HUNT_DIFFICULTIES, HUNT_THEMES } = require('./hunt.js');
        const difficulty = HUNT_DIFFICULTIES[hunt.difficulty];
        const theme = HUNT_THEMES[hunt.theme];

        if (hunt.cluesFound >= hunt.totalClues) {
            // Hunt completed!
            interaction.client.activeHunts.delete(userId);
            
            const reward = Math.floor(difficulty.baseReward * theme.multiplier);
            const timeBonus = Math.max(0, Math.floor((hunt.expires - Date.now()) / 60000) * 10); // 10 coins per minute left
            const totalReward = reward + timeBonus;
            
            // Award rewards
            player.coins += totalReward;
            player.experience = (player.experience || 0) + difficulty.xpReward;
            
            // Update hunt stats
            if (!player.huntStats) {
                player.huntStats = { completed: 0, totalRewards: 0, fastestTime: null };
            }
            player.huntStats.completed++;
            player.huntStats.totalRewards += totalReward;
            
            const huntTime = Date.now() - hunt.startTime;
            if (!player.huntStats.fastestTime || huntTime < player.huntStats.fastestTime) {
                player.huntStats.fastestTime = huntTime;
            }

            await db.updatePlayer(userId, player);

            const embed = new EmbedBuilder()
                .setColor('#00FF7F')
                .setTitle('🏆 TREASURE HUNT COMPLETED!')
                .setDescription('**🎉 Congratulations! You\'ve found all the treasures! 🎉**')
                .addFields(
                    { name: '💎 Hunt Type', value: `${theme.name} (${difficulty.name})`, inline: true },
                    { name: '🎯 Clues Solved', value: `${hunt.cluesFound}/${hunt.totalClues}`, inline: true },
                    { name: '⏱️ Time Taken', value: this.formatTime(huntTime), inline: true },
                    { name: '💰 Base Reward', value: `${reward} coins`, inline: true },
                    { name: '⚡ Time Bonus', value: `${timeBonus} coins`, inline: true },
                    { name: '🏆 Total Reward', value: `${totalReward} coins`, inline: true },
                    { name: '✨ Experience Gained', value: `${difficulty.xpReward} XP`, inline: true },
                    { name: '💳 New Balance', value: `${player.coins} coins`, inline: true },
                    { name: '📊 Hunt Stats', value: `Completed: ${player.huntStats.completed}\nTotal Earned: ${player.huntStats.totalRewards}`, inline: true }
                )
                .setFooter({ text: 'Well done, treasure hunter! Ready for another adventure?' })
                .setTimestamp();

            const celebrationButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('hunt_new_adventure')
                        .setLabel('🗺️ New Adventure')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('hunt_share_victory')
                        .setLabel('📤 Share Victory')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('hunt_view_stats')
                        .setLabel('📊 View Stats')
                        .setStyle(ButtonStyle.Secondary)
                );

            return interaction.reply({ embeds: [embed], components: [celebrationButtons] });
        } else {
            // Move to next clue
            const nextClue = hunt.remainingClues.shift();
            hunt.currentClue = nextClue.question;
            hunt.currentAnswer = nextClue.answer.toLowerCase();
            hunt.currentLocation = theme.locations[hunt.cluesFound] || 'Unknown Location';
            hunt.attempts = 0;

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('✅ Correct! Moving Forward...')
                .setDescription('**Excellent work! You\'ve found another piece of the treasure!**')
                .addFields(
                    { name: '🎯 Progress', value: `${hunt.cluesFound}/${hunt.totalClues} clues found`, inline: true },
                    { name: '📍 New Location', value: hunt.currentLocation, inline: true },
                    { name: '⏰ Time Remaining', value: this.formatTime(hunt.expires - Date.now()), inline: true },
                    { name: '🧩 Next Clue', value: `*"${hunt.currentClue}"*`, inline: false },
                    { name: '💡 Hints Left', value: `${hunt.hintsRemaining}`, inline: true },
                    { name: '🎪 Progress Bar', value: this.createProgressBar(hunt.cluesFound, hunt.totalClues), inline: true }
                )
                .setFooter({ text: 'Keep going! The treasure awaits!' });

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('hunt_hint')
                        .setLabel(`💡 Get Hint (${hunt.hintsRemaining} left)`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(hunt.hintsRemaining === 0),
                    new ButtonBuilder()
                        .setCustomId('hunt_skip_clue')
                        .setLabel('⏭️ Skip Clue')
                        .setStyle(ButtonStyle.Secondary)
                );

            return interaction.reply({ embeds: [embed], components: [buttons] });
        }
    },

    async handleIncorrectHuntAnswer(interaction, userId, hunt, answer) {
        const attemptsLeft = hunt.maxAttempts - hunt.attempts;
        
        if (attemptsLeft <= 0) {
            // Too many wrong attempts - end hunt
            interaction.client.activeHunts.delete(userId);
            
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('💀 Hunt Failed')
                .setDescription('**Too many incorrect attempts! The treasure has slipped away...**')
                .addFields(
                    { name: '💔 Your Answer', value: `"${answer}"`, inline: true },
                    { name: '💡 Correct Answer', value: `"${hunt.currentAnswer}"`, inline: true },
                    { name: '🎯 Progress Lost', value: `${hunt.cluesFound}/${hunt.totalClues} clues`, inline: true }
                )
                .setFooter({ text: 'Don\'t give up! Try a new hunt when you\'re ready.' });

            const retryButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('hunt_retry')
                        .setLabel('🔄 Try Again')
                        .setStyle(ButtonStyle.Primary)
                );

            return interaction.reply({ embeds: [embed], components: [retryButton] });
        }

        // Show incorrect answer with encouragement
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('❌ Not Quite Right')
            .setDescription('**That\'s not the answer, but don\'t give up!**')
            .addFields(
                { name: '🔍 Your Answer', value: `"${answer}"`, inline: true },
                { name: '🎯 Attempts Left', value: `${attemptsLeft}`, inline: true },
                { name: '💡 Hints Available', value: `${hunt.hintsRemaining}`, inline: true },
                { name: '🧩 Current Clue', value: `*"${hunt.currentClue}"*`, inline: false },
                { name: '💭 Hint', value: attemptsLeft <= 2 ? 
                    'Think carefully about each word in the clue...' : 
                    'Take your time and consider all possibilities!', inline: false }
            )
            .setFooter({ text: 'Try again with /solve <answer>' });

        const helpButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('hunt_hint')
                    .setLabel(`💡 Get Hint (${hunt.hintsRemaining} left)`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(hunt.hintsRemaining === 0),
                new ButtonBuilder()
                    .setCustomId('hunt_give_up')
                    .setLabel('🏳️ Give Up')
                    .setStyle(ButtonStyle.Danger)
            );

        return interaction.reply({ embeds: [embed], components: [helpButtons] });
    },

    async solveRiddleChallenge(interaction, userId, answer, challengeId) {
        if (!challengeId) {
            // Find the challenge
            for (const [id, challenge] of interaction.client.riddleChallenges) {
                if (challenge.players.includes(userId)) {
                    challengeId = id;
                    break;
                }
            }
        }

        const challenge = interaction.client.riddleChallenges.get(challengeId);
        if (!challenge) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ No Active Riddle')
                .setDescription('No active riddle challenge found!');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (answer === challenge.answer) {
            // Correct answer - determine winner
            return this.handleRiddleWin(interaction, userId, challenge, challengeId);
        } else {
            // Incorrect answer
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🧩 Not Quite Right')
                .setDescription('That\'s not the correct answer to the riddle!')
                .addFields(
                    { name: '🔍 Your Answer', value: `"${answer}"`, inline: true },
                    { name: '💭 Hint', value: 'Think about the literal and metaphorical meanings...', inline: true }
                )
                .setFooter({ text: 'Keep trying! The other player might still be thinking.' });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    async handleRiddleWin(interaction, userId, challenge, challengeId) {
        const winner = interaction.user;
        const opponent = await interaction.client.users.fetch(
            challenge.players.find(id => id !== userId)
        );

        // Clean up challenge
        interaction.client.riddleChallenges.delete(challengeId);

        // Award prize
        const winnerData = await db.getPlayer(userId);
        winnerData.coins += challenge.prize;
        await db.updatePlayer(userId, winnerData);

        // Handle wager if applicable
        if (challenge.wager > 0) {
            const loserData = await db.getPlayer(opponent.id);
            loserData.coins -= challenge.wager;
            await db.updatePlayer(opponent.id, loserData);
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF7F')
            .setTitle('🎉 Riddle Challenge Winner!')
            .setDescription(`**${winner.username}** solved the riddle first!`)
            .addFields(
                { name: '🏆 Winner', value: winner.username, inline: true },
                { name: '💰 Prize Won', value: `${challenge.prize} coins`, inline: true },
                { name: '⏱️ Time Taken', value: this.formatTime(Date.now() - challenge.startTime), inline: true },
                { name: '💡 Correct Answer', value: `"${challenge.answer}"`, inline: false },
                { name: '🎯 Challenge Details', value: challenge.wager > 0 ? `Wager: ${challenge.wager} coins each` : 'No wager', inline: false }
            )
            .setThumbnail(winner.displayAvatarURL());

        return interaction.reply({ embeds: [embed] });
    },

    async solveTriviaChallenge(interaction, userId, answer, challengeId) {
        if (!challengeId) {
            // Find the challenge
            for (const [id, challenge] of interaction.client.triviaChallenges) {
                if (challenge.players.includes(userId)) {
                    challengeId = id;
                    break;
                }
            }
        }

        const challenge = interaction.client.triviaChallenges.get(challengeId);
        if (!challenge) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ No Active Trivia')
                .setDescription('No active trivia challenge found!');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check for partial matches in trivia (more lenient)
        const correctAnswers = challenge.answer.split(' ');
        const userAnswers = answer.split(' ');
        const isCorrect = this.checkTriviaAnswer(answer, challenge.answer);

        if (isCorrect) {
            return this.handleTriviaWin(interaction, userId, challenge, challengeId);
        } else {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('📚 Not Quite Right')
                .setDescription('That\'s not the correct answer!')
                .addFields(
                    { name: '🔍 Your Answer', value: `"${answer}"`, inline: true },
                    { name: '💭 Hint', value: 'Check your spelling and try to be more specific...', inline: true }
                )
                .setFooter({ text: 'Keep trying! Knowledge is power.' });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    async handleTriviaWin(interaction, userId, challenge, challengeId) {
        const winner = interaction.user;
        const opponent = await interaction.client.users.fetch(
            challenge.players.find(id => id !== userId)
        );

        // Clean up challenge
        interaction.client.triviaChallenges.delete(challengeId);

        // Award prize
        const winnerData = await db.getPlayer(userId);
        winnerData.coins += challenge.prize;
        await db.updatePlayer(userId, winnerData);

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🎓 Trivia Champion!')
            .setDescription(`**${winner.username}** knew the answer!`)
            .addFields(
                { name: '🏆 Winner', value: winner.username, inline: true },
                { name: '💰 Prize Won', value: `${challenge.prize} coins`, inline: true },
                { name: '⏱️ Response Time', value: this.formatTime(Date.now() - challenge.startTime), inline: true },
                { name: '💡 Correct Answer', value: `"${challenge.answer}"`, inline: false }
            )
            .setThumbnail(winner.displayAvatarURL());

        return interaction.reply({ embeds: [embed] });
    },

    checkTriviaAnswer(userAnswer, correctAnswer) {
        // Normalize both answers
        const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedUser = normalize(userAnswer);
        const normalizedCorrect = normalize(correctAnswer);

        // Exact match
        if (normalizedUser === normalizedCorrect) return true;

        // Check if user answer contains all important words
        const correctWords = normalizedCorrect.split(' ').filter(word => word.length > 2);
        const userWords = normalizedUser.split(' ');

        return correctWords.every(word => 
            userWords.some(userWord => userWord.includes(word) || word.includes(userWord))
        );
    },

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
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

    createProgressBar(current, total) {
        const percentage = current / total;
        const filledBars = Math.floor(percentage * 10);
        const emptyBars = 10 - filledBars;
        
        return '🟩'.repeat(filledBars) + '⬜'.repeat(emptyBars) + ` ${current}/${total}`;
    }
};
