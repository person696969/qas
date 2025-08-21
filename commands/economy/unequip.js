
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');
const { handleError } = require('../../utils/errorHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unequip')
        .setDescription('📤 Unequip items from your equipment slots!')
        .addStringOption(option =>
            option.setName('slot')
                .setDescription('Equipment slot to unequip from')
                .setRequired(false)
                .addChoices(
                    { name: '⚔️ Weapon', value: 'weapon' },
                    { name: '🛡️ Armor', value: 'armor' },
                    { name: '💍 Accessory', value: 'accessory' },
                    { name: '🔧 Tool', value: 'tool' },
                    { name: '👢 Boots', value: 'boots' }
                ))
        .addBooleanOption(option =>
            option.setName('all')
                .setDescription('Unequip all items at once')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const slot = interaction.options?.getString('slot');
            const unequipAll = interaction.options?.getBoolean('all') || false;

            if (unequipAll) {
                await this.unequipAllItems(interaction);
            } else if (slot) {
                await this.unequipSpecificSlot(interaction, slot);
            } else {
                await this.showUnequipInterface(interaction);
            }
        } catch (error) {
            await handleError(interaction, error);
        }
    },

    async showUnequipInterface(interaction) {
        const userData = await db.getPlayer(interaction.user.id);
        if (!userData) {
            return await interaction.reply({
                content: '❌ You don\'t have a profile yet! Use `/daily` to get started.',
                ephemeral: true
            });
        }

        userData.equipment = userData.equipment || {};
        userData.inventory = userData.inventory || { items: [] };

        const equippedItems = this.getEquippedItems(userData.equipment);
        
        if (equippedItems.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.info || '#3498DB')
                .setTitle('📤 No Equipment to Unequip')
                .setDescription('You don\'t have any items equipped!')
                .addFields([
                    { name: '💡 Tips', value: '• Use `/equip` to equip items\n• Check `/inventory` for available equipment\n• Visit `/shop` to buy new gear', inline: false }
                ]);

            return await interaction.reply({ embeds: [embed] });
        }

        // Calculate current stats
        const currentStats = this.calculateTotalStats(userData);

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.equipment || '#8B4513')
            .setTitle('📤 Equipment Removal')
            .setDescription('**Manage your equipped items**\n*Remove items to return them to your inventory.*')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields([
                {
                    name: '🎽 Currently Equipped',
                    value: equippedItems.map(item => 
                        `${this.getSlotIcon(item.slot)} **${item.slot}:** ${item.name}`
                    ).join('\n'),
                    inline: false
                },
                {
                    name: '📊 Current Stats',
                    value: `⚔️ **Attack:** ${currentStats.attack}\n🛡️ **Defense:** ${currentStats.defense}\n❤️ **Health:** ${currentStats.health}\n⚡ **Speed:** ${currentStats.speed}`,
                    inline: true
                },
                {
                    name: '💎 Equipment Value',
                    value: `**Total Power:** ${currentStats.equipmentBonus}\n**Items Equipped:** ${equippedItems.length}\n**Bonus Effects:** ${this.getBonusEffects(equippedItems).length}`,
                    inline: true
                },
                {
                    name: '⚠️ Unequip Warning',
                    value: 'Removing equipment will reduce your combat effectiveness and abilities.',
                    inline: false
                }
            ]);

        const components = [];

        // Item selection menu
        if (equippedItems.length > 0) {
            const itemSelect = new StringSelectMenuBuilder()
                .setCustomId('unequip_item_select')
                .setPlaceholder('📤 Choose items to unequip...')
                .setMaxValues(Math.min(equippedItems.length, 5))
                .addOptions(equippedItems.map(item => ({
                    label: `${item.name} (${item.slot})`,
                    description: `${item.rarity} - Power: ${this.getItemPower(item)}`,
                    value: `unequip_${item.slot}`,
                    emoji: this.getSlotIcon(item.slot)
                })));

            components.push(new ActionRowBuilder().addComponents(itemSelect));
        }

        // Action buttons
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('unequip_all_confirm')
                    .setLabel('📤 Unequip All')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('unequip_preview')
                    .setLabel('👁️ Preview Changes')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('unequip_cancel')
                    .setLabel('❌ Cancel')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('equipment_manage')
                    .setLabel('⚔️ Manage Equipment')
                    .setStyle(ButtonStyle.Primary)
            );

        components.push(buttons);

        await interaction.reply({
            embeds: [embed],
            components: components
        });
    },

    async unequipSpecificSlot(interaction, slot) {
        const userData = await db.getPlayer(interaction.user.id);
        if (!userData) {
            return await interaction.reply({
                content: '❌ You don\'t have a profile yet!',
                ephemeral: true
            });
        }

        userData.equipment = userData.equipment || {};
        userData.inventory = userData.inventory || { items: [] };

        const equippedItem = userData.equipment[slot];
        
        if (!equippedItem) {
            return await interaction.reply({
                content: `❌ You don't have anything equipped in your **${slot}** slot!`,
                ephemeral: true
            });
        }

        // Calculate stat changes
        const statsBefore = this.calculateTotalStats(userData);
        
        // Simulate unequipping
        const tempEquipment = { ...userData.equipment };
        delete tempEquipment[slot];
        const statsAfter = this.calculateTotalStats({ ...userData, equipment: tempEquipment });

        const statChanges = this.getStatChanges(statsBefore, statsAfter);

        // Perform the unequip
        userData.inventory.items.push({
            id: equippedItem.id,
            obtained: Date.now(),
            source: 'unequipped'
        });

        delete userData.equipment[slot];

        // Save changes
        await db.setPlayer(interaction.user.id, userData);

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.success || '#00FF00')
            .setTitle('📤 Item Unequipped Successfully!')
            .setDescription(`**${equippedItem.name}** has been removed from your ${slot} slot.`)
            .addFields([
                {
                    name: '📦 Item Returned',
                    value: `**${equippedItem.name}** is now in your inventory`,
                    inline: true
                },
                {
                    name: '🎽 Equipment Slot',
                    value: `${this.getSlotIcon(slot)} **${slot}** is now empty`,
                    inline: true
                },
                {
                    name: '📊 Stat Changes',
                    value: statChanges.length > 0 ? statChanges.join('\n') : 'No stat changes',
                    inline: false
                }
            ])
            .setFooter({ text: 'Use /equip to equip items or /inventory to view your items' });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('unequip_another')
                    .setLabel('📤 Unequip Another')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('equip_item')
                    .setLabel('⚔️ Equip Different Item')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('inventory_view')
                    .setLabel('🎒 View Inventory')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [buttons]
        });
    },

    async unequipAllItems(interaction) {
        const userData = await db.getPlayer(interaction.user.id);
        if (!userData) {
            return await interaction.reply({
                content: '❌ You don\'t have a profile yet!',
                ephemeral: true
            });
        }

        userData.equipment = userData.equipment || {};
        userData.inventory = userData.inventory || { items: [] };

        const equippedItems = this.getEquippedItems(userData.equipment);
        
        if (equippedItems.length === 0) {
            return await interaction.reply({
                content: '❌ You don\'t have any items equipped!',
                ephemeral: true
            });
        }

        // Calculate stat changes
        const statsBefore = this.calculateTotalStats(userData);
        const statsAfter = this.calculateTotalStats({ ...userData, equipment: {} });
        const statChanges = this.getStatChanges(statsBefore, statsAfter);

        // Move all equipped items back to inventory
        Object.values(userData.equipment).forEach(item => {
            if (item) {
                userData.inventory.items.push({
                    id: item.id,
                    obtained: Date.now(),
                    source: 'unequipped'
                });
            }
        });

        userData.equipment = {};

        // Save changes
        await db.setPlayer(interaction.user.id, userData);

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.success || '#00FF00')
            .setTitle('📤 All Equipment Removed!')
            .setDescription(`**${equippedItems.length} items** have been unequipped and returned to your inventory.`)
            .addFields([
                {
                    name: '📦 Items Unequipped',
                    value: equippedItems.map(item => 
                        `${this.getSlotIcon(item.slot)} ${item.name}`
                    ).join('\n'),
                    inline: false
                },
                {
                    name: '📊 Total Stat Changes',
                    value: statChanges.length > 0 ? statChanges.join('\n') : 'No stat changes',
                    inline: false
                },
                {
                    name: '⚠️ Combat Warning',
                    value: 'Your combat effectiveness has been significantly reduced. Consider re-equipping items before battles!',
                    inline: false
                }
            ])
            .setFooter({ text: 'All equipment slots are now empty' });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('equip_auto_best')
                    .setLabel('🤖 Auto-Equip Best')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('equip_manual')
                    .setLabel('⚔️ Manual Equip')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('inventory_view')
                    .setLabel('🎒 View Inventory')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [buttons]
        });
    },

    // Helper methods
    getEquippedItems(equipment) {
        const items = [];
        Object.entries(equipment).forEach(([slot, item]) => {
            if (item) {
                items.push({
                    ...item,
                    slot: slot
                });
            }
        });
        return items;
    },

    calculateTotalStats(userData) {
        const baseStats = {
            attack: 10,
            defense: 5,
            health: 100,
            speed: 10,
            luck: 5
        };

        const equipment = userData.equipment || {};
        let totalStats = { ...baseStats };
        let equipmentBonus = 0;

        Object.values(equipment).forEach(item => {
            if (item && item.stats) {
                Object.entries(item.stats).forEach(([stat, value]) => {
                    if (totalStats[stat] !== undefined) {
                        totalStats[stat] += value;
                    }
                });
                equipmentBonus += this.getItemPower(item);
            }
        });

        return {
            ...totalStats,
            equipmentBonus: Math.floor(equipmentBonus / 10)
        };
    },

    getStatChanges(before, after) {
        const changes = [];
        const stats = ['attack', 'defense', 'health', 'speed', 'luck'];
        
        stats.forEach(stat => {
            const diff = after[stat] - before[stat];
            if (diff !== 0) {
                const icon = this.getStatIcon(stat);
                const arrow = diff > 0 ? '📈' : '📉';
                changes.push(`${icon} ${stat}: ${diff > 0 ? '+' : ''}${diff} ${arrow}`);
            }
        });

        return changes;
    },

    getBonusEffects(equippedItems) {
        // Return special effects from equipped items
        const effects = [];
        equippedItems.forEach(item => {
            if (item.effects) {
                effects.push(...item.effects);
            }
        });
        return effects;
    },

    getItemPower(item) {
        if (!item.stats) return 0;
        return Object.values(item.stats).reduce((sum, value) => sum + value, 0);
    },

    getSlotIcon(slot) {
        const icons = {
            weapon: '⚔️',
            armor: '🛡️',
            accessory: '💍',
            tool: '🔧',
            boots: '👢'
        };
        return icons[slot] || '📦';
    },

    getStatIcon(stat) {
        const icons = {
            attack: '⚔️',
            defense: '🛡️',
            health: '❤️',
            speed: '⚡',
            luck: '🍀'
        };
        return icons[stat] || '📊';
    }
};
