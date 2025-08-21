const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

const upgradeMaterials = {
    common: { gold: 50, iron: 2 },
    uncommon: { gold: 100, iron: 4, gem: 1 },
    rare: { gold: 200, iron: 8, gem: 2 },
    epic: { gold: 400, iron: 16, gem: 4, crystal: 1 },
    legendary: { gold: 800, iron: 32, gem: 8, crystal: 2 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upgrade')
        .setDescription('⚔️ Upgrade your weapons and armor')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item to upgrade')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const itemName = interaction.options.getString('item');
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player || !player.inventory) {
                await interaction.editReply({
                    content: '❌ You don\'t have any items to upgrade!',
                    ephemeral: true
                });
                return;
            }

            const item = player.inventory.equipment?.find(i => i.name.toLowerCase() === itemName.toLowerCase());
            if (!item) {
                await interaction.editReply({
                    content: '❌ You don\'t own this item!',
                    ephemeral: true
                });
                return;
            }

            if (item.level >= 10) {
                await interaction.editReply({
                    content: '✨ This item is already at maximum level!',
                    ephemeral: true
                });
                return;
            }

            const materials = upgradeMaterials[item.rarity];
            const missingMaterials = [];
            
            for (const [material, amount] of Object.entries(materials)) {
                const playerAmount = player.inventory.materials?.[material] || 0;
                if (playerAmount < amount) {
                    missingMaterials.push(`${material} (${playerAmount}/${amount})`);
                }
            }

            const embed = new EmbedBuilder()
                .setColor('#9932CC')
                .setTitle('⚔️ Blacksmith Upgrade Service')
                .setDescription(`Upgrade ${item.name} to level ${item.level + 1}?`)
                .addFields(
                    { name: 'Current Level', value: item.level.toString(), inline: true },
                    { name: 'Success Rate', value: `${Math.max(100 - item.level * 10, 50)}%`, inline: true },
                    { name: 'Required Materials', value: Object.entries(materials)
                        .map(([mat, amt]) => `${mat}: ${amt}`).join('\n'), inline: false }
                );

            if (missingMaterials.length > 0) {
                embed.addFields({
                    name: '❌ Missing Materials',
                    value: missingMaterials.join('\n'),
                    inline: false
                });

                await interaction.editReply({
                    embeds: [embed]
                });
                return;
            }

            const confirm = new ButtonBuilder()
                .setCustomId('upgrade_confirm')
                .setLabel('Upgrade')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⚔️');

            const cancel = new ButtonBuilder()
                .setCustomId('upgrade_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder()
                .addComponents(confirm, cancel);

            const response = await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

            const filter = i => i.user.id === interaction.user.id;
            try {
                const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                if (confirmation.customId === 'upgrade_confirm') {
                    // Show upgrade progress animation
                    const progressEmbed = new EmbedBuilder()
                        .setColor('#9932CC')
                        .setTitle('🔮 Upgrading Equipment...')
                        .setDescription('Mystical energies flow through your equipment...')
                        .addFields(
                            { name: 'Phase 1', value: '🔥 Heating materials...', inline: false },
                            { name: 'Progress', value: '███░░░░░░░ 30%', inline: false }
                        );

                    await confirmation.update({ embeds: [progressEmbed], components: [] });

                    // Phase 2
                    setTimeout(async () => {
                        progressEmbed.setFields(
                            { name: 'Phase 2', value: '⚒️ Infusing magical essence...', inline: false },
                            { name: 'Progress', value: '██████░░░░ 60%', inline: false }
                        );
                        await interaction.editReply({ embeds: [progressEmbed] });
                    }, 1500);

                    // Final phase and result
                    setTimeout(async () => {
                        progressEmbed.setFields(
                            { name: 'Phase 3', value: '✨ Finalizing upgrade...', inline: false },
                            { name: 'Progress', value: '██████████ 100%', inline: false }
                        );
                        await interaction.editReply({ embeds: [progressEmbed] });

                        // Wait a moment then show results
                        setTimeout(async () => {
                            // Remove materials
                            for (const [material, amount] of Object.entries(materials)) {
                                player.inventory.materials[material] -= amount;
                            }

                            // Attempt upgrade
                            const successRate = Math.max(100 - item.level * 10, 50);
                            const success = Math.random() * 100 <= successRate;

                            if (success) {
                                const oldAttack = item.attack;
                                const oldDefense = item.defense;

                                item.level += 1;
                                item.attack = Math.floor(item.attack * 1.2);
                                item.defense = Math.floor(item.defense * 1.2);

                                const successEmbed = new EmbedBuilder()
                                    .setColor('#FFD700')
                                    .setTitle('🌟 Upgrade Successful!')
                                    .setDescription(`Your **${item.name}** radiates with newfound power!`)
                                    .addFields(
                                        { name: '⬆️ New Level', value: `${item.level}`, inline: true },
                                        { name: '⚔️ Attack Power', value: `${oldAttack} → **${item.attack}** (+${item.attack - oldAttack})`, inline: true },
                                        { name: '🛡️ Defense Power', value: `${oldDefense} → **${item.defense}** (+${item.defense - oldDefense})`, inline: true },
                                        { name: '✨ Special Effect', value: item.level >= 5 ? 'Glowing Aura Activated!' : 'Enhanced Durability', inline: false }
                                    )
                                    .setFooter({ text: `Next upgrade chance: ${Math.max(100 - item.level * 10, 50)}%` });

                                await db.updatePlayer(userId, player);
                                await interaction.editReply({ embeds: [successEmbed], components: [] });
                            } else {
                                const failEmbed = new EmbedBuilder()
                                    .setColor('#8B0000')
                                    .setTitle('💔 Upgrade Failed')
                                    .setDescription('The mystical energies were too unstable...')
                                    .addFields(
                                        { name: '⚠️ Result', value: 'The upgrade attempt failed, but your item remains intact', inline: false },
                                        { name: '📉 Materials Lost', value: Object.entries(materials)
                                            .map(([mat, amt]) => `${mat}: ${amt}`).join('\n'), inline: true },
                                        { name: '🎯 Next Attempt', value: `Success chance: ${Math.max(100 - item.level * 10, 50)}%`, inline: true },
                                        { name: '💡 Tip', value: 'Consider using enhancement crystals to improve success rates', inline: false }
                                    );

                                await db.updatePlayer(userId, player);
                                await interaction.editReply({ embeds: [failEmbed], components: [] });
                            }
                        }, 1000);
                    }, 1500);
                } else {
                    await confirmation.update({
                        content: '❌ Upgrade cancelled.',
                        embeds: [],
                        components: []
                    });
                }
            } catch (e) {
                await interaction.editReply({
                    content: '❌ Upgrade offer expired.',
                    embeds: [],
                    components: []
                });
            }

        } catch (error) {
            console.error('Error in upgrade command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while upgrading the item.',
                ephemeral: true
            });
        }
    },
};