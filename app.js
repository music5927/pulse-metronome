(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const elements = {
    tempo: $('tempo-input'), slider: $('tempo-slider'), tempoDown: $('tempo-down'), tempoUp: $('tempo-up'),
    beats: $('beats-input'), division: $('division-input'), volume: $('volume-input'),
    play: $('play-button'), playLabel: $('play-label'), tap: $('tap-button'), mute: $('mute-button'),
    soundIcon: $('sound-icon'), soundLabel: $('sound-label'),
    beatLight: $('beat-light'), beatNumber: $('beat-number'), beatCount: $('beat-count'), beatCaption: $('beat-caption'),
    accentControls: $('accent-controls'), accentSummary: $('accent-summary'), status: $('status')
  };

  const settingsKey = 'pulse-metronome-settings-v2';
  const saved = (() => { try { return JSON.parse(localStorage.getItem(settingsKey)) || {}; } catch { return {}; } })();
  const state = {
    bpm: clamp(Number(saved.bpm) || 120, 40, 240),
    beats: clamp(Number(saved.beats) || 4, 2, 8),
    division: [2, 4, 8].includes(Number(saved.division)) ? Number(saved.division) : 4,
    volume: clamp(Number(saved.volume) || 70, 0, 100), muted: Boolean(saved.muted),
    accentBeats: normaliseAccentBeats(saved.accentBeats, Number(saved.beats) || 4),
    playing: false, currentBeat: 0, nextNoteTime: 0, schedulerTimer: null,
    audioContext: null, iosUnlockAudio: null, tapTimes: []
  };
  const SCHEDULE_AHEAD_SECONDS = 0.12;
  const LOOKAHEAD_MS = 25;
  // A four-sample silent WAV. iOS uses this user-initiated media element to keep the speaker playback route active.
  const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAA';

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function normaliseAccentBeats(value, beats) {
    const values = Array.isArray(value) ? value : [0];
    return [...new Set(values.map(Number).filter((beat) => Number.isInteger(beat) && beat >= 0 && beat < beats))];
  }
  function persist() {
    localStorage.setItem(settingsKey, JSON.stringify({
      bpm: state.bpm, beats: state.beats, division: state.division, volume: state.volume,
      muted: state.muted, accentBeats: state.accentBeats
    }));
  }
  function setStatus(text, running = false) { elements.status.textContent = text; elements.status.classList.toggle('running', running); }
  function updateSoundButton() {
    const muted = state.muted;
    elements.soundIcon.textContent = muted ? '🔇' : '🔊';
    elements.soundLabel.textContent = muted ? '소리 꺼짐' : '소리 켜짐';
    elements.mute.classList.toggle('is-muted', muted);
    elements.mute.setAttribute('aria-label', muted ? '소리 켜짐으로 바꾸기' : '소리 끄기');
    elements.mute.setAttribute('aria-pressed', String(muted));
  }
  function renderAccentControls() {
    elements.accentControls.replaceChildren();
    for (let beat = 0; beat < state.beats; beat += 1) {
      const selected = state.accentBeats.includes(beat);
      const button = document.createElement('button');
      button.type = 'button'; button.className = `accent-beat${selected ? ' selected' : ''}`;
      button.dataset.beat = String(beat); button.textContent = String(beat + 1);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `${beat + 1}박 ${selected ? '강박 해제' : '강박 설정'}`);
      elements.accentControls.append(button);
    }
    const accents = state.accentBeats.map((beat) => `${beat + 1}박`);
    elements.accentSummary.textContent = accents.length ? accents.join(', ') : '강박 없음';
  }
  function updateUI() {
    elements.tempo.value = state.bpm; elements.slider.value = state.bpm; elements.beats.value = state.beats;
    elements.division.value = state.division; elements.volume.value = state.volume; elements.beatCount.textContent = state.beats;
    updateSoundButton(); renderAccentControls();
  }
  function setTempo(raw) { state.bpm = clamp(Math.round(Number(raw) || 120), 40, 240); updateUI(); persist(); }
  function configureIosPlayback() {
    // Safari 17.4+ exposes AudioSession. 'playback' routes audio to the speaker even when the ringer is muted.
    try { if (navigator.audioSession && 'type' in navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) { /* Unsupported iOS versions retain normal Web Audio routing. */ }
  }
  function unlockIosSpeaker() {
    if (!state.iosUnlockAudio) {
      state.iosUnlockAudio = new Audio(SILENT_WAV);
      state.iosUnlockAudio.loop = true;
      state.iosUnlockAudio.playsInline = true;
      state.iosUnlockAudio.volume = 0.001;
      state.iosUnlockAudio.setAttribute('playsinline', '');
    }
    // Must be invoked directly from the Start button gesture for iOS Safari.
    state.iosUnlockAudio.play().catch(() => {});
  }
  async function ensureAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('이 브라우저는 Web Audio API를 지원하지 않습니다.');
    configureIosPlayback();
    if (!state.audioContext) state.audioContext = new AudioContextClass({ latencyHint: 'interactive' });
    unlockIosSpeaker();
    if (state.audioContext.state === 'suspended') await state.audioContext.resume();
  }
  function isAccent(beat) { return state.accentBeats.includes(beat); }
  function scheduleClick(time, beat) {
    if (state.muted || !state.audioContext) return;
    const accent = isAccent(beat); const osc = state.audioContext.createOscillator(); const gain = state.audioContext.createGain();
    osc.frequency.value = accent ? 1320 : 880; osc.type = accent ? 'sine' : 'triangle';
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime((state.volume / 100) * (accent ? 0.48 : 0.3), time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.058);
    osc.connect(gain).connect(state.audioContext.destination); osc.start(time); osc.stop(time + 0.064);
  }
  function renderBeat(beat, accent) {
    elements.beatNumber.textContent = String(beat + 1); elements.beatCaption.textContent = accent ? `${beat + 1}박 · 강박` : `${beat + 1}번째 박`;
    elements.beatLight.classList.remove('idle', 'active', 'accent'); void elements.beatLight.offsetWidth;
    elements.beatLight.classList.add('active', accent ? 'accent' : '');
    window.setTimeout(() => elements.beatLight.classList.remove('active', 'accent'), 85);
  }
  function scheduleNote(beat, time) {
    const accent = isAccent(beat); scheduleClick(time, beat);
    const delay = Math.max(0, (time - state.audioContext.currentTime) * 1000);
    window.setTimeout(() => { if (state.playing) renderBeat(beat, accent); }, delay);
  }
  function nextNote() { state.nextNoteTime += 60 / state.bpm; state.currentBeat = (state.currentBeat + 1) % state.beats; }
  function scheduler() { while (state.nextNoteTime < state.audioContext.currentTime + SCHEDULE_AHEAD_SECONDS) { scheduleNote(state.currentBeat, state.nextNoteTime); nextNote(); } }
  async function start() {
    try {
      // ensureAudio executes the iOS unlock synchronously within the button click path.
      const audioReady = ensureAudio();
      await audioReady;
      if (state.playing) return;
      state.playing = true; state.currentBeat = 0; state.nextNoteTime = state.audioContext.currentTime + 0.05;
      scheduler(); state.schedulerTimer = window.setInterval(scheduler, LOOKAHEAD_MS);
      elements.play.classList.add('is-playing'); elements.play.setAttribute('aria-pressed', 'true'); elements.playLabel.textContent = '정지'; setStatus('재생 중', true);
    } catch (error) { setStatus(error.message || '오디오를 시작하지 못했습니다.'); }
  }
  function stop() {
    if (!state.playing) return;
    state.playing = false; window.clearInterval(state.schedulerTimer); state.schedulerTimer = null;
    state.iosUnlockAudio?.pause();
    elements.play.classList.remove('is-playing'); elements.play.setAttribute('aria-pressed', 'false'); elements.playLabel.textContent = '시작';
    elements.beatLight.classList.remove('active', 'accent'); elements.beatCaption.textContent = '다음 박자를 기다리는 중'; setStatus('일시 정지');
  }
  function togglePlayback() { state.playing ? stop() : start(); }
  function tapTempo() {
    const now = performance.now(); state.tapTimes = state.tapTimes.filter((time) => now - time < 2200); state.tapTimes.push(now);
    if (state.tapTimes.length < 2) { elements.tap.querySelector('span').textContent = '한 번 더 누르세요'; return; }
    const intervals = state.tapTimes.slice(1).map((time, index) => time - state.tapTimes[index]);
    setTempo(60000 / (intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length));
    elements.tap.querySelector('span').textContent = `${state.bpm} BPM 적용`; window.setTimeout(() => { elements.tap.querySelector('span').textContent = '템포 맞추기'; }, 900);
  }

  elements.tempo.addEventListener('change', (event) => setTempo(event.target.value));
  elements.tempo.addEventListener('input', (event) => { const value = Number(event.target.value); if (value >= 40 && value <= 240) setTempo(value); });
  elements.slider.addEventListener('input', (event) => setTempo(event.target.value)); elements.tempoDown.addEventListener('click', () => setTempo(state.bpm - 1)); elements.tempoUp.addEventListener('click', () => setTempo(state.bpm + 1));
  elements.beats.addEventListener('change', (event) => { state.beats = Number(event.target.value); state.currentBeat = 0; state.accentBeats = normaliseAccentBeats(state.accentBeats, state.beats); updateUI(); persist(); });
  elements.division.addEventListener('change', (event) => { state.division = Number(event.target.value); persist(); }); elements.volume.addEventListener('input', (event) => { state.volume = Number(event.target.value); persist(); });
  elements.accentControls.addEventListener('click', (event) => {
    const button = event.target.closest('.accent-beat'); if (!button) return;
    const beat = Number(button.dataset.beat); state.accentBeats = state.accentBeats.includes(beat) ? state.accentBeats.filter((item) => item !== beat) : [...state.accentBeats, beat].sort((a, b) => a - b);
    renderAccentControls(); persist();
  });
  elements.play.addEventListener('click', togglePlayback); elements.tap.addEventListener('click', tapTempo);
  elements.mute.addEventListener('click', () => { state.muted = !state.muted; updateSoundButton(); persist(); });
  document.addEventListener('keydown', (event) => { if (event.code === 'Space' && !['INPUT', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) { event.preventDefault(); togglePlayback(); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.playing) state.nextNoteTime = state.audioContext.currentTime + 0.05; }); window.addEventListener('pagehide', stop);

  updateUI();
  window.PulseMetronome = { getState: () => ({ ...state, accentBeats: [...state.accentBeats], schedulerTimer: Boolean(state.schedulerTimer) }), start, stop, setTempo };
})();
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const elements = {
    tempo: $('tempo-input'), slider: $('tempo-slider'), tempoDown: $('tempo-down'), tempoUp: $('tempo-up'),
    beats: $('beats-input'), division: $('division-input'), volume: $('volume-input'),
    play: $('play-button'), playLabel: $('play-label'), tap: $('tap-button'), mute: $('mute-button'),
    beatLight: $('beat-light'), beatNumber: $('beat-number'), beatCount: $('beat-count'), beatCaption: $('beat-caption'),
    status: $('status'), presets: [...document.querySelectorAll('[data-tempo]')]
  };

  const settingsKey = 'pulse-metronome-settings-v1';
  const saved = (() => { try { return JSON.parse(localStorage.getItem(settingsKey)) || {}; } catch { return {}; } })();
  const state = {
    bpm: clamp(Number(saved.bpm) || 120, 40, 240),
    beats: clamp(Number(saved.beats) || 4, 2, 8),
    division: [2, 4, 8].includes(Number(saved.division)) ? Number(saved.division) : 4,
    volume: clamp(Number(saved.volume) || 70, 0, 100),
    muted: Boolean(saved.muted), playing: false, currentBeat: 0,
    nextNoteTime: 0, schedulerTimer: null, audioContext: null, tapTimes: []
  };

  const SCHEDULE_AHEAD_SECONDS = 0.12;
  const LOOKAHEAD_MS = 25;

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function persist() {
    localStorage.setItem(settingsKey, JSON.stringify({ bpm: state.bpm, beats: state.beats, division: state.division, volume: state.volume, muted: state.muted }));
  }
  function setStatus(text, running = false) {
    elements.status.textContent = text;
    elements.status.classList.toggle('running', running);
  }
  function updateUI() {
    elements.tempo.value = state.bpm;
    elements.slider.value = state.bpm;
    elements.beats.value = state.beats;
    elements.division.value = state.division;
    elements.volume.value = state.volume;
    elements.beatCount.textContent = state.beats;
    elements.mute.textContent = state.muted ? '◖×' : '◖))';
    elements.mute.setAttribute('aria-label', state.muted ? '소리 꺼짐' : '소리 켜짐');
    elements.mute.setAttribute('aria-pressed', String(state.muted));
  }
  function setTempo(raw) {
    state.bpm = clamp(Math.round(Number(raw) || 120), 40, 240);
    updateUI(); persist();
  }
  function ensureAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('이 브라우저는 Web Audio API를 지원하지 않습니다.');
    if (!state.audioContext) state.audioContext = new AudioContextClass();
    if (state.audioContext.state === 'suspended') return state.audioContext.resume();
    return Promise.resolve();
  }
  function scheduleClick(time, beat) {
    if (state.muted || !state.audioContext) return;
    const osc = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();
    const isAccent = beat === 0;
    osc.frequency.value = isAccent ? 1320 : 880;
    osc.type = isAccent ? 'sine' : 'triangle';
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime((state.volume / 100) * (isAccent ? 0.42 : 0.28), time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);
    osc.connect(gain).connect(state.audioContext.destination);
    osc.start(time); osc.stop(time + 0.06);
  }
  function renderBeat(beat, isAccent) {
    elements.beatNumber.textContent = String(beat + 1);
    elements.beatCaption.textContent = isAccent ? '강박' : `${beat + 1}번째 박`;
    elements.beatLight.classList.remove('idle', 'active', 'accent');
    // Reflow makes the short beat flash reproducible even at high BPM.
    void elements.beatLight.offsetWidth;
    elements.beatLight.classList.add('active', isAccent ? 'accent' : '');
    window.setTimeout(() => elements.beatLight.classList.remove('active', 'accent'), 85);
  }
  function scheduleNote(beat, time) {
    scheduleClick(time, beat);
    const delay = Math.max(0, (time - state.audioContext.currentTime) * 1000);
    window.setTimeout(() => { if (state.playing) renderBeat(beat, beat === 0); }, delay);
  }
  function nextNote() {
    const secondsPerBeat = 60 / state.bpm;
    state.nextNoteTime += secondsPerBeat;
    state.currentBeat = (state.currentBeat + 1) % state.beats;
  }
  function scheduler() {
    while (state.nextNoteTime < state.audioContext.currentTime + SCHEDULE_AHEAD_SECONDS) {
      scheduleNote(state.currentBeat, state.nextNoteTime);
      nextNote();
    }
  }
  async function start() {
    try {
      await ensureAudio();
      if (state.playing) return;
      state.playing = true;
      state.currentBeat = 0;
      state.nextNoteTime = state.audioContext.currentTime + 0.05;
      scheduler();
      state.schedulerTimer = window.setInterval(scheduler, LOOKAHEAD_MS);
      elements.play.classList.add('is-playing');
      elements.play.setAttribute('aria-pressed', 'true');
      elements.playLabel.textContent = '정지';
      setStatus('재생 중', true);
    } catch (error) {
      setStatus(error.message || '오디오를 시작하지 못했습니다.');
    }
  }
  function stop() {
    if (!state.playing) return;
    state.playing = false;
    window.clearInterval(state.schedulerTimer);
    state.schedulerTimer = null;
    elements.play.classList.remove('is-playing');
    elements.play.setAttribute('aria-pressed', 'false');
    elements.playLabel.textContent = '시작';
    elements.beatLight.classList.remove('active', 'accent');
    elements.beatCaption.textContent = '다음 박자를 기다리는 중';
    setStatus('일시 정지');
  }
  function togglePlayback() { state.playing ? stop() : start(); }
  function tapTempo() {
    const now = performance.now();
    state.tapTimes = state.tapTimes.filter((time) => now - time < 2200);
    state.tapTimes.push(now);
    if (state.tapTimes.length < 2) { elements.tap.querySelector('span').textContent = '한 번 더 누르세요'; return; }
    const intervals = state.tapTimes.slice(1).map((time, index) => time - state.tapTimes[index]);
    const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    setTempo(60000 / mean);
    elements.tap.querySelector('span').textContent = `${state.bpm} BPM 적용`;
    window.setTimeout(() => { elements.tap.querySelector('span').textContent = '템포 맞추기'; }, 900);
  }

  elements.tempo.addEventListener('change', (event) => setTempo(event.target.value));
  elements.tempo.addEventListener('input', (event) => { const value = Number(event.target.value); if (value >= 40 && value <= 240) setTempo(value); });
  elements.slider.addEventListener('input', (event) => setTempo(event.target.value));
  elements.tempoDown.addEventListener('click', () => setTempo(state.bpm - 1));
  elements.tempoUp.addEventListener('click', () => setTempo(state.bpm + 1));
  elements.beats.addEventListener('change', (event) => { state.beats = Number(event.target.value); state.currentBeat = 0; updateUI(); persist(); });
  elements.division.addEventListener('change', (event) => { state.division = Number(event.target.value); persist(); });
  elements.volume.addEventListener('input', (event) => { state.volume = Number(event.target.value); persist(); });
  elements.play.addEventListener('click', togglePlayback);
  elements.tap.addEventListener('click', tapTempo);
  elements.mute.addEventListener('click', () => { state.muted = !state.muted; updateUI(); persist(); });
  elements.presets.forEach((button) => button.addEventListener('click', () => setTempo(button.dataset.tempo)));
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !['INPUT', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) { event.preventDefault(); togglePlayback(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.playing) { state.nextNoteTime = state.audioContext.currentTime + 0.05; } });
  window.addEventListener('pagehide', stop);

  updateUI();
  window.PulseMetronome = { getState: () => ({ ...state, schedulerTimer: Boolean(state.schedulerTimer) }), start, stop, setTempo };
})();
