let zoomOverlay;
let glitchImage;

// Initialize after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    zoomOverlay = document.getElementById('zoomOverlay');
    glitchImage = document.querySelector('.glitch'); // Small image in header
});

// Show Zoom Overlay
function showZoom() {
    if (zoomOverlay) {
        zoomOverlay.style.display = "block";
        glitchImage.classList.add('no-glitch'); // Disable small image glitch
    }
}

// Hide Zoom Overlay
function hideZoom() {
    if (zoomOverlay) {
        zoomOverlay.style.display = "none";
        glitchImage.classList.remove('no-glitch'); // Re-enable small image glitch
    }
}

// Hide Zoom Overlay on Click Outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.glitch') && !e.target.closest('.zoom-overlay')) {
        hideZoom();
    }
});
