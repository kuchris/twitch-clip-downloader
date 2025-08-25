// Script will be loaded after WaveSurfer and plugins are ready
console.log('Script loading - WaveSurfer available:', typeof WaveSurfer);
console.log('Regions plugin available:', typeof WaveSurfer?.regions);

// Main application initialization function
function initializeApp() {
    console.log('Initializing application...');

// --- i18n --- //
const translations = {
    en: {
        title: 'Twitch Clip to MP3 Downloader',
        placeholder: 'Enter Twitch Clip URL',
        getClip: 'Get Clip',
        download: 'Download MP3',
        loading: 'Downloading and converting, please wait...',
        playPause: 'Play / Pause',
    },
    jp: {
        title: 'TwitchクリップMP3ダウンローダー',
        placeholder: 'TwitchクリップのURLを入力',
        getClip: 'クリップを取得',
        download: 'MP3をダウンロード',
        loading: 'ダウンロードと変換中です、お待ちください...',
        playPause: '再生/一時停止',
    }
};

function setLanguage(lang) {
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        if (translations[lang] && translations[lang][key]) {
            if (element.placeholder !== undefined) {
                element.placeholder = translations[lang][key];
            } else {
                element.textContent = translations[lang][key];
            }
        }
    });
}

// Set up language switcher event listeners
document.getElementById('lang-en').addEventListener('click', () => setLanguage('en'));
document.getElementById('lang-jp').addEventListener('click', () => setLanguage('jp'));

// --- App Logic --- //
const twitchUrlInput = document.getElementById('twitch-url');
const getClipBtn = document.getElementById('get-clip-btn');
const editorSection = document.querySelector('.editor-section');
const videoContainer = document.querySelector('.video-container');
const video = document.getElementById('clip-video');
const downloadBtn = document.getElementById('download-btn');
const playBtn = document.getElementById('play-btn');
const loadingSection = document.querySelector('.loading-section');

// Add time input fields for simple time selection
const timeInputsContainer = document.createElement('div');
timeInputsContainer.className = 'time-inputs';
timeInputsContainer.innerHTML = `
    <div class="time-input-group">
        <label for="start-time">Start Time (seconds):</label>
        <input type="number" id="start-time" min="0" step="0.1" value="0">
    </div>
    <div class="time-input-group">
        <label for="end-time">End Time (seconds):</label>
        <input type="number" id="end-time" min="0" step="0.1" value="30">
    </div>
`;
document.querySelector('.controls').insertBefore(timeInputsContainer, document.querySelector('.controls').firstChild);

const startTimeInput = document.getElementById('start-time');
const endTimeInput = document.getElementById('end-time');

// Debug: Check if all elements are found
console.log('DOM elements check:');
console.log('- twitchUrlInput:', !!twitchUrlInput);
console.log('- getClipBtn:', !!getClipBtn);
console.log('- video:', !!video);
console.log('- downloadBtn:', !!downloadBtn);
console.log('- playBtn:', !!playBtn);
console.log('- startTimeInput:', !!startTimeInput);
console.log('- endTimeInput:', !!endTimeInput);

const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000' 
    : 'https://twitch-clip-downloader-backend.onrender.com';

console.log('Using backend URL:', backendUrl);

let selectedRegion = { start: 0, end: 30 };

function updateRegionDisplay() {
    if (startTimeInput && endTimeInput) {
        startTimeInput.value = selectedRegion.start;
        endTimeInput.value = selectedRegion.end;
    }
}

