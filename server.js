// server.js - Complete Code for ContestRank Pro (KCSE and Custom Config Ready)

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const dbManager = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });
// -----------------------------

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- HOST PORTAL ROUTES ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route 2: AI-Assisted Contest Setup (NOW HARDCODED FOR KCSE)
app.post('/api/setup-contest', (req, res) => {
    const db = dbManager.getDb();

    if (!db) {
        return res.status(500).json({ success: false, message: 'Server initializing, please try again in a moment.' });
    }

    // Hardcoded proposal to enforce full KCSE standard (9 Subjects, 100 max score each)
    const proposal = {
        name: "KCSE Official Ranking Simulation",
        subjects: [
            { name: "Mathematics", max_score: 100 },
            { name: "English", max_score: 100 },
            { name: "Kiswahili", max_score: 100 },
            { name: "Physics", max_score: 100 },
            { name: "Chemistry", max_score: 100 },
            { name: "Biology", max_score: 100 },
            { name: "History and Gov't", max_score: 100 },
            { name: "Geography", max_score: 100 },
            { name: "Religious Education", max_score: 100 }
        ],
        total_max_score: 900, // 9 subjects * 100
        ranking_rule: "KCSE 7-Best Mean Grade" // Custom rule for calculation
    };

    const submissionCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const sql = `
        INSERT INTO contests (name, ranking_rule, total_max_score, submission_code)
        VALUES (
            '${proposal.name.replace(/'/g, "''")}',
            '${proposal.ranking_rule.replace(/'/g, "''")}',
            ${proposal.total_max_score},
            '${submissionCode}'
        )
    `;

    try {
        db.exec(sql); // Saves contest header

        // --- NEW CODE: Insert Subjects into the 'subjects' table ---
        // 1. Get the ID of the contest we just inserted
        const contestIdResult = db.exec("SELECT last_insert_rowid()");
        const contestId = contestIdResult[0].values[0][0];

        // 2. Loop through the proposal subjects and insert them
        proposal.subjects.forEach(subject => {
            const subSql = `
                INSERT INTO subjects (contest_id, name, max_score) 
                VALUES (${contestId}, '${subject.name.replace(/'/g, "''")}', ${subject.max_score})
            `;
            db.exec(subSql);
        });
        // --- END NEW CODE ---

        dbManager.saveDatabase();

        console.log(`Contest saved. Code: ${submissionCode}`);

        res.json({
            success: true,
            proposal: proposal,
            submissionCode: submissionCode
        });

    } catch (error) {
        console.error("Database Insert Error:", error.message);
        console.error("SQL Statement:", sql);
        res.status(500).json({ success: false, message: 'Failed to save contest setup due to database error. (Check if subjects table exists!)' });
        return;
    }
});

// Route 3: Advanced Feature - Manual JSON Upload for Flexible Setup
app.post('/api/setup-custom', upload.single('configJsonFile'), (req, res) => {
    const db = dbManager.getDb();
    if (!db || !req.file) {
        return res.status(400).json({ success: false, message: 'Missing database or configuration file.' });
    }

    let customProposal;
    
    try {
        // 1. Read and Parse the Uploaded JSON File
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        customProposal = JSON.parse(fileContent);

        // Basic validation for required fields
        if (!customProposal.name || !Array.isArray(customProposal.subjects) || customProposal.subjects.length === 0) {
            throw new Error("Invalid or incomplete contest structure in JSON file.");
        }

        // 2. Calculate Total Max Score (Flexibility in action)
        const totalMaxScore = customProposal.subjects.reduce((sum, subject) => sum + subject.max_score, 0);

        const submissionCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // 3. Insert Contest Header
        const sql = `
            INSERT INTO contests (name, ranking_rule, total_max_score, submission_code)
            VALUES (
                '${customProposal.name.replace(/'/g, "''")}',
                '${customProposal.ranking_rule ? customProposal.ranking_rule.replace(/'/g, "''") : "Total Score (Custom)"}',
                ${totalMaxScore},
                '${submissionCode}'
            )
        `;
        db.exec(sql);

        // 4. Insert Subjects
        const contestIdResult = db.exec("SELECT last_insert_rowid()");
        const contestId = contestIdResult[0].values[0][0];

        customProposal.subjects.forEach(subject => {
            const subSql = `
                INSERT INTO subjects (contest_id, name, max_score) 
                VALUES (${contestId}, '${subject.name.replace(/'/g, "''")}', ${subject.max_score})
            `;
            db.exec(subSql);
        });

        dbManager.saveDatabase();
        fs.unlinkSync(req.file.path); // Clean up uploaded file

        res.json({
            success: true,
            proposal: customProposal,
            submissionCode: submissionCode,
            message: `Custom contest '${customProposal.name}' successfully created!`
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error("Custom Setup Error:", error.message);
        res.status(500).json({ success: false, message: `Failed to set up custom contest: ${error.message}` });
    }
});


// --- PARTICIPANT PORTAL ROUTES ---
app.get('/submit', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'submission.html'));
});

