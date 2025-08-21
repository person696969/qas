
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const CHALLENGE_TYPES = {
    HUNT: {
        name: '🗺️ Treasure Hunt Race',
        description: 'Complete treasure hunts faster than your opponent!',
        reward: 750,
        minLevel: 1,
        emoji: '🏃‍♂️'
    },
    DUEL: {
        name: '⚔️ Combat Duel',
        description: 'Battle with your equipment and combat skills!',
        reward: 500,
        minLevel: 5,
        emoji: '⚔️'
    },
    RIDDLE: {
        name: '🧩 Riddle Challenge',
        description: 'Solve riddles faster than your opponent!',
        reward: 400,
        minLevel: 1,
        emoji: '🧠'
    },
    TRIVIA: {
        name: '📚 Knowledge Quiz',
        description: 'Test your knowledge against another player!',
        reward: 350,
        minLevel: 3,
        emoji: '🎓'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('challenge')
        .setDescription('🏆 Challenge another player to various competitions')
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('The player you want to challenge')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of challenge')
                .setRequired(false)
                .addChoices(
                    { name: '🗺️ Treasure Hunt Race', value: 'HUNT' },
                    { name: '⚔️ Combat Duel', value: 'DUEL' },
                    { name: '🧩 Riddle Challenge', value: 'RIDDLE' },
                    { name: '📚 Knowledge Quiz', value: 'TRIVIA' }
                ))
        .addIntegerOption(option =>
            option.setName('wager')
                .setDescription('Optional coin wager (both players must have enough)')
                .setRequired(false)
                .setMinValue(50)
                .setMaxValue(5000)),

    async execute(interaction) {
        const challenger = interaction.user;
        const opponent = interaction.options.getUser('opponent');
        const challengeType = interaction.options.getString('type');
        const wager = interaction.options.getInteger('wager') || 0;

        // Validation checks
        if (opponent.id === challenger.id) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Invalid Challenge')
                .setDescription('You cannot challenge yourself!')
                .setFooter({ text: 'Find another player to challenge!' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (opponent.bot) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Invalid Target')
                .setDescription('You cannot challenge a bot!')
                .setFooter({ text: 'Challenge human players only!' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Get player data
        const challengerData = await db.getPlayer(challenger.id);
        const opponentData = await db.getPlayer(opponent.id);

        if (!challengerData || !opponentData) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Player Not Found')
                .setDescription('Both players must have game profiles to challenge each other.')
                .setFooter({ text: 'Use /daily to create your profile!' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check wager requirements
        if (wager > 0) {
            if (challengerData.coins < wager || opponentData.coins < wager) {
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('💰 Insufficient Funds')
                    .setDescription(`Both players need at least ${wager} coins for this wager.`)
                    .addFields(
                        { name: `${challenger.username}'s Coins`, value: `${challengerData.coins}`, inline: true },
                        { name: `${opponent.username}'s Coins`, value: `${opponentData.coins}`, inline: true }
                    );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        if (!challengeType) {
            // Show challenge type selection
            const embed = new EmbedBuilder()
                .setColor('#FF6B35')
                .setTitle('🏆 Challenge Setup')
                .setDescription(`**${challenger.username}** wants to challenge **${opponent.username}**!`)
                .addFields(
                    { name: '🎯 Choose Challenge Type', value: 'Select the type of competition below:', inline: false },
                    { name: '💰 Wager', value: wager > 0 ? `${wager} coins` : 'No wager', inline: true },
                    { name: '⏰ Expires', value: '<t:' + Math.floor((Date.now() + 300000) / 1000) + ':R>', inline: true }
                );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('challenge_type_select')
                .setPlaceholder('Choose a challenge type...')
                .addOptions(
                    Object.entries(CHALLENGE_TYPES).map(([key, type]) => ({
                        label: type.name,
                        description: `${type.description} (${type.reward} base reward)`,
                        value: key,
                        emoji: type.emoji
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            const message = await interaction.reply({ embeds: [embed], components: [row] });
            
            // Store challenge data temporarily
            interaction.client.pendingChallenges = interaction.client.pendingChallenges || new Map();
            interaction.client.pendingChallenges.set(message.id, {
                challenger: challenger.id,
                opponent: opponent.id,
                wager,
                expires: Date.now() + 300000
            });

            return;
        }

        // Direct challenge with specified type
        await this.createChallenge(interaction, challenger, opponent, challengeType, wager);
    },

    async createChallenge(interaction, challenger, opponent, challengeType, wager) {
        const challenge = CHALLENGE_TYPES[challengeType];
        const totalReward = challenge.reward + wager;

        const embed = new EmbedBuilder()
            .setColor('#FF9900')
            .setTitle(`${challenge.emoji} Challenge Issued!`)
            .setDescription(`**${challenger.username}** challenges **${opponent.username}** to a ${challenge.name}!`)
            .addFields(
                { name: '📜 Challenge', value: challenge.description, inline: false },
                { name: '💰 Total Prize', value: `${totalReward} coins`, inline: true },
                { name: '🎯 Wager', value: wager > 0 ? `${wager} coins each` : 'None', inline: true },
                { name: '⏰ Expires', value: '<t:' + Math.floor((Date.now() + 300000) / 1000) + ':R>', inline: true }
            )
            .setFooter({ text: `${opponent.username}, click a button below to respond!` })
            .setThumbnail(opponent.displayAvatarURL());

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('challenge_accept')
                    .setLabel('Accept Challenge')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('challenge_decline')
                    .setLabel('Decline')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId('challenge_counter')
                    .setLabel('Counter Offer')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄')
            );

        const message = await interaction.editReply({ embeds: [embed], components: [buttons] });

        // Store active challenge
        interaction.client.activeChallenges = interaction.client.activeChallenges || new Map();
        interaction.client.activeChallenges.set(message.id, {
            challenger: challenger.id,
            opponent: opponent.id,
            type: challengeType,
            wager,
            created: Date.now(),
            expires: Date.now() + 300000
        });

        // Auto-expire after 5 minutes
        setTimeout(async () => {
            if (interaction.client.activeChallenges.has(message.id)) {
                interaction.client.activeChallenges.delete(message.id);
                const expiredEmbed = new EmbedBuilder()
                    .setColor(config.embedColors.error)
                    .setTitle('⏰ Challenge Expired')
                    .setDescription('The challenge has expired without a response.');
                
                try {
                    await message.edit({ embeds: [expiredEmbed], components: [] });
                } catch (error) {
                    console.error('Error expiring challenge:', error);
                }
            }
        }, 300000);
    },

    async handleAcceptChallenge(interaction, challengeData) {
        const challenger = await interaction.client.users.fetch(challengeData.challenger);
        const opponent = interaction.user;
        const challenge = CHALLENGE_TYPES[challengeData.type];

        // Execute the challenge based on type
        switch (challengeData.type) {
            case 'HUNT':
                await this.executeHuntRace(interaction, challenger, opponent, challengeData);
                break;
            case 'DUEL':
                await this.executeDuel(interaction, challenger, opponent, challengeData);
                break;
            case 'RIDDLE':
                await this.executeRiddleChallenge(interaction, challenger, opponent, challengeData);
                break;
            case 'TRIVIA':
                await this.executeTriviaChallenge(interaction, challenger, opponent, challengeData);
                break;
        }
    },

    async executeHuntRace(interaction, challenger, opponent, challengeData) {
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏁 Hunt Race Started!')
            .setDescription('**The treasure hunt race begins!**\nFirst to complete their hunt wins!')
            .addFields(
                { name: '🎯 Objective', value: 'Complete a treasure hunt faster than your opponent', inline: false },
                { name: '💰 Prize Pool', value: `${CHALLENGE_TYPES.HUNT.reward + challengeData.wager} coins`, inline: true },
                { name: '📜 Instructions', value: 'Use `/hunt` to start your treasure hunt!', inline: true }
            )
            .setFooter({ text: 'May the fastest hunter win!' });

        // Set up race tracking
        interaction.client.huntRaces = interaction.client.huntRaces || new Map();
        const raceId = `${challenger.id}_${opponent.id}_${Date.now()}`;
        
        interaction.client.huntRaces.set(raceId, {
            players: [challenger.id, opponent.id],
            completed: [],
            startTime: Date.now(),
            prize: CHALLENGE_TYPES.HUNT.reward + challengeData.wager,
            wager: challengeData.wager
        });

        await interaction.update({ embeds: [embed], components: [] });
    },

    async executeDuel(interaction, challenger, opponent, challengeData) {
        const challengerData = await db.getPlayer(challenger.id);
        const opponentData = await db.getPlayer(opponent.id);

        // Calculate combat power
        const challengerPower = this.calculateCombatPower(challengerData);
        const opponentPower = this.calculateCombatPower(opponentData);

        // Add some randomness
        const challengerRoll = Math.random() * 0.3 + 0.85; // 85-115% of power
        const opponentRoll = Math.random() * 0.3 + 0.85;

        const challengerTotal = Math.floor(challengerPower * challengerRoll);
        const opponentTotal = Math.floor(opponentPower * opponentRoll);

        const winner = challengerTotal > opponentTotal ? challenger : opponent;
        const winnerData = winner.id === challenger.id ? challengerData : opponentData;
        const loserData = winner.id === challenger.id ? opponentData : challengerData;

        // Award prizes
        const totalPrize = CHALLENGE_TYPES.DUEL.reward + challengeData.wager;
        winnerData.coins += totalPrize;
        
        if (challengeData.wager > 0) {
            loserData.coins -= challengeData.wager;
        }

        await db.updatePlayer(winner.id, winnerData);
        await db.updatePlayer(winner.id === challenger.id ? opponent.id : challenger.id, loserData);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⚔️ Duel Results')
            .setDescription(`**${winner.username}** emerges victorious!`)
            .addFields(
                { name: '⚡ Combat Powers', value: `${challenger.username}: ${challengerTotal}\n${opponent.username}: ${opponentTotal}`, inline: false },
                { name: '🏆 Winner', value: `${winner.username} wins ${totalPrize} coins!`, inline: true },
                { name: '💰 Prize Breakdown', value: `Base: ${CHALLENGE_TYPES.DUEL.reward}\nWager: ${challengeData.wager}`, inline: true }
            )
            .setThumbnail(winner.displayAvatarURL());

        await interaction.update({ embeds: [embed], components: [] });
    },

    async executeRiddleChallenge(interaction, challenger, opponent, challengeData) {
        const riddles = [
            { question: "I have cities, but no houses. I have mountains, but no trees. What am I?", answer: "map" },
            { question: "The more you take, the more you leave behind. What am I?", answer: "footsteps" },
            { question: "I'm not alive, but I grow. I don't have lungs, but I need air. What am I?", answer: "fire" },
            { question: "What has keys but no locks, space but no room?", answer: "keyboard" },
            { question: "I speak without a mouth and hear without ears. What am I?", answer: "echo" }
        ];

        const selectedRiddle = riddles[Math.floor(Math.random() * riddles.length)];
        const totalPrize = CHALLENGE_TYPES.RIDDLE.reward + challengeData.wager;

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🧩 Riddle Challenge!')
            .setDescription('**First to solve this riddle wins!**')
            .addFields(
                { name: '❓ Riddle', value: `*"${selectedRiddle.question}"*`, inline: false },
                { name: '💰 Prize', value: `${totalPrize} coins`, inline: true },
                { name: '📝 How to Answer', value: 'Use `/solve <answer>` to submit!', inline: true }
            )
            .setFooter({ text: 'Think carefully... first correct answer wins!' });

        // Set up riddle tracking
        interaction.client.riddleChallenges = interaction.client.riddleChallenges || new Map();
        const challengeId = `${challenger.id}_${opponent.id}_${Date.now()}`;
        
        interaction.client.riddleChallenges.set(challengeId, {
            players: [challenger.id, opponent.id],
            answer: selectedRiddle.answer.toLowerCase(),
            startTime: Date.now(),
            prize: totalPrize,
            wager: challengeData.wager
        });

        await interaction.update({ embeds: [embed], components: [] });
    },

    async executeTriviaChallenge(interaction, challenger, opponent, challengeData) {
        const questions = [
            { question: "What is the largest planet in our solar system?", answer: "jupiter" },
            { question: "What year did World War II end?", answer: "1945" },
            { question: "What is the capital of Australia?", answer: "canberra" },
            { question: "Who painted the Mona Lisa?", answer: "leonardo da vinci" },
            { question: "What is the smallest country in the world?", answer: "vatican city" }
        ];

        const selectedQuestion = questions[Math.floor(Math.random() * questions.length)];
        const totalPrize = CHALLENGE_TYPES.TRIVIA.reward + challengeData.wager;

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('📚 Trivia Challenge!')
            .setDescription('**Test your knowledge!**')
            .addFields(
                { name: '❓ Question', value: selectedQuestion.question, inline: false },
                { name: '💰 Prize', value: `${totalPrize} coins`, inline: true },
                { name: '📝 How to Answer', value: 'Use `/solve <answer>` to submit!', inline: true }
            )
            .setFooter({ text: 'First correct answer wins!' });

        // Set up trivia tracking
        interaction.client.triviaChallenges = interaction.client.triviaChallenges || new Map();
        const challengeId = `${challenger.id}_${opponent.id}_${Date.now()}`;
        
        interaction.client.triviaChallenges.set(challengeId, {
            players: [challenger.id, opponent.id],
            answer: selectedQuestion.answer.toLowerCase(),
            startTime: Date.now(),
            prize: totalPrize,
            wager: challengeData.wager
        });

        await interaction.update({ embeds: [embed], components: [] });
    },

    calculateCombatPower(playerData) {
        let power = 0;
        
        // Base stats contribution
        power += (playerData.attack || 10) * 2;
        power += (playerData.defense || 5) * 1.5;
        power += (playerData.speed || 10) * 1.2;
        power += (playerData.luck || 5) * 0.8;
        
        // Level bonus
        power += (playerData.level || 1) * 10;
        
        return Math.floor(power);
    }
};
