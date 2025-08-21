
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

// Comprehensive fishing locations with detailed properties
const fishingLocations = {
    // Beginner Areas
    village_pond: {
        name: 'Peaceful Village Pond',
        emoji: '🏞️',
        difficulty: 'Beginner',
        level: 1,
        description: 'A tranquil pond surrounded by willow trees, perfect for learning',
        climate: 'Temperate',
        depth: 'Shallow (2-5 meters)',
        water_type: 'Freshwater',
        fish_variety: ['Common Carp', 'Bluegill', 'Small Bass', 'Minnows'],
        hazards: ['Tangled Lines', 'Shallow Waters'],
        special_features: ['Lily Pads', 'Gentle Current', 'Abundant Wildlife'],
        unlock_cost: 0,
        energy_cost: 5,
        bonuses: { beginner_xp: 1.5 },
        weather_effects: {
            sunny: { catch_rate: 1.2, description: 'Fish are active in the warm sun' },
            rainy: { catch_rate: 0.8, description: 'Fish hide deeper during rain' },
            cloudy: { catch_rate: 1.0, description: 'Perfect overcast conditions' }
        }
    },
    
    coastal_bay: {
        name: 'Serene Coastal Bay',
        emoji: '🌊',
        difficulty: 'Easy',
        level: 3,
        description: 'Protected bay waters with gentle waves and diverse marine life',
        climate: 'Coastal',
        depth: 'Medium (5-15 meters)',
        water_type: 'Saltwater',
        fish_variety: ['Sea Bass', 'Flounder', 'Mullet', 'Coastal Sharks'],
        hazards: ['Tidal Changes', 'Jellyfish', 'Strong Currents'],
        special_features: ['Coral Reefs', 'Tidal Pools', 'Seabird Activity'],
        unlock_cost: 100,
        energy_cost: 10,
        bonuses: { saltwater_bonus: 1.3 },
        weather_effects: {
            sunny: { catch_rate: 1.1, description: 'Clear waters reveal fish movements' },
            stormy: { catch_rate: 1.4, description: 'Storm brings deep-water fish closer' },
            foggy: { catch_rate: 0.9, description: 'Limited visibility affects fishing' }
        }
    },

    mountain_lake: {
        name: 'Crystal Mountain Lake',
        emoji: '🏔️',
        difficulty: 'Intermediate',
        level: 8,
        description: 'High-altitude pristine lake fed by glacial meltwater',
        climate: 'Alpine',
        depth: 'Deep (20-50 meters)',
        water_type: 'Freshwater',
        fish_variety: ['Rainbow Trout', 'Lake Trout', 'Mountain Char', 'Golden Salmon'],
        hazards: ['Altitude Sickness', 'Cold Water', 'Sudden Weather Changes'],
        special_features: ['Crystal Clear Waters', 'Alpine Scenery', 'Glacial Streams'],
        unlock_cost: 500,
        energy_cost: 15,
        bonuses: { rare_chance: 1.4, cold_water_bonus: 1.2 },
        weather_effects: {
            sunny: { catch_rate: 1.3, description: 'Melting glaciers increase food supply' },
            snowy: { catch_rate: 0.7, description: 'Fish become less active in cold' },
            windy: { catch_rate: 1.1, description: 'Wind stirs up nutrients' }
        }
    },

    rushing_river: {
        name: 'Wild Rapids River',
        emoji: '🏞️',
        difficulty: 'Intermediate',
        level: 10,
        description: 'Fast-flowing river cutting through ancient forests',
        climate: 'Forest',
        depth: 'Variable (1-20 meters)',
        water_type: 'Freshwater',
        fish_variety: ['Salmon', 'Steelhead', 'River Trout', 'Pike'],
        hazards: ['Strong Currents', 'Rocky Bottom', 'Flash Floods'],
        special_features: ['Waterfalls', 'Deep Pools', 'Fast Rapids', 'Ancient Trees'],
        unlock_cost: 750,
        energy_cost: 20,
        bonuses: { fighting_fish_bonus: 1.5, current_fishing: 1.2 },
        weather_effects: {
            rainy: { catch_rate: 1.5, description: 'Rain brings nutrients and insects' },
            drought: { catch_rate: 0.6, description: 'Low water concentrates fish' },
            normal: { catch_rate: 1.0, description: 'Steady flow conditions' }
        }
    },

    deep_ocean: {
        name: 'Abyssal Deep Ocean',
        emoji: '🌊',
        difficulty: 'Advanced',
        level: 15,
        description: 'Miles from shore, where the ocean floor disappears into darkness',
        climate: 'Oceanic',
        depth: 'Very Deep (100+ meters)',
        water_type: 'Deep Saltwater',
        fish_variety: ['Tuna', 'Marlin', 'Swordfish', 'Deep Sea Rays'],
        hazards: ['Rough Seas', 'Large Predators', 'Equipment Failure'],
        special_features: ['Thermal Vents', 'Whale Migration Routes', 'Bioluminescent Life'],
        unlock_cost: 2000,
        energy_cost: 30,
        bonuses: { big_game_bonus: 2.0, deep_water_species: 1.8 },
        weather_effects: {
            calm: { catch_rate: 1.0, description: 'Peaceful deep-water fishing' },
            rough: { catch_rate: 1.6, description: 'Storms bring nutrients from depths' },
            hurricane: { catch_rate: 0.3, description: 'Extremely dangerous conditions' }
        }
    },

    mystic_lagoon: {
        name: 'Enchanted Mystic Lagoon',
        emoji: '✨',
        difficulty: 'Expert',
        level: 20,
        description: 'Hidden lagoon where magic flows through crystal-clear waters',
        climate: 'Magical',
        depth: 'Mystical (Varies)',
        water_type: 'Enchanted Water',
        fish_variety: ['Golden Carp', 'Phoenix Koi', 'Spirit Fish', 'Celestial Rays'],
        hazards: ['Magical Interference', 'Time Distortions', 'Elemental Spirits'],
        special_features: ['Floating Crystals', 'Luminous Waterfalls', 'Ancient Ruins'],
        unlock_cost: 5000,
        energy_cost: 40,
        bonuses: { magical_fish: 3.0, legendary_chance: 2.5 },
        weather_effects: {
            aurora: { catch_rate: 2.0, description: 'Aurora lights attract mythical fish' },
            eclipse: { catch_rate: 1.8, description: 'Rare celestial alignment' },
            normal: { catch_rate: 1.2, description: 'Magical energies flow freely' }
        }
    },

    void_depths: {
        name: 'Interdimensional Void Depths',
        emoji: '🌌',
        difficulty: 'Legendary',
        level: 35,
        description: 'Reality bends here - fish from other dimensions swim in starlit waters',
        climate: 'Otherworldly',
        depth: 'Infinite',
        water_type: 'Void Water',
        fish_variety: ['Cosmic Leviathan', 'Void Dragons', 'Starlight Entities', 'Reality Fish'],
        hazards: ['Reality Tears', 'Dimensional Storms', 'Existence Erosion'],
        special_features: ['Floating Islands', 'Star Portals', 'Time Loops'],
        unlock_cost: 25000,
        energy_cost: 80,
        bonuses: { cosmic_fish: 5.0, reality_bending: 4.0 },
        weather_effects: {
            void_storm: { catch_rate: 3.0, description: 'Interdimensional chaos creates opportunities' },
            calm_void: { catch_rate: 1.5, description: 'Peaceful cosmic fishing' },
            reality_flux: { catch_rate: 2.5, description: 'Reality shifts bring new species' }
        }
    },

    time_stream: {
        name: 'Temporal Fishing Stream',
        emoji: '⏰',
        difficulty: 'Mythical',
        level: 50,
        description: 'Fish from past, present, and future converge in these timeless waters',
        climate: 'Temporal',
        depth: 'Across Time',
        water_type: 'Temporal Flow',
        fish_variety: ['Ancient Megalodons', 'Future Evolution Fish', 'Time Paradox Salmon'],
        hazards: ['Temporal Loops', 'Causality Breaks', 'Timeline Erasure'],
        special_features: ['Past Echoes', 'Future Visions', 'Time Crystals'],
        unlock_cost: 100000,
        energy_cost: 150,
        bonuses: { temporal_fish: 10.0, time_mastery: 8.0 },
        weather_effects: {
            time_storm: { catch_rate: 5.0, description: 'Temporal chaos opens all timelines' },
            stable_flow: { catch_rate: 2.0, description: 'Steady temporal current' }
        }
    }
};

