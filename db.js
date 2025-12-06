// db.js - Using sql.js (Pure JS/WASM) for reliable SQLite access in Termux

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const file_path = path.join(__dirname, 'contestrank.db');

let db = null;

async function initializeDatabase() {
    console.log('Initializing SQLite (sql.js) engine...');
    
    const SQL = await initSqlJs();
    
    // Check if the database file exists and load it
    if (fs.existsSync(file_path)) {
        try {
            const fileBuffer = fs.readFileSync(file_path);
            db = new SQL.Database(fileBuffer);
            console.log('Loaded database from file: contestrank.db');
        } catch (e) {
            console.error('Error loading database file. Creating new database.', e.message);
            db = new SQL.Database();
        }
    } else {
        db = new SQL.Database();
        console.log('Created new in-memory database.');
    }

    // Run table creation commands
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS contests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                ranking_rule TEXT,
                total_max_score INTEGER,
                submission_code TEXT UNIQUE NOT NULL
            );

            CREATE TABLE IF NOT EXISTS results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contest_id INTEGER,
                school_name TEXT,
                total_score INTEGER,
                submission_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(contest_id) REFERENCES contests(id)
            );
        `);
        console.log('Database tables initialized.');
        
        saveDatabase();

    } catch (error) {
        console.error("Error initializing tables:", error.message);
    }
}

function saveDatabase() {
    if (db) {
        try {
            const data = db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(file_path, buffer);
        } catch (error) {
            console.error('Error saving database to disk:', error.message);
        }
    }
}

module.exports = {
    initializeDatabase,
    getDb: () => db,
    saveDatabase
};

