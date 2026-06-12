// Select all navigation triggers and their target content sections
const navItems = document.querySelectorAll('.nav-item');
const pageContents = document.querySelectorAll('.page-content');

// Container for the stacking effect and the vertical spacing constant
const navContainer = document.querySelector('.nav-items');
const stackOffset = 20;

let audioFiles = [];
let lastVisitedPageId = null;
const contentPageTransitionDuration = 500;
const contentPageExitTimers = new WeakMap();
let pendingContentPageEntranceTimer = null;
let pendingContentPage = null;

/**
 * Initializes or resets the visual stack layout
 */
function resetNavigationStackLayout() {
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
function activateNavigationItem(clickedItem) {
    const items = Array.from(navContainer.querySelectorAll('.nav-item'));
    const currentPage = document.querySelector('.page-content.active, .page-content.exit');

    // Reset active states for all navigation items and content pages
    items.forEach(item => item.classList.remove('active'));

    // Activate the clicked item and transition to its linked content page.
    clickedItem.classList.add('active');
    const pageId = clickedItem.dataset.page;
    const targetPage = document.getElementById(pageId);

    if (pageId === 'statsPage') {
        if (typeof updateStatsPage === 'function') {
            updateStatsPage();
        }
        if (typeof renderStatsLeaderboards === 'function') {
            renderStatsLeaderboards();
        }
    }

    if (currentPage && currentPage !== targetPage) {
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

    if (targetPage) transitionToContentPage(targetPage, currentPage);
}

// Attach click listeners to all navigation items
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', event => {
        event.preventDefault();
        activateNavigationItem(event.currentTarget);
    });
});

