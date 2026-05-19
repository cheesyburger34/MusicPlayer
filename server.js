/*
### Supporting Documentation & Logic

*   **SQLite Database Persistence**: Switched from a JSON cache to SQLite using `better-sqlite3`. This provides a robust, atomic, and high-speed index for the music library. It prevents the data corruption and "flickering" issues often seen with manual JSON file writing during heavy I/O operations.
*   **Multer MemoryStorage**: Files are stored as `Buffer` objects in RAM during upload. This is critical for 100MB+ FLAC files to avoid "File Busy" (EBUSY) errors on Windows that occur when trying to read metadata while the file is still being written to disk.
*   **Music-Metadata parseBuffer**: Parsing metadata directly from the memory buffer is faster and safer for large files. It avoids redundant disk reads and handles FLAC, MP3, and WAV headers natively.
*   **Path Normalization**: All file paths use `.replace(/\\/g, '/')`. While Windows uses backslashes, web browsers require forward slashes for URLs. This ensures the music player can actually locate and play the files.
*   **Request & Memory Management**: Increased Express and Multer payload limits to 500MB+ to accommodate high-fidelity audio. The server timeout is extended to prevent the browser from "aborting" the request during the processing of large batches.

### Key Improvements

1.  **SQLite Integration**: Replaced manual file-scanning with a database. The server now queries a pre-built index (`library.db`), which returns track lists in milliseconds regardless of the library size.
2.  **Library Synchronization**: Added a `syncLibrary` function that runs on startup. It scans the physical folder for new files added manually and registers them in the database without re-processing existing tracks.
3.  **Sequential Async Processing**: Uses `for...of` with `await` to process one file at a time. This prevents the Node.js event loop from freezing and stops the "Request Aborted" errors caused by trying to handle too many massive file buffers simultaneously.
4.  **Persistent Metadata Caching**: Once metadata is extracted, it is saved permanently in the database. The server will never have to re-parse a 100MB FLAC file unless the database is deleted, significantly saving CPU and RAM.
5.  **Recursive Directory Safety**: The file scanner is optimized to ignore the `covers` folder and non-audio formats, preventing the database from being cluttered with image data or system files.
6.  **Elimination of Refresh Loops**: By using a stable database and avoiding synchronous file-system blocks, the server remains responsive, preventing the browser from triggering timeout-related page reloads.
*/

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const mm = require('music-metadata');
const crypto = require('crypto');

const app = express();
app.use(cors());

const server = app.listen(3000, () => console.log('Server running on port 3000'));
server.setTimeout(120000); // Increase timeout to 2 minutes for large uploads

// 1. Increase payload limits for the initial request handling
app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ limit: '1000mb', extended: true }));



app.use('/musicLibrary', express.static(path.join(__dirname, 'musicLibrary')));


const musicDir = path.join(__dirname, 'musicLibrary');
const coversDir = path.join(__dirname, 'musicLibrary/covers');

if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir);
if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });

// Using Memory Storage to prevent file-locking issues during metadata extraction
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB per file
        fieldSize: 500 * 1024 * 1024
    }
});

const Database = require('better-sqlite3');
const db = new Database('library.db');

// Create the table if it doesn't exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS tracks (
    url TEXT PRIMARY KEY,
    title TEXT,
    artist TEXT,
    album TEXT,
    cover TEXT
  )
