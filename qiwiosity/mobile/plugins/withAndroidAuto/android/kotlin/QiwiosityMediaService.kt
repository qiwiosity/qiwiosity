package nz.qiwiosity.app.carapp

//
// QiwiosityMediaService
//
// A thin MediaBrowserServiceCompat whose only job is to publish the
// shared QiwiosityAudioPlayer's MediaSession token so Android (and,
// through it, the car head unit) can keep showing Now Playing art and
// transport controls even when the app isn't in the foreground.
//
// We don't expose a full MediaBrowser tree here — the Car App Library
// already handles browsing via the POI templates. We only need a
// session so the system media key handling, the lock-screen widget, and
// the AA background audio notification all work.
//

import android.content.Intent
import android.os.Bundle
import androidx.media.MediaBrowserServiceCompat

class QiwiosityMediaService : MediaBrowserServiceCompat() {

    override fun onCreate() {
        super.onCreate()
        val player = QiwiosityAudioPlayer.getInstance(applicationContext)
        sessionToken = player.session
    }

    override fun onGetRoot(
        clientPackageName: String,
        clientUid: Int,
        rootHints: Bundle?
    ): BrowserRoot {
        // Empty tree — we're not a browseable media app. Clients that
        // connect get a root they can subscribe to; we just return nothing.
        return BrowserRoot(MEDIA_ROOT_ID, null)
    }

    override fun onLoadChildren(
        parentId: String,
        result: Result<MutableList<android.support.v4.media.MediaBrowserCompat.MediaItem>>
    ) {
        // Always empty — the car app doesn't browse through us.
        result.sendResult(mutableListOf())
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        // If the app is swiped away, stop playback so we don't leak a
        // foreground service once the user's clearly done with us.
        QiwiosityAudioPlayer.getInstance(applicationContext).stop()
        super.onTaskRemoved(rootIntent)
    }

    companion object {
        private const val MEDIA_ROOT_ID = "qiwiosity_root"
    }
}