// Refresh stack calculations on page load
window.addEventListener('load', () => {
    resetNavigationStackLayout();
    // Set default active item to library
    const libraryItem = document.querySelector('[data-page="library"]');
    if (libraryItem) {
        activateNavigationItem(libraryItem);
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
async function loadMusicLibrary() {
    try {
        const response = await fetch('http://localhost:3000/list-music');
        if (response.ok) {
            const data = await response.json();
            if (data.tracks) {
                audioFiles = data.tracks;
                renderMusicLibrary(data.tracks);
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
async function uploadMusicFiles() {
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
                    renderMusicLibrary(audioFiles); // Re-display the entire updated list
                } else {
                    renderMusicLibrary(data.tracks);
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

function renderMusicLibrary(tracks) {
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
        card.onclick = () => showAlbumDetails(albumName, albumTracks);
        libraryGrid.appendChild(card);
    }

    // Create Artist Sections
    for (const artist in artistMap) {
        const artistSection = document.createElement('div');
        artistSection.className = 'artist-group';

        const artistTitle = document.createElement('h2');
        artistTitle.className = 'artist-name artist-title-clickable';
        artistTitle.textContent = artist;
        artistTitle.onclick = () => showArtistDetails(artist, artistMap[artist]);

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
function showArtistDetails(artistName, tracks) {
    const nextPage = document.getElementById('albumPage');
    if (!nextPage) return;

    const firstTrack = tracks[0] || { cover: '', album: '' };

    nextPage.innerHTML = `
        <header class="content-header">
            <button class="back-button" onclick="returnToPreviousPage()">Back</button>
            <span class="content-kicker">Artist collection</span>
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
                <button class="add-to-queue-btn" onclick="addTrackToQueue(${trackData})">
                    +
                </button>
            </div>
        `;
    }).join('')}
</div>
`;

    transitionToContentPage(nextPage);
}

function showAlbumDetails(albumName, tracks) {
    const nextPage = document.getElementById('albumPage');
    if (!nextPage) return;

    const firstTrack = tracks[0];
    nextPage.innerHTML = `
        <header class="content-header">
            <button class="back-button" onclick="returnToPreviousPage()">Back</button>
            <span class="content-kicker">Album playback</span>
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
                        <strong class="track-title">${track.title}</strong>
                    </div>
                </div>
                <button class="add-to-queue-btn" onclick="addTrackToQueue(${trackData})">
                    +
                </button>
            </div>
        `;
    }).join('')}
</div>
`;

    transitionToContentPage(nextPage);
}

// Reusable transition logic to keep functions clean
function transitionToContentPage(nextPage, currentPage = document.querySelector('.page-content.active, .page-content.exit')) {
    if (!nextPage || currentPage === nextPage) return;

    clearTimeout(pendingContentPageEntranceTimer);
    if (pendingContentPage && pendingContentPage !== nextPage) {
        pendingContentPage.classList.remove('active');
        pendingContentPage.style.display = 'none';
    }
    pendingContentPage = nextPage;

    const enterNextPage = () => {
        clearTimeout(contentPageExitTimers.get(nextPage));
        contentPageExitTimers.delete(nextPage);
        nextPage.style.display = 'block';
        nextPage.classList.remove('exit');
        requestAnimationFrame(() => nextPage.classList.add('active'));
        pendingContentPage = null;
        pendingContentPageEntranceTimer = null;
    };

    if (currentPage) {
        currentPage.classList.remove('active');
        currentPage.classList.add('exit');
        const exitTimer = setTimeout(() => {
            currentPage.classList.remove('exit');
            currentPage.style.display = 'none';
            contentPageExitTimers.delete(currentPage);
        }, contentPageTransitionDuration);
        contentPageExitTimers.set(currentPage, exitTimer);

        // Complete the outgoing cycle before bringing the next page in.
        pendingContentPageEntranceTimer = setTimeout(enterNextPage, contentPageTransitionDuration);
        return;
    }

    enterNextPage();
}




function returnToPreviousPage() {
    const targetItem = document.querySelector(`[data-page="${lastVisitedPageId}"]`);
    if (targetItem) {
        activateNavigationItem(targetItem);
    } else {
        const libraryItem = document.querySelector('[data-page="library"]');
        if (libraryItem) activateNavigationItem(libraryItem);
    }
}

/**
 * 4. THE PLAYER
 */


// Global State
let userQueue = [];
let contextQueue = [];
let currentTrackIndex = -1;
let currentSong = document.getElementById('main-audio-player');
// currentTrack will hold the metadata of the currently playing track for easy access across the UI
let currentTrack = null;
let dragSrcIndex = null;
// const visualizerType = document.getElementById('visualizerSlider')?.value || '1';

function playTrack(url, allTracksInContext = []) {
    pausePlayback();

    // Preserve the album or artist list so playback can continue after the manual queue empties.
    if (allTracksInContext.length > 0) {
        contextQueue = allTracksInContext;
    }

    // Resolve metadata in playback-priority order before falling back to the full library.
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
    updateFocusAlbumDisplay(visualizerType);

    // Keep the context index aligned when playback begins from an album or artist page.
    if (contextQueue && contextQueue.length > 0) {
        const index = contextQueue.findIndex(track => track.url === url);
        if (index !== -1) {
            currentTrackIndex = index;
        }
    }

    // 4. Initialize Audio Engine
    // currentSong = new Audio(url);
    currentSong.src = url;
    currentSong.load(); // Forces the browser to fetch the new source cleanly

    // Volume Calculations
    const slider = document.querySelector('.volume-slider');
    if (slider) {
        const sliderVal = parseFloat(slider.value);
        // Human hearing perceives volume logarithmically, so we apply a curve to the slider input
        currentSong.volume = (Math.pow(10, sliderVal / 100) - 1) / 9;
    }

    // Next Track Binding
    currentSong.onended = async () => {
        if (currentSong.src) {
            // Extract just the absolute path (e.g., /musicLibrary/rock/song.mp3)
            let trackUrl = new URL(currentSong.src).pathname;

            // Decode things like %20 back into regular spaces so it matches the DB
            trackUrl = decodeURIComponent(trackUrl);

            fetch('http://localhost:3000/api/stats/listen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: trackUrl })
            })
                .catch(err => console.error('Stats error:', err));
        }
        playNextTrack();
    };

    currentSong.play()
        .then(() => {
            const playPauseBtn = document.getElementById('playPauseBtn');
            if (playPauseBtn) playPauseBtn.innerHTML = '<span>⏸</span>';
        })
        .catch(err => {
            console.error("Playback blocked:", err);
            const playPauseBtn = document.getElementById('playPauseBtn');
            if (playPauseBtn) playPauseBtn.innerHTML = '<span>▶</span>';
        });

    updateNowPlayingDisplay(currentSong);
    updateFocusAlbumDisplay(visualizerType);

    // Refresh UI
    if (document.getElementById('queuePanel')?.classList.contains('open')) {
        renderAndOpenQueuePanel();
    }

    initializeVisualizer();
}

function playNextTrack() {
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
            pausePlayback();
        }
    }
    // Out of options entirely
    else {
        console.log("Queue finished. No tracks remaining in user or context queues.");
        pausePlayback();
    }
}

function addTrackToQueue(track) {
    userQueue.push(track);
    console.log(`Added ${track.title || track.name || 'Track'} to manual user queue`);

    const queuePanel = document.getElementById('queuePanel');
    if (queuePanel && queuePanel.classList.contains('open')) {
        renderAndOpenQueuePanel();
    }
}

function pausePlayback() {
    if (currentSong && !currentSong.paused) {
        currentSong.pause();
        // Remove currentSong = null; so the object stays alive for the visualizer
    }
}

function togglePlayback(btn) {
    if (!btn) {
        btn = document.getElementById('playPauseBtn');
    }

    if (!currentSong) return;

    if (userQueue && userQueue.length > 0) {
        console.log("Manual queue has pending tracks. Playing next in queue.");
        playNextTrack();
        return;
    }

    if (currentSong.paused) {
        currentSong.play()
            .then(() => {
                if (btn) btn.innerHTML = '<span>⏸</span>';
            })
            .catch(err => {
                console.error("Playback blocked:", err);
                if (btn) btn.innerHTML = '<span>▶</span>';
            });
    } else {
        currentSong.pause();
        if (btn) btn.innerHTML = '<span>▶</span>';
    }
}

const updateNowPlayingDisplay = (currentSong) => {
    if (!currentSong || !currentSong.src) return;

    const browserSrc = decodeURIComponent(currentSong.src).toLowerCase();

    const track = audioFiles.find(t => {
        const libraryUrl = t.url.toLowerCase().trim();
        return browserSrc.endsWith(libraryUrl);
    });

    const trackTitleTrack = document.querySelector('#track-title .marquee-track');
    const artistNameTrack = document.querySelector('#artist-name .marquee-track');
    const trackTitleTrackFocus = document.querySelector('#track-title-focus .marquee-track');
    const artistNameTrackFocus = document.querySelector('#artist-name-focus .marquee-track');

    // Strict fallbacks to guarantee text is never completely empty strings
    const finalTitle = track?.title || currentTrack?.title || currentTrack?.name || 'Unknown Track';
    let finalArtist = track?.artist || currentTrack?.artist || 'Unknown Artist';

    // If for some reason finalArtist is a blank string of spaces, fix it
    if (!finalArtist.trim()) {
        finalArtist = 'Unknown Artist';
    }

    const updateMarqueeText = (trackElement, text) => {
        if (!trackElement) return;

        const spans = trackElement.querySelectorAll('span');
        if (spans.length < 2) return;

        // Measure static text first; duplicating it before measuring would falsely report overflow.
        trackElement.classList.remove('scroll-active');
        spans[0].style.animationDuration = '';
        spans[1].style.animationDuration = '';
        spans[0].textContent = text;
        spans[1].textContent = ''; // Keep the second one blank while measuring

        // Grab the bounding box layout safely
        const container = trackElement.closest('.now-playing');
        if (!container) return;

        // Duplicate overflowing text so the CSS animation loops without a visible gap.
        if (spans[0].scrollWidth > container.clientWidth) {
            spans[1].textContent = text;

            // Keep marquee movement at a consistent visual speed regardless of text length.
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

    // Run the handler with verified text strings on both player instances
    if (track) {
        updateMarqueeText(trackTitleTrack, track.title || 'Unknown Track');
        updateMarqueeText(artistNameTrack, track.artist || 'Unknown Artist');
        updateMarqueeText(trackTitleTrackFocus, track.title || 'Unknown Track');
        updateMarqueeText(artistNameTrackFocus, track.artist || 'Unknown Artist');
    } else {
        updateMarqueeText(trackTitleTrack, finalTitle);
        updateMarqueeText(artistNameTrack, finalArtist);
        updateMarqueeText(trackTitleTrackFocus, finalTitle);
        updateMarqueeText(artistNameTrackFocus, finalArtist);
    }
};


window.addEventListener('load', () => {
    const volumeSliders = document.querySelectorAll('.volume-slider');
    const volumeLabels = document.querySelectorAll('.volume-label');
    const albumArt = document.querySelector('.album-art');

    volumeSliders.forEach(volumeSlider => {
        volumeSlider.addEventListener('input', (e) => {
            const sliderVal = parseFloat(e.target.value);

            // Logarithmic mapping: (10^(x/100) - 1) / (10 - 1)
            // This creates a smooth curve from 0.0 to 1.0
            const logVolume = (Math.pow(10, sliderVal / 100) - 1) / 9;

            if (currentSong) {
                currentSong.volume = logVolume;
            }

            volumeSliders.forEach(slider => {
                slider.value = sliderVal;
            });
            volumeLabels.forEach(volumeLabel => {
                volumeLabel.textContent = Math.round(sliderVal) + '%';
            });

            console.log(`Slider: ${sliderVal} | Perceived Volume: ${logVolume.toFixed(2)}`);
        });
    });

    if (albumArt) {
        let albumArtClickTimer = null;
        const doubleClickDelay = 280;

        albumArt.addEventListener('click', () => {
            if (albumArtClickTimer) {
                clearTimeout(albumArtClickTimer);
                albumArtClickTimer = null;
                playNextTrack();
                return;
            }

            albumArtClickTimer = setTimeout(() => {
                togglePlayback();
                albumArtClickTimer = null;
            }, doubleClickDelay);
        });
    }
});

// Call the auto-loader when the script runs
loadMusicLibrary();


/*---------------------------------------------
    5. THE SEARCHER
---------------------------------------------*/
function handleLibrarySearchInput() {
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
                                                            <button class="add-to-queue-btn" onclick="addTrackToQueue(${trackData})">
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

function showErrorAlert(message) {
    alert(`Error: ${message}`);
}

/*---------------------------------------------
    6. THE QUEUE
---------------------------------------------*/
function renderAndOpenQueuePanel() {


    // Create or retrieve the right-side queue panel
    let queuePanel = document.getElementById('queuePanel');

    if (!queuePanel) {
        queuePanel = document.createElement('div');
        queuePanel.id = 'queuePanel';
        queuePanel.className = 'queue-panel';
        document.body.appendChild(queuePanel);
    }

    // Build queue HTML
    let queueHTML = '<div class="queue-header"><h2>Queue</h2><button class="close-queue-btn" onclick="closeQueuePanel()">×</button></div>';
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
        // A manually queued song may not exist in contextQueue, so retain currentTrackIndex as fallback.
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
                renderAndOpenQueuePanel(); // Refresh the queue display
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
                renderAndOpenQueuePanel();
            }
        });
    });
}

function closeQueuePanel() {
    console.log("Closing queue panel");
    const queuePanel = document.getElementById('queuePanel');
    if (queuePanel) {
        queuePanel.classList.remove('open');
    }
}

let songFocusTransitionTimer = null;

function toggleSongFocusPage() {
    const songFocusBtn = document.getElementById('songFocusBtn');
    const songFocusPage = document.getElementById('songFocusPage');

    if (!songFocusBtn || !songFocusPage) return;

    clearTimeout(songFocusTransitionTimer);
    const isOpening = !document.body.classList.contains('song-focus-staging');
    songFocusBtn.classList.toggle('active', isOpening);

    if (isOpening) {
        // Stage one: remove the surrounding app chrome and let content fill its space.
        document.body.classList.add('song-focus-staging');
        setVisualizerMode(visualizerType);

        // Stage two: fade the focus page forward after the layout transition completes.
        songFocusTransitionTimer = setTimeout(() => {
            songFocusPage.classList.add('active');
            document.body.classList.add('song-focus-active');
        }, 500);
    } else {
        // Reverse stage two first, revealing the expanded main content behind focus.
        songFocusPage.classList.remove('active');
        document.body.classList.remove('song-focus-active');

        // Restore navigation only after the focus page finishes fading away.
        songFocusTransitionTimer = setTimeout(() => {
            document.body.classList.remove('song-focus-staging');
            songFocusPage.classList.remove(
                'visualizer-mode-1', 'visualizer-mode-2', 'visualizer-mode-3',
                'visualizer-mode-4', 'visualizer-mode-5', 'visualizer-mode-6',
                'visualizer-mode-7', 'visualizer-mode-8', 'visualizer-mode-9'
            );
            songFocusPage.style.background = '';
        }, 500);
    }
}

function toggleControlVisibilityMenu() {
    const picker = document.querySelector('.control-visibility-picker');
    const button = picker?.querySelector('.control-visibility-btn');
    if (!picker || !button) return;

    const isOpen = picker.classList.toggle('open');
    button.setAttribute('aria-expanded', String(isOpen));
}

document.querySelectorAll('[data-control-target]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        const control = document.getElementById(checkbox.dataset.controlTarget);
        control?.classList.toggle('song-focus-control-hidden', !checkbox.checked);
    });
});

