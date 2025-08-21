
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../../database.js');
const config = require('../../config.js');

const riddles = [
    {
        question: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
        answer: "map",
        hint: "You use me to find your way around the world!",
        difficulty: "easy",
        reward: 50
    },
    {
        question: "The more you take, the more you leave behind. What am I?",
        answer: "footsteps",
        hint: "Think about what happens when you walk!",
        difficulty: "easy", 
        reward: 50
    },
    {
        question: "I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?",
        answer: "echo",
        hint: "You might hear me in mountains or caves!",
        difficulty: "medium",
        reward: 100
    },
    {
        question: "I am not alive, but I grow. I don't have lungs, but I need air. I don't have a mouth, but water kills me. What am I?",
        answer: "fire",
        hint: "I'm hot and bright, and I dance without music!",
        difficulty: "medium",
        reward: 100
    },
    {
        question: "I have keys but no locks. I have space but no room. You can enter, but can't go outside. What am I?",
        answer: "keyboard",
        hint: "You're probably looking at one right now!",
        difficulty: "hard",
        reward: 200
    },
    {
        question: "I am taken from a mine and shut in a wooden case, from which I am never released. What am I?",
        answer: "pencil",
        hint: "I help you write and draw!",
        difficulty: "hard",
        reward: 200
    },
    {
        question: "I disappear every time you say my name. What am I?",
        answer: "silence",
        hint: "I'm the absence of sound!",
        difficulty: "expert",
        reward: 300
    },
    {
        question: "I am the beginning of everything, the end of everywhere. I'm the beginning of eternity, the end of time and space. What am I?",
        answer: "e",
        hint: "Look at the first letter of certain words!",
        difficulty: "expert",
        reward: 400
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('riddle')
        .setDescription('🧩 Challenge yourself with interactive riddles!')
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('Choose difficulty level')
                .addChoices(
                    { name: '🟢 Easy (50 coins)', value: 'easy' },
                    { name: '🟡 Medium (100 coins)', value: 'medium' },
                    { name: '🔴 Hard (200 coins)', value: 'hard' },
                    { name: '⚫ Expert (300-400 coins)', value: 'expert' },
                    { name: '🎲 Random', value: 'random' }
                )
        ),

    async execute(interaction) {
        try {
            const difficulty = interaction.options.getString('difficulty') || 'random';
            await this.showRiddle(interaction, difficulty);
        } catch (error) {
            console.error('Riddle command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while loading the riddle.',
                ephemeral: true
            });
        }
    },

    async showRiddle(interaction, difficulty = 'random') {
        // Initialize activeRiddles if it doesn't exist
        if (!this.activeRiddles) {
            this.activeRiddles = new Map();
        }

        // Filter riddles by difficulty or pick random
        let availableRiddles = riddles;
        if (difficulty !== 'random') {
            availableRiddles = riddles.filter(r => r.difficulty === difficulty);
        }
        
        const selectedRiddle = availableRiddles[Math.floor(Math.random() * availableRiddles.length)];
        
        const difficultyEmoji = {
            easy: '🟢',
            medium: '🟡', 
            hard: '🔴',
            expert: '⚫'
        };

        const difficultyColors = {
            easy: '#4CAF50',
            medium: '#FF9800',
            hard: '#F44336',
            expert: '#9C27B0'
        };

        const embed = new EmbedBuilder()
            .setColor(difficultyColors[selectedRiddle.difficulty] || config.embedColors?.primary || '#7289da')
            .setTitle('🧩 Mystery Riddle Challenge')
            .setDescription(`**${difficultyEmoji[selectedRiddle.difficulty]} ${selectedRiddle.difficulty.toUpperCase()} DIFFICULTY**\n\n*"${selectedRiddle.question}"*`)
            .addFields([
                { name: '💰 Reward', value: `${selectedRiddle.reward} coins`, inline: true },
                { name: '🎯 Difficulty', value: selectedRiddle.difficulty, inline: true },
                { name: '💡 Status', value: 'Awaiting your answer...', inline: true },
                { name: '🏆 Bonus Info', value: '• Quick answers get time bonus\n• First try gives full reward\n• Hints reduce reward by 30%', inline: false }
            ])
            .setFooter({ text: 'Use the buttons below to interact!' })
            .setTimestamp()
            .setThumbnail('https://cdn.discordapp.com/emojis/🧩.png');

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`riddle_answer_${interaction.user.id}`)
                    .setLabel('📝 Submit Answer')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId(`riddle_hint_${interaction.user.id}`)
                    .setLabel('💡 Get Hint')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💡'),
                new ButtonBuilder()
                    .setCustomId(`riddle_skip_${interaction.user.id}`)
                    .setLabel('⏭️ Skip Riddle')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⏭️'),
                new ButtonBuilder()
                    .setCustomId(`riddle_stats_${interaction.user.id}`)
                    .setLabel('📊 My Stats')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

        const difficultySelect = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`riddle_difficulty_${interaction.user.id}`)
                    .setPlaceholder('🎯 Choose difficulty for next riddle')
                    .addOptions([
                        {
                            label: 'Easy',
                            description: 'Simple riddles (50 coins)',
                            value: 'easy',
                            emoji: '🟢'
                        },
                        {
                            label: 'Medium', 
                            description: 'Moderate riddles (100 coins)',
                            value: 'medium',
                            emoji: '🟡'
                        },
                        {
                            label: 'Hard',
                            description: 'Challenging riddles (200 coins)',
                            value: 'hard', 
                            emoji: '🔴'
                        },
                        {
                            label: 'Expert',
                            description: 'Master level riddles (300-400 coins)',
                            value: 'expert',
                            emoji: '⚫'
                        },
                        {
                            label: 'Random',
                            description: 'Surprise me!',
                            value: 'random',
                            emoji: '🎲'
                        }
                    ])
            );

        // Store riddle data for this user
        this.activeRiddles.set(interaction.user.id, {
            riddle: selectedRiddle,
            attempts: 0,
            hintUsed: false,
            startTime: Date.now(),
            maxAttempts: 3
        });

        const response = { embeds: [embed], components: [buttons, difficultySelect] };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(response);
        } else {
            await interaction.reply(response);
        }

        // Set up component collector
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

        collector.on('collect', async buttonInteraction => {
            try {
                if (buttonInteraction.isButton()) {
                    await this.handleButtonInteraction(buttonInteraction);
                } else if (buttonInteraction.isStringSelectMenu()) {
                    await this.handleSelectMenu(buttonInteraction);
                }
            } catch (error) {
                console.error('Error handling riddle interaction:', error);
                await buttonInteraction.reply({
                    content: '❌ An error occurred while processing your interaction.',
                    ephemeral: true
                });
            }
        });

        collector.on('end', () => {
            if (this.activeRiddles && this.activeRiddles.has(interaction.user.id)) {
                this.activeRiddles.delete(interaction.user.id);
            }
        });
    },

    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;
        const userId = interaction.user.id;

        if (customId === `riddle_answer_${userId}`) {
            const modal = new ModalBuilder()
                .setCustomId(`riddle_answer_modal_${userId}`)
                .setTitle('Submit Your Answer');

            const answerInput = new TextInputBuilder()
                .setCustomId('riddle_answer_input')
                .setLabel('Your Answer')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Type your answer here...')
                .setRequired(true)
                .setMaxLength(100);

            const actionRow = new ActionRowBuilder().addComponents(answerInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);

        } else if (customId === `riddle_hint_${userId}`) {
            await this.showHint(interaction);
        } else if (customId === `riddle_skip_${userId}`) {
            await this.skipRiddle(interaction);
        } else if (customId === `riddle_stats_${userId}`) {
            await this.showStats(interaction);
        }
    },

    async handleSelectMenu(interaction) {
        const selectedDifficulty = interaction.values[0];
        await this.showRiddle(interaction, selectedDifficulty);
    },

    async showHint(interaction) {
        const riddleData = this.activeRiddles?.get(interaction.user.id);
        if (!riddleData) {
            await interaction.reply({
                content: '❌ No active riddle found!',
                ephemeral: true
            });
            return;
        }

        if (riddleData.hintUsed) {
            await interaction.reply({
                content: `💡 **Hint:** ${riddleData.riddle.hint}\n\n*(You already used your hint for this riddle)*`,
                ephemeral: true
            });
            return;
        }

        riddleData.hintUsed = true;

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💡 Hint Revealed!')
            .setDescription(`**Hint:** *${riddleData.riddle.hint}*`)
            .addFields([
                { name: '⚠️ Penalty', value: 'Using hints reduces your reward by 30%', inline: false },
                { name: '🎯 Attempts Left', value: `${riddleData.maxAttempts - riddleData.attempts}`, inline: true }
            ])
            .setFooter({ text: 'Good luck solving the riddle!' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async skipRiddle(interaction) {
        const riddleData = this.activeRiddles?.get(interaction.user.id);
        if (!riddleData) {
            await interaction.reply({
                content: '❌ No active riddle found!',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('⏭️ Riddle Skipped')
            .setDescription(`The answer was: **${riddleData.riddle.answer}**`)
            .addFields([
                { name: '💰 Missed Reward', value: `${riddleData.riddle.reward} coins`, inline: true },
                { name: '🎯 Attempts Made', value: `${riddleData.attempts}`, inline: true },
                { name: '💡 Learning', value: 'Try to solve the next one!', inline: true }
            ]);

        const newRiddleButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`riddle_new_${interaction.user.id}`)
                    .setLabel('🧩 Try Another Riddle')
                    .setStyle(ButtonStyle.Primary)
            );

        this.activeRiddles.delete(interaction.user.id);
        await interaction.update({ embeds: [embed], components: [newRiddleButton] });
    },

    async showStats(interaction) {
        try {
            const userData = await db.getPlayer(interaction.user.id);
            
            const embed = new EmbedBuilder()
                .setColor('#4CAF50')
                .setTitle('📊 Your Riddle Statistics')
                .addFields([
                    { name: '🧩 Riddles Solved', value: `${userData.statistics?.riddlesSolved || 0}`, inline: true },
                    { name: '💰 Coins Earned', value: `${userData.statistics?.coinsFromRiddles || 0}`, inline: true },
                    { name: '🎯 Success Rate', value: '85%', inline: true },
                    { name: '🏆 Best Streak', value: `${userData.statistics?.bestRiddleStreak || 0}`, inline: true },
                    { name: '⚡ Average Time', value: '45 seconds', inline: true },
                    { name: '💡 Hints Used', value: `${userData.statistics?.hintsUsed || 0}`, inline: true }
                ])
                .setFooter({ text: 'Keep solving to improve your stats!' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error fetching riddle stats:', error);
            await interaction.reply({
                content: '❌ Error fetching your stats.',
                ephemeral: true
            });
        }
    },

    async checkAnswer(interaction, answer) {
        const riddleData = this.activeRiddles?.get(interaction.user.id);
        if (!riddleData) {
            await interaction.reply({
                content: '❌ No active riddle found! Use `/riddle` to start a new one.',
                ephemeral: true
            });
            return;
        }

        const { riddle } = riddleData;
        const userAnswer = answer.toLowerCase().trim();
        const correctAnswer = riddle.answer.toLowerCase();

        riddleData.attempts++;

        const isCorrect = userAnswer === correctAnswer || userAnswer.includes(correctAnswer);

        if (isCorrect) {
            // Calculate reward
            let reward = riddle.reward;
            if (riddleData.hintUsed) reward = Math.floor(reward * 0.7);

            const timeTaken = Math.floor((Date.now() - riddleData.startTime) / 1000);
            const timeBonus = timeTaken < 30 ? Math.floor(reward * 0.2) : 0;
            const totalReward = reward + timeBonus;

            // Update user data
            try {
                const userData = await db.getPlayer(interaction.user.id);
                await db.updatePlayer(interaction.user.id, { 
                    coins: userData.coins + totalReward,
                    statistics: {
                        ...userData.statistics,
                        riddlesSolved: (userData.statistics?.riddlesSolved || 0) + 1,
                        coinsFromRiddles: (userData.statistics?.coinsFromRiddles || 0) + totalReward
                    }
                });
            } catch (error) {
                console.error('Error updating user data:', error);
            }

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🎉 Correct Answer!')
                .setDescription(`**"${riddle.answer}"** is the correct answer!`)
                .addFields([
                    { name: '💰 Base Reward', value: `${riddle.reward} coins`, inline: true },
                    { name: '⚡ Time Bonus', value: timeBonus > 0 ? `+${timeBonus} coins` : 'None', inline: true },
                    { name: '💡 Hint Penalty', value: riddleData.hintUsed ? '-30%' : 'None', inline: true },
                    { name: '🏆 Total Earned', value: `${totalReward} coins`, inline: true },
                    { name: '🎯 Attempts', value: `${riddleData.attempts}`, inline: true },
                    { name: '⏱️ Time', value: `${timeTaken}s`, inline: true }
                ])
                .setTimestamp();

            const newRiddleButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`riddle_new_${interaction.user.id}`)
                        .setLabel('🧩 New Riddle')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`riddle_stats_${interaction.user.id}`)
                        .setLabel('📊 My Stats')
                        .setStyle(ButtonStyle.Secondary)
                );

            this.activeRiddles.delete(interaction.user.id);
            await interaction.update({ embeds: [embed], components: [newRiddleButton] });

        } else {
            const attemptsLeft = riddleData.maxAttempts - riddleData.attempts;
            
            if (attemptsLeft <= 0) {
                // No attempts left
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('💀 Out of Attempts!')
                    .setDescription(`The correct answer was: **${riddle.answer}**`)
                    .addFields([
                        { name: '❌ Your Answer', value: `"${answer}"`, inline: true },
                        { name: '🎯 Attempts Used', value: `${riddleData.attempts}`, inline: true }
                    ]);

                const newRiddleButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`riddle_new_${interaction.user.id}`)
                            .setLabel('🧩 Try Another Riddle')
                            .setStyle(ButtonStyle.Primary)
                    );

                this.activeRiddles.delete(interaction.user.id);
                await interaction.update({ embeds: [embed], components: [newRiddleButton] });

            } else {
                // Wrong answer but attempts remaining
                const embed = new EmbedBuilder()
                    .setColor('#FF9800')
                    .setTitle('❌ Incorrect Answer')
                    .setDescription(`"${answer}" is not correct. Keep trying!`)
                    .addFields([
                        { name: '🎯 Attempts Left', value: `${attemptsLeft}`, inline: true },
                        { name: '💡 Need Help?', value: 'Use the hint button!', inline: true }
                    ]);

                await interaction.followUp({ embeds: [embed], ephemeral: true });
            }
        }
    }
};
