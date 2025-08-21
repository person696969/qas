
const Database = require('better-sqlite3');
const path = require('path');

function initializeDatabase() {
    const dbPath = path.join(__dirname, '..', 'json.sqlite');
    const db = new Database(dbPath);
    
    try {
        // Players table with enhanced RPG features
        db.exec(`
            CREATE TABLE IF NOT EXISTS players (
                userId TEXT PRIMARY KEY,
                username TEXT,
                coins INTEGER DEFAULT 500,
                level INTEGER DEFAULT 1,
                exp INTEGER DEFAULT 0,
                health INTEGER DEFAULT 100,
                max_health INTEGER DEFAULT 100,
                energy INTEGER DEFAULT 100,
                max_energy INTEGER DEFAULT 100,
                hunts_completed INTEGER DEFAULT 0,
                treasures_found INTEGER DEFAULT 0,
                battles_won INTEGER DEFAULT 0,
                battles_lost INTEGER DEFAULT 0,
                guild_id TEXT,
                last_daily DATETIME,
                last_hunt DATETIME,
                last_battle DATETIME,
                inventory TEXT DEFAULT '{}',
                equipment TEXT DEFAULT '{}',
                achievements TEXT DEFAULT '[]',
                stats TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Active hunts table
        db.exec(`
            CREATE TABLE IF NOT EXISTS active_hunts (
                hunt_id TEXT PRIMARY KEY,
                user_id TEXT,
                difficulty TEXT,
                start_time INTEGER,
                end_time INTEGER,
                status TEXT DEFAULT 'active',
                success INTEGER DEFAULT 0,
                treasure_value INTEGER DEFAULT 0,
                clues_found INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES players (userId)
            )
        `);
        
        // Treasure hunts table
        db.exec(`
            CREATE TABLE IF NOT EXISTS treasure_hunts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                difficulty INTEGER DEFAULT 1,
                reward INTEGER DEFAULT 100,
                active INTEGER DEFAULT 1,
                clues TEXT DEFAULT '[]',
                requirements TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Events table
        db.exec(`
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                type TEXT DEFAULT 'treasure_hunt',
                start_time INTEGER,
                end_time INTEGER,
                active INTEGER DEFAULT 0,
                multipliers TEXT DEFAULT '{}',
                requirements TEXT DEFAULT '{}',
                rewards TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Guilds table
        db.exec(`
            CREATE TABLE IF NOT EXISTS guilds (
                guild_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                level INTEGER DEFAULT 1,
                exp INTEGER DEFAULT 0,
                treasury INTEGER DEFAULT 0,
                member_count INTEGER DEFAULT 1,
                max_members INTEGER DEFAULT 50,
                owner_id TEXT,
                officers TEXT DEFAULT '[]',
                perks TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Items table
        db.exec(`
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                type TEXT DEFAULT 'misc',
                rarity TEXT DEFAULT 'common',
                value INTEGER DEFAULT 10,
                stats TEXT DEFAULT '{}',
                requirements TEXT DEFAULT '{}',
                craftable INTEGER DEFAULT 0,
                tradeable INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // User inventory table
        db.exec(`
            CREATE TABLE IF NOT EXISTS user_inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                item_id INTEGER,
                quantity INTEGER DEFAULT 1,
                equipped INTEGER DEFAULT 0,
                obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES players (userId),
                FOREIGN KEY (item_id) REFERENCES items (id)
            )
        `);
        
        // Battle logs table
        db.exec(`
            CREATE TABLE IF NOT EXISTS battle_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                opponent_type TEXT DEFAULT 'monster',
                opponent_name TEXT,
                result TEXT,
                damage_dealt INTEGER DEFAULT 0,
                damage_taken INTEGER DEFAULT 0,
                exp_gained INTEGER DEFAULT 0,
                coins_gained INTEGER DEFAULT 0,
                battle_time INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES players (userId)
            )
        `);
        
        // Achievements table
        db.exec(`
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                type TEXT DEFAULT 'general',
                requirement_type TEXT,
                requirement_value INTEGER,
                reward_coins INTEGER DEFAULT 0,
                reward_exp INTEGER DEFAULT 0,
                reward_items TEXT DEFAULT '[]',
                icon TEXT,
                rare INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // User achievements table
        db.exec(`
            CREATE TABLE IF NOT EXISTS user_achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                achievement_id INTEGER,
                progress INTEGER DEFAULT 0,
                completed INTEGER DEFAULT 0,
                completed_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES players (userId),
                FOREIGN KEY (achievement_id) REFERENCES achievements (id),
                UNIQUE(user_id, achievement_id)
            )
        `);
        
        // Cooldowns table
        db.exec(`
            CREATE TABLE IF NOT EXISTS cooldowns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                command TEXT,
                expires_at INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES players (userId),
                UNIQUE(user_id, command)
            )
        `);
        
        // Insert default treasure hunts if none exist
        const huntCount = db.prepare(`SELECT COUNT(*) as count FROM treasure_hunts`).get();
        if (huntCount.count === 0) {
            const defaultHunts = [
                {
                    name: "The Lost Pirate's Treasure",
                    description: "Search for the legendary treasure of Captain Blackbeard",
                    difficulty: 3,
                    reward: 300,
                    clues: JSON.stringify([
                        { text: "Where the sea meets the land, look for the old oak tree", answer: "beach" },
                        { text: "Count the steps from the lighthouse, then turn where the wind blows strongest", answer: "north" }
                    ])
                },
                {
                    name: "Dragon's Hoard Mystery",
                    description: "Uncover the ancient dragon's hidden treasure chamber",
                    difficulty: 7,
                    reward: 750,
                    clues: JSON.stringify([
                        { text: "In the mountain's heart, where fire once burned bright", answer: "volcano" },
                        { text: "The guardian's riddle: What has scales but cannot swim?", answer: "dragon" }
                    ])
                },
                {
                    name: "The Enchanted Forest Secret",
                    description: "Find the mystical treasure hidden by forest spirits",
                    difficulty: 5,
                    reward: 500,
                    clues: JSON.stringify([
                        { text: "Where moonlight dances through ancient leaves", answer: "clearing" },
                        { text: "Listen for the song that only nature knows", answer: "wind" }
                    ])
                }
            ];
            
            const insertHunt = db.prepare(`
                INSERT INTO treasure_hunts (name, description, difficulty, reward, clues)
                VALUES (?, ?, ?, ?, ?)
            `);
            
            defaultHunts.forEach(hunt => {
                insertHunt.run(hunt.name, hunt.description, hunt.difficulty, hunt.reward, hunt.clues);
            });
        }
        
        // Insert default items if none exist
        const itemCount = db.prepare(`SELECT COUNT(*) as count FROM items`).get();
        if (itemCount.count === 0) {
            const defaultItems = [
                { name: "Rusty Sword", description: "An old sword that has seen better days", type: "weapon", rarity: "common", value: 50, stats: JSON.stringify({attack: 5}) },
                { name: "Iron Shield", description: "A sturdy iron shield for protection", type: "shield", rarity: "common", value: 75, stats: JSON.stringify({defense: 8}) },
                { name: "Health Potion", description: "Restores 50 HP when consumed", type: "consumable", rarity: "common", value: 25, stats: JSON.stringify({heal: 50}) },
                { name: "Treasure Map Fragment", description: "A piece of an ancient treasure map", type: "quest", rarity: "rare", value: 200, stats: JSON.stringify({}) },
                { name: "Dragon Scale", description: "A shimmering scale from an ancient dragon", type: "material", rarity: "legendary", value: 1000, stats: JSON.stringify({}) }
            ];
            
            const insertItem = db.prepare(`
                INSERT INTO items (name, description, type, rarity, value, stats)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            defaultItems.forEach(item => {
                insertItem.run(item.name, item.description, item.type, item.rarity, item.value, item.stats);
            });
        }
        
        // Insert default achievements if none exist
        const achievementCount = db.prepare(`SELECT COUNT(*) as count FROM achievements`).get();
        if (achievementCount.count === 0) {
            const defaultAchievements = [
                { name: "First Steps", description: "Complete your first treasure hunt", type: "hunt", requirement_type: "hunts_completed", requirement_value: 1, reward_coins: 100, reward_exp: 50 },
                { name: "Treasure Hunter", description: "Complete 10 treasure hunts", type: "hunt", requirement_type: "hunts_completed", requirement_value: 10, reward_coins: 500, reward_exp: 200 },
                { name: "Wealthy Explorer", description: "Accumulate 10,000 coins", type: "economy", requirement_type: "total_coins", requirement_value: 10000, reward_coins: 1000, reward_exp: 300 },
                { name: "Battle Tested", description: "Win 25 battles", type: "combat", requirement_type: "battles_won", requirement_value: 25, reward_coins: 750, reward_exp: 400 },
                { name: "Legendary Hunter", description: "Find 100 treasures", type: "hunt", requirement_type: "treasures_found", requirement_value: 100, reward_coins: 2500, reward_exp: 1000, rare: 1 }
            ];
            
            const insertAchievement = db.prepare(`
                INSERT INTO achievements (name, description, type, requirement_type, requirement_value, reward_coins, reward_exp, rare)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            defaultAchievements.forEach(achievement => {
                insertAchievement.run(
                    achievement.name, 
                    achievement.description, 
                    achievement.type, 
                    achievement.requirement_type, 
                    achievement.requirement_value, 
                    achievement.reward_coins, 
                    achievement.reward_exp,
                    achievement.rare || 0
                );
            });
        }
        
        console.log('✅ Database initialized successfully with all RPG treasure hunting tables');
        
    } catch (error) {
        console.error('❌ Error initializing database:', error);
    } finally {
        db.close();
    }
}

module.exports = { initializeDatabase };


// Run this file directly to initialize the database
if (require.main === module) {
    const { initializeDatabase } = require('./dbInit');
    console.log('🚀 Running database initialization...');
    initializeDatabase();
    console.log('✅ Database initialization complete!');
    process.exit(0);
}