document.addEventListener('click', event => {
    const picker = document.querySelector('.control-visibility-picker');
    if (!picker || picker.contains(event.target)) return;

    picker.classList.remove('open');
    picker.querySelector('.control-visibility-btn')?.setAttribute('aria-expanded', 'false');
});

// Declare the visualizer instance globally
let waveInstance = null;
let waveAnalyser = null;
let visualizerType = '1';
let visualizerResizeTimer = null;
let visualizerPixelRatio = 1;
let visualizerGain = 1;
let visualizerScale = 1;
const maxVisualizerPixelRatio = 2;

// SVG text is measured in the 220x220 viewBox, not CSS pixels.
const albumTextMinFontSize = 8;
const albumTextMaxFontSize = 16;
const albumTextMaxArcWidth = 245;

function configureWaveAnalyser() {
    // Wave exposes no public analyser getter, so all private-field access stays in one helper.
    const analyser = getWaveAnalyserNode();
    if (!analyser) return;

    analyser.smoothingTimeConstant = 0.7;
    analyser.fftSize = 2048;
    analyser.minDecibels = -80;
    analyser.maxDecibels = -5;

    if (!analyser.highDensityOutputEnabled) {
        const readFrequencyData = analyser.getByteFrequencyData.bind(analyser);
        analyser.getByteFrequencyData = frequencyData => {
            readFrequencyData(frequencyData);

            // Wave treats analyser values as pixels; compensate when the backing canvas is downscaled.
            for (let index = 0; index < frequencyData.length; index++) {
                frequencyData[index] = Math.min(
                    255,
                    frequencyData[index] * visualizerPixelRatio * visualizerGain
                );
            }
        };
        analyser.highDensityOutputEnabled = true;
    }
}

