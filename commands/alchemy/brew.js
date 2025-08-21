
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const db = require('../../database.js');

// Enhanced brewing recipes with detailed information
const brewingCategories = {
    beverages: {
        name: '🍺 Magical Beverages',
        emoji: '🍺',
        description: 'Craft refreshing magical drinks',
        recipes: {
            ale: { 
                name: 'Enchanted Ale', 
                ingredients: { wheat: 3, hops: 2, water: 1 }, 
                effect: 'Charisma +10%', 
                duration: 1800, 
                cost: 100,
                level: 1,
                exp: 15,
                description: 'A magical brew that enhances social abilities',
                rarity: 'Common',
                alcohol: 5
            },
            wine: { 
                name: 'Elven Wine', 
                ingredients: { grape: 5, moonwater: 2, essence: 1 }, 
                effect: 'Wisdom +15%', 
                duration: 2400, 
                cost: 250,
                level: 5,
                exp: 30,
                description: 'A sophisticated wine favored by elves',
                rarity: 'Uncommon',
                alcohol: 12
            },
            mead: { 
                name: 'Dragon Mead', 
                ingredients: { honey: 4, dragon_essence: 1, fire_flower: 2 }, 
                effect: 'Strength +20%', 
                duration: 3600, 
                cost: 500,
                level: 10,
                exp: 60,
                description: 'A potent mead infused with dragon magic',
                rarity: 'Rare',
                alcohol: 18
            }
        }
    },
    elixirs: {
        name: '⚗️ Magical Elixirs',
        emoji: '⚗️',
        description: 'Brew powerful magical elixirs',
        recipes: {
            clarity: { 
                name: 'Elixir of Clarity', 
                ingredients: { crystal: 2, sage: 3, pure_water: 1 }, 
                effect: 'Mental clarity boost', 
                duration: 7200, 
                cost: 300,
                level: 6,
                exp: 40,
                description: 'Clears the mind and enhances focus',
                rarity: 'Uncommon',
                alcohol: 0
            },
            courage: { 
                name: 'Elixir of Courage', 
                ingredients: { lion_heart: 1, bravery_herb: 3, golden_water: 2 }, 
                effect: 'Fear immunity', 
                duration: 1800, 
                cost: 400,
                level: 8,
                exp: 50,
                description: 'Grants immunity to fear effects',
                rarity: 'Rare',
                alcohol: 0
            },
            vitality: { 
                name: 'Elixir of Vitality', 
                ingredients: { life_essence: 2, healing_herb: 4, spring_water: 3 }, 
                effect: 'Health regeneration', 
                duration: 3600, 
                cost: 600,
                level: 12,
                exp: 75,
                description: 'Continuously regenerates health over time',
                rarity: 'Epic',
                alcohol: 0
            }
        }
    },
    tonics: {
        name: '🧪 Restorative Tonics',
        emoji: '🧪',
        description: 'Create healing and restorative tonics',
        recipes: {
            energy: { 
                name: 'Energy Tonic', 
                ingredients: { ginseng: 2, honey: 1, sparkling_water: 2 }, 
                effect: 'Energy +50%', 
                duration: 1200, 
                cost: 150,
                level: 3,
                exp: 20,
                description: 'Restores energy and reduces fatigue',
                rarity: 'Common',
                alcohol: 0
            },
            rejuvenation: { 
                name: 'Rejuvenation Tonic', 
                ingredients: { phoenix_feather: 1, youth_berry: 3, eternal_spring: 1 }, 
                effect: 'Age reversal', 
                duration: 86400, 
                cost: 800,
                level: 15,
                exp: 100,
                description: 'Temporarily reverses aging effects',
                rarity: 'Legendary',
                alcohol: 0
            },
            purification: { 
                name: 'Purification Tonic', 
                ingredients: { holy_water: 2, cleansing_salt: 1, white_sage: 3 }, 
                effect: 'Removes all debuffs', 
                duration: 0, 
                cost: 350,
                level: 7,
                exp: 45,
                description: 'Cleanses all negative effects instantly',
                rarity: 'Rare',
                alcohol: 0
            }
        }
    },
    experimental: {
        name: '🌟 Experimental Brews',
        emoji: '🌟',
        description: 'Dangerous and powerful experimental concoctions',
        recipes: {
            mutation: {
                name: 'Mutation Serum',
                ingredients: { chaos_essence: 1, unstable_compound: 2, void_water: 1 },
                effect: 'Random stat changes',
                duration: 3600,
                cost: 1000,
                level: 20,
                exp: 150,
                description: 'Unpredictable effects on the drinker',
                rarity: 'Legendary',
                alcohol: 0
            },
            timeshift: {
                name: 'Timeshift Brew',
                ingredients: { temporal_crystal: 1, time_flower: 3, chronos_water: 2 },
                effect: 'Time manipulation',
                duration: 600,
                cost: 1500,
                level: 25,
                exp: 200,
                description: 'Briefly manipulates the flow of time',
                rarity: 'Mythic',
                alcohol: 0
            }
        }
    }
};

