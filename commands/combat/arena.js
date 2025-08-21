const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');
const { handleError } = require('../../utils/errorHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('arena')
        .setDescription('⚔️ Battle other treasure hunters in the arena')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View the arena and your stats'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('challenge')
                .setDescription('Challenge an opponent')
                .addStringOption(option =>
                    option.setName('opponent')
                        .setDescription('Choose your opponent')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 Rookie Hunter (Level 1)', value: 'rookie' },
                            { name: '🟡 Veteran Explorer (Level 5)', value: 'veteran' },
                            { name: '🔴 Elite Treasure Master (Level 10)', value: 'elite' },
                            { name: '🟣 Legendary Champion (Level 15)', value: 'legendary' }
                        ))),
                        
    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const userId = interaction.user.id;
            let userProfile = await db.getPlayer(userId);
            
            if (!userProfile) {
                userProfile = {
                    coins: 100,
                    level: 1,
                    experience: 0,
                    stats: { hp: 100, attack: 20, defense: 15 },
                    arenaStats: { wins: 0, losses: 0, ranking: 1000 }
                };
                await db.setPlayer(userId, userProfile);
            }

            userProfile.stats = userProfile.stats || { hp: 100, attack: 20, defense: 15 };
            userProfile.arenaStats = userProfile.arenaStats || { wins: 0, losses: 0, ranking: 1000 };

            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'view':
                    return await this.handleView(interaction, userProfile);
                case 'challenge':
                    return await this.handleChallenge(interaction, userProfile);
                default:
                    await interaction.editReply('Invalid subcommand');
            }
        } catch (error) {
            await handleError(interaction, error);
        }
    },

    async handleView(interaction, userProfile) {
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.primary || '#0099ff')
            .setTitle('🏟️ Arena Status')
            .setDescription('Welcome to the Arena! Challenge opponents and climb the rankings.')
            .addFields([
                { 
                    name: '🏆 Your Arena Stats', 
                    value: `Ranking: ${userProfile.arenaStats.ranking}\nWins: ${userProfile.arenaStats.wins}\nLosses: ${userProfile.arenaStats.losses}`,
                    inline: true 
                },
                { 
                    name: '⚔️ Your Combat Stats', 
                    value: `HP: ${userProfile.stats.hp}\nAttack: ${userProfile.stats.attack}\nDefense: ${userProfile.stats.defense}`,
                    inline: true 
                }
            ])
            .setFooter({ text: 'Use /arena challenge to battle an opponent' });

        const battleButtons = [
            new ButtonBuilder()
                .setCustomId('arena_rookie')
                .setLabel('Challenge Rookie')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🟢'),
            new ButtonBuilder()
                .setCustomId('arena_veteran')
                .setLabel('Challenge Veteran')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🟡'),
            new ButtonBuilder()
                .setCustomId('arena_elite')
                .setLabel('Challenge Elite')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔴'),
            new ButtonBuilder()
                .setCustomId('arena_legendary')
                .setLabel('Challenge Legend')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🟣')
        ];

        const healButton = new ButtonBuilder()
            .setCustomId('arena_heal')
            .setLabel('Rest & Heal')
            .setStyle(ButtonStyle.Success)
            .setEmoji('❤️');

        const leaderboardButton = new ButtonBuilder()
            .setCustomId('arena_leaderboard')
            .setLabel('Arena Rankings')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🏆');

        const row1 = new ActionRowBuilder().addComponents(battleButtons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(battleButtons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(healButton, leaderboardButton);

        const response = await interaction.editReply({ embeds: [embed], components: [row1, row2, row3] });

        // Handle button interactions
        const filter = i => i.user.id === interaction.user.id;
        const collector = response.createMessageComponentCollector({ filter, time: 300000 });

        collector.on('collect', async (i) => {
            try {
                if (i.customId.startsWith('arena_')) {
                    const action = i.customId.split('_')[1];

                    if (['rookie', 'veteran', 'elite', 'legendary'].includes(action)) {
                        await i.deferUpdate();
                        await this.handleChallenge({ ...interaction, options: { getString: () => action } }, userProfile);
                    } else if (action === 'heal') {
                        userProfile.stats.hp = userProfile.stats.maxHealth || 100;
                        await db.setPlayer(userId, userProfile);

                        const healEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('❤️ Fully Healed!')
                            .setDescription('You rest and recover your strength.')
                            .addFields({ name: 'Current HP', value: `${userProfile.stats.hp}`, inline: true });

                        await i.update({ embeds: [healEmbed], components: [] });

                        setTimeout(async () => {
                            await this.handleView(interaction, userProfile);
                        }, 2000);
                    } else if (action === 'leaderboard') {
                        const leaderboardEmbed = new EmbedBuilder()
                            .setColor('#FFD700')
                            .setTitle('🏆 Arena Leaderboard')
                            .setDescription('Top Arena Champions')
                            .addFields(
                                { name: '🥇 1st Place', value: 'Champion Warrior (Rank: 2500)', inline: false },
                                { name: '🥈 2nd Place', value: 'Elite Fighter (Rank: 2300)', inline: false },
                                { name: '🥉 3rd Place', value: 'Master Duelist (Rank: 2100)', inline: false },
                                { name: `Your Rank: ${userProfile.arenaStats.ranking}`, value: `Wins: ${userProfile.arenaStats.wins} | Losses: ${userProfile.arenaStats.losses}`, inline: false }
                            );

                        await i.update({ embeds: [leaderboardEmbed], components: [] });

                        setTimeout(async () => {
                            await this.handleView(interaction, userProfile);
                        }, 5000);
                    }
                }
            } catch (error) {
                console.error('Error in arena button handler:', error);
                await i.followUp({ content: '❌ An error occurred.', ephemeral: true });
            }
        });

        collector.on('end', () => {
            // Disable all buttons when collector ends
            const disabledRows = [row1, row2, row3].map(row => 
                new ActionRowBuilder().addComponents(
                    row.components.map(button => button.setDisabled(true))
                )
            );
            interaction.editReply({ components: disabledRows }).catch(() => {});
        });
    },

    async handleChallenge(interaction, userProfile) {
        const opponent = interaction.options.getString('opponent');
        
        // Define opponent stats
        const opponents = {
            rookie: { level: 1, hp: 80, attack: 15, defense: 10, reward: 50 },
            veteran: { level: 5, hp: 120, attack: 25, defense: 20, reward: 100 },
            elite: { level: 10, hp: 180, attack: 35, defense: 30, reward: 200 },
            legendary: { level: 15, hp: 250, attack: 50, defense: 45, reward: 500 }
        };

        if (!opponents[opponent]) {
            await interaction.editReply('Invalid opponent selected.');
            return;
        }

        const opponentStats = opponents[opponent];
        
        // Check player level requirement
        if (userProfile.level < opponentStats.level) {
            await interaction.editReply(`❌ You need to be level ${opponentStats.level} to challenge this opponent.`);
            return;
        }

        // Check player health
        if (userProfile.stats.hp < 50) {
            await interaction.editReply('❌ Your health is too low! Use the Rest & Heal option to recover.');
            return;
        }

        // Battle simulation
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.combat || '#FF0000')
            .setTitle('⚔️ Arena Battle')
            .setDescription(`You are battling a level ${opponentStats.level} opponent!`)
            .addFields([
                { name: '🛡️ Your Stats', value: `HP: ${userProfile.stats.hp}\nATK: ${userProfile.stats.attack}\nDEF: ${userProfile.stats.defense}`, inline: true },
                { name: '⚔️ Opponent Stats', value: `HP: ${opponentStats.hp}\nATK: ${opponentStats.attack}\nDEF: ${opponentStats.defense}`, inline: true }
            ])
            .setFooter({ text: `Reward: ${opponentStats.reward} coins` });

        await interaction.editReply({ embeds: [embed] });

        // Simulate turn-based combat
        const result = this.simulateBattle(userProfile.stats, opponentStats);

        // Update player stats and rewards
        if (result.victory) {
            userProfile.stats.hp = result.playerHp;
            userProfile.arenaStats.wins++;
            userProfile.arenaStats.ranking += 25;
            userProfile.inventory = userProfile.inventory || {};
            userProfile.inventory.coins = (userProfile.inventory.coins || 0) + opponentStats.reward;

            await db.setPlayer(interaction.user.id, userProfile);

            const victoryEmbed = new EmbedBuilder()
                .setColor(config.embedColors.success || '#00FF00')
                .setTitle('🏆 Victory!')
                .setDescription(`You defeated your opponent and earned ${opponentStats.reward} coins!`)
                .addFields([
                    { name: '❤️ Remaining HP', value: `${result.playerHp}`, inline: true },
                    { name: '📈 New Ranking', value: `${userProfile.arenaStats.ranking}`, inline: true }
                ]);

            await interaction.followUp({ embeds: [victoryEmbed] });
        } else {
            userProfile.stats.hp = result.playerHp;
            userProfile.arenaStats.losses++;
            userProfile.arenaStats.ranking = Math.max(1000, userProfile.arenaStats.ranking - 15);

            await db.setPlayer(interaction.user.id, userProfile);

            const defeatEmbed = new EmbedBuilder()
                .setColor(config.embedColors.error || '#FF0000')
                .setTitle('💀 Defeat')
                .setDescription('You were defeated in battle!')
                .addFields([
                    { name: '❤️ Remaining HP', value: `${result.playerHp}`, inline: true },
                    { name: '📉 New Ranking', value: `${userProfile.arenaStats.ranking}`, inline: true }
                ]);

            await interaction.followUp({ embeds: [defeatEmbed] });
        }
    },

    simulateBattle(playerStats, opponentStats) {
        let playerHp = playerStats.hp;
        let opponentHp = opponentStats.hp;
        let turn = 0;
        const maxTurns = 10;

        while (playerHp > 0 && opponentHp > 0 && turn < maxTurns) {
            // Player attacks
            const playerDamage = Math.max(1, playerStats.attack - opponentStats.defense/2);
            opponentHp -= playerDamage;

            // Opponent attacks if still alive
            if (opponentHp > 0) {
                const opponentDamage = Math.max(1, opponentStats.attack - playerStats.defense/2);
                playerHp -= opponentDamage;
            }

            turn++;
        }

        return {
            victory: opponentHp <= 0,
            playerHp: Math.max(0, playerHp),
            opponentHp: Math.max(0, opponentHp)
        };
    }
};