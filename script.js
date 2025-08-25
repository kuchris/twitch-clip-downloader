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
        playPause: 'Show Region Info',
    },
    jp: {
        title: 'TwitchクリップMP3ダウンローダー',
        placeholder: 'TwitchクリップのURLを入力',
        getClip: 'クリップを取得',
        download: 'MP3をダウンロード',
        loading: 'ダウンロードと変換中です、お待ちください...',
        playPause: 'リージョン情報を表示',
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
const regionStart = document.getElementById('region-start');
const regionEnd = document.getElementById('region-end');

// Debug: Check if all elements are found
console.log('DOM elements check:');
console.log('- twitchUrlInput:', !!twitchUrlInput);
console.log('- getClipBtn:', !!getClipBtn);
console.log('- video:', !!video);
console.log('- downloadBtn:', !!downloadBtn);
console.log('- playBtn:', !!playBtn);

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

// Set up button event listeners
getClipBtn.addEventListener('click', async () => {
    console.log('Get Clip button clicked!');
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
            
            // WaveSurfer instance will be created in the synthetic waveform section

            // Instead of trying to load the video directly (which causes CORS issues),
            // we'll create a simple waveform representation and let the user select regions
            console.log('Creating synthetic waveform for region selection...');
            
            // Create a simple waveform using WaveSurfer's built-in methods
            // Since we can't load the actual audio due to CORS, we'll create a placeholder
            let duration = 15; // Default duration, will be updated when we get actual duration
            
            // Create a simple waveform by loading a silent audio file or using a different approach
            // For now, let's try to create a minimal waveform that allows region selection
            
            // Create wavesurfer with a simple configuration that doesn't require audio loading
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
                backend: 'WebAudio',
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
            
            // Try to get the actual duration from the backend
            try {
                console.log('Requesting audio metadata from backend...');
                const metadataResponse = await fetch(`${backendUrl}/get-audio-metadata`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: data.clipUrl })
                });
                
                if (metadataResponse.ok) {
                    const metadata = await metadataResponse.json();
                    if (metadata.duration) {
                        console.log('Got actual duration from backend:', metadata.duration);
                        duration = metadata.duration;
                    }
                }
            } catch (metadataError) {
                console.warn('Could not get metadata from backend, using default duration:', metadataError);
            }
            
            // Create a simple placeholder waveform using a minimal audio file
            // We'll use a very short silent audio file that WaveSurfer can handle
            try {
                // Load a minimal silent audio file
                wavesurfer.load('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            } catch (wavError) {
                console.warn('Could not load minimal audio, creating empty waveform:', wavError);
                // If that fails, just create an empty waveform container
                // The regions plugin should still work for selection
            }
            
            // Add a fallback: create a visual representation manually if audio loading fails
            setTimeout(() => {
                if (!wavesurfer.isReady()) {
                    console.log('Audio loading failed, creating manual visual representation...');
                    // Create a simple visual bar representation
                    const waveformContainer = document.getElementById('waveform');
                    if (waveformContainer) {
                        waveformContainer.innerHTML = `
                            <div style="width: 100%; height: 100px; background: #333; border: 1px solid #444; border-radius: 5px; position: relative;">
                                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 14px;">
                                    <div style="text-align: center;">
                                        <div style="margin-bottom: 10px;">Waveform Preview (CORS Limited)</div>
                                        <div style="font-size: 12px; color: #888;">Duration: ${duration}s | Drag to select regions</div>
                                        <div style="margin-top: 10px; padding: 10px; background: #444; border-radius: 3px; font-size: 11px;">
                                            You can still select time regions and download the trimmed MP3
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        // Create a simple region selector
                        const regionSelector = document.createElement('div');
                        regionSelector.style.cssText = `
                            position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
                            cursor: crosshair; background: transparent;
                        `;
                        
                        let isSelecting = false;
                        let startX = 0;
                        let selectionBox = null;
                        
                        regionSelector.addEventListener('mousedown', (e) => {
                            isSelecting = true;
                            startX = e.offsetX;
                            selectionBox = document.createElement('div');
                            selectionBox.style.cssText = `
                                position: absolute; top: 0; bottom: 0; 
                                background: rgba(100, 65, 165, 0.3); border: 1px solid #6441a5;
                                left: ${startX}px; width: 0;
                            `;
                            waveformContainer.appendChild(selectionBox);
                        });
                        
                        regionSelector.addEventListener('mousemove', (e) => {
                            if (isSelecting && selectionBox) {
                                const currentX = e.offsetX;
                                const left = Math.min(startX, currentX);
                                const width = Math.abs(currentX - startX);
                                selectionBox.style.left = left + 'px';
                                selectionBox.style.width = width + 'px';
                            }
                        });
                        
                        regionSelector.addEventListener('mouseup', () => {
                            if (isSelecting && selectionBox) {
                                isSelecting = false;
                                const containerWidth = waveformContainer.offsetWidth;
                                const startPercent = startX / containerWidth;
                                const endPercent = (startX + parseInt(selectionBox.style.width)) / containerWidth;
                                
                                selectedRegion.start = startPercent * duration;
                                selectedRegion.end = Math.min(endPercent * duration, duration);
                                updateRegionDisplay();
                                
                                // Remove selection box after a moment
                                setTimeout(() => {
                                    if (selectionBox && selectionBox.parentNode) {
                                        selectionBox.parentNode.removeChild(selectionBox);
                                    }
                                }, 1000);
                            }
                        });
                        
                        waveformContainer.appendChild(regionSelector);
                        
                        // Show the editor section
                        videoContainer.style.display = 'none';
                        editorSection.style.display = 'block';
                        loadingSection.style.display = 'none';
                        
                        console.log('Manual visual representation ready');
                    }
                }
            }, 2000); // Wait 2 seconds for audio loading to complete or fail

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

                // Show the editor section (hide video since we can't play it due to CORS)
                videoContainer.style.display = 'none';
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

// Verify event listeners are attached
console.log('Event listeners attached:');
console.log('- getClipBtn click listener:', !!getClipBtn.onclick);
console.log('- playBtn click listener:', !!playBtn.onclick);
console.log('- downloadBtn click listener:', !!downloadBtn.onclick);

playBtn.addEventListener('click', () => {
    console.log('Play button clicked!');
    if (wavesurfer) {
        // Since we can't play the actual audio due to CORS, show region info instead
        const regionInfo = `Selected region: ${selectedRegion.start.toFixed(2)}s - ${selectedRegion.end.toFixed(2)}s (Duration: ${(selectedRegion.end - selectedRegion.start).toFixed(2)}s)`;
        alert(`Audio preview not available due to CORS restrictions.\n\n${regionInfo}\n\nYou can still download the trimmed MP3 with the selected region.`);
    } else {
        console.warn('WaveSurfer not ready');
    }
});

downloadBtn.addEventListener('click', async () => {
    console.log('Download button clicked!');
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

console.log('Application setup complete!');
} // End of initializeApp function

// Expose the initialization function globally
window.initializeApp = initializeApp;