// Route 4: Verify Submission Code
app.post('/api/verify-code', (req, res) => {
    const db = dbManager.getDb();
    const { submissionCode } = req.body;

    if (!db) {
        return res.status(500).json({ success: false, message: 'Server initializing, try again.' });
    }

    const sanitizedCode = submissionCode.toUpperCase().replace(/'/g, "''");

    const sql = `
        SELECT name, id FROM contests WHERE submission_code = '${sanitizedCode}'
    `;

    try {
        const result = db.exec(sql);

        if (result.length > 0 && result[0].values.length > 0) {
            const contestName = result[0].values[0][0];
            const contestId = result[0].values[0][1];
            console.log(`Code verified for: ${contestName}`);
            res.json({ success: true, contestName: contestName, contestId: contestId });
        } else {
            console.log(`Verification failed for code: ${submissionCode}`);
            res.json({ success: false, message: 'Invalid or expired submission code.' });
        }
    } catch (error) {
        console.error("Database Select Error:", error.message);
        res.status(500).json({ success: false, message: 'Internal database error during verification.' });
    }
});

// Route 5: Handle Result File Submission (with Validation)
app.post('/api/submit-results', upload.single('resultFile'), async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded or file transfer failed.' });
    }

    const { schoolName, contestId } = req.body;
    const db = dbManager.getDb();

    // Stricter Server-Side Validation
    if (!db || !contestId || !schoolName || schoolName.trim().length === 0) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Missing contest data (ID) or School Name is empty.' });
    }

    let rawScore;

    try {
        // 2. Read and Parse the File (Expecting ONLY the raw score number)
        const fileContent = fs.readFileSync(req.file.path, 'utf8').trim();
        rawScore = parseInt(fileContent, 10);

        // Explicit check that score is a valid, non-negative number
        if (isNaN(rawScore) || rawScore < 0) {
            throw new Error("File content is not a valid, non-negative score number.");
        }

        // 3. Prepare Data for Database Insertion
        const sanitizedSchoolName = schoolName.replace(/'/g, "''");

        const sql = `
            INSERT INTO results (contest_id, school_name, total_score)
            VALUES (
                ${parseInt(contestId)},
                '${sanitizedSchoolName}',
                ${rawScore}
            )
        `;

        // 4. Insert Results into DB
        db.exec(sql);
        dbManager.saveDatabase();

        // 5. Success Response and Cleanup
        console.log(`Results saved for Contest ID ${contestId}: ${schoolName}, Score: ${rawScore}`);

        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: `Results for ${schoolName} (Score: ${rawScore}) successfully processed and saved.`
        });

    } catch (error) {
        // 6. Error Handling and Cleanup
        console.error("Result Processing Error:", error.message);

        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            message: `Failed to process results: ${error.message}.`
        });
        return;
    }
});


// --- RANKINGS AND AUDIT ROUTES ---

// Route 7: Get Ranking Data (Queries DB, ordered by score)
app.get('/api/rankings/:contestCode', (req, res) => {
    const db = dbManager.getDb();
    const contestCode = req.params.contestCode.toUpperCase().replace(/'/g, "''");

    if (!db) {
        return res.status(500).json({ success: false, message: 'Server initializing.' });
    }

    const sql = `
        SELECT
            c.name AS contest_name,
            r.school_name,
            r.total_score
        FROM results r
        JOIN contests c ON r.contest_id = c.id
        WHERE c.submission_code = '${contestCode}'
        ORDER BY r.total_score DESC, r.submission_time ASC;
    `;

    try {
        const result = db.exec(sql);

        if (result.length > 0 && result[0].values.length > 0) {
            const contestName = result[0].values[0][0];
            const rankings = result[0].values.map(row => ({
                school_name: row[1],
                total_score: row[2]
            }));

            res.json({ success: true, contestName, rankings });
        } else {
             const contestInfo = db.exec(`SELECT name FROM contests WHERE submission_code = '${contestCode}'`);
             const name = (contestInfo.length > 0 && contestInfo[0].values.length > 0) ? contestInfo[0].values[0][0] : "Unknown Contest";
            res.json({ success: true, contestName: name, rankings: [] });
        }
    } catch (error) {
        console.error("Database Ranking Error:", error.message);
        res.status(500).json({ success: false, message: 'Internal database error fetching rankings.' });
    }
});

// Route 8: Serve the Rankings HTML page
app.get('/rankings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'rankings.html'));
});

