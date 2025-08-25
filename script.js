document.addEventListener('DOMContentLoaded', () => {
    // Check if WaveSurfer is loaded
    if (typeof WaveSurfer === 'undefined') {
        console.error('WaveSurfer.js is not loaded!');
        alert('WaveSurfer.js library failed to load. Please check your internet connection.');
        return;
    }

    console.log('WaveSurfer loaded successfully:', WaveSurfer);

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

    // Try to use localhost if backend is running locally, otherwise use the deployed version
    const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000' 
        : 'https://twitch-clip-downloader-backend.onrender.com';
    
    console.log('Using backend URL:', backendUrl);
    
    let wavesurfer = null;
    let selectedRegion = { start: 0, end: 0 };

    getClipBtn.addEventListener('click', async () => {
        const url = twitchUrlInput.value.trim();
        if (!url) {
            alert('Please enter a Twitch clip URL.');
            return;
        }

        console.log('Processing URL:', url);
        
        editorSection.style.display = 'none';
        loadingSection.style.display = 'block';

        // Clean up previous wavesurfer instance
        if (wavesurfer) {
            try {
                wavesurfer.destroy();
            } catch (e) {
                console.warn('Error destroying previous wavesurfer:', e);
            }
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

                // Set up video element first
                video.src = data.clipUrl;
                video.load();
                
                console.log('Creating WaveSurfer instance...');
                
                // Create wavesurfer instance
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
                    plugins: [
                        WaveSurfer.regions.create(),
                    ]
                });

                console.log('WaveSurfer instance created, loading audio...');

                // Load the audio
                wavesurfer.load(data.clipUrl);

                wavesurfer.on('ready', () => {
                    console.log('WaveSurfer ready');
                    const duration = wavesurfer.getDuration();
                    console.log('Audio duration:', duration);
                    
                    // Add initial region covering the entire duration
                    const region = wavesurfer.plugins[0].addRegion({
                        start: 0,
                        end: duration,
                        color: 'rgba(100, 65, 165, 0.3)',
                        drag: true,
                        resize: true,
                    });

                    selectedRegion = { start: 0, end: duration };

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
                    console.log('Region updated:', selectedRegion);
                });

                // Handle errors
                wavesurfer.on('error', (error) => {
                    console.error('Wavesurfer error:', error);
                    alert('Error loading audio waveform. The clip might not support audio extraction.');
                    loadingSection.style.display = 'none';
                });

                // Handle loading
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
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                alert('Cannot connect to backend server. Please check if the backend is running.');
            } else {
                alert(`An error occurred: ${error.message}`);
            }
            
            loadingSection.style.display = 'none';
        }
    });

    playBtn.addEventListener('click', () => {
        if (wavesurfer && wavesurfer.isReady) {
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
            alert('Start time must be less than end time.');
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
                a.download = 'clip.mp3';
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
});