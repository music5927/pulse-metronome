package com.music5927.pulsemetronome;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

/**
 * Android-owned metronome engine used only while the Capacitor WebView is hidden.
 * A foreground service and native scheduler keep the click audible even when WebView
 * timers/Web Audio are frozen by Android recents or Doze.
 */
public class PulseAudioService extends Service {
    public static final String ACTION_START = "ACTION_START";
    public static final String ACTION_ACTIVATE = "ACTION_ACTIVATE";
    public static final String ACTION_DEACTIVATE = "ACTION_DEACTIVATE";
    public static final String ACTION_STOP = "ACTION_STOP";
    public static final String EXTRA_TITLE = "EXTRA_TITLE";
    public static final String EXTRA_MESSAGE = "EXTRA_MESSAGE";
    public static final String EXTRA_PLAYBACK_CONFIG = "EXTRA_PLAYBACK_CONFIG";

    private static final String CHANNEL_ID = "pulse_metronome_playback_channel";
    private static final int NOTIFICATION_ID = 5927;
    private static final int MIN_BPM = 30;
    private static final int MAX_BPM = 400;

    private static volatile PulseAudioService activeService;

    private final Object engineLock = new Object();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ArrayList<Section> sequence = new ArrayList<>();

    private PowerManager.WakeLock wakeLock;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private ToneGenerator toneGenerator;
    private boolean foregroundStarted = false;
    private boolean nativeEngineRunning = false;
    private boolean songMode = false;
    private int bpm = 120;
    private int beats = 4;
    private int division = 4;
    private Set<Integer> accentBeats = new HashSet<>();
    private int currentSectionIndex = 0;
    private int currentMeasure = 0;
    private int currentBeat = 0;
    private String notificationTitle = "Pulse Metronome";
    private String notificationMessage = "메트로놈 준비됨";

    private final Runnable tickRunnable = new Runnable() {
        @Override
        public void run() {
            synchronized (engineLock) {
                if (!nativeEngineRunning) return;
                playTickLocked();
                long delay = Math.max(20L, Math.round(60000d / Math.max(MIN_BPM, bpm)));
                handler.postDelayed(this, delay);
            }
        }
    };

    private static final class Section {
        String name = "구간";
        int bpm = 120;
        int beats = 4;
        int division = 4;
        int bars = 1;
        Set<Integer> accentBeats = new HashSet<>();
    }

    @Override
    public void onCreate() {
        super.onCreate();
        activeService = this;
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;
        String action = intent.getAction();
        if (ACTION_START.equals(action)) {
            notificationTitle = nonEmpty(intent.getStringExtra(EXTRA_TITLE), "Pulse Metronome");
            notificationMessage = nonEmpty(intent.getStringExtra(EXTRA_MESSAGE), "메트로놈 준비됨");
            applyConfig(intent.getStringExtra(EXTRA_PLAYBACK_CONFIG));
            startForegroundPlayback();
        } else if (ACTION_ACTIVATE.equals(action)) {
            applyConfig(intent.getStringExtra(EXTRA_PLAYBACK_CONFIG));
            startForegroundPlayback();
            activateNativeEngine();
        } else if (ACTION_DEACTIVATE.equals(action)) {
            deactivateNativeEngine();
        } else if (ACTION_STOP.equals(action)) {
            stopForegroundPlayback();
        }
        return START_STICKY;
    }

    private static String nonEmpty(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value;
    }

    private static int bounded(int value, int min, int max, int fallback) {
        return value < min || value > max ? fallback : value;
    }

    private void applyConfig(String rawConfig) {
        if (rawConfig == null || rawConfig.trim().isEmpty()) return;
        synchronized (engineLock) {
            try {
                JSONObject config = new JSONObject(rawConfig);
                songMode = "song".equals(config.optString("mode", "single"));
                bpm = bounded(config.optInt("bpm", bpm), MIN_BPM, MAX_BPM, bpm);
                beats = bounded(config.optInt("beats", beats), 2, 31, beats);
                division = config.optInt("division", division);
                accentBeats = readAccents(config.optJSONArray("accentBeats"), beats);
                currentSectionIndex = Math.max(0, config.optInt("currentSectionIndex", currentSectionIndex));
                currentMeasure = Math.max(0, config.optInt("currentMeasure", currentMeasure));
                currentBeat = Math.max(0, config.optInt("currentBeat", currentBeat));

                sequence.clear();
                JSONArray rawSequence = config.optJSONArray("sequence");
                if (songMode && rawSequence != null) {
                    for (int i = 0; i < rawSequence.length(); i++) {
                        JSONObject item = rawSequence.optJSONObject(i);
                        if (item == null) continue;
                        Section section = new Section();
                        section.name = nonEmpty(item.optString("name"), "구간");
                        section.bpm = bounded(item.optInt("bpm", 120), MIN_BPM, MAX_BPM, 120);
                        section.beats = bounded(item.optInt("beats", 4), 2, 31, 4);
                        section.division = item.optInt("division", 4);
                        section.bars = Math.max(1, item.optInt("bars", 1));
                        section.accentBeats = readAccents(item.optJSONArray("accentBeats"), section.beats);
                        sequence.add(section);
                    }
                }
                if (sequence.isEmpty()) songMode = false;
                if (songMode) {
                    currentSectionIndex %= sequence.size();
                    applyCurrentSectionLocked();
                }
                currentBeat %= beats;
            } catch (JSONException ignored) {
                // Keep the last known valid configuration; playback should not be interrupted.
            }
        }
    }

