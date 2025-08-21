
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('🤖 Get bot invite links and server information')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of invite information to display')
                .addChoices(
                    { name: '🔗 Bot Invite', value: 'bot' },
                    { name: '📊 Server Info', value: 'server' },
                    { name: '🎮 Features', value: 'features' },
                    { name: '📚 Support', value: 'support' }
                )),

    async execute(interaction) {
        try {
            const type = interaction.options?.getString('type') || 'bot';
            await this.showInviteInfo(interaction, type);
        } catch (error) {
            console.error('Invite command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while generating invite information.',
                ephemeral: true
            });
        }
    },

    async showInviteInfo(interaction, type) {
        const clientId = interaction.client.user.id;
        const permissions = '2147484672'; // Enhanced permissions for RPG bot
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`;

        let embed, components;

        switch (type) {
            case 'bot':
                embed = new EmbedBuilder()
                    .setColor(config.embedColors?.primary || '#7289da')
                    .setTitle('🤖 Invite RPG Treasure Hunter Bot')
                    .setDescription('**Transform your Discord server into an epic RPG adventure!**\n\nAdd our feature-rich bot to bring immersive gaming experiences to your community.')
                    .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
                    .addFields([
                        {
                            name: '⭐ **Why Choose This Bot?**',
                            value: '• **50+ Interactive Commands**\n• **Complete Economy System**\n• **Epic Adventures & Quests**\n• **Advanced Trading System**\n• **Guild & Social Features**\n• **Regular Updates & Support**',
                            inline: false
                        },
                        {
                            name: '🔧 **Required Permissions**',
                            value: '• Send Messages & Embeds\n• Use Slash Commands\n• Read Message History\n• Add Reactions\n• Manage Messages (for games)',
                            inline: true
                        },
                        {
                            name: '📈 **Bot Statistics**',
                            value: `• **Servers:** ${interaction.client.guilds.cache.size}\n• **Users:** ${interaction.client.users.cache.size.toLocaleString()}\n• **Commands:** ${interaction.client.commands?.size || 'Many'}\n• **Uptime:** ${Math.floor(process.uptime() / 3600)}h`,
                            inline: true
                        }
                    ])
                    .setFooter({ 
                        text: 'Click the invite button below to add the bot to your server!',
                        iconURL: interaction.client.user.displayAvatarURL()
                    })
                    .setTimestamp();

                components = [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel('🔗 Invite Bot')
                                .setStyle(ButtonStyle.Link)
                                .setURL(inviteUrl),
                            new ButtonBuilder()
                                .setCustomId(`invite_features_${interaction.user.id}`)
                                .setLabel('🎮 View Features')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId(`invite_support_${interaction.user.id}`)
                                .setLabel('💬 Get Support')
                                .setStyle(ButtonStyle.Secondary)
                        ),
                    new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(`invite_category_${interaction.user.id}`)
                                .setPlaceholder('🎯 Explore Command Categories')
                                .addOptions([
                                    { label: 'Economy & Trading', value: 'economy', emoji: '💰', description: 'Banking, shop, trading systems' },
                                    { label: 'Adventures & Combat', value: 'combat', emoji: '⚔️', description: 'Battles, dungeons, quests' },
                                    { label: 'Crafting & Magic', value: 'crafting', emoji: '🔮', description: 'Blacksmithing, alchemy, spells' },
                                    { label: 'Social & Guilds', value: 'social', emoji: '👥', description: 'Parties, guilds, achievements' },
                                    { label: 'Mini-Games', value: 'games', emoji: '🎮', description: 'Treasure hunts, riddles, gambling' }
                                ])
                        )
                ];
                break;

            case 'features':
                embed = new EmbedBuilder()
                    .setColor(config.embedColors?.success || '#00ff00')
                    .setTitle('🎮 Bot Features Overview')
                    .setDescription('**Discover what makes this bot special!**')
                    .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
                    .addFields([
                        {
                            name: '💰 **Economy System**',
                            value: '• Banking & Loans\n• Daily Rewards\n• Investment System\n• Advanced Trading\n• Auction House',
                            inline: true
                        },
                        {
                            name: '⚔️ **Combat & Adventures**',
                            value: '• Epic Battles\n• Dungeon Exploring\n• Boss Raids\n• PvP Arena\n• Quest System',
                            inline: true
                        },
                        {
                            name: '🔨 **Crafting & Skills**',
                            value: '• Blacksmithing\n• Alchemy & Brewing\n• Enchanting\n• Mining & Fishing\n• Skill Mastery',
                            inline: true
                        },
                        {
                            name: '🏠 **Housing & Customization**',
                            value: '• Build Houses\n• Decorating System\n• Room Management\n• Furniture Crafting',
                            inline: true
                        },
                        {
                            name: '👥 **Social Features**',
                            value: '• Guild System\n• Party Adventures\n• Achievement System\n• Leaderboards\n• Social Rankings',
                            inline: true
                        },
                        {
                            name: '🎮 **Mini-Games**',
                            value: '• Treasure Hunting\n• Interactive Riddles\n• Gambling Games\n• Lottery System\n• Slots & Roulette',
                            inline: true
                        }
                    ])
                    .setFooter({ text: 'More features added regularly!' });

                components = [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel('🔗 Add to Server')
                                .setStyle(ButtonStyle.Link)
                                .setURL(inviteUrl),
                            new ButtonBuilder()
                                .setCustomId(`invite_bot_${interaction.user.id}`)
                                .setLabel('◀️ Back to Invite')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`invite_demo_${interaction.user.id}`)
                                .setLabel('🎪 Try Demo')
                                .setStyle(ButtonStyle.Success)
                        )
                ];
                break;

            case 'server':
                embed = new EmbedBuilder()
                    .setColor(config.embedColors?.info || '#0099ff')
                    .setTitle('📊 Server Information')
                    .setDescription('**Current bot and server statistics**')
                    .setThumbnail(interaction.guild?.iconURL({ size: 256 }) || interaction.client.user.displayAvatarURL())
                    .addFields([
                        {
                            name: '🏰 **This Server**',
                            value: `**Name:** ${interaction.guild?.name || 'Unknown'}\n**Members:** ${interaction.guild?.memberCount || 'Unknown'}\n**Created:** ${interaction.guild?.createdAt.toDateString() || 'Unknown'}\n**Owner:** <@${interaction.guild?.ownerId || 'Unknown'}>`,
                            inline: true
                        },
                        {
                            name: '🤖 **Bot Status**',
                            value: `**Servers:** ${interaction.client.guilds.cache.size}\n**Total Users:** ${interaction.client.users.cache.size.toLocaleString()}\n**Uptime:** ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m\n**Ping:** ${interaction.client.ws.ping}ms`,
                            inline: true
                        },
                        {
                            name: '🎯 **Usage Stats**',
                            value: '• **Commands Used:** 10,000+\n• **Treasures Found:** 5,000+\n• **Battles Fought:** 3,000+\n• **Items Crafted:** 2,500+',
                            inline: true
                        }
                    ])
                    .setFooter({ text: `Requested by ${interaction.user.username}` });

                components = [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`invite_bot_${interaction.user.id}`)
                                .setLabel('◀️ Back to Invite')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`invite_refresh_${interaction.user.id}`)
                                .setLabel('🔄 Refresh Stats')
                                .setStyle(ButtonStyle.Primary)
                        )
                ];
                break;

            case 'support':
                embed = new EmbedBuilder()
                    .setColor(config.embedColors?.warning || '#ffaa00')
                    .setTitle('💬 Support & Resources')
                    .setDescription('**Need help? We\'ve got you covered!**')
                    .addFields([
                        {
                            name: '📚 **Getting Started**',
                            value: '• Use `/help` for command list\n• Try `/daily` for rewards\n• Start with `/profile` setup\n• Join a guild with `/guild`',
                            inline: false
                        },
                        {
                            name: '❓ **Common Questions**',
                            value: '• **How to earn coins?** Use `/work`, `/daily`, `/hunt`\n• **How to trade?** Use `/trade` with other players\n• **Lost items?** Check `/inventory` and `/profile`\n• **Bot not responding?** Check permissions',
                            inline: false
                        },
                        {
                            name: '🔧 **Troubleshooting**',
                            value: '• Ensure bot has required permissions\n• Commands are slash commands (/)\n• Some features require profile setup\n• Check server boost level for limits',
                            inline: false
                        },
                        {
                            name: '📞 **Contact Support**',
                            value: '• Report bugs with `/feedback`\n• Suggest features in our server\n• Check `/status` for bot health\n• Use `/ping` to test connectivity',
                            inline: false
                        }
                    ])
                    .setFooter({ text: 'We\'re here to help make your RPG experience amazing!' });

                components = [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`invite_bot_${interaction.user.id}`)
                                .setLabel('◀️ Back to Invite')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`invite_troubleshoot_${interaction.user.id}`)
                                .setLabel('🔧 Quick Fix')
                                .setStyle(ButtonStyle.Danger)
                        )
                ];
                break;

            default:
                return this.showInviteInfo(interaction, 'bot');
        }

        const response = { embeds: [embed], components };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(response);
        } else {
            await interaction.reply(response);
        }
    },

    // Button handlers
    buttonHandlers: {
        features: async function(interaction) {
            await this.showInviteInfo(interaction, 'features');
        },

        support: async function(interaction) {
            await this.showInviteInfo(interaction, 'support');
        },

        bot: async function(interaction) {
            await this.showInviteInfo(interaction, 'bot');
        },

        refresh: async function(interaction) {
            await this.showInviteInfo(interaction, 'server');
        },

        demo: async function(interaction) {
            const demoEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎪 Try These Commands!')
                .setDescription('**Here are some commands you can try right now:**')
                .addFields([
                    { name: '/ping', value: 'Test bot responsiveness', inline: true },
                    { name: '/help', value: 'View all available commands', inline: true },
                    { name: '/profile', value: 'Create your adventure profile', inline: true },
                    { name: '/daily', value: 'Claim daily rewards', inline: true },
                    { name: '/hunt', value: 'Start treasure hunting', inline: true },
                    { name: '/riddle', value: 'Solve interactive riddles', inline: true }
                ])
                .setFooter({ text: 'Start your adventure today!' });

            await interaction.update({ embeds: [demoEmbed], components: [] });
        },

        troubleshoot: async function(interaction) {
            const troubleshootEmbed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('🔧 Quick Troubleshooting')
                .setDescription('**Try these quick fixes:**')
                .addFields([
                    { name: '✅ Bot Permissions', value: 'Make sure the bot has:\n• Send Messages\n• Use Slash Commands\n• Embed Links\n• Read Message History', inline: false },
                    { name: '🔄 Refresh Discord', value: 'Try refreshing Discord (Ctrl+R) or restart the app', inline: true },
                    { name: '⏱️ Wait a Moment', value: 'Sometimes commands take a few seconds to respond', inline: true },
                    { name: '🆘 Still Having Issues?', value: 'Use `/status` to check bot health or contact server admins', inline: false }
                ]);

            await interaction.update({ embeds: [troubleshootEmbed], components: [] });
        }
    },

    // Select menu handlers
    selectMenuHandlers: {
        category: async function(interaction) {
            const category = interaction.values[0];
            const categoryInfo = {
                economy: {
                    title: '💰 Economy & Trading',
                    description: 'Master the art of wealth and commerce!',
                    commands: [
                        '`/daily` - Claim daily rewards and bonuses',
                        '`/work` - Take on various jobs for steady income',
                        '`/bank` - Manage your savings and loans',
                        '`/shop` - Buy and sell items in the marketplace',
                        '`/trade` - Trade items with other players',
                        '`/auction` - Participate in auction events',
                        '`/invest` - Invest in various opportunities'
                    ]
                },
                combat: {
                    title: '⚔️ Adventures & Combat',
                    description: 'Embark on epic battles and adventures!',
                    commands: [
                        '`/battle` - Fight monsters and other players',
                        '`/dungeon` - Explore dangerous dungeons',
                        '`/raid` - Join epic raid battles',
                        '`/arena` - Compete in PvP tournaments',
                        '`/quest` - Take on challenging quests',
                        '`/hunt` - Hunt for rare treasures',
                        '`/expedition` - Go on long adventures'
                    ]
                },
                crafting: {
                    title: '🔮 Crafting & Magic',
                    description: 'Create powerful items and cast spells!',
                    commands: [
                        '`/craft` - Create items using materials',
                        '`/forge` - Forge weapons and armor',
                        '`/brew` - Create magical potions',
                        '`/enchant` - Add magical properties to items',
                        '`/spell` - Cast various spells',
                        '`/mine` - Mine for precious materials',
                        '`/fish` - Catch fish and sea treasures'
                    ]
                },
                social: {
                    title: '👥 Social & Guilds',
                    description: 'Connect with other adventurers!',
                    commands: [
                        '`/guild` - Join or manage guilds',
                        '`/party` - Form adventure parties',
                        '`/achievements` - View your accomplishments',
                        '`/leaderboard` - Check rankings',
                        '`/profile` - Manage your character profile',
                        '`/rankings` - Compare with other players'
                    ]
                },
                games: {
                    title: '🎮 Mini-Games',
                    description: 'Enjoy fun games and activities!',
                    commands: [
                        '`/treasure` - Go on treasure hunts',
                        '`/riddle` - Solve brain-teasing riddles',
                        '`/slots` - Try your luck at slot machines',
                        '`/roulette` - Play roulette games',
                        '`/lottery` - Buy lottery tickets',
                        '`/gamble` - Various gambling games'
                    ]
                }
            };

            const info = categoryInfo[category];
            const embed = new EmbedBuilder()
                .setColor('#7289da')
                .setTitle(info.title)
                .setDescription(info.description)
                .addFields([
                    {
                        name: '📋 Available Commands',
                        value: info.commands.join('\n'),
                        inline: false
                    }
                ])
                .setFooter({ text: 'Use /help for complete command information!' });

            await interaction.update({ embeds: [embed], components: [] });
        }
    }
};
