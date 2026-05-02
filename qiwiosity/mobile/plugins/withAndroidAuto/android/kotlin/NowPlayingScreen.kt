package nz.qiwiosity.app.carapp

//
// NowPlayingScreen
//
// Displays the currently playing POI (or an "idle" state) with transport
// actions (play/pause/stop, skip ±15s). Mirrors the iOS Now Playing tab.
//
// Under the hood playback is owned by QiwiosityAudioPlayer + the system
// MediaSession so lock-screen / AA media card widgets stay in sync.
//
// Also hosts the action sheet helper `PoiActionScreen` — lighter-weight
// than its own file, and it lives naturally next to Now Playing since
// that's what "Play story" ends up pushing.
//

import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.model.Action
import androidx.car.app.model.CarIcon
import androidx.car.app.model.MessageTemplate
import androidx.car.app.model.ParkedOnlyOnClickListener
import androidx.car.app.model.Template
import androidx.core.graphics.drawable.IconCompat
import android.content.Intent
import android.net.Uri

class NowPlayingScreen(ctx: CarContext) : Screen(ctx) {

    private val player get() = QiwiosityAudioPlayer.getInstance(carContext)

    private val audioListener = object : QiwiosityAudioListener {
        override fun onStart(poi: POI) { invalidate() }
        override fun onFinish(poi: POI) { invalidate() }
    }

    init {
        player.addListener(audioListener)
        lifecycle.addObserver(object : androidx.lifecycle.DefaultLifecycleObserver {
            override fun onDestroy(owner: androidx.lifecycle.LifecycleOwner) {
                player.removeListener(audioListener)
            }
        })
    }

    override fun onGetTemplate(): Template {
        val poi = player.nowPlaying
        val title = poi?.name ?: "Nothing playing"
        val body = poi?.let {
            "${it.regionPretty}\n\n${it.short}"
        } ?: "Tap a point of interest to hear its story."

        // Use our branded "listening" icon as the hero image at the top
        // of the Now Playing card. Falls back to the system play icon if
        // the drawable hasn't been shipped into this build.
        val heroId = carContext.resources.getIdentifier(
            "ic_qw_nowplaying", "drawable", carContext.packageName
        ).let { if (it != 0) it else android.R.drawable.ic_media_play }

        val builder = MessageTemplate.Builder(body)
            .setTitle(title)
            .setIcon(
                CarIcon.Builder(
                    IconCompat.createWithResource(carContext, heroId)
                ).build()
            )
            .setHeaderAction(Action.APP_ICON)

        if (poi != null) {
            // Play/pause toggle
            builder.addAction(
                Action.Builder()
                    .setTitle(if (player.isPlaying) "Pause" else "Play")
                    .setOnClickListener {
                        if (player.isPlaying) {
                            // CPL exposes onPause/onPlay via the MediaSession
                            // callbacks only; we reach across for symmetry.
                            player.stop()
                        } else {
                            player.play(poi)
                        }
                        invalidate()
                    }
                    .build()
            )
            // Stop
            builder.addAction(
                Action.Builder()
                    .setTitle("Stop")
                    .setOnClickListener { player.stop(); invalidate() }
                    .build()
            )
        }

        return builder.build()
    }
}

/**
 * Tiny "action sheet" screen shown when the driver taps a POI in any
 * list/map. Offers Play story / Navigate / Cancel. Matches the iOS
 * CPActionSheetTemplate behaviour in CarPlayController.presentPOI.
 *
 * `Navigate` uses the standard `geo:` intent — Google Maps (or whatever
 * the default maps app is) picks it up and takes over, which is the
 * legal hand-off for an app without the heavy Android Auto navigation
 * entitlement.
 */
class PoiActionScreen(ctx: CarContext, private val poi: POI) : Screen(ctx) {

    override fun onGetTemplate(): Template {
        val body = poi.short.ifBlank { "A point of interest in ${poi.regionPretty}." }

        val playAction = Action.Builder()
            .setTitle("Play story")
            .setOnClickListener {
                QiwiosityAudioPlayer.getInstance(carContext).play(poi)
                screenManager.pop()
            }
            .build()

        // Launching an external app has to be parked-only: Android Auto
        // refuses to fire arbitrary intents while the car is moving.
        val navAction = Action.Builder()
            .setTitle("Navigate")
            .setOnClickListener(
                ParkedOnlyOnClickListener.create {
                    val uri = Uri.parse(
                        "google.navigation:q=${poi.lat},${poi.lng}"
                    )
                    val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                        setPackage("com.google.android.apps.maps")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    try {
                        carContext.startActivity(intent)
                    } catch (_: Exception) {
                        // Fall back to a plain geo: URI if Google Maps
                        // isn't installed. The system will pick up any
                        // other navigation app.
                        val fallback = Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse("geo:${poi.lat},${poi.lng}?q=${poi.lat},${poi.lng}(${Uri.encode(poi.name)})")
                        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        carContext.startActivity(fallback)
                    }
                    screenManager.pop()
                }
            )
            .build()

        val cancelAction = Action.Builder()
            .setTitle("Back")
            .setOnClickListener { screenManager.pop() }
            .build()

        // MessageTemplate caps body length; truncate long commentary
        // to keep it inside the driver-distraction budget. The phone
        // app still shows the full text.
        val truncated = if (body.length > 180) body.substring(0, 177) + "…" else body

        return MessageTemplate.Builder(truncated)
            .setTitle(poi.name)
            .addAction(playAction)
            .addAction(navAction)
            .setHeaderAction(cancelAction)
            .build()
    }
}