    private Set<Integer> readAccents(JSONArray rawAccents, int beatCount) {
        Set<Integer> values = new HashSet<>();
        if (rawAccents != null) {
            for (int i = 0; i < rawAccents.length(); i++) {
                int value = rawAccents.optInt(i, -1);
                if (value >= 0 && value < beatCount) values.add(value);
            }
        }
        if (values.isEmpty()) values.add(0);
        return values;
    }

    private void applyCurrentSectionLocked() {
        if (!songMode || sequence.isEmpty()) return;
        Section section = sequence.get(currentSectionIndex);
        bpm = section.bpm;
        beats = section.beats;
        division = section.division;
        accentBeats = new HashSet<>(section.accentBeats);
        currentMeasure = Math.min(Math.max(0, currentMeasure), Math.max(0, section.bars - 1));
        currentBeat %= beats;
        notificationMessage = section.name + " · " + bpm + " BPM";
        updateNotification();
    }

    private void activateNativeEngine() {
        synchronized (engineLock) {
            if (nativeEngineRunning) return;
            nativeEngineRunning = true;
            acquireWakeLock();
            requestAudioFocus();
            ensureToneGenerator();
            handler.removeCallbacks(tickRunnable);
            handler.post(tickRunnable);
        }
    }

    private void deactivateNativeEngine() {
        synchronized (engineLock) {
            nativeEngineRunning = false;
            handler.removeCallbacks(tickRunnable);
            abandonAudioFocus();
            releaseWakeLock();
        }
    }

    private void ensureToneGenerator() {
        if (toneGenerator == null) {
            toneGenerator = new ToneGenerator(AudioManager.STREAM_MUSIC, 90);
        }
    }

    private void playTickLocked() {
        ensureToneGenerator();
        boolean accent = accentBeats.contains(currentBeat);
        toneGenerator.startTone(accent ? ToneGenerator.TONE_PROP_BEEP2 : ToneGenerator.TONE_PROP_BEEP, accent ? 52 : 34);

        currentBeat++;
        if (currentBeat < beats) return;
        currentBeat = 0;
        if (!songMode || sequence.isEmpty()) return;

        currentMeasure++;
        Section section = sequence.get(currentSectionIndex);
        if (currentMeasure < section.bars) return;
        currentMeasure = 0;
        currentSectionIndex = (currentSectionIndex + 1) % sequence.size();
        applyCurrentSectionLocked();
    }

    private void requestAudioFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();
            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(attributes)
                .setOnAudioFocusChangeListener(focusChange -> {
                    if (focusChange <= AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) deactivateNativeEngine();
                })
                .build();
            audioManager.requestAudioFocus(audioFocusRequest);
        } else {
            audioManager.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest);
        } else {
            audioManager.abandonAudioFocus(null);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Pulse Metronome 연주 알림",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("메트로놈 백그라운드 연속 연주 알림");
            channel.setShowBadge(false);
            channel.setSound(null, null);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(notificationTitle)
            .setContentText(notificationMessage)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build();
    }

    private void startForegroundPlayback() {
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        foregroundStarted = true;
    }

    private void updateNotification() {
        if (!foregroundStarted) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification());
    }

    private void stopForegroundPlayback() {
        deactivateNativeEngine();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        foregroundStarted = false;
        stopSelf();
    }

    private void acquireWakeLock() {
        try {
            if (wakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PulseMetronome::PlaybackWakeLock");
                    wakeLock.setReferenceCounted(false);
                }
            }
            if (wakeLock != null && !wakeLock.isHeld()) wakeLock.acquire(10 * 60 * 60 * 1000L);
        } catch (Exception ignored) { }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        } catch (Exception ignored) { }
    }

    public static String getActivePlaybackStateJson() {
        PulseAudioService service = activeService;
        return service == null ? "{}" : service.getPlaybackStateJson();
    }

    public String getPlaybackStateJson() {
        synchronized (engineLock) {
            try {
                JSONObject state = new JSONObject();
                state.put("running", nativeEngineRunning);
                state.put("currentSectionIndex", currentSectionIndex);
                state.put("currentMeasure", currentMeasure);
                state.put("currentBeat", currentBeat);
                state.put("bpm", bpm);
                state.put("beats", beats);
                return state.toString();
            } catch (JSONException ignored) {
                return "{}";
            }
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Do not stop: the foreground service is explicitly responsible for recents playback.
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        if (activeService == this) activeService = null;
        deactivateNativeEngine();
        if (toneGenerator != null) {
            toneGenerator.release();
            toneGenerator = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
