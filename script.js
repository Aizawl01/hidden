// Show Zoom Overlay
function showZoom() {
    zoomOverlay.style.display = "block";
    glitchImage.classList.add('no-glitch'); // Disable small image glitch
    // Enable glitch effect on zoomed image
    const zoomedImage = zoomOverlay.querySelector('img');
    zoomedImage.classList.remove('no-glitch');
}

// Hide Zoom Overlay
function hideZoom() {
    zoomOverlay.style.display = "none";
    glitchImage.classList.remove('no-glitch'); // Re-enable small image glitch
    // Disable glitch effect on zoomed image
    const zoomedImage = zoomOverlay.querySelector('img');
    zoomedImage.classList.add('no-glitch');
}