function fitAlbumTextToArc(textPath) {
    if (!textPath || !textPath.textContent) return;

    // Binary search finds the largest fitting size without stepping through every fraction.
    let low = albumTextMinFontSize;
    let high = albumTextMaxFontSize;

    while (high - low > 0.25) {
        const candidate = (low + high) / 2;
        textPath.style.fontSize = `${candidate}px`;

        if (textPath.getComputedTextLength() <= albumTextMaxArcWidth) {
            low = candidate;
        } else {
            high = candidate;
        }
    }

    textPath.style.fontSize = `${low.toFixed(2)}px`;
}

function fitAlbumTextLabels() {
    fitAlbumTextToArc(document.getElementById('albumTitleText'));
    fitAlbumTextToArc(document.getElementById('albumArtistText'));
}

function updateFocusAlbumDisplay(modeIndex) {
    const albumArt = document.querySelector('.album-art');
    const albumTitleText = document.getElementById('albumTitleText');
    const albumArtistText = document.getElementById('albumArtistText');

    if (!albumArt) return;

    albumArt.classList.remove('hidden');
    const title = (currentTrack && currentTrack.title) ? currentTrack.title : 'Unknown Track';
    const artist = (currentTrack && currentTrack.artist) ? currentTrack.artist : 'Unknown Artist';

    if (currentTrack && currentTrack.cover) {
        albumArt.style.backgroundImage = `url('${currentTrack.cover}')`;
    } else {
        albumArt.style.backgroundImage = 'linear-gradient(135deg, rgba(107, 74, 255, 0.8), rgba(255, 124, 201, 0.6))';
    }

    if (albumTitleText) {
        albumTitleText.textContent = title;
    }
    if (albumArtistText) {
        albumArtistText.textContent = artist;
    }

    fitAlbumTextLabels();
}

function getVisualizerDisplaySize(canvasElement) {
    const bounds = canvasElement.getBoundingClientRect();
    return {
        width: Math.round(bounds.width || window.innerWidth),
        height: Math.round(bounds.height || window.innerHeight)
    };
}

function resizeVisualizerCanvas() {
    const canvasElement = document.querySelector("#visualizer");
    if (!canvasElement) return;

    const { width, height } = getVisualizerDisplaySize(canvasElement);
    visualizerPixelRatio = Math.min(window.devicePixelRatio || 1, maxVisualizerPixelRatio);
    canvasElement.width = Math.round(width * visualizerPixelRatio);
    canvasElement.height = Math.round(height * visualizerPixelRatio);

    if (waveInstance && typeof waveInstance.resize === 'function') {
        waveInstance.resize();
    }
}

window.addEventListener('resize', () => {
    if (visualizerResizeTimer) {
        clearTimeout(visualizerResizeTimer);
    }
    visualizerResizeTimer = setTimeout(() => {
        resizeVisualizerCanvas();
    }, 120);
});

