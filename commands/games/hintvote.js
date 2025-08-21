
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const HINT_COST = 75; // Coins per hint vote
const REQUIRED_VOTES = 3; // Number of votes needed to reveal hint
const VOTE_TIMEOUT = 300000; // 5 minutes

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hintvote')
        .setDescription('💡 Vote to reveal a hint for active challenges and hunts')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('What type of hint to vote for')
                .setRequired(false)
                .addChoices(
                    { name: '🗺️ Treasure Hunt', value: 'hunt' },
                    { name: '🧩 Active Riddle', value: 'riddle' },
                    { name: '🎯 Current Challenge', value: 'challenge' }
                )),

    async execute(interaction) {
        const userId = interaction.user.id;
        const hintType = interaction.options.getString('type') || 'auto';
        
        // Get player data
        const player = await db.getPlayer(userId);
        if (!player) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('❌ Profile Required')
                .setDescription('You need a game profile to vote for hints!')
                .setFooter({ text: 'Use /daily to create your profile!' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (player.coins < HINT_COST) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('💰 Insufficient Funds')
                .setDescription(`You need **${HINT_COST} coins** to vote for a hint!`)
                .addFields(
                    { name: 'Your Coins', value: `${player.coins}`, inline: true },
                    { name: 'Required', value: `${HINT_COST}`, inline: true },
                    { name: 'Needed', value: `${HINT_COST - player.coins}`, inline: true }
                )
                .setFooter({ text: 'Earn more coins with /work or /daily!' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Auto-detect active activities if type not specified
        if (hintType === 'auto') {
            const activeHint = await this.detectActiveActivity(interaction, userId);
            if (!activeHint) {
                const embed = new EmbedBuilder()
                    .setColor(config.embedColors.warning)
                    .setTitle('🤷‍♂️ No Active Activities')
                    .setDescription('No active hunts, riddles, or challenges found that need hints!')
                    .addFields(
                        { name: '🗺️ Start Activities', value: 'Use `/hunt`, `/riddle`, or `/challenge` to begin!', inline: false },
                        { name: '💡 Manual Selection', value: 'Specify a hint type with the `type` option', inline: false }
                    );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            return this.processHintVote(interaction, userId, player, activeHint);
        }

        return this.processHintVote(interaction, userId, player, hintType);
    },

    async detectActiveActivity(interaction, userId) {
        // Check for active hunt
        if (interaction.client.activeHunts && interaction.client.activeHunts.has(userId)) {
            return 'hunt';
        }

        // Check for active riddle challenges
        if (interaction.client.riddleChallenges) {
            for (const [challengeId, challenge] of interaction.client.riddleChallenges) {
                if (challenge.players.includes(userId)) {
                    return 'riddle';
                }
            }
        }

        // Check for active trivia challenges
        if (interaction.client.triviaChallenges) {
            for (const [challengeId, challenge] of interaction.client.triviaChallenges) {
                if (challenge.players.includes(userId)) {
                    return 'challenge';
                }
            }
        }

        return null;
    },

    async processHintVote(interaction, userId, player, hintType) {
        // Initialize hint voting system
        interaction.client.hintVotes = interaction.client.hintVotes || new Map();
        const voteKey = `${interaction.channelId}_${hintType}`;
        
        let voteData = interaction.client.hintVotes.get(voteKey);
        if (!voteData) {
            voteData = {
                type: hintType,
                channelId: interaction.channelId,
                votes: [],
                startTime: Date.now(),
                expires: Date.now() + VOTE_TIMEOUT
            };
            interaction.client.hintVotes.set(voteKey, voteData);
        }

        // Check if user already voted
        if (voteData.votes.includes(userId)) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.warning)
                .setTitle('🗳️ Already Voted')
                .setDescription('You have already voted for this hint!')
                .addFields(
                    { name: '📊 Current Progress', value: `${voteData.votes.length}/${REQUIRED_VOTES} votes`, inline: true },
                    { name: '⏰ Time Left', value: `<t:${Math.floor(voteData.expires / 1000)}:R>`, inline: true }
                );
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check if vote has expired
        if (Date.now() > voteData.expires) {
            interaction.client.hintVotes.delete(voteKey);
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.error)
                .setTitle('⏰ Vote Expired')
                .setDescription('This hint vote has expired. Start a new one!');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Process the vote
        player.coins -= HINT_COST;
        await db.updatePlayer(userId, player);
        voteData.votes.push(userId);

        if (voteData.votes.length >= REQUIRED_VOTES) {
            // Reveal the hint
            const hint = await this.generateHint(hintType, interaction);
            interaction.client.hintVotes.delete(voteKey);

            const revealEmbed = new EmbedBuilder()
                .setColor('#00FF7F')
                .setTitle('🎉 Hint Revealed!')
                .setDescription('**Community effort successful!** Here\'s your hint:')
                .addFields(
                    { name: '💡 Hint', value: hint, inline: false },
                    { name: '🗳️ Final Vote', value: `${interaction.user.username} cast the winning vote!`, inline: true },
                    { name: '💰 Total Cost', value: `${REQUIRED_VOTES * HINT_COST} coins (community funded)`, inline: true }
                )
                .setFooter({ text: 'Use this hint wisely to solve your challenge!' })
                .setTimestamp();

            // Add celebration buttons
            const celebrationButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('hint_celebrate')
                        .setLabel('🎉 Celebrate')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('hint_share')
                        .setLabel('📤 Share Success')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('hint_stats')
                        .setLabel('📊 Vote Stats')
                        .setStyle(ButtonStyle.Secondary)
                );

            return interaction.reply({ embeds: [revealEmbed], components: [celebrationButtons] });
        } else {
            // Show vote progress
            const progressEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🗳️ Hint Vote Cast!')
                .setDescription(`**${interaction.user.username}** voted for a hint!`)
                .addFields(
                    { 
                        name: '📊 Progress', 
                        value: `${voteData.votes.length}/${REQUIRED_VOTES} votes\n${'🟢'.repeat(voteData.votes.length)}${'⚫'.repeat(REQUIRED_VOTES - voteData.votes.length)}`,
                        inline: true
                    },
                    { 
                        name: '💰 Your Contribution', 
                        value: `${HINT_COST} coins deducted`,
                        inline: true
                    },
                    {
                        name: '⏰ Time Left',
                        value: `<t:${Math.floor(voteData.expires / 1000)}:R>`,
                        inline: true
                    },
                    {
                        name: '🎯 Type',
                        value: this.getHintTypeDisplay(hintType),
                        inline: true
                    },
                    {
                        name: '🔄 Still Needed',
                        value: `${REQUIRED_VOTES - voteData.votes.length} more votes`,
                        inline: true
                    },
                    {
                        name: '👥 Voters',
                        value: voteData.votes.length > 0 ? `${voteData.votes.length} player(s) contributed` : 'Be the first!',
                        inline: true
                    }
                );

            const voteButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('hint_encourage')
                        .setLabel('📢 Encourage Others')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📣'),
                    new ButtonBuilder()
                        .setCustomId('hint_progress')
                        .setLabel('📊 Check Progress')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📈')
                );

            return interaction.reply({ embeds: [progressEmbed], components: [voteButtons] });
        }
    },

    async generateHint(hintType, interaction) {
        switch (hintType) {
            case 'hunt':
                const huntHints = [
                    "🗺️ Look for areas with high treasure activity...",
                    "💎 Rare items are often found in dangerous locations...",
                    "🔍 Search thoroughly - some treasures are well hidden...",
                    "⭐ Your luck stat affects treasure finding chances...",
                    "🏴‍☠️ Pirates often buried their treasures near water..."
                ];
                return huntHints[Math.floor(Math.random() * huntHints.length)];

            case 'riddle':
                return "🧠 Think about the literal meaning of each word, then consider metaphorical interpretations...";

            case 'challenge':
                return "🎯 Focus on your strongest skills and don't rush your answer...";

            default:
                return "💡 Sometimes the simplest answer is the correct one...";
        }
    },

    getHintTypeDisplay(type) {
        const displays = {
            hunt: '🗺️ Treasure Hunt',
            riddle: '🧩 Riddle Challenge', 
            challenge: '🎯 Active Challenge'
        };
        return displays[type] || '❓ Unknown';
    }
};