// Special events that can occur at locations
const locationEvents = {
    fish_school: {
        name: 'Fish School Migration',
        emoji: '🐟',
        description: 'A massive school of fish passes through!',
        bonus: { catch_rate: 2.0, duration: 600000 }, // 10 minutes
        rarity: 0.15
    },
    feeding_frenzy: {
        name: 'Feeding Frenzy',
        emoji: '🦈',
        description: 'Predator activity creates a feeding frenzy!',
        bonus: { rare_chance: 3.0, duration: 300000 }, // 5 minutes
        rarity: 0.08
    },
    mystical_blessing: {
        name: 'Mystical Waters Blessing',
        emoji: '✨',
        description: 'Ancient spirits bless these waters!',
        bonus: { legendary_chance: 5.0, xp_bonus: 2.0, duration: 900000 }, // 15 minutes
        rarity: 0.05
    },
    treasure_school: {
        name: 'Treasure Fish School',
        emoji: '💎',
        description: 'Fish carrying precious items swim nearby!',
        bonus: { treasure_chance: 1.0, coin_bonus: 3.0, duration: 450000 }, // 7.5 minutes
        rarity: 0.03
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fishingspots')
        .setDescription('🗺️ Explore and manage fishing locations across the realm')
        .addSubcommand(subcommand =>
            subcommand
                .setName('explore')
                .setDescription('🔍 Discover new fishing spots'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('locations')
                .setDescription('📍 View all discovered locations'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('travel')
                .setDescription('🚶 Travel to a specific location')
                .addStringOption(option =>
                    option.setName('destination')
                        .setDescription('Where would you like to go?')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('weather')
                .setDescription('🌤️ Check weather conditions at all locations'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('events')
                .setDescription('🎪 View active special events'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unlock')
                .setDescription('🔓 Unlock a new fishing location')
                .addStringOption(option =>
                    option.setName('location')
                        .setDescription('Location to unlock')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('favorites')
                .setDescription('⭐ Manage your favorite locations')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            // Get player data with fishing spots
            const player = await db.getPlayer(userId) || {
                fishingLevel: 1,
                discoveredSpots: ['village_pond'],
                currentLocation: 'village_pond',
                favoriteSpots: [],
                locationStats: {},
                coins: 100,
                energy: 100
            };

            // Initialize location stats if missing
            if (!player.locationStats) player.locationStats = {};

            switch (subcommand) {
                case 'explore':
                    await this.exploreLocations(interaction, player);
                    break;
                case 'locations':
                    await this.showLocations(interaction, player);
                    break;
                case 'travel':
                    await this.travelToLocation(interaction, player);
                    break;
                case 'weather':
                    await this.showWeather(interaction, player);
                    break;
                case 'events':
                    await this.showEvents(interaction, player);
                    break;
                case 'unlock':
                    await this.unlockLocation(interaction, player);
                    break;
                case 'favorites':
                    await this.manageFavorites(interaction, player);
                    break;
            }

        } catch (error) {
            console.error('Error in fishing spots command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while exploring fishing spots.',
                ephemeral: true
            });
        }
    },

    async exploreLocations(interaction, player) {
        const currentLocation = fishingLocations[player.currentLocation];
        const availableToUnlock = Object.entries(fishingLocations).filter(([key, location]) => 
            !player.discoveredSpots.includes(key) && 
            player.fishingLevel >= location.level
        );

        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('🗺️ Fishing Spot Exploration')
            .setDescription('**Discover new waters and expand your fishing horizons!**')
            .addFields({
                name: '📍 **Current Location**',
                value: `${currentLocation.emoji} **${currentLocation.name}**\n*${currentLocation.description}*\n**Weather:** ${this.getCurrentWeather(player.currentLocation)}`,
                inline: false
            });

        if (availableToUnlock.length > 0) {
            const newSpots = availableToUnlock.slice(0, 3).map(([key, location]) => {
                return `${location.emoji} **${location.name}**\n*Level ${location.level} Required*\n*Unlock Cost: ${location.unlock_cost} coins*\n${location.description.slice(0, 60)}...`;
            }).join('\n\n');

            embed.addFields({
                name: '🔍 **Discoverable Locations**',
                value: newSpots,
                inline: false
            });
        } else {
            embed.addFields({
                name: '🔍 **Exploration Status**',
                value: 'No new locations available at your current level.\nKeep fishing to unlock higher level areas!',
                inline: false
            });
        }

        // Show exploration stats
        embed.addFields(
            { name: '🗺️ Discovered', value: `${player.discoveredSpots.length}/${Object.keys(fishingLocations).length}`, inline: true },
            { name: '⭐ Favorites', value: `${player.favoriteSpots.length}`, inline: true },
            { name: '🎣 Fishing Level', value: `${player.fishingLevel}`, inline: true }
        );

        // Random exploration event
        const explorationChance = Math.random();
        if (explorationChance < 0.15) {
            const events = [
                '🦅 You spot an eagle diving for fish - this might be a good spot!',
                '🌊 You notice unusual water patterns suggesting hidden depths.',
                '🐟 Local fishermen whisper about a secret location nearby.',
                '⭐ Ancient maps in the tavern mention mystical fishing grounds.',
                '🏔️ Mountain streams seem to converge into an unexplored lake.'
            ];
            
            embed.addFields({
                name: '🎭 **Exploration Event**',
                value: events[Math.floor(Math.random() * events.length)],
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('spots_discover_new')
                    .setLabel('Search for New Spots')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('spots_view_all')
                    .setLabel('View All Locations')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📍'),
                new ButtonBuilder()
                    .setCustomId('spots_quick_travel')
                    .setLabel('Quick Travel')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🚀'),
                new ButtonBuilder()
                    .setCustomId('spots_weather_check')
                    .setLabel('Weather Report')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🌤️')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    async showLocations(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#2196F3')
            .setTitle('📍 Your Fishing Locations')
            .setDescription(`**${player.discoveredSpots.length}** locations discovered across the realm`)
            .addFields({
                name: '🎣 **Current Location**',
                value: `${fishingLocations[player.currentLocation].emoji} ${fishingLocations[player.currentLocation].name}`,
                inline: true
            });

        // Group locations by difficulty
        const locationsByDifficulty = {};
        player.discoveredSpots.forEach(spotKey => {
            const location = fishingLocations[spotKey];
            if (!locationsByDifficulty[location.difficulty]) {
                locationsByDifficulty[location.difficulty] = [];
            }
            locationsByDifficulty[location.difficulty].push({ key: spotKey, ...location });
        });

        Object.entries(locationsByDifficulty).forEach(([difficulty, locations]) => {
            const locationList = locations.map(location => {
                const isCurrent = player.currentLocation === location.key;
                const isFavorite = player.favoriteSpots.includes(location.key);
                const stats = player.locationStats[location.key] || { visits: 0, catches: 0 };
                
                let status = '';
                if (isCurrent) status += '📍 ';
                if (isFavorite) status += '⭐ ';
                
                return `${status}${location.emoji} **${location.name}**\n` +
                       `   *Level ${location.level} • ${location.climate} Climate*\n` +
                       `   *Visits: ${stats.visits} • Catches: ${stats.catches}*`;
            }).join('\n\n');

            embed.addFields({
                name: `🎯 **${difficulty} Locations**`,
                value: locationList,
                inline: false
            });
        });

        // Location selection menu
        const locationSelect = new StringSelectMenuBuilder()
            .setCustomId('spots_travel_select')
            .setPlaceholder('🚶 Select a location to travel to...')
            .addOptions(
                player.discoveredSpots.map(spotKey => {
                    const location = fishingLocations[spotKey];
                    const weather = this.getCurrentWeather(spotKey);
                    return {
                        label: location.name,
                        value: spotKey,
                        description: `${location.difficulty} • ${weather} • Energy: ${location.energy_cost}`,
                        emoji: location.emoji
                    };
                })
            );

        const actionRow1 = new ActionRowBuilder().addComponents(locationSelect);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('spots_location_details')
                    .setLabel('Location Details')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('spots_manage_favorites')
                    .setLabel('Manage Favorites')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⭐'),
                new ButtonBuilder()
                    .setCustomId('spots_weather_all')
                    .setLabel('Weather Report')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🌤️'),
                new ButtonBuilder()
                    .setCustomId('spots_statistics')
                    .setLabel('Statistics')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📈')
            );

        await interaction.editReply({ 
            embeds: [embed], 
            components: [actionRow1, buttons] 
        });
    },

    async showWeather(interaction, player) {
        const embed = new EmbedBuilder()
            .setColor('#87CEEB')
            .setTitle('🌤️ Fishing Weather Report')
            .setDescription('**Current weather conditions across all fishing locations**')
            .addFields({
                name: '📊 **Weather Summary**',
                value: `**Favorable Conditions:** ${this.countFavorableWeather()}\n**Storm Warnings:** ${this.countStormWarnings()}\n**Best Fishing:** ${this.getBestWeatherLocation()}`,
                inline: false
            });

        // Group locations by weather
        const weatherGroups = {};
        player.discoveredSpots.forEach(spotKey => {
            const location = fishingLocations[spotKey];
            const weather = this.getCurrentWeather(spotKey);
            const effect = this.getWeatherEffect(spotKey, weather);
            
            if (!weatherGroups[weather]) weatherGroups[weather] = [];
            weatherGroups[weather].push({
                name: location.name,
                emoji: location.emoji,
                effect: effect,
                multiplier: location.weather_effects[weather]?.catch_rate || 1.0
            });
        });

        Object.entries(weatherGroups).forEach(([weather, locations]) => {
            const weatherEmoji = this.getWeatherEmoji(weather);
            const locationList = locations.map(loc => 
                `${loc.emoji} **${loc.name}** (${Math.round(loc.multiplier * 100)}% catch rate)\n   *${loc.effect}*`
            ).join('\n\n');

            embed.addFields({
                name: `${weatherEmoji} **${weather.charAt(0).toUpperCase() + weather.slice(1)} Conditions**`,
                value: locationList,
                inline: false
            });
        });

        // Weather forecast
        embed.addFields({
            name: '🔮 **24-Hour Forecast**',
            value: this.generateWeatherForecast(),
            inline: false
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('weather_alerts')
                    .setLabel('Set Weather Alerts')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔔'),
                new ButtonBuilder()
                    .setCustomId('weather_optimal')
                    .setLabel('Find Optimal Conditions')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎯'),
                new ButtonBuilder()
                    .setCustomId('spots_locations')
                    .setLabel('Back to Locations')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📍')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    async showEvents(interaction, player) {
        const activeEvents = this.generateActiveEvents();
        
        const embed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('🎪 Special Fishing Events')
            .setDescription('**Limited-time events with bonus rewards and unique opportunities!**');

        if (activeEvents.length === 0) {
            embed.addFields({
                name: '😴 **No Active Events**',
                value: 'No special events are currently active.\nCheck back later for new opportunities!',
                inline: false
            });
        } else {
            activeEvents.forEach(event => {
                const timeLeft = this.getEventTimeRemaining(event.endTime);
                const location = fishingLocations[event.location];
                
                embed.addFields({
                    name: `${event.emoji} **${event.name}**`,
                    value: `**Location:** ${location.emoji} ${location.name}\n**Duration:** ${timeLeft}\n**Bonus:** ${event.description}\n**Rewards:** ${event.rewards.join(', ')}`,
                    inline: true
                });
            });
        }

        // Global events section
        embed.addFields({
            name: '🌍 **Global Events**',
            value: '🌕 **Full Moon Fishing** - All legendary fish spawn rates increased by 200%\n⛈️ **Storm Season** - Storm weather provides massive bonuses\n🎣 **Fishing Festival** - Double XP and coin rewards for all catches',
            inline: false
        });

        // Event calendar
        embed.addFields({
            name: '📅 **Upcoming Events**',
            value: '• **Monday:** Rare Fish Monday (+50% rare spawns)\n• **Wednesday:** Deep Sea Wednesday (Deep ocean bonuses)\n• **Friday:** Legendary Friday (Legendary fish guaranteed)\n• **Weekend:** Community Fishing Tournament',
            inline: false
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('events_participate')
                    .setLabel('Join Event')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎪')
                    .setDisabled(activeEvents.length === 0),
                new ButtonBuilder()
                    .setCustomId('events_calendar')
                    .setLabel('Event Calendar')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📅'),
                new ButtonBuilder()
                    .setCustomId('events_rewards')
                    .setLabel('Event Rewards')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('events_history')
                    .setLabel('Event History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📜')
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },

    // Utility functions
    getCurrentWeather(locationKey) {
        const weathers = ['sunny', 'cloudy', 'rainy', 'stormy', 'foggy', 'snowy', 'windy'];
        const location = fishingLocations[locationKey];
        const availableWeathers = Object.keys(location.weather_effects);
        
        // Use location-specific weather or fallback to general weather
        const validWeathers = weathers.filter(w => availableWeathers.includes(w));
        return validWeathers[Math.floor(Math.random() * validWeathers.length)] || 'normal';
    },

    getWeatherEffect(locationKey, weather) {
        const location = fishingLocations[locationKey];
        return location.weather_effects[weather]?.description || 'Normal fishing conditions';
    },

    getWeatherEmoji(weather) {
        const emojis = {
            sunny: '☀️',
            cloudy: '☁️',
            rainy: '🌧️',
            stormy: '⛈️',
            foggy: '🌫️',
            snowy: '❄️',
            windy: '💨',
            normal: '🌤️'
        };
        return emojis[weather] || '🌤️';
    },

    countFavorableWeather() {
        return Math.floor(Math.random() * 8) + 3; // Simulated count
    },

    countStormWarnings() {
        return Math.floor(Math.random() * 3); // Simulated count
    },

    getBestWeatherLocation() {
        const locations = ['Crystal Mountain Lake', 'Mystic Lagoon', 'Deep Ocean'];
        return locations[Math.floor(Math.random() * locations.length)];
    },

    generateWeatherForecast() {
        const forecast = [
            '🌅 **Dawn:** Clear skies, perfect for early fishing',
            '🌞 **Morning:** Sunny with light breeze, excellent conditions',
            '☁️ **Afternoon:** Partly cloudy, stable fishing weather',
            '🌧️ **Evening:** Light rain expected, good for river fishing',
            '🌙 **Night:** Clear moonlit sky, ideal for night fishing'
        ];
        return forecast.join('\n');
    },

    generateActiveEvents() {
        // Simulate active events
        const events = [
            {
                name: 'Mystic Lagoon Blessing',
                emoji: '✨',
                location: 'mystic_lagoon',
                description: 'Ancient spirits bless the waters with magical energy',
                rewards: ['Blessed Rod', 'Spirit Essence', 'Mystic XP Boost'],
                endTime: Date.now() + 3600000 // 1 hour
            }
        ];
        return events.slice(0, Math.random() > 0.5 ? 1 : 0); // Sometimes no events
    },

    getEventTimeRemaining(endTime) {
        const remaining = endTime - Date.now();
        if (remaining <= 0) return 'Expired';
        
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }
};
