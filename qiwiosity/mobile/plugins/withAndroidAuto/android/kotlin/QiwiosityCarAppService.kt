package nz.qiwiosity.app.carapp

//
// QiwiosityCarAppService
//
// Entry point for the Android Auto experience — the Jetpack Car App
// Library instantiates this service when the phone connects to a head
// unit (or to the Desktop Head Unit emulator).
//
// Parallels iOS `CarPlaySceneDelegate`: it's the "someone plugged the
// phone into a car" hook. Everything interesting happens in
// `QiwiosityCarSession`.
//
// This file is injected into android/app/src/main/java/<pkg>/carapp/
// by the Expo config plugin `withAndroidAuto` on every prebuild. Do not
// edit it in the generated android/ tree — edit the source in
// mobile/plugins/withAndroidAuto/android/kotlin/QiwiosityCarAppService.kt
// and re-run `npx expo prebuild --clean`.
//

import android.content.Intent
import android.content.pm.ApplicationInfo
import androidx.car.app.CarAppService
import androidx.car.app.Session
import androidx.car.app.validation.HostValidator

class QiwiosityCarAppService : CarAppService() {

    override fun createHostValidator(): HostValidator {
        // In debug builds we accept any signed host (simulator, unsigned
        // APKs on the DHU, etc). In release we lock down to the official
        // allowlist baked into the library — that's the Google Auto host
        // and the Google Automotive host, nothing else.
        val isDebug = applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
        return if (isDebug) {
            HostValidator.ALLOW_ALL_HOSTS_VALIDATOR
        } else {
            HostValidator.Builder(applicationContext)
                .addAllowedHosts(androidx.car.app.R.array.hosts_allowlist_sample)
                .build()
        }
    }

    override fun onCreateSession(): Session = QiwiosityCarSession()

    override fun onCreateSession(sessionInfo: androidx.car.app.SessionInfo): Session {
        // Newer CPL versions pass a SessionInfo (e.g. for multi-display
        // head units). We only have one surface, so ignore it.
        return QiwiosityCarSession()
    }

    override fun onUnbind(intent: Intent?): Boolean {
        // Tear down audio if the car disconnects mid-playback, matching
        // iOS CarPlaySceneDelegate.didDisconnect behaviour.
        QiwiosityAudioPlayer.getInstance(applicationContext).stop()
        return super.onUnbind(intent)
    }
}
