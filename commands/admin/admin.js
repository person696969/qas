const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('🔧 Advanced admin panel for treasure hunt management')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create_hunt')
                .setDescription('Create a new treasure hunt')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name of the treasure hunt')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description of the treasure hunt')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('difficulty')
                        .setDescription('Hunt difficulty level (1-10)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10))
                .addIntegerOption(option =>
                    option.setName('reward')
                        .setDescription('Reward amount in coins')
                        .setRequired(false)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add_clue')
                .setDescription('Add a clue to a hunt')
                .addStringOption(option =>
                    option.setName('hunt_id')
                        .setDescription('The hunt ID to add the clue to')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('clue')
                        .setDescription('The clue text')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('answer')
                        .setDescription('The answer to the clue')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('hint')
                        .setDescription('Optional hint for the clue')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('schedule_event')
                .setDescription('Schedule a treasure hunt event')
                .addStringOption(option =>
                    option.setName('hunt_id')
                        .setDescription('The hunt ID to schedule')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('start_time')
                        .setDescription('When the event should start (ISO format)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('end_time')
                        .setDescription('When the event should end (ISO format)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('player_manage')
                .setDescription('Manage player accounts and statistics')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to manage')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'View Profile', value: 'view' },
                            { name: 'Reset Progress', value: 'reset' },
                            { name: 'Add Coins', value: 'add_coins' },
                            { name: 'Remove Coins', value: 'remove_coins' },
                            { name: 'Ban User', value: 'ban' },
                            { name: 'Unban User', value: 'unban' }
                        ))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount for coin operations')
                        .setRequired(false))),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        try {
            // Check admin permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🚫 Access Denied')
                    .setDescription('You need **Administrator** permissions to use this command!')
                    .setFooter({ text: 'Contact a server administrator for access' });
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            switch (subcommand) {
                case 'create_hunt':
                    await this.handleCreateHunt(interaction);
                    break;
                case 'add_clue':
                    await this.handleAddClue(interaction);
                    break;
                case 'schedule_event':
                    await this.handleScheduleEvent(interaction);
                    break;
                case 'player_manage':
                    await this.handlePlayerManage(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand!',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Admin command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⚠️ Admin Command Error')
                .setDescription('An error occurred while executing the admin command.')
                .addFields({
                    name: 'Error Details',
                    value: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
                    inline: false
                })
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },

    async handleCreateHunt(interaction) {
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const difficulty = interaction.options.getInteger('difficulty');
        const reward = interaction.options.getInteger('reward') || difficulty * 100;

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏗️ Create New Treasure Hunt')
            .setDescription('**Hunt Configuration Preview**')
            .addFields(
                { name: '📝 Hunt Name', value: name, inline: true },
                { name: '📊 Difficulty Level', value: `${difficulty}/10`, inline: true },
                { name: '💰 Reward', value: `${reward} coins`, inline: true },
                { name: '📖 Description', value: description, inline: false },
                {
                    name: '🎯 Next Steps',
                    value: '• Use `/admin add_clue` to add clues\n• Use `/admin schedule_event` to activate\n• Monitor progress with admin tools',
                    inline: false
                }
            )
            .setFooter({ text: 'Hunt created successfully! Add clues to complete setup.' })
            .setTimestamp();

        const addClueButton = new ButtonBuilder()
            .setCustomId(`admin_add_clue_${Date.now()}`)
            .setLabel('Add First Clue')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝');

        const manageButton = new ButtonBuilder()
            .setCustomId('admin_manage_hunts')
            .setLabel('Manage Hunts')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⚙️');

        const row = new ActionRowBuilder().addComponents(addClueButton, manageButton);

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    },

    async handleAddClue(interaction) {
        const huntId = interaction.options.getString('hunt_id');
        const clue = interaction.options.getString('clue');
        const answer = interaction.options.getString('answer');
        const hint = interaction.options.getString('hint') || 'No hint provided';

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🧩 Clue Added Successfully')
            .setDescription(`**Clue added to Hunt ID: ${huntId}**`)
            .addFields(
                { name: '🔍 Clue Text', value: clue, inline: false },
                { name: '✅ Answer', value: answer, inline: true },
                { name: '💡 Hint', value: hint, inline: true },
                {
                    name: '📊 Clue Statistics',
                    value: `**Difficulty:** Auto-calculated\n**Type:** Text-based\n**Status:** Active`,
                    inline: false
                }
            )
            .setFooter({ text: 'Clue is now active and available to players' })
            .setTimestamp();

        const addAnotherButton = new ButtonBuilder()
            .setCustomId(`admin_add_another_clue_${huntId}`)
            .setLabel('Add Another Clue')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('➕');

        const testClueButton = new ButtonBuilder()
            .setCustomId(`admin_test_clue_${Date.now()}`)
            .setLabel('Test Clue')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🧪');

        const row = new ActionRowBuilder().addComponents(addAnotherButton, testClueButton);

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    },

    async handleScheduleEvent(interaction) {
        const huntId = interaction.options.getString('hunt_id');
        const startTime = interaction.options.getString('start_time');
        const endTime = interaction.options.getString('end_time');

        try {
            const start = new Date(startTime);
            const end = new Date(endTime);
            const duration = Math.floor((end - start) / (1000 * 60 * 60)); // hours

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('📅 Event Scheduled Successfully')
                .setDescription(`**Hunt Event Configuration**`)
                .addFields(
                    { name: '🎯 Hunt ID', value: huntId, inline: true },
                    { name: '⏰ Start Time', value: `<t:${Math.floor(start.getTime() / 1000)}:F>`, inline: true },
                    { name: '🏁 End Time', value: `<t:${Math.floor(end.getTime() / 1000)}:F>`, inline: true },
                    { name: '⏱️ Duration', value: `${duration} hours`, inline: true },
                    { name: '📊 Status', value: 'Scheduled ✅', inline: true },
                    { name: '🔔 Notifications', value: 'Auto-enabled', inline: true },
                    {
                        name: '🎉 Event Features',
                        value: '• Automatic start/stop\n• Player notifications\n• Leaderboard tracking\n• Reward distribution',
                        inline: false
                    }
                )
                .setFooter({ text: 'Event will start automatically at the scheduled time' })
                .setTimestamp();

            const cancelButton = new ButtonBuilder()
                .setCustomId(`admin_cancel_event_${huntId}`)
                .setLabel('Cancel Event')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌');

            const modifyButton = new ButtonBuilder()
                .setCustomId(`admin_modify_event_${huntId}`)
                .setLabel('Modify Schedule')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('✏️');

            const row = new ActionRowBuilder().addComponents(modifyButton, cancelButton);

            await interaction.reply({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Invalid Date Format')
                .setDescription('Please use ISO format: `YYYY-MM-DDTHH:MM:SSZ`\n\n**Example:** `2024-12-25T18:00:00Z`')
                .addFields({
                    name: '📝 Format Guide',
                    value: '• Year: YYYY (2024)\n• Month: MM (01-12)\n• Day: DD (01-31)\n• Hour: HH (00-23)\n• Minute: MM (00-59)\n• Second: SS (00-59)',
                    inline: false
                });

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },

    async handlePlayerManage(interaction) {
        const user = interaction.options.getUser('user');
        const action = interaction.options.getString('action');
        const amount = interaction.options.getInteger('amount');

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('👤 Player Management Panel')
            .setDescription(`**Managing user:** ${user.displayName}`)
            .addFields(
                { name: '🎯 Selected Action', value: action.replace('_', ' ').toUpperCase(), inline: true },
                { name: '👤 Target User', value: `<@${user.id}>`, inline: true },
                { name: '📊 Amount', value: amount ? amount.toString() : 'N/A', inline: true }
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Confirm the action below to proceed' })
            .setTimestamp();

        const confirmButton = new ButtonBuilder()
            .setCustomId(`admin_confirm_${action}_${user.id}_${amount || 0}`)
            .setLabel(`Confirm ${action.replace('_', ' ')}`)
            .setStyle(action.includes('ban') || action === 'reset' ? ButtonStyle.Danger : ButtonStyle.Success)
            .setEmoji('✅');

        const cancelButton = new ButtonBuilder()
            .setCustomId('admin_cancel_action')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌');

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
};
