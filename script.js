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
    const playlistSearch = document.getElementById('playlist-search');
    
    // Player state
    let songs = [
        {
            id: 1,
            title: 'Gabru',
            artist: 'Yo Yo Honey Singh',
            cover: 'https://placehold.co/300x300/6c5ce7/ffffff?text=Gabru',
            file: 'https://files.catbox.moe/vakfiu.mp3'
        },
        {
            id: 2,
            title: 'Amplifier',
            artist: 'Imran Khan',
            cover: 'https://placehold.co/300x300/a29bfe/ffffff?text=Amplifier',
            file: 'https://files.catbox.moe/ulzv52.mp3'
        },
        {
            id: 3,
            title: 'No Competition',
            artist: 'Jass Manak',
            cover: 'https://placehold.co/300x300/00b894/ffffff?text=No+Comp',
            file: 'https://files.catbox.moe/cf0vjx.mp3'
        },
        {
            id: 4,
            title: 'Baazigar',
            artist: 'Divine',
            cover: 'https://placehold.co/300x300/fd79a8/ffffff?text=Baazigar',
            file: 'https://files.catbox.moe/3cvl2f.mp3'
        }
    ];
    let currentSongIndex = 0;
    let isPlaying = false;
    let isShuffled = false;
    let isRepeat = false;
    let originalOrder = [];
    let filteredSongs = null;
    
    // Initialize
    function init() {
        renderPlaylist();
        loadSong(songs[currentSongIndex]);
        audio.volume = volumeSlider.value;
    }
    
    // Load song details into DOM
    function loadSong(song) {
        if (!song) return;
        songTitleEl.textContent = song.title || 'Unknown Title';
        artistEl.textContent = song.artist || 'Unknown Artist';
        albumCoverEl.src = song.cover || 'https://placehold.co/300x300?text=No+Image';
        audio.src = song.file;
        
        songTitleEl.classList.add('song-change-animation');
        artistEl.classList.add('song-change-animation');
        
        setTimeout(() => {
            songTitleEl.classList.remove('song-change-animation');
            artistEl.classList.remove('song-change-animation');
        }, 500);
        
        updateActiveSong();
        if (isPlaying) playSong();
    }
    
    // Play song
    function playSong() {
        isPlaying = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        playBtn.setAttribute('title', 'Pause');
        musicPlayerEl.classList.add('playing');
        audio.play().catch(error => console.error('Playback failed:', error));
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
    }
    
    // Next song
    function nextSong() {
        if (isRepeat) {
            audio.currentTime = 0;
            playSong();
            return;
        }
        
        currentSongIndex++;
        if (currentSongIndex > songs.length - 1) {
            currentSongIndex = 0;
        }
        loadSong(songs[currentSongIndex]);
    }
    
    // Shuffle playlist
    function shufflePlaylist() {
        isShuffled = !isShuffled;
        shuffleBtn.classList.toggle('active', isShuffled);
        
        if (isShuffled) {
            originalOrder = [...songs];
            const currentSong = songs[currentSongIndex];
            let shuffledSongs = songs.filter((_, index) => index !== currentSongIndex);
            
            for (let i = shuffledSongs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledSongs[i], shuffledSongs[j]] = [shuffledSongs[j], shuffledSongs[i]];
            }
            
            songs = [currentSong, ...shuffledSongs];
            currentSongIndex = 0;
        } else {
            if (originalOrder.length > 0) {
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
        repeatBtn.classList.toggle('active', isRepeat);
    }
    
    // Update progress bar
    function updateProgress(e) {
        const { duration, currentTime } = e.srcElement;
        const progressPercent = (currentTime / duration) * 100;
        progressBar.style.width = `${progressPercent}%`;
        
        updateTimeDisplay(currentTimeEl, currentTime);
    }

    // Format and update time display
    function updateTimeDisplay(element, time) {
        if (isNaN(time)) return;
        const minutes = Math.floor(time / 60);
        let seconds = Math.floor(time % 60);
        seconds = seconds < 10 ? `0${seconds}` : seconds;
        element.textContent = `${minutes}:${seconds}`;
    }

    // Set progress bar when clicked
    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;
        if(duration) {
            audio.currentTime = (clickX / width) * duration;
        }
    }
    
    // Set volume
    function setVolume() {
        audio.volume = this.value;
        
        if (audio.volume == 0) {
            volumeIcon.className = 'fas fa-volume-mute';
        } else if (audio.volume < 0.5) {
            volumeIcon.className = 'fas fa-volume-down';
        } else {
            volumeIcon.className = 'fas fa-volume-up';
        }
    }
    
    // Render playlist
    function renderPlaylist() {
        const displaySongs = filteredSongs !== null ? filteredSongs : songs;
        playlistEl.innerHTML = '';

        if (displaySongs.length === 0) {
            playlistEl.innerHTML = `<li class="empty-playlist"><i class="fas fa-music"></i><p>No songs found</p></li>`;
            return;
        }

        displaySongs.forEach((song, index) => {
            const li = document.createElement('li');
            li.setAttribute('data-id', song.id);
            li.innerHTML = `
                <span class="song-number">${index + 1}</span>
                <div class="song-details">
                    <div class="song-title">${song.title}</div>
                    <div class="song-artist">${song.artist}</div>
                </div>
            `;
            li.addEventListener('click', () => {
                const realIndex = songs.findIndex(s => s.id === song.id);
                if (realIndex !== -1) {
                    currentSongIndex = realIndex;
                    loadSong(songs[currentSongIndex]);
                    playSong();
                }
            });
            playlistEl.appendChild(li);
        });
        updateActiveSong();
    }
    
    // Update active song styling in playlist
    function updateActiveSong() {
        const currentSongId = songs[currentSongIndex]?.id;
        const playlistItems = playlistEl.querySelectorAll('li');
        playlistItems.forEach(item => {
            if (item.dataset.id == currentSongId) {
                item.classList.add('playing');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                item.classList.remove('playing');
            }
        });
    }

    // Search/filter playlist
    function filterPlaylist() {
        const query = this.value.trim().toLowerCase();
        if (query === '') {
            filteredSongs = null;
        } else {
            filteredSongs = songs.filter(song =>
                song.title.toLowerCase().includes(query) ||
                song.artist.toLowerCase().includes(query)
            );
        }
        renderPlaylist();
    }
    
    // Event Listeners
    playBtn.addEventListener('click', () => isPlaying ? pauseSong() : playSong());
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);
    shuffleBtn.addEventListener('click', shufflePlaylist);
    repeatBtn.addEventListener('click', toggleRepeat);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextSong);
    audio.addEventListener('loadedmetadata', () => updateTimeDisplay(durationEl, audio.duration));
    progressContainer.addEventListener('click', setProgress);
    volumeSlider.addEventListener('input', setVolume);
    playlistSearch.addEventListener('input', filterPlaylist);
    
    // Initialize Player
    init();
});
