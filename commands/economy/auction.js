
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const auctionCategories = {
    weapons: { name: 'Weapons & Armor', emoji: '⚔️', color: 0xFF6B6B },
    artifacts: { name: 'Ancient Artifacts', emoji: '🏺', color: 0xFFD700 },
    gems: { name: 'Gems & Crystals', emoji: '💎', color: 0x9370DB },
    books: { name: 'Magical Tomes', emoji: '📚', color: 0x4682B4 },
    tools: { name: 'Tools & Equipment', emoji: '🔨', color: 0x8B4513 },
    rare: { name: 'Rare Collectibles', emoji: '🌟', color: 0xFFA500 }
};

// Sample auction items (in a real bot, these would be from database)
const activeAuctions = [
    {
        id: 'auction_1',
        item: 'Dragon Scale Armor',
        seller: 'MasterHunter#1234',
        sellerId: '123456789',
        currentBid: 1500,
        minBid: 1600,
        timeLeft: 2 * 60 * 60 * 1000 + 34 * 60 * 1000, // 2h 34m in ms
        rarity: 'Epic',
        category: 'weapons',
        emoji: '🐉',
        description: 'Forged from the scales of an ancient red dragon, this armor provides exceptional protection.',
        stats: { defense: 45, fire_resistance: 25, durability: 300 }
    },
    {
        id: 'auction_2',
        item: 'Ancient Spellbook of Wisdom',
        seller: 'WizardOfOz#5678',
        sellerId: '987654321',
        currentBid: 800,
        minBid: 850,
        timeLeft: 45 * 60 * 1000, // 45m in ms
        rarity: 'Rare',
        category: 'books',
        emoji: '📚',
        description: 'Contains powerful wisdom spells from the lost civilization of Atlantis.',
        stats: { wisdom: 15, mana_regen: 10, spell_power: 20 }
    },
    {
        id: 'auction_3',
        item: 'Legendary Sword of Light',
        seller: 'KnightOfHonor#9999',
        sellerId: '456789123',
        currentBid: 5000,
        minBid: 5200,
        timeLeft: 6 * 60 * 60 * 1000 + 12 * 60 * 1000, // 6h 12m in ms
        rarity: 'Legendary',
        category: 'weapons',
        emoji: '⚔️',
        description: 'A blade blessed by celestial beings, capable of vanquishing even the darkest evil.',
        stats: { attack: 75, holy_damage: 30, critical_chance: 15 }
    },
    {
        id: 'auction_4',
        item: 'Crystal of Infinite Power',
        seller: 'CrystalMage#4321',
        sellerId: '789123456',
        currentBid: 10000,
        minBid: 10500,
        timeLeft: 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000, // 1d 4h in ms
        rarity: 'Mythic',
        category: 'gems',
        emoji: '💎',
        description: 'A mystical crystal that amplifies magical abilities beyond mortal comprehension.',
        stats: { all_stats: 25, mana_capacity: 200, spell_critical: 20 }
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auction')
        .setDescription('🔨 Participate in the treasure auction house')
        .addSubcommand(subcommand =>
            subcommand
                .setName('browse')
                .setDescription('Browse current auctions')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Filter by category')
                        .setRequired(false)
                        .addChoices(
                            ...Object.entries(auctionCategories).map(([key, cat]) => ({
                                name: `${cat.emoji} ${cat.name}`,
                                value: key
                            }))
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bid')
                .setDescription('Place a bid on an auction')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('The item to bid on')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Your bid amount')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sell')
                .setDescription('Put an item up for auction')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item from your inventory to sell')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('starting_bid')
                        .setDescription('Starting bid amount')
                        .setRequired(true)
                        .setMinValue(1))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Auction duration in hours')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(72))),
    
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            let userData = await db.getPlayer(userId);
            if (!userData) {
                userData = {
                    inventory: { coins: 100, items: [] },
                    auctions: { bids: [], selling: [], won: [], watchlist: [] }
                };
                await db.setPlayer(userId, userData);
            }

            switch (subcommand) {
                case 'browse':
                    await this.showAuctionBrowse(interaction, userData);
                    break;
                case 'bid':
                    await this.placeBid(interaction, userData);
                    break;
                case 'sell':
                    await this.createAuction(interaction, userData);
                    break;
            }

        } catch (error) {
            console.error('Auction command error:', error);
            await interaction.reply({
                content: '❌ An error occurred with the auction house. Please try again.',
                ephemeral: true
            });
        }
    },

    async showAuctionBrowse(interaction, userData) {
        const category = interaction.options.getString('category');
        
        let filteredAuctions = activeAuctions;
        if (category) {
            filteredAuctions = activeAuctions.filter(auction => auction.category === category);
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🔨 Treasure Auction House')
            .setDescription('╔═══════════════════════════════════════╗\n║       **LEGENDARY ITEM MARKETPLACE**        ║\n╚═══════════════════════════════════════╝')
            .setThumbnail('https://cdn.discordapp.com/emojis/🔨.png')
            .addFields(
                { name: '💰 Your Balance', value: `${(userData.inventory?.coins || 0).toLocaleString()} coins`, inline: true },
                { name: '🎯 Active Bids', value: `${userData.auctions?.bids?.length || 0} items`, inline: true },
                { name: '📦 Items Selling', value: `${userData.auctions?.selling?.length || 0} items`, inline: true }
            );

        if (filteredAuctions.length === 0) {
            embed.addFields({
                name: '📭 No Auctions Found',
                value: category ? 
                    `No auctions found in the **${auctionCategories[category].name}** category.` :
                    'No active auctions at this time. Check back later!',
                inline: false
            });
        } else {
            filteredAuctions.forEach((auction, index) => {
                const timeLeftFormatted = this.formatTimeLeft(auction.timeLeft);
                const rarityEmoji = this.getRarityEmoji(auction.rarity);
                
                embed.addFields({
                    name: `${auction.emoji} ${auction.item}`,
                    value: `**Seller:** ${auction.seller}\n**Current Bid:** ${auction.currentBid.toLocaleString()} coins\n**Min Next Bid:** ${auction.minBid.toLocaleString()} coins\n**Time Left:** ${timeLeftFormatted}\n**Rarity:** ${rarityEmoji} ${auction.rarity}`,
                    inline: true
                });
            });
        }

        // Category filter buttons
        const categoryButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('auction_all')
                    .setLabel('All Items')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🌟'),
                new ButtonBuilder()
                    .setCustomId('auction_weapons')
                    .setLabel('Weapons')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚔️'),
                new ButtonBuilder()
                    .setCustomId('auction_artifacts')
                    .setLabel('Artifacts')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏺'),
                new ButtonBuilder()
                    .setCustomId('auction_gems')
                    .setLabel('Gems')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💎')
            );

        // Action buttons
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('auction_refresh')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('auction_my_bids')
                    .setLabel('📋 My Bids')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('auction_my_items')
                    .setLabel('📦 My Auctions')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('auction_history')
                    .setLabel('📊 History')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Item selection for detailed view
        if (filteredAuctions.length > 0) {
            const itemSelect = new StringSelectMenuBuilder()
                .setCustomId('auction_item_details')
                .setPlaceholder('🔍 View detailed item information')
                .addOptions(
                    filteredAuctions.slice(0, 25).map(auction => ({
                        label: auction.item,
                        value: auction.id,
                        description: `${auction.currentBid.toLocaleString()} coins • ${this.formatTimeLeft(auction.timeLeft)}`,
                        emoji: auction.emoji
                    }))
                );

            const selectRow = new ActionRowBuilder().addComponents(itemSelect);
            await interaction.reply({
                embeds: [embed],
                components: [categoryButtons, actionButtons, selectRow]
            });
        } else {
            await interaction.reply({
                embeds: [embed],
                components: [categoryButtons, actionButtons]
            });
        }
    },

    async placeBid(interaction, userData) {
        const itemName = interaction.options.getString('item');
        const bidAmount = interaction.options.getInteger('amount');

        const auction = activeAuctions.find(a => 
            a.item.toLowerCase().includes(itemName.toLowerCase()) || 
            a.id === itemName
        );

        if (!auction) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Item Not Found')
                .setDescription(`No auction found for "${itemName}"`)
                .addFields({
                    name: '💡 Tip',
                    value: 'Use `/auction browse` to see all available items, or use the exact item name.',
                    inline: false
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // Check if user has enough coins
        const userCoins = userData.inventory?.coins || 0;
        if (userCoins < bidAmount) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('💸 Insufficient Funds')
                .setDescription(`You need **${bidAmount.toLocaleString()}** coins but only have **${userCoins.toLocaleString()}**!`)
                .addFields(
                    { name: '💰 Required Bid', value: `${bidAmount.toLocaleString()} coins`, inline: true },
                    { name: '🏦 Your Balance', value: `${userCoins.toLocaleString()} coins`, inline: true },
                    { name: '📈 Shortfall', value: `${(bidAmount - userCoins).toLocaleString()} coins`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // Check minimum bid
        if (bidAmount < auction.minBid) {
            const embed = new EmbedBuilder()
                .setColor('#FF9900')
                .setTitle('⚠️ Bid Too Low')
                .setDescription(`Your bid of **${bidAmount.toLocaleString()}** coins is below the minimum required bid.`)
                .addFields(
                    { name: '🏷️ Current Bid', value: `${auction.currentBid.toLocaleString()} coins`, inline: true },
                    { name: '💰 Minimum Bid', value: `${auction.minBid.toLocaleString()} coins`, inline: true },
                    { name: '📈 Your Bid', value: `${bidAmount.toLocaleString()} coins`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // Check if auction has expired
        if (auction.timeLeft <= 0) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('⏰ Auction Ended')
                .setDescription('This auction has already ended!')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // Place the bid (in a real implementation, this would update the database)
        const previousBid = auction.currentBid;
        auction.currentBid = bidAmount;
        auction.minBid = Math.floor(bidAmount * 1.05); // Next bid must be 5% higher

        // Add to user's bid history
        if (!userData.auctions) userData.auctions = { bids: [], selling: [], won: [], watchlist: [] };
        userData.auctions.bids.push({
            auctionId: auction.id,
            item: auction.item,
            bidAmount: bidAmount,
            bidTime: Date.now(),
            status: 'active'
        });

        await db.setPlayer(interaction.user.id, userData);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Bid Placed Successfully!')
            .setDescription(`You are now the highest bidder on **${auction.item}**!`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🏷️ Item', value: auction.item, inline: true },
                { name: '💰 Your Bid', value: `${bidAmount.toLocaleString()} coins`, inline: true },
                { name: '📈 Previous Bid', value: `${previousBid.toLocaleString()} coins`, inline: true },
                { name: '⏰ Time Remaining', value: this.formatTimeLeft(auction.timeLeft), inline: true },
                { name: '💳 Next Minimum Bid', value: `${auction.minBid.toLocaleString()} coins`, inline: true },
                { name: '🏦 Remaining Balance', value: `${(userCoins - bidAmount).toLocaleString()} coins`, inline: true },
                { name: '📝 Item Description', value: auction.description, inline: false }
            )
            .setFooter({ text: 'You will be notified if you are outbid!' })
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('auction_watch')
                    .setLabel('👁️ Watch Item')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('auction_browse')
                    .setLabel('🛒 Browse More')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('auction_my_bids')
                    .setLabel('📋 My Bids')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [buttons] });
    },

    async createAuction(interaction, userData) {
        // This is a placeholder for auction creation
        // In a real implementation, you'd check the user's inventory and create a new auction
        
        const embed = new EmbedBuilder()
            .setColor('#4682B4')
            .setTitle('🚧 Feature Coming Soon!')
            .setDescription('The ability to create auctions is currently being developed.')
            .addFields(
                { name: '🔮 Coming Features', value: '• Sell your items\n• Set starting bids\n• Choose auction duration\n• Auto-notifications', inline: false },
                { name: '💡 For Now', value: 'You can browse and bid on existing auctions!', inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    formatTimeLeft(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    },

    getRarityEmoji(rarity) {
        const emojis = {
            Common: '⚪',
            Uncommon: '🟢',
            Rare: '🔵',
            Epic: '🟣',
            Legendary: '🟠',
            Mythic: '🔴'
        };
        return emojis[rarity] || '⚪';
    }
};
