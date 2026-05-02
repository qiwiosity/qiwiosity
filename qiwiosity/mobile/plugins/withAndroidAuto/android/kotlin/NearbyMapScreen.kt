package nz.qiwiosity.app.carapp

//
// NearbyMapScreen
//
// PlaceListMapTemplate showing the 12 POIs closest to the driver, live.
// Direct twin of iOS `CarPlayController.nearbyPOITemplate()` + the
// didChangeMapRegion delegate.
//
// Data flow:
//   CarLocationProvider → onLocationChanged → re-sort POIStore.allPOIs()
//   by haversine distance → invalidate() → CPL redraws the list and
//   anchors the map on us.
//
// If we don't yet have a location (first few seconds, permission
// denied, LocationManager unavailable) we anchor to the centre of NZ
// and show POIs in authoring order. Degrading gracefully matters — the
// car surface can never just be blank.
//

import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.model.Action
import androidx.car.app.model.ActionStrip
import androidx.car.app.model.CarIcon
import androidx.car.app.model.CarLocation
import androidx.car.app.model.ItemList
import androidx.car.app.model.Metadata
import androidx.car.app.model.Place
import androidx.car.app.model.PlaceListMapTemplate
import androidx.car.app.model.PlaceMarker
import androidx.car.app.model.Row
import androidx.car.app.model.Template
import androidx.core.graphics.drawable.IconCompat
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner

class NearbyMapScreen(ctx: CarContext) : Screen(ctx) {

    private val locationProvider = CarLocationProvider.getInstance(carContext)

    private val locationListener = object : CarLocationListener {
        override fun onLocationChanged(lat: Double, lng: Double) {
            // invalidate() re-runs onGetTemplate on the main thread; safe
            // to call from any location callback.
            invalidate()
        }
    }

    init {
        locationProvider.addListener(locationListener)
        lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onDestroy(owner: LifecycleOwner) {
                locationProvider.removeListener(locationListener)
            }
        })
    }

    override fun onGetTemplate(): Template {
        val store = POIStore.getInstance(carContext)
        val here = locationProvider.lastKnown

        // Sort by distance if we know where we are, else keep authoring order.
        val pois = if (here != null) {
            store.allPOIs().sortedBy { poi ->
                CarLocationProvider.distanceMetres(here.first, here.second, poi.lat, poi.lng)
            }
        } else {
            store.allPOIs()
        }.take(12)

        val listBuilder = ItemList.Builder()
        pois.forEach { poi ->
            val marker = PlaceMarker.Builder().build()
            val place = Place.Builder(
                CarLocation.create(poi.lat, poi.lng)
            ).setMarker(marker).build()

            // If we know where we are, show a rough distance as a third line.
            val subtitle = here?.let {
                val d = CarLocationProvider.distanceMetres(it.first, it.second, poi.lat, poi.lng)
                formatDistance(d)
            } ?: poi.regionPretty

            val row = Row.Builder()
                .setTitle(poi.name)
                .addText(subtitle)
                .addText(poi.short.ifBlank { " " })
                .setMetadata(Metadata.Builder().setPlace(place).build())
                .setOnClickListener {
                    screenManager.push(PoiActionScreen(carContext, poi))
                }
                .build()
            listBuilder.addItem(row)
        }

        // Anchor on the driver if we have them; otherwise centre of NZ.
        val anchorLat = here?.first ?: POIStore.DEFAULT_CENTRE.first
        val anchorLng = here?.second ?: POIStore.DEFAULT_CENTRE.second

        return PlaceListMapTemplate.Builder()
            .setTitle(if (here != null) "Nearby" else "Nearby (centred on NZ)")
            .setItemList(listBuilder.build())
            .setAnchor(
                Place.Builder(CarLocation.create(anchorLat, anchorLng))
                    .setMarker(
                        // Branded "you are here" marker. Falls back to a
                        // system glyph if the drawable hasn't been copied in.
                        PlaceMarker.Builder()
                            .setIcon(
                                CarIcon.Builder(
                                    IconCompat.createWithResource(
                                        carContext,
                                        carContext.resources.getIdentifier(
                                            "ic_qw_nearby", "drawable", carContext.packageName
                                        ).let { id ->
                                            if (id != 0) id else android.R.drawable.presence_online
                                        }
                                    )
                                ).build(),
                                PlaceMarker.TYPE_ICON
                            )
                            .build()
                    )
                    .build()
            )
            .setHeaderAction(Action.APP_ICON)
            .setActionStrip(
                ActionStrip.Builder()
                    .addAction(
                        Action.Builder()
                            .setTitle("Refresh")
                            .setOnClickListener { invalidate() }
                            .build()
                    )
                    .build()
            )
            .build()
    }

    private fun formatDistance(metres: Double): String = when {
        metres < 1_000    -> "${metres.toInt()} m"
        metres < 10_000   -> "%.1f km".format(metres / 1000.0)
        else              -> "${(metres / 1000.0).toInt()} km"
    }
}
