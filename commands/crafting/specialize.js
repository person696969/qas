
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const SPECIALIZATIONS = {
    weaponsmith: {
        name: '⚔️ Weaponsmith',
        description: 'Master of crafting deadly weapons and tools of war',
        bonuses: {
            weapon_damage: 25,
            weapon_durability: 30,
            critical_craft_chance: 15
        },
        skills: ['Blade Forging', 'Handle Crafting', 'Enchantment Infusion', 'Masterwork Creation'],
        requirements: { crafting_level: 10, items_crafted: 50 },
        cost: 2500,
        emoji: '⚔️'
    },
    armorsmith: {
        name: '🛡️ Armorsmith',
        description: 'Expert in creating protective gear and defensive equipment',
        bonuses: {
            armor_defense: 25,
            armor_durability: 35,
            set_bonus_chance: 20
        },
        skills: ['Plate Smithing', 'Chain Weaving', 'Padding Craft', 'Reinforcement'],
        requirements: { crafting_level: 10, items_crafted: 50 },
        cost: 2500,
        emoji: '🛡️'
    },
    alchemist: {
        name: '🧪 Master Alchemist',
        description: 'Creator of powerful potions and magical concoctions',
        bonuses: {
            potion_potency: 40,
            brew_success_rate: 25,
            rare_ingredient_chance: 15
        },
        skills: ['Essence Extraction', 'Compound Mixing', 'Catalyst Creation', 'Elixir Mastery'],
        requirements: { alchemy_level: 8, potions_brewed: 30 },
        cost: 2000,
        emoji: '🧪'
    },
    enchanter: {
        name: '✨ Enchanter',
        description: 'Weaver of magical energies into mundane objects',
        bonuses: {
            enchantment_power: 30,
            multi_enchant_chance: 10,
            mana_efficiency: 20
        },
        skills: ['Rune Inscription', 'Magical Channeling', 'Aura Manipulation', 'Spell Binding'],
        requirements: { magic_level: 12, enchantments_made: 25 },
        cost: 3000,
        emoji: '✨'
    },
    jewelcrafter: {
        name: '💎 Master Jewelcrafter',
        description: 'Artisan of precious gems and mystical accessories',
        bonuses: {
            gem_quality: 35,
            socket_success_rate: 20,
            precious_find_rate: 15
        },
        skills: ['Gem Cutting', 'Setting Mastery', 'Precious Identification', 'Mystical Infusion'],
        requirements: { crafting_level: 8, gems_cut: 40 },
        cost: 2200,
        emoji: '💎'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('specialize')
        .setDescription('🎯 Choose a crafting specialization to unlock advanced abilities')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View available specializations and your current progress'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('choose')
                .setDescription('Select a specialization path')
                .addStringOption(option =>
                    option.setName('specialization')
                        .setDescription('Choose your specialization')
                        .setRequired(true)
                        .addChoices(
                            { name: '⚔️ Weaponsmith', value: 'weaponsmith' },
                            { name: '🛡️ Armorsmith', value: 'armorsmith' },
                            { name: '🧪 Master Alchemist', value: 'alchemist' },
                            { name: '✨ Enchanter', value: 'enchanter' },
                            { name: '💎 Master Jewelcrafter', value: 'jewelcrafter' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('progress')
                .setDescription('View your specialization progress and skills'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset your specialization (costs 5000 coins)')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;
            
            const player = await db.getPlayer(userId) || {
                coins: 100,
                specialization: null,
                specialization_progress: {},
                crafting_stats: { items_crafted: 0, level: 1 }
            };

            if (subcommand === 'view') {
                const embed = new EmbedBuilder()
                    .setColor('#8A2BE2')
                    .setTitle('🎯 Crafting Specializations')
                    .setDescription('**Master Your Craft - Choose Your Path**\n\nSpecialize in a crafting discipline to unlock powerful bonuses and unique abilities!')
                    .addFields(
                        { name: '📊 Your Status', value: player.specialization ? `Current: ${SPECIALIZATIONS[player.specialization]?.name || 'Unknown'}` : 'No Specialization', inline: true },
                        { name: '💰 Your Coins', value: `${player.coins.toLocaleString()}`, inline: true },
                        { name: '🔨 Crafting Level', value: `${player.crafting_stats?.level || 1}`, inline: true }
                    );

                Object.entries(SPECIALIZATIONS).forEach(([key, spec]) => {
                    const meetsRequirements = checkRequirements(player, spec.requirements);
                    const statusIcon = meetsRequirements ? '✅' : '❌';
                    
                    embed.addFields({
                        name: `${spec.emoji} ${spec.name} ${statusIcon}`,
                        value: `${spec.description}\n**Cost:** ${spec.cost} coins\n**Requirements:** Level ${spec.requirements.crafting_level || 1}`,
                        inline: true
                    });
                });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('specialize_select')
                    .setPlaceholder('Choose a specialization to learn more...')
                    .addOptions(
                        Object.entries(SPECIALIZATIONS).map(([key, spec]) => ({
                            label: spec.name,
                            description: spec.description.substring(0, 100),
                            value: key,
                            emoji: spec.emoji
                        }))
                    );

                const row = new ActionRowBuilder().addComponents(selectMenu);

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

            } else if (subcommand === 'choose') {
                const specializationKey = interaction.options.getString('specialization');
                const specialization = SPECIALIZATIONS[specializationKey];

                if (!specialization) {
                    await interaction.editReply({ content: '❌ Invalid specialization!', ephemeral: true });
                    return;
                }

                if (player.specialization) {
                    await interaction.editReply({ content: '❌ You already have a specialization! Use `/specialize reset` first.', ephemeral: true });
                    return;
                }

                if (!checkRequirements(player, specialization.requirements)) {
                    const reqText = Object.entries(specialization.requirements)
                        .map(([req, val]) => `${req.replace('_', ' ')}: ${val}`)
                        .join(', ');
                    await interaction.editReply({ content: `❌ Requirements not met: ${reqText}`, ephemeral: true });
                    return;
                }

                if (player.coins < specialization.cost) {
                    await interaction.editReply({ content: `❌ You need ${specialization.cost} coins to specialize!`, ephemeral: true });
                    return;
                }

                // Apply specialization
                player.coins -= specialization.cost;
                player.specialization = specializationKey;
                player.specialization_progress = {
                    level: 1,
                    experience: 0,
                    skills_unlocked: [],
                    mastery_points: 0
                };

                await db.updatePlayer(userId, player);

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🎉 Specialization Acquired!')
                    .setDescription(`Congratulations! You are now a **${specialization.name}**!`)
                    .addFields(
                        { name: '🎯 Your Path', value: specialization.description, inline: false },
                        { name: '💪 Bonuses Gained', value: Object.entries(specialization.bonuses).map(([bonus, value]) => `${bonus.replace('_', ' ')}: +${value}%`).join('\n'), inline: true },
                        { name: '📚 Available Skills', value: specialization.skills.slice(0, 2).join('\n') + '\n*More skills unlock as you progress*', inline: true },
                        { name: '💰 Remaining Coins', value: `${player.coins.toLocaleString()}`, inline: true }
                    )
                    .setFooter({ text: 'Use /specialize progress to track your advancement!' });

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'progress') {
                if (!player.specialization) {
                    await interaction.editReply({ content: '❌ You don\'t have a specialization yet!', ephemeral: true });
                    return;
                }

                const specialization = SPECIALIZATIONS[player.specialization];
                const progress = player.specialization_progress || { level: 1, experience: 0, skills_unlocked: [], mastery_points: 0 };

                const embed = new EmbedBuilder()
                    .setColor('#9932CC')
                    .setTitle(`${specialization.emoji} ${specialization.name} Progress`)
                    .setDescription(`Your journey as a **${specialization.name}** continues!`)
                    .addFields(
                        { name: '📊 Level & Experience', value: `Level: ${progress.level}\nExp: ${progress.experience}/1000\nMastery Points: ${progress.mastery_points}`, inline: true },
                        { name: '💪 Active Bonuses', value: Object.entries(specialization.bonuses).map(([bonus, value]) => `${bonus.replace('_', ' ')}: +${value}%`).join('\n'), inline: true },
                        { name: '🎓 Skills Unlocked', value: progress.skills_unlocked.length > 0 ? progress.skills_unlocked.join('\n') : 'None yet', inline: true }
                    );

                const availableSkills = specialization.skills.filter(skill => !progress.skills_unlocked.includes(skill));
                if (availableSkills.length > 0) {
                    embed.addFields({
                        name: '🔓 Next Skills Available', value: availableSkills.slice(0, 3).join('\n'), inline: false
                    });
                }

                const practiceButton = new ButtonBuilder()
                    .setCustomId('specialize_practice')
                    .setLabel('Practice Skills')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💪');

                const masterButton = new ButtonBuilder()
                    .setCustomId('specialize_master')
                    .setLabel('Master Training')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🌟')
                    .setDisabled(progress.mastery_points < 10);

                const row = new ActionRowBuilder().addComponents(practiceButton, masterButton);

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

            } else if (subcommand === 'reset') {
                if (!player.specialization) {
                    await interaction.editReply({ content: '❌ You don\'t have a specialization to reset!', ephemeral: true });
                    return;
                }

                if (player.coins < 5000) {
                    await interaction.editReply({ content: '❌ You need 5000 coins to reset your specialization!', ephemeral: true });
                    return;
                }

                const confirmButton = new ButtonBuilder()
                    .setCustomId('specialize_reset_confirm')
                    .setLabel('Confirm Reset')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚠️');

                const cancelButton = new ButtonBuilder()
                    .setCustomId('specialize_reset_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

                const embed = new EmbedBuilder()
                    .setColor('#FF4500')
                    .setTitle('⚠️ Reset Specialization')
                    .setDescription(`Are you sure you want to reset your **${SPECIALIZATIONS[player.specialization].name}** specialization?`)
                    .addFields(
                        { name: '💰 Cost', value: '5000 coins', inline: true },
                        { name: '⚠️ Warning', value: 'All progress will be lost!', inline: true },
                        { name: '✅ Benefit', value: 'Can choose a new specialization', inline: true }
                    );

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });
            }

        } catch (error) {
            console.error('Error in specialize command:', error);
            await interaction.editReply({
                content: '❌ An error occurred with the specialization system.',
                ephemeral: true
            });
        }
    },
};

function checkRequirements(player, requirements) {
    for (const [req, value] of Object.entries(requirements)) {
        if (req === 'crafting_level' && (player.crafting_stats?.level || 1) < value) return false;
        if (req === 'items_crafted' && (player.crafting_stats?.items_crafted || 0) < value) return false;
        if (req === 'alchemy_level' && (player.alchemy_stats?.level || 1) < value) return false;
        if (req === 'magic_level' && (player.magic_stats?.level || 1) < value) return false;
    }
    return true;
}