`).run();

app.post('/upload', upload.array('songs'), async (req, res) => {
    const results = [];
    console.log("--- Starting Processing ---");

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files were uploaded.' });
    }

    for (const file of req.files) {
        try {
            // 1. Extract metadata from the buffer FIRST
            const metadata = await mm.parseBuffer(file.buffer, file.mimetype);

            // 2. Determine file and folder paths
            // Use path.dirname(file.originalname) to preserve folder structure from upload
            const subFolder = path.dirname(file.originalname);
            const targetFolder = path.join(musicDir, subFolder);

            if (!fs.existsSync(targetFolder)) {
                fs.mkdirSync(targetFolder, { recursive: true });
            }

            const fileName = path.basename(file.originalname);
            const fullFilePath = path.join(targetFolder, fileName);

            // 3. Save the music file to disk (Async)
            await fsPromises.writeFile(fullFilePath, file.buffer);

            // 4. Handle Cover Art
            const picture = metadata.common.picture && metadata.common.picture[0];
            let coverUrl = '/musicLibrary/covers/default-cover.webp';

            if (picture) {
                // Generate a unique filename based on a hash of its file path.
                // This ensures "Track 1.mp3" in Album A and Album B get completely separate covers.
                const uniqueHash = crypto.createHash('md5').update(file.originalname).digest('hex').substring(0, 12);
                const imageName = `${path.parse(fileName).name}_${uniqueHash}.jpg`;
                const imagePath = path.join(coversDir, imageName);
                
                await fsPromises.writeFile(imagePath, picture.data);
                coverUrl = `/musicLibrary/covers/${imageName}`;
            }

            // 5. Generate Web-Friendly URL
            const absoluteMusicDir = path.resolve(musicDir);
            const absoluteFilePath = path.resolve(fullFilePath);
            const relPath = path.relative(absoluteMusicDir, absoluteFilePath);
            const webFriendlyPath = relPath.split(path.sep).join('/');
            console.log(`Path: ${webFriendlyPath}`);

            // 6. Construct Track Data
            const trackData = {
                url: `/musicLibrary/${webFriendlyPath}`,
                title: metadata.common.title || fileName,
                artist: metadata.common.artist || 'Unknown Artist',
                album: metadata.common.album || 'Unknown Album',
                cover: coverUrl
            };

            // 7. Save to SQLite (Synchronous is fine here as it's very fast)
            const insert = db.prepare(`
            INSERT OR REPLACE INTO tracks (url, title, artist, album, cover)
            VALUES (@url, @title, @artist, @album, @cover)
        `);
            insert.run(trackData);

            results.push(trackData);
            console.log(`✔ Processed: ${fileName}`);

        } catch (error) {
            console.error(`X Error processing ${file.originalname}:`, error);
        }
    }
    return res.status(200).json({ tracks: results });
});

// Helper for the list endpoint
function getAllMusicFiles(dir) {
    let files = [];
    if (!fs.existsSync(dir)) return files;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            if (item !== 'covers') { // Skip the covers folder
                files = files.concat(getAllMusicFiles(fullPath));
            }
        } else if (/\.(mp3|flac|wav|ogg|m4a|ACC|AIFF|mp4)$/i.test(item)) {
            files.push(fullPath);
        }
    }
    return files;
}

app.get('/list-music', (req, res) => {
    try {
        // Fetch all tracks from the database
        const tracks = db.prepare('SELECT * FROM tracks').all();
        res.json({ tracks });
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
});

async function syncLibrary() {
    console.log("Starting Library Sync...");
    
    try {
        const dbTracks = db.prepare('SELECT url FROM tracks').all();
        const deleteStmt = db.prepare('DELETE FROM tracks WHERE url = ?');
        
        for (const track of dbTracks) {
            const relativePath = track.url.replace('/musicLibrary/', '');
            const fullPath = path.join(musicDir, relativePath);

            if (!fs.existsSync(fullPath)) {
                console.log(`🗑 Removing missing file from DB: ${relativePath}`);
                deleteStmt.run(track.url);
            }
        }
    } catch (err) {
        console.error("Error cleaning up orphaned DB entries:", err);
    }

    const files = getAllMusicFiles(musicDir);
    console.log(`Checking ${files.length} physical files for sync updates...`);

    const selectStmt = db.prepare('SELECT url FROM tracks WHERE url = ?');
    const insertStmt = db.prepare(`
        INSERT INTO tracks (url, title, artist, album, cover)
        VALUES (?, ?, ?, ?, ?)
    `);

    for (const fullPath of files) {
        const relPathUrl = `/musicLibrary/${path.relative(musicDir, fullPath).replace(/\\/g, '/')}`;
        const existing = selectStmt.get(relPathUrl);

        if (!existing) {
            console.log(`New file found via sync: ${relPathUrl}. Parsing metadata...`);
            try {
                const metadata = await mm.parseFile(fullPath);
                
                // Safe unique naming wrapper for sync covers
                const picture = metadata.common.picture && metadata.common.picture[0];
                let syncCoverUrl = '/musicLibrary/covers/default-cover.webp';

                if (picture) {
                    const uniqueHash = crypto.createHash('md5').update(relPathUrl).digest('hex').substring(0, 12);
                    const syncCoverName = `${path.parse(fullPath).name}_${uniqueHash}.jpg`;
                    const imagePath = path.join(coversDir, syncCoverName);
                    
                    // Actually write the image payload out to disk
                    await fsPromises.writeFile(imagePath, picture.data);
                    syncCoverUrl = `/musicLibrary/covers/${syncCoverName}`;
                }

                insertStmt.run(
                    relPathUrl,
                    metadata.common.title || path.basename(fullPath),
                    metadata.common.artist || 'Unknown Artist',
                    metadata.common.album || 'Unknown Album',
                    syncCoverUrl // <-- FIXED: Passes the correct dynamic variable
                );
            } catch (e) {
                console.error(`Failed to parse sync metadata for ${relPathUrl}`, e);
            }
        } else {
            console.log(`File already indexed: ${relPathUrl}`);
        }
    }
    console.log("Library Sync Complete.");
}

app.get('/list-music', (req, res) => {
    try {
        const tracks = db.prepare('SELECT * FROM tracks').all();
        res.json({ tracks });
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
});

syncLibrary();

