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
    // 상단 옵션 및 탭별 가이드 버튼
    btnOpenOptions: $('btn-open-options'), btnOpenGuide: $('btn-open-guide'),
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
    btnCloseOptions: $('btn-close-options'), btnOpenOptionsGuide: $('btn-open-options-guide'), btnSubmitLogs: $('btn-submit-logs'),
    // 고정 가이드 화면
    guideScreen: $('guide-screen'), guideScreenImg: $('guide-screen-img'),
    btnGuideScreenClose: $('btn-guide-screen-close'),
    guideZonePrev: $('guide-zone-prev'), guideZoneNext: $('guide-zone-next'),
    accentRadios: document.querySelectorAll('input[name="accent-visual"]'),
    voiceVolumeSlider: $('voice-volume-slider'),
    voiceVolumeDisplay: $('voice-volume-display'),
    // 로그 제출 안내 팝업
    logAlertModal: $('log-alert-modal'), btnAlertClose: $('btn-alert-close'),
    logAlertMessage: $('log-alert-message'),
    // 전체 마디 점프 모달
    btnJumpBar: $('btn-jump-bar'),
    jumpBarModal: $('jump-bar-modal'),
    jumpBarHelp: $('jump-bar-help'),
    jumpBarInput: $('jump-bar-input'),
    btnJumpCancel: $('btn-jump-cancel'),
    btnJumpConfirm: $('btn-jump-confirm'),
    // 전체 마디 구간 일괄 수정 모달
    batchEditorModal: $('batch-editor-modal'),
    batchEditorBackdrop: $('batch-editor-backdrop'),
    batchBtnClose: $('batch-btn-close'),
    batchBars: $('batch-bars'),
    btnBatchBarsKeep: $('btn-batch-bars-keep'),
    batchBpm: $('batch-bpm'),
    btnBatchBpmKeep: $('btn-batch-bpm-keep'),
    batchBeats: $('batch-beats'),
    batchDivision: $('batch-division'),
    batchGuideVoice: $('batch-guide-voice'),
    batchAccentControls: $('batch-accent-controls'),
    batchBtnCancel: $('batch-btn-cancel'),
    batchBtnSave: $('batch-btn-save')
  };

  const SETTINGS_KEY = 'pulse-metronome-settings-v10';
  const SONGS_KEY = 'pulse-metronome-songs-v12';
  const PLAYBACK_POSITION_KEY = 'pulse-metronome-playback-position-v1';
  const SCHEDULE_AHEAD_SECONDS = 0.12;
  const LOOKAHEAD_MS = 25;
  const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAA';

  // 탭별 고정 가이드 이미지 세트
  const GUIDE_SETS = {
    single: [
      'guide_images/step_guide_01_tempo.jpg',
      'guide_images/step_guide_02_meter_division.jpg',
      'guide_images/step_guide_03_accent.jpg',
      'guide_images/step_guide_04_tap_play.jpg'
    ],
    song: [
      'guide_images/step_guide_05_track_presets.jpg',
      'guide_images/step_guide_06_sections_voice.jpg'
    ],
    options: [
      'guide_images/step_guide_07_accent_visual.jpg',
      'guide_images/step_guide_08_voice_volume_log.jpg'
    ]
  };
  const guideState = { scope: 'single', index: 0 };

  // 구버전 로컬스토리지 정리
  try {
    localStorage.removeItem('pulse-metronome-songs-v6');
    localStorage.removeItem('pulse-metronome-songs-v7');
    localStorage.removeItem('pulse-metronome-songs-v8');
    localStorage.removeItem('pulse-metronome-songs-v9');
    localStorage.removeItem('pulse-metronome-songs-v10');
    localStorage.removeItem('pulse-metronome-songs-v11');
    localStorage.removeItem('pulse-metronome-songs');
  } catch (_) {}

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
    'Ready', 'Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Interlude', 'Pre-Bridge', 'Bridge', 'Solo', 'Outro'
  ];

  // 기본 트랙 메트로놈 프리셋 (Mrs. GREEN APPLE 정밀 분석 기반 샘플, Ready 4마디 시작)
  const DEFAULT_SONGS = [
  {
    "id": "hebe-parade",
    "name": "HEBE - Parade",
    "loop": true,
    "sections": [
      {
        "id": "hb-ready",
        "name": "Ready",
        "bars": 4,
        "bpm": 94,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [0]
      },
      {
        "id": "hb-1",
        "name": "Intro",
        "bars": 12,
        "bpm": 94,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "hb-2",
        "name": "Verse",
        "bars": 8,
        "bpm": 94,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "hb-3",
        "name": "Pre-Chorus",
        "bars": 8,
        "bpm": 94,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "hb-4",
        "name": "Chorus",
        "bars": 16,
        "bpm": 94,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "hb-5",
        "name": "Interlude",
        "bars": 8,
        "bpm": 94,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "hb-6",
        "name": "Solo",
        "bars": 1,
        "bpm": 94,
        "beats": 2,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "hb-7",
        "name": "Solo",
        "bars": 8,
        "bpm": 94,
        "beats": 4,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "hb-8",
        "name": "Solo",
        "bars": 1,
        "bpm": 94,
        "beats": 2,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "hb-9",
        "name": "Chorus",
        "bars": 16,
        "bpm": 94,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "hb-10",
        "name": "Outro",
        "bars": 4,
        "bpm": 94,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      }
    ]
  },
  {
    "id": "mga-start",
    "name": "Mrs Green Apple - StaRt",
    "loop": true,
    "sections": [
      {
        "id": "st-0",
        "name": "Ready",
        "bars": 4,
        "bpm": 190,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "st-1",
        "name": "Intro",
        "bars": 8,
        "bpm": 190,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "st-2",
        "name": "Verse",
        "bars": 8,
        "bpm": 190,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "st-3",
        "name": "Pre-Chorus",
        "bars": 8,
        "bpm": 190,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "st-4",
        "name": "Chorus",
        "bars": 16,
        "bpm": 190,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "st-5",
        "name": "Interlude",
        "bars": 8,
        "bpm": 190,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "st-6",
        "name": "Verse",
        "bars": 8,
        "bpm": 190,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "st-7",
        "name": "Pre-Chorus",
        "bars": 8,
        "bpm": 190,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "st-8",
        "name": "Chorus",
        "bars": 16,
        "bpm": 190,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "st-9",
        "name": "Interlude",
        "bars": 8,
        "bpm": 190,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "st-10",
        "name": "Solo",
        "bars": 8,
        "bpm": 190,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "st-11",
        "name": "Bridge",
        "bars": 16,
        "bpm": 190,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "st-12",
        "name": "Interlude",
        "bars": 8,
        "bpm": 190,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "st-13",
        "name": "Chorus",
        "bars": 17,
        "bpm": 190,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "st-14",
        "name": "Outro",
        "bars": 21,
        "bpm": 190,
        "beats": 4,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      }
    ]
  },
  {
    "id": "mga-a-posteriori",
    "name": "Mrs Green Apple - A Posteriori",
    "loop": true,
    "sections": [
      {
        "id": "ap-1",
        "name": "Ready",
        "bars": 4,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-2",
        "name": "Intro",
        "bars": 14,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-3",
        "name": "Intro",
        "bars": 2,
        "bpm": 192,
        "beats": 3,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-4",
        "name": "Intro",
        "bars": 1,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-5",
        "name": "Verse",
        "bars": 10,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-6",
        "name": "Verse",
        "bars": 1,
        "bpm": 192,
        "beats": 2,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-7",
        "name": "Verse",
        "bars": 2,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-8",
        "name": "Chorus",
        "bars": 6,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-9",
        "name": "Chorus",
        "bars": 2,
        "bpm": 192,
        "beats": 3,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-10",
        "name": "Chorus",
        "bars": 1,
        "bpm": 192,
        "beats": 4,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-11",
        "name": "Interlude",
        "bars": 6,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-12",
        "name": "Interlude",
        "bars": 2,
        "bpm": 192,
        "beats": 3,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-13",
        "name": "Interlude",
        "bars": 1,
        "bpm": 192,
        "beats": 4,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-14",
        "name": "Verse",
        "bars": 12,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-15",
        "name": "Chorus",
        "bars": 6,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-16",
        "name": "Chorus",
        "bars": 2,
        "bpm": 192,
        "beats": 3,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-17",
        "name": "Chorus",
        "bars": 1,
        "bpm": 192,
        "beats": 4,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-18",
        "name": "Solo",
        "bars": 8,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-19",
        "name": "Bridge",
        "bars": 19,
        "bpm": 192,
        "beats": 3,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-20",
        "name": "Bridge",
        "bars": 1,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-21",
        "name": "Bridge",
        "bars": 3,
        "bpm": 192,
        "beats": 3,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-22",
        "name": "Bridge",
        "bars": 1,
        "bpm": 192,
        "beats": 4,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-23",
        "name": "Chorus",
        "bars": 6,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-24",
        "name": "Chorus",
        "bars": 2,
        "bpm": 192,
        "beats": 3,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-25",
        "name": "Chorus",
        "bars": 1,
        "bpm": 192,
        "beats": 4,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-26",
        "name": "Chorus",
        "bars": 6,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-27",
        "name": "Chorus",
        "bars": 2,
        "bpm": 192,
        "beats": 3,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-28",
        "name": "Chorus",
        "bars": 1,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-29",
        "name": "Chorus",
        "bars": 3,
        "bpm": 192,
        "beats": 3,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-30",
        "name": "Outro",
        "bars": 6,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": true,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-31",
        "name": "Outro",
        "bars": 3,
        "bpm": 192,
        "beats": 3,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      },
      {
        "id": "ap-32",
        "name": "Outro",
        "bars": 8,
        "bpm": 192,
        "beats": 5,
        "division": 4,
        "guideVoice": false,
        "accentBeats": [
          0
        ]
      }
    ]
  }
];

  // 로컬 스토리지 로드
  const savedSettings = (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; } })();
  const savedSongs = (() => {
    try {
      const data = JSON.parse(localStorage.getItem(SONGS_KEY));
      if (Array.isArray(data) && data.length > 0) {
        const hebe = data.find((s) => s.id === 'hebe-parade');
        if (hebe && Array.isArray(hebe.sections) && hebe.sections[0]?.name === 'Ready') {
          return data;
        }
      }
      return DEFAULT_SONGS;
    } catch {
      return DEFAULT_SONGS;
    }
  })();

  const state = {
    mode: ['single', 'song'].includes(savedSettings.mode) ? savedSettings.mode : 'single',
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
    lastTransition: null,
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
    edAccents: [0],
    batchAccents: [0],
    batchAccentsKeep: true,
    lastScrolledSectionIndex: null
  };

  // Web Audio 기반 고정밀 가이드 보이스 엔진 (내장 여성 스프라이트)
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
        const vol = (state.options.voiceVolume / 100) * 1.8;
        this.voiceGain.gain.setValueAtTime(vol, this.audioContext.currentTime);
        this.voiceGain.connect(state.masterCompressor || this.audioContext.destination);
      }
      if (this.isReady || this.isLoading || !this.audioContext) return;

      const spriteData = window.VOICE_SPRITE_DATA;
      if (!spriteData) return;

      this.isLoading = true;
      try {
        const res = await fetch(spriteData);
        const arrayBuf = await res.arrayBuffer();
        this.spriteBuffer = await this.audioContext.decodeAudioData(arrayBuf);
        this.isReady = Boolean(this.spriteBuffer);
      } catch (e) {
        console.warn('Voice sprite decode error', e);
      } finally {
        this.isLoading = false;
      }
    },

    setVolume(percent) {
      const vol = (clamp(Number(percent) || 0, 0, 100) / 100) * 1.8;
      if (this.voiceGain && this.audioContext) {
        this.voiceGain.gain.setValueAtTime(vol, this.audioContext.currentTime);
      }
    },

    playClip(key, scheduleTime = null, bpm = null) {
      if (!this.audioContext) return;
      const lookupKey = String(key || '').toLowerCase().replace(/brigde/i, 'bridge').trim();
      const spriteMap = window.VOICE_SPRITE_MAP;
      const item = spriteMap?.[lookupKey];

      if (this.isReady && this.spriteBuffer && item) {
        try {
          const source = this.audioContext.createBufferSource();
          source.buffer = this.spriteBuffer;
          // 어떤 BPM에서도 원본 속도/피치를 고정하여 자연스러운 톤을 유지한다.
          source.playbackRate.value = 1.0;
          source.connect(this.voiceGain || state.masterCompressor || this.audioContext.destination);
          const startTime = scheduleTime !== null ? Math.max(scheduleTime, this.audioContext.currentTime) : this.audioContext.currentTime;
          source.start(startTime, item.start, item.duration);
        } catch (_) {}
      }
    },

    speakSectionName(name, scheduleTime = null) {
      const clean = String(name || '').toLowerCase().replace(/brigde/i, 'bridge').trim();
      const baseTitle = ALLOWED_SECTION_TITLES.map((t) => t.toLowerCase().replace(/\s+/g, '-'))
        .find((t) => clean.startsWith(t)) || clean.replace(/\s+/g, '-');
      this.playClip(baseTitle, scheduleTime);
    },

    speakCount(number, scheduleTime = null, bpm = null) {
      this.playClip(String(number), scheduleTime, bpm);
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

  function persistPlaybackPosition() {
    localStorage.setItem(PLAYBACK_POSITION_KEY, JSON.stringify({
      songId: state.activeSongId,
      sectionIndex: state.currentSectionIndex,
      measure: state.currentMeasure,
      beat: state.currentBeat
    }));
  }

  function restorePlaybackPosition() {
    try {
      const saved = JSON.parse(localStorage.getItem(PLAYBACK_POSITION_KEY));
      const song = getActiveSong();
      if (!saved || saved.songId !== song.id) return;
      const sectionIndex = clamp(Number(saved.sectionIndex) || 0, 0, Math.max(0, song.sections.length - 1));
      const section = song.sections[sectionIndex];
      state.currentSectionIndex = sectionIndex;
      state.currentMeasure = clamp(Number(saved.measure) || 0, 0, Math.max(0, Number(section?.bars || 1) - 1));
      state.currentBeat = clamp(Number(saved.beat) || 0, 0, Math.max(0, Number(section?.beats || 1) - 1));
    } catch (_) {}
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

  function scrollActiveSectionIntoView(behavior = 'smooth') {
    const activeEl = elements.sectionsList.querySelector('.section-item.is-active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior, block: 'center' });
    }
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
      elements.tap.classList.add('batch-edit-btn');
      elements.tap.innerHTML = '<span class="tap-icon">📝</span><span>일괄 수정</span>';
      elements.tap.setAttribute('aria-label', '전체 구간 일괄 수정');
      renderSongSelect();
      updateSongMonitorUI();
      renderSectionsTimeline();
      scrollActiveSectionIntoView('auto');
    } else {
      elements.tap.classList.remove('batch-edit-btn');
      elements.tap.innerHTML = 'TAP<span>템포 맞추기</span>';
      elements.tap.setAttribute('aria-label', '탭 템포 측정');
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
    // 마스터 컴프레서/리미터 생성 (전반적인 소리 대폭 상승 & 왜곡 방지)
    if (!state.masterCompressor && state.audioContext) {
      const comp = state.audioContext.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-6, state.audioContext.currentTime);
      comp.knee.setValueAtTime(6, state.audioContext.currentTime);
      comp.ratio.setValueAtTime(14, state.audioContext.currentTime);
      comp.attack.setValueAtTime(0.001, state.audioContext.currentTime);
      comp.release.setValueAtTime(0.06, state.audioContext.currentTime);
      comp.connect(state.audioContext.destination);
      state.masterCompressor = comp;
      if (VoiceGuide.voiceGain) {
        try { VoiceGuide.voiceGain.disconnect(); VoiceGuide.voiceGain.connect(state.masterCompressor); } catch (_) {}
      }
    }
    unlockIosSpeaker();
    await VoiceGuide.init(state.audioContext);
    if (state.audioContext.state === 'suspended') await state.audioContext.resume();
  }

  // 정밀 오디오 클릭음 합성 (2. 전반적인 볼륨 대폭 상승 & 펀치감 있는 트랜지언트)
  function scheduleClick(time, isAccent) {
    if (state.muted || !state.audioContext) return;
    const dest = state.masterCompressor || state.audioContext.destination;
    const userVol = (state.volume / 100);

    // 1. 바디 오실레이터 (우드블록 공명감)
    const oscBody = state.audioContext.createOscillator();
    const gainBody = state.audioContext.createGain();
    oscBody.frequency.setValueAtTime(isAccent ? 1680 : 1120, time);
    oscBody.type = isAccent ? 'sine' : 'triangle';
    gainBody.gain.setValueAtTime(0.0001, time);
    gainBody.gain.exponentialRampToValueAtTime(userVol * (isAccent ? 1.7 : 1.35), time + 0.0015);
    gainBody.gain.exponentialRampToValueAtTime(0.0001, time + 0.048);
    oscBody.connect(gainBody).connect(dest);
    oscBody.start(time);
    oscBody.stop(time + 0.052);

    // 2. 고주파 트랜지언트 클릭 (모바일 스피커에서도 선명하게 꽂히는 타격감)
    const oscClick = state.audioContext.createOscillator();
    const gainClick = state.audioContext.createGain();
    oscClick.type = 'square';
    oscClick.frequency.setValueAtTime(isAccent ? 3200 : 2400, time);
    oscClick.frequency.exponentialRampToValueAtTime(600, time + 0.012);
    gainClick.gain.setValueAtTime(userVol * (isAccent ? 0.75 : 0.55), time);
    gainClick.gain.exponentialRampToValueAtTime(0.0001, time + 0.014);
    oscClick.connect(gainClick).connect(dest);
    oscClick.start(time);
    oscClick.stop(time + 0.016);
  }

  // 박자 시각 효과 렌더링 (전체화면 | 부분화면 | 끄기)
  function renderBeat(beat, isAccent, captionOverride = null) {
    elements.beatNumber.textContent = String(beat + 1);
    if (elements.beatCaption) elements.beatCaption.textContent = captionOverride || (isAccent ? `${beat + 1}박 · 강박` : `${beat + 1}번째 박`);

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

        // 3. 가이드 보이스: 다음 보이스 가이드 활성 section이 시작되기 정확히 2마디 전 섹션명, 1마디 전 카운트
        function findUpcomingGuideTarget() {
          let barsUntil = curSec.bars - measure;
          let idx = (secIdx + 1) % song.sections.length;
          let visited = 0;
          while (visited < song.sections.length) {
            if (!song.loop && idx < secIdx) break;
            const target = song.sections[idx];
            if (target && target.guideVoice !== false) {
              return { target, barsUntil };
            }
            barsUntil += Number(target.bars || 1);
            if (barsUntil > 2) break;
            idx = (idx + 1) % song.sections.length;
            visited += 1;
          }
          return { target: null, barsUntil: 999 };
        }

        const { target: nextGuideSec, barsUntil: guideBarsUntil } = findUpcomingGuideTarget();
        const isTwoBarsBeforeName = Boolean(nextGuideSec) && (guideBarsUntil === 2) && (beat === 0);
        const isOneBarBeforeCount = Boolean(nextGuideSec) && (guideBarsUntil === 1);
        const isFirstBeatOfSong = (secIdx === 0 && measure === 0 && beat === 0);

        // 오디오 스케줄링 (클릭음 및 가이드 보이스를 동일 Web Audio 컨텍스트에서 정밀 재생)
        scheduleClick(noteTime, accent);

        if (isFirstBeatOfSong && curSec.guideVoice !== false && curSec.name.toLowerCase() === 'ready') {
          VoiceGuide.speakSectionName(curSec.name, noteTime);
        } else if (isTwoBarsBeforeName && nextGuideSec) {
          VoiceGuide.speakSectionName(nextGuideSec.name, noteTime);
        } else if (isOneBarBeforeCount) {
          VoiceGuide.speakCount(beat + 1, noteTime, curSec.bpm);
        }

        const delay = Math.max(0, (noteTime - state.audioContext.currentTime) * 1000);
        window.setTimeout(() => {
          if (state.playing && state.mode === 'song') {
            renderBeat(beat, accent, `${curSec.name} · ${measure + 1}/${curSec.bars}마디`);
            updateSongMonitorUI();
            renderSectionsTimeline();
            if (state.lastScrolledSectionIndex !== secIdx) {
              scrollActiveSectionIntoView('smooth');
              state.lastScrolledSectionIndex = secIdx;
            }

            if (isTwoBarsBeforeName && nextGuideSec) {
              addLog('GUIDE_VOICE_SECTION', { target: nextGuideSec.name, bar: measure + 1 });
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
            const previousSectionName = curSec.name;
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
            const transitionedSection = song.sections[state.currentSectionIndex];
            if (transitionedSection) {
              persistPlaybackPosition();
              window.setTimeout(() => {
                if (state.playing && state.mode === 'song' && state.currentSectionIndex === song.sections.indexOf(transitionedSection)) {
                  state.lastTransition = { from: previousSectionName, to: transitionedSection.name };
                  updateSongMonitorUI();
                  renderSectionsTimeline();
                  scrollActiveSectionIntoView('smooth');
                  state.lastScrolledSectionIndex = state.currentSectionIndex;
                  setStatus(`${transitionedSection.name} 구간으로 전환`, true);
                  addLog('TRACK_SECTION_CHANGE', { from: previousSectionName, to: transitionedSection.name });
                }
              }, delay + (60 / curSec.bpm) * 1000);
            }
          }
        }
        persistPlaybackPosition();
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
        scrollActiveSectionIntoView('smooth');
        state.lastScrolledSectionIndex = state.currentSectionIndex;
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
    persistPlaybackPosition();
    state.playing = false;
    window.clearInterval(state.schedulerTimer);
    state.schedulerTimer = null;
    state.iosUnlockAudio?.pause();
    elements.play.classList.remove('is-playing');
    elements.play.setAttribute('aria-pressed', 'false');
    elements.playLabel.textContent = '시작';
    elements.beatLight.classList.remove('active', 'accent');
    elements.beatLight.classList.add('idle');
    if (elements.beatCaption) elements.beatCaption.textContent = '';
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
    scrollActiveSectionIntoView('smooth');
    state.lastScrolledSectionIndex = 0;
    persistPlaybackPosition();
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
    scrollActiveSectionIntoView('smooth');
    state.lastScrolledSectionIndex = idx;
    persistPlaybackPosition();
    setStatus(`${song.sections[idx].name} 구간으로 이동`);
    addLog('TRACK_SEEK', { secIdx: idx, name: song.sections[idx].name });
  }

  // 3, 4. '전체 마디' 버튼 선택 시 희망 마디로 이동
  function seekToTotalMeasure(targetBarNum) {
    const song = getActiveSong();
    const total = getTotalSongBars(song);
    const target = clamp(Math.round(Number(targetBarNum) || 1), 1, total);

    let accumulated = 0;
    for (let i = 0; i < song.sections.length; i += 1) {
      const secBars = Number(song.sections[i].bars || 1);
      if (target <= accumulated + secBars) {
        state.currentSectionIndex = i;
        state.currentMeasure = target - accumulated - 1; // 0-indexed
        state.currentBeat = 0;
        if (state.playing && state.audioContext) {
          state.nextNoteTime = state.audioContext.currentTime + 0.05;
        }
        updateSongMonitorUI();
        renderSectionsTimeline();
        persistPlaybackPosition();
        setStatus(`전체 ${target}마디 (${song.sections[i].name} ${state.currentMeasure + 1}/${secBars})로 이동`);
        addLog('TRACK_SEEK_TOTAL_BAR', { targetBar: target, secIdx: i, secMeasure: state.currentMeasure });

        scrollActiveSectionIntoView('smooth');
        return;
      }
      accumulated += secBars;
    }
  }

  function openJumpBarModal() {
    const song = getActiveSong();
    const total = getTotalSongBars(song);
    const curOverall = getCalculatedTotalBar(song, state.currentSectionIndex, state.currentMeasure);
    if (elements.jumpBarHelp) {
      elements.jumpBarHelp.textContent = `이동할 마디 번호를 입력하세요 (1 ~ ${total})`;
    }
    if (elements.jumpBarInput) {
      elements.jumpBarInput.min = '1';
      elements.jumpBarInput.max = String(total);
      elements.jumpBarInput.value = String(curOverall);
    }
    elements.jumpBarModal?.classList.remove('hidden');
    elements.jumpBarInput?.focus();
    elements.jumpBarInput?.select();
    addLog('JUMP_BAR_MODAL_OPEN', { currentBar: curOverall, totalBars: total });
  }

  function closeJumpBarModal() {
    elements.jumpBarModal?.classList.add('hidden');
  }

  function confirmJumpBar() {
    const val = Number(elements.jumpBarInput?.value);
    if (val && !isNaN(val)) {
      seekToTotalMeasure(val);
    }
    closeJumpBarModal();
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
    elements.viewTrackSections.classList.add('is-editor-open');
    elements.sectionEditor.scrollIntoView({ behavior: 'auto', block: 'end' });
  }

  function closeSectionEditor() {
    elements.sectionEditor.classList.add('hidden');
    elements.viewTrackSections.classList.remove('is-editor-open');
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

  // 4, 5, 6. 전체 마디 구간 일괄 수정
  function renderBatchAccents(beats) {
    elements.batchAccentControls.replaceChildren();
    // '변경 없음' 버튼 추가
    const keepBtn = document.createElement('button');
    keepBtn.type = 'button';
    keepBtn.className = `ed-accent-beat keep-btn${state.batchAccentsKeep ? ' selected' : ''}`;
    keepBtn.textContent = '변경 없음 (기존 유지)';
    keepBtn.dataset.beat = 'keep';
    elements.batchAccentControls.append(keepBtn);

    const numBeats = Number(beats);
    if (!isNaN(numBeats) && numBeats >= 2 && numBeats <= 31) {
      for (let b = 0; b < numBeats; b += 1) {
        const selected = !state.batchAccentsKeep && state.batchAccents.includes(b);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `ed-accent-beat${selected ? ' selected' : ''}`;
        btn.textContent = `${b + 1}박`;
        btn.dataset.beat = String(b);
        elements.batchAccentControls.append(btn);
      }
    }
  }

  function setBatchFieldKeep(field, keep) {
    if (field === 'bars') {
      elements.btnBatchBarsKeep.classList.toggle('active', keep);
      elements.batchBars.disabled = keep;
      if (keep) {
        elements.batchBars.value = '';
        elements.batchBars.placeholder = '변경 없음';
      } else {
        const base = getActiveSong()?.sections[state.currentSectionIndex]?.bars || 4;
        elements.batchBars.value = elements.batchBars.value || base;
        elements.batchBars.focus();
      }
    } else if (field === 'bpm') {
      elements.btnBatchBpmKeep.classList.toggle('active', keep);
      elements.batchBpm.disabled = keep;
      if (keep) {
        elements.batchBpm.value = '';
        elements.batchBpm.placeholder = '변경 없음';
      } else {
        const base = getActiveSong()?.sections[state.currentSectionIndex]?.bpm || 120;
        elements.batchBpm.value = elements.batchBpm.value || base;
        elements.batchBpm.focus();
      }
    }
  }

  function openBatchEditor() {
    const song = getActiveSong();
    if (!song.sections || song.sections.length === 0) {
      setStatus('일괄 수정할 마디 구간이 없습니다.');
      return;
    }
    // 기본적으로 모든 항목을 '변경 없음' 상태로 안전하게 시작
    setBatchFieldKeep('bars', true);
    setBatchFieldKeep('bpm', true);
    elements.batchBeats.value = 'keep';
    elements.batchDivision.value = 'keep';
    elements.batchGuideVoice.value = 'keep';
    state.batchAccentsKeep = true;
    state.batchAccents = [];
    renderBatchAccents('keep');

    elements.batchEditorModal.classList.remove('hidden');
    addLog('BATCH_EDITOR_OPEN', { songId: song.id, songName: song.name, sectionCount: song.sections.length });
  }

  function closeBatchEditor() {
    elements.batchEditorModal.classList.add('hidden');
  }

  function saveBatchEditor() {
    const song = getActiveSong();
    if (!song.sections || song.sections.length === 0) {
      closeBatchEditor();
      return;
    }

    const keepBars = elements.btnBatchBarsKeep.classList.contains('active') || !elements.batchBars.value.trim();
    const keepBpm = elements.btnBatchBpmKeep.classList.contains('active') || !elements.batchBpm.value.trim();
    const keepBeats = elements.batchBeats.value === 'keep';
    const keepDivision = elements.batchDivision.value === 'keep';
    const keepGuide = elements.batchGuideVoice.value === 'keep';
    const keepAccents = state.batchAccentsKeep === true;

    const newBars = keepBars ? null : clamp(Math.round(Number(elements.batchBars.value) || 4), 1, 999);
    const newBpm = keepBpm ? null : clamp(Math.round(Number(elements.batchBpm.value) || 120), 30, 400);
    const newBeats = keepBeats ? null : clamp(Math.round(Number(elements.batchBeats.value) || 4), 2, 31);
    const newDivision = keepDivision ? null : ([2, 4, 8, 16, 32].includes(Number(elements.batchDivision.value)) ? Number(elements.batchDivision.value) : 4);
    const newGuide = keepGuide ? null : (elements.batchGuideVoice.value === 'on');
    const newAccents = keepAccents ? null : state.batchAccents;

    let changesSummary = [];
    if (!keepBars) changesSummary.push(`마디:${newBars}`);
    if (!keepBpm) changesSummary.push(`BPM:${newBpm}`);
    if (!keepBeats) changesSummary.push(`박자:${newBeats}`);
    if (!keepDivision) changesSummary.push(`음표:/${newDivision}`);
    if (!keepGuide) changesSummary.push(`보이스:${newGuide ? 'ON' : 'OFF'}`);
    if (!keepAccents) changesSummary.push(`강박:${newAccents.map((b) => b + 1 + '박').join(',')}`);

    song.sections.forEach((sec) => {
      if (!keepBars && newBars !== null) sec.bars = newBars;
      if (!keepBpm && newBpm !== null) sec.bpm = newBpm;
      if (!keepBeats && newBeats !== null) {
        sec.beats = newBeats;
        if (keepAccents) {
          sec.accentBeats = normaliseAccents(sec.accentBeats, newBeats);
        }
      }
      if (!keepDivision && newDivision !== null) sec.division = newDivision;
      if (!keepGuide && newGuide !== null) sec.guideVoice = newGuide;
      if (!keepAccents && newAccents !== null) {
        sec.accentBeats = normaliseAccents(newAccents, sec.beats);
      }
    });

    persistSongs();
    updateSongMonitorUI();
    renderSectionsTimeline();
    persistPlaybackPosition();
    closeBatchEditor();

    const desc = changesSummary.length ? changesSummary.join(', ') : '변경 사항 없음 (기존 유지)';
    setStatus(`전체 구간 일괄 적용 완료 (${desc})`);
    addLog('BATCH_SECTIONS_UPDATE', {
      songId: song.id,
      count: song.sections.length,
      keep: { bars: keepBars, bpm: keepBpm, beats: keepBeats, division: keepDivision, guide: keepGuide, accents: keepAccents },
      changes: { newBars, newBpm, newBeats, newDivision, newGuide, newAccents }
    });
  }

  // 탭별 고정 가이드 화면 제어
  function renderGuide() {
    const list = GUIDE_SETS[guideState.scope];
    if (!list) return;
    const index = clamp(guideState.index, 0, list.length - 1);
    guideState.index = index;
    elements.guideScreenImg.src = list[index];
  }

  function openGuide(scope = state.mode) {
    if (!GUIDE_SETS[scope]) return;
    guideState.scope = scope;
    guideState.index = 0;
    renderGuide();
    elements.guideScreen.classList.remove('hidden');
    // 뒷배경 화면 스크롤 및 터치 이동 원천 차단
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.touchAction = 'none';
    addLog('GUIDE_OPEN', { scope });
  }

  function closeGuide() {
    if (elements.guideScreen.classList.contains('hidden')) return;
    elements.guideScreen.classList.add('hidden');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.touchAction = '';
    document.documentElement.style.touchAction = '';
    addLog('GUIDE_CLOSE', { scope: guideState.scope });
  }

  function moveGuide(step) {
    const list = GUIDE_SETS[guideState.scope];
    if (!list) return;
    const next = guideState.index + step;
    if (next >= list.length) {
      closeGuide();
      return;
    }
    guideState.index = clamp(next, 0, list.length - 1);
    renderGuide();
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

  // 옵션 및 탭별 가이드 리스너
  elements.btnOpenOptions.addEventListener('click', openOptionsModal);
  elements.btnCloseOptions.addEventListener('click', closeOptionsModal);
  elements.optionsBackdrop.addEventListener('click', closeOptionsModal);
  elements.btnOpenGuide.addEventListener('click', () => openGuide(state.mode));
  elements.btnOpenOptionsGuide.addEventListener('click', () => openGuide('options'));
  elements.btnGuideScreenClose.addEventListener('click', closeGuide);
  elements.guideZonePrev.addEventListener('click', () => moveGuide(-1));
  elements.guideZoneNext.addEventListener('click', () => moveGuide(1));

  // 터치 스크롤 및 화면 이동 차단 (한 화면에 완벽 고정)
  elements.guideScreen.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  elements.guideScreen.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });

  // 키보드 조작 대응 (ESC 닫기, 좌우 화살표 이동)
  window.addEventListener('keydown', (e) => {
    if (elements.guideScreen.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeGuide();
    else if (e.key === 'ArrowRight') moveGuide(1);
    else if (e.key === 'ArrowLeft') moveGuide(-1);
  });

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
  elements.tap.addEventListener('click', () => {
    if (state.mode === 'song') {
      openBatchEditor();
    } else {
      tapTempo();
    }
  });
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
        { id: `sec-1-${Date.now()}`, name: 'Ready', bars: 4, bpm: 120, beats: 4, division: 4, guideVoice: true, accentBeats: [0] },
        { id: `sec-2-${Date.now()}`, name: 'Intro', bars: 4, bpm: 120, beats: 4, division: 4, guideVoice: true, accentBeats: [0] },
        { id: `sec-3-${Date.now()}`, name: 'Verse', bars: 8, bpm: 120, beats: 4, division: 4, guideVoice: true, accentBeats: [0] }
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

  // 전체 마디 점프 이벤트 바인딩
  elements.btnJumpBar?.addEventListener('click', openJumpBarModal);
  elements.btnJumpCancel?.addEventListener('click', closeJumpBarModal);
  elements.btnJumpConfirm?.addEventListener('click', confirmJumpBar);
  elements.jumpBarInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmJumpBar();
    if (e.key === 'Escape') closeJumpBarModal();
  });
  elements.jumpBarModal?.addEventListener('click', (e) => {
    if (e.target === elements.jumpBarModal) closeJumpBarModal();
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

  // 일괄 수정 모달 이벤트
  elements.batchBtnClose?.addEventListener('click', closeBatchEditor);
  elements.batchEditorBackdrop?.addEventListener('click', closeBatchEditor);
  elements.batchBtnCancel?.addEventListener('click', closeBatchEditor);
  elements.batchBtnSave?.addEventListener('click', saveBatchEditor);

  elements.btnBatchBarsKeep?.addEventListener('click', () => {
    const isNowKeep = !elements.btnBatchBarsKeep.classList.contains('active');
    setBatchFieldKeep('bars', isNowKeep);
  });
  elements.batchBars?.addEventListener('input', () => {
    if (elements.batchBars.value.trim()) {
      elements.btnBatchBarsKeep.classList.remove('active');
      elements.batchBars.disabled = false;
    }
  });

  elements.btnBatchBpmKeep?.addEventListener('click', () => {
    const isNowKeep = !elements.btnBatchBpmKeep.classList.contains('active');
    setBatchFieldKeep('bpm', isNowKeep);
  });
  elements.batchBpm?.addEventListener('input', () => {
    if (elements.batchBpm.value.trim()) {
      elements.btnBatchBpmKeep.classList.remove('active');
      elements.batchBpm.disabled = false;
    }
  });

  elements.batchBeats?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'keep') {
      state.batchAccentsKeep = true;
      state.batchAccents = [];
      renderBatchAccents('keep');
    } else {
      state.batchAccentsKeep = false;
      state.batchAccents = [0];
      renderBatchAccents(Number(val));
    }
  });

  elements.batchAccentControls?.addEventListener('click', (e) => {
    const btn = e.target.closest('.ed-accent-beat');
    if (!btn) return;
    if (btn.dataset.beat === 'keep') {
      state.batchAccentsKeep = true;
      state.batchAccents = [];
      renderBatchAccents(elements.batchBeats.value);
      return;
    }
    state.batchAccentsKeep = false;
    const b = Number(btn.dataset.beat);
    state.batchAccents = state.batchAccents.includes(b)
      ? state.batchAccents.filter((x) => x !== b)
      : [...state.batchAccents, b].sort((x, y) => x - y);
    renderBatchAccents(elements.batchBeats.value);
  });

  // 키보드 스페이스바 재생/정지
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      togglePlayback();
    }
  });

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      if (state.playing && state.audioContext) {
        if (state.audioContext.state === 'suspended') {
          try { await state.audioContext.resume(); } catch (_) {}
        }
        state.nextNoteTime = state.audioContext.currentTime + 0.05;
      }
    } else {
      persistPlaybackPosition();
      persistSettings();
    }
  });
  window.addEventListener('pagehide', () => {
    persistPlaybackPosition();
    persistSettings();
  });
  window.addEventListener('pageshow', async () => {
    if (state.playing && state.audioContext) {
      if (state.audioContext.state === 'suspended') {
        try { await state.audioContext.resume(); } catch (_) {}
      }
      state.nextNoteTime = state.audioContext.currentTime + 0.05;
    } else {
      restorePlaybackPosition();
      updateSongMonitorUI();
      if (state.mode === 'song') renderSectionsTimeline();
    }
  });

  // 초기 렌더링
  restorePlaybackPosition();
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
    start, stop, togglePlayback, setSingleTempo, seekToSection, seekToTotalMeasure, openJumpBarModal, closeJumpBarModal, rewindSong,
    openOptionsModal, closeOptionsModal, submitRecentLogs, addLog,
    openBatchEditor, closeBatchEditor, saveBatchEditor, openSectionEditor, closeSectionEditor
  };
})();
