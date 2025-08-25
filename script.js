document.addEventListener('DOMContentLoaded', () => {
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

    const backendUrl = 'https://twitch-clip-downloader-backend.onrender.com';
    let wavesurfer = null;
    let selectedRegion = { start: 0, end: 0 };

    getClipBtn.addEventListener('click', async () => {
        const url = twitchUrlInput.value;
        if (!url) {
            alert('Please enter a Twitch clip URL.');
            return;
        }

        editorSection.style.display = 'none';
        loadingSection.style.display = 'block';

        // Clean up previous wavesurfer instance
        if (wavesurfer) {
            wavesurfer.destroy();
            wavesurfer = null;
        }

        try {
            const response = await fetch(`${backendUrl}/get-clip-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Set up video element
                video.src = data.clipUrl;
                video.crossOrigin = 'anonymous';
                
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
                    plugins: [
                        WaveSurfer.Timeline.create({
                            container: '#wave-timeline',
                            height: 20,
                            timeInterval: 1,
                            primaryLabelInterval: 5,
                            style: {
                                fontSize: '10px',
                                color: '#fff'
                            }
                        }),
                        WaveSurfer.Regions.create()
                    ]
                });

                // Load the audio from the video URL
                await wavesurfer.load(data.clipUrl);

                wavesurfer.on('ready', () => {
                    const duration = wavesurfer.getDuration();
                    
                    // Clear any existing regions
                    wavesurfer.regions.clear();
                    
                    // Add initial region covering the entire duration
                    const region = wavesurfer.regions.addRegion({
                        start: 0,
                        end: duration,
                        color: 'rgba(100, 65, 165, 0.2)',
                        drag: true,
                        resize: true,
                    });

                    selectedRegion = { start: 0, end: duration };

                    // Show the editor section
                    videoContainer.style.display = 'block';
                    editorSection.style.display = 'block';
                    loadingSection.style.display = 'none';
                });

                // Handle region updates
                wavesurfer.on('region-updated', (region) => {
                    selectedRegion.start = region.start;
                    selectedRegion.end = region.end;
                });

                // Handle errors
                wavesurfer.on('error', (error) => {
                    console.error('Wavesurfer error:', error);
                    alert('Error loading audio waveform. Please try again.');
                    loadingSection.style.display = 'none';
                });

            } else {
                const errorText = await response.text();
                alert(`Error: ${errorText}`);
                loadingSection.style.display = 'none';
            }
        } catch (error) {
            console.error('Error getting clip URL:', error);
            alert('An error occurred while getting the clip URL.');
            loadingSection.style.display = 'none';
        }
    });

    playBtn.addEventListener('click', () => {
        if (wavesurfer && wavesurfer.isReady) {
            wavesurfer.playPause();
        }
    });

    downloadBtn.addEventListener('click', async () => {
        const url = twitchUrlInput.value;
        if (!url) {
            alert('Please enter a Twitch clip URL.');
            return;
        }

        if (selectedRegion.start >= selectedRegion.end) {
            alert('Start time must be less than end time.');
            return;
        }

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
            } else {
                const errorText = await response.text();
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