function initializeVisualizer() {
    const audioElement = document.querySelector("#main-audio-player");
    const canvasElement = document.querySelector("#visualizer");
    // 1 = Arcs, 2 = Lines, 3 = Wave, 4 = Glob, 5 = Circles, 6 = Flower, 7 = Shine, 8 = Square, 9 = Turntable

    // NEW: Let's log exactly what the script sees
    console.log("1. Audio Element found?", !!audioElement);
    console.log("2. Canvas Element found?", !!canvasElement);
    console.log("3. Wave Library loaded?", typeof Wave !== 'undefined');

    if (!audioElement || !canvasElement || typeof Wave === 'undefined') {
        console.error("Visualizer aborted. Check the logs above to see what is missing.");
        return;
    }

    // FIX 1: Bypass browser security blocks for visualizers
    audioElement.crossOrigin = "anonymous";

    // FIX 2: Initialize Wave only once, passing the raw audio element
    if (!waveInstance) {
        // Adjust internal canvas resolution to match screen cleanly
        resizeVisualizerCanvas();

        // Wave creates its analyser only after browser playback permission is granted.
        waveInstance = new Wave(audioElement, canvasElement);
        waveAnalyser = waveInstance._audioAnalyser || null;

        // Capture Wave's private analyser after its one-time play listener creates it.
        audioElement.addEventListener("play", () => {
            waveAnalyser = waveInstance._audioAnalyser || waveAnalyser;
            configureWaveAnalyser();
        }, { once: true });

        // Set defaults now if the analyser is already available
        configureWaveAnalyser();

        // Arcs, Wave, Glob, Lines, Circles, Flower, Shine, Square, Turntable are all elements (Cubes is buggy so we're not gonna use it)
        setVisualizerMode(visualizerType);


        console.log("Multi-layered wave visualizer successfully attached.");
    }
}

const visSlider = document.getElementById('visSlider');
const visNameDisplay = document.getElementById('visNameDisplay');
let fadeTimeout;

const modeNames = {
    '1': 'Arcs', '2': 'Wave', '3': 'Glob',
    '4': 'Lines', '5': 'Circles', '6': 'Flower',
    '7': 'Shine', '8': 'Square', '9': 'Turntable'
};

const maxFrequencyBandDetail = {
    base: 16,
    lows: 16
};

function addVisualizerLayers(animationName, layers) {
    layers.forEach(layer => {
        // Narrow low-frequency bands need fewer shapes so adjacent shapes read distinct bins.
        const maxCount = maxFrequencyBandDetail[layer.frequencyBand];
        const normalizedLayer = maxCount && layer.count > maxCount
            ? { ...layer, count: maxCount }
            : { ...layer };

        // Keep geometry crisp at the backing resolution; visual scale is applied during drawing.
        ['lineWidth', 'diameter', 'gap', 'cubeHeight'].forEach(option => {
            if (typeof normalizedLayer[option] === 'number') {
                normalizedLayer[option] *= visualizerPixelRatio;
            }
        });

        // Uniform radial scaling would otherwise make strokes visually thicker.
        if (!['Lines', 'Wave'].includes(animationName) && normalizedLayer.lineWidth) {
            normalizedLayer.lineWidth /= visualizerScale;
        }

        if (!['Lines', 'Wave'].includes(animationName)) {
            // Counter-scale the starting radius so Scale changes element length, not its gap from the album.
            const defaultDiameter = document.querySelector('#visualizer').height / 3;
            const fixedVisibleDiameter = ['Square', 'Turntable'].includes(animationName)
                ? Math.max(normalizedLayer.diameter || defaultDiameter, 250 * visualizerPixelRatio)
                : normalizedLayer.diameter || defaultDiameter;

            normalizedLayer.diameter = fixedVisibleDiameter / visualizerScale;

            if (animationName === 'Turntable') {
                normalizedLayer.gap = (normalizedLayer.gap || 5 * visualizerPixelRatio) / visualizerScale;
            }
        }

        const animation = new waveInstance.animations[animationName](normalizedLayer);
        waveInstance.addAnimation(createScaledVisualizerAnimation(animationName, animation, normalizedLayer));
    });
}

function createScaledVisualizerAnimation(animationName, animation, layer) {
    return {
        draw(data, context) {
            if (visualizerScale === 1) {
                animation.draw(data, context);
                return;
            }

            const { width, height } = context.canvas;
            context.save();

            if (['Lines', 'Wave'].includes(animationName)) {
                const anchorY = layer.top ? 0 : layer.center ? height / 2 : height;
                context.translate(0, anchorY);
                context.scale(1, visualizerScale);
                context.translate(0, -anchorY);
            } else {
                context.translate(width / 2, height / 2);
                context.scale(visualizerScale, visualizerScale);
                context.translate(-width / 2, -height / 2);
            }

            animation.draw(data, context);
            context.restore();
        }
    };
}

