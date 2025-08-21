
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');
const { handleError } = require('../../utils/errorHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('solve')
        .setDescription('🧩 Solve puzzles, riddles, and challenges for rewards!')
        .addStringOption(option =>
            option.setName('answer')
                .setDescription('Your answer to the current puzzle')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of puzzle to solve')
                .setRequired(false)
                .addChoices(
                    { name: '🧩 Logic Puzzles', value: 'logic' },
                    { name: '🔢 Math Problems', value: 'math' },
                    { name: '📚 Word Riddles', value: 'word' },
                    { name: '🎯 Pattern Recognition', value: 'pattern' },
                    { name: '🧠 Brain Teasers', value: 'brain' }
                )),

    async execute(interaction) {
        try {
            const answer = interaction.options?.getString('answer');
            const puzzleType = interaction.options?.getString('type');

            if (answer) {
                await this.submitAnswer(interaction, answer);
            } else if (puzzleType) {
                await this.startPuzzle(interaction, puzzleType);
            } else {
                await this.showPuzzleHub(interaction);
            }
        } catch (error) {
            await handleError(interaction, error);
        }
    },

    async showPuzzleHub(interaction) {
        const userData = await db.getPlayer(interaction.user.id) || { 
            coins: 0, 
            puzzleStats: { solved: 0, streak: 0, lastSolved: 0 },
            activePuzzle: null 
        };

        const puzzleStats = userData.puzzleStats || { solved: 0, streak: 0, lastSolved: 0 };
        const activePuzzle = userData.activePuzzle;

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.puzzle || '#9B59B6')
            .setTitle('🧩 Puzzle & Riddle Hub')
            .setDescription('**Challenge your mind and earn rewards!**\n*Test your wit against various puzzles and brain teasers.*')
            .setThumbnail('https://i.imgur.com/puzzle.png')
            .addFields([
                {
                    name: '🧠 Your Puzzle Stats',
                    value: `**Puzzles Solved:** ${puzzleStats.solved}\n**Current Streak:** ${puzzleStats.streak}\n**Best Streak:** ${puzzleStats.bestStreak || 0}`,
                    inline: true
                },
                {
                    name: '💰 Rewards Available',
                    value: `**Base Reward:** 50-200 coins\n**Streak Bonus:** +${puzzleStats.streak * 10} coins\n**Difficulty Bonus:** Up to +100 coins`,
                    inline: true
                },
                {
                    name: '🎯 Challenge Status',
                    value: activePuzzle ? 
                        `**Active:** ${activePuzzle.type} puzzle\n**Difficulty:** ${activePuzzle.difficulty}\n**Attempts:** ${activePuzzle.attempts}/3` :
                        '**Status:** No active puzzle\n**Ready:** Choose a category below!',
                    inline: true
                }
            ]);

        if (activePuzzle) {
            embed.addFields([{
                name: '🧩 Current Puzzle',
                value: `**Type:** ${activePuzzle.type}\n**Question:** ${activePuzzle.question}\n**Hint:** ${activePuzzle.hint || 'No hint available'}`,
                inline: false
            }]);
        }

        // Puzzle type selection
        const puzzleSelect = new StringSelectMenuBuilder()
            .setCustomId('solve_puzzle_select')
            .setPlaceholder('🧩 Choose a puzzle category...')
            .addOptions([
                { label: '🧩 Logic Puzzles', description: 'Test your reasoning skills', value: 'logic', emoji: '🧩' },
                { label: '🔢 Math Problems', description: 'Number-based challenges', value: 'math', emoji: '🔢' },
                { label: '📚 Word Riddles', description: 'Language and wordplay', value: 'word', emoji: '📚' },
                { label: '🎯 Pattern Recognition', description: 'Find the hidden patterns', value: 'pattern', emoji: '🎯' },
                { label: '🧠 Brain Teasers', description: 'Creative thinking required', value: 'brain', emoji: '🧠' },
                { label: '🎲 Random Puzzle', description: 'Surprise me!', value: 'random', emoji: '🎲' }
            ]);

        // Action buttons
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('solve_daily_challenge')
                    .setLabel('🏆 Daily Challenge')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('solve_hint')
                    .setLabel('💡 Get Hint')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!activePuzzle),
                new ButtonBuilder()
                    .setCustomId('solve_skip')
                    .setLabel('⏭️ Skip Puzzle')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!activePuzzle),
                new ButtonBuilder()
                    .setCustomId('solve_leaderboard')
                    .setLabel('🏅 Leaderboard')
                    .setStyle(ButtonStyle.Secondary)
            );

        const components = [
            new ActionRowBuilder().addComponents(puzzleSelect),
            buttons
        ];

        if (activePuzzle) {
            // Add answer input modal button
            const answerButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('solve_answer_modal')
                        .setLabel('✍️ Submit Answer')
                        .setStyle(ButtonStyle.Success)
                );
            components.push(answerButton);
        }

        await interaction.reply({
            embeds: [embed],
            components: components
        });
    },

    async startPuzzle(interaction, puzzleType) {
        const userData = await db.getPlayer(interaction.user.id) || { 
            coins: 0, 
            puzzleStats: { solved: 0, streak: 0, lastSolved: 0 }
        };

        // Check if user already has an active puzzle
        if (userData.activePuzzle) {
            return await interaction.reply({
                content: '❌ You already have an active puzzle! Use `/solve answer:<your_answer>` to submit your answer or skip it first.',
                ephemeral: true
            });
        }

        const puzzle = this.generatePuzzle(puzzleType);
        
        // Save active puzzle
        userData.activePuzzle = {
            ...puzzle,
            startTime: Date.now(),
            attempts: 0
        };

        await db.setPlayer(interaction.user.id, userData);

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.puzzle || '#9B59B6')
            .setTitle(`${this.getPuzzleIcon(puzzle.type)} ${puzzle.type.charAt(0).toUpperCase() + puzzle.type.slice(1)} Puzzle`)
            .setDescription(`**Difficulty:** ${puzzle.difficulty} | **Reward:** ${puzzle.reward} coins`)
            .addFields([
                {
                    name: '🧩 Challenge',
                    value: puzzle.question,
                    inline: false
                },
                {
                    name: '📋 Instructions',
                    value: puzzle.instructions || 'Provide your answer using `/solve answer:<your_answer>`',
                    inline: false
                },
                {
                    name: '⏱️ Time Limit',
                    value: `${puzzle.timeLimit} minutes`,
                    inline: true
                },
                {
                    name: '🎯 Attempts',
                    value: `3 attempts allowed`,
                    inline: true
                },
                {
                    name: '💡 Hint Cost',
                    value: `25 coins`,
                    inline: true
                }
            ])
            .setFooter({ text: 'Good luck! Use your reasoning skills and think carefully.' })
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('solve_answer_modal')
                    .setLabel('✍️ Submit Answer')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('solve_hint')
                    .setLabel('💡 Buy Hint (25 coins)')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('solve_skip')
                    .setLabel('⏭️ Skip Puzzle')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('solve_hub')
                    .setLabel('🏠 Puzzle Hub')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [buttons]
        });
    },

    async submitAnswer(interaction, answer) {
        const userData = await db.getPlayer(interaction.user.id);
        if (!userData || !userData.activePuzzle) {
            return await interaction.reply({
                content: '❌ You don\'t have an active puzzle! Use `/solve` to start one.',
                ephemeral: true
            });
        }

        const puzzle = userData.activePuzzle;
        puzzle.attempts++;

        const isCorrect = this.checkAnswer(puzzle, answer);

        if (isCorrect) {
            // Correct answer!
            const timeTaken = Date.now() - puzzle.startTime;
            const timeBonus = this.calculateTimeBonus(timeTaken, puzzle.timeLimit);
            const streakBonus = (userData.puzzleStats?.streak || 0) * 10;
            const totalReward = puzzle.reward + timeBonus + streakBonus;

            // Update user data
            userData.coins += totalReward;
            userData.puzzleStats = userData.puzzleStats || { solved: 0, streak: 0, lastSolved: 0 };
            userData.puzzleStats.solved++;
            userData.puzzleStats.streak++;
            userData.puzzleStats.lastSolved = Date.now();
            userData.puzzleStats.bestStreak = Math.max(userData.puzzleStats.bestStreak || 0, userData.puzzleStats.streak);
            
            delete userData.activePuzzle;

            await db.setPlayer(interaction.user.id, userData);

            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.success || '#00FF00')
                .setTitle('🎉 Puzzle Solved!')
                .setDescription(`**Congratulations!** You solved the ${puzzle.type} puzzle correctly!`)
                .addFields([
                    {
                        name: '✅ Your Answer',
                        value: `**"${answer}"**`,
                        inline: true
                    },
                    {
                        name: '🎯 Solution',
                        value: `**"${puzzle.answer}"**`,
                        inline: true
                    },
                    {
                        name: '💰 Rewards Earned',
                        value: `Base Reward: ${puzzle.reward} coins\n` +
                               `Time Bonus: ${timeBonus} coins\n` +
                               `Streak Bonus: ${streakBonus} coins\n` +
                               `**Total: ${totalReward} coins**`,
                        inline: false
                    },
                    {
                        name: '📊 Statistics',
                        value: `**Attempts:** ${puzzle.attempts}/3\n**Time:** ${this.formatTime(timeTaken)}\n**Streak:** ${userData.puzzleStats.streak}`,
                        inline: true
                    },
                    {
                        name: '💎 New Balance',
                        value: `${userData.coins.toLocaleString()} coins`,
                        inline: true
                    }
                ])
                .setFooter({ text: puzzle.explanation || 'Well done on solving this puzzle!' });

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('solve_another')
                        .setLabel('🧩 Solve Another')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('solve_daily_challenge')
                        .setLabel('🏆 Daily Challenge')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('solve_leaderboard')
                        .setLabel('🏅 View Leaderboard')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({
                embeds: [embed],
                components: [buttons]
            });

        } else {
            // Wrong answer
            if (puzzle.attempts >= 3) {
                // Out of attempts
                userData.puzzleStats = userData.puzzleStats || { solved: 0, streak: 0, lastSolved: 0 };
                userData.puzzleStats.streak = 0; // Reset streak
                delete userData.activePuzzle;

                await db.setPlayer(interaction.user.id, userData);

                const embed = new EmbedBuilder()
                    .setColor(config.embedColors?.error || '#FF0000')
                    .setTitle('❌ Puzzle Failed')
                    .setDescription('You\'ve used all your attempts!')
                    .addFields([
                        {
                            name: '💭 Your Answer',
                            value: `"${answer}"`,
                            inline: true
                        },
                        {
                            name: '✅ Correct Answer',
                            value: `"${puzzle.answer}"`,
                            inline: true
                        },
                        {
                            name: '📚 Explanation',
                            value: puzzle.explanation || 'Better luck next time!',
                            inline: false
                        }
                    ])
                    .setFooter({ text: 'Don\'t give up! Try another puzzle to rebuild your streak.' });

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('solve_try_again')
                            .setLabel('🔄 Try Again')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('solve_hub')
                            .setLabel('🏠 Puzzle Hub')
                            .setStyle(ButtonStyle.Secondary)
                    );

                await interaction.reply({
                    embeds: [embed],
                    components: [buttons]
                });

            } else {
                // Still have attempts left
                await db.setPlayer(interaction.user.id, userData);

                const embed = new EmbedBuilder()
                    .setColor(config.embedColors?.warning || '#FFA500')
                    .setTitle('❌ Incorrect Answer')
                    .setDescription('That\'s not quite right. Try again!')
                    .addFields([
                        {
                            name: '💭 Your Answer',
                            value: `"${answer}"`,
                            inline: true
                        },
                        {
                            name: '🎯 Attempts Remaining',
                            value: `${3 - puzzle.attempts}`,
                            inline: true
                        },
                        {
                            name: '💡 Hint',
                            value: puzzle.hint || 'Think about it differently...',
                            inline: false
                        }
                    ])
                    .setFooter({ text: 'Keep trying! You can do this!' });

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('solve_answer_modal')
                            .setLabel('✍️ Try Again')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('solve_hint')
                            .setLabel('💡 Buy Better Hint')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('solve_skip')
                            .setLabel('⏭️ Skip Puzzle')
                            .setStyle(ButtonStyle.Danger)
                    );

                await interaction.reply({
                    embeds: [embed],
                    components: [buttons]
                });
            }
        }
    },

    // Helper methods
    generatePuzzle(type) {
        const puzzles = {
            logic: [
                {
                    question: "If all roses are flowers and some flowers fade quickly, can we conclude that some roses fade quickly?",
                    answer: "no",
                    hint: "Think about logical validity vs truth",
                    explanation: "This is invalid reasoning - we cannot conclude this from the given premises.",
                    difficulty: "Medium",
                    reward: 150
                }
            ],
            math: [
                {
                    question: "What is the next number in the sequence: 2, 6, 12, 20, 30, ?",
                    answer: "42",
                    hint: "Look at the differences between consecutive numbers",
                    explanation: "The pattern is n(n+1): 1×2=2, 2×3=6, 3×4=12, 4×5=20, 5×6=30, 6×7=42",
                    difficulty: "Medium",
                    reward: 120
                }
            ],
            word: [
                {
                    question: "I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?",
                    answer: "echo",
                    hint: "It's a sound phenomenon",
                    explanation: "An echo speaks (repeats sounds) without a mouth and hears without ears.",
                    difficulty: "Easy",
                    reward: 100
                }
            ],
            pattern: [
                {
                    question: "Complete the pattern: 🔵🔴🔵🔴🔴🔵🔴🔴🔴🔵?",
                    answer: "🔴",
                    hint: "Count how many of each color appear in groups",
                    explanation: "The pattern shows increasing groups: 1 red, 2 red, 3 red, so next is 4 red.",
                    difficulty: "Hard",
                    reward: 180
                }
            ],
            brain: [
                {
                    question: "You have two ropes, each burns for exactly 60 minutes, but not at a uniform rate. How can you measure 45 minutes?",
                    answer: "light both ends of one rope and one end of the other",
                    hint: "Think about burning from multiple points",
                    explanation: "Light both ends of rope 1 (burns in 30 min) and one end of rope 2. When rope 1 is done, light the other end of rope 2.",
                    difficulty: "Hard",
                    reward: 200
                }
            ]
        };

        const categoryPuzzles = puzzles[type] || puzzles.logic;
        const puzzle = categoryPuzzles[Math.floor(Math.random() * categoryPuzzles.length)];
        
        return {
            ...puzzle,
            type: type,
            timeLimit: 10, // 10 minutes
            id: Date.now().toString()
        };
    },

    checkAnswer(puzzle, answer) {
        const correctAnswer = puzzle.answer.toLowerCase().trim();
        const userAnswer = answer.toLowerCase().trim();
        
        // Allow for some flexibility in answers
        return correctAnswer === userAnswer || 
               correctAnswer.includes(userAnswer) || 
               userAnswer.includes(correctAnswer);
    },

    calculateTimeBonus(timeTaken, timeLimit) {
        const timeInMinutes = timeTaken / (1000 * 60);
        const remaining = Math.max(0, timeLimit - timeInMinutes);
        return Math.floor(remaining * 5); // 5 coins per minute remaining
    },

    formatTime(milliseconds) {
        const minutes = Math.floor(milliseconds / (1000 * 60));
        const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
        return `${minutes}m ${seconds}s`;
    },

    getPuzzleIcon(type) {
        const icons = {
            logic: '🧩',
            math: '🔢',
            word: '📚',
            pattern: '🎯',
            brain: '🧠'
        };
        return icons[type] || '🧩';
    }
};
