const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
try {
    require('dotenv').config();
} catch (error) {
    console.warn('dotenv not found, skipping .env file loading');
}

// Create a collection to store commands
const commands = [];

// Function to recursively load commands from subdirectories
function loadCommands(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const filePath = path.join(dir, file.name);

        if (file.isDirectory()) {
            // If it's a directory, recurse into it
            loadCommands(filePath);
        } else if (file.name.endsWith('.js') && !file.name.endsWith('.bak') && !file.name.endsWith('.new')) {
            try {
                // Clear require cache to avoid stale modules
                delete require.cache[require.resolve(filePath)];

                // Load the command file
                const command = require(filePath);

                // Enhanced validation for command structure
                if (!command || typeof command !== 'object') {
                    console.log(`\n❌ Failed to load: ${filePath}`);
                    console.log('   Invalid command export - not an object');
                    continue;
                }

                if (!command.data || !command.execute) {
                    console.log(`\n❌ Failed to load: ${filePath}`);
                    console.log('   Missing required properties (data/execute)');
                    continue;
                }

                if (typeof command.execute !== 'function') {
                    console.log(`\n❌ Failed to load: ${filePath}`);
                    console.log('   Execute property is not a function');
                    continue;
                }

                // Check for command name and description
                let commandName = '';
                let commandDescription = '';
                let serializedData = null;

                // Try different ways to get command info
                if (command.data.name && command.data.description) {
                    commandName = command.data.name;
                    commandDescription = command.data.description;
                } else if (typeof command.data.toJSON === 'function') {
                    try {
                        serializedData = command.data.toJSON();
                        commandName = serializedData.name;
                        commandDescription = serializedData.description;
                    } catch (serializeError) {
                        console.log(`\n❌ Failed to serialize command in: ${filePath}`);
                        console.log(`   Serialization error: ${serializeError.message}`);
                        continue;
                    }
                }

                if (!commandName || !commandDescription) {
                    console.log(`\n❌ Failed to load: ${filePath}`);
                    console.log('   Command data missing name or description');
                    continue;
                }

                // Try to serialize the command data if not already done
                if (!serializedData) {
                    try {
                        serializedData = command.data.toJSON();
                    } catch (serializeError) {
                        console.log(`\n❌ Failed to serialize command in: ${filePath}`);
                        console.log(`   Serialization error: ${serializeError.message}`);
                        continue;
                    }
                }

                // Add to commands array
                commands.push(serializedData);
                console.log(`\n✅ Loaded command: ${commandName}`);
                console.log(`   📍 Path: ${filePath}`);
                console.log(`   📝 Description: ${commandDescription}`);

            } catch (error) {
                console.log(`\n❌ Failed to load: ${filePath}`);
                console.log('   Error details:');
                console.log(`   Message: ${error.message}`);

                // Provide more specific error messages
                if (error.code === 'MODULE_NOT_FOUND') {
                    console.log('   This appears to be a missing dependency error');
                    console.log('   Check that all required modules are installed');
                } else if (error.name === 'SyntaxError') {
                    console.log('   This appears to be a syntax error');
                    console.log('   Check the file for missing brackets, semicolons, etc.');
                } else if (error.message.includes('await is only valid in async functions')) {
                    console.log('   This appears to be an async/await error');
                    console.log('   Make sure await is only used inside async functions');
                }

                if (error.stack) {
                    const stackLines = error.stack.split('\n');
                    // Find the relevant line in the command file
                    const relevantLine = stackLines.find(line => line.includes(filePath));
                    if (relevantLine) {
                        const match = relevantLine.match(/:(\d+):\d+/);
                        if (match) {
                            console.log(`   Line number: ${match[1]}`);
                        }
                    }
                }
            }
        } else if (file.name.endsWith('.bak') || file.name.endsWith('.new')) {
            console.log(`\n⏭️ Skipped backup file: ${file.name}`);
        }
    }
}

// Validate environment variables
if (!process.env.DISCORD_BOT_TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN is not set in environment variables');
    process.exit(1);
}

if (!process.env.DISCORD_CLIENT_ID) {
    console.error('❌ DISCORD_CLIENT_ID is not set in environment variables');
    process.exit(1);
}

// Create REST instance
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

// Deploy commands
(async () => {
    try {
        // Load all command files
        const commandsPath = path.join(__dirname, 'commands');
        loadCommands(commandsPath);

        if (commands.length === 0) {
            console.warn('\n⚠️ No valid commands to register');
            return;
        }

        console.log('\n🔄 Started refreshing application (/) commands...');
        console.log(`📝 Preparing to register ${commands.length} commands`);

        // Register commands globally
        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands },
        );

        console.log('\n✅ Successfully registered application commands globally');
        
        // Also register for each guild for instant updates during development
        const guilds = process.env.TEST_GUILD_IDS ? process.env.TEST_GUILD_IDS.split(',') : [];
        if (guilds.length > 0) {
            for (const guildId of guilds) {
                try {
                    await rest.put(
                        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId),
                        { body: commands },
                    );
                    console.log(`✅ Updated commands for guild: ${guildId}`);
                } catch (guildError) {
                    console.error(`❌ Failed to update commands for guild ${guildId}:`, guildError.message);
                }
            }
        }
        
        console.log('\n🎉 Command registration complete!');
    } catch (error) {
        console.error('\n❌ Error deploying commands:');
        console.error('   Message:', error.message);
        if (error.stack) {
            console.error('   Stack trace:');
            error.stack.split('\n').forEach(line => console.error(`   ${line}`));
        }
    }
})();