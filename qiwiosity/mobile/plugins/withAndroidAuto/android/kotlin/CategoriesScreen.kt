package nz.qiwiosity.app.carapp

//
// CategoriesScreen
//
// Grid picker of POI categories. iOS uses CPGridTemplate with CPGridButton;
// Android Auto's Car App Library has GridTemplate + GridItem with the
// same semantics.
//

import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.model.Action
import androidx.car.app.model.CarIcon
import androidx.car.app.model.GridItem
import androidx.car.app.model.GridTemplate
import androidx.car.app.model.ItemList
import androidx.car.app.model.Template
import androidx.core.graphics.drawable.IconCompat

class CategoriesScreen(ctx: CarContext) : Screen(ctx) {

    override fun onGetTemplate(): Template {
        val store = POIStore.getInstance(carContext)
        val list = ItemList.Builder()

        store.categories().forEach { cat ->
            // Resolve the ic_qw_* drawable by name. Falls back to a
            // generic icon if the plugin hasn't copied the art into the
            // current build (shouldn't happen in the happy path).
            val resId = carContext.resources.getIdentifier(
                cat.iconName, "drawable", carContext.packageName
            )
            val safeResId = if (resId != 0) resId
                            else android.R.drawable.ic_menu_info_details
            val icon = CarIcon.Builder(
                IconCompat.createWithResource(carContext, safeResId)
            ).build()

            list.addItem(
                GridItem.Builder()
                    .setTitle(cat.label)
                    .setImage(icon, GridItem.IMAGE_TYPE_ICON)
                    .setOnClickListener {
                        screenManager.push(CategoryDetailScreen(carContext, cat))
                    }
                    .build()
            )
        }

        return GridTemplate.Builder()
            .setTitle("Categories")
            .setSingleList(list.build())
            .setHeaderAction(Action.APP_ICON)
            .build()
    }
}
