
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const tackleShop = {
    rods: {
        basic_rod: {
            name: 'Basic Fishing Rod',
            emoji: '🎣',
            price: 100,
            durability: 100,
            catchBonus: 1.0,
            description: 'A simple wooden fishing rod perfect for beginners',
            level: 1
        },
        carbon_rod: {
            name: 'Carbon Fiber Rod',
            emoji: '🎣',
            price: 500,
            durability: 200,
            catchBonus: 1.3,
            description: 'Lightweight and strong carbon fiber construction',
            level: 5
        },
        professional_rod: {
            name: 'Professional Rod',
            emoji: '🎣',
            price: 1500,
            durability: 350,
            catchBonus: 1.6,
            description: 'High-end rod used by professional anglers',
            level: 15
        },
        legendary_rod: {
            name: 'Legendary Poseidon Rod',
            emoji: '🔱',
            price: 5000,
            durability: 500,
            catchBonus: 2.0,
            description: 'Blessed by the sea god himself',
            level: 30
        }
    },
    bait: {
        worms: {
            name: 'Earthworms',
            emoji: '🪱',
            price: 10,
            quantity: 5,
            catchBonus: 1.1,
            description: 'Classic bait that works everywhere',
            level: 1
        },
        minnows: {
            name: 'Live Minnows',
            emoji: '🐟',
            price: 25,
            quantity: 3,
            catchBonus: 1.3,
            description: 'Live bait attracts bigger fish',
            level: 3
        },
        lures: {
            name: 'Spinning Lures',
            emoji: '🎯',
            price: 50,
            quantity: 2,
            catchBonus: 1.5,
            description: 'Shiny lures for active fishing',
            level: 8
        },
        magic_bait: {
            name: 'Enchanted Bait',
            emoji: '✨',
            price: 100,
            quantity: 1,
            catchBonus: 2.0,
            description: 'Magical bait that attracts rare fish',
            level: 20
        }
    },
    accessories: {
        tackle_box: {
            name: 'Tackle Box',
            emoji: '🧰',
            price: 200,
            effect: 'bait_storage',
            description: 'Increases bait storage capacity',
            level: 5
        },
        fishing_hat: {
            name: 'Lucky Fishing Hat',
            emoji: '🎩',
            price: 300,
            effect: 'luck_boost',
            description: '+15% chance for rare catches',
            level: 10
        },
        sonar: {
            name: 'Fish Finder Sonar',
            emoji: '📡',
            price: 800,
            effect: 'fish_detection',
            description: 'Shows fish locations and types',
            level: 15
        }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tackle')
        .setDescription('🎣 Visit the tackle shop for fishing equipment')
        .addSubcommand(subcommand =>
            subcommand
                .setName('shop')
                .setDescription('Browse the tackle shop'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('inventory')
                .setDescription('View your fishing equipment'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('repair')
                .setDescription('Repair your fishing equipment')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item to repair')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('upgrade')
                .setDescription('Upgrade your fishing equipment')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item to upgrade')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            let player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first!',
                    ephemeral: true
                });
                return;
            }

            // Initialize fishing data if it doesn't exist
            if (!player.fishing) {
                player.fishing = {
                    level: 1,
                    experience: 0,
                    equipment: {
                        rod: 'basic_rod',
                        bait: [],
                        accessories: []
                    },
                    catches: {},
                    totalCatches: 0
                };
            }

            switch (subcommand) {
                case 'shop':
                    await this.showShop(interaction, player);
                    break;
                case 'inventory':
                    await this.showInventory(interaction, player);
                    break;
                case 'repair':
                    await this.repairItem(interaction, player, interaction.options.getString('item'));
                    break;
                case 'upgrade':
                    await this.upgradeItem(interaction, player, interaction.options.getString('item'));
                    break;
            }

        } catch (error) {
            console.error('Error in tackle command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while accessing the tackle shop.',
                ephemeral: true
            });
        }
    },

    async showShop(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#4682B4')
            .setTitle('🎣 Captain\'s Tackle Shop')
            .setDescription('**Welcome to the finest fishing equipment store!**\n\n*"Catch the big one with the right gear!"*')
            .addFields(
                { name: '💰 Your Coins', value: player.coins.toString(), inline: true },
                { name: '🎣 Fishing Level', value: player.fishing.level.toString(), inline: true },
                { name: '🏪 Shop Categories', value: 'Use buttons below to browse', inline: true }
            )
            .setFooter({ text: 'Select a category to browse items' })
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_rods')
                    .setLabel('Fishing Rods')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎣'),
                new ButtonBuilder()
                    .setCustomId('shop_bait')
                    .setLabel('Bait & Lures')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🪱'),
                new ButtonBuilder()
                    .setCustomId('shop_accessories')
                    .setLabel('Accessories')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🧰')
            );

        const response = await interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });

        const filter = i => i.user.id === interaction.user.id;
        const collector = response.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async buttonInteraction => {
            try {
                const category = buttonInteraction.customId.split('_')[1];
                await this.showCategory(buttonInteraction, player, category);
            } catch (error) {
                console.error('Error in shop button interaction:', error);
            }
        });
    },

    async showCategory(interaction, player, category) {
        const items = tackleShop[category];
        const embed = new EmbedBuilder()
            .setColor('#4682B4')
            .setTitle(`🏪 ${category.charAt(0).toUpperCase() + category.slice(1)} Shop`)
            .setDescription(`Browse our selection of ${category}:`)
            .addFields({ name: '💰 Your Coins', value: player.coins.toString(), inline: true });

        const options = [];
        Object.entries(items).forEach(([key, item]) => {
            const canAfford = player.coins >= item.price;
            const levelReq = player.fishing.level >= item.level;
            const status = !canAfford ? '💸' : !levelReq ? '🔒' : '✅';

            embed.addFields({
                name: `${item.emoji} ${item.name} ${status}`,
                value: `**Price:** ${item.price} coins\n**Level Required:** ${item.level}\n*${item.description}*`,
                inline: true
            });

            if (canAfford && levelReq) {
                options.push({
                    label: item.name,
                    description: `${item.price} coins - ${item.description}`,
                    value: key,
                    emoji: item.emoji
                });
            }
        });

        const components = [];
        if (options.length > 0) {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`buy_${category}`)
                .setPlaceholder('Select an item to purchase')
                .addOptions(options);

            components.push(new ActionRowBuilder().addComponents(selectMenu));
        }

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_shop')
                    .setLabel('Back to Shop')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        components.push(backButton);

        await interaction.update({
            embeds: [embed],
            components: components
        });

        // Handle purchases
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.message.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async selectInteraction => {
            try {
                if (selectInteraction.customId === 'back_to_shop') {
                    await this.showShop(selectInteraction, player);
                    return;
                }

                if (selectInteraction.customId.startsWith('buy_')) {
                    const itemKey = selectInteraction.values[0];
                    await this.purchaseItem(selectInteraction, player, category, itemKey);
                }
            } catch (error) {
                console.error('Error in category interaction:', error);
            }
        });
    },

    async purchaseItem(interaction, player, category, itemKey) {
        const item = tackleShop[category][itemKey];
        
        if (player.coins < item.price) {
            await interaction.reply({
                content: '❌ You don\'t have enough coins!',
                ephemeral: true
            });
            return;
        }

        if (player.fishing.level < item.level) {
            await interaction.reply({
                content: `❌ You need fishing level ${item.level} to buy this item!`,
                ephemeral: true
            });
            return;
        }

        // Process purchase
        player.coins -= item.price;

        if (category === 'rods') {
            player.fishing.equipment.rod = itemKey;
        } else if (category === 'bait') {
            for (let i = 0; i < item.quantity; i++) {
                player.fishing.equipment.bait.push(itemKey);
            }
        } else if (category === 'accessories') {
            if (!player.fishing.equipment.accessories.includes(itemKey)) {
                player.fishing.equipment.accessories.push(itemKey);
            }
        }

        await db.updatePlayer(interaction.user.id, player);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Purchase Successful!')
            .setDescription(`You bought **${item.name}**!`)
            .addFields(
                { name: 'Cost', value: `${item.price} coins`, inline: true },
                { name: 'Remaining Coins', value: player.coins.toString(), inline: true }
            );

        if (category === 'bait') {
            embed.addFields({ name: 'Quantity', value: item.quantity.toString(), inline: true });
        }

        await interaction.update({
            embeds: [embed],
            components: []
        });
    },

    async showInventory(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('🎒 Fishing Equipment Inventory')
            .setDescription('Your current fishing gear:');

        // Current rod
        const currentRod = tackleShop.rods[player.fishing.equipment.rod];
        embed.addFields({
            name: '🎣 Current Rod',
            value: `${currentRod.emoji} **${currentRod.name}**\nCatch Bonus: +${Math.floor((currentRod.catchBonus - 1) * 100)}%\nDurability: ${currentRod.durability}`,
            inline: true
        });

        // Bait inventory
        const baitCounts = {};
        player.fishing.equipment.bait.forEach(bait => {
            baitCounts[bait] = (baitCounts[bait] || 0) + 1;
        });

        let baitText = '';
        if (Object.keys(baitCounts).length === 0) {
            baitText = 'No bait available';
        } else {
            Object.entries(baitCounts).forEach(([baitType, count]) => {
                const bait = tackleShop.bait[baitType];
                baitText += `${bait.emoji} ${bait.name}: ${count}\n`;
            });
        }

        embed.addFields({
            name: '🪱 Bait & Lures',
            value: baitText,
            inline: true
        });

        // Accessories
        let accessoryText = '';
        if (player.fishing.equipment.accessories.length === 0) {
            accessoryText = 'No accessories';
        } else {
            player.fishing.equipment.accessories.forEach(accessoryKey => {
                const accessory = tackleShop.accessories[accessoryKey];
                accessoryText += `${accessory.emoji} ${accessory.name}\n`;
            });
        }

        embed.addFields({
            name: '🧰 Accessories',
            value: accessoryText,
            inline: true
        });

        await interaction.editReply({ embeds: [embed] });
    },

    async repairItem(interaction, player, itemName) {
        // Implementation for repairing equipment
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🔧 Equipment Repair')
            .setDescription('Repair functionality coming soon!')
            .addFields({
                name: 'Available Soon',
                value: 'Equipment durability and repair system will be added in a future update.',
                inline: false
            });

        await interaction.editReply({ embeds: [embed] });
    },

    async upgradeItem(interaction, player, itemName) {
        // Implementation for upgrading equipment
        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('⚡ Equipment Upgrade')
            .setDescription('Upgrade functionality coming soon!')
            .addFields({
                name: 'Available Soon',
                value: 'Equipment upgrade system will be added in a future update.',
                inline: false
            });

        await interaction.editReply({ embeds: [embed] });
    }
};
