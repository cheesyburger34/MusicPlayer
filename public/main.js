// Select all navigation triggers and their target content sections
const navItems = document.querySelectorAll('.nav-item');
const pageContents = document.querySelectorAll('.page-content');

// Container for the stacking effect and the vertical spacing constant
const navContainer = document.querySelector('.nav-items');
const stackOffset = 20;

let audioFiles = [];
let lastVisitedPageId = null;

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
    if (currentPage) {
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


/**
 * 1. THE AUTO-LOADER
 * This runs as soon as the page opens to fetch existing music from your folder.
 */
async function loadExistingMusic() {
    try {
        const response = await fetch('http://localhost:3000/list-music');
        if (response.ok) {
            const data = await response.json();
            if (data.tracks) {
                audioFiles = data.tracks;
                displayMusic(data.tracks);
            }
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
                // SPREAD old tracks and combine them cleanly instead of raw overwriting 
                // to prevent rapid UI rewrites from stomping on each other.
                if (typeof audioFiles !== 'undefined') {
                    audioFiles = [...audioFiles, ...data.tracks];
                    displayMusic(audioFiles); // Re-display the entire updated list
                } else {
                    displayMusic(data.tracks);
                }

                console.log('Upload complete for batch!');
            }
        } catch (err) {
            console.error('Upload transaction failed:', err);
            alert('Upload failed. Please check your network connection or backend logs.');
        } finally {
            // Memory cleanup: break references to the hidden DOM node
            fileInput.remove();
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
            <button class="back-button" onclick="goBackTopage()">Back</button>
            <div class="album-header">
                <img src="${firstTrack.cover}" class="album-page-cover" alt="${artistName}">
                <div class="artist-header-info">
                    <h4>${artistName}</h4>
                    <span class="track-count">${tracks.length} Tracks</span>
                </div>
            </div>
        </header>
        <div class="track-list-container">
    ${tracks.map((track, index) => {
        const trackData = JSON.stringify(track).replace(/"/g, '&quot;');
        const listData = JSON.stringify(tracks).replace(/"/g, '&quot;');

        return `
            <div class="track-item">
                <div class="track-clickable-area" onclick="playTrack('${track.url}', ${listData})">
                    <span class="track-number">${index + 1}</span>
                    <div class="track-details">
                        <strong>${track.title}</strong>
                        <p class="track-subtext">${track.album || ''}</p>
                    </div>
                </div>
                <button class="add-to-queue-btn" onclick="addToQueue(${trackData})">
                    +
                </button>
            </div>
        `;
    }).join('')}
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
            <button class="back-button" onclick="goBackTopage()">Back</button>
            <div class="album-header">
                <img src="${firstTrack.cover}" class="album-page-cover" alt="${albumName}">
                <div class="artist-header-info">
                    <p class="artist-label">${firstTrack.artist}</p>
                    <h4>${albumName}</h4>
                </div>
            </div>
        </header>
        <div class="track-list-container">
 ${tracks.map((track, index) => {
        const trackData = JSON.stringify(track).replace(/"/g, '&quot;');
        const listData = JSON.stringify(tracks).replace(/"/g, '&quot;');

        return `
            <div class="track-item">
                <div class="track-clickable-area" onclick="playTrack('${track.url}', ${listData})">
                    <span class="track-number">${index + 1}</span>
                    <div class="track-details">
                        <strong>${track.title}</strong>
                    </div>
                </div>
                <button class="add-to-queue-btn" onclick="addToQueue(${trackData})">
                    +
                </button>
            </div>
        `;
    }).join('')}
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




function goBackTopage() {
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


// Global State
let userQueue = [];
let contextQueue = [];
let currentTrackIndex = -1;
let currentSong = null;

function playTrack(url, allTracksInContext = []) {
    stopMusic();

    // 1. Update the Auto-Queue Context
    // If tracks are provided save them so the player knows whats next
    if (allTracksInContext.length > 0) {
        contextQueue = allTracksInContext;
        currentTrackIndex = contextQueue.findIndex(t => t.url === url);
    }

    currentSong = new Audio(url);

    // 2. Apply your existing Volume Math
    const slider = document.querySelector('.volume-slider');
    if (slider) {
        const sliderVal = parseFloat(slider.value);
        currentSong.volume = (Math.pow(10, sliderVal / 100) - 1) / 9;
    }

    // 3. Next song Trigger
    currentSong.onended = () => {
        playNext();
    };

    currentSong.play().catch(err => console.error("Playback blocked:", err));

    updateSongInfo(currentSong);
}

function playNext() {
    if (userQueue.length > 0) {
        // Priority 1: Manual Queue (Takes from the top)
        const nextTrack = userQueue.shift();
        playTrack(nextTrack.url);
        // fix this ass it can break unsure why 
    } else if (currentTrackIndex !== -1 && currentTrackIndex < contextQueue.length - 1) {
        // Priority 2: Auto-Queue (Next song in album/artist list)
        currentTrackIndex++;
        const nextTrack = contextQueue[currentTrackIndex];
        playTrack(nextTrack.url);
        //never allow the queue to stop allways find music to pla
    } else {
        console.log("Queue finished.");
        stopMusic();
    }
}

/*change so that it only goes to the top of the auto quuee not manual ie have 2
queues one built automaticaly so music doesnt stop playing unless the user stops music
and another built by the user so that they can add what ever songs they want to listen
to in order
*/
function addToQueue(track) {
    // Adds to the very top as requested
    userQueue.unshift(track);
    console.log(`Added ${track.title} to top of queue`);
}

function stopMusic() {
    if (currentSong) {
        currentSong.pause();
        currentSong.src = '';
        currentSong.onended = null; // Prevent playNext() from firing
        currentSong = null;
    }

    // Reset context so "Play Next" doesn't have a reference point
    contextQueue = [];
    currentTrackIndex = -1;
}

const updateSongInfo = (currentSong) => {
    if (!currentSong || !currentSong.src) return;

    const browserSrc = decodeURIComponent(currentSong.src).toLowerCase();

    const track = audioFiles.find(t => {
        const libraryUrl = t.url.toLowerCase().trim();

        console.log("Comparing:", browserSrc, "with", libraryUrl);
        return browserSrc.endsWith(libraryUrl);
    });

    console.log("Browser Source:", browserSrc);
    console.log("Found Track Object:", track);

    const trackTitle = document.getElementById('track-title');
    const artistName = document.getElementById('artist-name');

    if (track) {
        if (trackTitle) trackTitle.textContent = track.title;
        if (artistName) artistName.textContent = track.artist;
    } else {
        if (trackTitle) trackTitle.textContent = 'Unknown Track';
        if (artistName) artistName.textContent = 'Unknown Artist';
    }
};


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

document.getElementById('searchOverlay').addEventListener('click', () => {
    const searchInput = document.getElementById('searchInput');
    const topNav = document.getElementById('topNav');
    searchInput.value = ''; // clear input
    topNav.classList.remove('search-active');
});

function showErrorPopup(message) {
    alert(`Error: ${message}`);
}

function openQueuePage() {
/*
Allow the user to open and see their queued item followed by the auto
 queued items and aloow the user to move tiems in any way they like 
 consider opening the queeu as a right side panel not a main page to aloow t
 he user to contiue to add new music to the queue and see and edit the queeu


*/
}
