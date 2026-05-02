//
//  CarPlayController.swift
//  Qiwiosity
//
//  The CarPlay UI, composed from Apple's driver-safe template library.
//  Apple does not let us draw arbitrary views in CarPlay — we pick from
//  approved templates. For a travel / audio-guide app the right set is:
//
//    - CPTabBarTemplate           root navigation
//    - CPPointOfInterestTemplate  map with nearby POIs
//    - CPListTemplate             flat browse-by-region list
//    - CPGridTemplate             category picker
//    - CPNowPlayingTemplate       narration playback (Apple-drawn)
//
//  Data comes from the bundled attractions.json (same file the RN phone
//  app reads), so anything authored once shows up in both surfaces.
//

import CarPlay
import MapKit
import UIKit

@available(iOS 14.0, *)
class CarPlayController: NSObject {

  private let interfaceController: CPInterfaceController
  private let window: CPWindow
  private let store = POIStore.shared
  private let player = QiwiosityAudioPlayer.shared

  init(interfaceController: CPInterfaceController, window: CPWindow) {
    self.interfaceController = interfaceController
    self.window = window
    super.init()
    player.delegate = self
  }

  // MARK: - Root

  func rootTemplate() -> CPTemplate {
    let tabs = CPTabBarTemplate(templates: [
      nearbyPOITemplate(),
      regionsTemplate(),
      categoriesTemplate(),
      nowPlayingTabTemplate(),
    ])
    return tabs
  }

  // MARK: - Nearby POI map

  private func nearbyPOITemplate() -> CPPointOfInterestTemplate {
    let template = CPPointOfInterestTemplate(title: "Nearby")
    template.tabImage = UIImage(systemName: "mappin.and.ellipse")
    template.pointOfInterestDelegate = self
    refreshNearby(template: template, centre: POIStore.defaultCentre)
    return template
  }

  private func refreshNearby(template: CPPointOfInterestTemplate, centre: CLLocationCoordinate2D) {
    let items: [CPPointOfInterest] = store.allPOIs().prefix(12).map { poi in
      let location = MKMapItem(placemark: MKPlacemark(coordinate: poi.coordinate))
      location.name = poi.name
      let item = CPPointOfInterest(
        location: location,
        title: poi.name,
        subtitle: poi.regionPretty,
        summary: poi.short,
        detailTitle: poi.name,
        detailSubtitle: poi.regionPretty,
        detailSummary: poi.short,
        pinImage: nil
      )
      item.userInfo = poi.id
      return item
    }
    template.setPointsOfInterest(items, selectedIndex: NSNotFound)
  }

  // MARK: - Regions list

  private func regionsTemplate() -> CPListTemplate {
    let items = store.regions().map { region -> CPListItem in
      let item = CPListItem(text: region.name, detailText: "\(region.poiCount) stops")
      item.accessoryType = .disclosureIndicator
      item.handler = { [weak self] _, completion in
        guard let self = self else { completion(); return }
        let sub = self.poisTemplate(forRegion: region.id, title: region.name)
        self.interfaceController.pushTemplate(sub, animated: true) { _, _ in
          completion()
        }
      }
      return item
    }
    let template = CPListTemplate(title: "Regions", sections: [CPListSection(items: items)])
    template.tabImage = UIImage(systemName: "map")
    return template
  }

  private func poisTemplate(forRegion regionId: String, title: String) -> CPListTemplate {
    let items = store.pois(inRegion: regionId).map { poi -> CPListItem in
      let item = CPListItem(text: poi.name, detailText: poi.short)
      item.accessoryType = .none
      item.handler = { [weak self] _, completion in
        guard let self = self else { completion(); return }
        self.presentPOI(poi)
        completion()
      }
      return item
    }
    return CPListTemplate(title: title, sections: [CPListSection(items: items)])
  }

  // MARK: - Categories grid

  private func categoriesTemplate() -> CPGridTemplate {
    let buttons = store.categories().map { category -> CPGridButton in
      let image = UIImage(systemName: category.symbolName) ?? UIImage(systemName: "circle.fill")!
      return CPGridButton(titleVariants: [category.label], image: image) { [weak self] _ in
        guard let self = self else { return }
        let t = self.poisTemplate(forCategory: category.id, title: category.label)
        self.interfaceController.pushTemplate(t, animated: true, completion: nil)
      }
    }
    let template = CPGridTemplate(title: "Categories", gridButtons: buttons)
    template.tabImage = UIImage(systemName: "square.grid.2x2")
    return template
  }

