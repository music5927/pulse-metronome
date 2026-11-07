package com.music5927.pulsemetronome;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private Intent serviceIntent(String action, String title, String message, String playbackConfig) {
        Intent intent = new Intent(this, PulseAudioService.class);
        intent.setAction(action);
        if (title != null) intent.putExtra(PulseAudioService.EXTRA_TITLE, title);
        if (message != null) intent.putExtra(PulseAudioService.EXTRA_MESSAGE, message);
        if (playbackConfig != null) intent.putExtra(PulseAudioService.EXTRA_PLAYBACK_CONFIG, playbackConfig);
        return intent;
    }

    private void startPlaybackService(Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent);
        } else {
            startService(intent);
        }
    }

    public class AndroidBackgroundAudioBridge {
        /** Prepares the foreground service while Web Audio is still the foreground engine. */
        @JavascriptInterface
        public void start(String title, String message, String playbackConfig) {
            startPlaybackService(serviceIntent(PulseAudioService.ACTION_START, title, message, playbackConfig));
        }

        /** Transfers ticking to the native Android engine when WebView becomes hidden. */
        @JavascriptInterface
        public void activate(String playbackConfig) {
            startService(serviceIntent(PulseAudioService.ACTION_ACTIVATE, null, null, playbackConfig));
        }

        /** Returns ticking to Web Audio when the app becomes visible again. */
        @JavascriptInterface
        public void deactivate() {
            startService(serviceIntent(PulseAudioService.ACTION_DEACTIVATE, null, null, null));
        }

        @JavascriptInterface
        public String getPlaybackState() {
            return PulseAudioService.getActivePlaybackStateJson();
        }

        @JavascriptInterface
        public void stop() {
            startService(serviceIntent(PulseAudioService.ACTION_STOP, null, null, null));
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 13+ 알림 권한: 재생 중인 포그라운드 서비스 상태를 사용자에게 표시한다.
        if (Build.VERSION.SDK_INT >= 33
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
        }

        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
                webView.addJavascriptInterface(new AndroidBackgroundAudioBridge(), "AndroidBackgroundAudio");
            }
        } catch (Exception ignored) {
            // The web bundle is still usable in a browser when the native bridge is unavailable.
        }
    }
}