// Rarity colors for embeds
const rarityColors = {
    'Common': '#808080',
    'Uncommon': '#00FF00',
    'Rare': '#0080FF',
    'Epic': '#8000FF',
    'Legendary': '#FFD700',
    'Mythic': '#FF1493'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('brew')
        .setDescription('🍺 Create magical beverages, elixirs, and experimental brews'),

    async execute(interaction) {
        const userId = interaction.user.id;

        try {
            // Get user profile
            let player = await db.getPlayer(userId);
            if (!player) {
                await interaction.reply({
                    content: '❌ You need to create a profile first! Use `/profile` to get started.',
                    ephemeral: true
                });
                return;
            }

            // Helper functions
            const getPlayerBrewingLevel = () => {
                return player.skills?.brewing?.level || player.skills?.brewing || 1;
            };

            const getPlayerBrewingExp = () => {
                return player.skills?.brewing?.exp || player.skillExperience?.brewing || 0;
            };

            const hasRequiredMaterials = (recipe, amount = 1) => {
                for (const [material, required] of Object.entries(recipe.ingredients)) {
                    const playerAmount = player.inventory?.materials?.[material] || player.items?.[material] || 0;
                    if (playerAmount < required * amount) {
                        return false;
                    }
                }
                return true;
            };

            const getMissingMaterials = (recipe, amount = 1) => {
                const missing = [];
                for (const [material, required] of Object.entries(recipe.ingredients)) {
                    const playerAmount = player.inventory?.materials?.[material] || player.items?.[material] || 0;
                    const totalRequired = required * amount;
                    if (playerAmount < totalRequired) {
                        missing.push({
                            name: material,
                            have: playerAmount,
                            need: totalRequired,
                            missing: totalRequired - playerAmount
                        });
                    }
                }
                return missing;
            };

            const canBrewDrink = (recipe, amount = 1) => {
                const brewingLevel = getPlayerBrewingLevel();
                const hasLevel = brewingLevel >= recipe.level;
                const hasMaterials = hasRequiredMaterials(recipe, amount);
                const hasCoins = (player.coins || 0) >= (recipe.cost * amount);
                return hasLevel && hasMaterials && hasCoins;
            };

            // Create main menu embed
            const createMainMenuEmbed = () => {
                const embed = new EmbedBuilder()
                    .setColor('#8B4513')
                    .setTitle('🍺 Master Brewer\'s Workshop')
                    .setDescription('*Welcome to the finest brewing establishment in the realm!*\n\nSelect a category to explore available brewing recipes.')
                    .addFields(
                        {
                            name: '👤 Your Brewing Stats',
                            value: `**Level:** ${getPlayerBrewingLevel()}\n**Experience:** ${getPlayerBrewingExp()} XP\n**Next Level:** ${(getPlayerBrewingLevel() * 100) - getPlayerBrewingExp()} XP`,
                            inline: true
                        },
                        {
                            name: '💰 Resources',
                            value: `**Coins:** ${player.coins || 0}\n**Drinks Brewed:** ${player.drinksBrewed || 0}`,
                            inline: true
                        },
                        {
                            name: '🎯 Categories Available',
                            value: Object.keys(brewingCategories).length.toString(),
                            inline: true
                        }
                    )
                    .setFooter({ text: 'Choose a category to see available recipes' })
                    .setTimestamp();

                return embed;
            };

            // Create category selection menu
            const createCategoryMenu = () => {
                const options = Object.entries(brewingCategories).map(([key, category]) => ({
                    label: category.name,
                    description: category.description,
                    value: key,
                    emoji: category.emoji
                }));

                return new StringSelectMenuBuilder()
                    .setCustomId('select_brew_category')
                    .setPlaceholder('Choose a brewing category...')
                    .addOptions(options);
            };

            // Create category embed
            const createCategoryEmbed = (categoryKey) => {
                const category = brewingCategories[categoryKey];
                const brewingLevel = getPlayerBrewingLevel();

                const embed = new EmbedBuilder()
                    .setColor('#8B4513')
                    .setTitle(`${category.emoji} ${category.name}`)
                    .setDescription(`*${category.description}*\n\nSelect a drink to brew or view details.`)
                    .setFooter({ text: `Your Brewing Level: ${brewingLevel} | Available recipes: ${Object.keys(category.recipes).length}` });

                // Add recipe overview
                const recipeList = Object.entries(category.recipes).map(([key, recipe]) => {
                    const canBrew = canBrewDrink(recipe, 1);
                    const levelReq = recipe.level <= brewingLevel ? '✅' : '❌';
                    const status = canBrew ? '🟢 Ready' : '🔴 Missing requirements';
                    const alcoholLevel = recipe.alcohol > 0 ? ` • ${recipe.alcohol}% ABV` : ' • Non-alcoholic';
                    
                    return `${levelReq} **${recipe.name}** (Lv.${recipe.level})\n└ ${status} • ${recipe.rarity}${alcoholLevel}`;
                }).join('\n\n');

                embed.addFields({
                    name: '📜 Available Recipes',
                    value: recipeList || 'No recipes available',
                    inline: false
                });

                return embed;
            };

            // Create drink detail embed
            const createDrinkDetailEmbed = (categoryKey, drinkKey, amount = 1) => {
                const category = brewingCategories[categoryKey];
                const recipe = category.recipes[drinkKey];
                const canBrew = canBrewDrink(recipe, amount);
                const missingMaterials = getMissingMaterials(recipe, amount);
                const brewingLevel = getPlayerBrewingLevel();

                const embed = new EmbedBuilder()
                    .setColor(rarityColors[recipe.rarity] || '#8B4513')
                    .setTitle(`${category.emoji} ${recipe.name}`)
                    .setDescription(`*${recipe.description}*`)
                    .addFields(
                        {
                            name: '🏷️ Recipe Information',
                            value: `**Rarity:** ${recipe.rarity}\n**Required Level:** ${recipe.level}\n**Your Level:** ${brewingLevel}`,
                            inline: true
                        },
                        {
                            name: '💰 Costs',
                            value: `**Per Drink:** ${recipe.cost} coins\n**Total Cost:** ${recipe.cost * amount} coins`,
                            inline: true
                        }
                    );

                // Add alcohol content if applicable
                if (recipe.alcohol > 0) {
                    embed.addFields({
                        name: '🍺 Alcohol Content',
                        value: `**ABV:** ${recipe.alcohol}%\n**Type:** Alcoholic Beverage`,
                        inline: true
                    });
                }

                // Add effect information
                embed.addFields({
                    name: '⚡ Effect',
                    value: `**Effect:** ${recipe.effect}\n**Duration:** ${recipe.duration > 0 ? Math.floor(recipe.duration / 60) + ' minutes' : 'Instant'}`,
                    inline: true
                });

                // Add ingredients list
                const ingredientsList = Object.entries(recipe.ingredients).map(([material, required]) => {
                    const playerAmount = player.inventory?.materials?.[material] || player.items?.[material] || 0;
                    const totalRequired = required * amount;
                    const hasEnough = playerAmount >= totalRequired;
                    const status = hasEnough ? '✅' : '❌';
                    return `${status} **${material}**: ${playerAmount}/${totalRequired}`;
                }).join('\n');

                embed.addFields({
                    name: '🧪 Required Ingredients',
                    value: ingredientsList,
                    inline: false
                });

                // Add experience reward
                embed.addFields({
                    name: '📈 Rewards',
                    value: `**Experience:** ${recipe.exp * amount} XP\n**Brewing Level:** ${recipe.level} required`,
                    inline: true
                });

                // Add missing requirements if any
                if (!canBrew) {
                    let missingText = '';
                    
                    if (brewingLevel < recipe.level) {
                        missingText += `❌ **Level Requirement:** Need level ${recipe.level} (currently ${brewingLevel})\n`;
                    }
                    
                    if (missingMaterials.length > 0) {
                        missingText += `❌ **Missing Materials:**\n${missingMaterials.map(m => 
                            `• ${m.name}: need ${m.missing} more`
                        ).join('\n')}\n`;
                    }
                    
                    const totalCost = recipe.cost * amount;
                    if ((player.coins || 0) < totalCost) {
                        missingText += `❌ **Insufficient Funds:** Need ${totalCost - (player.coins || 0)} more coins`;
                    }

                    if (missingText) {
                        embed.addFields({
                            name: '⚠️ Requirements Not Met',
                            value: missingText,
                            inline: false
                        });
                    }
                }

                return embed;
            };

            // Create brewing buttons
            const createBrewingButtons = (categoryKey, drinkKey, amount = 1) => {
                const recipe = brewingCategories[categoryKey].recipes[drinkKey];
                const canBrew = canBrewDrink(recipe, amount);

                const buttons = [];
                
                // Amount adjustment buttons
                if (amount > 1) {
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId(`brew_amount_decrease_${categoryKey}_${drinkKey}_${amount}`)
                            .setLabel('-1')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('➖')
                    );
                }

                // Current amount display button (disabled)
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('brew_amount_display')
                        .setLabel(`Amount: ${amount}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );

                if (amount < 10) {
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId(`brew_amount_increase_${categoryKey}_${drinkKey}_${amount}`)
                            .setLabel('+1')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('➕')
                    );
                }

                const row1 = new ActionRowBuilder().addComponents(buttons);

                // Action buttons
                const brewButton = new ButtonBuilder()
                    .setCustomId(`brew_drink_${categoryKey}_${drinkKey}_${amount}`)
                    .setLabel(`Brew ${amount}x ${recipe.name}`)
                    .setStyle(canBrew ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji('🍺')
                    .setDisabled(!canBrew);

                const backButton = new ButtonBuilder()
                    .setCustomId(`brew_back_to_category_${categoryKey}`)
                    .setLabel('Back to Category')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const mainMenuButton = new ButtonBuilder()
                    .setCustomId('brew_back_to_main')
                    .setLabel('Main Menu')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏠');

                const row2 = new ActionRowBuilder().addComponents(brewButton, backButton, mainMenuButton);

                return [row1, row2];
            };

            // Send initial response
            const mainEmbed = createMainMenuEmbed();
            const categoryMenu = createCategoryMenu();
            const menuRow = new ActionRowBuilder().addComponents(categoryMenu);

            const response = await interaction.reply({
                embeds: [mainEmbed],
                components: [menuRow]
            });

            // Create collector for interactions
            const collector = response.createMessageComponentCollector({
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (componentInteraction) => {
                // Check if the user is the same as the command user
                if (componentInteraction.user.id !== userId) {
                    return componentInteraction.reply({
                        content: '❌ You cannot interact with someone else\'s brewing session!',
                        ephemeral: true
                    });
                }

                try {
                    await componentInteraction.deferUpdate();
                    
                    // Refresh player data
                    player = await db.getPlayer(userId) || player;

                    if (componentInteraction.customId === 'brew_back_to_main') {
                        // Return to main menu
                        const embed = createMainMenuEmbed();
                        const menu = createCategoryMenu();
                        const row = new ActionRowBuilder().addComponents(menu);
                        
                        await componentInteraction.editReply({
                            embeds: [embed],
                            components: [row]
                        });

                    } else if (componentInteraction.customId === 'select_brew_category') {
                        // Show category recipes
                        const categoryKey = componentInteraction.values[0];
                        const embed = createCategoryEmbed(categoryKey);
                        
                        // Create recipe selection menu
                        const recipes = brewingCategories[categoryKey].recipes;
                        const recipeOptions = Object.entries(recipes).map(([key, recipe]) => {
                            const canBrew = canBrewDrink(recipe, 1);
                            const brewingLevel = getPlayerBrewingLevel();
                            
                            return {
                                label: recipe.name,
                                description: `${recipe.rarity} • Lv.${recipe.level} • ${recipe.cost} coins`,
                                value: `${categoryKey}_${key}`,
                                emoji: canBrew ? '✅' : (brewingLevel < recipe.level ? '🔒' : '❌')
                            };
                        });

                        const recipeMenu = new StringSelectMenuBuilder()
                            .setCustomId('select_brew_recipe')
                            .setPlaceholder('Choose a recipe to brew...')
                            .addOptions(recipeOptions);

                        const backButton = new ButtonBuilder()
                            .setCustomId('brew_back_to_main')
                            .setLabel('Back to Main Menu')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('↩️');

                        await componentInteraction.editReply({
                            embeds: [embed],
                            components: [
                                new ActionRowBuilder().addComponents(recipeMenu),
                                new ActionRowBuilder().addComponents(backButton)
                            ]
                        });

                    } else if (componentInteraction.customId === 'select_brew_recipe') {
                        // Show recipe details
                        const [categoryKey, drinkKey] = componentInteraction.values[0].split('_');
                        const embed = createDrinkDetailEmbed(categoryKey, drinkKey, 1);
                        const buttons = createBrewingButtons(categoryKey, drinkKey, 1);
                        
                        await componentInteraction.editReply({
                            embeds: [embed],
                            components: buttons
                        });

                    } else if (componentInteraction.customId.startsWith('brew_amount_')) {
                        // Handle amount changes
                        const parts = componentInteraction.customId.split('_');
                        const action = parts[2]; // increase or decrease
                        const categoryKey = parts[3];
                        const drinkKey = parts[4];
                        let amount = parseInt(parts[5]);

                        if (action === 'increase' && amount < 10) {
                            amount++;
                        } else if (action === 'decrease' && amount > 1) {
                            amount--;
                        }

                        const embed = createDrinkDetailEmbed(categoryKey, drinkKey, amount);
                        const buttons = createBrewingButtons(categoryKey, drinkKey, amount);
                        
                        await componentInteraction.editReply({
                            embeds: [embed],
                            components: buttons
                        });

                    } else if (componentInteraction.customId.startsWith('brew_drink_')) {
                        // Handle brewing
                        const parts = componentInteraction.customId.split('_');
                        const categoryKey = parts[2];
                        const drinkKey = parts[3];
                        const amount = parseInt(parts[4]);
                        
                        const recipe = brewingCategories[categoryKey].recipes[drinkKey];
                        
                        if (!canBrewDrink(recipe, amount)) {
                            const errorEmbed = new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Brewing Failed')
                                .setDescription('You don\'t meet the requirements for this recipe!')
                                .setFooter({ text: 'Check the recipe requirements and try again.' });

                            const backButton = new ButtonBuilder()
                                .setCustomId(`brew_back_to_category_${categoryKey}`)
                                .setLabel('Back')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('↩️');

                            await componentInteraction.editReply({
                                embeds: [errorEmbed],
                                components: [new ActionRowBuilder().addComponents(backButton)]
                            });
                            return;
                        }

                        // Process brewing
                        const totalCost = recipe.cost * amount;
                        const expGained = recipe.exp * amount;

                        // Update materials
                        if (!player.inventory) player.inventory = {};
                        if (!player.inventory.materials) player.inventory.materials = {};
                        if (!player.items) player.items = {};

                        // Remove materials
                        for (const [material, required] of Object.entries(recipe.ingredients)) {
                            if (player.inventory.materials[material]) {
                                player.inventory.materials[material] -= required * amount;
                            } else if (player.items[material]) {
                                player.items[material] -= required * amount;
                            }
                        }

                        // Remove coins
                        player.coins = (player.coins || 0) - totalCost;

                        // Add drinks to inventory
                        if (!player.inventory.drinks) player.inventory.drinks = {};
                        const drinkKey_full = `${categoryKey}_${drinkKey}`;
                        player.inventory.drinks[drinkKey_full] = (player.inventory.drinks[drinkKey_full] || 0) + amount;

                        // Update brewing skill
                        if (!player.skills) player.skills = {};
                        if (!player.skillExperience) player.skillExperience = {};
                        
                        const currentExp = player.skillExperience.brewing || 0;
                        const newExp = currentExp + expGained;
                        const currentLevel = player.skills.brewing || 1;
                        const newLevel = Math.floor(newExp / 100) + 1;

                        player.skillExperience.brewing = newExp;
                        player.skills.brewing = Math.max(newLevel, currentLevel);
                        player.drinksBrewed = (player.drinksBrewed || 0) + amount;

                        // Save to database
                        await db.updatePlayer(userId, player);

                        // Create success embed
                        const successEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✨ Brewing Successful!')
                            .setDescription(`You successfully brewed ${amount}x **${recipe.name}**!`)
                            .addFields(
                                {
                                    name: '🎁 Rewards',
                                    value: `**Drinks Added:** ${amount}x ${recipe.name}\n**Experience Gained:** +${expGained} XP${newLevel > currentLevel ? `\n🎊 **Level Up!** Brewing level is now ${newLevel}` : ''}`,
                                    inline: false
                                },
                                {
                                    name: '📊 Updated Stats',
                                    value: `**Remaining Coins:** ${player.coins}\n**Brewing Level:** ${player.skills.brewing}\n**Total Drinks Brewed:** ${player.drinksBrewed}`,
                                    inline: false
                                }
                            )
                            .setFooter({ text: 'Your drinks have been added to your inventory!' })
                            .setTimestamp();

                        const continueButton = new ButtonBuilder()
                            .setCustomId('brew_back_to_main')
                            .setLabel('Continue Brewing')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🍺');

                        await componentInteraction.editReply({
                            embeds: [successEmbed],
                            components: [new ActionRowBuilder().addComponents(continueButton)]
                        });

                    } else if (componentInteraction.customId.startsWith('brew_back_to_category_')) {
                        // Return to category view
                        const categoryKey = componentInteraction.customId.replace('brew_back_to_category_', '');
                        const embed = createCategoryEmbed(categoryKey);
                        
                        // Recreate recipe selection menu
                        const recipes = brewingCategories[categoryKey].recipes;
                        const recipeOptions = Object.entries(recipes).map(([key, recipe]) => {
                            const canBrew = canBrewDrink(recipe, 1);
                            const brewingLevel = getPlayerBrewingLevel();
                            
                            return {
                                label: recipe.name,
                                description: `${recipe.rarity} • Lv.${recipe.level} • ${recipe.cost} coins`,
                                value: `${categoryKey}_${key}`,
                                emoji: canBrew ? '✅' : (brewingLevel < recipe.level ? '🔒' : '❌')
                            };
                        });

                        const recipeMenu = new StringSelectMenuBuilder()
                            .setCustomId('select_brew_recipe')
                            .setPlaceholder('Choose a recipe to brew...')
                            .addOptions(recipeOptions);

                        const backButton = new ButtonBuilder()
                            .setCustomId('brew_back_to_main')
                            .setLabel('Back to Main Menu')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('↩️');

                        await componentInteraction.editReply({
                            embeds: [embed],
                            components: [
                                new ActionRowBuilder().addComponents(recipeMenu),
                                new ActionRowBuilder().addComponents(backButton)
                            ]
                        });
                    }

                } catch (error) {
                    console.error('Brew interaction error:', error);
                    
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⚠️ An Error Occurred')
                        .setDescription('Something went wrong while processing your request. Please try again.');

                    const backButton = new ButtonBuilder()
                        .setCustomId('brew_back_to_main')
                        .setLabel('Back to Main Menu')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('↩️');

                    await componentInteraction.editReply({
                        embeds: [errorEmbed],
                        components: [new ActionRowBuilder().addComponents(backButton)]
                    }).catch(() => {});
                }
            });

            collector.on('end', async () => {
                try {
                    const expiredEmbed = new EmbedBuilder()
                        .setColor('#808080')
                        .setTitle('🍺 Brewing Session Expired')
                        .setDescription('This brewing session has timed out. Use `/brew` again to start a new session.')
                        .setFooter({ text: 'Session lasted 5 minutes' });

                    await response.edit({
                        embeds: [expiredEmbed],
                        components: []
                    }).catch(() => {}); // Ignore errors if message was deleted
                } catch (error) {
                    // Silently handle cleanup errors
                }
            });

        } catch (error) {
            console.error('Brew command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⚠️ Brewing Error')
                .setDescription('Something went wrong while setting up the brewing system. Please try again later.')
                .addFields({
                    name: 'Error Details',
                    value: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
                    inline: false
                })
                .setFooter({ text: 'If this persists, contact support' });

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => {});
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
            }
        }
    }
};