  private func poisTemplate(forCategory category: String, title: String) -> CPListTemplate {
    let items = store.pois(inCategory: category).map { poi -> CPListItem in
      let item = CPListItem(text: poi.name, detailText: poi.short)
      item.handler = { [weak self] _, completion in
        self?.presentPOI(poi)
        completion()
      }
      return item
    }
    return CPListTemplate(title: title, sections: [CPListSection(items: items)])
  }

  // MARK: - Now Playing tab

  private func nowPlayingTabTemplate() -> CPNowPlayingTemplate {
    let t = CPNowPlayingTemplate.shared
    t.tabImage = UIImage(systemName: "waveform.circle")
    t.tabTitle = "Listening"
    // Show controls; Apple auto-fills metadata from MPNowPlayingInfoCenter.
    t.isUpNextButtonEnabled = false
    t.isAlbumArtistButtonEnabled = false
    return t
  }

  // MARK: - POI detail action sheet

  private func presentPOI(_ poi: POI) {
    let actions = CPAlertAction(title: "Play story", style: .default) { [weak self] _ in
      self?.player.play(poi: poi)
      self?.interfaceController.dismissTemplate(animated: true, completion: nil)
      self?.pushNowPlayingIfPossible()
    }
    let drive = CPAlertAction(title: "Navigate", style: .default) { [weak self] _ in
      self?.startNavigation(to: poi)
      self?.interfaceController.dismissTemplate(animated: true, completion: nil)
    }
    let cancel = CPAlertAction(title: "Back", style: .cancel) { [weak self] _ in
      self?.interfaceController.dismissTemplate(animated: true, completion: nil)
    }
    let sheet = CPActionSheetTemplate(
      title: poi.name,
      message: poi.short,
      actions: [actions, drive, cancel]
    )
    interfaceController.presentTemplate(sheet, animated: true, completion: nil)
  }

  private func pushNowPlayingIfPossible() {
    // Push the system Now Playing template if it's not already visible.
    let np = CPNowPlayingTemplate.shared
    if interfaceController.topTemplate !== np {
      interfaceController.pushTemplate(np, animated: true, completion: nil)
    }
  }

  private func startNavigation(to poi: POI) {
    // Without Apple's navigation-app entitlement we can't own turn-by-turn
    // inside CarPlay. The ship-safe fallback is to hand off to the system's
    // default maps app; it receives the coordinate and takes over.
    let destination = MKMapItem(placemark: MKPlacemark(coordinate: poi.coordinate))
    destination.name = poi.name
    destination.openInMaps(launchOptions: [
      MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving
    ])
  }

  // MARK: - Audio lifecycle

  func stopAudio() {
    player.stop()
  }
}

// MARK: - Delegates

@available(iOS 14.0, *)
extension CarPlayController: CPPointOfInterestTemplateDelegate {
  func pointOfInterestTemplate(
    _ pointOfInterestTemplate: CPPointOfInterestTemplate,
    didChangeMapRegion region: MKCoordinateRegion
  ) {
    refreshNearby(template: pointOfInterestTemplate, centre: region.center)
  }

  func pointOfInterestTemplate(
    _ pointOfInterestTemplate: CPPointOfInterestTemplate,
    didSelect pointOfInterest: CPPointOfInterest
  ) {
    guard let poiId = pointOfInterest.userInfo as? String,
          let poi = store.poi(withId: poiId) else { return }
    presentPOI(poi)
  }
}

@available(iOS 14.0, *)
extension CarPlayController: QiwiosityAudioPlayerDelegate {
  func audioPlayerDidStart(poi: POI) {
    NSLog("[Qiwiosity/CarPlay] Started playback for \(poi.id)")
  }
  func audioPlayerDidFinish(poi: POI) {
    NSLog("[Qiwiosity/CarPlay] Finished playback for \(poi.id)")
  }
}
