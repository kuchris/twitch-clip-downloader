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

        // This is a simplified way to get the video src.
        // In a real app, you'd want to use the backend to get the direct URL
        // to avoid CORS issues and to handle different clip URL formats.
        // For this example, we'll just show the editor.
        editorSection.style.display = 'block';

        // A more robust solution would be to have an endpoint that returns the video URL
        // and then set it as the video src. For now, we can't directly load the twitch clip
        // due to CORS. The user will have to use the download button directly.
        // We will show the editor so they can set the start and end times.
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