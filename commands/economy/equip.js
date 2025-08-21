
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');
const { handleError } = require('../../utils/errorHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('equip')
        .setDescription('⚔️ Equip items from your inventory for enhanced performance!')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item name or ID to equip')
                .setRequired(false)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('slot')
                .setDescription('Equipment slot to equip item to')
                .setRequired(false)
                .addChoices(
                    { name: '⚔️ Weapon', value: 'weapon' },
                    { name: '🛡️ Armor', value: 'armor' },
                    { name: '💍 Accessory', value: 'accessory' },
                    { name: '🔧 Tool', value: 'tool' },
                    { name: '👢 Boots', value: 'boots' }
                )),

    async execute(interaction) {
        try {
            const itemQuery = interaction.options?.getString('item');
            const slotFilter = interaction.options?.getString('slot');

            if (itemQuery) {
                await this.equipSpecificItem(interaction, itemQuery);
            } else {
                await this.showEquipmentInterface(interaction, slotFilter);
            }
        } catch (error) {
            await handleError(interaction, error);
        }
    },

    async showEquipmentInterface(interaction, slotFilter) {
        const userData = await db.getPlayer(interaction.user.id);
        if (!userData) {
            return await interaction.reply({
                content: '❌ You don\'t have a profile yet! Use `/daily` to get started.',
                ephemeral: true
            });
        }

        userData.inventory = userData.inventory || { items: [] };
        userData.equipment = userData.equipment || {};
        userData.stats = userData.stats || {};

        // Get equipable items
        const equipableItems = this.getEquipableItems(userData.inventory.items, slotFilter);
        const currentEquipment = this.getCurrentEquipment(userData.equipment);

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.equipment || '#8B4513')
            .setTitle('⚔️ Equipment Management')
            .setDescription('**Manage your gear and optimize your character build!**\n*Equip powerful items to enhance your abilities.*')
            .setThumbnail(interaction.user.displayAvatarURL());

        // Current equipment status
        if (Object.keys(currentEquipment).length > 0) {
            const equipmentDisplay = Object.entries(currentEquipment)
                .map(([slot, item]) => `${this.getSlotIcon(slot)} **${slot}:** ${item ? item.name : '*Empty*'}`)
                .join('\n');

            embed.addFields([{
                name: '🎽 Currently Equipped',
                value: equipmentDisplay,
                inline: false
            }]);
        }

        // Character stats
        const stats = this.calculateTotalStats(userData);
        embed.addFields([
            {
                name: '📊 Character Stats',
                value: `⚔️ **Attack:** ${stats.attack}\n🛡️ **Defense:** ${stats.defense}\n❤️ **Health:** ${stats.health}\n⚡ **Speed:** ${stats.speed}`,
                inline: true
            },
            {
                name: '🎯 Equipment Bonus',
                value: `💪 **Power:** +${stats.equipmentBonus}%\n🍀 **Luck:** +${stats.luckBonus}\n⭐ **Efficiency:** +${stats.efficiencyBonus}%`,
                inline: true
            },
            {
                name: '📦 Available Items',
                value: equipableItems.length > 0 ? 
                    `${equipableItems.length} item(s) ready to equip` : 
                    'No equipable items in inventory',
                inline: true
            }
        ]);

        const components = [];

        // Equipment slot select menu
        if (equipableItems.length > 0) {
            const itemSelect = new StringSelectMenuBuilder()
                .setCustomId('equip_item_select')
                .setPlaceholder('⚔️ Choose an item to equip...')
                .addOptions(equipableItems.slice(0, 25).map(item => ({
                    label: item.name,
                    description: `${item.type} - ${item.rarity} - ${this.getItemPower(item)} power`,
                    value: `equip_${item.id}`,
                    emoji: this.getTypeIcon(item.type)
                })));

            components.push(new ActionRowBuilder().addComponents(itemSelect));
        }

        // Management buttons
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('equip_auto')
                    .setLabel('🤖 Auto-Equip Best')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(equipableItems.length === 0),
                new ButtonBuilder()
                    .setCustomId('equip_compare')
                    .setLabel('⚖️ Compare Stats')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('equip_unequip_all')
                    .setLabel('📤 Unequip All')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('equip_optimize')
                    .setLabel('⚡ Optimize Build')
                    .setStyle(ButtonStyle.Success)
            );

        components.push(buttons);

        // Slot filter buttons if not filtering
        if (!slotFilter) {
            const slotButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('equip_filter_weapon')
                        .setLabel('⚔️ Weapons')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('equip_filter_armor')
                        .setLabel('🛡️ Armor')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('equip_filter_accessory')
                        .setLabel('💍 Accessories')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('equip_refresh')
                        .setLabel('🔄 Refresh')
                        .setStyle(ButtonStyle.Secondary)
                );

            components.push(slotButtons);
        }

        await interaction.reply({
            embeds: [embed],
            components: components
        });
    },

    async equipSpecificItem(interaction, itemQuery) {
        const userData = await db.getPlayer(interaction.user.id);
        if (!userData) {
            return await interaction.reply({
                content: '❌ You don\'t have a profile yet!',
                ephemeral: true
            });
        }

        userData.inventory = userData.inventory || { items: [] };
        userData.equipment = userData.equipment || {};

        // Find item in inventory
        const item = this.findItemInInventory(userData.inventory.items, itemQuery);
        
        if (!item) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.error || '#FF0000')
                .setTitle('❌ Item Not Found')
                .setDescription(`Could not find **${itemQuery}** in your inventory.`)
                .addFields([
                    { name: '💡 Tips', value: '• Check spelling\n• Use `/inventory` to see your items\n• Try using item ID instead', inline: false }
                ]);

            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (!this.isEquipable(item)) {
            return await interaction.reply({
                content: `❌ **${item.name}** cannot be equipped! Only weapons, armor, and accessories can be equipped.`,
                ephemeral: true
            });
        }

        // Check if slot is already occupied
        const targetSlot = this.getItemSlot(item);
        const currentItem = userData.equipment[targetSlot];

        // Calculate stat changes
        const statsBefore = this.calculateTotalStats(userData);
        
        // Simulate equipment change
        const tempEquipment = { ...userData.equipment };
        tempEquipment[targetSlot] = item;
        const statsAfter = this.calculateTotalStats({ ...userData, equipment: tempEquipment });

        const statChanges = this.getStatChanges(statsBefore, statsAfter);

        // Perform the equipment change
        if (currentItem) {
            // Unequip current item (add back to inventory)
            userData.inventory.items.push({
                id: currentItem.id,
                obtained: Date.now(),
                source: 'unequipped'
            });
        }

        // Remove item from inventory
        const itemIndex = userData.inventory.items.findIndex(invItem => invItem.id === item.id);
        if (itemIndex !== -1) {
            userData.inventory.items.splice(itemIndex, 1);
        }

        // Equip new item
        userData.equipment[targetSlot] = item;

        // Save changes
        await db.setPlayer(interaction.user.id, userData);

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.success || '#00FF00')
            .setTitle('⚔️ Equipment Updated!')
            .setDescription(`**${item.name}** equipped to ${targetSlot} slot!`)
            .addFields([
                {
                    name: '📊 Stat Changes',
                    value: statChanges.length > 0 ? statChanges.join('\n') : 'No stat changes',
                    inline: true
                },
                {
                    name: '🎽 Equipment Slot',
                    value: `${this.getSlotIcon(targetSlot)} **${targetSlot.charAt(0).toUpperCase() + targetSlot.slice(1)}**${currentItem ? `\n*(Replaced ${currentItem.name})*` : ''}`,
                    inline: true
                },
                {
                    name: '💎 Item Details',
                    value: `**Rarity:** ${item.rarity}\n**Type:** ${item.type}\n**Power:** ${this.getItemPower(item)}`,
                    inline: true
                }
            ]);

        if (currentItem) {
            embed.addFields([{
                name: '♻️ Previous Item',
                value: `**${currentItem.name}** returned to inventory`,
                inline: false
            }]);
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('equip_view_stats')
                    .setLabel('📊 View Full Stats')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('equip_manage')
                    .setLabel('⚔️ Manage Equipment')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`equip_unequip_${targetSlot}`)
                    .setLabel('📤 Unequip')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.reply({
            embeds: [embed],
            components: [buttons]
        });
    },

    // Helper methods
    getEquipableItems(inventoryItems, slotFilter) {
        const equipableTypes = ['weapon', 'armor', 'accessory', 'tool', 'boots'];
        
        return inventoryItems
            .filter(item => {
                const itemData = this.getItemData(item.id);
                if (!itemData) return false;
                
                const isEquipable = equipableTypes.includes(itemData.type);
                const matchesFilter = !slotFilter || itemData.type === slotFilter;
                
                return isEquipable && matchesFilter;
            })
            .map(item => this.getItemData(item.id))
            .filter(Boolean);
    },

    getCurrentEquipment(equipment) {
        const result = {};
        Object.entries(equipment).forEach(([slot, item]) => {
            result[slot] = item ? this.getItemData(item.id) : null;
        });
        return result;
    },

    findItemInInventory(inventoryItems, query) {
        const item = inventoryItems.find(invItem => {
            const itemData = this.getItemData(invItem.id);
            return itemData && (
                itemData.name.toLowerCase().includes(query.toLowerCase()) ||
                itemData.id === query.toLowerCase()
            );
        });
        
        return item ? this.getItemData(item.id) : null;
    },

    getItemData(itemId) {
        // This would integrate with your item database
        const items = {
            'iron_sword': { id: 'iron_sword', name: 'Iron Sword', type: 'weapon', rarity: 'common', stats: { attack: 15 } },
            'steel_armor': { id: 'steel_armor', name: 'Steel Armor', type: 'armor', rarity: 'uncommon', stats: { defense: 20 } },
            'magic_ring': { id: 'magic_ring', name: 'Magic Ring', type: 'accessory', rarity: 'rare', stats: { luck: 10 } }
        };
        return items[itemId];
    },

    isEquipable(item) {
        const equipableTypes = ['weapon', 'armor', 'accessory', 'tool', 'boots'];
        return equipableTypes.includes(item.type);
    },

    getItemSlot(item) {
        return item.type; // weapon -> weapon, armor -> armor, etc.
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
        let luckBonus = 0;
        let efficiencyBonus = 0;

        Object.values(equipment).forEach(item => {
            if (item && item.stats) {
                Object.entries(item.stats).forEach(([stat, value]) => {
                    if (totalStats[stat] !== undefined) {
                        totalStats[stat] += value;
                    }
                });
                equipmentBonus += this.getItemPower(item);
                if (item.stats.luck) luckBonus += item.stats.luck;
            }
        });

        return {
            ...totalStats,
            equipmentBonus: Math.floor(equipmentBonus / 10),
            luckBonus,
            efficiencyBonus: Math.floor(equipmentBonus / 20)
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

    getTypeIcon(type) {
        return this.getSlotIcon(type);
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
