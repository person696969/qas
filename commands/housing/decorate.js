const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('decorate')
        .setDescription('Decorate your house with furniture and decorations')
        .addStringOption(option =>
            option
                .setName('item')
                .setDescription('The decoration item to place')
                .setRequired(false)
                .addChoices(
                    { name: 'Painting', value: 'painting' },
                    { name: 'Carpet', value: 'carpet' },
                    { name: 'Chandelier', value: 'chandelier' },
                    { name: 'Bookshelf', value: 'bookshelf' },
                    { name: 'Fireplace', value: 'fireplace' }
                ))
        .addStringOption(option =>
            option
                .setName('room')
                .setDescription('Which room to decorate')
                .setRequired(false)
                .addChoices(
                    { name: 'Living Room', value: 'living_room' },
                    { name: 'Bedroom', value: 'bedroom' },
                    { name: 'Kitchen', value: 'kitchen' },
                    { name: 'Study', value: 'study' }
                )),

    async execute(interaction) {
        try {
            const item = interaction.options.getString('item');
            const room = interaction.options.getString('room');
            const player = await db.getPlayer(interaction.user.id);

            if (!player) {
                return await interaction.reply({
                    content: '❌ You need to start your adventure first! Use `/profile` to begin.',
                    flags: 64
                });
            }

            if (!player.house) {
                return await interaction.reply({
                    content: '❌ You need to build a house first! Use `/build` to construct one.',
                    flags: 64
                });
            }

            if (!item && !room) {
                return await this.showDecorationMenu(interaction, player);
            }

            await this.decorateRoom(interaction, player, item, room);

        } catch (error) {
            console.error('Decorate command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while decorating your house.',
                flags: 64
            });
        }
    },

    async showDecorationMenu(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#DDA0DD')
            .setTitle('🏡 House Decoration')
            .setDescription('Choose how you want to decorate your house!')
            .addFields([
                { name: '🖼️ Available Decorations', value: 'Painting, Carpet, Chandelier, Bookshelf, Fireplace', inline: false },
                { name: '🏠 Available Rooms', value: 'Living Room, Bedroom, Kitchen, Study', inline: false },
                { name: '💰 Your Coins', value: `${player.coins || 0}`, inline: true }
            ])
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('decorate_painting')
                    .setLabel('Add Painting (100 coins)')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🖼️'),
                new ButtonBuilder()
                    .setCustomId('decorate_furniture')
                    .setLabel('Add Furniture (200 coins)')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🪑'),
                new ButtonBuilder()
                    .setCustomId('decorate_view')
                    .setLabel('View House')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👁️')
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    },

    async decorateRoom(interaction, player, item, room) {
        const decorationCosts = {
            painting: 100,
            carpet: 150,
            chandelier: 300,
            bookshelf: 200,
            fireplace: 500
        };

        const cost = decorationCosts[item] || 100;

        if (player.coins < cost) {
            return await interaction.reply({
                content: `❌ You need ${cost} coins to add a ${item}! You have ${player.coins} coins.`,
                flags: 64
            });
        }

        // Initialize house decorations if not exists
        if (!player.house.decorations) {
            player.house.decorations = {};
        }
        if (!player.house.decorations[room]) {
            player.house.decorations[room] = [];
        }

        // Add decoration
        player.house.decorations[room].push(item);
        player.coins -= cost;

        await db.updatePlayer(interaction.user.id, {
            coins: player.coins,
            house: player.house
        });

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✨ Decoration Added!')
            .setDescription(`You've successfully added a ${item} to your ${room.replace('_', ' ')}!`)
            .addFields([
                { name: '💰 Coins Spent', value: `${cost}`, inline: true },
                { name: '💰 Remaining Coins', value: `${player.coins}`, inline: true },
                { name: '🏠 Room', value: room.replace('_', ' '), inline: true }
            ])
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};