function getVisualizerLayerPresets(animationName) {
    // Wave's narrow base/lows bands are capped by addVisualizerLayers so each
    // rendered shape samples farther apart and shows meaningful variation.
    switch (animationName) {
        case 'Arcs':
            return [
                { lineColor: 'white', lineWidth: 5, fillColor: { gradient: ['#FA8BFF', '#2BD2FF', '#2BFF88'] }, count: 30, rounded: true, diameter: 450, frequencyBand: 'base' },
                { lineColor: 'rgba(255,255,255,0.92)', lineWidth: 4, fillColor: { gradient: ['#FFCA76', '#FF7FEF'] }, count: 26, rounded: true, diameter: 450, mirroredX: true, frequencyBand: 'lows' },
                { lineColor: 'rgba(255,255,255,0.84)', lineWidth: 3, fillColor: { gradient: ['#8CE2FF', '#C26AFF'] }, count: 22, rounded: true, diameter: 450, mirroredX: true, mirroredY: true, frequencyBand: 'mids' },
                { lineColor: 'rgba(255,255,255,0.75)', lineWidth: 2, fillColor: { gradient: ['#B6FFB8', '#D9AAFF'] }, count: 18, rounded: true, diameter: 450, mirroredY: true, frequencyBand: 'highs' }
            ];
        case 'Wave':
            return [
                { lineColor: 'white', lineWidth: 1, fillColor: { gradient: ['#FBDA61', '#FF5ACD'] }, count: 34, diameter: 360, rounded: true, mirroredX: true, top: true, frequencyBand: 'base' },
                { lineColor: 'rgba(255,255,255,0.9)', lineWidth: 1, fillColor: { gradient: ['#FDB86A', '#FF81D0'] }, count: 30, diameter: 320, rounded: true, mirroredX: true, bottom: true, rotate: 12, frequencyBand: 'lows' },
                { lineColor: 'rgba(255,255,255,0.8)', lineWidth: 1, fillColor: { gradient: ['#61D4FB', '#FF82D6'] }, count: 26, diameter: 280, rounded: true, mirroredX: true, center: true, mirroredY: true, rotate: 24, frequencyBand: 'mids' },
                { lineColor: 'rgba(255,255,255,0.75)', lineWidth: 1, fillColor: { gradient: ['#7DFB68', '#FF7FD3'] }, count: 22, diameter: 240, rounded: true, mirroredY: true, top: true, rotate: 36, frequencyBand: 'highs' }
            ];
        case 'Glob':
            return [
                { lineColor: 'white', lineWidth: 10, fillColor: { gradient: ['#FBDA61', '#FF5ACD'] }, diameter: 320, mirroredX: true, count: 28, rounded: true, frequencyBand: 'base' },
                { lineColor: 'rgba(255,255,255,0.9)', lineWidth: 9, fillColor: { gradient: ['#FFE47E', '#FF8BE8'] }, diameter: 280, count: 24, rounded: true, rotate: 10, frequencyBand: 'lows' },
                { lineColor: 'rgba(255,255,255,0.8)', lineWidth: 8, fillColor: { gradient: ['#8CE5FF', '#C771FF'] }, diameter: 240, mirroredX: true, count: 20, rounded: true, mirroredY: true, rotate: 18, frequencyBand: 'mids' },
                { lineColor: 'rgba(255,255,255,0.7)', lineWidth: 7, fillColor: { gradient: ['#A3FFA9', '#D8B3FF'] }, diameter: 200, count: 16, rounded: true, mirroredY: true, rotate: 28, frequencyBand: 'highs' }
            ];
        case 'Lines':
            return [
                { lineColor: 'white', lineWidth: 12, fillColor: { gradient: ['#FA8BFF', '#2BD2FF', '#2BFF88'] }, count: 16, rounded: true, top: true, frequencyBand: 'base' },
                { lineColor: 'rgba(255,255,255,0.9)', lineWidth: 9, fillColor: { gradient: ['#E8A4FF', '#A0E9FF'] }, count: 16, rounded: true, bottom: true, frequencyBand: 'lows' },
                { lineColor: 'rgba(255,255,255,0.8)', lineWidth: 7, fillColor: { gradient: ['#8CD9FF', '#C77DFF'] }, count: 26, rounded: true, center: true, mirroredY: true, frequencyBand: 'mids' },
                { lineColor: 'rgba(255,255,255,0.7)', lineWidth: 5, fillColor: { gradient: ['#C0FFB5', '#D9ABFF'] }, count: 20, rounded: true, mirroredY: true, frequencyBand: 'highs' }
            ];
        case 'Circles':
            return [
                { lineColor: 'white', lineWidth: 5, fillColor: { gradient: ['#FA8BFF', '#2BD2FF', '#2BFF88'] }, diameter: 480, mirroredX: true, count: 60, rounded: true, frequencyBand: 'base' },
                { lineColor: 'rgba(255,255,255,0.9)', lineWidth: 4, fillColor: { gradient: ['#FFD7A9', '#FF95EA'] }, diameter: 360, count: 60, rounded: true, mirroredY: true, frequencyBand: 'lows' },
                { lineColor: 'rgba(255,255,255,0.8)', lineWidth: 3, fillColor: { gradient: ['#8AE3FF', '#C16CFF'] }, diameter: 240, mirroredX: true, count: 50, rounded: true, mirroredY: true, frequencyBand: 'mids' },
                { lineColor: 'rgba(255,255,255,0.7)', lineWidth: 2, fillColor: { gradient: ['#B8FFB2', '#D39BFF'] }, diameter: 120, count: 40, rounded: true, top: true, frequencyBand: 'highs' }
            ];
        case 'Flower':
            return [
                { lineColor: 'white', lineWidth: 10, fillColor: { gradient: ['#FA8BFF', '#2BD2FF', '#2BFF88'] }, mirroredX: true, count: 60, rounded: true, rotate: 0, frequencyBand: 'base' },
                { lineColor: 'rgba(255,255,255,0.9)', lineWidth: 8, fillColor: { gradient: ['#FFCE8F', '#FF8CE3'] }, count: 60, rounded: true, rotate: 14, frequencyBand: 'lows' },
                { lineColor: 'rgba(255,255,255,0.8)', lineWidth: 6, fillColor: { gradient: ['#8CE1FF', '#C56DFF'] }, count: 50, rounded: true, mirroredY: true, rotate: 28, frequencyBand: 'mids' },
                { lineColor: 'rgba(255,255,255,0.7)', lineWidth: 4, fillColor: { gradient: ['#C4FFB3', '#D59EFF'] }, count: 40, rounded: true, mirroredX: true, mirroredY: true, rotate: 42, frequencyBand: 'highs' }
            ];
        case 'Shine':
            return [
                { lineColor: 'white', lineWidth: 10, fillColor: { gradient: ['#FA8BFF', '#2BD2FF', '#2BFF88'] }, mirroredX: true, count: 60, rounded: true, rotate: 0, frequencyBand: 'base' },
                { lineColor: 'rgba(255,255,255,0.9)', lineWidth: 8, fillColor: { gradient: ['#FFE39D', '#FF96EA'] }, count: 60, rounded: true, mirroredY: true, rotate: 16, frequencyBand: 'lows' },
                { lineColor: 'rgba(255,255,255,0.8)', lineWidth: 6, fillColor: { gradient: ['#8CE6FF', '#C169FF'] }, mirroredX: true, count: 50, rounded: true, rotate: 32, frequencyBand: 'mids' },
                { lineColor: 'rgba(255,255,255,0.7)', lineWidth: 4, fillColor: { gradient: ['#BBFFB8', '#D4A1FF'] }, count: 40, rounded: true, mirroredX: true, mirroredY: true, rotate: 48, frequencyBand: 'highs' }
            ];
        case 'Square':
            return [
                { lineColor: 'white', lineWidth: 10, fillColor: { gradient: ['#FA8BFF', '#2BD2FF', '#2BFF88'] }, mirroredX: true, count: 60, rounded: true, diameter: 200, frequencyBand: 'base' },
                { lineColor: 'rgba(255,255,255,0.9)', lineWidth: 8, fillColor: { gradient: ['#FFDBA9', '#FF8FEA'] }, count: 60, rounded: true, mirroredY: true, diameter: 200, frequencyBand: 'lows' },
                { lineColor: 'rgba(255,255,255,0.8)', lineWidth: 6, fillColor: { gradient: ['#8EE8FF', '#C16BFF'] }, mirroredX: true, count: 50, rounded: true, mirroredY: true, diameter: 200, frequencyBand: 'mids' },
                { lineColor: 'rgba(255,255,255,0.7)', lineWidth: 4, fillColor: { gradient: ['#BEFFB9', '#D2A7FF'] }, count: 40, rounded: true, top: true, diameter: 200, frequencyBand: 'highs' }
            ];
        case 'Turntable':
            return [
                { lineColor: 'white', lineWidth: 10, fillColor: { gradient: ['#FA8BFF', '#2BD2FF', '#2BFF88'] }, mirroredX: true, count: 60, rounded: true, rotate: 0, diameter: 200, frequencyBand: 'base' },
                { lineColor: 'rgba(255,255,255,0.9)', lineWidth: 8, fillColor: { gradient: ['#FFE0A7', '#FF98ED'] }, count: 60, rounded: true, mirroredY: true, rotate: 18, diameter: 200,frequencyBand: 'lows' },
                { lineColor: 'rgba(255,255,255,0.8)', lineWidth: 6, fillColor: { gradient: ['#8AE9FF', '#C168FF'] }, mirroredX: true, count: 50, rounded: true, rotate: 36, diameter: 200,frequencyBand: 'mids' },
                { lineColor: 'rgba(255,255,255,0.7)', lineWidth: 4, fillColor: { gradient: ['#C0FFB9', '#D1A9FF'] }, count: 40, rounded: true, mirroredX: true, mirroredY: true, rotate: 54, diameter: 200,frequencyBand: 'highs' }
            ];
        default:
            return [];
    }
}

