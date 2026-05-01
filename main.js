// Select all navigation triggers and their target content sections
const navItems = document.querySelectorAll('.nav-item');
const pageContents = document.querySelectorAll('.page-content');

// Container for the stacking effect and the vertical spacing constant
const navContainer = document.querySelector('.nav-items');
const stackOffset = 20;

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


















































































































































// Icon path constants
const PLAY_ICON_PATH = 'images/play-icon.png';
const PAUSE_ICON_PATH = 'images/pause-icon.png';

let song = new Audio('audio/death-grips-takyon.mp3'); // to change with Ben's system


function playMusic(button){
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

// Example: Using data-attribute for better management
document.querySelectorAll('.play-btn').forEach(button => {
  button.addEventListener('click', (e) => {
    const songId = e.target.getAttribute('data-song-id');
    if (songId) {
      // Example: play the corresponding audio file
      if (song) {
        song.pause();
        song.currentTime = 0;
      }
      song = new Audio(`audio/${songId}.mp3`);
      song.play();
    }
  });
});

const volumeSlider = document.querySelector('.volume-slider');
const volumeLabel = document.querySelector('.volume-label');

volumeSlider.addEventListener('input', (e) => {
    let volume = e.target.value;
    if (song) {
        song.volume = volume / 100;  // Convert 0-100 to 0-1
    }
    volumeLabel.textContent = volume + '%';
});