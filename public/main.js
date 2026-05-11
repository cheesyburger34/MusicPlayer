// Select all navigation triggers and their target content sections
const navItems = document.querySelectorAll('.nav-item');
const pageContents = document.querySelectorAll('.page-content');

// Container for the stacking effect and the vertical spacing constant
const navContainer = document.querySelector('.nav-items');
const stackOffset = 20;

let audioFiles = [];

/**
 * Initializes or resets the visual stack layout
 */
function updateStack() {
    const items = Array.from(navContainer.querySelectorAll('.nav-item'));
    const baseHeight = items[0]?.offsetHeight || 140;

    // Match container height to the first item and set initial z position
    navContainer.style.height = `${baseHeight}px`;
    items.forEach((item, index) => {
        item.style.zIndex = items.length - index;
        item.style.transform = `translateY(0)`;
    });
}

/**
 * Handles logic for switching active items and updating stack visuals
 */
function activateItem(clickedItem) {
    const items = Array.from(navContainer.querySelectorAll('.nav-item'));

    const albumPage = document.getElementById('albumPage');
    if (albumPage && albumPage.classList.contains('active')) {
        albumPage.classList.remove('active');
        albumPage.classList.add('exit');
        setTimeout(() => {
            albumPage.classList.remove('exit');
            albumPage.style.display = 'none';
        }, 100);
    }

    // Reset active states for all navigation items and content pages
    items.forEach(item => item.classList.remove('active'));
    pageContents.forEach(page => page.classList.remove('active'));

    // Activate the clicked item and its linked content page
    clickedItem.classList.add('active');
    const pageId = clickedItem.dataset.page;
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');

    const currentPage = document.querySelector('.page-content.active');
    const nextPage = targetPage;

    const activeIndex = items.indexOf(clickedItem);

    items.forEach((item, index) => {
        // Track if items are visually above or below the current selection
        item.classList.remove('above-active', 'below-active');
        if (item !== clickedItem) {
            index < activeIndex ? item.classList.add('above-active') : item.classList.add('below-active');
        }

        // Expand the active item and shrink others while managing layer priority
        if (item === clickedItem) {
            item.style.zIndex = items.length;
            item.style.height = '220px';
            item.style.minHeight = '220px';
        } else {
            item.style.zIndex = index > activeIndex ? items.length - index : 1;
            item.style.height = '150px';
            item.style.minHeight = '150px';
        }
    });

    // Curved  Logic
    if (currentPage) {
        currentPage.classList.remove('active');
        currentPage.classList.add('exit');

        // Cleanup after animation finishes
        setTimeout(() => {
            currentPage.classList.remove('exit');
        }, 100);
    }

    if (nextPage) {
        // Delay a tiny bit to let the exit animation start for a layered look
        setTimeout(() => {
            nextPage.classList.add('active');
        }, 50);
    }
}

// Attach click listeners to all navigation items
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', event => {
        event.preventDefault();
        activateItem(event.currentTarget);
    });
});

// Refresh stack calculations on page load and window resize
window.addEventListener('load', () => {
    updateStack();
    // Set default active item to library
    const libraryItem = document.querySelector('[data-page="library"]');
    if (libraryItem) {
        activateItem(libraryItem);
    } else {
        // Apply default styling if no library item found
        const items = Array.from(navContainer.querySelectorAll('.nav-item'));
        items.forEach((item, index) => {
            if (index === 0) {
                item.style.zIndex = items.length;
                item.style.height = '220px';
                item.style.minHeight = '220px';
                item.classList.add('active');
            } else {
                item.style.zIndex = index > 0 ? items.length - index : 1;
                item.style.height = '150px';
                item.style.minHeight = '150px';
                item.classList.add('below-active');
            }
        });
        const firstPage = pageContents[0];
        if (firstPage) firstPage.classList.add('active');
    }
});
window.addEventListener('resize', updateStack);

function pause(button) {
    const playIcon = button.querySelector('.play-icon');
    if (playIcon.src.includes('play-icon.png')) {
        playIcon.src = '/images/pause-icon.png';
    } else {
        playIcon.src = '/images/play-icon.png';
    }
}

/**
 * 1. THE AUTO-LOADER
 * This runs as soon as the page opens to fetch existing music from your folder.
 */
async function loadExistingMusic() {
    try {
        // You'll need a simple GET route on your server for this (see note below)
        const response = await fetch('http://localhost:3000/list-music');
        if (response.ok) {
            const data = await response.json();
            if (data.tracks) displayMusic(data.tracks);
        }
    } catch (err) {
        console.error('Could not load library:', err);
    }
}

/**
 * 2. THE UPLOAD HANDLER
 * Handles picking files and sending them to your Multer server.
 */
async function addMusic() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'audio/*';
    fileInput.multiple = true;

    fileInput.onchange = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        const formData = new FormData();
        files.forEach(file => formData.append('songs', file));

        try {
            const response = await fetch('http://localhost:3000/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.tracks) {
                // Auto-fills the page with the songs just uploaded
                displayMusic(data.tracks);
                alert('Upload complete!');
            }
        } catch (err) {
            console.error('Upload failed:', err);
        }
    };

    fileInput.click();
}

/**
 * 3. THE UI GENERATOR
 * Turns the server's data into HTML elements.
 */
