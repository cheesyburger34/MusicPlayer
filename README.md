# MusicPlayer

A local, browser-based music player with an indexed music library, queue management, listening statistics, and layered audio visualizers powered by Wave.js built for client Alen Hasanovic.

## Features

- Browse music by album or artist.
- Upload multiple audio files and extract their embedded metadata and cover art.
- Automatically index supported files placed directly in `musicLibrary/`.
- Play albums and artist collections as a continuous context queue.
- Add, remove, and reorder tracks in a manual priority queue.
- Search by track title, artist, or album.
- Track completed plays and display top tracks and artists.
- Switch between nine layered Wave.js visualizer modes.
- Adjust visualizer sensitivity, reaction strength, physical scale, and visible controls.
- Open a full-screen song-focus view with animated album art and metadata.

## Requirements

- Node.js
- npm
- A modern browser with Web Audio API support

## Setup

Install dependencies:

```powershell
npm install
```

Start the API and music-library server:

```powershell
node server.js
```

The server listens on `http://localhost:3000`.

Serve `public/main.html` with a local static-file server or editor extension, then open it in your browser. The frontend currently calls the API at `http://localhost:3000`.

## Adding Music

There are two supported workflows:

1. Use the upload button in the application. Uploaded files are saved into `musicLibrary/`.
2. Place supported audio files directly inside `musicLibrary/`, then restart the server to synchronize them.

Supported extensions:

```text
mp3, flac, wav, ogg, m4a, AAC, AIFF, mp4
```

Embedded metadata is used for track titles, artists, albums, and cover images. Missing values fall back to `Unknown Artist`, `Unknown Album`, or the source filename.

## Data Storage

- Audio files and extracted covers are stored in `musicLibrary/`.
- Library and listening-history SQLite databases are stored in the operating system's temporary directory.
- The library index synchronizes when `server.js` starts.
- A play is recorded when a track reaches its end.

Deleting the temporary SQLite databases resets the library index and listening history. The music files themselves remain in `musicLibrary/`.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/list-music` | Return indexed tracks |
| `POST` | `/upload` | Upload and index audio files |
| `GET` | `/api/stats` | Return library and listening totals |
| `GET` | `/api/stats/top` | Return top tracks and artists |
| `POST` | `/api/stats/listen` | Record a completed track play |
| `GET` | `/musicLibrary/*` | Serve audio files and cover images |

## Project Structure

```text
MusicPlayer/
|-- musicLibrary/          Local audio files and extracted covers
|-- public/
|   |-- main.html          Application markup
|   |-- main.css           Layout, visual design, and animations
|   `-- main.js            Player, queue, search, stats, and visualizer logic
|-- server.js              Express API, uploads, metadata, and SQLite indexing
|-- package.json
`-- README.md
```

## Visualizer Controls

- **Visualizer:** Selects the Wave.js animation mode.
- **Sensitivity:** Controls analyser smoothing.
- **Volume:** Changes playback volume.
- **Reaction:** Amplifies or reduces audio-driven movement.
- **Scale:** Changes visualizer element length and overall geometry without lowering canvas resolution.
- **Eye menu:** Chooses which controls remain visible.

## Notes

- Uploads are processed in memory and support files up to `500 MB` each.
- The server timeout is extended for large audio uploads.
- Music files, generated covers, dependencies, and runtime databases are intentionally excluded from Git.
- This is a local-development application and does not currently include authentication or production deployment configuration.

## Credits

- Logan Crosby
- Benjamin Fermoyle