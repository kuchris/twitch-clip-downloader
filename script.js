// Script will be loaded after WaveSurfer and plugins are ready
console.log('Script loading - WaveSurfer available:', typeof WaveSurfer);
console.log('Regions plugin available:', typeof WaveSurfer?.regions);

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
const regionStart = document.getElementById('region-start');
const regionEnd = document.getElementById('region-end');

const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000' 
    : 'https://twitch-clip-downloader-backend.onrender.com';

console.log('Using backend URL:', backendUrl);

let wavesurfer = null;
let selectedRegion = { start: 0, end: 0 };

function updateRegionDisplay() {
    if (regionStart && regionEnd) {
        regionStart.textContent = selectedRegion.start.toFixed(2);
        regionEnd.textContent = selectedRegion.end.toFixed(2);
    }
}

getClipBtn.addEventListener('click', async () => {
    const url = twitchUrlInput.value.trim();
    if (!url) {
        alert('Please enter a Twitch clip URL.');
        return;
    }

    console.log('Processing URL:', url);
    
    editorSection.style.display = 'none';
    loadingSection.style.display = 'block';

    // Clean up previous instance
    if (wavesurfer) {
        wavesurfer.destroy();
        wavesurfer = null;
    }

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

            // Set up video element and test the URL
            video.src = data.clipUrl;
            video.crossOrigin = 'anonymous'; // Try to handle CORS
            video.load();
            
            // Test if the URL is accessible
            console.log('Testing URL accessibility...');
            fetch(data.clipUrl, { method: 'HEAD', mode: 'no-cors' })
                .then(() => console.log('URL appears to be accessible'))
                .catch(e => console.warn('URL accessibility test failed:', e));

            console.log('Creating WaveSurfer instance...');
            console.log('Available WaveSurfer properties:', Object.getOwnPropertyNames(WaveSurfer));
            console.log('WaveSurfer.regions available:', !!WaveSurfer.regions);
            
            // Check if regions plugin is available
            if (!WaveSurfer.regions) {
                throw new Error('Regions plugin is not available. Please refresh the page and try again.');
            }
            
            // Create wavesurfer instance using v6 syntax (stable)
            wavesurfer = WaveSurfer.create({
                container: '#waveform',
                waveColor: '#ddd',
                progressColor: '#6441a5',
                cursorColor: '#fff',
                barWidth: 2,
                barRadius: 1,
                responsive: true,
                height: 100,
                normalize: true,
                backend: 'MediaElement', // Use MediaElement backend for better CORS handling
                mediaControls: false,
                plugins: [
                    WaveSurfer.regions.create({
                        regions: [],
                        dragSelection: {
                            slop: 5
                        }
                    })
                ]
            });

            // Alternative approach: try to use the video element as media source
            console.log('Attempting to use video element as media source...');
            
            // Wait for video to be ready, then load wavesurfer
            video.addEventListener('loadedmetadata', () => {
                console.log('Video metadata loaded, now loading wavesurfer...');
                try {
                    wavesurfer.loadMediaElement(video);
                } catch (mediaError) {
                    console.warn('Media element loading failed, trying URL directly:', mediaError);
                    // Fallback to direct URL loading
                    wavesurfer.load(data.clipUrl);
                }
            });
            
            video.addEventListener('error', (videoError) => {
                console.error('Video loading error:', videoError);
                console.log('Attempting direct wavesurfer loading...');
                wavesurfer.load(data.clipUrl);
            });

            wavesurfer.on('ready', () => {
                console.log('WaveSurfer ready');
                const duration = wavesurfer.getDuration();
                console.log('Audio duration:', duration);
                
                // Clear any existing regions
                wavesurfer.clearRegions();
                
                // Add initial region covering the entire duration
                const region = wavesurfer.addRegion({
                    start: 0,
                    end: duration,
                    color: 'rgba(100, 65, 165, 0.3)',
                    drag: true,
                    resize: true,
                });

                selectedRegion = { start: 0, end: duration };
                updateRegionDisplay();

                // Show the editor section
                videoContainer.style.display = 'block';
                editorSection.style.display = 'block';
                loadingSection.style.display = 'none';
                
                console.log('Editor ready');
            });

            // Handle region updates
            wavesurfer.on('region-updated', (region) => {
                selectedRegion.start = region.start;
                selectedRegion.end = region.end;
                updateRegionDisplay();
                console.log('Region updated:', selectedRegion);
            });

            // Handle region creation from drag selection
            wavesurfer.on('region-created', (region) => {
                // Remove other regions to keep only one active
                const regions = Object.values(wavesurfer.regions.list);
                regions.forEach(r => {
                    if (r !== region) r.remove();
                });
                
                selectedRegion.start = region.start;
                selectedRegion.end = region.end;
                updateRegionDisplay();
                console.log('Region created:', selectedRegion);
            });

            // Handle errors with more detail
            wavesurfer.on('error', (error) => {
                console.error('Wavesurfer error details:', error);
                console.error('Error type:', typeof error);
                console.error('Error message:', error.message || error);
                
                let errorMessage = 'Error loading audio waveform.';
                if (error.message) {
                    if (error.message.includes('CORS')) {
                        errorMessage = 'CORS error: Cannot load audio due to cross-origin restrictions.';
                    } else if (error.message.includes('decode')) {
                        errorMessage = 'Audio decode error: The audio format might not be supported.';
                    } else {
                        errorMessage = `Audio loading error: ${error.message}`;
                    }
                }
                
                alert(errorMessage);
                loadingSection.style.display = 'none';
            });

            // Handle loading progress
            wavesurfer.on('loading', (percent) => {
                console.log('Loading audio:', percent + '%');
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
    if (wavesurfer) {
        wavesurfer.playPause();
    } else {
        console.warn('WaveSurfer not ready');
    }
});

downloadBtn.addEventListener('click', async () => {
    const url = twitchUrlInput.value.trim();
    if (!url) {
        alert('Please enter a Twitch clip URL.');
        return;
    }

    if (selectedRegion.start >= selectedRegion.end) {
        alert('Please select a valid region to trim.');
        return;
    }

    console.log('Downloading with region:', selectedRegion);
    loadingSection.style.display = 'block';

    try {
        const response = await fetch(`${backendUrl}/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                url, 
                start: selectedRegion.start, 
                end: selectedRegion.end 
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