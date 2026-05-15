// Select all navigation triggers and their target content sections
const navItems = document.querySelectorAll('.nav-item');
const pageContents = document.querySelectorAll('.page-content');

// Container for the stacking effect and the vertical spacing constant
const navContainer = document.querySelector('.nav-items');
const stackOffset = 20;

let audioFiles = [];
let lastVisitedPageId = 'library';

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
    if (currentPage && currentPage !== nextPage && currentPage.id !== 'albumPage') {
        lastVisitedPageId = currentPage.id;
    }

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

// Refresh stack calculations on page load
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

    if (!libraryGrid || !artistList) return;

    if (tracks.length > 0) {
        libraryGrid.innerHTML = '';
        artistList.innerHTML = '';
    }

    // Grouping Logic
    const artistMap = {};
    const albumMap = {};
    tracks.forEach(track => {
        if (!artistMap[track.artist]) artistMap[track.artist] = [];
        artistMap[track.artist].push(track);

        if (!albumMap[track.album]) albumMap[track.album] = [];
        albumMap[track.album].push(track);
    });

    // Create Library Grid Cards
    for (const albumName in albumMap) {
        const albumTracks = albumMap[albumName];
        const firstTrack = albumTracks[0];

        const card = document.createElement('div');
        card.className = 'music-card'; // Styling handled in CSS
        card.innerHTML = `
            <img src="${firstTrack.cover}" alt="${albumName}" class="album-cover">
            <div class="card-info">
                <strong>${albumName}</strong>
                <p>${firstTrack.artist}</p>
                <span class="track-count">${albumTracks.length} Tracks</span>
            </div>
        `;
        card.onclick = () => switchToAlbumPage(albumName, albumTracks);
        libraryGrid.appendChild(card);
    }

    // Create Artist Sections
    for (const artist in artistMap) {
        const artistSection = document.createElement('div');
        artistSection.className = 'artist-group';

        const artistTitle = document.createElement('h2');
        artistTitle.className = 'artist-name artist-title-clickable';
        artistTitle.textContent = artist;
        artistTitle.onclick = () => switchToArtistPage(artist, artistMap[artist]);

        const scrollContainer = document.createElement('div');
        scrollContainer.className = `artist-scroll ${artist.replace(/\s+/g, '-')}`;

        artistMap[artist].forEach(track => {
            const songCard = document.createElement('div');
            songCard.className = 'song-card-small';
            songCard.innerHTML = `
                <img src="${track.cover}" alt="Cover" class="album-cover-artist" onclick="playTrack('${track.url}')">
                <div class="song-info">
                    <p>${track.title}</p>
                </div>
            `;
            scrollContainer.appendChild(songCard);
        });

        artistSection.appendChild(artistTitle);
        artistSection.appendChild(scrollContainer);
        artistList.appendChild(artistSection);
    }
}
function switchToArtistPage(artistName, tracks) {
    const nextPage = document.getElementById('albumPage');
    if (!nextPage) return;

    const firstTrack = tracks[0] || { cover: '', album: '' };

    nextPage.innerHTML = `
        <header class="content-header">
            <button class="back-button" onclick="goBackToLibrary()">Back</button>
            <div class="album-header">
                <img src="${firstTrack.cover}" class="album-page-cover" alt="${artistName}">
                <div class="artist-header-info">
                    <p class="artist-label">Artist</p>
                    <h4>${artistName}</h4>
                    <span class="track-count">${tracks.length} Tracks</span>
                </div>
            </div>
        </header>
        <div class="track-list-container">
            ${tracks.map((track, index) => `
                <div class="track-item" onclick="playTrack('${track.url}')">
                    <span class="track-number">${index + 1}</span>
                    <div class="track-details">
                        <strong>${track.title}</strong>
                        <p class="track-subtext">${track.album}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    triggerPageTransition(nextPage);
}

function switchToAlbumPage(albumName, tracks) {
    const nextPage = document.getElementById('albumPage');
    if (!nextPage) return;

    const firstTrack = tracks[0];
    nextPage.innerHTML = `
        <header class="content-header">
            <button class="back-button" onclick="goBackToLibrary()">Back</button>
            <div class="album-header">
                <img src="${firstTrack.cover}" class="album-page-cover" alt="${albumName}">
                <div class="artist-header-info">
                    <p class="artist-label">${firstTrack.artist}</p>
                    <h4>${albumName}</h4>
                </div>
            </div>
        </header>
        <div class="track-list-container">
            ${tracks.map((track, index) => `
                <div class="track-item" onclick="playTrack('${track.url}')">
                    <span class="track-number">${index + 1}</span>
                    <div class="track-details">
                        <strong>${track.title}</strong>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    triggerPageTransition(nextPage);
}

// Reusable transition logic to keep functions clean
function triggerPageTransition(nextPage) {
    const currentPage = document.querySelector('.page-content.active');

    if (currentPage && currentPage !== nextPage) {
        currentPage.classList.remove('active');
        currentPage.classList.add('exit');
        setTimeout(() => currentPage.classList.remove('exit'), 100);
    }

    nextPage.style.display = 'block';
    setTimeout(() => nextPage.classList.add('active'), 50);
}




function goBackToLibrary() {
    const targetItem = document.querySelector(`[data-page="${lastVisitedPageId}"]`);
    if (targetItem) {
        activateItem(targetItem);
    } else {
        const libraryItem = document.querySelector('[data-page="library"]');
        if (libraryItem) activateItem(libraryItem);
    }
}

/**
 * 4. THE PLAYER
 */
let currentSong = null;
function playTrack(url) {
    // If something is already playing, stop it first
    if (currentSong) {
        currentSong.pause();
        currentSong.src = '';
    }


    currentSong = new Audio(url);
    currentVolume = document.querySelector('.volume-slider')?.value || 80;
    currentSong.volume = currentVolume / 100;
    currentSong.play();

    currentSong.play().catch(error => { console.error('Playback failed:', error); });
}

function playTrack(url) {
    stopMusic();

    currentSong = new Audio(url);

    // Grab the current slider position and apply log math
    const slider = document.querySelector('.volume-slider');
    if (slider) {
        const sliderVal = parseFloat(slider.value);
        currentSong.volume = (Math.pow(10, sliderVal / 100) - 1) / 9;
    }

    currentSong.play().catch(err => console.error("Playback blocked:", err));
}

function stopMusic() {
    if (currentSong) {
        currentSong.pause();
        currentSong.src = '';
        currentSong = null;
    }
}

window.addEventListener('load', () => {
    const volumeSlider = document.querySelector('.volume-slider');
    const volumeLabel = document.querySelector('.volume-label');

    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const sliderVal = parseFloat(e.target.value);

            // Logarithmic mapping: (10^(x/100) - 1) / (10 - 1)
            // This creates a smooth curve from 0.0 to 1.0
            const logVolume = (Math.pow(10, sliderVal / 100) - 1) / 9;

            if (currentSong) {
                currentSong.volume = logVolume;
            }

            if (volumeLabel) {
                volumeLabel.textContent = Math.round(sliderVal) + '%';
            }

            console.log(`Slider: ${sliderVal} | Perceived Volume: ${logVolume.toFixed(2)}`);
        });
    }
});

function handleSearchInput() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const searchBar = document.getElementById('searchBar');
    searchBar.addEventListener('search', (e) => {
        console.log(`User submitted search: ${searchBar.value}`);
    });
}



// Call the auto-loader when the script runs
loadExistingMusic();

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
*/