function setVisualizerMode(typeIndex) {
    visualizerType = typeIndex;
    const canvasElement = document.querySelector("#visualizer");
    const focusPage = document.getElementById('songFocusPage');

    if (focusPage) {
        focusPage.classList.remove(
            'visualizer-mode-1', 'visualizer-mode-2', 'visualizer-mode-3',
            'visualizer-mode-4', 'visualizer-mode-5', 'visualizer-mode-6',
            'visualizer-mode-7', 'visualizer-mode-8', 'visualizer-mode-9'
        );
        focusPage.classList.add(`visualizer-mode-${typeIndex}`);
        focusPage.style.background = '';
    }

    updateFocusAlbumDisplay(typeIndex);

    if (!waveInstance) {
        console.warn("Visualizer not initialized yet. Cannot change type.");
        return;
    } else {
        // 1. Update text
        visNameDisplay.textContent = `${modeNames[visualizerType] || 'Unknown'}`;

        // 2. Make it visible
        visNameDisplay.style.opacity = '1';

        // 3. Clear existing timer so we don't fade out while they are still sliding
        clearTimeout(fadeTimeout);

        // 4. Set a new timer to fade out after 1.5 seconds
        fadeTimeout = setTimeout(() => {
            visNameDisplay.style.opacity = '0';
        }, 1500);

        resizeVisualizerCanvas();
        waveInstance.clearAnimations(); // Clear existing animations before applying new one
        switch (visualizerType) {
            case '1':
                addVisualizerLayers('Arcs', getVisualizerLayerPresets('Arcs'));
                console.log('Visualizer initialized with layered Arcs animations.');
                break;
            case '2':
                addVisualizerLayers('Wave', getVisualizerLayerPresets('Wave'));
                console.log('Visualizer initialized with layered Wave animations.');
                break;
            case '3':
                addVisualizerLayers('Glob', getVisualizerLayerPresets('Glob'));
                console.log('Visualizer initialized with layered Glob animations.');
                break;
            case '4':
                addVisualizerLayers('Lines', getVisualizerLayerPresets('Lines'));
                console.log('Visualizer initialized with layered Lines animations.');
                break;
            case '5':
                addVisualizerLayers('Circles', getVisualizerLayerPresets('Circles'));
                console.log('Visualizer initialized with layered Circles animations.');
                break;
            case '6':
                addVisualizerLayers('Flower', getVisualizerLayerPresets('Flower'));
                console.log('Visualizer initialized with layered Flower animations.');
                break;
            case '7':
                addVisualizerLayers('Shine', getVisualizerLayerPresets('Shine'));
                console.log('Visualizer initialized with layered Shine animations.');
                break;
            case '8':
                addVisualizerLayers('Square', getVisualizerLayerPresets('Square'));
                console.log('Visualizer initialized with layered Square animations.');
                break;
            case '9':
                addVisualizerLayers('Turntable', getVisualizerLayerPresets('Turntable'));
                console.log('Visualizer initialized with layered Turntable animations.');
                break;
            // Add cases for other visualizer types
        }
    }
}

