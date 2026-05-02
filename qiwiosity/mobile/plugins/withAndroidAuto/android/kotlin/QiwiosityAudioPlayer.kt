package nz.qiwiosity.app.carapp

//
// QiwiosityAudioPlayer
//
// Plays POI narration using ExoPlayer and publishes metadata to the
// system MediaSession so Android Auto's Now Playing card and the system
// lock-screen widget both update. Parallels iOS
// `QiwiosityAudioPlayer.swift` / MPNowPlayingInfoCenter.
//
// Audio file naming convention (matches content/ pipeline):
//   <poi_id>.<length>.mp3     e.g.  napier-marine-parade.standard.mp3
//
// Files live in android/app/src/main/assets/audio/ (copied in by the
// same Expo plugin that copies attractions.json).
//

import android.content.ComponentName
import android.content.Context
import android.net.Uri
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Log
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.MediaItem
import com.google.android.exoplayer2.Player

interface QiwiosityAudioListener {
    fun onStart(poi: POI)
    fun onFinish(poi: POI)
}

class QiwiosityAudioPlayer private constructor(private val appContext: Context) {

    private val player: ExoPlayer = ExoPlayer.Builder(appContext).build().also {
        it.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) {
                    val poi = currentPOI
                    updatePlaybackState(PlaybackStateCompat.STATE_STOPPED)
                    currentPOI = null
                    poi?.let { listeners.forEach { l -> l.onFinish(it) } }
                }
            }
        })
    }

    private val mediaSession: MediaSessionCompat = MediaSessionCompat(appContext, "Qiwiosity").apply {
        setCallback(object : MediaSessionCompat.Callback() {
            override fun onPlay() { player.play(); updatePlaybackState(PlaybackStateCompat.STATE_PLAYING) }
            override fun onPause() { player.pause(); updatePlaybackState(PlaybackStateCompat.STATE_PAUSED) }
            override fun onStop() { stop() }
            override fun onSkipToNext() {
                // 15s forward — matches iOS MPRemoteCommandCenter behaviour.
                player.seekTo(player.currentPosition + 15_000L)
            }
            override fun onSkipToPrevious() {
                player.seekTo((player.currentPosition - 15_000L).coerceAtLeast(0L))
            }
        })
        isActive = true
    }

    private var currentPOI: POI? = null
    private val listeners = mutableSetOf<QiwiosityAudioListener>()

    // ----- public API -----

    val session: MediaSessionCompat.Token get() = mediaSession.sessionToken

    val nowPlaying: POI? get() = currentPOI

    val isPlaying: Boolean get() = player.isPlaying

    fun addListener(l: QiwiosityAudioListener) { listeners.add(l) }
    fun removeListener(l: QiwiosityAudioListener) { listeners.remove(l) }

    fun play(poi: POI, length: String = "standard") {
        stop()

        val uri = resolveAudio(poi.id, length)
            ?: resolveAudio(poi.id, if (length == "standard") "headline" else "standard")

        if (uri == null) {
            Log.i(TAG, "No bundled audio for ${poi.id}; silent skip.")
            return
        }

        player.setMediaItem(MediaItem.fromUri(uri))
        player.prepare()
        player.playWhenReady = true
        currentPOI = poi
        publishMetadata(poi)
        updatePlaybackState(PlaybackStateCompat.STATE_PLAYING)
        listeners.forEach { it.onStart(poi) }
    }

    fun stop() {
        player.stop()
        val poi = currentPOI
        currentPOI = null
        updatePlaybackState(PlaybackStateCompat.STATE_STOPPED)
        poi?.let { listeners.forEach { l -> l.onFinish(it) } }
    }

    fun release() {
        player.release()
        mediaSession.release()
    }

    // ----- internals -----

    private fun resolveAudio(poiId: String, length: String): Uri? {
        val assetPath = "audio/$poiId.$length.mp3"
        return try {
            appContext.assets.open(assetPath).close()
            Uri.parse("asset:///$assetPath")
        } catch (_: Exception) {
            null
        }
    }

    private fun publishMetadata(poi: POI) {
        val md = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, poi.name)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, poi.regionPretty)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "Qiwiosity — Stories Along the Way")
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, player.duration.coerceAtLeast(0L))
            .build()
        mediaSession.setMetadata(md)
    }

    private fun updatePlaybackState(state: Int) {
        val actions = PlaybackStateCompat.ACTION_PLAY or
            PlaybackStateCompat.ACTION_PAUSE or
            PlaybackStateCompat.ACTION_STOP or
            PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
            PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
        val ps = PlaybackStateCompat.Builder()
            .setActions(actions)
            .setState(state, player.currentPosition, 1.0f)
            .build()
        mediaSession.setPlaybackState(ps)
    }

    companion object {
        private const val TAG = "Qiwiosity/AudioPlayer"
        @Volatile private var instance: QiwiosityAudioPlayer? = null

        fun getInstance(context: Context): QiwiosityAudioPlayer =
            instance ?: synchronized(this) {
                instance ?: QiwiosityAudioPlayer(context.applicationContext).also { instance = it }
            }
    }
}