// Route 9: Get All Raw Submission Data (Tally View)
app.get('/api/tally/:contestCode', (req, res) => {
    const db = dbManager.getDb();
    const contestCode = req.params.contestCode.toUpperCase().replace(/'/g, "''");

    if (!db) {
        return res.status(500).json({ success: false, message: 'Server initializing.' });
    }

    const sql = `
        SELECT
            c.name AS contest_name,
            r.school_name,
            r.total_score,
            r.submission_time
        FROM results r
        JOIN contests c ON r.contest_id = c.id
        WHERE c.submission_code = '${contestCode}'
        ORDER BY r.submission_time ASC;
    `;

    try {
        const result = db.exec(sql);

        if (result.length > 0 && result[0].values.length > 0) {
            const contestName = result[0].values[0][0];
            const tallyData = result[0].values.map(row => ({
                school_name: row[1],
                total_score: row[2],
                submission_time: row[3]
            }));

            res.json({ success: true, contestName, tallyData });
        } else {
            const contestInfo = db.exec(`SELECT name FROM contests WHERE submission_code = '${contestCode}'`);
            const name = (contestInfo.length > 0 && contestInfo[0].values.length > 0) ? contestInfo[0].values[0][0] : "Unknown Contest";
            res.json({ success: true, contestName: name, tallyData: [] });
        }
    } catch (error) {
        console.error("Database Tally Error:", error.message);
        res.status(500).json({ success: false, message: 'Internal database error fetching tally.' });
    }
});

// Route 10: Serve the Tally HTML page
app.get('/tally', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tally.html'));
});

// Route 6: Download the Database File (for Host backup)
app.get('/download-db', (req, res) => {
    // CRITICAL FIX: Reference the new database file name
    const filePath = path.join(__dirname, 'contestrank_kcse.db'); 

    if (fs.existsSync(filePath)) {
        console.log('Serving database file for download.');
        res.setHeader('Content-disposition', 'attachment; filename=contestrank_kcse.db');
        res.setHeader('Content-type', 'application/octet-stream');
        res.sendFile(filePath);
    } else {
        console.error('Database file not found for download.');
        res.status(404).send('Database file not found.');
    }
});

// Route 11: Host System Reset (Deletes DB and Uploads)
app.post('/api/reset-system', (req, res) => {
    // CRITICAL FIX: Reference the new database file name
    const dbFilePath = path.join(__dirname, 'contestrank_kcse.db'); 
    const uploadsDir = path.join(__dirname, 'uploads');

    let messages = [];

    try {
        // 1. Delete Database File
        if (fs.existsSync(dbFilePath)) {
            fs.unlinkSync(dbFilePath);
            messages.push('Database file (contestrank_kcse.db) successfully deleted.');
        } else {
            messages.push('Database file not found (already deleted).');
        }

        // 2. Delete Uploads Directory contents
        if (fs.existsSync(uploadsDir)) {
            fs.readdirSync(uploadsDir).forEach(file => {
                fs.unlinkSync(path.join(uploadsDir, file));
            });
            messages.push('Uploads directory contents successfully cleared.');
        } else {
            messages.push('Uploads directory not found.');
        }

        console.log('--- SYSTEM RESET COMPLETE ---');
        messages.forEach(msg => console.log(`[RESET] ${msg}`));

        // Re-initialize the database right after deletion to ensure the server stays up
        dbManager.initializeDatabase();

        res.json({ success: true, message: messages.join(' ') });

} catch (error) {
    console.error("System Reset Error:", error.message);
    res.status(500).json({ success: false, message: `System Reset failed: ${error.message}` });
}
});


// Function to start the server and initialize the DB
async function startApp() {
    await dbManager.initializeDatabase();

    // The app.listen call must contain all subsequent commands within its function block
    app.listen(PORT, () => { // <--- Must use the uppercase 'PORT'
        console.log(`ContestRank Pro server running at http://localhost:${PORT}`); // <--- Must use the uppercase 'PORT'
        console.log('Press Ctrl+C to stop the server.');
    });
}

// Execute the async start function
startApp();

