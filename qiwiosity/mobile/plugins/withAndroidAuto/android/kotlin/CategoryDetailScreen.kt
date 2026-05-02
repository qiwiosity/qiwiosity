package nz.qiwiosity.app.carapp

//
// CategoryDetailScreen
//
// POIs filtered to a single category. Same shape as RegionDetailScreen.
//

import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.model.Action
import androidx.car.app.model.ItemList
import androidx.car.app.model.ListTemplate
import androidx.car.app.model.Row
import androidx.car.app.model.Template

class CategoryDetailScreen(
    ctx: CarContext,
    private val category: POICategory
) : Screen(ctx) {

    override fun onGetTemplate(): Template {
        val pois = POIStore.getInstance(carContext).poisInCategory(category.id)
        val list = ItemList.Builder()
        pois.forEach { poi ->
            list.addItem(
                Row.Builder()
                    .setTitle(poi.name)
                    .addText(poi.regionPretty)
                    .addText(poi.short.ifBlank { " " })
                    .setOnClickListener {
                        screenManager.push(PoiActionScreen(carContext, poi))
                    }
                    .build()
            )
        }
        return ListTemplate.Builder()
            .setTitle(category.label)
            .setSingleList(list.build())
            .setHeaderAction(Action.BACK)
            .build()
    }
}
