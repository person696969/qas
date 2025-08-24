
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('arenafight')
        .setDescription('Enter the arena for combat battles')
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('Choose an opponent to fight')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const opponent = interaction.options.getUser('opponent');
            const player = await db.getPlayer(interaction.user.id);

            if (!player) {
                return await interaction.reply({
                    content: '❌ You need to start your adventure first! Use `/profile` to begin.',
                    flags: 64
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#FF4500')
                .setTitle('🏟️ Arena Battle')
                .setDescription(opponent ? 
                    `${interaction.user.username} challenges ${opponent.username} to arena combat!` :
                    `${interaction.user.username} enters the arena looking for a worthy opponent!`)
                .addFields([
                    { name: 'Your Level', value: `${player.level || 1}`, inline: true },
                    { name: 'Your Health', value: `${player.health || 100}/${player.maxHealth || 100}`, inline: true },
                    { name: 'Arena Rules', value: 'First to 0 HP loses!', inline: false }
                ])
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('arena_fight_start')
                        .setLabel('Start Fight')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⚔️'),
                    new ButtonBuilder()
                        .setCustomId('arena_stats_view')
                        .setLabel('View Stats')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📊'),
                    new ButtonBuilder()
                        .setCustomId('arena_leave')
                        .setLabel('Leave Arena')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🚪')
                );

            await interaction.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Arena command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while entering the arena.',
                flags: 64
            });
        }
    }
};
