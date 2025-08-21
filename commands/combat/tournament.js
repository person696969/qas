const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Store active tournaments
const activeTournaments = new Map();

class Tournament {
    constructor(options) {
        this.id = Math.random().toString(36).substring(2, 8).toUpperCase(); // Generate unique ID
        this.type = options.type;
        this.slots = options.slots;
        this.rules = options.rules;
        this.participants = [];
        this.status = 'recruiting'; // recruiting, in-progress, completed
        this.matches = [];
        this.creator = options.creator;
        this.createdAt = Date.now();
    }

    addParticipant(player) {
        if (this.participants.length >= this.slots) return false;
        if (this.participants.find(p => p.id === player.id)) return false;
        this.participants.push(player);
        if (this.participants.length === this.slots) {
            this.status = 'ready';
            this.generateMatches();
        }
        return true;
    }

    generateMatches() {
        this.matches = [];
        if (this.type === 'duel') {
            // Generate 1v1 matches
            for (let i = 0; i < this.participants.length; i += 2) {
                if (i + 1 < this.participants.length) {
                    this.matches.push({
                        id: this.matches.length + 1,
                        players: [this.participants[i], this.participants[i + 1]],
                        winner: null,
                        status: 'pending'
                    });
                }
            }
        } else if (this.type === 'team') {
            // Generate 2v2 matches
            for (let i = 0; i < this.participants.length; i += 4) {
                if (i + 3 < this.participants.length) {
                    this.matches.push({
                        id: this.matches.length + 1,
                        team1: [this.participants[i], this.participants[i + 1]],
                        team2: [this.participants[i + 2], this.participants[i + 3]],
                        winner: null,
                        status: 'pending'
                    });
                }
            }
        }
    }