// Set up button event listeners
getClipBtn.addEventListener('click', async () => {
    const url = twitchUrlInput.value.trim();
    if (!url) {
        alert('Please enter a Twitch clip URL.');
        return;
    }

    console.log('Processing URL:', url);
    
    editorSection.style.display = 'none';
    loadingSection.style.display = 'block';

    try {
        console.log('Fetching clip URL from backend...');
        const response = await fetch(`${backendUrl}/get-clip-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        console.log('Response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('Received data:', data);
            
            if (!data.clipUrl) {
                throw new Error('No clip URL received from backend');
            }

            // Set up video element
            video.src = data.clipUrl;
            video.load();
            
            // Wait for video metadata to load, then set up time inputs
            video.addEventListener('loadedmetadata', () => {
                console.log('Video metadata loaded, duration:', video.duration);
                
                // Set initial time range
                selectedRegion.start = 0;
                selectedRegion.end = Math.floor(video.duration);
                updateRegionDisplay();
                
                // Show the editor section
                videoContainer.style.display = 'block';
                editorSection.style.display = 'block';
                loadingSection.style.display = 'none';
                
                console.log('Editor ready');
            });
            
            // Add time synchronization
            video.addEventListener('timeupdate', () => {
                // Update start time input to show current playback position
                if (startTimeInput && !startTimeInput.matches(':focus')) {
                    startTimeInput.value = video.currentTime.toFixed(1);
                }
            });
            
            // Synchronize time inputs with video
            startTimeInput.addEventListener('change', () => {
                const newTime = parseFloat(startTimeInput.value);
                if (!isNaN(newTime) && newTime >= 0 && newTime < video.duration) {
                    video.currentTime = newTime;
                    selectedRegion.start = newTime;
                }
            });
            
            endTimeInput.addEventListener('change', () => {
                const newTime = parseFloat(endTimeInput.value);
                if (!isNaN(newTime) && newTime > selectedRegion.start && newTime <= video.duration) {
                    selectedRegion.end = newTime;
                }
            });
            
            // Add keyboard shortcuts for precise time control
            startTimeInput.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const newTime = Math.min(parseFloat(startTimeInput.value) + 0.1, video.duration);
                    startTimeInput.value = newTime.toFixed(1);
                    video.currentTime = newTime;
                    selectedRegion.start = newTime;
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const newTime = Math.max(parseFloat(startTimeInput.value) - 0.1, 0);
                    startTimeInput.value = newTime.toFixed(1);
                    video.currentTime = newTime;
                    selectedRegion.start = newTime;
                }
            });
            
            endTimeInput.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const newTime = Math.min(parseFloat(endTimeInput.value) + 0.1, video.duration);
                    endTimeInput.value = newTime.toFixed(1);
                    selectedRegion.end = newTime;
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const newTime = Math.max(parseFloat(endTimeInput.value) - 0.1, selectedRegion.start + 0.1);
                    endTimeInput.value = newTime.toFixed(1);
                    selectedRegion.end = newTime;
                }
            });
            
            video.addEventListener('error', (videoError) => {
                console.error('Video loading error:', videoError);
                alert('Error loading video. You can still download the full clip.');
                loadingSection.style.display = 'none';
            });

        } else {
            const errorText = await response.text();
            console.error('Backend error:', errorText);
            alert(`Backend Error: ${errorText}`);
            loadingSection.style.display = 'none';
        }
    } catch (error) {
        console.error('Detailed error:', error);
        console.error('Error stack:', error.stack);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        
        let userMessage = 'An error occurred while loading the clip.';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            userMessage = 'Cannot connect to backend server. Please check if the backend is running.';
        } else if (error.message) {
            userMessage = `Error: ${error.message}`;
        }
        
        alert(userMessage);
        loadingSection.style.display = 'none';
    }
});

playBtn.addEventListener('click', () => {
    if (video.readyState >= 2) { // HAVE_CURRENT_DATA
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    } else {
        alert('Video not ready yet. Please wait for the clip to load.');
    }
});

downloadBtn.addEventListener('click', async () => {
    const url = twitchUrlInput.value.trim();
    if (!url) {
        alert('Please enter a Twitch clip URL.');
        return;
    }

    const start = parseFloat(startTimeInput.value);
    const end = parseFloat(endTimeInput.value);

    if (start >= end) {
        alert('Start time must be less than end time.');
        return;
    }

    console.log('Downloading with time range:', { start, end });
    loadingSection.style.display = 'block';

    try {
        const response = await fetch(`${backendUrl}/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                url, 
                start, 
                end 
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            
            // Create filename with timestamp
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
            a.download = `twitch-clip-${timestamp}.mp3`;
            
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
            console.log('Download completed');
        } else {
            const errorText = await response.text();
            console.error('Download error:', errorText);
            alert(`Error: ${errorText}`);
        }
    } catch (error) {
        console.error('Error downloading file:', error);
        alert('An error occurred while downloading the file.');
    } finally {
        loadingSection.style.display = 'none';
    }
});

// Set default language
setLanguage('en');

console.log('Application setup complete!');
} // End of initializeApp function

// Expose the initialization function globally
window.initializeApp = initializeApp;