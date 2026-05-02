package nz.qiwiosity.app.carapp

//
// POIStore
//
// Reads the same attractions.json that the React Native phone app and
// iOS CarPlay both read, so POIs authored once show up everywhere. The
// config plugin copies the JSON into android/app/src/main/assets at
// prebuild time.
//
// Kotlin parallels iOS POIStore.swift — same struct shape, same
// conveniences (regionPretty, defaultCentre), same defaults for
// categories and region names. Keep these two in sync.
//

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

data class POI(
    val id: String,
    val name: String,
    val region: String,
    val lat: Double,
    val lng: Double,
    val category: String,
    val short: String,
    val commentary: String?,
    val triggerRadiusM: Int?
) {
    val regionPretty: String
        get() = region.split("-").joinToString(" ") {
            it.replaceFirstChar(Char::titlecase)
        }
}

data class POIRegion(val id: String, val name: String, val poiCount: Int)

data class POICategory(
    val id: String,
    val label: String,
    /**
     * Drawable resource *name* (e.g. "ic_qw_heritage"). We keep this as a
     * string so the data class stays decoupled from Android resources and
     * can be constructed at companion-object load time. Screens resolve
     * it to an int ID via `CarContext.resources.getIdentifier` when they
     * build the icon, and fall back to a generic drawable if not found.
     */
    val iconName: String
)

class POIStore private constructor(context: Context) {

    private val pois: List<POI> = loadBundledPOIs(context)
    private val categoryMap: Map<String, POICategory> = defaultCategories()
    private val regionNames: Map<String, String> = defaultRegionNames()

    fun allPOIs(): List<POI> = pois

    fun poi(id: String): POI? = pois.firstOrNull { it.id == id }

    fun poisInRegion(regionId: String): List<POI> =
        pois.filter { it.region == regionId }

    fun poisInCategory(categoryId: String): List<POI> =
        pois.filter { it.category == categoryId }

    fun regions(): List<POIRegion> {
        val grouped = pois.groupBy { it.region }
        return grouped.keys.sorted().map { id ->
            POIRegion(
                id = id,
                name = regionNames[id] ?: id,
                poiCount = grouped[id]?.size ?: 0
            )
        }
    }

    fun categories(): List<POICategory> {
        val present = pois.map { it.category }.toSet()
        return categoryMap.values
            .filter { it.id in present }
            .sortedBy { it.label }
    }

    companion object {
        private const val TAG = "Qiwiosity/POIStore"

        /** Centre-of-NZ fallback used before we know the user's location. */
        val DEFAULT_CENTRE = Pair(-41.0, 173.5)

        @Volatile private var instance: POIStore? = null

        fun getInstance(context: Context): POIStore {
            return instance ?: synchronized(this) {
                instance ?: POIStore(context.applicationContext).also { instance = it }
            }
        }

        private fun loadBundledPOIs(context: Context): List<POI> {
            return try {
                val text = context.assets.open("attractions.json")
                    .bufferedReader()
                    .use { it.readText() }
                val arr = JSONArray(text)
                val out = ArrayList<POI>(arr.length())
                for (i in 0 until arr.length()) {
                    val o: JSONObject = arr.getJSONObject(i)
                    out.add(
                        POI(
                            id = o.getString("id"),
                            name = o.getString("name"),
                            region = o.getString("region"),
                            lat = o.getDouble("lat"),
                            lng = o.getDouble("lng"),
                            category = o.getString("category"),
                            short = o.optString("short", ""),
                            commentary = if (o.has("commentary")) o.optString("commentary") else null,
                            triggerRadiusM = if (o.has("trigger_radius_m")) o.getInt("trigger_radius_m") else null
                        )
                    )
                }
                Log.i(TAG, "Loaded ${out.size} POIs from assets/attractions.json")
                out
            } catch (e: Exception) {
                Log.w(TAG, "Failed to load attractions.json — Android Auto will be empty", e)
                emptyList()
            }
        }

        private fun defaultCategories(): Map<String, POICategory> {
            // Mirrors ios/POIStore.swift. Names match the branded vector
            // drawables shipped by the withAndroidAuto plugin under
            // res/drawable/ic_qw_*.xml. Change these in lockstep with the
            // drawable filenames if the art is ever renamed.
            val list = listOf(
                POICategory("heritage",  "Heritage",    "ic_qw_heritage"),
                POICategory("culture",   "Culture",     "ic_qw_culture"),
                POICategory("nature",    "Nature",      "ic_qw_nature"),
                POICategory("food-wine", "Food & Wine", "ic_qw_food_wine"),
                POICategory("wildlife",  "Wildlife",    "ic_qw_wildlife"),
                POICategory("adventure", "Adventure",   "ic_qw_adventure")
            )
            return list.associateBy { it.id }
        }

        private fun defaultRegionNames(): Map<String, String> = mapOf(
            "hawkes-bay" to "Hawke's Bay",
            "wellington" to "Wellington",
            "auckland"   to "Auckland",
            "queenstown" to "Queenstown",
            "rotorua"    to "Rotorua",
            "west-coast" to "West Coast"
        )
    }
}
