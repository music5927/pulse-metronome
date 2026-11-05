(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const elements = {
    // 탭 및 뷰
    tabSingle: $('tab-single'), tabSong: $('tab-song'),
    viewSingle: $('view-single'),
    viewTrackTop: $('view-track-top'),
    viewTrackSections: $('view-track-sections'),
    status: $('status'),
    // 상단 옵션 버튼
    btnOpenOptions: $('btn-open-options'),
    // 전체화면 악센트 플래시
    fullscreenFlash: $('fullscreen-flash'),
    // 공통 박자 시각화
    beatLight: $('beat-light'), beatNumber: $('beat-number'), beatCount: $('beat-count'),
    beatCaption: $('beat-caption'), songProgressBadge: $('song-progress-badge'),
    badgeSectionName: $('badge-section-name'), badgeBarCount: $('badge-bar-count'), badgeTotalBar: $('badge-total-bar'),
    // 기본 모드
    tempo: $('tempo-input'), slider: $('tempo-slider'), tempoDown: $('tempo-down'), tempoUp: $('tempo-up'),
    beats: $('beats-input'), division: $('division-input'), volume: $('volume-input'),
    accentControls: $('accent-controls'), accentSummary: $('accent-summary'),
    // 트랙 메트로놈 프리셋 관리
    songSelect: $('song-select'),
    songBtnNew: $('song-btn-new'), songBtnRename: $('song-btn-rename'),
    songBtnDuplicate: $('song-btn-duplicate'), songBtnDelete: $('song-btn-delete'),
    // 트랙 모니터
    monSectionName: $('mon-section-name'), monSectionMeta: $('mon-section-meta'),
    monMeasureProgress: $('mon-measure-progress'), monTotalProgress: $('mon-total-progress'),
    btnRewind: $('btn-rewind'), btnToggleLoop: $('btn-toggle-loop'),
    // 구간 타임라인 (시작 버튼 아래로 이동)
    sectionsCountBadge: $('sections-count-badge'), sectionsList: $('sections-list'),
    btnAddSection: $('btn-add-section'),
    // 구간 에디터
    sectionEditor: $('section-editor'), editorTitle: $('editor-title'), editorBtnClose: $('editor-btn-close'),
    edName: $('ed-name'), edBars: $('ed-bars'), edBpm: $('ed-bpm'), edBeats: $('ed-beats'),
    edDivision: $('ed-division'), edGuideVoice: $('ed-guide-voice'),
    edAccentControls: $('ed-accent-controls'), edBtnCancel: $('ed-btn-cancel'), edBtnSave: $('ed-btn-save'),
    // 하단 공통 컨트롤 (시작/정지, TAP, 소리)
    play: $('play-button'), playLabel: $('play-label'), tap: $('tap-button'),
    mute: $('mute-button'), soundIcon: $('sound-icon'), soundLabel: $('sound-label'),
    // 옵션 메뉴 모달
    optionsModal: $('options-modal'), optionsBackdrop: $('options-backdrop'),
    btnCloseOptions: $('btn-close-options'), btnSubmitLogs: $('btn-submit-logs'),
    accentRadios: document.querySelectorAll('input[name="accent-visual"]'),
    voiceVolumeSlider: $('voice-volume-slider'),
    voiceVolumeDisplay: $('voice-volume-display'),
    // 로그 제출 안내 팝업
    logAlertModal: $('log-alert-modal'), btnAlertClose: $('btn-alert-close'),
    logAlertMessage: $('log-alert-message')
  };

  const SETTINGS_KEY = 'pulse-metronome-settings-v6';
  const SONGS_KEY = 'pulse-metronome-songs-v6';
  const SCHEDULE_AHEAD_SECONDS = 0.12;
  const LOOKAHEAD_MS = 25;
  const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAA';

  // 1분간의 런타임 로그를 보관하는 링 버퍼
  const logRingBuffer = [];
  function addLog(action, detail = {}) {
    const entry = {
      time: Date.now(),
      iso: new Date().toISOString(),
      action,
      detail
    };
    logRingBuffer.push(entry);
    if (logRingBuffer.length > 300) logRingBuffer.shift();
  }

  function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }
  function normaliseAccents(arr, beats) {
    const list = Array.isArray(arr) ? arr : [0];
    return [...new Set(list.map(Number).filter((b) => Number.isInteger(b) && b >= 0 && b < beats))];
  }

  // 6. Section 표준 제목 리스트: Ready, Intro, Verse, Pre-Chorus, Chorus, Pre-Bridge, Brigde, Solo, Outro
  const ALLOWED_SECTION_TITLES = [
    'Ready', 'Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Pre-Bridge', 'Bridge', 'Solo', 'Outro'
  ];

  // 기본 트랙 메트로놈 프리셋
  const DEFAULT_SONGS = [
    {
      id: 'track-sample-1',
      name: '기본 밴드 트랙 (가이드 보이스 포함)',
      loop: true,
      sections: [
        { id: 'sec-1', name: 'Ready', bars: 2, bpm: 120, beats: 4, division: 4, guideVoice: true, accentBeats: [0] },
        { id: 'sec-2', name: 'Intro', bars: 4, bpm: 120, beats: 4, division: 4, guideVoice: true, accentBeats: [0] },
        { id: 'sec-3', name: 'Verse', bars: 8, bpm: 120, beats: 4, division: 4, guideVoice: true, accentBeats: [0] },
        { id: 'sec-4', name: 'Pre-Chorus', bars: 4, bpm: 120, beats: 3, division: 4, guideVoice: true, accentBeats: [0] },
        { id: 'sec-5', name: 'Chorus', bars: 8, bpm: 144, beats: 4, division: 4, guideVoice: true, accentBeats: [0, 2] },
        { id: 'sec-6', name: 'Solo', bars: 4, bpm: 144, beats: 4, division: 4, guideVoice: true, accentBeats: [0] },
        { id: 'sec-7', name: 'Outro', bars: 4, bpm: 108, beats: 4, division: 4, guideVoice: true, accentBeats: [0] }
      ]
    },
    {
      id: 'track-sample-2',
      name: 'Mrs. GREEN APPLE 스타일 트랙',
      loop: true,
      sections: [
        { id: 'mga-1', name: 'Intro', bars: 4, bpm: 128, beats: 4, division: 4, guideVoice: true, accentBeats: [0] },
        { id: 'mga-2', name: 'Verse', bars: 8, bpm: 128, beats: 4, division: 4, guideVoice: true, accentBeats: [0] },
        { id: 'mga-3', name: 'Pre-Chorus', bars: 4, bpm: 134, beats: 4, division: 4, guideVoice: true, accentBeats: [0] },
        { id: 'mga-4', name: 'Chorus', bars: 8, bpm: 142, beats: 4, division: 4, guideVoice: true, accentBeats: [0, 2] },
        { id: 'mga-5', name: 'Bridge', bars: 4, bpm: 120, beats: 3, division: 4, guideVoice: true, accentBeats: [0] },
        { id: 'mga-6', name: 'Outro', bars: 4, bpm: 128, beats: 4, division: 4, guideVoice: true, accentBeats: [0] }
      ]
    },
    {
      id: 'track-sample-3',
      name: '변속·변박 4마디 루프',
      loop: true,
      sections: [
        { id: 'loop-1', name: 'Verse', bars: 4, bpm: 110, beats: 4, division: 4, guideVoice: true, accentBeats: [0] },
        { id: 'loop-2', name: 'Chorus', bars: 4, bpm: 130, beats: 4, division: 4, guideVoice: true, accentBeats: [0, 2] }
      ]
    }
  ];

  // 로컬 스토리지 로드
  const savedSettings = (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; } })();
  const savedSongs = (() => {
    try {
      const data = JSON.parse(localStorage.getItem(SONGS_KEY));
      return Array.isArray(data) && data.length > 0 ? data : DEFAULT_SONGS;
    } catch {
      return DEFAULT_SONGS;
    }
  })();

  const state = {
    mode: savedSettings.mode === 'song' ? 'song' : 'single',
    // 1. BPM 범위 30~400
    bpm: clamp(Number(savedSettings.bpm) || 120, 30, 400),
    // 2. 박자 범위 2~31
    beats: clamp(Number(savedSettings.beats) || 4, 2, 31),
    // 3. 음표 단위 2, 4, 8, 16, 32
    division: [2, 4, 8, 16, 32].includes(Number(savedSettings.division)) ? Number(savedSettings.division) : 4,
    volume: clamp(Number(savedSettings.volume) || 70, 0, 100),
    muted: Boolean(savedSettings.muted),
    accentBeats: normaliseAccents(savedSettings.accentBeats, Number(savedSettings.beats) || 4),
    // 옵션: 악센트 표시방법 (fullscreen | partial | off) & 보이스 가이드 볼륨 (0~100)
    options: {
      accentVisual: ['fullscreen', 'partial', 'off'].includes(savedSettings.accentVisual) ? savedSettings.accentVisual : 'partial',
      voiceVolume: clamp(Number(savedSettings.voiceVolume ?? 80), 0, 100)
    },
    // 트랙 메트로놈 프리셋
    songs: savedSongs,
    activeSongId: savedSettings.activeSongId || savedSongs[0]?.id || DEFAULT_SONGS[0].id,
    // 트랙 런타임 상태
    currentSectionIndex: 0,
    currentMeasure: 0,
    // 공통 런타임 상태
    playing: false,
    currentBeat: 0,
    nextNoteTime: 0,
    schedulerTimer: null,
    audioContext: null,
    iosUnlockAudio: null,
    tapTimes: [],
    // 에디터 상태
    editingSectionIndex: null,
    edAccents: [0]
  };

  // Web Audio 기반 고정밀 가이드 보이스 엔진 (iOS 무음모드/스피커 출력 및 볼륨 조절 완전 지원)
  const VoiceGuide = {
    audioContext: null,
    spriteBuffer: null,
    voiceGain: null,
    isReady: false,
    isLoading: false,

    async init(audioCtx) {
      if (audioCtx) this.audioContext = audioCtx;
      if (this.audioContext && !this.voiceGain) {
        this.voiceGain = this.audioContext.createGain();
        const vol = (state.options.voiceVolume / 100);
        this.voiceGain.gain.setValueAtTime(vol, this.audioContext.currentTime);
        this.voiceGain.connect(this.audioContext.destination);
      }
      if (this.isReady || this.isLoading) return;
      if (typeof window !== 'undefined' && window.VOICE_SPRITE_DATA && this.audioContext) {
        this.isLoading = true;
        try {
          const res = await fetch(window.VOICE_SPRITE_DATA);
          const arrayBuf = await res.arrayBuffer();
          this.spriteBuffer = await this.audioContext.decodeAudioData(arrayBuf);
          this.isReady = true;
          this.isLoading = false;
        } catch (e) {
          this.isLoading = false;
          console.warn('Voice sprite decode error', e);
        }
      }
    },

    setVolume(percent) {
      const vol = clamp(Number(percent) || 0, 0, 100) / 100;
      if (this.voiceGain && this.audioContext) {
        this.voiceGain.gain.setValueAtTime(vol, this.audioContext.currentTime);
      }
    },

    playClip(key, scheduleTime = null) {
      if (!this.audioContext) return;
      const lookupKey = String(key || '').toLowerCase().replace(/brigde/i, 'bridge').trim();
      const item = window.VOICE_SPRITE_MAP ? window.VOICE_SPRITE_MAP[lookupKey] : null;

      if (this.isReady && this.spriteBuffer && item) {
        try {
          const source = this.audioContext.createBufferSource();
          source.buffer = this.spriteBuffer;
          source.connect(this.voiceGain || this.audioContext.destination);
          const startTime = scheduleTime !== null ? Math.max(scheduleTime, this.audioContext.currentTime) : this.audioContext.currentTime;
          source.start(startTime, item.start, item.duration);
        } catch (_) {}
      } else {
        this.speakFallback(key);
      }
    },

    speakSectionName(name, scheduleTime = null) {
      const clean = String(name || '').toLowerCase().replace(/brigde/i, 'bridge').replace(/\s+/g, '-').trim();
      this.playClip(clean, scheduleTime);
    },

    speakCount(number, scheduleTime = null) {
      this.playClip(String(number), scheduleTime);
    },

    speakFallback(text) {
      try {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        const utter = new SpeechSynthesisUtterance(String(text));
        utter.lang = 'en-US';
        utter.volume = (state.options.voiceVolume / 100);
        utter.rate = 1.25;
        utter.pitch = 1.2;
        window.speechSynthesis.speak(utter);
      } catch (_) {}
    }
  };

  addLog('TRACK_APP_INIT', {
    mode: state.mode, bpm: state.bpm, beats: state.beats, division: state.division,
    accentVisual: state.options.accentVisual, voiceVolume: state.options.voiceVolume
  });

  function persistSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      mode: state.mode,
      bpm: state.bpm, beats: state.beats, division: state.division,
      volume: state.volume, muted: state.muted, accentBeats: state.accentBeats,
      accentVisual: state.options.accentVisual,
      voiceVolume: state.options.voiceVolume,
      activeSongId: state.activeSongId
    }));
  }

  function persistSongs() {
    localStorage.setItem(SONGS_KEY, JSON.stringify(state.songs));
  }

  function getActiveSong() {
    let song = state.songs.find((s) => s.id === state.activeSongId);
    if (!song) {
      song = state.songs[0] || DEFAULT_SONGS[0];
      state.activeSongId = song.id;
    }
    return song;
  }

  function getTotalSongBars(song) {
    return song.sections.reduce((sum, s) => sum + Number(s.bars || 1), 0);
  }

  function getCalculatedTotalBar(song, secIdx, curMeasure) {
    let barsBefore = 0;
    for (let i = 0; i < secIdx && i < song.sections.length; i += 1) {
      barsBefore += Number(song.sections[i].bars || 1);
    }
    return barsBefore + curMeasure + 1;
  }

  function setStatus(text, running = false) {
    elements.status.textContent = text;
    elements.status.classList.toggle('running', running);
  }

  function updateSoundButton() {
    const muted = state.muted;
    elements.soundIcon.textContent = muted ? '🔇' : '🔊';
    elements.soundLabel.textContent = muted ? '소리 꺼짐' : '소리 켜짐';
    elements.mute.classList.toggle('is-muted', muted);
    elements.mute.setAttribute('aria-label', muted ? '소리 켜짐으로 바꾸기' : '소리 끄기');
    elements.mute.setAttribute('aria-pressed', String(muted));
  }

  // 기본 모드 UI 갱신 (박자 2~31 버튼 렌더링)
  function renderSingleAccentControls() {
    elements.accentControls.replaceChildren();
    for (let b = 0; b < state.beats; b += 1) {
      const selected = state.accentBeats.includes(b);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `accent-beat${selected ? ' selected' : ''}`;
      btn.dataset.beat = String(b);
      btn.textContent = String(b + 1);
      btn.setAttribute('aria-pressed', String(selected));
      btn.setAttribute('aria-label', `${b + 1}박 ${selected ? '강박 해제' : '강박 설정'}`);
      elements.accentControls.append(btn);
    }
    const accents = state.accentBeats.map((b) => `${b + 1}박`);
    elements.accentSummary.textContent = accents.length ? accents.join(', ') : '강박 없음';
  }

  function updateSingleUI() {
    elements.tempo.value = state.bpm;
    elements.slider.value = state.bpm;
    elements.beats.value = state.beats;
    elements.division.value = state.division;
    elements.volume.value = state.volume;
    elements.beatCount.textContent = state.beats;
    renderSingleAccentControls();
  }

  // 트랙 메트로놈 프리셋 선택 목록 갱신
  function renderSongSelect() {
    elements.songSelect.replaceChildren();
    state.songs.forEach((song) => {
      const opt = document.createElement('option');
      opt.value = song.id;
      opt.textContent = `🎵 ${song.name}`;
      if (song.id === state.activeSongId) opt.selected = true;
      elements.songSelect.append(opt);
    });
  }

  function updateSongMonitorUI() {
    const song = getActiveSong();
    const sec = song.sections[state.currentSectionIndex] || song.sections[0] || { name: '-', bpm: 120, beats: 4, division: 4, bars: 1 };
    const curBar = state.currentMeasure + 1;
    const totalBars = getTotalSongBars(song);
    const overallBar = getCalculatedTotalBar(song, state.currentSectionIndex, state.currentMeasure);

    elements.monSectionName.textContent = sec.name;
    elements.monSectionMeta.textContent = `${sec.bpm} BPM · ${sec.beats}/${sec.division || 4} (${sec.bars}마디)`;
    elements.monMeasureProgress.textContent = `${curBar} / ${sec.bars}`;
    elements.monTotalProgress.textContent = `전체 ${overallBar} / ${totalBars} 마디`;

    elements.badgeSectionName.textContent = sec.name;
    elements.badgeBarCount.textContent = `마디 ${curBar} / ${sec.bars}`;
    elements.badgeTotalBar.textContent = `(전체 ${overallBar} / ${totalBars})`;

    elements.btnToggleLoop.textContent = song.loop ? '🔁 전곡 반복: ON' : '🔁 전곡 반복: OFF';
    elements.btnToggleLoop.classList.toggle('active', Boolean(song.loop));
    elements.beatCount.textContent = sec.beats;
  }

  // 2. 트랙 메트로놈에서 section 항목을 시작버튼 아래로 렌더링
  function renderSectionsTimeline() {
    const song = getActiveSong();
    elements.sectionsCountBadge.textContent = `${song.sections.length}개 구간 (${getTotalSongBars(song)}마디)`;
    elements.sectionsList.replaceChildren();

    song.sections.forEach((sec, idx) => {
      const isActive = idx === state.currentSectionIndex;
      const row = document.createElement('div');
      row.className = `section-item${isActive ? ' is-active' : ''}`;
      row.dataset.index = String(idx);
      row.setAttribute('role', 'listitem');

      const mainDiv = document.createElement('div');
      mainDiv.className = 'section-item-main';

      const titleRow = document.createElement('div');
      titleRow.className = 'section-item-title-row';
      if (isActive) {
        const dot = document.createElement('span');
        dot.className = 'active-pulse-dot';
        titleRow.append(dot);
      }
      const titleSpan = document.createElement('span');
      titleSpan.className = 'section-item-title';
      titleSpan.textContent = `${idx + 1}. ${sec.name}`;
      titleRow.append(titleSpan);

      const isVoiceOn = sec.guideVoice !== false;
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'section-item-tags';
      tagsDiv.innerHTML = `
        <span class="tag">${sec.bars}마디</span>
        <span class="tag">${sec.bpm} BPM</span>
        <span class="tag">${sec.beats}/${sec.division || 4}</span>
        <span class="tag ${isVoiceOn ? 'tag-accent' : 'tag-muted'}">${isVoiceOn ? '보이스 ON' : '보이스 OFF'}</span>
        <span class="tag">강박: ${sec.accentBeats?.length ? sec.accentBeats.map(b => b+1+'박').join(',') : '없음'}</span>
      `;

      mainDiv.append(titleRow, tagsDiv);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'section-item-actions';
      actionsDiv.innerHTML = `
        <button class="item-btn btn-up" type="button" title="위로" data-idx="${idx}">▲</button>
        <button class="item-btn btn-down" type="button" title="아래로" data-idx="${idx}">▼</button>
        <button class="item-btn btn-edit" type="button" title="수정" data-idx="${idx}">✏️</button>
        <button class="item-btn btn-del" type="button" title="삭제" data-idx="${idx}">🗑️</button>
      `;

      row.append(mainDiv, actionsDiv);
      elements.sectionsList.append(row);
    });
  }

  // 1. '곡&마디 시퀀서' -> '트랙 메트로놈' 및 뷰 전환
  function updateModeView() {
    const isSong = state.mode === 'song';
    elements.tabSingle.classList.toggle('active', !isSong);
    elements.tabSong.classList.toggle('active', isSong);
    elements.tabSingle.setAttribute('aria-selected', String(!isSong));
    elements.tabSong.setAttribute('aria-selected', String(isSong));

    elements.viewSingle.classList.toggle('hidden', isSong);
    elements.viewTrackTop.classList.toggle('hidden', !isSong);
    elements.viewTrackSections.classList.toggle('hidden', !isSong);
    elements.songProgressBadge.classList.toggle('hidden', !isSong);

    if (isSong) {
      renderSongSelect();
      updateSongMonitorUI();
      renderSectionsTimeline();
    } else {
      updateSingleUI();
    }
  }

  // iOS Safari 백그라운드 & 스피커 라우팅
  function configureIosPlayback() {
    try {
      if (navigator.audioSession && 'type' in navigator.audioSession) {
        navigator.audioSession.type = 'playback';
      }
    } catch (_) {}
  }

  function unlockIosSpeaker() {
    if (!state.iosUnlockAudio) {
      state.iosUnlockAudio = new Audio(SILENT_WAV);
      state.iosUnlockAudio.loop = true;
      state.iosUnlockAudio.playsInline = true;
      state.iosUnlockAudio.volume = 0.001;
      state.iosUnlockAudio.setAttribute('playsinline', '');
    }
    state.iosUnlockAudio.play().catch(() => {});
  }

  async function ensureAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('이 브라우저는 Web Audio API를 지원하지 않습니다.');
    configureIosPlayback();
    if (!state.audioContext) state.audioContext = new AudioContextClass({ latencyHint: 'interactive' });
    unlockIosSpeaker();
    await VoiceGuide.init(state.audioContext);
    if (state.audioContext.state === 'suspended') await state.audioContext.resume();
  }

  // 정밀 오디오 클릭음 합성
  function scheduleClick(time, isAccent) {
    if (state.muted || !state.audioContext) return;
    const osc = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();
    osc.frequency.value = isAccent ? 1320 : 880;
    osc.type = isAccent ? 'sine' : 'triangle';
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime((state.volume / 100) * (isAccent ? 0.48 : 0.3), time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.058);
    osc.connect(gain).connect(state.audioContext.destination);
    osc.start(time);
    osc.stop(time + 0.064);
  }

  // 박자 시각 효과 렌더링 (전체화면 | 부분화면 | 끄기)
  function renderBeat(beat, isAccent, captionOverride = null) {
    elements.beatNumber.textContent = String(beat + 1);
    elements.beatCaption.textContent = captionOverride || (isAccent ? `${beat + 1}박 · 강박` : `${beat + 1}번째 박`);

    const visualMode = state.options.accentVisual; // 'fullscreen' | 'partial' | 'off'

    if (visualMode === 'fullscreen') {
      if (isAccent) {
        elements.fullscreenFlash.classList.add('flash-active');
        window.setTimeout(() => elements.fullscreenFlash.classList.remove('flash-active'), 75);
      }
      elements.beatLight.classList.remove('idle', 'active', 'accent');
    } else if (visualMode === 'partial') {
      elements.beatLight.classList.remove('idle', 'active', 'accent');
      void elements.beatLight.offsetWidth;
      elements.beatLight.classList.add('active', isAccent ? 'accent' : '');
      window.setTimeout(() => elements.beatLight.classList.remove('active', 'accent'), 80);
    } else {
      elements.beatLight.classList.remove('active', 'accent');
      elements.beatLight.classList.add('idle');
    }
  }

  // Web Audio Lookahead 스케줄러 (트랙 메트로놈 가이드 보이스 동기화)
  function scheduler() {
    while (state.nextNoteTime < state.audioContext.currentTime + SCHEDULE_AHEAD_SECONDS) {
      if (state.mode === 'single') {
        const beat = state.currentBeat;
        const accent = state.accentBeats.includes(beat);
        const noteTime = state.nextNoteTime;

        scheduleClick(noteTime, accent);
        const delay = Math.max(0, (noteTime - state.audioContext.currentTime) * 1000);
        window.setTimeout(() => {
          if (state.playing && state.mode === 'single') renderBeat(beat, accent);
        }, delay);

        state.nextNoteTime += 60 / state.bpm;
        state.currentBeat = (state.currentBeat + 1) % state.beats;
      } else {
        // [트랙 메트로놈 모드]
        const song = getActiveSong();
        if (!song.sections || song.sections.length === 0) {
          stop();
          return;
        }

        const secIdx = state.currentSectionIndex;
        const curSec = song.sections[secIdx];
        if (!curSec) {
          stop();
          return;
        }

        const beat = state.currentBeat;
        const measure = state.currentMeasure;
        const accent = (curSec.accentBeats || [0]).includes(beat);
        const noteTime = state.nextNoteTime;

        // 다음 전환될 section 파악
        const hasNextTransition = song.sections.length > 1 || song.loop;
        const nextSecIdx = (secIdx + 1) % song.sections.length;
        const nextSec = hasNextTransition ? song.sections[nextSecIdx] : null;

        // 3. 가이드 보이스: section이 바뀌기 2마디 전 섹션명, 1마디 전 카운트
        const barsRemaining = curSec.bars - measure;
        const isGuideEnabled = Boolean(nextSec && (nextSec.guideVoice !== false));
        const isTwoBarsBeforeName = isGuideEnabled && (barsRemaining === 2) && (beat === 0);
        const isOneBarBeforeCount = isGuideEnabled && (barsRemaining === 1);

        // 오디오 스케줄링 (클릭음 및 가이드 보이스를 동일 Web Audio 컨텍스트에서 정밀 재생)
        scheduleClick(noteTime, accent);

        if (isTwoBarsBeforeName && nextSec) {
          VoiceGuide.speakSectionName(nextSec.name, noteTime);
        } else if (isOneBarBeforeCount) {
          VoiceGuide.speakCount(beat + 1, noteTime);
        }

        const delay = Math.max(0, (noteTime - state.audioContext.currentTime) * 1000);
        window.setTimeout(() => {
          if (state.playing && state.mode === 'song') {
            renderBeat(beat, accent, `${curSec.name} · ${measure + 1}/${curSec.bars}마디`);
            updateSongMonitorUI();
            renderSectionsTimeline();

            if (isTwoBarsBeforeName && nextSec) {
              addLog('GUIDE_VOICE_SECTION', { target: nextSec.name, bar: measure + 1 });
            } else if (isOneBarBeforeCount) {
              addLog('GUIDE_VOICE_COUNT', { count: beat + 1, bar: measure + 1 });
            }
          }
        }, delay);

        state.nextNoteTime += 60 / curSec.bpm;
        state.currentBeat += 1;
        if (state.currentBeat >= curSec.beats) {
          state.currentBeat = 0;
          state.currentMeasure += 1;
          if (state.currentMeasure >= curSec.bars) {
            state.currentMeasure = 0;
            state.currentSectionIndex += 1;
            if (state.currentSectionIndex >= song.sections.length) {
              if (song.loop) {
                state.currentSectionIndex = 0;
              } else {
                const stopDelay = delay + (60 / curSec.bpm) * 1000;
                window.setTimeout(() => {
                  if (state.playing) {
                    stop();
                    state.currentSectionIndex = 0;
                    state.currentMeasure = 0;
                    state.currentBeat = 0;
                    updateSongMonitorUI();
                    renderSectionsTimeline();
                    setStatus('트랙 재생 완료');
                    addLog('TRACK_COMPLETE', { songId: song.id, songName: song.name });
                  }
                }, stopDelay);
              }
            }
          }
        }
      }
    }
  }

  async function start() {
    try {
      await ensureAudio();
      if (state.playing) return;
      state.playing = true;
      state.currentBeat = 0;
      if (state.mode === 'single') {
        state.nextNoteTime = state.audioContext.currentTime + 0.05;
        addLog('PLAY_START', { mode: 'single', bpm: state.bpm, beats: state.beats, division: state.division });
      } else {
        const song = getActiveSong();
        if (!song.sections || song.sections.length === 0) {
          throw new Error('재생할 마디 구간이 없습니다.');
        }
        state.nextNoteTime = state.audioContext.currentTime + 0.05;
        updateSongMonitorUI();
        renderSectionsTimeline();
        addLog('PLAY_START', { mode: 'song', songId: song.id, songName: song.name, secIdx: state.currentSectionIndex });
      }
      scheduler();
      state.schedulerTimer = window.setInterval(scheduler, LOOKAHEAD_MS);
      elements.play.classList.add('is-playing');
      elements.play.setAttribute('aria-pressed', 'true');
      elements.playLabel.textContent = '정지';
      setStatus(state.mode === 'song' ? '트랙 재생 중' : '재생 중', true);
    } catch (error) {
      addLog('AUDIO_ERROR', { error: error.message });
      setStatus(error.message || '오디오를 시작하지 못했습니다.');
    }
  }

  function stop() {
    if (!state.playing) return;
    state.playing = false;
    window.clearInterval(state.schedulerTimer);
    state.schedulerTimer = null;
    state.iosUnlockAudio?.pause();
    elements.play.classList.remove('is-playing');
    elements.play.setAttribute('aria-pressed', 'false');
    elements.playLabel.textContent = '시작';
    elements.beatLight.classList.remove('active', 'accent');
    elements.beatLight.classList.add('idle');
    elements.beatCaption.textContent = '다음 박자를 기다리는 중';
    setStatus('일시 정지');
    addLog('PLAY_STOP', { mode: state.mode });
  }

  function togglePlayback() {
    state.playing ? stop() : start();
  }

  function rewindSong() {
    state.currentSectionIndex = 0;
    state.currentMeasure = 0;
    state.currentBeat = 0;
    updateSongMonitorUI();
    renderSectionsTimeline();
    setStatus('1마디로 이동');
    addLog('TRACK_REWIND');
  }

  function seekToSection(idx) {
    const song = getActiveSong();
    if (idx < 0 || idx >= song.sections.length) return;
    state.currentSectionIndex = idx;
    state.currentMeasure = 0;
    state.currentBeat = 0;
    updateSongMonitorUI();
    renderSectionsTimeline();
    setStatus(`${song.sections[idx].name} 구간으로 이동`);
    addLog('TRACK_SEEK', { secIdx: idx, name: song.sections[idx].name });
  }

  function setSingleTempo(raw) {
    const oldBpm = state.bpm;
    state.bpm = clamp(Math.round(Number(raw) || 120), 30, 400);
    updateSingleUI();
    persistSettings();
    if (oldBpm !== state.bpm) addLog('BPM_CHANGE', { from: oldBpm, to: state.bpm });
  }

  function tapTempo() {
    const now = performance.now();
    state.tapTimes = state.tapTimes.filter((t) => now - t < 2200);
    state.tapTimes.push(now);
    if (state.tapTimes.length < 2) {
      elements.tap.querySelector('span').textContent = '한 번 더 누르세요';
      return;
    }
    const intervals = state.tapTimes.slice(1).map((t, i) => t - state.tapTimes[i]);
    const mean = intervals.reduce((s, d) => s + d, 0) / intervals.length;
    const newBpm = 60000 / mean;
    if (state.mode === 'single') {
      setSingleTempo(newBpm);
      elements.tap.querySelector('span').textContent = `${state.bpm} BPM 적용`;
      addLog('TAP_TEMPO', { bpm: state.bpm });
    } else {
      const song = getActiveSong();
      const curSec = song.sections[state.currentSectionIndex];
      if (curSec) {
        curSec.bpm = clamp(Math.round(newBpm), 30, 400);
        persistSongs();
        updateSongMonitorUI();
        renderSectionsTimeline();
        elements.tap.querySelector('span').textContent = `${curSec.bpm} BPM 적용`;
        addLog('TAP_TEMPO_TRACK', { secName: curSec.name, bpm: curSec.bpm });
      }
    }
    window.setTimeout(() => { elements.tap.querySelector('span').textContent = '템포 맞추기'; }, 900);
  }

  // 7. 구간 에디터: 강박 버튼 (2~31박 동적 렌더링)
  function renderEditorAccents(beats) {
    elements.edAccentControls.replaceChildren();
    for (let b = 0; b < beats; b += 1) {
      const selected = state.edAccents.includes(b);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `ed-accent-beat${selected ? ' selected' : ''}`;
      btn.textContent = `${b + 1}박`;
      btn.dataset.beat = String(b);
      elements.edAccentControls.append(btn);
    }
  }

  // 5, 6, 7. 구간 에디터 열기 (제목 드롭다운, 박자 2~31, 음표 2,4,8,16,32, 가이드보이스 on/off)
  function openSectionEditor(idx = null) {
    state.editingSectionIndex = idx;
    const song = getActiveSong();

    if (idx !== null && song.sections[idx]) {
      const sec = song.sections[idx];
      elements.editorTitle.textContent = `마디 구간 수정 (${idx + 1}번 구간)`;

      // 제목 매칭 (Ready, Intro, Verse, Pre-Chorus, Chorus, Pre-Bridge, Bridge, Solo, Outro)
      const matchedTitle = ALLOWED_SECTION_TITLES.find((t) => sec.name.startsWith(t)) || 'Verse';
      elements.edName.value = matchedTitle;

      elements.edBars.value = sec.bars;
      elements.edBpm.value = sec.bpm;
      elements.edBeats.value = String(clamp(Number(sec.beats) || 4, 2, 31));
      elements.edDivision.value = String([2, 4, 8, 16, 32].includes(Number(sec.division)) ? Number(sec.division) : 4);
      elements.edGuideVoice.checked = sec.guideVoice !== false;
      state.edAccents = normaliseAccents(sec.accentBeats, Number(elements.edBeats.value));
    } else {
      elements.editorTitle.textContent = `새 마디 구간 추가 (${song.sections.length + 1}번 구간)`;
      elements.edName.value = 'Verse';
      elements.edBars.value = 4;
      elements.edBpm.value = song.sections[song.sections.length - 1]?.bpm || 120;
      elements.edBeats.value = '4';
      elements.edDivision.value = '4';
      elements.edGuideVoice.checked = true;
      state.edAccents = [0];
    }

    renderEditorAccents(Number(elements.edBeats.value));
    elements.sectionEditor.classList.remove('hidden');
    elements.sectionEditor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function closeSectionEditor() {
    elements.sectionEditor.classList.add('hidden');
    state.editingSectionIndex = null;
  }

  // 5, 6, 7. 구간 저장
  function saveSectionEditor() {
    const song = getActiveSong();
    const name = elements.edName.value || 'Verse';
    const bars = clamp(Math.round(Number(elements.edBars.value) || 4), 1, 999);
    const bpm = clamp(Math.round(Number(elements.edBpm.value) || 120), 30, 400);
    const beats = clamp(Math.round(Number(elements.edBeats.value) || 4), 2, 31);
    const division = [2, 4, 8, 16, 32].includes(Number(elements.edDivision.value)) ? Number(elements.edDivision.value) : 4;
    const guideVoice = elements.edGuideVoice.checked;
    const accentBeats = normaliseAccents(state.edAccents, beats);

    const payload = {
      id: state.editingSectionIndex !== null && song.sections[state.editingSectionIndex]
        ? song.sections[state.editingSectionIndex].id
        : `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name, bars, bpm, beats, division, guideVoice, accentBeats
    };

    if (state.editingSectionIndex !== null && song.sections[state.editingSectionIndex]) {
      song.sections[state.editingSectionIndex] = payload;
      setStatus(`구간 '${name}' 수정 완료`);
      addLog('SECTION_EDIT', { idx: state.editingSectionIndex, payload });
    } else {
      song.sections.push(payload);
      setStatus(`새 구간 '${name}' 추가 완료`);
      addLog('SECTION_ADD', { payload });
    }

    persistSongs();
    closeSectionEditor();
    updateSongMonitorUI();
    renderSectionsTimeline();
  }

  // 옵션 모달 및 악센트 표시방법 & 볼륨 조작
  function openOptionsModal() {
    elements.accentRadios.forEach((r) => {
      r.checked = r.value === state.options.accentVisual;
    });
    if (elements.voiceVolumeSlider && elements.voiceVolumeDisplay) {
      elements.voiceVolumeSlider.value = state.options.voiceVolume;
      elements.voiceVolumeDisplay.textContent = `${state.options.voiceVolume}%`;
    }
    elements.optionsModal.classList.remove('hidden');
    addLog('OPTIONS_OPEN');
  }

  function closeOptionsModal() {
    elements.optionsModal.classList.add('hidden');
    addLog('OPTIONS_CLOSE');
  }

  // 1분간 로그 복사 및 팝업 송출
  function submitRecentLogs() {
    const now = Date.now();
    const oneMinAgo = now - 60000;
    const recent = logRingBuffer.filter((l) => l.time >= oneMinAgo);

    const song = getActiveSong();
    const curSec = song.sections[state.currentSectionIndex] || {};

    const reportLines = [
      `=== PULSE METRONOME RECENT 1-MINUTE LOG ===`,
      `생성 시각: ${new Date().toLocaleString('ko-KR')}`,
      `User Agent: ${navigator.userAgent}`,
      `모드: ${state.mode === 'song' ? '트랙 메트로놈' : '기본 메트로놈'}`,
      `단일 모드: BPM=${state.bpm}, 박자=${state.beats}, 음표=${state.division}, 볼륨=${state.volume}, 음소거=${state.muted}`,
      `트랙 모드: 트랙명='${song.name}', 현재구간='${curSec.name}', BPM=${curSec.bpm}, 박자=${curSec.beats}/${curSec.division || 4}, 가이드보이스=${curSec.guideVoice !== false}`,
      `옵션: 악센트 표시방법=${state.options.accentVisual}, 보이스 가이드 볼륨=${state.options.voiceVolume}%`,
      `오디오 상태: ${state.audioContext?.state || '미생성'}, 재생 중=${state.playing}, 보이스엔진 준비=${VoiceGuide.isReady}`,
      `----------------------------------------`,
      `[최근 1분간의 이벤트 (${recent.length}건)]:`,
      ...(recent.length > 0
        ? recent.map((l) => `[${new Date(l.time).toLocaleTimeString()}.${String(l.time % 1000).padStart(3, '0')}] ${l.action} ${JSON.stringify(l.detail)}`)
        : [`(최근 1분간 기록된 이벤트가 없습니다)`]),
      `========================================`
    ];

    const reportText = reportLines.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(reportText).catch(() => copyFallback(reportText));
    } else {
      copyFallback(reportText);
    }

    addLog('SUBMIT_LOGS_CLICKED', { logCount: recent.length });

    elements.logAlertMessage.textContent = "‘inho95063@gmail.com’ 으로 로그를 보내주세요";
    elements.logAlertModal.classList.remove('hidden');
  }

  function copyFallback(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    } catch (_) {}
  }

  // 이벤트 바인딩
  elements.tabSingle.addEventListener('click', () => {
    if (state.mode === 'single') return;
    const wasPlaying = state.playing;
    if (wasPlaying) stop();
    state.mode = 'single';
    updateModeView();
    persistSettings();
    addLog('MODE_SWITCH', { mode: 'single' });
    if (wasPlaying) start();
  });

  elements.tabSong.addEventListener('click', () => {
    if (state.mode === 'song') return;
    const wasPlaying = state.playing;
    if (wasPlaying) stop();
    state.mode = 'song';
    updateModeView();
    persistSettings();
    addLog('MODE_SWITCH', { mode: 'song' });
    if (wasPlaying) start();
  });

  // 옵션 모달 리스너
  elements.btnOpenOptions.addEventListener('click', openOptionsModal);
  elements.btnCloseOptions.addEventListener('click', closeOptionsModal);
  elements.optionsBackdrop.addEventListener('click', closeOptionsModal);

  elements.accentRadios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      state.options.accentVisual = e.target.value;
      persistSettings();
      addLog('ACCENT_VISUAL_CHANGE', { visual: state.options.accentVisual });
    });
  });

  // 1. 보이스 가이드 볼륨 조절 리스너
  elements.voiceVolumeSlider?.addEventListener('input', (e) => {
    const vol = clamp(Number(e.target.value) || 0, 0, 100);
    state.options.voiceVolume = vol;
    if (elements.voiceVolumeDisplay) {
      elements.voiceVolumeDisplay.textContent = `${vol}%`;
    }
    VoiceGuide.setVolume(vol);
    persistSettings();
    addLog('VOICE_VOLUME_CHANGE', { volume: vol });
  });

  elements.btnSubmitLogs.addEventListener('click', submitRecentLogs);
  elements.btnAlertClose.addEventListener('click', () => {
    elements.logAlertModal.classList.add('hidden');
  });

  // 기본 모드 입력 핸들러
  elements.tempo.addEventListener('change', (e) => setSingleTempo(e.target.value));
  elements.tempo.addEventListener('input', (e) => {
    const v = Number(e.target.value);
    if (v >= 30 && v <= 400) setSingleTempo(v);
  });
  elements.slider.addEventListener('input', (e) => setSingleTempo(e.target.value));
  elements.tempoDown.addEventListener('click', () => setSingleTempo(state.bpm - 1));
  elements.tempoUp.addEventListener('click', () => setSingleTempo(state.bpm + 1));

  // 박자 범위 2~31 핸들러
  elements.beats.addEventListener('change', (e) => {
    state.beats = clamp(Number(e.target.value) || 4, 2, 31);
    state.currentBeat = 0;
    state.accentBeats = normaliseAccents(state.accentBeats, state.beats);
    updateSingleUI();
    persistSettings();
    addLog('BEATS_CHANGE', { beats: state.beats });
  });

  // 음표 2, 4, 8, 16, 32 핸들러
  elements.division.addEventListener('change', (e) => {
    state.division = Number(e.target.value);
    persistSettings();
    addLog('DIVISION_CHANGE', { division: state.division });
  });

  elements.volume.addEventListener('input', (e) => {
    state.volume = Number(e.target.value);
    persistSettings();
    addLog('VOLUME_CHANGE', { volume: state.volume });
  });

  elements.accentControls.addEventListener('click', (e) => {
    const btn = e.target.closest('.accent-beat');
    if (!btn) return;
    const b = Number(btn.dataset.beat);
    state.accentBeats = state.accentBeats.includes(b)
      ? state.accentBeats.filter((x) => x !== b)
      : [...state.accentBeats, b].sort((x, y) => x - y);
    renderSingleAccentControls();
    persistSettings();
    addLog('ACCENTS_TOGGLE', { accents: state.accentBeats });
  });

  // 공통 컨트롤
  elements.play.addEventListener('click', togglePlayback);
  elements.tap.addEventListener('click', tapTempo);
  elements.mute.addEventListener('click', () => {
    state.muted = !state.muted;
    updateSoundButton();
    persistSettings();
    addLog('MUTE_TOGGLE', { muted: state.muted });
  });

  // 트랙 메트로놈 프리셋 핸들러
  elements.songSelect.addEventListener('change', (e) => {
    state.activeSongId = e.target.value;
    state.currentSectionIndex = 0;
    state.currentMeasure = 0;
    state.currentBeat = 0;
    updateSongMonitorUI();
    renderSectionsTimeline();
    persistSettings();
    setStatus(`트랙 변경: ${getActiveSong().name}`);
    addLog('TRACK_SELECT', { id: state.activeSongId, name: getActiveSong().name });
  });

  elements.songBtnNew.addEventListener('click', () => {
    const name = window.prompt('새 트랙 프리셋 이름을 입력하세요:', `새 트랙 ${state.songs.length + 1}`);
    if (!name || !name.trim()) return;
    const newSong = {
      id: `track-${Date.now()}`,
      name: name.trim(),
      loop: true,
      sections: [
        { id: `sec-1-${Date.now()}`, name: 'Intro', bars: 4, bpm: 120, beats: 4, division: 4, guideVoice: true, accentBeats: [0] },
        { id: `sec-2-${Date.now()}`, name: 'Verse', bars: 8, bpm: 120, beats: 4, division: 4, guideVoice: true, accentBeats: [0] }
      ]
    };
    state.songs.push(newSong);
    state.activeSongId = newSong.id;
    state.currentSectionIndex = 0;
    state.currentMeasure = 0;
    state.currentBeat = 0;
    persistSongs();
    persistSettings();
    updateModeView();
    setStatus(`새 트랙 '${newSong.name}' 생성 완료`);
    addLog('TRACK_NEW', { name: newSong.name });
  });

  elements.songBtnRename.addEventListener('click', () => {
    const song = getActiveSong();
    const newName = window.prompt('트랙 이름 변경:', song.name);
    if (!newName || !newName.trim() || newName.trim() === song.name) return;
    const oldName = song.name;
    song.name = newName.trim();
    persistSongs();
    renderSongSelect();
    setStatus(`트랙 이름 변경됨: ${song.name}`);
    addLog('TRACK_RENAME', { from: oldName, to: song.name });
  });

  elements.songBtnDuplicate.addEventListener('click', () => {
    const current = getActiveSong();
    const cloned = JSON.parse(JSON.stringify(current));
    cloned.id = `track-${Date.now()}`;
    cloned.name = `${current.name} (복사본)`;
    cloned.sections.forEach((sec, idx) => {
      sec.id = `sec-${Date.now()}-${idx}`;
    });
    state.songs.push(cloned);
    state.activeSongId = cloned.id;
    state.currentSectionIndex = 0;
    state.currentMeasure = 0;
    state.currentBeat = 0;
    persistSongs();
    persistSettings();
    updateModeView();
    setStatus(`트랙 복제 완료: ${cloned.name}`);
    addLog('TRACK_DUPLICATE', { name: cloned.name });
  });

  elements.songBtnDelete.addEventListener('click', () => {
    if (state.songs.length <= 1) {
      window.alert('최소 1개의 트랙 프리셋이 필요합니다.');
      return;
    }
    const current = getActiveSong();
    if (!window.confirm(`'${current.name}' 트랙을 삭제하시겠습니까?`)) return;
    const delName = current.name;
    state.songs = state.songs.filter((s) => s.id !== current.id);
    state.activeSongId = state.songs[0].id;
    state.currentSectionIndex = 0;
    state.currentMeasure = 0;
    state.currentBeat = 0;
    persistSongs();
    persistSettings();
    updateModeView();
    setStatus(`트랙 삭제 완료`);
    addLog('TRACK_DELETE', { name: delName });
  });

  elements.btnRewind.addEventListener('click', rewindSong);
  elements.btnToggleLoop.addEventListener('click', () => {
    const song = getActiveSong();
    song.loop = !song.loop;
    persistSongs();
    updateSongMonitorUI();
    addLog('TRACK_LOOP_TOGGLE', { loop: song.loop });
  });

  // 타임라인 내 구간 클릭 및 조작
  elements.sectionsList.addEventListener('click', (e) => {
    const song = getActiveSong();
    const btnUp = e.target.closest('.btn-up');
    const btnDown = e.target.closest('.btn-down');
    const btnEdit = e.target.closest('.btn-edit');
    const btnDel = e.target.closest('.btn-del');

    if (btnUp) {
      e.stopPropagation();
      const idx = Number(btnUp.dataset.idx);
      if (idx > 0) {
        const temp = song.sections[idx];
        song.sections[idx] = song.sections[idx - 1];
        song.sections[idx - 1] = temp;
        persistSongs();
        updateSongMonitorUI();
        renderSectionsTimeline();
        addLog('SECTION_MOVE_UP', { idx });
      }
      return;
    }
    if (btnDown) {
      e.stopPropagation();
      const idx = Number(btnDown.dataset.idx);
      if (idx < song.sections.length - 1) {
        const temp = song.sections[idx];
        song.sections[idx] = song.sections[idx + 1];
        song.sections[idx + 1] = temp;
        persistSongs();
        updateSongMonitorUI();
        renderSectionsTimeline();
        addLog('SECTION_MOVE_DOWN', { idx });
      }
      return;
    }
    if (btnEdit) {
      e.stopPropagation();
      const idx = Number(btnEdit.dataset.idx);
      openSectionEditor(idx);
      return;
    }
    if (btnDel) {
      e.stopPropagation();
      if (song.sections.length <= 1) {
        window.alert('트랙에는 최소 1개의 구간이 있어야 합니다.');
        return;
      }
      const idx = Number(btnDel.dataset.idx);
      const targetSec = song.sections[idx];
      if (window.confirm(`'${targetSec.name}' 구간을 삭제하시겠습니까?`)) {
        song.sections.splice(idx, 1);
        if (state.currentSectionIndex >= song.sections.length) {
          state.currentSectionIndex = song.sections.length - 1;
        }
        state.currentMeasure = 0;
        state.currentBeat = 0;
        persistSongs();
        updateSongMonitorUI();
        renderSectionsTimeline();
        addLog('SECTION_DELETE', { name: targetSec.name });
      }
      return;
    }

    const item = e.target.closest('.section-item');
    if (item && item.dataset.index !== undefined) {
      seekToSection(Number(item.dataset.index));
    }
  });

  elements.btnAddSection.addEventListener('click', () => openSectionEditor(null));
  elements.editorBtnClose.addEventListener('closeSectionEditor', closeSectionEditor);
  elements.editorBtnClose.addEventListener('click', closeSectionEditor);
  elements.edBtnCancel.addEventListener('click', closeSectionEditor);
  elements.edBtnSave.addEventListener('click', saveSectionEditor);

  // 박자 변경 시 강박 개수 재렌더링
  elements.edBeats.addEventListener('change', (e) => {
    const b = Number(e.target.value);
    state.edAccents = normaliseAccents(state.edAccents, b);
    renderEditorAccents(b);
  });

  elements.edAccentControls.addEventListener('click', (e) => {
    const btn = e.target.closest('.ed-accent-beat');
    if (!btn) return;
    const b = Number(btn.dataset.beat);
    state.edAccents = state.edAccents.includes(b)
      ? state.edAccents.filter((x) => x !== b)
      : [...state.edAccents, b].sort((x, y) => x - y);
    renderEditorAccents(Number(elements.edBeats.value));
  });

  // 키보드 스페이스바 재생/정지
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      togglePlayback();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.playing && state.audioContext) {
      state.nextNoteTime = state.audioContext.currentTime + 0.05;
    }
  });
  window.addEventListener('pagehide', stop);

  // 초기 렌더링
  updateSoundButton();
  updateModeView();

  window.PulseMetronome = {
    getState: () => ({
      ...state,
      songs: JSON.parse(JSON.stringify(state.songs)),
      activeSong: getActiveSong(),
      schedulerTimer: Boolean(state.schedulerTimer),
      logCount: logRingBuffer.length,
      voiceReady: VoiceGuide.isReady,
      voiceVolume: state.options.voiceVolume
    }),
    VoiceGuide,
    start, stop, togglePlayback, setSingleTempo, seekToSection, rewindSong,
    openOptionsModal, closeOptionsModal, submitRecentLogs, addLog
  };
})();
