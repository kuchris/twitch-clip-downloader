document.addEventListener('DOMContentLoaded', () => {
    const twitchUrlInput = document.getElementById('twitch-url');
    const getClipBtn = document.getElementById('get-clip-btn');
    const editorSection = document.querySelector('.editor-section');
    const video = document.getElementById('clip-video');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const downloadBtn = document.getElementById('download-btn');
    const loadingSection = document.querySelector('.loading-section');

    const backendUrl = 'https://twitch-clip-downloader-backend.onrender.com';

    getClipBtn.addEventListener('click', async () => {
        const url = twitchUrlInput.value;
        if (!url) {
            alert('Please enter a Twitch clip URL.');
            return;
        }

        editorSection.style.display = 'none'; // Hide until we get the URL
        loadingSection.style.display = 'block'; // Show loading indicator

        try {
            const response = await fetch(`${backendUrl}/get-clip-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            if (response.ok) {
                const data = await response.json();
                video.src = data.clipUrl;
                editorSection.style.display = 'block'; // Show editor
            } else {
                const errorText = await response.text();
                alert(`Error: ${errorText}`);
            }
        } catch (error) {
            console.error('Error getting clip URL:', error);
            alert('An error occurred while getting the clip URL.');
        } finally {
            loadingSection.style.display = 'none'; // Hide loading indicator
        }
    });

    video.addEventListener('loadedmetadata', () => {
        startTimeInput.value = 0;
        endTimeInput.value = Math.floor(video.duration);
    });


    downloadBtn.addEventListener('click', async () => {
        const url = twitchUrlInput.value;
        const start = parseFloat(startTimeInput.value);
        const end = parseFloat(endTimeInput.value);

        if (!url) {
            alert('Please enter a Twitch clip URL.');
            return;
        }

        if (start >= end) {
            alert('Start time must be less than end time.');
            return;
        }

        loadingSection.style.display = 'block';

        try {
            const response = await fetch(`${backendUrl}/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url, start, end })
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
});