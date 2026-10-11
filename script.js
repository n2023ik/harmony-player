document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
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

    // Library (original order is kept separately so shuffle can be undone)
    const library = [
        { id: 1, title: 'Gabru', artist: 'Yo Yo Honey Singh', cover: 'https://placehold.co/300x300/6c5ce7/ffffff?text=Gabru', file: 'https://files.catbox.moe/vakfiu.mp3' },
        { id: 2, title: 'Amplifier', artist: 'Imran Khan', cover: 'https://placehold.co/300x300/a29bfe/ffffff?text=Amplifier', file: 'https://files.catbox.moe/ulzv52.mp3' },
        { id: 3, title: 'No Competition', artist: 'Jass Manak', cover: 'https://placehold.co/300x300/00b894/ffffff?text=No+Comp', file: 'https://files.catbox.moe/cf0vjx.mp3' },
        { id: 4, title: 'Baazigar', artist: 'Divine', cover: 'https://placehold.co/300x300/fd79a8/ffffff?text=Baazigar', file: 'https://files.catbox.moe/3cvl2f.mp3' }
    ];

    // Player state
    let songs = [...library];
    let currentSongIndex = 0;
    let isPlaying = false;
    let isShuffled = false;
    let isRepeat = false;
    let lastVolume = 0.7;
    let errorStreak = 0;

    // ---------- Persistence (safe if storage is blocked) ----------
    const store = {
        get(key, fallback) {
            try {
                const v = localStorage.getItem('harmony:' + key);
                return v === null ? fallback : JSON.parse(v);
            } catch (e) { return fallback; }
        },
        set(key, value) {
            try { localStorage.setItem('harmony:' + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
        }
    };

    // ---------- Helpers ----------
    function formatTime(time) {
        if (!isFinite(time) || time < 0) return '0:00';
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s < 10 ? '0' + s : s}`;
    }

    function showStatus(msg) {
        statusEl.textContent = msg || '';
    }

    // ---------- Init ----------
    function init() {
        const savedVolume = store.get('volume', 0.7);
        volumeSlider.value = savedVolume;
        audio.volume = savedVolume;
        lastVolume = savedVolume > 0 ? savedVolume : 0.7;
        updateVolumeIcon();

        isRepeat = store.get('repeat', false);
        repeatBtn.classList.toggle('active', isRepeat);
        repeatBtn.setAttribute('aria-pressed', isRepeat);

        const savedId = store.get('lastSong', null);
        const savedIdx = songs.findIndex(s => s.id === savedId);
        if (savedIdx !== -1) currentSongIndex = savedIdx;

        if (store.get('shuffle', false)) shufflePlaylist();

        renderPlaylist();
        loadSong(songs[currentSongIndex], false);
    }

    // ---------- Song loading ----------
    function loadSong(song, autoplay) {
        if (!song) return;
        showStatus('');
        songTitleEl.textContent = song.title || 'Unknown Title';
        artistEl.textContent = song.artist || 'Unknown Artist';
        albumCoverEl.src = song.cover || 'https://placehold.co/300x300?text=No+Image';
        albumCoverEl.alt = `${song.title} cover`;
        audio.src = song.file;
        document.title = isPlaying || autoplay ? `${song.title} – Harmony Player` : 'Harmony Player';

        progressBar.style.width = '0%';
        progressContainer.setAttribute('aria-valuenow', 0);
        currentTimeEl.textContent = '0:00';
        durationEl.textContent = '0:00';

        songTitleEl.classList.add('song-change-animation');
        artistEl.classList.add('song-change-animation');
        setTimeout(() => {
            songTitleEl.classList.remove('song-change-animation');
            artistEl.classList.remove('song-change-animation');
        }, 500);

        store.set('lastSong', song.id);
        updateActiveSong();
        updateMediaSession(song);

        if (autoplay === undefined ? isPlaying : autoplay) playSong();
    }

    // ---------- Playback ----------
    function setPlayingUI(playing) {
        isPlaying = playing;
        playBtn.innerHTML = `<i class="fas fa-${playing ? 'pause' : 'play'}"></i>`;
        const label = playing ? 'Pause' : 'Play';
        playBtn.setAttribute('title', `${label} (Space)`);
        playBtn.setAttribute('aria-label', label);
        musicPlayerEl.classList.toggle('playing', playing);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }

    function playSong() {
        setPlayingUI(true);
        const p = audio.play();
        if (p && p.catch) {
            p.catch(err => {
                if (err.name === 'AbortError') return; // interrupted by a new load, not a real failure
                console.error('Playback failed:', err);
                setPlayingUI(false);
                showStatus('Could not play this track.');
            });
        }
    }

    function pauseSong() {
        setPlayingUI(false);
        audio.pause();
    }

    function togglePlay() {
        isPlaying ? pauseSong() : playSong();
    }

    function prevSong() {
        // Standard behaviour: restart the track if it has played a few seconds
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }
        currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        loadSong(songs[currentSongIndex]);
    }

    function nextSong() {
        currentSongIndex = (currentSongIndex + 1) % songs.length;
        loadSong(songs[currentSongIndex]);
    }

    // Called when a track finishes: repeat applies here only, manual Next always skips
    function handleEnded() {
        if (isRepeat) {
            audio.currentTime = 0;
            playSong();
        } else {
            nextSong();
        }
    }

    // ---------- Shuffle / Repeat ----------
    function shufflePlaylist() {
        isShuffled = !isShuffled;
        shuffleBtn.classList.toggle('active', isShuffled);
        shuffleBtn.setAttribute('aria-pressed', isShuffled);
        store.set('shuffle', isShuffled);

        const currentId = songs[currentSongIndex].id;

        if (isShuffled) {
            const rest = songs.filter(s => s.id !== currentId);
            for (let i = rest.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [rest[i], rest[j]] = [rest[j], rest[i]];
            }
            songs = [songs[currentSongIndex], ...rest];
        } else {
            songs = [...library];
        }
        currentSongIndex = songs.findIndex(s => s.id === currentId);
        renderPlaylist();
    }

    function toggleRepeat() {
        isRepeat = !isRepeat;
        repeatBtn.classList.toggle('active', isRepeat);
        repeatBtn.setAttribute('aria-pressed', isRepeat);
        store.set('repeat', isRepeat);
    }

    // ---------- Progress ----------
    function updateProgress() {
        const { duration, currentTime } = audio;
        if (isFinite(duration) && duration > 0) {
            const pct = (currentTime / duration) * 100;
            progressBar.style.width = `${pct}%`;
            progressContainer.setAttribute('aria-valuenow', Math.round(pct));
        }
        currentTimeEl.textContent = formatTime(currentTime);
    }

    function seekToPointer(e) {
        const rect = progressContainer.getBoundingClientRect();
        const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
        if (isFinite(audio.duration)) {
            audio.currentTime = ratio * audio.duration;
            updateProgress();
        }
    }

    let dragging = false;
    progressContainer.addEventListener('pointerdown', e => {
        dragging = true;
        progressContainer.setPointerCapture(e.pointerId);
        seekToPointer(e);
    });
    progressContainer.addEventListener('pointermove', e => { if (dragging) seekToPointer(e); });
    progressContainer.addEventListener('pointerup', () => { dragging = false; });
    progressContainer.addEventListener('pointercancel', () => { dragging = false; });
    progressContainer.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') { seekBy(-5); e.preventDefault(); e.stopPropagation(); }
        if (e.key === 'ArrowRight') { seekBy(5); e.preventDefault(); e.stopPropagation(); }
    });

    function seekBy(seconds) {
        if (!isFinite(audio.duration)) return;
        audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), audio.duration);
    }

    // ---------- Volume ----------
    function updateVolumeIcon() {
        const v = audio.muted ? 0 : audio.volume;
        volumeIcon.className = v === 0 ? 'fas fa-volume-mute' : v < 0.5 ? 'fas fa-volume-down' : 'fas fa-volume-up';
    }

    function setVolume(value) {
        const v = Math.min(Math.max(Number(value), 0), 1);
        audio.volume = v;
        audio.muted = false;
        volumeSlider.value = v;
        if (v > 0) lastVolume = v;
        store.set('volume', v);
        updateVolumeIcon();
    }

    function toggleMute() {
        if (audio.volume === 0 || audio.muted) {
            setVolume(lastVolume || 0.7);
        } else {
            lastVolume = audio.volume;
            audio.volume = 0;
            volumeSlider.value = 0;
            updateVolumeIcon();
        }
    }

    // ---------- Playlist ----------
    function getDisplaySongs() {
        const query = playlistSearch.value.trim().toLowerCase();
        if (!query) return songs;
        return songs.filter(s =>
            s.title.toLowerCase().includes(query) || s.artist.toLowerCase().includes(query)
        );
    }

    function renderPlaylist() {
        const displaySongs = getDisplaySongs();
        playlistEl.textContent = '';

        if (displaySongs.length === 0) {
            const li = document.createElement('li');
            li.className = 'empty-playlist';
            li.innerHTML = '<i class="fas fa-music"></i><p>No songs found</p>';
            playlistEl.appendChild(li);
            return;
        }

        displaySongs.forEach((song, index) => {
            const li = document.createElement('li');
            li.dataset.id = song.id;
            li.tabIndex = 0;
            li.setAttribute('role', 'button');

            const num = document.createElement('span');
            num.className = 'song-number';
            num.textContent = index + 1;

            const details = document.createElement('div');
            details.className = 'song-details';
            const title = document.createElement('div');
            title.className = 'song-title';
            title.textContent = song.title;      // textContent: safe against HTML injection
            const artist = document.createElement('div');
            artist.className = 'song-artist';
            artist.textContent = song.artist;
            details.append(title, artist);

            li.append(num, details);

            const choose = () => {
                const realIndex = songs.findIndex(s => s.id === song.id);
                if (realIndex === -1) return;
                currentSongIndex = realIndex;
                loadSong(songs[currentSongIndex], true);
            };
            li.addEventListener('click', choose);
            li.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); choose(); }
            });
            playlistEl.appendChild(li);
        });
        updateActiveSong();
    }

    function updateActiveSong() {
        const currentId = songs[currentSongIndex]?.id;
        playlistEl.querySelectorAll('li[data-id]').forEach(item => {
            const active = Number(item.dataset.id) === currentId;
            item.classList.toggle('playing', active);
            if (active) {
                // Scroll only the playlist box, never the whole page
                const top = item.offsetTop - playlistScroll.clientHeight / 2 + item.clientHeight / 2;
                playlistScroll.scrollTo({ top, behavior: 'smooth' });
            }
        });
    }

    // ---------- Media Session (lock-screen / headset controls) ----------
    function updateMediaSession(song) {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: song.artist,
            artwork: [{ src: song.cover, sizes: '300x300', type: 'image/png' }]
        });
    }

    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', playSong);
        navigator.mediaSession.setActionHandler('pause', pauseSong);
        navigator.mediaSession.setActionHandler('previoustrack', prevSong);
        navigator.mediaSession.setActionHandler('nexttrack', nextSong);
    }

    // ---------- Keyboard shortcuts ----------
    document.addEventListener('keydown', e => {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' && e.target.type === 'text') return;      // typing in search
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (tag === 'button' && (e.key === ' ' || e.key === 'Enter')) return; // let focused buttons work normally

        switch (e.key) {
            case ' ': e.preventDefault(); togglePlay(); break;
            case 'ArrowRight': seekBy(5); break;
            case 'ArrowLeft': seekBy(-5); break;
            case 'ArrowUp': if (tag !== 'input') { e.preventDefault(); setVolume(audio.volume + 0.05); } break;
            case 'ArrowDown': if (tag !== 'input') { e.preventDefault(); setVolume(audio.volume - 0.05); } break;
            case 'n': case 'N': nextSong(); break;
            case 'p': case 'P': prevSong(); break;
            case 's': case 'S': shufflePlaylist(); break;
            case 'r': case 'R': toggleRepeat(); break;
            case 'm': case 'M': toggleMute(); break;
        }
    });

    // ---------- Event listeners ----------
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);
    shuffleBtn.addEventListener('click', shufflePlaylist);
    repeatBtn.addEventListener('click', toggleRepeat);
    volumeBtn.addEventListener('click', toggleMute);
    volumeSlider.addEventListener('input', () => setVolume(volumeSlider.value));
    playlistSearch.addEventListener('input', renderPlaylist);

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', () => { durationEl.textContent = formatTime(audio.duration); });
    audio.addEventListener('playing', () => { errorStreak = 0; showStatus(''); });
    audio.addEventListener('error', () => {
        errorStreak++;
        showStatus('This track failed to load.');
        // Skip to the next track, but stop if every track is failing
        if (isPlaying && errorStreak < songs.length) {
            setTimeout(nextSong, 1200);
        } else {
            setPlayingUI(false);
        }
    });

    init();
});
