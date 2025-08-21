
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('house')
        .setDescription('🏠 Manage your personal house and property')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your house details and status'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('upgrade')
                .setDescription('Upgrade your house size or style')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('What to upgrade')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Size - Add more room slots', value: 'size' },
                            { name: 'Style - Change house appearance', value: 'style' },
                            { name: 'Foundation - Strengthen structure', value: 'foundation' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('purchase')
                .setDescription('Purchase a new house or property')
                .addStringOption(option =>
                    option.setName('location')
                        .setDescription('Where to build your house')
                        .setRequired(true)
                        .addChoices(
                            { name: '🌳 Forest Grove - Peaceful and nature-friendly', value: 'forest' },
                            { name: '🏔️ Mountain Peak - Scenic but challenging', value: 'mountain' },
                            { name: '🏖️ Coastal Bay - Beach access and fishing', value: 'coastal' },
                            { name: '🏜️ Desert Oasis - Rare but valuable location', value: 'desert' },
                            { name: '🏰 Castle District - Prestigious noble area', value: 'castle' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('visit')
                .setDescription('Visit another player\'s house')
                .addUserOption(option =>
                    option.setName('player')
                        .setDescription('Player whose house to visit')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check house maintenance and condition'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('furnish')
                .setDescription('Add furniture and decorations to your house')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first! Use `/profile` to get started.',
                    ephemeral: true
                });
                return;
            }

            // Initialize housing data
            if (!player.housing) {
                player.housing = {
                    owned: false,
                    location: null,
                    style: 'cottage',
                    size: 1,
                    maxRooms: 4,
                    condition: 100,
                    rooms: [],
                    furniture: [],
                    visitors: 0,
                    lastMaintenance: Date.now(),
                    value: 0
                };
            }

            const houseStyles = {
                cottage: { name: 'Cozy Cottage', cost: 5000, rooms: 4, emoji: '🏘️' },
                villa: { name: 'Grand Villa', cost: 15000, rooms: 8, emoji: '🏛️' },
                manor: { name: 'Noble Manor', cost: 35000, rooms: 12, emoji: '🏰' },
                castle: { name: 'Royal Castle', cost: 75000, rooms: 20, emoji: '🏰' },
                tower: { name: 'Wizard Tower', cost: 50000, rooms: 10, emoji: '🗼' }
            };

            const locations = {
                forest: { name: 'Forest Grove', bonus: 'Nature affinity +10%', cost: 2000, emoji: '🌳' },
                mountain: { name: 'Mountain Peak', bonus: 'Mining efficiency +15%', cost: 4000, emoji: '🏔️' },
                coastal: { name: 'Coastal Bay', bonus: 'Fishing success +20%', cost: 3000, emoji: '🏖️' },
                desert: { name: 'Desert Oasis', bonus: 'Heat resistance +25%', cost: 6000, emoji: '🏜️' },
                castle: { name: 'Castle District', bonus: 'Social status +30%', cost: 10000, emoji: '🏰' }
            };

            if (subcommand === 'view') {
                if (!player.housing.owned) {
                    const embed = new EmbedBuilder()
                        .setColor('#8B4513')
                        .setTitle('🏠 Housing Status')
                        .setDescription('╔════════════════════════════════════╗\n║          **No House Owned**        ║\n╚════════════════════════════════════╝\n\nYou don\'t own a house yet! Purchase one to begin your housing journey.')
                        .addFields(
                            {
                                name: '🏘️ **Available House Types**',
                                value: Object.entries(houseStyles).map(([key, style]) => 
                                    `${style.emoji} **${style.name}** - ${style.cost} coins (${style.rooms} rooms)`
                                ).join('\n'),
                                inline: false
                            },
                            {
                                name: '📍 **Prime Locations**',
                                value: Object.entries(locations).map(([key, loc]) => 
                                    `${loc.emoji} **${loc.name}** - ${loc.bonus}`
                                ).join('\n'),
                                inline: false
                            },
                            {
                                name: '💰 **Your Budget**',
                                value: `${player.coins || 0} coins available`,
                                inline: true
                            }
                        )
                        .setFooter({ text: 'Use /house purchase to buy your first home!' });

                    const purchaseButton = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('house_purchase_menu')
                                .setLabel('🏠 Purchase House')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId('house_tour')
                                .setLabel('🎯 Take Virtual Tour')
                                .setStyle(ButtonStyle.Secondary)
                        );

                    await interaction.editReply({ embeds: [embed], components: [purchaseButton] });
                    return;
                }

                const houseStyle = houseStyles[player.housing.style] || houseStyles.cottage;
                const houseLocation = locations[player.housing.location] || { name: 'Unknown', bonus: 'None', emoji: '❓' };
                
                const embed = new EmbedBuilder()
                    .setColor('#8B4513')
                    .setTitle(`${houseStyle.emoji} Your ${houseStyle.name}`)
                    .setDescription('╔════════════════════════════════════╗\n║        **House Overview**          ║\n╚════════════════════════════════════╝\n\nYour personal sanctuary and base of operations!')
                    .addFields(
                        {
                            name: '📍 **Location**',
                            value: `${houseLocation.emoji} ${houseLocation.name}\n*${houseLocation.bonus}*`,
                            inline: true
                        },
                        {
                            name: '🏠 **Property Details**',
                            value: `**Style:** ${houseStyle.name}\n**Size Level:** ${player.housing.size}\n**Condition:** ${player.housing.condition}%`,
                            inline: true
                        },
                        {
                            name: '🚪 **Room Statistics**',
                            value: `**Rooms:** ${player.housing.rooms.length}/${player.housing.maxRooms}\n**Furnished:** ${player.housing.furniture.length} items\n**Visitors:** ${player.housing.visitors}`,
                            inline: true
                        },
                        {
                            name: '💰 **Property Value**',
                            value: `Current worth: **${player.housing.value || (houseStyle.cost + 2000)} coins**\nLast maintenance: <t:${Math.floor(player.housing.lastMaintenance / 1000)}:R>`,
                            inline: false
                        }
                    );

                if (player.housing.rooms.length > 0) {
                    embed.addFields({
                        name: '🏠 **Your Rooms**',
                        value: player.housing.rooms.map(room => 
                            `${this.getRoomEmoji(room.type)} **${room.type}** (Level ${room.level})`
                        ).join('\n'),
                        inline: false
                    });
                }

                const managementButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('house_upgrade_menu')
                            .setLabel('⬆️ Upgrade')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('house_maintenance')
                            .setLabel('🔧 Maintenance')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('house_furniture')
                            .setLabel('🛋️ Furnish')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('house_visitors')
                            .setLabel('👥 Guests')
                            .setStyle(ButtonStyle.Secondary)
                    );

                await interaction.editReply({ embeds: [embed], components: [managementButtons] });

            } else if (subcommand === 'purchase') {
                if (player.housing.owned) {
                    await interaction.editReply({
                        content: '❌ You already own a house! Use `/house upgrade` to improve it.',
                        ephemeral: true
                    });
                    return;
                }

                const location = interaction.options.getString('location');
                const locationData = locations[location];
                const defaultStyle = houseStyles.cottage;
                const totalCost = locationData.cost + defaultStyle.cost;

                if (player.coins < totalCost) {
                    await interaction.editReply({
                        content: `❌ You need ${totalCost} coins to purchase this property! You have ${player.coins} coins.`,
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#32CD32')
                    .setTitle('🏠 Property Purchase')
                    .setDescription('╔════════════════════════════════════╗\n║        **Purchase Confirmation**   ║\n╚════════════════════════════════════╝')
                    .addFields(
                        {
                            name: '📍 **Location**',
                            value: `${locationData.emoji} **${locationData.name}**\n*Special Bonus: ${locationData.bonus}*`,
                            inline: false
                        },
                        {
                            name: '🏘️ **Starting House**',
                            value: `${defaultStyle.emoji} **${defaultStyle.name}**\nRooms: ${defaultStyle.rooms}\nExpandable: Yes`,
                            inline: true
                        },
                        {
                            name: '💰 **Total Cost**',
                            value: `Location: ${locationData.cost} coins\nHouse: ${defaultStyle.cost} coins\n**Total: ${totalCost} coins**`,
                            inline: true
                        },
                        {
                            name: '🎁 **Included**',
                            value: '• Basic furniture set\n• Maintenance tools\n• Property deed\n• Welcome bonus',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'This is a permanent purchase and cannot be undone!' });

                const confirmButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`house_confirm_purchase_${location}`)
                            .setLabel('🏠 Purchase Property')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('house_cancel_purchase')
                            .setLabel('❌ Cancel')
                            .setStyle(ButtonStyle.Danger)
                    );

                await interaction.editReply({ embeds: [embed], components: [confirmButtons] });

            } else if (subcommand === 'upgrade') {
                if (!player.housing.owned) {
                    await interaction.editReply({
                        content: '❌ You need to own a house first! Use `/house purchase` to buy one.',
                        ephemeral: true
                    });
                    return;
                }

                const upgradeType = interaction.options.getString('type');
                
                if (upgradeType === 'size') {
                    const currentSize = player.housing.size;
                    const upgradeCost = currentSize * 5000;
                    const newMaxRooms = (currentSize + 1) * 4;

                    const embed = new EmbedBuilder()
                        .setColor('#FFD700')
                        .setTitle('📏 House Size Upgrade')
                        .setDescription('╔════════════════════════════════════╗\n║         **Size Expansion**         ║\n╚════════════════════════════════════╝')
                        .addFields(
                            {
                                name: '📊 **Current Stats**',
                                value: `Size Level: ${currentSize}\nMax Rooms: ${player.housing.maxRooms}\nUsed Rooms: ${player.housing.rooms.length}`,
                                inline: true
                            },
                            {
                                name: '⬆️ **After Upgrade**',
                                value: `Size Level: ${currentSize + 1}\nMax Rooms: ${newMaxRooms}\nNew Room Slots: +${newMaxRooms - player.housing.maxRooms}`,
                                inline: true
                            },
                            {
                                name: '💰 **Upgrade Cost**',
                                value: `${upgradeCost} coins\nYour coins: ${player.coins}`,
                                inline: false
                            }
                        );

                    if (player.coins >= upgradeCost) {
                        const upgradeButton = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('house_upgrade_size_confirm')
                                    .setLabel('⬆️ Upgrade Size')
                                    .setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                    .setCustomId('house_upgrade_cancel')
                                    .setLabel('❌ Cancel')
                                    .setStyle(ButtonStyle.Secondary)
                            );

                        await interaction.editReply({ embeds: [embed], components: [upgradeButton] });
                    } else {
                        embed.setColor('#E74C3C');
                        embed.addFields({
                            name: '❌ **Insufficient Funds**',
                            value: `You need ${upgradeCost - player.coins} more coins!`,
                            inline: false
                        });
                        await interaction.editReply({ embeds: [embed] });
                    }

                } else if (upgradeType === 'style') {
                    const currentStyle = player.housing.style;
                    const availableStyles = Object.entries(houseStyles).filter(([key]) => key !== currentStyle);

                    const embed = new EmbedBuilder()
                        .setColor('#9B59B6')
                        .setTitle('🎨 House Style Change')
                        .setDescription('╔════════════════════════════════════╗\n║        **Architectural Styles**    ║\n╚════════════════════════════════════╝\n\nChoose a new style for your house!')
                        .addFields(
                            {
                                name: `🏠 **Current Style**`,
                                value: `${houseStyles[currentStyle].emoji} **${houseStyles[currentStyle].name}**`,
                                inline: false
                            }
                        );

                    availableStyles.forEach(([key, style]) => {
                        embed.addFields({
                            name: `${style.emoji} **${style.name}**`,
                            value: `Cost: ${Math.floor(style.cost * 0.6)} coins\nRooms: ${style.rooms}`,
                            inline: true
                        });
                    });

                    const styleOptions = availableStyles.map(([key, style]) => ({
                        label: style.name,
                        value: key,
                        description: `${Math.floor(style.cost * 0.6)} coins - ${style.rooms} rooms`,
                        emoji: style.emoji
                    }));

                    const styleSelect = new StringSelectMenuBuilder()
                        .setCustomId('house_style_select')
                        .setPlaceholder('🎨 Choose new house style...')
                        .addOptions(styleOptions);

                    const row = new ActionRowBuilder().addComponents(styleSelect);

                    await interaction.editReply({ embeds: [embed], components: [row] });
                }

            } else if (subcommand === 'visit') {
                const targetUser = interaction.options.getUser('player');
                const targetPlayer = await db.getPlayer(targetUser.id);

                if (!targetPlayer || !targetPlayer.housing || !targetPlayer.housing.owned) {
                    await interaction.editReply({
                        content: `❌ ${targetUser.username} doesn't own a house or hasn't set up their housing yet!`,
                        ephemeral: true
                    });
                    return;
                }

                // Increment visitor count
                targetPlayer.housing.visitors = (targetPlayer.housing.visitors || 0) + 1;
                await db.updatePlayer(targetUser.id, targetPlayer);

                const houseStyle = houseStyles[targetPlayer.housing.style] || houseStyles.cottage;
                const houseLocation = locations[targetPlayer.housing.location] || { name: 'Unknown', emoji: '❓' };

                const embed = new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle(`🏠 Visiting ${targetUser.username}'s ${houseStyle.name}`)
                    .setDescription('╔════════════════════════════════════╗\n║           **House Visit**          ║\n╚════════════════════════════════════╝\n\nYou\'ve arrived at this beautiful property!')
                    .addFields(
                        {
                            name: '📍 **Location**',
                            value: `${houseLocation.emoji} ${houseLocation.name}`,
                            inline: true
                        },
                        {
                            name: '🏠 **Style**',
                            value: `${houseStyle.emoji} ${houseStyle.name}`,
                            inline: true
                        },
                        {
                            name: '🚪 **Rooms**',
                            value: `${targetPlayer.housing.rooms.length} rooms`,
                            inline: true
                        },
                        {
                            name: '🛋️ **Furnishing**',
                            value: `${targetPlayer.housing.furniture?.length || 0} items`,
                            inline: true
                        },
                        {
                            name: '👥 **Popularity**',
                            value: `${targetPlayer.housing.visitors} total visits`,
                            inline: true
                        },
                        {
                            name: '✨ **Condition**',
                            value: `${targetPlayer.housing.condition}% maintained`,
                            inline: true
                        }
                    );

                if (targetPlayer.housing.rooms.length > 0) {
                    embed.addFields({
                        name: '🏠 **Room Tour**',
                        value: targetPlayer.housing.rooms.map(room => 
                            `${this.getRoomEmoji(room.type)} **${room.type}** (Level ${room.level})`
                        ).join('\n'),
                        inline: false
                    });
                }

                const visitButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`house_compliment_${targetUser.id}`)
                            .setLabel('👍 Compliment House')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`house_invite_${targetUser.id}`)
                            .setLabel('📨 Request Tour')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('house_leave')
                            .setLabel('🚪 Leave')
                            .setStyle(ButtonStyle.Secondary)
                    );

                await interaction.editReply({ embeds: [embed], components: [visitButtons] });

            } else if (subcommand === 'status') {
                if (!player.housing.owned) {
                    await interaction.editReply({
                        content: '❌ You need to own a house first! Use `/house purchase` to buy one.',
                        ephemeral: true
                    });
                    return;
                }

                const condition = player.housing.condition;
                const daysSinceMaintenance = Math.floor((Date.now() - player.housing.lastMaintenance) / (1000 * 60 * 60 * 24));
                const maintenanceCost = Math.floor((100 - condition) * 10);

                const embed = new EmbedBuilder()
                    .setColor(condition > 80 ? '#32CD32' : condition > 50 ? '#FFD700' : '#E74C3C')
                    .setTitle('🔧 House Maintenance Status')
                    .setDescription('╔════════════════════════════════════╗\n║        **Property Condition**      ║\n╚════════════════════════════════════╝')
                    .addFields(
                        {
                            name: '🏠 **Overall Condition**',
                            value: `${this.getConditionEmoji(condition)} ${condition}%\n${this.getConditionDescription(condition)}`,
                            inline: true
                        },
                        {
                            name: '📅 **Last Maintenance**',
                            value: `${daysSinceMaintenance} days ago\n<t:${Math.floor(player.housing.lastMaintenance / 1000)}:R>`,
                            inline: true
                        },
                        {
                            name: '💰 **Repair Cost**',
                            value: `${maintenanceCost} coins\nYour coins: ${player.coins}`,
                            inline: true
                        }
                    );

                if (condition < 100) {
                    const maintenanceButton = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('house_maintenance_full')
                                .setLabel(`🔧 Full Repair (${maintenanceCost} coins)`)
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(player.coins < maintenanceCost),
                            new ButtonBuilder()
                                .setCustomId('house_maintenance_basic')
                                .setLabel(`🔨 Basic Repair (${Math.floor(maintenanceCost / 2)} coins)`)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(player.coins < Math.floor(maintenanceCost / 2))
                        );

                    await interaction.editReply({ embeds: [embed], components: [maintenanceButton] });
                } else {
                    embed.addFields({
                        name: '✅ **Perfect Condition**',
                        value: 'Your house is in excellent condition! No repairs needed.',
                        inline: false
                    });
                    await interaction.editReply({ embeds: [embed] });
                }

            } else if (subcommand === 'furnish') {
                if (!player.housing.owned) {
                    await interaction.editReply({
                        content: '❌ You need to own a house first! Use `/house purchase` to buy one.',
                        ephemeral: true
                    });
                    return;
                }

                const furnitureShop = {
                    basic: [
                        { name: 'Wooden Chair', cost: 50, category: 'seating', emoji: '🪑' },
                        { name: 'Simple Table', cost: 100, category: 'furniture', emoji: '🪑' },
                        { name: 'Basic Bed', cost: 200, category: 'bedroom', emoji: '🛏️' },
                        { name: 'Storage Chest', cost: 150, category: 'storage', emoji: '📦' }
                    ],
                    premium: [
                        { name: 'Luxury Sofa', cost: 800, category: 'seating', emoji: '🛋️' },
                        { name: 'Mahogany Desk', cost: 1200, category: 'furniture', emoji: '🪑' },
                        { name: 'Royal Bed', cost: 2000, category: 'bedroom', emoji: '🛏️' },
                        { name: 'Magic Mirror', cost: 1500, category: 'decoration', emoji: '🪞' }
                    ]
                };

                const embed = new EmbedBuilder()
                    .setColor('#8B4513')
                    .setTitle('🛋️ Furniture Shop')
                    .setDescription('╔════════════════════════════════════╗\n║         **Furnish Your Home**      ║\n╚════════════════════════════════════╝\n\nMake your house feel like home!')
                    .addFields(
                        {
                            name: '🪑 **Basic Furniture**',
                            value: furnitureShop.basic.map(item => 
                                `${item.emoji} **${item.name}** - ${item.cost} coins`
                            ).join('\n'),
                            inline: true
                        },
                        {
                            name: '✨ **Premium Collection**',
                            value: furnitureShop.premium.map(item => 
                                `${item.emoji} **${item.name}** - ${item.cost} coins`
                            ).join('\n'),
                            inline: true
                        },
                        {
                            name: '💰 **Your Budget**',
                            value: `${player.coins} coins available`,
                            inline: false
                        }
                    );

                const furnitureOptions = [
                    ...furnitureShop.basic.map(item => ({
                        label: `${item.name} (${item.cost} coins)`,
                        value: `furniture_basic_${furnitureShop.basic.indexOf(item)}`,
                        description: `${item.category} - Basic quality`,
                        emoji: item.emoji
                    })),
                    ...furnitureShop.premium.map(item => ({
                        label: `${item.name} (${item.cost} coins)`,
                        value: `furniture_premium_${furnitureShop.premium.indexOf(item)}`,
                        description: `${item.category} - Premium quality`,
                        emoji: item.emoji
                    }))
                ];

                const furnitureSelect = new StringSelectMenuBuilder()
                    .setCustomId('house_furniture_select')
                    .setPlaceholder('🛋️ Choose furniture to purchase...')
                    .addOptions(furnitureOptions);

                const row = new ActionRowBuilder().addComponents(furnitureSelect);

                await interaction.editReply({ embeds: [embed], components: [row] });
            }

        } catch (error) {
            console.error('Error in house command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing your house.',
                ephemeral: true
            });
        }
    },

    getRoomEmoji(roomType) {
        const emojis = {
            bedroom: '🛏️',
            kitchen: '🍳',
            living: '🛋️',
            study: '📚',
            workshop: '🔨',
            garden: '🌻'
        };
        return emojis[roomType] || '🏠';
    },

    getConditionEmoji(condition) {
        if (condition >= 90) return '✅';
        if (condition >= 70) return '🟢';
        if (condition >= 50) return '🟡';
        if (condition >= 30) return '🟠';
        return '🔴';
    },

    getConditionDescription(condition) {
        if (condition >= 90) return 'Excellent condition';
        if (condition >= 70) return 'Good condition';
        if (condition >= 50) return 'Fair condition';
        if (condition >= 30) return 'Needs attention';
        return 'Urgent repairs needed';
    }
};