function getWaveAnalyserNode() {
    if (!waveInstance) return null;
    return waveAnalyser || waveInstance._audioAnalyser || null;
}

function setVisualizerSensitivity(value) {
    const analyser = getWaveAnalyserNode();

    if (!analyser) {
        console.warn("Wave analyser is not ready yet!");
        return;
    }

    analyser.smoothingTimeConstant = 1.0 - value;
    analyser.fftSize = 2048;

    setVisualizerMode(visualizerType);
}

function setVisualizerGain(value) {
    visualizerGain = Math.max(0.5, Math.min(3, Number(value) || 1));

    const gainValue = document.querySelector('.visualizer-size-value');
    if (gainValue) {
        gainValue.textContent = `${visualizerGain.toFixed(1)}x`;
    }
}

function setVisualizerScale(value) {
    visualizerScale = Math.max(0.5, Math.min(2, Number(value) || 1));

    const scaleValue = document.querySelector('.visualizer-scale-value');
    if (scaleValue) {
        scaleValue.textContent = `x${visualizerScale.toFixed(1)}`;
    }

    // Rebuild wrappers so every layer uses the latest drawing scale.
    setVisualizerMode(visualizerType);
}
/*---------------------------------------------
7. Statistics
---------------------------------------------*/

// --- UPDATED UI METRIC MAPPING ENGINE ---
async function updateStatsSummary() {
    try {
        const response = await fetch('http://localhost:3000/api/stats');
        const data = await response.json();

        // Play/Listen metrics targets
        const totalPlaysElem = document.getElementById('stat-total-plays');
        const activeArtistsElem = document.getElementById('stat-artists-listened');

        // Global library inventory targets
        const globalSongCountElem = document.getElementById('stat-song-count');
        const globalArtistCountElem = document.getElementById('stat-artist-count');

        // Map listening counts dynamically
        if (totalPlaysElem) {
            totalPlaysElem.textContent = data.totalPlaysCount;
        }
        if (activeArtistsElem) {
            activeArtistsElem.textContent = data.uniqueArtistsListened;
        }

        // Map global library inventory counts dynamically
        if (globalSongCountElem) {
            globalSongCountElem.textContent = data.totalSongsInLibrary;
        }
        if (globalArtistCountElem) {
            globalArtistCountElem.textContent = data.totalArtistsInLibrary;
        }
    } catch (error) {
        console.error('UI stats collection injection error:', error);
    }
}

async function renderStatsLeaderboards() {
    try {
        // 1. Fetch your individual song and artist rankings from the backend
        const response = await fetch('http://localhost:3000/api/stats/top');
        const data = await response.json();

        const songsList = document.getElementById('top-songs-list');
        const artistsList = document.getElementById('top-artists-list');

        // Clear previous lists to prevent duplication on refresh
        if (songsList) songsList.innerHTML = '';
        if (artistsList) artistsList.innerHTML = '';


        // 2. Build the Top Songs list items dynamically
        if (songsList && data.topSongs) {
            data.topSongs.forEach((track, index) => {
                const li = document.createElement('li');
                li.className = 'chart-item';
                li.innerHTML = `
                    <span class="rank">#${index + 1}</span>
                    <div class="track-details">
                        <span class="track-title">${track.title}</span>
                        <span class="track-artist">${track.artist}</span>
                    </div>
                    <span class="play-count">${track.plays} plays</span>
                `;
                songsList.appendChild(li);
            });
        }

        // 3. Build the Top Artists list items dynamically
        if (artistsList && data.topArtists) {
            data.topArtists.forEach((artist, index) => {
                const li = document.createElement('li');
                li.className = 'chart-item';
                li.innerHTML = `
                    <span class="rank">#${index + 1}</span>
                    <span class="artist-name">${artist.artist}</span>
                    <span class="play-count">${artist.totalPlays} plays</span>
                `;
                artistsList.appendChild(li);
            });
        }

    } catch (error) {
        console.error('Failed to construct the stats leaderboard:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateStatsSummary();
    renderStatsLeaderboards();

    // 2. Manual Update Commitment Button 
    const refreshBtn = document.getElementById('refresh-stats-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            // ANNOTATION: Forces a safe, non-destructive UI sync without wiping out userQueue arrays
            updateStatsSummary();
            renderStatsLeaderboards();
            console.log("User explicitly committed to layout redraw.");
        });
    }
});