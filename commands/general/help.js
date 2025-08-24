const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

// Map to track active collectors per user
const activeCollectors = new Map();

// Comprehensive command database with detailed information
const commandDatabase = {
    admin: {
        manage: { description: 'Configure server settings and bot permissions', usage: '/manage [setting] [value]', cooldown: '10s', premium: false }
    },
    alchemy: {
        brew: { description: 'Create powerful potions using ingredients', usage: '/brew <recipe> [quantity]', cooldown: '30s', premium: false },
        potion: { description: 'View and use potions from your collection', usage: '/potion <name> [target]', cooldown: '5s', premium: false },
        transmute: { description: 'Transform materials into different items', usage: '/transmute <item> <quantity>', cooldown: '60s', premium: true }
    },
    bank: {
        bank: { description: 'Access your personal banking services', usage: '/bank [action]', cooldown: '3s', premium: false },
        loan: { description: 'Apply for loans or manage existing debt', usage: '/loan <amount> [duration]', cooldown: '24h', premium: false },
        transfer: { description: 'Send money to other players securely', usage: '/transfer <user> <amount>', cooldown: '10s', premium: false }
    },
    blacksmith: {
        forge: { description: 'Create weapons and armor from raw materials', usage: '/forge <item> [enchantments]', cooldown: '120s', premium: false },
        repair: { description: 'Fix damaged equipment and restore durability', usage: '/repair <item>', cooldown: '60s', premium: false },
        upgrade: { description: 'Enhance equipment with better stats', usage: '/upgrade <item> [level]', cooldown: '300s', premium: true }
    },
    combat: {
        arena: { description: 'Enter the combat arena for PvP battles', usage: '/arena [difficulty]', cooldown: '60s', premium: false },
        arenafight: { description: 'Challenge specific players to duels', usage: '/arenafight <opponent>', cooldown: '30s', premium: false },
        tournament: { description: 'Participate in large-scale tournaments', usage: '/tournament [join|status]', cooldown: '600s', premium: true }
    },
    crafting: {
        craft: { description: 'Create items using recipes and materials', usage: '/craft <recipe> [quantity]', cooldown: '45s', premium: false },
        recipes: { description: 'Browse available crafting recipes', usage: '/recipes [category] [search]', cooldown: '5s', premium: false },
        specialize: { description: 'Choose a crafting specialization', usage: '/specialize <profession>', cooldown: '7d', premium: false },
        workbench: { description: 'Access your personal crafting station', usage: '/workbench [upgrade]', cooldown: '10s', premium: false }
    },
    economy: {
        answer: { description: 'Answer trivia questions for rewards', usage: '/answer <question_id> <answer>', cooldown: '10s', premium: false },
        auction: { description: 'Bid on items or create auctions', usage: '/auction <item> [starting_bid]', cooldown: '300s', premium: false },
        buy: { description: 'Purchase items from the shop', usage: '/buy <item> [quantity]', cooldown: '5s', premium: false },
        daily: { description: 'Claim your daily rewards and bonuses', usage: '/daily', cooldown: '24h', premium: false },
        equip: { description: 'Equip weapons, armor, and accessories', usage: '/equip <item> [slot]', cooldown: '3s', premium: false },
        inventory: { description: 'View and manage your item collection', usage: '/inventory [category] [page]', cooldown: '3s', premium: false },
        invest: { description: 'Invest money in stocks and businesses', usage: '/invest <company> <amount>', cooldown: '3600s', premium: true },
        profile: { description: 'Display your character profile and stats', usage: '/profile [user]', cooldown: '5s', premium: false },
        shop: { description: 'Browse the marketplace for items', usage: '/shop [category] [page]', cooldown: '5s', premium: false },
        solve: { description: 'Solve mathematical problems for coins', usage: '/solve <problem_id>', cooldown: '15s', premium: false },
        unequip: { description: 'Remove equipped items', usage: '/unequip <slot>', cooldown: '3s', premium: false },
        work: { description: 'Perform jobs to earn money', usage: '/work [job_type]', cooldown: '3600s', premium: false }
    },
    exploration: {
        dungeon: { description: 'Explore dangerous dungeons for treasures', usage: '/dungeon [difficulty]', cooldown: '1800s', premium: false },
        expedition: { description: 'Embark on long exploration journeys', usage: '/expedition <location> [duration]', cooldown: '7200s', premium: true },
        fish: { description: 'Cast your line in various fishing spots', usage: '/fish [location]', cooldown: '120s', premium: false },
        forage: { description: 'Search for herbs, berries, and materials', usage: '/forage [area]', cooldown: '300s', premium: false },
        mine: { description: 'Extract valuable ores and gems', usage: '/mine [depth]', cooldown: '600s', premium: false },
        scout: { description: 'Discover new locations and secrets', usage: '/scout [direction]', cooldown: '900s', premium: false }
    },
    farming: {
        farm: { description: 'Manage your agricultural operations', usage: '/farm [action]', cooldown: '10s', premium: false },
        garden: { description: 'Tend to your personal garden plots', usage: '/garden [plot] [action]', cooldown: '60s', premium: false },
        harvest: { description: 'Collect crops when they are ready', usage: '/harvest [crop_type]', cooldown: '300s', premium: false },
        plant: { description: 'Plant seeds in available soil', usage: '/plant <seed> [plot]', cooldown: '30s', premium: false },
        water: { description: 'Water crops to help them grow', usage: '/water [plot]', cooldown: '120s', premium: false }
    },
    fishing: {
        cast: { description: 'Cast your fishing line at specific spots', usage: '/cast [bait]', cooldown: '60s', premium: false },
        market: { description: 'Trade fish at the fishing market', usage: '/market [sell|buy] [fish]', cooldown: '30s', premium: false },
        fishing: { description: 'General fishing command and tutorial', usage: '/fishing [guide]', cooldown: '5s', premium: false },
        spots: { description: 'Discover and view fishing locations', usage: '/spots [region]', cooldown: '60s', premium: false },
        tackle: { description: 'Manage fishing equipment and bait', usage: '/tackle [upgrade|buy]', cooldown: '300s', premium: false }
    },
    gambling: {
        gamble: { description: 'Basic gambling with dice and cards', usage: '/gamble <amount> [game]', cooldown: '30s', premium: false },
        roulette: { description: 'Spin the roulette wheel for big wins', usage: '/roulette <bet> <number/color>', cooldown: '60s', premium: false },
        slots: { description: 'Play the slot machine for jackpots', usage: '/slots <bet_amount>', cooldown: '45s', premium: false }
    },
    games: {
        challenge: { description: 'Challenge other players to games', usage: '/challenge <user> <game>', cooldown: '120s', premium: false },
        hintvote: { description: 'Vote on community hints and clues', usage: '/hintvote <hint_id> [vote]', cooldown: '300s', premium: false },
        hunts: { description: 'Participate in treasure hunts', usage: '/hunts [active|join]', cooldown: '60s', premium: false },
        lottery: { description: 'Buy lottery tickets for weekly draws', usage: '/lottery [buy|check] [tickets]', cooldown: '3600s', premium: false },
        slotgame: { description: 'Advanced slot machine with bonuses', usage: '/slotgame <bet> [multiplier]', cooldown: '90s', premium: true },
        gamesolve: { description: 'Solve puzzles and brain teasers', usage: '/gamesolve <puzzle_id> <solution>', cooldown: '300s', premium: false }
    },
    general: {
        backup: { description: 'Create backups of your game data', usage: '/backup [create|restore]', cooldown: '3600s', premium: true },
        help: { description: 'Display this comprehensive help system', usage: '/help [category]', cooldown: '5s', premium: false },
        hunt: { description: 'Go on treasure hunting adventures', usage: '/hunt [difficulty]', cooldown: '1800s', premium: false },
        invite: { description: 'Get bot invite link and server info', usage: '/invite', cooldown: '60s', premium: false },
        leaderboard: { description: 'View rankings and top players', usage: '/leaderboard [category]', cooldown: '30s', premium: false },
        ping: { description: 'Check bot latency and status', usage: '/ping', cooldown: '10s', premium: false },
        riddle: { description: 'Solve riddles for rewards', usage: '/riddle [difficulty]', cooldown: '300s', premium: false },
        status: { description: 'Check your character status and effects', usage: '/status [detailed]', cooldown: '5s', premium: false },
        treasure: { description: 'Manage found treasures and artifacts', usage: '/treasure [open|list]', cooldown: '60s', premium: false }
    },
    housing: {
        build: { description: 'Construct new buildings and rooms', usage: '/build <structure> [location]', cooldown: '3600s', premium: false },
        decorate: { description: 'Add decorations to your property', usage: '/decorate <item> [room]', cooldown: '300s', premium: false },
        house: { description: 'Manage your house and properties', usage: '/house [upgrade|info]', cooldown: '60s', premium: false },
        room: { description: 'Modify and customize individual rooms', usage: '/room <name> [action]', cooldown: '600s', premium: false }
    },
    magic: {
        enchant: { description: 'Add magical properties to items', usage: '/enchant <item> <enchantment>', cooldown: '1800s', premium: true },
        research: { description: 'Study magic to unlock new spells', usage: '/research <school> [hours]', cooldown: '7200s', premium: false },
        spell: { description: 'Cast spells for various effects', usage: '/spell <spell_name> [target]', cooldown: '300s', premium: false },
        spellcraft: { description: 'Create custom spells and rituals', usage: '/spellcraft <name> <components>', cooldown: '3600s', premium: true }
    },
    merchant: {
        bazaar: { description: 'Visit the traveling merchant bazaar', usage: '/bazaar [refresh]', cooldown: '1800s', premium: false },
        caravan: { description: 'Trade with merchant caravans', usage: '/caravan [destination]', cooldown: '7200s', premium: false },
        marketplace: { description: 'Access the central marketplace', usage: '/marketplace [category]', cooldown: '30s', premium: false },
        merchant: { description: 'Interact with NPC merchants', usage: '/merchant [name] [action]', cooldown: '120s', premium: false }
    },
    mining: {
        excavate: { description: 'Perform large-scale mining operations', usage: '/excavate <site> [equipment]', cooldown: '3600s', premium: true },
        tunnel: { description: 'Create mining tunnels and shafts', usage: '/tunnel <direction> [depth]', cooldown: '1800s', premium: false }
    },
    pets: {
        pet: { description: 'Interact with your companion pets', usage: '/pet [action] [pet_name]', cooldown: '60s', premium: false },
        stable: { description: 'Manage pet housing and care', usage: '/stable [upgrade|clean]', cooldown: '300s', premium: false },
        train: { description: 'Train pets to improve their abilities', usage: '/train <pet> <skill>', cooldown: '3600s', premium: false }
    },
    quests: {
        adventure: { description: 'Begin epic story-driven adventures', usage: '/adventure [start|continue]', cooldown: '1800s', premium: false },
        quest: { description: 'View and manage active quests', usage: '/quest [list|abandon] [id]', cooldown: '30s', premium: false }
    },
    rpg: {
        battle: { description: 'Engage in tactical RPG combat', usage: '/battle <enemy> [strategy]', cooldown: '300s', premium: false },
        dungeonraid: { description: 'Lead raids on dangerous dungeons', usage: '/dungeonraid <dungeon> [party]', cooldown: '7200s', premium: true },
        raid: { description: 'Participate in guild raid events', usage: '/raid [join|create] [target]', cooldown: '3600s', premium: false }
    },
    skills: {
        mastery: { description: 'View skill mastery and progression', usage: '/mastery [skill] [prestige]', cooldown: '60s', premium: false },
        profession: { description: 'Choose and manage professions', usage: '/profession [change|info]', cooldown: '86400s', premium: false }
    },
    social: {
        achievements: { description: 'View unlocked achievements and progress', usage: '/achievements [category] [user]', cooldown: '30s', premium: false },
        guild: { description: 'Manage guild membership and activities', usage: '/guild [action] [target]', cooldown: '300s', premium: false },
        party: { description: 'Form parties for group activities', usage: '/party [invite|leave] [user]', cooldown: '60s', premium: false },
        rankings: { description: 'Check competitive rankings', usage: '/rankings [category] [season]', cooldown: '60s', premium: false }
    },
    tavern: {
        drink: { description: 'Order drinks for various bonuses', usage: '/drink <beverage> [rounds]', cooldown: '1800s', premium: false },
        inn: { description: 'Rest at the inn to restore energy', usage: '/inn [hours] [room_type]', cooldown: '28800s', premium: false },
        socialize: { description: 'Meet other players and NPCs', usage: '/socialize [activity]', cooldown: '600s', premium: false }
    },
    transportation: {
        mount: { description: 'Manage riding mounts and vehicles', usage: '/mount [summon|dismiss] [name]', cooldown: '300s', premium: false },
        travel: { description: 'Fast travel between known locations', usage: '/travel <destination>', cooldown: '1800s', premium: false },
        voyage: { description: 'Embark on long-distance sea voyages', usage: '/voyage <destination> [crew]', cooldown: '86400s', premium: true }
    },
    utility: {
        calendar: { description: 'View game events and schedules', usage: '/calendar [month] [events]', cooldown: '30s', premium: false },
        convert: { description: 'Convert currencies and measurements', usage: '/convert <amount> <from> <to>', cooldown: '5s', premium: false },
        info: { description: 'Get detailed information about items/players', usage: '/info <target>', cooldown: '10s', premium: false },
        map: { description: 'Display world map and locations', usage: '/map [region] [zoom]', cooldown: '60s', premium: false },
        settings: { description: 'Configure personal bot settings', usage: '/settings [category] [value]', cooldown: '60s', premium: false },
        stats: { description: 'View detailed character statistics', usage: '/stats [category] [comparison]', cooldown: '30s', premium: false },
        tips: { description: 'Get helpful gameplay tips', usage: '/tips [category] [random]', cooldown: '300s', premium: false },
        vote: { description: 'Vote for the bot on listing sites', usage: '/vote [site]', cooldown: '43200s', premium: false }
    },
    weather: {
        alert: { description: 'Set up weather alerts and notifications', usage: '/alert <condition> [location]', cooldown: '3600s', premium: false },
        weather: { description: 'Check current weather conditions', usage: '/weather [location]', cooldown: '300s', premium: false },
        forecast: { description: 'View extended weather forecasts', usage: '/forecast [location] [days]', cooldown: '600s', premium: false }
    }
};

