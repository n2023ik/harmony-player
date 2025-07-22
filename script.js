document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const audio = document.getElementById('audio');
    const playBtn = document.getElementById('play-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.querySelector('.progress-container');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeIcon = document.getElementById('volume-icon');
    const playlistEl = document.getElementById('playlist');
    const songTitleEl = document.getElementById('song-title');
    const artistEl = document.getElementById('artist');
    const albumCoverEl = document.getElementById('album-cover');
    const musicPlayerEl = document.querySelector('.music-player');
    const fileUpload = document.getElementById('file-upload');
    
    // Player state
    let songs = [
        {
            id: 1,
            title: 'Gabru',
            artist: 'Yo Yo Honey Singh',
            cover: 'https://placehold.co/300x300?text=Gabru',
            file: 'https://files.catbox.moe/vakfiu.mp3'
        },
        {
            id: 2,
            title: 'Amplifier',
            artist: 'Imran Khan',
            cover: 'https://placehold.co/300x300?text=Amplifier',
            file: 'https://files.catbox.moe/ulzv52.mp3'
        },
        {
            id: 3,
            title: 'No Competition',
            artist: 'Jass Manak',
            cover: 'https://placehold.co/300x300?text=No+Competition',
            file: 'https://files.catbox.moe/cf0vjx.mp3'
        },
        {
            id: 4,
            title: 'Bazzigar',
            artist: 'Divine',
            cover: 'https://placehold.co/300x300?text=Bazzigar',
            file: 'https://files.catbox.moe/3cvl2f.mp3'
        }
    ];
    let currentSongIndex = 0;
    let isPlaying = false;
    let isShuffled = false;
    let isRepeat = false;
    let originalOrder = [];
    
    // Initialize
    function init() {
        renderPlaylist();
        loadSong(songs[currentSongIndex]);
        audio.volume = volumeSlider.value;
    }
    
    // Load song
    function loadSong(song) {
        songTitleEl.textContent = song.title || 'Unknown Title';
        artistEl.textContent = song.artist || 'Unknown Artist';
        albumCoverEl.src = song.cover || 'https://placehold.co/300x300?text=No+Image';
        audio.src = song.file;
        
        // Add animation class
        songTitleEl.classList.add('song-change-animation');
        artistEl.classList.add('song-change-animation');
        albumCoverEl.classList.add('song-change-animation');
        
        // Remove animation class after animation ends
        setTimeout(() => {
            songTitleEl.classList.remove('song-change-animation');
            artistEl.classList.remove('song-change-animation');
            albumCoverEl.classList.remove('song-change-animation');
        }, 500);
        
        // Update active song in playlist
        updateActiveSong();
        
        // Play if player was playing
        if (isPlaying) {
            playSong();
        }
    }
    
    // Play song
    function playSong() {
        isPlaying = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        playBtn.setAttribute('title', 'Pause');
        musicPlayerEl.classList.add('playing');
        audio.play()
            .then(() => {
                // Update duration display
                updateDurationDisplay();
            })
            .catch(error => {
                console.error('Playback failed:', error);
                isPlaying = false;
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
                playBtn.setAttribute('title', 'Play');
                musicPlayerEl.classList.remove('playing');
            });
    }
    
    // Pause song
    function pauseSong() {
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        playBtn.setAttribute('title', 'Play');
        musicPlayerEl.classList.remove('playing');
        audio.pause();
    }
    
    // Previous song
    function prevSong() {
        currentSongIndex--;
        if (currentSongIndex < 0) {
            currentSongIndex = songs.length - 1;
        }
        loadSong(songs[currentSongIndex]);
        if (isPlaying) {
            playSong();
        }
    }
    
    // Next song
    function nextSong() {
        if (isRepeat) {
            audio.currentTime = 0;
            audio.play();
            return;
        }
        
        currentSongIndex++;
        if (currentSongIndex > songs.length - 1) {
            currentSongIndex = 0;
        }
        loadSong(songs[currentSongIndex]);
        if (isPlaying) {
            playSong();
        }
    }
    
    // Shuffle playlist
    function shufflePlaylist() {
        isShuffled = !isShuffled;
        shuffleBtn.style.color = isShuffled ? 'var(--primary-color)' : 'var(--text-color)';
        
        if (isShuffled) {
            originalOrder = [...songs];
            const currentSong = songs[currentSongIndex];
            
            // Create a new array without the current song
            let shuffledSongs = songs.filter((_, index) => index !== currentSongIndex);
            
            // Shuffle the array
            for (let i = shuffledSongs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledSongs[i], shuffledSongs[j]] = [shuffledSongs[j], shuffledSongs[i]];
            }
            
            // Put current song back at the beginning
            songs = [currentSong, ...shuffledSongs];
            currentSongIndex = 0;
        } else {
            if (originalOrder.length > 0) {
                // Find the index of the current song in the original order
                const currentSongId = songs[currentSongIndex].id;
                songs = [...originalOrder];
                currentSongIndex = songs.findIndex(song => song.id === currentSongId);
                originalOrder = [];
            }
        }
        
        renderPlaylist();
    }
    
    // Toggle repeat
    function toggleRepeat() {
        isRepeat = !isRepeat;
        repeatBtn.style.color = isRepeat ? 'var(--primary-color)' : 'var(--text-color)';
    }
    
    // Update progress bar
    function updateProgress(e) {
        if (isPlaying) {
            const { duration, currentTime } = e.srcElement;
            const progressPercent = (currentTime / duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
            
            // Update current time display
            updateTimeDisplay(currentTime);
        }
    }
    
    // Update duration display
    function updateDurationDisplay() {
        const duration = audio.duration;
        if (duration) {
            const durationMinutes = Math.floor(duration / 60);
            let durationSeconds = Math.floor(duration % 60);
            if (durationSeconds < 10) {
                durationSeconds = `0${durationSeconds}`;
            }
            durationEl.textContent = `${durationMinutes}:${durationSeconds}`;
        }
    }
    
    // Update time display
    function updateTimeDisplay(currentTime) {
        const currentMinutes = Math.floor(currentTime / 60);
        let currentSeconds = Math.floor(currentTime % 60);
        if (currentSeconds < 10) {
            currentSeconds = `0${currentSeconds}`;
        }
        currentTimeEl.textContent = `${currentMinutes}:${currentSeconds}`;
    }
    
    // Set progress bar when clicked
    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;
        audio.currentTime = (clickX / width) * duration;
    }
    
    // Set volume
    function setVolume() {
        const volume = this.value;
        audio.volume = volume;
        
        // Update volume icon
        if (volume == 0) {
            volumeIcon.className = 'fas fa-volume-mute';
        } else if (volume < 0.5) {
            volumeIcon.className = 'fas fa-volume-down';
        } else {
            volumeIcon.className = 'fas fa-volume-up';
        }
    }
    
    // Remove file upload functionality
    
    // Render playlist
    function renderPlaylist() {
        if (songs.length === 0) {
            // updateEmptyPlaylistState(); // Removed
            return;
        }
        
        playlistEl.innerHTML = '';
        
        songs.forEach((song, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="song-number">${index + 1}</span>
                <div class="song-details">
                    <div class="song-title">${song.title}</div>
                    <div class="song-artist">${song.artist}</div>
                </div>
                <span class="song-duration">--:--</span>
            `;
            
            li.addEventListener('click', () => {
                currentSongIndex = index;
                loadSong(songs[currentSongIndex]);
                playSong();
            });
            
            playlistEl.appendChild(li);
        });
        
        updateActiveSong();
    }
    
    // Update active song in playlist
    function updateActiveSong() {
        const playlistItems = playlistEl.querySelectorAll('li');
        playlistItems.forEach(item => item.classList.remove('playing'));
        
        if (playlistItems[currentSongIndex]) {
            playlistItems[currentSongIndex].classList.add('playing');
            
            // Scroll to the active song
            playlistItems[currentSongIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }
    
    // Event listeners
    playBtn.addEventListener('click', () => {
        if (songs.length === 0) return;
        isPlaying ? pauseSong() : playSong();
    });
    
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);
    shuffleBtn.addEventListener('click', shufflePlaylist);
    repeatBtn.addEventListener('click', toggleRepeat);
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextSong);
    audio.addEventListener('loadedmetadata', updateDurationDisplay);
    
    progressContainer.addEventListener('click', setProgress);
    
    volumeSlider.addEventListener('input', setVolume);
    
    // Remove file upload event listener
    
    // Initialize
    init();
});
