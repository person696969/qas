
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bazaar')
        .setDescription('🏪 Trade and barter at the merchant bazaar with advanced features')
        .addSubcommand(subcommand =>
            subcommand
                .setName('browse')
                .setDescription('Browse merchant offerings with filters')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Filter by item category')
                        .addChoices(
                            { name: '⚔️ Weapons', value: 'weapon' },
                            { name: '🛡️ Armor', value: 'armor' },
                            { name: '💎 Accessories', value: 'accessory' },
                            { name: '🧪 Consumables', value: 'consumable' },
                            { name: '🔮 Materials', value: 'material' },
                            { name: '📦 All Items', value: 'all' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sell')
                .setDescription('Sell your items to merchants')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item to sell')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('How many to sell')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Purchase items from merchants')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item to purchase')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('How many to buy')
                        .setRequired(false)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('haggle')
                .setDescription('Attempt to negotiate better prices')
                .addStringOption(option =>
                    option.setName('merchant')
                        .setDescription('Which merchant to haggle with')
                        .setRequired(true)
                        .addChoices(
                            { name: '⚒️ Master Smith', value: 'blacksmith' },
                            { name: '🧪 Mystic Brewer', value: 'alchemist' },
                            { name: '💎 Gem Master', value: 'jeweler' },
                            { name: '🔮 Arcane Dealer', value: 'enchanter' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reputation')
                .setDescription('Check your standing with different merchants'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('auction')
                .setDescription('Participate in merchant auctions')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Auction action')
                        .addChoices(
                            { name: '👀 View Current Auctions', value: 'view' },
                            { name: '💰 Place Bid', value: 'bid' },
                            { name: '📦 List Item', value: 'list' }
                        ))),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first! Use `/profile create` to get started.',
                    ephemeral: true
                });
                return;
            }

            // Initialize merchant data if it doesn't exist
            if (!player.merchant) {
                player.merchant = {
                    reputation: {
                        blacksmith: 0,
                        alchemist: 0,
                        jeweler: 0,
                        enchanter: 0
                    },
                    lastHaggle: 0,
                    transactions: 0,
                    totalSpent: 0,
                    totalEarned: 0,
                    favoriteItems: [],
                    discounts: {},
                    vipStatus: false
                };
            }

            const merchants = {
                blacksmith: {
                    name: '⚒️ Master Smith Gareth',
                    specialty: 'Weapons & Armor',
                    personality: 'gruff',
                    location: 'Forge District',
                    items: [
                        { name: 'Iron Sword', cost: 150, type: 'weapon', rarity: 'common', stats: { attack: 25 } },
                        { name: 'Steel Blade', cost: 300, type: 'weapon', rarity: 'uncommon', stats: { attack: 45 } },
                        { name: 'Mithril Sword', cost: 750, type: 'weapon', rarity: 'rare', stats: { attack: 80 } },
                        { name: 'Leather Armor', cost: 120, type: 'armor', rarity: 'common', stats: { defense: 15 } },
                        { name: 'Chain Mail', cost: 280, type: 'armor', rarity: 'uncommon', stats: { defense: 30 } },
                        { name: 'Plate Armor', cost: 650, type: 'armor', rarity: 'rare', stats: { defense: 60 } }
                    ]
                },
                alchemist: {
                    name: '🧪 Mystic Brewer Elara',
                    specialty: 'Potions & Reagents',
                    personality: 'mysterious',
                    location: 'Arcane Quarter',
                    items: [
                        { name: 'Health Potion', cost: 50, type: 'consumable', rarity: 'common', effect: 'heal_50' },
                        { name: 'Greater Health Potion', cost: 120, type: 'consumable', rarity: 'uncommon', effect: 'heal_150' },
                        { name: 'Mana Elixir', cost: 80, type: 'consumable', rarity: 'common', effect: 'mana_100' },
                        { name: 'Stamina Boost', cost: 60, type: 'consumable', rarity: 'common', effect: 'stamina_50' },
                        { name: 'Dragon\'s Breath Poison', cost: 300, type: 'material', rarity: 'rare', uses: 'crafting' },
                        { name: 'Phoenix Feather', cost: 500, type: 'material', rarity: 'legendary', uses: 'enchanting' }
                    ]
                },
                jeweler: {
                    name: '💎 Gem Master Thalion',
                    specialty: 'Jewelry & Accessories',
                    personality: 'elegant',
                    location: 'Luxury Plaza',
                    items: [
                        { name: 'Silver Ring', cost: 200, type: 'accessory', rarity: 'common', stats: { luck: 5 } },
                        { name: 'Emerald Amulet', cost: 450, type: 'accessory', rarity: 'uncommon', stats: { mana: 25 } },
                        { name: 'Ruby Crown', cost: 800, type: 'accessory', rarity: 'rare', stats: { charisma: 15 } },
                        { name: 'Diamond Necklace', cost: 1200, type: 'accessory', rarity: 'epic', stats: { all: 10 } },
                        { name: 'Sapphire', cost: 150, type: 'material', rarity: 'uncommon', uses: 'crafting' },
                        { name: 'Perfect Diamond', cost: 1000, type: 'material', rarity: 'legendary', uses: 'enchanting' }
                    ]
                },
                enchanter: {
                    name: '🔮 Arcane Dealer Zephyr',
                    specialty: 'Magical Items & Scrolls',
                    personality: 'eccentric',
                    location: 'Mystic Emporium',
                    items: [
                        { name: 'Scroll of Teleport', cost: 100, type: 'consumable', rarity: 'uncommon', effect: 'teleport' },
                        { name: 'Wand of Fireballs', cost: 400, type: 'weapon', rarity: 'rare', stats: { magic_attack: 60 } },
                        { name: 'Cloak of Invisibility', cost: 600, type: 'armor', rarity: 'epic', stats: { stealth: 50 } },
                        { name: 'Crystal of Power', cost: 300, type: 'material', rarity: 'rare', uses: 'enchanting' },
                        { name: 'Spell Tome', cost: 250, type: 'consumable', rarity: 'uncommon', effect: 'learn_spell' },
                        { name: 'Ancient Rune', cost: 800, type: 'material', rarity: 'legendary', uses: 'crafting' }
                    ]
                }
            };

            switch (subcommand) {
                case 'browse':
                    await this.handleBrowse(interaction, player, merchants);
                    break;
                case 'sell':
                    await this.handleSell(interaction, player, merchants);
                    break;
                case 'buy':
                    await this.handleBuy(interaction, player, merchants);
                    break;
                case 'haggle':
                    await this.handleHaggle(interaction, player, merchants);
                    break;
                case 'reputation':
                    await this.handleReputation(interaction, player, merchants);
                    break;
                case 'auction':
                    await this.handleAuction(interaction, player);
                    break;
            }

        } catch (error) {
            console.error('Error in bazaar command:', error);
            await interaction.editReply({
                content: '❌ An error occurred at the bazaar. Please try again later.',
                ephemeral: true
            });
        }
    },

    async handleBrowse(interaction, player, merchants) {
        const category = interaction.options.getString('category') || 'all';
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏪 Grand Bazaar of Wonders')
            .setDescription('╔══════════════════════════════════════╗\n║     **WELCOME TO THE BAZAAR**        ║\n╚══════════════════════════════════════╝\n\n*Where merchants from across the realm gather to trade*')
            .setThumbnail('https://example.com/bazaar.png')
            .addFields({
                name: '💰 Your Wealth',
                value: `**Gold:** ${player.gold || 0}\n**Reputation:** ${this.getTotalReputation(player.merchant)}\n**VIP Status:** ${player.merchant.vipStatus ? '⭐ Active' : '❌ Inactive'}`,
                inline: true
            });

        // Filter items by category if specified
        Object.entries(merchants).forEach(([merchantKey, merchant]) => {
            let itemList = '';
            const filteredItems = category === 'all' ? 
                merchant.items : 
                merchant.items.filter(item => item.type === category);

            if (filteredItems.length === 0) return;

            filteredItems.slice(0, 3).forEach(item => {
                const reputation = player.merchant.reputation[merchantKey] || 0;
                const discount = this.calculateDiscount(reputation, player.merchant.vipStatus);
                const finalCost = Math.max(1, Math.floor(item.cost * (1 - discount)));
                const rarityEmoji = this.getRarityEmoji(item.rarity);
                
                itemList += `${rarityEmoji} **${item.name}**\n`;
                itemList += `   💰 ${finalCost} gold ${discount > 0 ? `(-${Math.round(discount * 100)}%)` : ''}\n`;
                if (item.stats) {
                    const statText = Object.entries(item.stats).map(([stat, value]) => `${stat}: +${value}`).join(', ');
                    itemList += `   📊 ${statText}\n`;
                }
                itemList += '\n';
            });

            if (itemList) {
                embed.addFields({
                    name: `${merchant.name} • ${merchant.location}`,
                    value: `*${merchant.specialty}*\n\n${itemList}`,
                    inline: false
                });
            }
        });

        // Create category filter dropdown
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('bazaar_category_filter')
            .setPlaceholder('🔍 Filter by category...')
            .addOptions([
                { label: '📦 All Items', value: 'all', emoji: '📦' },
                { label: 'Weapons', value: 'weapon', emoji: '⚔️' },
                { label: 'Armor', value: 'armor', emoji: '🛡️' },
                { label: 'Accessories', value: 'accessory', emoji: '💎' },
                { label: 'Consumables', value: 'consumable', emoji: '🧪' },
                { label: 'Materials', value: 'material', emoji: '🔮' }
            ]);

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('bazaar_buy_menu')
                    .setLabel('💰 Quick Buy')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('bazaar_sell_menu')
                    .setLabel('💸 Quick Sell')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('bazaar_haggle_menu')
                    .setLabel('🤝 Haggle')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('bazaar_auctions')
                    .setLabel('🏺 Auctions')
                    .setStyle(ButtonStyle.Danger)
            );

        const components = [
            new ActionRowBuilder().addComponents(categorySelect),
            actionButtons
        ];

        embed.setFooter({ text: '💡 Tip: Build reputation with merchants for better prices!' });

        await interaction.editReply({ embeds: [embed], components });
    },

    async handleSell(interaction, player, merchants) {
        const itemName = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');

        if (!player.inventory?.items) {
            await interaction.editReply({
                content: '❌ You don\'t have any items to sell! Go explore to find some items.',
                ephemeral: true
            });
            return;
        }

        const itemCount = player.inventory.items.filter(i => i === itemName).length;
        if (itemCount < quantity) {
            await interaction.editReply({
                content: `❌ You only have ${itemCount} ${itemName}(s)! Check your inventory with \`/inventory\`.`,
                ephemeral: true
            });
            return;
        }

        // Find which merchant would buy this item and at what price
        let bestOffer = null;
        let bestMerchant = null;

        Object.entries(merchants).forEach(([merchantKey, merchant]) => {
            merchant.items.forEach(item => {
                if (item.name.toLowerCase() === itemName.toLowerCase()) {
                    const baseValue = Math.floor(item.cost * 0.65); // Base sell value is 65% of buy price
                    const reputation = player.merchant.reputation[merchantKey] || 0;
                    const bonus = Math.floor(reputation / 5) * 3; // 3% bonus per 5 reputation
                    const finalValue = Math.floor(baseValue * (1 + bonus / 100));
                    
                    if (!bestOffer || finalValue > bestOffer.value) {
                        bestOffer = {
                            value: finalValue,
                            baseValue: baseValue,
                            bonus: bonus,
                            merchant: merchant,
                            merchantKey: merchantKey
                        };
                        bestMerchant = merchantKey;
                    }
                }
            });
        });

        if (!bestOffer) {
            await interaction.editReply({
                content: '❌ No merchants are interested in buying this item!',
                ephemeral: true
            });
            return;
        }

        const totalOffer = bestOffer.value * quantity;

        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('💰 Sell Offer')
            .setDescription(`**${bestOffer.merchant.name}** is interested in your items!`)
            .addFields(
                { name: '📦 Item', value: `${quantity}x ${itemName}`, inline: true },
                { name: '💰 Base Price', value: `${bestOffer.baseValue * quantity} gold`, inline: true },
                { name: '📈 Reputation Bonus', value: `+${bestOffer.bonus}%`, inline: true },
                { name: '💎 Final Offer', value: `**${totalOffer} gold**`, inline: false },
                { name: '🏪 Merchant', value: `${bestOffer.merchant.name}\n*${bestOffer.merchant.specialty}*`, inline: true },
                { name: '📍 Location', value: bestOffer.merchant.location, inline: true }
            );

        const confirmButton = new ButtonBuilder()
            .setCustomId(`sell_confirm_${bestMerchant}_${itemName}_${quantity}`)
            .setLabel('✅ Accept Offer')
            .setStyle(ButtonStyle.Success);

        const declineButton = new ButtonBuilder()
            .setCustomId('sell_decline')
            .setLabel('❌ Decline')
            .setStyle(ButtonStyle.Danger);

        const negotiateButton = new ButtonBuilder()
            .setCustomId(`sell_negotiate_${bestMerchant}`)
            .setLabel('🤝 Try to Negotiate')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(confirmButton, negotiateButton, declineButton);

        await interaction.editReply({ embeds: [embed], components: [row] });
    },

    async handleBuy(interaction, player, merchants) {
        const itemName = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity') || 1;

        // Find the item across all merchants
        let foundItem = null;
        let merchantKey = null;

        Object.entries(merchants).forEach(([key, merchant]) => {
            const item = merchant.items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
            if (item) {
                foundItem = item;
                merchantKey = key;
            }
        });

        if (!foundItem) {
            await interaction.editReply({
                content: '❌ That item is not available in the bazaar! Use `/bazaar browse` to see available items.',
                ephemeral: true
            });
            return;
        }

        const merchant = merchants[merchantKey];
        const reputation = player.merchant.reputation[merchantKey] || 0;
        const discount = this.calculateDiscount(reputation, player.merchant.vipStatus);
        const finalCost = Math.max(1, Math.floor(foundItem.cost * (1 - discount))) * quantity;

        if (player.gold < finalCost) {
            await interaction.editReply({
                content: `❌ You need ${finalCost} gold but only have ${player.gold}! Earn more gold through various activities.`,
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🛒 Purchase Confirmation')
            .setDescription(`**${merchant.name}** offers you this deal:`)
            .addFields(
                { name: '📦 Item', value: `${quantity}x ${foundItem.name}`, inline: true },
                { name: '💰 Base Price', value: `${foundItem.cost * quantity} gold`, inline: true },
                { name: '🎁 Your Discount', value: `${Math.round(discount * 100)}%`, inline: true },
                { name: '💎 Final Price', value: `**${finalCost} gold**`, inline: false }
            );

        if (foundItem.stats) {
            const statText = Object.entries(foundItem.stats).map(([stat, value]) => `**${stat}:** +${value}`).join('\n');
            embed.addFields({ name: '📊 Item Stats', value: statText, inline: true });
        }

        if (foundItem.effect) {
            embed.addFields({ name: '✨ Special Effect', value: foundItem.effect.replace(/_/g, ' '), inline: true });
        }

        embed.addFields(
            { name: '💰 Remaining Gold', value: `${player.gold - finalCost}`, inline: true },
            { name: '🏪 Merchant', value: `${merchant.name}\n*${merchant.location}*`, inline: false }
        );

        const buyButton = new ButtonBuilder()
            .setCustomId(`buy_confirm_${merchantKey}_${foundItem.name}_${quantity}`)
            .setLabel('💰 Purchase')
            .setStyle(ButtonStyle.Success);

        const cancelButton = new ButtonBuilder()
            .setCustomId('buy_cancel')
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
            .addComponents(buyButton, cancelButton);

        await interaction.editReply({ embeds: [embed], components: [row] });
    },

    async handleHaggle(interaction, player, merchants) {
        const merchantType = interaction.options.getString('merchant');
        const currentTime = Date.now();
        const haggleCooldown = 1800000; // 30 minutes

        if (currentTime - (player.merchant.lastHaggle || 0) < haggleCooldown) {
            const remainingTime = Math.ceil((haggleCooldown - (currentTime - (player.merchant.lastHaggle || 0))) / 60000);
            await interaction.editReply({
                content: `⏳ You must wait ${remainingTime} more minutes before haggling again.\n💡 *Use this time to build reputation through purchases!*`,
                ephemeral: true
            });
            return;
        }

        const merchant = merchants[merchantType];
        if (!merchant) {
            await interaction.editReply({
                content: '❌ Invalid merchant selected!',
                ephemeral: true
            });
            return;
        }

        const reputation = player.merchant.reputation[merchantType] || 0;
        const transactions = player.merchant.transactions || 0;
        const baseChance = 0.35 + (reputation * 0.025) + (transactions * 0.005); // Improved base chance
        const finalChance = Math.min(0.85, baseChance); // Cap at 85%

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🤝 Haggling Opportunity')
            .setDescription(`Approach **${merchant.name}** for price negotiations?`)
            .addFields(
                { name: '🏪 Merchant', value: `${merchant.name}\n*${merchant.personality} personality*\n📍 ${merchant.location}`, inline: true },
                { name: '📊 Your Standing', value: `**Reputation:** ${reputation}\n**Transactions:** ${transactions}\n**VIP Status:** ${player.merchant.vipStatus ? '⭐' : '❌'}`, inline: true },
                { name: '🎯 Success Chance', value: `**${Math.floor(finalChance * 100)}%**\n*Higher reputation = better odds*`, inline: true },
                { name: '🎁 Potential Rewards', value: `• Better prices for 24 hours\n• Reputation increase\n• Possible VIP upgrade\n• Exclusive item access`, inline: false }
            );

        const haggleButton = new ButtonBuilder()
            .setCustomId(`haggle_attempt_${merchantType}`)
            .setLabel('🤝 Start Haggling')
            .setStyle(ButtonStyle.Primary);

        const cancelButton = new ButtonBuilder()
            .setCustomId('haggle_cancel')
            .setLabel('❌ Leave Quietly')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
            .addComponents(haggleButton, cancelButton);

        await interaction.editReply({ embeds: [embed], components: [row] });
    },

    async handleReputation(interaction, player, merchants) {
        const totalRep = this.getTotalReputation(player.merchant);
        const tier = this.getReputationTier(totalRep);

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('📊 Merchant Relations & Reputation')
            .setDescription('╔══════════════════════════════════════╗\n║        **REPUTATION SYSTEM**         ║\n╚══════════════════════════════════════╝')
            .addFields(
                {
                    name: '🌟 Overall Standing',
                    value: `**Total Reputation:** ${totalRep}\n**Tier:** ${tier.name} ${tier.emoji}\n**VIP Status:** ${player.merchant.vipStatus ? '⭐ Active' : '❌ Inactive'}\n**Transactions:** ${player.merchant.transactions || 0}`,
                    inline: true
                },
                {
                    name: '💰 Financial Summary',
                    value: `**Total Spent:** ${player.merchant.totalSpent || 0} gold\n**Total Earned:** ${player.merchant.totalEarned || 0} gold\n**Net Difference:** ${(player.merchant.totalEarned || 0) - (player.merchant.totalSpent || 0)} gold`,
                    inline: true
                }
            );

        // Individual merchant relationships
        Object.entries(merchants).forEach(([key, merchant]) => {
            const rep = player.merchant.reputation[key] || 0;
            const discount = this.calculateDiscount(rep, player.merchant.vipStatus);
            const relationship = this.getRelationshipStatus(rep);

            embed.addFields({
                name: `${merchant.name}`,
                value: `**Reputation:** ${rep} ${relationship.emoji}\n**Status:** ${relationship.status}\n**Discount:** ${Math.round(discount * 100)}%\n**Location:** ${merchant.location}`,
                inline: true
            });
        });

        // Reputation benefits
        embed.addFields({
            name: '🎁 Current Benefits',
            value: tier.benefits.join('\n'),
            inline: false
        });

        // Next tier preview
        const nextTier = this.getNextTier(totalRep);
        if (nextTier) {
            embed.addFields({
                name: '⬆️ Next Tier Benefits',
                value: `**${nextTier.name}** (${nextTier.required - totalRep} reputation needed)\n${nextTier.benefits.slice(0, 3).join('\n')}`,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleAuction(interaction, player) {
        const action = interaction.options.getString('action') || 'view';

        // Initialize auction data
        if (!player.auctions) {
            player.auctions = {
                activeBids: [],
                wonItems: [],
                listedItems: []
            };
        }

        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('🏺 Merchant Auction House')
            .setDescription('╔══════════════════════════════════════╗\n║        **LIVE AUCTIONS**             ║\n╚══════════════════════════════════════╝\n\n*Rare items from across the realm*');

        if (action === 'view') {
            // Show current auctions (mock data for demo)
            const currentAuctions = [
                { item: 'Dragon Scale Armor', currentBid: 1500, timeLeft: '2h 15m', bidder: 'Anonymous' },
                { item: 'Staff of Lightning', currentBid: 800, timeLeft: '45m', bidder: 'WizardMage#1234' },
                { item: 'Ring of Teleportation', currentBid: 600, timeLeft: '1h 30m', bidder: 'You' }
            ];

            currentAuctions.forEach((auction, index) => {
                embed.addFields({
                    name: `🏺 ${auction.item}`,
                    value: `**Current Bid:** ${auction.currentBid} gold\n**Time Left:** ${auction.timeLeft}\n**Leading Bidder:** ${auction.bidder}`,
                    inline: true
                });
            });

            const bidButton = new ButtonBuilder()
                .setCustomId('auction_bid_menu')
                .setLabel('💰 Place Bid')
                .setStyle(ButtonStyle.Primary);

            const listButton = new ButtonBuilder()
                .setCustomId('auction_list_menu')
                .setLabel('📦 List Item')
                .setStyle(ButtonStyle.Success);

            const historyButton = new ButtonBuilder()
                .setCustomId('auction_history')
                .setLabel('📜 Your History')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder()
                .addComponents(bidButton, listButton, historyButton);

            await interaction.editReply({ embeds: [embed], components: [row] });
        }
    },

    // Helper methods
    calculateDiscount(reputation, vipStatus) {
        const baseDiscount = Math.floor(reputation / 10) * 0.02; // 2% per 10 reputation
        const vipBonus = vipStatus ? 0.05 : 0; // 5% VIP bonus
        return Math.min(0.25, baseDiscount + vipBonus); // Max 25% discount
    },

    getTotalReputation(merchantData) {
        if (!merchantData || !merchantData.reputation) return 0;
        return Object.values(merchantData.reputation).reduce((sum, rep) => sum + rep, 0);
    },

    getReputationTier(totalRep) {
        const tiers = [
            { name: 'Unknown', emoji: '❓', required: 0, benefits: ['• No special benefits'] },
            { name: 'Recognized', emoji: '👋', required: 25, benefits: ['• 2% general discount', '• Access to common items'] },
            { name: 'Trusted', emoji: '🤝', required: 75, benefits: ['• 5% general discount', '• Access to uncommon items', '• Reduced haggling cooldown'] },
            { name: 'Valued', emoji: '⭐', required: 150, benefits: ['• 10% general discount', '• Access to rare items', '• Priority customer service'] },
            { name: 'Elite', emoji: '👑', required: 300, benefits: ['• 15% general discount', '• Access to epic items', '• VIP status', '• Exclusive auctions'] },
            { name: 'Legendary', emoji: '🏆', required: 500, benefits: ['• 20% general discount', '• Access to legendary items', '• Personal merchant contacts', '• Custom orders'] }
        ];

        for (let i = tiers.length - 1; i >= 0; i--) {
            if (totalRep >= tiers[i].required) {
                return tiers[i];
            }
        }
        return tiers[0];
    },

    getNextTier(totalRep) {
        const tiers = [
            { name: 'Recognized', required: 25, benefits: ['• 2% general discount'] },
            { name: 'Trusted', required: 75, benefits: ['• 5% general discount'] },
            { name: 'Valued', required: 150, benefits: ['• 10% general discount'] },
            { name: 'Elite', required: 300, benefits: ['• 15% general discount'] },
            { name: 'Legendary', required: 500, benefits: ['• 20% general discount'] }
        ];

        return tiers.find(tier => totalRep < tier.required);
    },

    getRelationshipStatus(reputation) {
        if (reputation >= 50) return { status: 'Excellent', emoji: '💚' };
        if (reputation >= 25) return { status: 'Good', emoji: '💙' };
        if (reputation >= 10) return { status: 'Neutral', emoji: '💛' };
        if (reputation >= 0) return { status: 'Poor', emoji: '🧡' };
        return { status: 'Hostile', emoji: '❤️' };
    },

    getRarityEmoji(rarity) {
        const rarities = {
            common: '⚪',
            uncommon: '🟢',
            rare: '🔵',
            epic: '🟣',
            legendary: '🟡'
        };
        return rarities[rarity] || '⚪';
    }
};
