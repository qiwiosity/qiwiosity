package nz.qiwiosity.app.carapp

//
// CarLocationProvider
//
// Thin wrapper around android.location.LocationManager that screens
// in the car surface can subscribe to. We deliberately use the
// built-in LocationManager rather than play-services FusedLocation so
// the car app works even if Google Play Services is unavailable on
// the phone — a real scenario for some AA deployments.
//
// Location permission is asked for by the phone app (expo-location),
// so by the time the car connects we usually already have it. If we
// don't, we degrade gracefully: the Nearby map anchors to the default
// NZ centre and we log it once.
//

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat

interface CarLocationListener {
    fun onLocationChanged(lat: Double, lng: Double)
}

class CarLocationProvider private constructor(private val appContext: Context) {

    private val lm: LocationManager? =
        appContext.getSystemService(Context.LOCATION_SERVICE) as? LocationManager

    private val listeners = mutableSetOf<CarLocationListener>()

    /** Most recent cached position, null if we've never had one. */
    @Volatile var lastKnown: Pair<Double, Double>? = null
        private set

    private val internalListener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            lastKnown = location.latitude to location.longitude
            listeners.toList().forEach {
                it.onLocationChanged(location.latitude, location.longitude)
            }
        }
        // Legacy no-op overrides so older Androids don't crash.
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
        override fun onProviderEnabled(provider: String) {}
        override fun onProviderDisabled(provider: String) {}
    }

    /** Add a listener; starts updates on the first subscriber. */
    fun addListener(l: CarLocationListener) {
        val wasEmpty = listeners.isEmpty()
        listeners.add(l)
        // Replay the most recent fix so a freshly-attached screen doesn't
        // sit on the default centre for the first 2–10 seconds.
        lastKnown?.let { (lat, lng) -> l.onLocationChanged(lat, lng) }
        if (wasEmpty) startUpdates()
    }

    /** Remove a listener; stops updates when the last subscriber leaves. */
    fun removeListener(l: CarLocationListener) {
        listeners.remove(l)
        if (listeners.isEmpty()) stopUpdates()
    }

    // -- private --------------------------------------------------------

    private fun hasFineLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(
            appContext, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

    private fun startUpdates() {
        val mgr = lm ?: run {
            Log.w(TAG, "No LocationManager; car map will stay on default centre.")
            return
        }
        if (!hasFineLocationPermission()) {
            Log.w(TAG, "ACCESS_FINE_LOCATION not granted yet; car map will stay on default centre.")
            return
        }
        try {
            // Seed with the last known fix so we don't look stale.
            val providers = listOf(
                LocationManager.GPS_PROVIDER,
                LocationManager.NETWORK_PROVIDER,
                LocationManager.PASSIVE_PROVIDER
            )
            providers.asSequence()
                .mapNotNull { p -> try { mgr.getLastKnownLocation(p) } catch (_: SecurityException) { null } }
                .maxByOrNull { it.time }
                ?.let {
                    lastKnown = it.latitude to it.longitude
                    listeners.toList().forEach { l ->
                        l.onLocationChanged(it.latitude, it.longitude)
                    }
                }

            // Subscribe to live updates. 5s / 25m is conservative for the
            // "Nearby" tab — we don't need second-by-second accuracy to
            // re-rank a POI list. Adjust upwards if the head unit reports
            // battery pressure.
            val interval = 5_000L
            val minDistance = 25f
            if (mgr.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                mgr.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    interval, minDistance, internalListener, Looper.getMainLooper()
                )
            }
            if (mgr.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                mgr.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    interval, minDistance, internalListener, Looper.getMainLooper()
                )
            }
            Log.i(TAG, "Location updates started.")
        } catch (e: SecurityException) {
            Log.w(TAG, "SecurityException starting location updates", e)
        }
    }

    private fun stopUpdates() {
        try { lm?.removeUpdates(internalListener) } catch (_: Exception) {}
        Log.i(TAG, "Location updates stopped.")
    }

    companion object {
        private const val TAG = "Qiwiosity/CarLocation"
        @Volatile private var instance: CarLocationProvider? = null
        fun getInstance(context: Context): CarLocationProvider =
            instance ?: synchronized(this) {
                instance ?: CarLocationProvider(context.applicationContext).also { instance = it }
            }

        /** Haversine distance in metres — cheap, good enough for POI ranking. */
        fun distanceMetres(
            lat1: Double, lng1: Double, lat2: Double, lng2: Double
        ): Double {
            val r = 6_371_000.0
            val dLat = Math.toRadians(lat2 - lat1)
            val dLng = Math.toRadians(lng2 - lng1)
            val a = Math.sin(dLat / 2).let { it * it } +
                Math.cos(Math.toRadians(lat1)) *
                Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLng / 2).let { it * it }
            return 2 * r * Math.asin(Math.sqrt(a))
        }
    }
}
