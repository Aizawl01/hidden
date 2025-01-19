const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');
const marquee = document.getElementById('marquee');
const revealButton = document.getElementById('reveal');
const customAlert = document.getElementById('customAlert');
const alertFoundWords = document.getElementById('alertFoundWords');
const zoomOverlay = document.getElementById('zoomOverlay');
const audio = new Audio('aizawl.mp3');
const glitchImage = document.querySelector('.glitch'); // Small image in header
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const fontSize = 18;
const columns = Math.floor(canvas.width / fontSize);
const drops = Array(columns).fill(1);

// Matrix-style characters (including symbols)
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_+-=[]{}|;':\",./<>?";
const hiddenWords = ["aijal", "downtown", "Acity", "khiangtevillain ai", "aizawl echo"]; // Original hidden words
let foundWords = 0;
const foundList = [];

const hiddenWordPositions = hiddenWords.map((word) => ({
    word,
    column: Math.floor(Math.random() * columns),
    y: Math.random() * canvas.height,
    found: false,
}));

function drawMatrix() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontSize}px 'Source Code Pro', monospace`;

    // Draw falling characters
    drops.forEach((y, x) => {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const neonColor = `hsl(${Math.random() * 360}, 100%, 75%)`;

        ctx.fillStyle = neonColor;
        ctx.shadowColor = neonColor;
        ctx.shadowBlur = 15;

        ctx.fillText(text, x * fontSize, y * fontSize);

        if (y * fontSize > canvas.height && Math.random() > 0.975) {
            drops[x] = 0;
        }

        drops[x]++;
    });

    // Draw hidden words only if marquee is not displayed
    if (marquee.style.display !== "flex") {
        hiddenWordPositions.forEach((hw) => {
            if (!hw.found) {
                ctx.fillStyle = "#FF00FF";
                ctx.shadowColor = "#FF00FF";
                ctx.shadowBlur = 15;

                ctx.fillText(hw.word, hw.column * fontSize, hw.y);
                hw.y += fontSize / 2;

                if (hw.y > canvas.height) {
                    hw.y = 0;
                    hw.column = Math.floor(Math.random() * columns);
                }
            }
        });
    }
}

setInterval(drawMatrix, 50);

// Detect clicks or taps on the canvas
canvas.addEventListener("click", (e) => {
    const clickedX = e.clientX;
    const clickedY = e.clientY;

    hiddenWordPositions.forEach((hw) => {
        if (
            !hw.found &&
            Math.abs(hw.column * fontSize - clickedX) < fontSize * 4 &&
            Math.abs(hw.y - clickedY) < fontSize * 2
        ) {
            hw.found = true;
            foundWords++;
            foundList.push(hw.word);

            document.getElementById("foundCount").textContent = foundWords;
            document.getElementById("foundWords").textContent = foundList.join(", ");

            if (foundWords === hiddenWords.length) {
                revealButton.style.display = "block";
            }
        }
    });
});

// Reveal Button Functionality
revealButton.addEventListener('click', () => {
    // Show marquee and play audio
    marquee.style.display = "flex";
    audio.play().catch((error) => {
        console.error('Audio playback failed:', error);
    });

    // Hide marquee after 5 seconds and show custom alert
    setTimeout(() => {
        marquee.style.display = "none";
        alertFoundWords.textContent = foundList.join(", ");
        customAlert.style.display = "block";
    }, 5000); // 5 seconds delay
});

// Close Custom Alert
function closeAlert() {
    customAlert.style.display = "none";
}

// Show Zoom Overlay
function showZoom() {
    zoomOverlay.style.display = "block";
    glitchImage.classList.add('no-glitch'); // Disable small image glitch
}

// Hide Zoom Overlay
function hideZoom() {
    zoomOverlay.style.display = "none";
    glitchImage.classList.remove('no-glitch'); // Re-enable small image glitch
}

// Hide Zoom Overlay on Click Outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.glitch') && !e.target.closest('.zoom-overlay')) {
        hideZoom();
    }
});
