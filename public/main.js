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

    // Match container height to the first item and set initial z-index/position
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

    // Reset active states for all navigation items and content pages
    items.forEach(item => item.classList.remove('active'));
    pageContents.forEach(page => page.classList.remove('active'));

    // Activate the clicked item and its linked content page
    clickedItem.classList.add('active');
    const pageId = clickedItem.dataset.page;
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');

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
        }, 800);
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

function addMusic() {
    const addBtn = document.querySelector('.add-btn');
    if (!addBtn) return;

    addBtn.onclick = () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*';
        fileInput.multiple = true;

        fileInput.onchange = async (event) => {
            const files = Array.from(event.target.files);
            if (files.length === 0) return;

            // Prepare the data to send to the server
            const formData = new FormData();
            files.forEach(file => {
                formData.append('songs', file);
            });

            try {
                const response = await fetch('http://localhost:3000/upload', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    alert('Music uploaded to server successfully!');
                }
            } catch (err) {
                console.error('Upload failed:', err);
            }
        };

        fileInput.click();
    };
}



// This function creates the HTML for a single music card/row
function displayMusic(tracks) {
    const libraryGrid = document.getElementById('library-grid');
    const artistList = document.getElementById('artist-list');

    // Clear placeholders if this is the first upload
    if (tracks.length > 0) {
        libraryGrid.innerHTML = '';
        artistList.innerHTML = '';
    }

    tracks.forEach(track => {
        // 1. Add to Library Grid
        const card = document.createElement('div');
        card.className = 'music-card';
        card.innerHTML = `
            <img src="${track.cover}" alt="Cover" class="album-cover-small">
            <div class="card-info">
                <strong>${track.title}</strong>
                <p>${track.artist}</p>
            </div>
        `;
        libraryGrid.appendChild(card);

        // 2. Add to Artist List
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="song-card">
                <img src="${track.cover}" alt="Album Cover" class="album-cover">
                <div class="song-info">
                    <strong>${track.artist}</strong>
                    <p>${track.title}</p>
                    <button class="play-button" onclick="playTrack('${track.url}')">
                        Play
                    </button>
                </div>
            </div>
        `;
        artistList.appendChild(li);
    });
}

// Updated addMusic function to handle the auto-fill
async function addMusic() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'audio/*';
    fileInput.multiple = true;

    fileInput.onchange = async (event) => {
        const files = Array.from(event.target.files);
        const formData = new FormData();
        files.forEach(file => formData.append('songs', file));

        try {
            // Change 'localhost' to your IP if testing on mobile
            const response = await fetch('http://localhost:3000/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.tracks) {
                // This is the "Auto-Fill" magic
                displayMusic(data.tracks);
            }
        } catch (err) {
            console.error('Upload error:', err);
        }
    };

    fileInput.click();
}

// Helper for playing (simple version)
function playTrack(url) {
    const audio = new Audio(url);
    audio.play();
}