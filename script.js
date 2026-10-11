
document.addEventListener('DOMContentLoaded', () => {
    // ==================== DOM ELEMENTS ====================
    const audio = document.getElementById('audio');
    const playBtn = document.getElementById('play-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeIcon = document.getElementById('volume-icon');
    const volumeBtn = document.getElementById('volume-btn');
    const playlistEl = document.getElementById('playlist');
    const playlistScroll = document.getElementById('playlist-scroll');
    const songTitleEl = document.getElementById('song-title');
    const artistEl = document.getElementById('artist');
    const albumCoverEl = document.getElementById('album-cover');
    const musicPlayerEl = document.querySelector('.music-player');
    const playlistSearch = document.getElementById('playlist-search');
    const statusEl = document.getElementById('status-msg');

    // ==================== MUSIC LIBRARY ====================
    // IMPORTANT: Use direct MP3 URLs, NOT Markdown links.
    // Replace any URL that does not load with a working MP3 URL.
    const library = [
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

    // ==================== PLAYER STATE ====================
    let songs = [...library];
    let currentSongIndex = 0;
    let isPlaying = false;
    let isShuffled = false;
    let isRepeat = false;
    let lastVolume = 0.7;
    let loadRequest = 0;
    let failedSongs = new Set();
    let lastSongId = null;

    // ==================== SAFE STORAGE ====================
    const store = {
        get(key, fallback) {
            try {
                const value = localStorage.getItem('harmony:' + key);
                return value === null ? fallback : JSON.parse(value);
            } catch {
                return fallback;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(
                    'harmony:' + key,
                    JSON.stringify(value)
                );
            } catch {
                // Storage may be unavailable.
            }
        }
    };

    // ==================== HELPERS ====================
    function formatTime(time) {
        if (!Number.isFinite(time) || time < 0) return '0:00';

        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);

        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }

    function showStatus(message = '') {
        statusEl.textContent = message;
    }

    function currentSong() {
        return songs[currentSongIndex];
    }

    // ==================== INITIALIZATION ====================
    function init() {
        const savedVolume = Number(store.get('volume', 0.7));
        setVolume(Number.isFinite(savedVolume) ? savedVolume : 0.7);

        isRepeat = Boolean(store.get('repeat', false));
        isShuffled = Boolean(store.get('shuffle', false));

        repeatBtn.classList.toggle('active', isRepeat);
        repeatBtn.setAttribute('aria-pressed', String(isRepeat));

        shuffleBtn.classList.toggle('active', isShuffled);
        shuffleBtn.setAttribute('aria-pressed', String(isShuffled));

        const savedSongId = store.get('lastSong', 1);
        const savedIndex = library.findIndex(
            song => song.id === savedSongId
        );

        if (savedIndex !== -1) {
            currentSongIndex = savedIndex;
        }

        if (isShuffled) {
            shuffleOrder(false);
        }

        renderPlaylist();
        loadSong(currentSong(), false);
    }

    // ==================== SONG LOADING ====================
    function loadSong(song, autoplay = isPlaying) {
        if (!song) return;

        // Ignore events from an earlier loading request.
        const requestId = ++loadRequest;
        lastSongId = song.id;

        showStatus('');
        failedSongs.delete(song.id);

        songTitleEl.textContent = song.title;
        artistEl.textContent = song.artist;
        albumCoverEl.src = song.cover;
        albumCoverEl.alt = `${song.title} cover`;

        progressBar.style.width = '0%';
        progressContainer.setAttribute('aria-valuenow', '0');

        currentTimeEl.textContent = '0:00';
        durationEl.textContent = '0:00';

        document.title = `${song.title} – Harmony Player`;

        audio.pause();
        audio.src = song.file;
        audio.load();

        store.set('lastSong', song.id);

        updateActiveSong();
        updateMediaSession(song);

        songTitleEl.classList.remove('song-change-animation');
        artistEl.classList.remove('song-change-animation');

        void songTitleEl.offsetWidth;

        songTitleEl.classList.add('song-change-animation');
        artistEl.classList.add('song-change-animation');

        setTimeout(() => {
            if (requestId !== loadRequest) return;

            songTitleEl.classList.remove('song-change-animation');
            artistEl.classList.remove('song-change-animation');
        }, 500);

        if (autoplay) {
            playSong();
        } else {
            setPlayingUI(false);
        }
    }

    // ==================== PLAYBACK ====================
    function setPlayingUI(playing) {
        isPlaying = playing;

        playBtn.innerHTML = playing
            ? '<i class="fas fa-pause"></i>'
            : '<i class="fas fa-play"></i>';

        const label = playing ? 'Pause' : 'Play';

        playBtn.title = `${label} (Space)`;
        playBtn.setAttribute('aria-label', label);

        musicPlayerEl.classList.toggle('playing', playing);

        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState =
                playing ? 'playing' : 'paused';
        }
    }

    async function playSong() {
        if (!currentSong()) return;

        try {
            showStatus('');

            await audio.play();

            // The user may have selected another song while loading.
            if (!audio.paused) {
                setPlayingUI(true);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;

            setPlayingUI(false);

            console.error('Playback failed:', {
                song: currentSong()?.title,
                url: audio.currentSrc,
                error
            });

            showStatus(
                'Unable to play this track. Check its audio URL.'
            );
        }
    }

    function pauseSong() {
        audio.pause();
        setPlayingUI(false);
    }

    function togglePlay() {
        if (isPlaying) {
            pauseSong();
        } else {
            playSong();
        }
    }

    function prevSong() {
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }

        currentSongIndex =
            (currentSongIndex - 1 + songs.length) % songs.length;

        loadSong(currentSong());
    }

    function nextSong() {
        if (!songs.length) return;

        currentSongIndex = (currentSongIndex + 1) % songs.length;
        loadSong(currentSong());
    }

    function handleEnded() {
        if (isRepeat) {
            audio.currentTime = 0;
            playSong();
        } else {
            nextSong();
        }
    }

    // ==================== SHUFFLE ====================
    function shuffleOrder(updateState = true) {
        const activeId = currentSong()?.id;

        songs = [...library];

        // Keep the selected song at the front when enabling shuffle.
        if (isShuffled) {
            const selected = songs.find(song => song.id === activeId);

            const remaining = songs.filter(
                song => song.id !== activeId
            );

            for (let i = remaining.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [remaining[i], remaining[j]] =
                    [remaining[j], remaining[i]];
            }

            songs = selected ? [selected, ...remaining] : remaining;
        }

        currentSongIndex = songs.findIndex(
            song => song.id === activeId
        );

        if (currentSongIndex < 0) currentSongIndex = 0;

        if (updateState) {
            shuffleBtn.classList.toggle('active', isShuffled);
            shuffleBtn.setAttribute('aria-pressed', String(isShuffled));
            store.set('shuffle', isShuffled);
            renderPlaylist();
        }
    }

    function toggleShuffle() {
        isShuffled = !isShuffled;
        shuffleOrder(true);
    }

    // ==================== REPEAT ====================
    function toggleRepeat() {
        isRepeat = !isRepeat;

        repeatBtn.classList.toggle('active', isRepeat);
        repeatBtn.setAttribute('aria-pressed', String(isRepeat));

        store.set('repeat', isRepeat);
    }

    // ==================== PROGRESS ====================
    function updateProgress() {
        const { duration, currentTime } = audio;

        if (Number.isFinite(duration) && duration > 0) {
            const percent = (currentTime / duration) * 100;

            progressBar.style.width = `${percent}%`;
            progressContainer.setAttribute(
                'aria-valuenow',
                String(Math.round(percent))
            );
        }

        currentTimeEl.textContent = formatTime(currentTime);
    }

    function seekToPointer(event) {
        const rect = progressContainer.getBoundingClientRect();

        if (!rect.width || !Number.isFinite(audio.duration)) return;

        const ratio = Math.max(
            0,
            Math.min((event.clientX - rect.left) / rect.width, 1)
        );

        audio.currentTime = ratio * audio.duration;
        updateProgress();
    }

    function seekBy(seconds) {
        if (!Number.isFinite(audio.duration)) return;

        audio.currentTime = Math.max(
            0,
            Math.min(audio.currentTime + seconds, audio.duration)
        );
    }

    let dragging = false;

    progressContainer.addEventListener('pointerdown', event => {
        dragging = true;
        progressContainer.setPointerCapture(event.pointerId);
        seekToPointer(event);
    });

    progressContainer.addEventListener('pointermove', event => {
        if (dragging) seekToPointer(event);
    });

    function stopDragging() {
        dragging = false;
    }

    progressContainer.addEventListener('pointerup', stopDragging);
    progressContainer.addEventListener('pointercancel', stopDragging);

    progressContainer.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') {
            seekBy(-5);
            event.preventDefault();
            event.stopPropagation();
        }

        if (event.key === 'ArrowRight') {
            seekBy(5);
            event.preventDefault();
            event.stopPropagation();
        }
    });

    // ==================== VOLUME ====================
    function updateVolumeIcon() {
        const volume = audio.muted ? 0 : audio.volume;

        volumeIcon.className =
            volume === 0
                ? 'fas fa-volume-mute'
                : volume < 0.5
                    ? 'fas fa-volume-down'
                    : 'fas fa-volume-up';
    }

    function setVolume(value) {
        const volume = Math.max(
            0,
            Math.min(Number(value) || 0, 1)
        );

        audio.volume = volume;
        audio.muted = false;
        volumeSlider.value = String(volume);

        if (volume > 0) lastVolume = volume;

        store.set('volume', volume);
        updateVolumeIcon();
    }

    function toggleMute() {
        if (audio.volume === 0 || audio.muted) {
            setVolume(lastVolume || 0.7);
        } else {
            lastVolume = audio.volume;
            audio.volume = 0;
            audio.muted = true;
            volumeSlider.value = '0';
            updateVolumeIcon();
        }
    }

    // ==================== PLAYLIST SEARCH ====================
    function getDisplaySongs() {
        const query = playlistSearch.value.trim().toLowerCase();

        if (!query) return songs;

        return songs.filter(song =>
            song.title.toLowerCase().includes(query) ||
            song.artist.toLowerCase().includes(query)
        );
    }

    function renderPlaylist() {
        const displaySongs = getDisplaySongs();

        playlistEl.textContent = '';

        if (!displaySongs.length) {
            const li = document.createElement('li');
            li.className = 'empty-playlist';

            const icon = document.createElement('i');
            icon.className = 'fas fa-music';

            const message = document.createElement('p');
            message.textContent = 'No songs found';

            li.append(icon, message);
            playlistEl.appendChild(li);
            return;
        }

        displaySongs.forEach((song, index) => {
            const li = document.createElement('li');

            li.dataset.id = String(song.id);
            li.tabIndex = 0;
            li.setAttribute('role', 'button');
            li.setAttribute(
                'aria-label',
                `Play ${song.title} by ${song.artist}`
            );

            const number = document.createElement('span');
            number.className = 'song-number';
            number.textContent = String(index + 1);

            const details = document.createElement('div');
            details.className = 'song-details';

            const title = document.createElement('div');
            title.className = 'song-title';
            title.textContent = song.title;

            const artist = document.createElement('div');
            artist.className = 'song-artist';
            artist.textContent = song.artist;

            details.append(title, artist);
            li.append(number, details);

            function chooseSong() {
                const realIndex = songs.findIndex(
                    item => item.id === song.id
                );

                if (realIndex === -1) return;

                currentSongIndex = realIndex;
                loadSong(currentSong(), true);
            }

            li.addEventListener('click', chooseSong);

            li.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    chooseSong();
                }
            });

            playlistEl.appendChild(li);
        });

        updateActiveSong();
    }

    function updateActiveSong() {
        const activeId = currentSong()?.id;

        playlistEl.querySelectorAll('li[data-id]').forEach(item => {
            const active = Number(item.dataset.id) === activeId;

            item.classList.toggle('playing', active);
            item.setAttribute('aria-pressed', String(active));

            if (active) {
                const top =
                    item.offsetTop -
                    playlistScroll.clientHeight / 2 +
                    item.clientHeight / 2;

                playlistScroll.scrollTo({
                    top: Math.max(0, top),
                    behavior: 'smooth'
                });
            }
        });
    }

    // ==================== MEDIA SESSION ====================
    function updateMediaSession(song) {
        if (!('mediaSession' in navigator)) return;
        if (typeof MediaMetadata === 'undefined') return;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: song.artist,
            artwork: [{
                src: song.cover,
                sizes: '300x300',
                type: 'image/png'
            }]
        });
    }

    if ('mediaSession' in navigator) {
        try {
            navigator.mediaSession.setActionHandler('play', playSong);
            navigator.mediaSession.setActionHandler('pause', pauseSong);
            navigator.mediaSession.setActionHandler('previoustrack', prevSong);
            navigator.mediaSession.setActionHandler('nexttrack', nextSong);
        } catch (error) {
            console.warn('Media controls unavailable:', error);
        }
    }

    // ==================== KEYBOARD SHORTCUTS ====================
    document.addEventListener('keydown', event => {
        const target = event.target;
        const tag = (target.tagName || '').toLowerCase();

        if (
            tag === 'input' ||
            tag === 'textarea' ||
            target.isContentEditable
        ) return;

        if (event.ctrlKey || event.metaKey || event.altKey) return;

        if (
            tag === 'button' &&
            (event.key === ' ' || event.key === 'Enter')
        ) return;

        switch (event.key) {
            case ' ':
                event.preventDefault();
                togglePlay();
                break;

            case 'ArrowRight':
                seekBy(5);
                break;

            case 'ArrowLeft':
                seekBy(-5);
                break;

            case 'ArrowUp':
                event.preventDefault();
                setVolume(audio.volume + 0.05);
                break;

            case 'ArrowDown':
                event.preventDefault();
                setVolume(audio.volume - 0.05);
                break;

            case 'n':
            case 'N':
                nextSong();
                break;

            case 'p':
            case 'P':
                prevSong();
                break;

            case 's':
            case 'S':
                toggleShuffle();
                break;

            case 'r':
            case 'R':
                toggleRepeat();
                break;

            case 'm':
            case 'M':
                toggleMute();
                break;
        }
    });

    // ==================== EVENT LISTENERS ====================
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);
    volumeBtn.addEventListener('click', toggleMute);

    volumeSlider.addEventListener('input', () => {
        setVolume(volumeSlider.value);
    });

    playlistSearch.addEventListener('input', renderPlaylist);

    audio.addEventListener('timeupdate', updateProgress);

    audio.addEventListener('ended', handleEnded);

    audio.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('playing', () => {
        setPlayingUI(true);
        showStatus('');
    });

    audio.addEventListener('pause', () => {
        if (audio.ended) return;
        setPlayingUI(false);
    });

    // Report failures without repeatedly skipping songs.
    audio.addEventListener('error', () => {
        const song = currentSong();

        if (!song || failedSongs.has(song.id)) return;

        failedSongs.add(song.id);
        setPlayingUI(false);

        console.error('Audio loading error:', {
            title: song.title,
            url: audio.currentSrc || song.file,
            errorCode: audio.error?.code,
            errorMessage: audio.error?.message
        });

        showStatus(
            `${song.title} could not load. Check the MP3 URL.`
        );
    });

    // ==================== START PLAYER ====================
    init();
});
