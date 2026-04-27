const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mm = require('music-metadata');

const app = express();
app.use(cors());

// 1. Make the music library folder accessible to the browser
app.use('/musicLibrary', express.static(path.join(__dirname, 'musicLibrary')));

// 2. Ensure folders exist
const musicDir = path.join(__dirname, 'musicLibrary');
const coversDir = path.join(__dirname, 'musicLibrary/covers');

if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir);
if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });

// 3. Setup Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'musicLibrary/'); 
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// 4. THE ONLY UPLOAD ROUTE YOU NEED
app.post('/upload', upload.array('songs'), async (req, res) => {
    const results = [];
    console.log("--- Starting Metadata Extraction ---");

    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files were uploaded.' });
        }

        for (const file of req.files) {
            const filePath = path.resolve(file.path);

            try {
                const metadata = await mm.parseFile(filePath);
                console.log(`Processing: ${file.originalname}`);

                const picture = metadata.common.picture && metadata.common.picture[0];
                let coverUrl = '/musicLibrary/covers/default-cover.png'; // Make sure this exists!

                if (picture) {
                    // Create image name based on mp3 filename
                    const imageName = `${path.parse(file.filename).name}.jpg`;
                    const imagePath = path.join(coversDir, imageName);

                    fs.writeFileSync(imagePath, picture.data);
                    coverUrl = `/musicLibrary/covers/${imageName}`;
                    console.log(`✅ Cover saved: ${imageName}`);
                } else {
                    console.warn(`⚠️ No cover found in ${file.originalname}`);
                }

                results.push({
                    title: metadata.common.title || file.originalname,
                    album: metadata.common.album || 'Unknown Album',
                    artist: metadata.common.artist || 'Unknown Artist',
                    url: `/musicLibrary/${file.originalname}`,
                    cover: coverUrl
                });

            } catch (err) {
                console.error(`❌ Metadata Error for ${file.originalname}:`, err.message);
                // Push basic info even if metadata fails
                results.push({
                    title: file.originalname,
                    album: 'Unknown',
                    url: `/musicLibrary/${file.originalname}`,
                    cover: '/musicLibrary/covers/default-cover.png'
                });
            }
        }

        console.log("--- Upload Task Finished ---");
        res.json({ message: 'Upload complete', tracks: results });

    } catch (error) {
        console.error("Critical Server Error:", error);
        res.status(500).json({ error: "Server failed to process files." });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));