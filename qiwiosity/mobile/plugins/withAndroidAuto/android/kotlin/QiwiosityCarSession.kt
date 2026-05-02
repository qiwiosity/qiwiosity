package nz.qiwiosity.app.carapp

//
// QiwiosityCarSession
//
// The session is per-car-connection state. When the phone connects to a
// head unit the host calls `onCreateScreen` to get our root Screen; we
// return a tab-bar screen that matches the four-tab CarPlay layout:
//
//   Nearby (map)    — NearbyMapScreen
//   Regions (list)  — RegionsScreen
//   Categories (grid) — CategoriesScreen
//   Now Playing     — NowPlayingScreen
//
// The direct equivalent of CarPlayController.rootTemplate() on iOS.
//

import android.content.Intent
import androidx.car.app.Screen
import androidx.car.app.Session
import androidx.car.app.model.Action
import androidx.car.app.model.CarIcon
import androidx.car.app.model.Tab
import androidx.car.app.model.TabContents
import androidx.car.app.model.TabTemplate
import androidx.car.app.model.Template
import androidx.core.graphics.drawable.IconCompat

class QiwiosityCarSession : Session() {

    override fun onCreateScreen(intent: Intent): Screen {
        return RootTabsScreen(carContext)
    }
}

/**
 * Root tab bar screen. The four children mirror CarPlay's tab templates.
 *
 * `TabTemplate` is the CPL equivalent of `CPTabBarTemplate`. We stash
 * the active Screen per tab so state survives tab switches.
 */
class RootTabsScreen(ctx: androidx.car.app.CarContext) : Screen(ctx) {

    private enum class TabId { NEARBY, REGIONS, CATEGORIES, NOW_PLAYING }

    private var activeTab: TabId = TabId.NEARBY

    override fun onGetTemplate(): Template {
        // Pre-warm the POI store so the first tab swap doesn't stutter.
        POIStore.getInstance(carContext).allPOIs()

        val builder = TabTemplate.Builder(object : TabTemplate.TabCallback {
            override fun onTabSelected(tabContentId: String) {
                activeTab = TabId.valueOf(tabContentId)
                invalidate()
            }
        })
            .setHeaderAction(Action.APP_ICON)
            .setTabContents(tabContents(activeTab))

        TabId.values().forEach { id ->
            builder.addTab(
                Tab.Builder()
                    .setContentId(id.name)
                    .setTitle(tabTitle(id))
                    .setIcon(tabIcon(id))
                    .build()
            )
        }
        builder.setActiveTabContentId(activeTab.name)

        return builder.build()
    }

    private fun tabContents(id: TabId): TabContents {
        val screen: Screen = when (id) {
            TabId.NEARBY      -> NearbyMapScreen(carContext)
            TabId.REGIONS     -> RegionsScreen(carContext)
            TabId.CATEGORIES  -> CategoriesScreen(carContext)
            TabId.NOW_PLAYING -> NowPlayingScreen(carContext)
        }
        return TabContents.Builder(screen.template).build()
    }

    private fun tabTitle(id: TabId): String = when (id) {
        TabId.NEARBY      -> "Nearby"
        TabId.REGIONS     -> "Regions"
        TabId.CATEGORIES  -> "Categories"
        TabId.NOW_PLAYING -> "Listening"
    }

    private fun tabIcon(id: TabId): CarIcon {
        // Branded Qiwiosity vector drawables dropped in by the
        // withAndroidAuto Expo plugin — see mobile/plugins/withAndroidAuto
        // /android/res/drawable/ic_qw_*.xml for the source art.
        val pkg = carContext.packageName
        val name = when (id) {
            TabId.NEARBY      -> "ic_qw_nearby"
            TabId.REGIONS     -> "ic_qw_regions"
            TabId.CATEGORIES  -> "ic_qw_categories"
            TabId.NOW_PLAYING -> "ic_qw_nowplaying"
        }
        val resId = carContext.resources.getIdentifier(name, "drawable", pkg)
        // Defensive fallback in case the drawable copy step didn't run
        // (e.g. hand-edited android/ tree) — we don't want a missing
        // icon to crash the car surface.
        val safeId = if (resId != 0) resId else android.R.drawable.ic_menu_mylocation
        return CarIcon.Builder(
            IconCompat.createWithResource(carContext, safeId)
        ).build()
    }
}