// Enhanced command categories with more detailed information
const commandCategories = {
    general: { 
        name: 'General', 
        emoji: '📋', 
        description: 'Essential commands and basic utilities for all users',
        color: '#95A5A6',
        commandCount: Object.keys(commandDatabase.general || {}).length,
        difficulty: 'Beginner'
    },
    admin: { 
        name: 'Administration', 
        emoji: '🛡️', 
        description: 'Server management and moderation tools',
        color: '#E74C3C',
        commandCount: Object.keys(commandDatabase.admin || {}).length,
        difficulty: 'Advanced'
    },
    alchemy: { 
        name: 'Alchemy', 
        emoji: '🧪', 
        description: 'Mystical brewing, transmutation, and potion crafting',
        color: '#9B59B6',
        commandCount: Object.keys(commandDatabase.alchemy || {}).length,
        difficulty: 'Intermediate'
    },
    bank: { 
        name: 'Banking', 
        emoji: '🏦', 
        description: 'Financial services, loans, and secure transactions',
        color: '#2ECC71',
        commandCount: Object.keys(commandDatabase.bank || {}).length,
        difficulty: 'Beginner'
    },
    blacksmith: { 
        name: 'Blacksmithing', 
        emoji: '⚒️', 
        description: 'Weapon forging, armor crafting, and equipment enhancement',
        color: '#34495E',
        commandCount: Object.keys(commandDatabase.blacksmith || {}).length,
        difficulty: 'Intermediate'
    },
    combat: { 
        name: 'Combat', 
        emoji: '⚔️', 
        description: 'PvP battles, tournaments, and arena competitions',
        color: '#E74C3C',
        commandCount: Object.keys(commandDatabase.combat || {}).length,
        difficulty: 'Intermediate'
    },
    crafting: { 
        name: 'Crafting', 
        emoji: '🔨', 
        description: 'Item creation, recipe management, and specialization',
        color: '#F39C12',
        commandCount: Object.keys(commandDatabase.crafting || {}).length,
        difficulty: 'Intermediate'
    },
    economy: { 
        name: 'Economy', 
        emoji: '💰', 
        description: 'Trading, shopping, investments, and wealth management',
        color: '#F1C40F',
        commandCount: Object.keys(commandDatabase.economy || {}).length,
        difficulty: 'Beginner'
    },
    exploration: { 
        name: 'Exploration', 
        emoji: '🗺️', 
        description: 'Adventure through dungeons, expeditions, and resource gathering',
        color: '#3498DB',
        commandCount: Object.keys(commandDatabase.exploration || {}).length,
        difficulty: 'Intermediate'
    },
    farming: { 
        name: 'Farming', 
        emoji: '🌾', 
        description: 'Agricultural management, crop cultivation, and harvesting',
        color: '#27AE60',
        commandCount: Object.keys(commandDatabase.farming || {}).length,
        difficulty: 'Beginner'
    },
    fishing: { 
        name: 'Fishing', 
        emoji: '🎣', 
        description: 'Aquatic adventures, fish trading, and equipment upgrades',
        color: '#3498DB',
        commandCount: Object.keys(commandDatabase.fishing || {}).length,
        difficulty: 'Beginner'
    },
    gambling: { 
        name: 'Gambling', 
        emoji: '🎰', 
        description: 'Games of chance, risk, and potential fortune',
        color: '#E67E22',
        commandCount: Object.keys(commandDatabase.gambling || {}).length,
        difficulty: 'Beginner'
    },
    games: { 
        name: 'Games', 
        emoji: '🎮', 
        description: 'Mini-games, puzzles, challenges, and entertainment',
        color: '#E67E22',
        commandCount: Object.keys(commandDatabase.games || {}).length,
        difficulty: 'Beginner'
    },
    housing: { 
        name: 'Housing', 
        emoji: '🏠', 
        description: 'Property management, construction, and decoration',
        color: '#95A5A6',
        commandCount: Object.keys(commandDatabase.housing || {}).length,
        difficulty: 'Intermediate'
    },
    magic: { 
        name: 'Magic', 
        emoji: '✨', 
        description: 'Spellcasting, enchanting, and mystical research',
        color: '#9B59B6',
        commandCount: Object.keys(commandDatabase.magic || {}).length,
        difficulty: 'Advanced'
    },
    merchant: { 
        name: 'Merchant', 
        emoji: '🏪', 
        description: 'Trading networks, caravans, and commercial activities',
        color: '#F39C12',
        commandCount: Object.keys(commandDatabase.merchant || {}).length,
        difficulty: 'Intermediate'
    },
    mining: { 
        name: 'Mining', 
        emoji: '⛏️', 
        description: 'Resource extraction, excavation, and underground exploration',
        color: '#95A5A6',
        commandCount: Object.keys(commandDatabase.mining || {}).length,
        difficulty: 'Intermediate'
    },
    pets: { 
        name: 'Pet Management', 
        emoji: '🐕', 
        description: 'Companion care, training, and stable management',
        color: '#E91E63',
        commandCount: Object.keys(commandDatabase.pets || {}).length,
        difficulty: 'Beginner'
    },
    quests: { 
        name: 'Quests', 
        emoji: '📜', 
        description: 'Story missions, adventures, and objective tracking',
        color: '#3F51B5',
        commandCount: Object.keys(commandDatabase.quests || {}).length,
        difficulty: 'Intermediate'
    },
    rpg: { 
        name: 'RPG Combat', 
        emoji: '🎯', 
        description: 'Advanced battle systems, raids, and tactical combat',
        color: '#E74C3C',
        commandCount: Object.keys(commandDatabase.rpg || {}).length,
        difficulty: 'Advanced'
    },
    skills: { 
        name: 'Skills', 
        emoji: '📈', 
        description: 'Character development, mastery systems, and professions',
        color: '#FF9800',
        commandCount: Object.keys(commandDatabase.skills || {}).length,
        difficulty: 'Intermediate'
    },
    social: { 
        name: 'Social', 
        emoji: '👥', 
        description: 'Community features, guilds, parties, and achievements',
        color: '#3498DB',
        commandCount: Object.keys(commandDatabase.social || {}).length,
        difficulty: 'Beginner'
    },
    tavern: { 
        name: 'Tavern', 
        emoji: '🍺', 
        description: 'Social hub, rest, refreshment, and community gathering',
        color: '#D35400',
        commandCount: Object.keys(commandDatabase.tavern || {}).length,
        difficulty: 'Beginner'
    },
    transportation: { 
        name: 'Transportation', 
        emoji: '🚂', 
        description: 'Travel systems, mounts, and long-distance journeys',
        color: '#607D8B',
        commandCount: Object.keys(commandDatabase.transportation || {}).length,
        difficulty: 'Intermediate'
    },
    utility: { 
        name: 'Utilities', 
        emoji: '🛠️', 
        description: 'Helpful tools, converters, information, and settings',
        color: '#95A5A6',
        commandCount: Object.keys(commandDatabase.utility || {}).length,
        difficulty: 'Beginner'
    },
    weather: { 
        name: 'Weather', 
        emoji: '🌤️', 
        description: 'Environmental systems, forecasts, and climate alerts',
        color: '#00BCD4',
        commandCount: Object.keys(commandDatabase.weather || {}).length,
        difficulty: 'Beginner'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('📚 Access the comprehensive command database and tutorials')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Select a specific command category to explore')
                .setRequired(false)
                .addChoices(
                    { name: '📋 General Commands', value: 'general' },
                    { name: '💰 Economy & Finance', value: 'economy' },
                    { name: '⚔️ Combat & PvP', value: 'combat' },
                    { name: '🗺️ Exploration & Adventure', value: 'exploration' },
                    { name: '🔨 Crafting & Creation', value: 'crafting' },
                    { name: '👥 Social & Community', value: 'social' },
                    { name: '🛡️ Admin & Management', value: 'admin' },
                    { name: '🎮 Games & Entertainment', value: 'games' },
                    { name: '✨ Magic & Mysticism', value: 'magic' },
                    { name: '🏪 Trading & Commerce', value: 'merchant' }
                ))
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get detailed help for a specific command')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('advanced')
                .setDescription('Show advanced features and premium commands')
                .setRequired(false)),

    async execute(interaction) {
        const category = interaction.options?.getString('category');
        const command = interaction.options?.getString('command');
        const showAdvanced = interaction.options?.getBoolean('advanced') || false;

        try {
            if (command) {
                await this.showCommandHelp(interaction, command);
            } else if (category) {
                await this.showCategoryHelp(interaction, category, showAdvanced);
            } else {
                await this.showMainHelp(interaction, showAdvanced);
            }
        } catch (error) {
            console.error('Help command error:', error);
            await this.handleCommandError(interaction, error);
        }
    },

    async showMainHelp(interaction, showAdvanced = false) {
        const totalCommands = Object.values(commandDatabase).reduce((total, category) => 
            total + Object.keys(category).length, 0
        );

        const premiumCommands = Object.values(commandDatabase).reduce((total, category) => 
            total + Object.values(category).filter(cmd => cmd.premium).length, 0
        );

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🎮 Ultimate RPG Bot Command Center')
            .setDescription(`Welcome to the most comprehensive RPG experience! Explore **${totalCommands}** commands across **${Object.keys(commandCategories).length}** categories.`)
            .addFields([
                {
                    name: '🚀 Quick Start Guide',
                    value: '• **New Player?** Try `/profile` → `/daily` → `/hunt`\n• **Want Money?** Use `/work` → `/shop` → `/invest`\n• **Love Combat?** Try `/arena` → `/battle` → `/tournament`',
                    inline: false
                },
                {
                    name: '⭐ Featured Categories',
                    value: `🗺️ **Exploration** (${commandCategories.exploration.commandCount} commands)\n💰 **Economy** (${commandCategories.economy.commandCount} commands)\n⚔️ **Combat** (${commandCategories.combat.commandCount} commands)`,
                    inline: true
                },
                {
                    name: '🔥 Popular Commands',
                    value: '• `/hunt` - Adventure & treasures\n• `/battle` - Epic combat system\n• `/craft` - Create amazing items',
                    inline: true
                },
                {
                    name: '💎 Premium Features',
                    value: showAdvanced ? `Unlock **${premiumCommands}** premium commands with advanced features!` : 'Use `/help advanced:true` to see premium features',
                    inline: false
                }
            ])
            .setFooter({ 
                text: `🎯 Use the dropdown menu or buttons below • Total Commands: ${totalCommands}` 
            })
            .setTimestamp();

        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('🎯 Choose a command category to explore...')
            .addOptions(
                Object.entries(commandCategories).slice(0, 25).map(([key, category]) => ({
                    label: `${category.name} (${category.commandCount})`,
                    description: `${category.difficulty} • ${category.description.slice(0, 50)}...`,
                    value: key,
                    emoji: category.emoji
                }))
            );

        const navigationButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_premium')
                    .setLabel('💎 Premium')
                    .setStyle(ButtonStyle.Success)
            );

        const components = [
            new ActionRowBuilder().addComponents(categorySelect),
            navigationButtons
        ];

        await interaction.reply({ embeds: [embed], components });
        await this.setupCollector(interaction, showAdvanced);
    },

    async showCategoryHelp(interaction, category, showAdvanced = false) {
        const categoryInfo = commandCategories[category];
        const commands = commandDatabase[category];

        if (!categoryInfo || !commands) {
            return await interaction.reply({
                content: '❌ Invalid category specified!',
                ephemeral: true
            });
        }

        const commandList = Object.entries(commands);
        const regularCommands = commandList.filter(([_, cmd]) => !cmd.premium);
        const premiumCommands = commandList.filter(([_, cmd]) => cmd.premium);

        const embed = new EmbedBuilder()
            .setColor(categoryInfo.color || '#3498DB')
            .setTitle(`${categoryInfo.emoji} ${categoryInfo.name} Commands`)
            .setDescription(`${categoryInfo.description}\n\n**Difficulty Level:** ${categoryInfo.difficulty} • **Commands Available:** ${commandList.length}`)
            .setFooter({ text: `Category: ${categoryInfo.name} • Use /help command:<name> for detailed info` })
            .setTimestamp();

        // Add regular commands
        if (regularCommands.length > 0) {
            const commandText = regularCommands
                .slice(0, 10) // Limit to prevent embed size issues
                .map(([name, cmd]) => `\`/${name}\` - ${cmd.description}`)
                .join('\n');

            embed.addFields({
                name: '📋 Available Commands',
                value: commandText + (regularCommands.length > 10 ? `\n*...and ${regularCommands.length - 10} more*` : ''),
                inline: false
            });
        }

        // Add premium commands if requested
        if (showAdvanced && premiumCommands.length > 0) {
            const premiumText = premiumCommands
                .slice(0, 5)
                .map(([name, cmd]) => `\`/${name}\` 💎 - ${cmd.description}`)
                .join('\n');

            embed.addFields({
                name: '💎 Premium Commands',
                value: premiumText + (premiumCommands.length > 5 ? `\n*...and ${premiumCommands.length - 5} more premium commands*` : ''),
                inline: false
            });
        }

        // Add usage examples
        const exampleCommands = commandList.slice(0, 3);
        if (exampleCommands.length > 0) {
            const examples = exampleCommands
                .map(([name, cmd]) => `\`${cmd.usage}\` (⏱️ ${cmd.cooldown})`)
                .join('\n');

            embed.addFields({
                name: '💡 Usage Examples',
                value: examples,
                inline: false
            });
        }

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back_main')
                    .setLabel('◀️ Back to Main')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`help_detailed_${category}`)
                    .setLabel('📖 Detailed View')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`help_examples_${category}`)
                    .setLabel('💡 Examples')
                    .setStyle(ButtonStyle.Success)
            );

        const isReply = !interaction.deferred && !interaction.replied;
        const response = isReply 
            ? await interaction.reply({ embeds: [embed], components: [backButton] })
            : await interaction.editReply({ embeds: [embed], components: [backButton] });

        await this.setupCollector(interaction, showAdvanced);
    },

    async showCommandHelp(interaction, commandName) {
        // Find the command in the database
        let foundCommand = null;
        let foundCategory = null;

        for (const [category, commands] of Object.entries(commandDatabase)) {
            if (commands[commandName]) {
                foundCommand = commands[commandName];
                foundCategory = category;
                break;
            }
        }

        if (!foundCommand) {
            return await interaction.reply({
                content: `❌ Command \`/${commandName}\` not found! Use \`/help\` to see all available commands.`,
                ephemeral: true
            });
        }

        const categoryInfo = commandCategories[foundCategory];

        const embed = new EmbedBuilder()
            .setColor(categoryInfo.color || '#3498DB')
            .setTitle(`${foundCommand.premium ? '💎 ' : ''}/${commandName}`)
            .setDescription(foundCommand.description)
            .addFields([
                {
                    name: '📝 Usage',
                    value: `\`${foundCommand.usage}\``,
                    inline: false
                },
                {
                    name: '⏱️ Cooldown',
                    value: foundCommand.cooldown,
                    inline: true
                },
                {
                    name: '📂 Category',
                    value: `${categoryInfo.emoji} ${categoryInfo.name}`,
                    inline: true
                },
                {
                    name: '💎 Premium',
                    value: foundCommand.premium ? 'Yes' : 'No',
                    inline: true
                }
            ])
            .setFooter({ text: `Command: /${commandName} • Category: ${categoryInfo.name}` })
            .setTimestamp();

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back_main')
                    .setLabel('◀️ Main Menu')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`help_category_${foundCategory}`)
                    .setLabel(`📂 ${categoryInfo.name}`)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`help_try_${commandName}`)
                    .setLabel('🎮 Try Command')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({ embeds: [embed], components: [actionButtons] });
        await this.setupCollector(interaction);
    },

    async showSearchResults(interaction, searchTerm) {
        const results = [];

        // Search through all commands
        for (const [category, commands] of Object.entries(commandDatabase)) {
            for (const [name, cmd] of Object.entries(commands)) {
                if (name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    cmd.description.toLowerCase().includes(searchTerm.toLowerCase())) {
                    results.push({
                        name,
                        category,
                        command: cmd,
                        categoryInfo: commandCategories[category]
                    });
                }
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle(`🔍 Search Results: "${searchTerm}"`)
            .setDescription(`Found **${results.length}** commands matching your search.`)
            .setTimestamp();

        if (results.length === 0) {
            embed.setDescription('No commands found matching your search term. Try different keywords!');
        } else {
            const displayResults = results.slice(0, 10);
            const resultText = displayResults
                .map(result => `\`/${result.name}\` ${result.command.premium ? '💎' : ''} - ${result.command.description}\n*${result.categoryInfo.emoji} ${result.categoryInfo.name}*`)
                .join('\n\n');

            embed.addFields({
                name: '📋 Matching Commands',
                value: resultText + (results.length > 10 ? `\n\n*...and ${results.length - 10} more results*` : ''),
                inline: false
            });
        }

        const searchButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back_main')
                    .setLabel('◀️ Back to Main')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('help_new_search')
                    .setLabel('🔍 New Search')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.editReply({ embeds: [embed], components: [searchButtons] });
    },

    async setupCollector(interaction, showAdvanced = false) {
        try {
            // Clean up any existing collector for this user
            this.cleanupCollector(interaction.user.id);

            const response = await interaction.fetchReply();
            const collector = response.createMessageComponentCollector({
                time: 600000 // 10 minutes
            });

            activeCollectors.set(interaction.user.id, collector);

            collector.on('collect', async (componentInteraction) => {
                if (componentInteraction.user.id !== interaction.user.id) {
                    return componentInteraction.reply({
                        content: '❌ You cannot interact with someone else\'s help menu!',
                        ephemeral: true
                    });
                }

                try {
                    await componentInteraction.deferUpdate();

                    const customId = componentInteraction.customId;

                    if (customId === 'help_category_select') {
                        const selectedCategory = componentInteraction.values[0];
                        await this.showCategoryHelp(componentInteraction, selectedCategory, showAdvanced);
                    } else if (customId === 'help_back_main') {
                        await this.showMainHelp(componentInteraction, showAdvanced);
                    } else if (customId === 'help_random_command') {
                        await this.showRandomCommand(componentInteraction);
                    } else if (customId === 'help_search') {
                        await this.showSearchPrompt(componentInteraction);
                    } else if (customId === 'help_premium') {
                        await this.showPremiumFeatures(componentInteraction);
                    } else if (customId.startsWith('help_category_')) {
                        const category = customId.replace('help_category_', '');
                        await this.showCategoryHelp(componentInteraction, category, showAdvanced);
                    } else if (customId.startsWith('help_detailed_')) {
                        const category = customId.replace('help_detailed_', '');
                        await this.showDetailedCategory(componentInteraction, category);
                    } else if (customId.startsWith('help_try_')) {
                        const commandName = customId.replace('help_try_', '');
                        await this.showCommandTryPrompt(componentInteraction, commandName);
                    }
                } catch (error) {
                    console.error('Help interaction error:', error);
                    await componentInteraction.followUp({
                        content: '❌ An error occurred processing your request.',
                        ephemeral: true
                    }).catch(() => {});
                }
            });

            collector.on('end', async (collected, reason) => {
                try {
                    activeCollectors.delete(interaction.user.id);
                    if (reason === 'time') {
                        await this.handleTimeout(interaction);
                    }
                } catch (error) {
                    console.error('Error handling collector end:', error);
                }
            });

        } catch (error) {
            console.error('Error setting up collector:', error);
        }
    },

    async showRandomCommand(interaction) {
        const allCommands = [];

        // Collect all commands
        for (const [category, commands] of Object.entries(commandDatabase)) {
            for (const [name, cmd] of Object.entries(commands)) {
                allCommands.push({ name, category, command: cmd });
            }
        }

        const randomCommand = allCommands[Math.floor(Math.random() * allCommands.length)];
        const categoryInfo = commandCategories[randomCommand.category];

        const embed = new EmbedBuilder()
            .setColor(categoryInfo.color)
            .setTitle(`🎲 Random Command: ${randomCommand.command.premium ? '💎 ' : ''}/${randomCommand.name}`)
            .setDescription(randomCommand.command.description)
            .addFields([
                {
                    name: '📝 Usage',
                    value: `\`${randomCommand.command.usage}\``,
                    inline: false
                },
                {
                    name: '📂 Category',
                    value: `${categoryInfo.emoji} ${categoryInfo.name}`,
                    inline: true
                },
                {
                    name: '⏱️ Cooldown',
                    value: randomCommand.command.cooldown,
                    inline: true
                }
            ])
            .setFooter({ text: 'Click the dice again for another random command!' })
            .setTimestamp();

        const randomButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_random_command')
                    .setLabel('🎲 Another Random')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`help_category_${randomCommand.category}`)
                    .setLabel(`📂 ${categoryInfo.name}`)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_back_main')
                    .setLabel('◀️ Main Menu')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [randomButtons] });
    },

    async showPremiumFeatures(interaction) {
        const premiumCommands = [];

        for (const [category, commands] of Object.entries(commandDatabase)) {
            for (const [name, cmd] of Object.entries(commands)) {
                if (cmd.premium) {
                    premiumCommands.push({
                        name,
                        category,
                        command: cmd,
                        categoryInfo: commandCategories[category]
                    });
                }
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💎 Premium Features & Commands')
            .setDescription(`Unlock **${premiumCommands.length}** exclusive premium commands with advanced features, extended cooldowns, and special bonuses!`)
            .addFields([
                {
                    name: '✨ Premium Benefits',
                    value: '• Extended command limits\n• Exclusive premium commands\n• Priority support\n• Special badges and titles\n• Advanced features access',
                    inline: false
                },
                {
                    name: '🔥 Featured Premium Commands',
                    value: premiumCommands.slice(0, 5)
                        .map(cmd => `\`/${cmd.name}\` - ${cmd.command.description.slice(0, 40)}...`)
                        .join('\n'),
                    inline: false
                }
            ])
            .setFooter({ text: 'Premium features enhance your gaming experience significantly!' })
            .setTimestamp();

        const premiumButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back_main')
                    .setLabel('◀️ Back to Main')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setLabel('💎 Get Premium')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.com') // Replace with actual premium link
            );

        await interaction.editReply({ embeds: [embed], components: [premiumButtons] });
    },

    async showDetailedCategory(interaction, category) {
        const categoryInfo = commandCategories[category];
        const commands = commandDatabase[category];

        if (!categoryInfo || !commands) return;

        const embed = new EmbedBuilder()
            .setColor(categoryInfo.color)
            .setTitle(`📖 Detailed Guide: ${categoryInfo.emoji} ${categoryInfo.name}`)
            .setDescription(`${categoryInfo.description}\n\n**Complete command list with usage examples:**`)
            .setFooter({ text: `Category Guide: ${categoryInfo.name}` })
            .setTimestamp();

        const commandEntries = Object.entries(commands);
        const chunks = [];

        // Split commands into chunks for multiple fields
        for (let i = 0; i < commandEntries.length; i += 5) {
            chunks.push(commandEntries.slice(i, i + 5));
        }

        chunks.forEach((chunk, index) => {
            const fieldValue = chunk
                .map(([name, cmd]) => `**/${name}** ${cmd.premium ? '💎' : ''}\n${cmd.description}\n\`${cmd.usage}\` • ⏱️ ${cmd.cooldown}`)
                .join('\n\n');

            embed.addFields({
                name: index === 0 ? '📋 Commands' : '📋 More Commands',
                value: fieldValue,
                inline: false
            });
        });

        const detailedButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`help_category_${category}`)
                    .setLabel('◀️ Back to Category')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('help_back_main')
                    .setLabel('🏠 Main Menu')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.editReply({ embeds: [embed], components: [detailedButtons] });
    },

    cleanupCollector(userId) {
        const existingCollector = activeCollectors.get(userId);
        if (existingCollector && !existingCollector.ended) {
            existingCollector.stop('cleanup');
        }
        activeCollectors.delete(userId);
    },

    async handleTimeout(interaction) {
        try {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#6C757D')
                .setTitle('⏰ Help Menu Expired')
                .setDescription('This help menu has expired due to inactivity. Use `/help` to open a new interactive menu.')
                .addFields({
                    name: '🚀 Quick Access',
                    value: '• `/help category:general` - Basic commands\n• `/help category:economy` - Money commands\n• `/help command:profile` - Specific command help',
                    inline: false
                })
                .setFooter({ text: 'Help menus expire after 10 minutes of inactivity' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [timeoutEmbed],
                components: []
            }).catch(() => {});
        } catch (error) {
            console.error('Error handling timeout:', error);
        }
    },

    async showFavorites(interaction) {
        // This would integrate with a user preferences system
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⭐ Your Favorite Commands')
            .setDescription('Save your most-used commands for quick access! (Feature coming soon)')
            .addFields([
                {
                    name: '🔥 Popular Favorites',
                    value: '• `/daily` - Most claimed command\n• `/hunt` - Most adventurous\n• `/profile` - Most viewed stats\n• `/shop` - Shopping favorite',
                    inline: false
                },
                {
                    name: '💡 Pro Tip',
                    value: 'Commands you use frequently will automatically appear here!',
                    inline: false
                }
            ])
            .setFooter({ text: 'Favorites system will track your usage patterns' })
            .setTimestamp();

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back_main')
                    .setLabel('◀️ Back to Main')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [backButton] });
    },

    async showSearchPrompt(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🔍 Command Search')
            .setDescription('Search functionality coming soon! For now, use the category dropdown to browse commands.')
            .addFields([
                {
                    name: '🎯 Quick Find Tips',
                    value: '• **Economy commands**: `/help category:economy`\n• **Combat commands**: `/help category:combat`\n• **Specific command**: `/help command:<n>`',
                    inline: false
                },
                {
                    name: '🔮 Coming Features',
                    value: '• Text-based search\n• Tag filtering\n• Fuzzy matching\n• Command suggestions',
                    inline: false
                }
            ])
            .setFooter({ text: 'Use categories for now - search coming in next update!' })
            .setTimestamp();

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back_main')
                    .setLabel('◀️ Back to Main')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [backButton] });
    },

    async showCommandTryPrompt(interaction, commandName) {
        const embed = new EmbedBuilder()
            .setColor('#28A745')
            .setTitle(`🎮 Try: /${commandName}`)
            .setDescription(`Ready to try the \`/${commandName}\` command? Here's what you need to know:`)
            .addFields([
                {
                    name: '📝 How to Use',
                    value: `Simply type \`/${commandName}\` in any channel where the bot is active.`,
                    inline: false
                },
                {
                    name: '💡 Quick Tip',
                    value: 'Discord will show you available options as you type!',
                    inline: false
                }
            ])
            .setFooter({ text: `Command: /${commandName}` })
            .setTimestamp();

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back_main')
                    .setLabel('◀️ Back to Help')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [backButton] });
    },

    async showCategoryExamples(interaction, category) {
        const categoryInfo = commandCategories[category];
        const commands = commandDatabase[category];

        if (!categoryInfo || !commands) return;

        // Get example commands with detailed usage
        const examples = Object.entries(commands).slice(0, 4).map(([name, cmd]) => {
            const parts = cmd.usage.split(' ');
            const baseCommand = parts[0];
            const params = parts.slice(1).join(' ');

            return {
                name: `/${name}`,
                value: `**Usage:** \`${cmd.usage}\`\n**Example:** \`${baseCommand} ${this.generateExampleParams(name, params)}\`\n**Cooldown:** ${cmd.cooldown}`,
                inline: false
            };
        });

        const embed = new EmbedBuilder()
            .setColor(categoryInfo.color)
            .setTitle(`💡 ${categoryInfo.emoji} ${categoryInfo.name} Examples`)
            .setDescription('Here are detailed usage examples for this category:')
            .addFields(examples)
            .setFooter({ text: `Category: ${categoryInfo.name} • Replace <> with your values` })
            .setTimestamp();

        const backButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`help_category_${category}`)
                    .setLabel('◀️ Back to Category')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('help_back_main')
                    .setLabel('🏠 Main Menu')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.editReply({ embeds: [embed], components: [backButtons] });
    },

    generateExampleParams(commandName, params) {
        // Generate realistic example parameters for commands
        const examples = {
            'hunt': 'easy',
            'fish': 'lake',
            'mine': '10',
            'craft': 'iron_sword 2',
            'buy': 'health_potion 5',
            'gamble': '100',
            'battle': '@opponent',
            'travel': 'forest',
            'brew': 'health_potion',
            'forge': 'iron_sword fire_rune',
            'loan': '500 30',
            'transfer': '@friend 200',
            'upgrade': 'sword 2'
        };

        if (examples[commandName]) {
            return examples[commandName];
        }

        // Generic parameter replacement
        return params
            .replace('<amount>', '100')
            .replace('<user>', '@friend')
            .replace('<item>', 'sword')
            .replace('<number>', '5')
            .replace('<quantity>', '3')
            .replace('<target>', 'goblin')
            .replace('<location>', 'forest')
            .replace('[', '')
            .replace(']', '')
            || 'example_value';
    },

    // Integration method for existing button handler
    async handleHelpButtons(interaction, args, userId) {
        const action = args.join('_');

        try {
            // Handle different help button actions
            switch (action) {
                case 'back_main':
                    await this.showMainHelp(interaction, false);
                    break;
                case 'random_command':
                    await this.showRandomCommand(interaction);
                    break;
                case 'search':
                    await this.showSearchPrompt(interaction);
                    break;
                case 'premium':
                    await this.showPremiumFeatures(interaction);
                    break;
                case 'favorites':
                    await this.showFavorites(interaction);
                    break;
                case 'retry':
                    await this.showMainHelp(interaction, false);
                    break;
                default:
                    if (action.startsWith('category_')) {
                        const category = action.replace('category_', '');
                        await this.showCategoryHelp(interaction, category, false);
                    } else if (action.startsWith('detailed_')) {
                        const category = action.replace('detailed_', '');
                        await this.showDetailedCategory(interaction, category);
                    } else if (action.startsWith('try_')) {
                        const commandName = action.replace('try_', '');
                        await this.showCommandTryPrompt(interaction, commandName);
                    } else if (action.startsWith('examples_')) {
                        const category = action.replace('examples_', '');
                        await this.showCategoryExamples(interaction, category);
                    } else {
                        await interaction.reply({
                            content: '❌ Unknown help action.',
                            ephemeral: true
                        });
                    }
            }
        } catch (error) {
            console.error('Help button error:', error);
            await interaction.reply({
                content: '❌ An error occurred processing your help request.',
                ephemeral: true
            }).catch(() => {});
        }
    },
        console.error('Command error details:', error);

        try {
            const errorEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('🚫 Help System Error')
                .setDescription('The help system encountered an unexpected error while processing your request.')
                .addFields([
                    {
                        name: '🔧 Troubleshooting Steps',
                        value: '• Try using `/help` again\n• Check if you have the required permissions\n• Try a specific category: `/help category:general`',
                        inline: false
                    },
                    {
                        name: '📞 Support',
                        value: 'If this error persists, please report it to our support team with the error details.',
                        inline: false
                    }
                ])
                .setFooter({ text: 'Error occurred while loading help system' })
                .setTimestamp();

            const errorButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('🔄 Try Again')
                        .setCustomId('help_retry')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setLabel('📞 Report Bug')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://discord.com') // Replace with actual support link
                );

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errorEmbed], components: [errorButtons] }).catch(() => {});
            } else {
                await interaction.reply({ embeds: [errorEmbed], components: [errorButtons], ephemeral: true }).catch(() => {});
            }
        } catch (error) {
            console.error('Error in error handler:', error);
        }
    }
};CustomId('help_random_command')
                    .setLabel('🎲 Random Command')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('help_search')
                    .setLabel('🔍 Search Commands')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('help_favorites')
                    .setLabel('⭐ My Favorites')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .set