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
let currentSong = new Audio();
let currentTrack = null;
let dragSrcIndex = null;


function playTrack(url, allTracksInContext = []) {
    stopMusic();

    // 1. Update the Auto-Queue Context
    if (allTracksInContext.length > 0) {
        contextQueue = allTracksInContext;
    }

    // 2. Resolve Track Metadata across all sources cleanly
    let trackMetadata = null;
    if (contextQueue && contextQueue.length > 0) {
        trackMetadata = contextQueue.find(t => t.url === url);
    }
    if (!trackMetadata && userQueue && userQueue.length > 0) {
        trackMetadata = userQueue.find(t => t.url === url);
    }
    if (!trackMetadata && typeof audioFiles !== 'undefined') {
        trackMetadata = audioFiles.find(t => t.url === url);
    }

    // Assign metadata securely to keep the UI from displaying "Unknown Track"
    currentTrack = trackMetadata || { url: url, title: "Unknown Track", name: "Unknown Track" };

    // 3. Track Index Management
    if (contextQueue && contextQueue.length > 0) {
        const index = contextQueue.findIndex(track => track.url === url);
        if (index !== -1) {
            currentTrackIndex = index;
        }
    }

    // 4. Initialize Audio Engine
    // currentSong = new Audio(url);
    currentSong.src = url;

    // Volume Calculations
    const slider = document.querySelector('.volume-slider');
    if (slider) {
        const sliderVal = parseFloat(slider.value);
        currentSong.volume = (Math.pow(10, sliderVal / 100) - 1) / 9;
    }

    // Next Track Binding
    currentSong.onended = () => {
        playNext();
    };

    currentSong.play().catch(err => console.error("Playback blocked:", err));

    updateSongInfo(currentSong);

    // Refresh UI
    if (document.getElementById('queuePanel')?.classList.contains('open')) {
        openQueuePage();
    }
}

function playNext() {
    // 1: Manual User Queue has items remaining
    if (userQueue && userQueue.length > 0) {
        const nextTrack = userQueue.shift();
        playTrack(nextTrack.url);
    }
    // 2: Return to the background playlist context 
    // (Or progress forward if we are already in it)
    else if (contextQueue && contextQueue.length > 0) {
        
       //resolve the next track index based on current position in the context queue
       //caused by userQueue taking priority and potentially shifting us forward in the context list
        let targetIndex = currentTrackIndex === -1 ? 0 : currentTrackIndex + 1;

        // Ensure the target index actually exists within the bounds of the context list
        if (targetIndex < contextQueue.length) {
            currentTrackIndex = targetIndex;
            const nextTrack = contextQueue[currentTrackIndex];
            playTrack(nextTrack.url);
        } else {
            console.log("Context queue reached the end after user queue cleared.");
            stopMusic();
        }
    } 
    // Out of options entirely
    else {
        console.log("Queue finished. No tracks remaining in user or context queues.");
        stopMusic();
    }
}

function addToQueue(track) {
    userQueue.push(track);
    console.log(`Added ${track.title || track.name || 'Track'} to manual user queue`);

    const queuePanel = document.getElementById('queuePanel');
    if (queuePanel && queuePanel.classList.contains('open')) {
        openQueuePage();
    }
}

function stopMusic() {
    if (currentSong && !currentSong.paused) {
        currentSong.pause();
        // Remove currentSong = null; so the object stays alive for the visualizer
    }
}

function switchMusicState(btn) {
    if (currentSong) {
        if (currentSong.paused) {
            currentSong.play().catch(err => console.error("Playback blocked:", err));
            btn.innerHTML = '<span>⏸</span>';
        } else {
            currentSong.pause();
            btn.innerHTML = '<span>▶</span>';
        }
    }
}

const updateSongInfo = (currentSong) => {
    if (!currentSong || !currentSong.src) return;

    const browserSrc = decodeURIComponent(currentSong.src).toLowerCase();

    const track = audioFiles.find(t => {
        const libraryUrl = t.url.toLowerCase().trim();
        return browserSrc.endsWith(libraryUrl);
    });

    const trackTitleTrack = document.querySelector('#track-title .marquee-track');
    const artistNameTrack = document.querySelector('#artist-name .marquee-track');

    // Strict fallbacks to guarantee text is never completely empty strings
    const finalTitle = track?.title || currentTrack?.title || currentTrack?.name || 'Unknown Track';
    let finalArtist = track?.artist || currentTrack?.artist || 'Unknown Artist';

    // If for some reason finalArtist is a blank string of spaces, fix it
    if (!finalArtist.trim()) {
        finalArtist = 'Unknown Artist';
    }

    const handleMarquee = (trackElement, text) => {
        if (!trackElement) return;

        const spans = trackElement.querySelectorAll('span');
        if (spans.length < 2) return;

        // 1. Reset everything to calculate static width accurately
        trackElement.classList.remove('scroll-active');
        spans[0].style.animationDuration = '';
        spans[1].style.animationDuration = '';
        
        spans[0].textContent = text;
        spans[1].textContent = ''; // Keep the second one blank while measuring

        // Grab the bounding box layout safely
        const container = trackElement.closest('.now-playing'); 
        if (!container) return;
        
        // 2. Check if the text actually overflows
        if (spans[0].scrollWidth > container.clientWidth) {
            spans[1].textContent = text;

            // 3. Speed Calculation
            const pixelsPerSecond = 40; 
            const dynamicDuration = spans[0].scrollWidth / pixelsPerSecond;

            spans[0].style.animationDuration = `${dynamicDuration}s`;
            spans[1].style.animationDuration = `${dynamicDuration}s`;

            trackElement.classList.add('scroll-active');
        } else {
            // Keep it empty if it doesn't need to loop, which is fine as long as span[0] has content
            spans[1].textContent = ''; 
        }
    };

    // Run the handler with verified text strings
    if (track) {
        handleMarquee(trackTitleTrack, track.title || 'Unknown Track');
        handleMarquee(artistNameTrack, track.artist || 'Unknown Artist');
    } else {
        handleMarquee(trackTitleTrack, finalTitle);
        handleMarquee(artistNameTrack, finalArtist);
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

// Call the auto-loader when the script runs
loadExistingMusic();

function handleSearchInput() {
    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    const topNav = document.getElementById('topNav');
    const query = searchInput.value.trim();
    const searchQueryDisplay = document.getElementById('searchQuery');
    let searchResults = [];

    // If the search bar is currently focused, prepare to handle search submissions
    if (document.activeElement === searchInput) {

        // Attach a submit listener to the top navigation bar
        // Prevents page reload and triggers the search logic instead
        searchForm.addEventListener('submit', function (event) {
            event.preventDefault();

            // Only perform a search if the user typed something
            if (query.length > 0) {
                topNav.classList.add('search-active'); // Visually activate search mode
                searchQueryDisplay.textContent = "";   // Clear previous results

                // Loop through all audio tracks and check for matches
                audioFiles.forEach(track => {

                    // Case-insensitive matching against title, artist, or album
                    if (track.title.toLowerCase().match(query.toLowerCase()) ||
                        track.artist.toLowerCase().match(query.toLowerCase()) ||
                        track.album.toLowerCase().match(query.toLowerCase())) {
                        const trackData = JSON.stringify(track).replace(/"/g, '&quot;');

                        searchResults.push(track); // Store matched track
                        console.log('Match found:', track);

                        // Display the result in the search results area
                        // searchQueryDisplay.innerHTML += `${track.artist} - ${track.title}<br>`;
                        searchQueryDisplay.innerHTML += `<div class="search-item">
                                                            <span class="search-item-text" onclick="playTrack('${track.url}')">
                                                                ${track.artist} - ${track.title}
                                                            </span>
                                                            <button class="add-to-queue-btn" onclick="addToQueue(${trackData})">
                                                            +
                                                            </button>
                                                         </div>`;
                    } else {
                        console.log('No match:', track);
                    }
                });

            } else {
                // If the query is empty, exit search mode
                topNav.classList.remove('search-active');
            }
        });

    } else {
        // If the search bar is not focused, ensure search mode is disabled
        topNav.classList.remove('search-active');
    }
}

document.getElementById('searchOverlay').addEventListener('click', () => {
    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    const topNav = document.getElementById('topNav');
    searchInput.value = ''; // clear input
    topNav.classList.remove('search-active');
});

function showErrorPopup(message) {
    alert(`Error: ${message}`);
}

function openQueuePage() {
    // Create or retrieve the right-side queue panel
    let queuePanel = document.getElementById('queuePanel');

    if (!queuePanel) {
        queuePanel = document.createElement('div');
        queuePanel.id = 'queuePanel';
        queuePanel.className = 'queue-panel';
        document.body.appendChild(queuePanel);
    }

    // Build queue HTML
    let queueHTML = '<div class="queue-header"><h2>Queue</h2><button class="close-queue-btn" onclick="closeQueuePage()">×</button></div>';
    queueHTML += '<div class="queue-content">';

    // Display current song title using track metadata when available
    if (currentTrack) {
        queueHTML += '<div class="queue-item current"><div class="queue-title">Now Playing:</div><div class="queue-song">' + (currentTrack.title || currentTrack.name || 'Unknown Track') + '</div></div>';
    } else if (currentSong) {
        queueHTML += '<div class="queue-item current"><div class="queue-title">Now Playing:</div><div class="queue-song">Currently Playing</div></div>';
    }

    

    // Display queued items
    if (userQueue && userQueue.length > 0) {
        queueHTML += '<div class="queue-title">Upcoming:</div>';
        userQueue.forEach((song, index) => {
            queueHTML += '<div class="queue-item draggable" draggable="true" data-index="' + index + '">';
            queueHTML += '<span class="queue-number">' + (index + 1) + '.</span>';
            queueHTML += '<span class="queue-song-name">' + (song.title || song.name || 'Unknown Track') + '</span>';
            queueHTML += '<button class="remove-from-queue-btn" data-index="' + index + '">Remove</button>';
            queueHTML += '</div>';
        });
    }

    // Display all tracks in current auto-queue context (Filtered)
    if (contextQueue && contextQueue.length > 0) {
        let hasContextItems = false;
        let contextHTML = '';
        const currentContextIndexRaw = currentTrack ? contextQueue.findIndex(song => song.url === currentTrack.url) : -1;
        const currentContextIndex = currentContextIndexRaw >= 0 ? currentContextIndexRaw : currentTrackIndex;

        contextQueue.forEach((song, index) => {
            // 1. Skip any context tracks that appear before or are the current playing track,
            //    including previously consumed context tracks when the current song is from the manual queue.
            if (currentContextIndex >= 0 && index <= currentContextIndex) {
                return;
            }

            // 2. Check if this context song is already sitting in the userQueue
            const isInUserQueue = userQueue && userQueue.some(userSong => userSong.url === song.url);
            
            if (!isInUserQueue) {
                hasContextItems = true;
                contextHTML += '<div class="queue-item">';
                contextHTML += '<span class="queue-number">' + (index + 1) + '.</span>';
                contextHTML += '<span class="queue-song-name">' + (song.title || song.name || 'Unknown Track') + '</span>';
                contextHTML += '</div>';
            }
        });

        // Only append the section if there are actually remaining tracks to show
        if (hasContextItems) {
            queueHTML += '<div class="queue-title">All Tracks In Context:</div>';
            queueHTML += contextHTML;
        } else if (!userQueue || userQueue.length === 0) {
            queueHTML += '<div class="queue-empty">Queue is empty</div>';
        }

    } else if (!userQueue || userQueue.length === 0) {
        queueHTML += '<div class="queue-empty">Queue is empty</div>';
    }

    queueHTML += '</div>';
    queuePanel.innerHTML = queueHTML;
    queuePanel.classList.add('open');


    // Remove from queue handlers
    queuePanel.querySelectorAll('.remove-from-queue-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index, 10);
            if (!isNaN(index)) {
                userQueue.splice(index, 1);
                openQueuePage(); // Refresh the queue display
            }
        });
    });

    // Drag and drop reorder handlers
    queuePanel.querySelectorAll('.queue-item.draggable').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            dragSrcIndex = parseInt(item.dataset.index, 10);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', dragSrcIndex.toString());
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            dragSrcIndex = null;
            queuePanel.querySelectorAll('.queue-item').forEach(i => i.classList.remove('drag-over'));
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            item.classList.add('drag-over');
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            const destIndex = parseInt(item.dataset.index, 10);
            const sourceIndex = dragSrcIndex !== null ? dragSrcIndex : parseInt(e.dataTransfer.getData('text/plain'), 10);

            if (!isNaN(sourceIndex) && !isNaN(destIndex) && sourceIndex !== destIndex) {
                const [movedItem] = userQueue.splice(sourceIndex, 1);
                userQueue.splice(destIndex, 0, movedItem);
                openQueuePage();
            }
        });
    });
}

