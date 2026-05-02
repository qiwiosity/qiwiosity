package nz.qiwiosity.app.carapp

//
// RegionsScreen
//
// Flat list of NZ regions with POI counts. Tapping a region pushes a
// RegionDetailScreen for that region's POIs.
// Twin of iOS `CarPlayController.regionsTemplate()`.
//

import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.model.Action
import androidx.car.app.model.ItemList
import androidx.car.app.model.ListTemplate
import androidx.car.app.model.Row
import androidx.car.app.model.Template

class RegionsScreen(ctx: CarContext) : Screen(ctx) {

    override fun onGetTemplate(): Template {
        val store = POIStore.getInstance(carContext)
        val listBuilder = ItemList.Builder()

        store.regions().forEach { region ->
            val row = Row.Builder()
                .setTitle(region.name)
                .addText("${region.poiCount} stops")
                .setBrowsable(true)
                .setOnClickListener {
                    screenManager.push(RegionDetailScreen(carContext, region))
                }
                .build()
            listBuilder.addItem(row)
        }

        return ListTemplate.Builder()
            .setTitle("Regions")
            .setSingleList(listBuilder.build())
            .setHeaderAction(Action.APP_ICON)
            .build()
    }
}
