package nz.qiwiosity.app.carapp

//
// RegionDetailScreen
//
// List of POIs inside a single region. Tap → action sheet.
// Matches iOS `CarPlayController.poisTemplate(forRegion:title:)`.
//

import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.model.Action
import androidx.car.app.model.ItemList
import androidx.car.app.model.ListTemplate
import androidx.car.app.model.Row
import androidx.car.app.model.Template

class RegionDetailScreen(
    ctx: CarContext,
    private val region: POIRegion
) : Screen(ctx) {

    override fun onGetTemplate(): Template {
        val pois = POIStore.getInstance(carContext).poisInRegion(region.id)
        val list = ItemList.Builder()
        pois.forEach { poi ->
            list.addItem(
                Row.Builder()
                    .setTitle(poi.name)
                    .addText(poi.short.ifBlank { " " })
                    .setOnClickListener {
                        screenManager.push(PoiActionScreen(carContext, poi))
                    }
                    .build()
            )
        }
        return ListTemplate.Builder()
            .setTitle(region.name)
            .setSingleList(list.build())
            .setHeaderAction(Action.BACK)
            .build()
    }
}