function displayMusic(tracks) {
    const libraryGrid = document.getElementById('library-grid');
    const artistList = document.getElementById('artist-list');

    // Prevent errors if the HTML containers don't exist yet
    if (!libraryGrid || !artistList) return;

    // Clear "Recently Added" placeholders if we have real data
    if (tracks.length > 0) {
        libraryGrid.innerHTML = '';
        artistList.innerHTML = '';
    }

    // Group tracks by artist
    const artistMap = {};
    tracks.forEach(track => {
        if (!artistMap[track.artist]) artistMap[track.artist] = [];
        artistMap[track.artist].push(track);
    });

    //Group tracks by album
    const albumMap = {};
    tracks.forEach(track => {
        if (!albumMap[track.album]) albumMap[track.album] = [];
        albumMap[track.album].push(track);
    });

    // Create Library Grid Cards (Grouped by Album)
    for (const albumName in albumMap) {
        const albumTracks = albumMap[albumName];
        // Use the first track in the album to get the cover and artist name
        const firstTrack = albumTracks[0];

        const card = document.createElement('div');
        card.className = 'music-card';
        card.style.cursor = 'pointer';

        // We display the Album Title and the Artist
        card.innerHTML = `
        <img src="${firstTrack.cover}" alt="${albumName}" class="album-cover-small">
        <div class="card-info">
            <strong>${albumName}</strong>
            <p>${firstTrack.artist}</p>
            <p3>${albumTracks.length} Tracks</p3>
        </div>
    `;
        card.onclick = () => switchToAlbumPage(albumName, albumTracks);

        libraryGrid.appendChild(card);
    }


    // Create Artist Sections
    for (const artist in artistMap) {
        const artistSection = document.createElement('div');
        artistSection.className = 'artist-section';
        artistSection.style.marginBottom = '40px';
        artistSection.innerHTML = `<h2>${artist}</h2>`;
        const scrollContainer = document.createElement('div');
        scrollContainer.className = `artist-scroll ${artist.replace(/\s+/g, '-')}`;
        scrollContainer.style.display = 'flex';
        artistMap[artist].forEach(track => {
            const songCard = document.createElement('div');
            songCard.className = 'song-card';
            songCard.style.marginRight = '30px';
            songCard.style.width = '100px';
            songCard.innerHTML = `
                <img src="${track.cover}" alt="Album Cover" class="album-cover" onclick="playTrack('${track.url}')">
                <div class="song-info">
                    <p>${track.title}</p>
                </div>
            `;
            scrollContainer.appendChild(songCard);
        });
        artistSection.appendChild(scrollContainer);
        artistList.appendChild(artistSection);
    }
}

function switchToAlbumPage(albumName, tracks) {
    // 1. Find the current active page and the album page
    const currentPage = document.querySelector('.page-content.active');
    const nextPage = document.getElementById('albumPage');

    if (!nextPage) return;

    // 2. Populate the Album Page content
    const firstTrack = tracks[0];
    nextPage.innerHTML = `
        <header class="content-header">
            <button class="back-button" onclick="goBackToLibrary()" style="margin-bottom: 20px;">Back</button>
            <div style="display: flex; gap: 30px; align-items: end;">
                <img src="${firstTrack.cover}" class="album-cover" style="width: 250px; height: 250px;">
                <div>
                    <p4 style="font-size: 48px;">${albumName}</p4>
                    <p style="color: #c943ac; font-size: 24px;">${firstTrack.artist}</p>
                </div>
            </div>
        </header>
        <div class="track-list" style="margin-top: 40px;">
            ${tracks.map((track, index) => `
                <div class="artist-list li" onclick="playTrack('${track.url}')" style="cursor: pointer;">
                    <span>${index + 1}</span>
                    <div style="flex: 1;"><strong>${track.title}</strong></div>
                </div>
            `).join('')}
        </div>
    `;

    // 3. Execute your "Curved" animation logic
    if (currentPage && currentPage !== nextPage) {
        currentPage.classList.remove('active');
        currentPage.classList.add('exit');
        setTimeout(() => currentPage.classList.remove('exit'), 100);
    }


    nextPage.style.display = 'block'; // Force it to exist in the layout
    setTimeout(() => {
        nextPage.classList.add('active');
    }, 50);
}

function goBackToLibrary() {
    const libraryItem = document.querySelector('[data-page="library"]');
    if (libraryItem) activateItem(libraryItem); 
}

/**
 * 4. THE PLAYER
 */
function playTrack(url) {
    // Basic global audio player logic
    const audio = new Audio(url);
    audio.play();
}

function stopMusic() {
    // This will stop all currently playing audio elements
    const audios = document.querySelectorAll('audio');
    audios.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
}
    



// Call the auto-loader when the script runs
//loadExistingMusic();

/*
// Icon path constants
const PLAY_ICON_PATH = 'images/play-icon.png';
const PAUSE_ICON_PATH = 'images/pause-icon.png';

let song = new Audio('audio/death-grips-takyon.mp3'); // to change with Ben's system


function playMusic(button) {

    // Using data-attribute for better management
    document.querySelectorAll('.play-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const songId = button.getAttribute('data-song-id'); // in case songId is needed for future expansion, currently not used as we have a single song
            if (songId) {
                // play the corresponding audio file
                if (song) {
                    song.pause();
                    song.currentTime = 0;
                    song.src = ''; // Clean up previous audio source
                    song = new Audio(`audio/${songId}.mp3`);
                    song.play().catch(error => {
                        console.error('Playback failed:', error);
                    });
                    song.currentTime = 0;
                    song.play();
                }
            }
        });
    });
    const playIcon = button.querySelector('.play-icon');
    if (playIcon) {
        if (playIcon.src.includes('play-icon.png')) {
            playIcon.src = PAUSE_ICON_PATH;
            song.play();
        } else {
            playIcon.src = PLAY_ICON_PATH;
            song.pause();
        }
    }
}

const volumeSlider = document.querySelector('.volume-slider');
const volumeLabel = document.querySelector('.volume-label');

volumeSlider.addEventListener('input', (e) => {
    let volume = e.target.value;
    if (song) {
        song.volume = volume / 100;  // Convert 0-100 to 0-1
    }
    volumeLabel.textContent = volume + '%';
});
*/