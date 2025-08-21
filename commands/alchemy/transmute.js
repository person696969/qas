const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

const transmutations = {
    basic: {
        'iron': { materials: { stone: 5 }, result: 1, cost: 25 },
        'gem': { materials: { crystal: 3 }, result: 1, cost: 100 },
        'essence': { materials: { gem: 2 }, result: 1, cost: 200 }
    },
    advanced: {
        'crystal': { materials: { gem: 1, stone: 10 }, result: 1, cost: 150 },
        'moonstone': { materials: { crystal: 2, essence: 1 }, result: 1, cost: 300 },
        'stardust': { materials: { moonstone: 1, essence: 2 }, result: 1, cost: 500 }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transmute')
        .setDescription('✨ Transform materials into rarer forms')
        .addStringOption(option =>
            option.setName('material')
                .setDescription('Material to create')
                .setRequired(true)
                .addChoices(
                    { name: 'Iron', value: 'iron' },
                    { name: 'Gem', value: 'gem' },
                    { name: 'Crystal', value: 'crystal' },
                    { name: 'Essence', value: 'essence' },
                    { name: 'Moonstone', value: 'moonstone' },
                    { name: 'Stardust', value: 'stardust' }
                ))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount to transmute')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const material = interaction.options.getString('material');
            const amount = interaction.options.getInteger('amount');
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first!',
                    ephemeral: true
                });
                return;
            }

            let recipe;
            let category;
            if (transmutations.basic[material]) {
                recipe = transmutations.basic[material];
                category = 'basic';
            } else {
                recipe = transmutations.advanced[material];
                category = 'advanced';
            }

            const totalCost = recipe.cost * amount;

            // Check if player has required alchemy level
            if (!player.skills?.alchemy || 
                (category === 'advanced' && player.skills.alchemy.level < 5)) {
                await interaction.editReply({
                    content: '❌ You need Alchemy level 5 for advanced transmutations!',
                    ephemeral: true
                });
                return;
            }

            // Check if player has enough materials
            const missingMaterials = [];
            for (const [mat, required] of Object.entries(recipe.materials)) {
                const playerAmount = player.inventory?.materials?.[mat] || 0;
                if (playerAmount < required * amount) {
                    missingMaterials.push(`${mat} (${playerAmount}/${required * amount})`);
                }
            }

            const embed = new EmbedBuilder()
                .setColor('#9400D3')
                .setTitle('✨ Material Transmutation Laboratory')
                .setDescription(`**Transform materials using ancient alchemy!**\n\nCreating ${amount}x **${material.charAt(0).toUpperCase() + material.slice(1)}**`)
                .addFields(
                    { 
                        name: '🧪 Required Materials', 
                        value: Object.entries(recipe.materials)
                            .map(([mat, amt]) => {
                                const playerAmount = player.inventory?.materials?.[mat] || 0;
                                const needed = amt * amount;
                                const status = playerAmount >= needed ? '✅' : '❌';
                                return `${status} **${mat}**: ${playerAmount}/${needed}`;
                            }).join('\n'), 
                        inline: true 
                    },
                    { 
                        name: '💰 Costs & Rewards', 
                        value: `**Cost:** ${totalCost} coins\n**Result:** ${amount * recipe.result}x ${material}\n**Category:** ${category === 'basic' ? 'Basic' : 'Advanced'}`, 
                        inline: true 
                    },
                    {
                        name: '📊 Your Resources',
                        value: `**Current Coins:** ${player.coins || 0}\n**Alchemy Level:** ${player.skills?.alchemy?.level || 1}\n**Experience:** ${player.skills?.alchemy?.exp || 0} XP`,
                        inline: true
                    }
                )
                .setFooter({ text: 'Advanced transmutations require Alchemy level 5+' })
                .setTimestamp();

            if (missingMaterials.length > 0) {
                embed.addFields({
                    name: '❌ Missing Materials',
                    value: missingMaterials.join('\n'),
                    inline: false
                });

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            if (player.coins < totalCost) {
                embed.addFields({
                    name: '❌ Insufficient Funds',
                    value: `You need ${totalCost - player.coins} more coins!`,
                    inline: false
                });

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const confirm = new ButtonBuilder()
                .setCustomId('transmute_confirm')
                .setLabel(`Transmute ${amount}x ${material}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✨');

            const cancel = new ButtonBuilder()
                .setCustomId('transmute_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌');

            const infoButton = new ButtonBuilder()
                .setCustomId('transmute_info')
                .setLabel('View Info')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('ℹ️');

            const row = new ActionRowBuilder()
                .addComponents(confirm, infoButton, cancel);

            const response = await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

            const filter = i => i.user.id === interaction.user.id;
            try {
                const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                if (confirmation.customId === 'transmute_confirm') {
                    // Remove materials and coins
                    for (const [mat, required] of Object.entries(recipe.materials)) {
                        player.inventory.materials[mat] -= required * amount;
                    }
                    player.coins -= totalCost;

                    // Add result
                    if (!player.inventory.materials) player.inventory.materials = {};
                    player.inventory.materials[material] = (player.inventory.materials[material] || 0) + (amount * recipe.result);

                    // Add alchemy experience
                    if (!player.skills) player.skills = {};
                    if (!player.skills.alchemy) player.skills.alchemy = { level: 1, exp: 0 };
                    const expGain = category === 'advanced' ? amount * 20 : amount * 10;
                    player.skills.alchemy.exp += expGain;

                    // Level up check
                    if (player.skills.alchemy.exp >= player.skills.alchemy.level * 100) {
                        player.skills.alchemy.level++;
                        player.skills.alchemy.exp = 0;
                    }

                    await db.updatePlayer(userId, player);

                    const successEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('✨ Transmutation Successful!')
                        .setDescription(`Created ${amount * recipe.result}x ${material}!`)
                        .addFields(
                            { name: 'Alchemy Level', value: player.skills.alchemy.level.toString(), inline: true },
                            { name: 'Experience Gained', value: `+${expGain} exp`, inline: true },
                            { name: 'Remaining Coins', value: player.coins.toString(), inline: true }
                        );

                    await confirmation.update({
                        embeds: [successEmbed],
                        components: []
                    });
                } else if (confirmation.customId === 'transmute_info') {
                    // Logic for info button would go here.
                    // For now, we'll just re-send the original embed and buttons, or handle it differently.
                    // For demonstration, let's just cancel and inform the user.
                    await confirmation.update({
                        content: 'ℹ️ View Info button clicked. More details can be added here.',
                        embeds: [embed], // Re-displaying the original embed
                        components: [row] // Re-displaying the buttons
                    });
                }
                else {
                    await confirmation.update({
                        content: '❌ Transmutation cancelled.',
                        embeds: [],
                        components: []
                    });
                }
            } catch (e) {
                console.error("Error awaiting message component:", e);
                await interaction.editReply({
                    content: '❌ Transmutation offer expired or an error occurred.',
                    embeds: [],
                    components: []
                });
            }

        } catch (error) {
            console.error('Error in transmute command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while performing the transmutation.',
                ephemeral: true
            });
        }
    },
};