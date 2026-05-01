const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mm = require('music-metadata');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

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
        const relativePath = path.dirname(file.originalname);
        const fullDir = path.join(__dirname, 'musicLibrary', relativePath);
        if (!fs.existsSync(fullDir)) {
            fs.mkdirSync(fullDir, { recursive: true });
        }
        cb(null, fullDir);
    },
    filename: (req, file, cb) => {
        cb(null, path.basename(file.originalname));
    }
});

const upload = multer({ storage: storage });

// 4. The upload endpoint
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
                console.log(`  Title: ${metadata.common.title || 'Unknown'}`);
                console.log(`  Artist: ${metadata.common.artist || 'Unknown'}`);
                console.log(`  Album: ${metadata.common.album || 'Unknown'}`);

                const picture = metadata.common.picture && metadata.common.picture[0];
                let coverUrl = '/musicLibrary/covers/default-cover.png'; // Make sure this exists!

                if (picture) {
                    // Create image name based on mp3 filename
                    const imageName = `${path.parse(file.filename).name}.jpg`;
                    const imagePath = path.join(coversDir, imageName);

                    fs.writeFileSync(imagePath, picture.data);
                    coverUrl = `/musicLibrary/covers/${imageName}`;
                    console.log(`✔ Cover saved: ${imageName}`);
                } else {
                    console.warn(`X No cover found in ${file.originalname}`);
                }

                // Push metadata results
                results.push({
                    title: metadata.common.title || file.originalname,
                    album: metadata.common.album || 'Unknown Album',
                    artist: metadata.common.artist || 'Unknown Artist',
                    url: `/musicLibrary/${path.relative(musicDir, filePath)}`,
                    cover: coverUrl
                });

                // Handle metadata extraction errors 
            } catch (err) {
                console.error(`X Metadata Error for ${file.originalname}:`, err.message);
                // Push basic info even if metadata fails
                results.push({
                    title: file.originalname,
                    album: 'Unknown',
                    url: `/musicLibrary/${path.relative(musicDir, filePath)}`,
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
    if (err instanceof multer.MulterError) {
      console.error("Multer Error:", err);
    } else if (err) {
     console.
    }

});

function getAllMusicFiles(dir) {
    let files = [];
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            files = files.concat(getAllMusicFiles(fullPath));
        } else if (item.endsWith('.mp3') || item.endsWith('.wav') || item.endsWith('.flac')) {
            files.push(fullPath);
        }
    }
    return files;
}

app.get('/list-music', async (req, res) => {
    const files = getAllMusicFiles(musicDir).map(f => path.relative(musicDir, f));

    const tracks = await Promise.all(files.map(async file => {
        const fullPath = path.join(musicDir, file);
        const metadata = await mm.parseFile(fullPath);
        return {
            title: metadata.common.title || file,
            artist: metadata.common.artist || 'Unknown Artist',
            url: `/musicLibrary/${file}`,
            cover: `/musicLibrary/covers/${path.parse(file).name}.jpg`
        };
    }));

    res.json({ tracks });
});

app.listen(3000, () => console.log('Server running on port 3000'));