    getStatus() {
        return {
            id: this.id,
            type: this.type,
            slots: this.slots,
            rules: this.rules,
            participants: this.participants,
            status: this.status,
            matches: this.matches,
            remainingSlots: this.slots - this.participants.length
        };
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tournament')
        .setDescription('🏆 Create or join a PvP tournament')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new tournament')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Tournament type')
                        .setRequired(true)
                        .addChoices(
                            { name: '⚔️ 1v1 Duel', value: 'duel' },
                            { name: '👥 2v2 Team Battle', value: 'team' },
                            { name: '🏰 Guild War', value: 'guild' },
                            { name: '🎯 Free-for-All', value: 'ffa' }
                        ))
                .addIntegerOption(option =>
                    option.setName('slots')
                        .setDescription('Number of participants')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('rules')
                        .setDescription('Special rules')
                        .addChoices(
                            { name: '⚡ Quick Matches', value: 'quick' },
                            { name: '💰 High Stakes', value: 'stakes' },
                            { name: '🎭 Level Scaled', value: 'scaled' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Join an existing tournament')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('Tournament ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check tournament status')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('Tournament ID')
                        .setRequired(true))),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'create') {
                const type = interaction.options.getString('type');
                const slots = interaction.options.getInteger('slots');
                const rules = interaction.options.getString('rules');

                // Validate slots based on tournament type
                if (type === 'duel' && slots % 2 !== 0) {
                    await interaction.editReply({ 
                        content: '❌ For 1v1 tournaments, participant count must be even.',
                        ephemeral: true 
                    });
                    return;
                }
                if (type === 'team' && slots % 4 !== 0) {
                    await interaction.editReply({ 
                        content: '❌ For 2v2 tournaments, participant count must be divisible by 4.',
                        ephemeral: true 
                    });
                    return;
                }

                const tournament = new Tournament({
                    type,
                    slots,
                    rules,
                    creator: interaction.user
                });

                activeTournaments.set(tournament.id, tournament);

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`🏆 New Tournament Created: ${tournament.id}`)
                    .setDescription(`A new ${type} tournament has been created!`)
                    .addFields(
                        { name: 'Type', value: type, inline: true },
                        { name: 'Slots', value: slots.toString(), inline: true },
                        { name: 'Rules', value: rules || 'Standard', inline: true },
                        { name: 'Status', value: 'Recruiting', inline: true },
                        { name: 'Creator', value: interaction.user.tag, inline: true }
                    )
                    .setFooter({ text: `Use /tournament join ${tournament.id} to participate!` });

                const joinButton = new ButtonBuilder()
                    .setCustomId(`tournament_join_${tournament.id}`)
                    .setLabel('Join Tournament')
                    .setStyle(ButtonStyle.Primary);

                const viewButton = new ButtonBuilder()
                    .setCustomId(`tournament_view_${tournament.id}`)
                    .setLabel('View Details')
                    .setStyle(ButtonStyle.Secondary);

                const shareButton = new ButtonBuilder()
                    .setCustomId(`tournament_share_${tournament.id}`)
                    .setLabel('Share Tournament')
                    .setStyle(ButtonStyle.Success);

                const row1 = new ActionRowBuilder().addComponents(joinButton, viewButton);
                const row2 = new ActionRowBuilder().addComponents(shareButton);

                const response = await interaction.editReply({ embeds: [embed], components: [row1, row2] });

                // Handle button interactions
                const filter = i => i.customId.includes(tournament.id);
                const collector = response.createMessageComponentCollector({ filter, time: 600000 });

                collector.on('collect', async (i) => {
                    try {
                        const action = i.customId.split('_')[1];

                        if (action === 'join') {
                            if (tournament.addParticipant(i.user)) {
                                const joinEmbed = new EmbedBuilder()
                                    .setColor('#32CD32')
                                    .setTitle(`✅ Joined Tournament ${tournament.id}`)
                                    .setDescription(`${i.user.tag} has joined the tournament!`)
                                    .addFields(
                                        { name: 'Participants', value: `${tournament.participants.length}/${tournament.slots}`, inline: true },
                                        { name: 'Status', value: tournament.status, inline: true }
                                    );

                                if (tournament.status === 'ready') {
                                    joinEmbed.addFields({
                                        name: '🎮 Tournament Starting!',
                                        value: 'All slots filled! The tournament will begin shortly.',
                                        inline: false
                                    });

                                    // Disable join button when tournament is ready
                                    joinButton.setDisabled(true);
                                    const newRow1 = new ActionRowBuilder().addComponents(joinButton, viewButton);
                                    await i.update({ embeds: [joinEmbed], components: [newRow1, row2] });
                                } else {
                                    await i.update({ embeds: [joinEmbed] });
                                }
                            } else {
                                await i.reply({ content: '❌ Unable to join tournament. It might be full or you\'re already participating.', ephemeral: true });
                            }
                        } else if (action === 'view') {
                            const detailsEmbed = new EmbedBuilder()
                                .setColor('#4169E1')
                                .setTitle(`📋 Tournament Details: ${tournament.id}`)
                                .setDescription(`Type: ${tournament.type}\nRules: ${tournament.rules || 'Standard'}`)
                                .addFields(
                                    { name: 'Creator', value: tournament.creator.tag, inline: true },
                                    { name: 'Created', value: new Date(tournament.createdAt).toLocaleString(), inline: true },
                                    { name: 'Participants', value: tournament.participants.map(p => p.tag).join('\n') || 'None yet', inline: false }
                                );

                            await i.reply({ embeds: [detailsEmbed], ephemeral: true });
                        } else if (action === 'share') {
                            const shareEmbed = new EmbedBuilder()
                                .setColor('#FFD700')
                                .setTitle('📢 Tournament Invitation')
                                .setDescription(`Join Tournament ${tournament.id}!`)
                                .addFields(
                                    { name: 'Type', value: tournament.type, inline: true },
                                    { name: 'Available Slots', value: `${tournament.slots - tournament.participants.length}`, inline: true },
                                    { name: 'How to Join', value: `/tournament join ${tournament.id}`, inline: false }
                                );

                            await i.reply({ embeds: [shareEmbed] });
                        }
                    } catch (error) {
                        console.error('Error in tournament button handler:', error);
                        await i.followUp({ content: '❌ An error occurred.', ephemeral: true });
                    }
                });

                collector.on('end', () => {
                    // Disable all buttons when collector ends
                    const disabledRow1 = new ActionRowBuilder().addComponents(
                        row1.components.map(button => button.setDisabled(true))
                    );
                    const disabledRow2 = new ActionRowBuilder().addComponents(
                        row2.components.map(button => button.setDisabled(true))
                    );
                    interaction.editReply({ components: [disabledRow1, disabledRow2] }).catch(() => {});
                });

            } else if (subcommand === 'join') {
                const id = interaction.options.getString('id');
                const tournament = activeTournaments.get(id);

                if (!tournament) {
                    await interaction.editReply({ 
                        content: '❌ Tournament not found.',
                        ephemeral: true 
                    });
                    return;
                }

                if (tournament.status !== 'recruiting') {
                    await interaction.editReply({ 
                        content: '❌ This tournament is no longer accepting participants.',
                        ephemeral: true 
                    });
                    return;
                }

                // This part of the join logic is now handled by the button collector
                // If a user uses the slash command to join directly, we inform them to use the button.
                await interaction.editReply({
                    content: 'Please use the "Join Tournament" button on the tournament announcement to join.',
                    ephemeral: true
                });

            } else if (subcommand === 'status') {
                const id = interaction.options.getString('id');
                const tournament = activeTournaments.get(id);

                if (!tournament) {
                    await interaction.editReply({ 
                        content: '❌ Tournament not found.',
                        ephemeral: true 
                    });
                    return;
                }

                const status = tournament.getStatus();
                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle(`Tournament Status: ${status.id}`)
                    .setDescription(`Type: ${status.type}\nRules: ${status.rules || 'Standard'}`)
                    .addFields(
                        { name: 'Status', value: status.status, inline: true },
                        { name: 'Participants', value: `${status.participants.length}/${status.slots}`, inline: true },
                        { name: 'Created by', value: tournament.creator.tag, inline: true }
                    );

                if (status.matches.length > 0) {
                    embed.addFields({
                        name: 'Current Matches',
                        value: status.matches.map(match => 
                            `Match #${match.id}: ${match.status === 'pending' ? '⏳' : match.status === 'completed' ? '✅' : '🎮'}`
                        ).join('\n'),
                        inline: false
                    });
                }

                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in tournament command:', error);
            const reply = interaction.deferred ? interaction.editReply : interaction.reply;
            await reply.call(interaction, { 
                content: '❌ An error occurred while processing the tournament command.',
                ephemeral: true 
            });
        }
    },
};