function closeQueuePage() {
    console.log("Closing queue panel");
    const queuePanel = document.getElementById('queuePanel');
    if (queuePanel) {
        queuePanel.classList.remove('open');
    }
}

function openSongFocus() {
    const songFocusBtn = document.getElementById('songFocusBtn');
    const songFocusPage = document.getElementById('songFocusPage');
    songFocusBtn.addEventListener('click', () => {
        songFocusBtn.classList.toggle('active');
        if (songFocusBtn.classList.contains('active')) {
            songFocusPage.classList.toggle('active');
        }
    });
}

// const canvas = document.getElementById('visualizer');
// const playBtn = document.getElementById('playPauseBtn');

// // Declare wave globally, but don't build it until the user clicks
// let wave; 

// playBtn.addEventListener('click', () => {
    
//     // Set the canvas size dynamically upon clicking
//     if (canvas.width !== window.innerWidth) {
//         canvas.width = window.innerWidth;
//         canvas.height = window.innerHeight;
//     }

//     // Initialize Wave using your existing global 'currentSong' variable
//     if (!wave) {
//         wave = new Wave(currentSong, canvas);
        
//         wave.addAnimation(new wave.animations.Circle({
//             count: 80,
//             color: '#00ffcc',
//             radius: 85,
//             lineWidth: 4,
//             gap: 2
//         }));
//     }
// });

let audioElement = document.querySelector("#audioElement");
let canvasElement = document.querySelector("#visualizer");
let wave = new Wave(audioElement, canvasElement);

// Simple example: add an animation
wave.addAnimation(new wave.animations.Wave());

// Intermediate example: add an animation with options
wave.addAnimation(new wave.animations.Wave({
    lineWidth: 10,
    lineColor: "red",
    count: 20
}));

// Expert example: add multiple animations with options
wave.addAnimation(new wave.animations.Square({
    count: 50,
    diamater: 300
}));

wave.addAnimation(new wave.animations.Glob({
    fillColor: {gradient: ["red","blue","green"], rotate: 45},
    lineWidth: 10,
    lineColor: "#fff"
}));

// The animations will start playing when the provided audio element is played

// 'wave.animations' is an object with all possible animations on it.

// Each animation is a class, so you have to new-up each animation when passed to 'addAnimation'


