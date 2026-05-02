//
//  POIStore.swift
//  Qiwiosity
//
//  Reads the same attractions.json the React Native phone app reads,
//  so POIs authored once show up in the car as well. We bundle the JSON
//  into the iOS app resources via the config plugin, then parse it here
//  into Swift value types that CarPlayController can hand straight to
//  CarPlay templates.
//

import Foundation
import CoreLocation

struct POI: Decodable {
  let id: String
  let name: String
  let region: String
  let lat: Double
  let lng: Double
  let category: String
  let short: String
  let commentary: String?
  let trigger_radius_m: Int?

  var coordinate: CLLocationCoordinate2D {
    CLLocationCoordinate2D(latitude: lat, longitude: lng)
  }

  var regionPretty: String {
    region.split(separator: "-")
      .map { $0.prefix(1).uppercased() + $0.dropFirst() }
      .joined(separator: " ")
  }
}

struct POIRegion {
  let id: String
  let name: String
  let poiCount: Int
}

struct POICategory {
  let id: String
  let label: String
  let symbolName: String // SF Symbol
}

class POIStore {
  static let shared = POIStore()

  /// Centre-of-NZ fallback used when we haven't got a user location yet.
  static let defaultCentre = CLLocationCoordinate2D(latitude: -41.0, longitude: 173.5)

  private let pois: [POI]
  private let categoryMap: [String: POICategory]
  private let regionNames: [String: String]

  private init() {
    self.pois = POIStore.loadBundledPOIs()
    self.categoryMap = POIStore.defaultCategories()
    self.regionNames = POIStore.defaultRegionNames()
  }

  // MARK: - Public API

  func allPOIs() -> [POI] { pois }

  func poi(withId id: String) -> POI? {
    pois.first(where: { $0.id == id })
  }

  func pois(inRegion regionId: String) -> [POI] {
    pois.filter { $0.region == regionId }
  }

  func pois(inCategory category: String) -> [POI] {
    pois.filter { $0.category == category }
  }

  func regions() -> [POIRegion] {
    let grouped = Dictionary(grouping: pois, by: { $0.region })
    return grouped.keys.sorted().map { id in
      POIRegion(
        id: id,
        name: regionNames[id] ?? id,
        poiCount: grouped[id]?.count ?? 0
      )
    }
  }

  func categories() -> [POICategory] {
    let present = Set(pois.map { $0.category })
    return categoryMap.values
      .filter { present.contains($0.id) }
      .sorted(by: { $0.label < $1.label })
  }

  // MARK: - Loading

  private static func loadBundledPOIs() -> [POI] {
    guard let url = Bundle.main.url(forResource: "attractions", withExtension: "json") else {
      NSLog("[Qiwiosity/POIStore] attractions.json missing from bundle — CarPlay will be empty.")
      return []
    }
    do {
      let data = try Data(contentsOf: url)
      let decoder = JSONDecoder()
      let list = try decoder.decode([POI].self, from: data)
      NSLog("[Qiwiosity/POIStore] Loaded \(list.count) POIs.")
      return list
    } catch {
      NSLog("[Qiwiosity/POIStore] Failed to decode attractions.json: \(error.localizedDescription)")
      return []
    }
  }

  private static func defaultCategories() -> [String: POICategory] {
    // Mirrors mobile/src/data/categories.json. Keep in sync.
    let list: [POICategory] = [
      POICategory(id: "heritage",   label: "Heritage",   symbolName: "book.closed"),
      POICategory(id: "culture",    label: "Culture",    symbolName: "person.3"),
      POICategory(id: "nature",     label: "Nature",     symbolName: "leaf"),
      POICategory(id: "food-wine",  label: "Food & Wine", symbolName: "wineglass"),
      POICategory(id: "wildlife",   label: "Wildlife",   symbolName: "bird"),
      POICategory(id: "adventure",  label: "Adventure",  symbolName: "bolt"),
    ]
    return Dictionary(uniqueKeysWithValues: list.map { ($0.id, $0) })
  }

  private static func defaultRegionNames() -> [String: String] {
    // Friendly display names; extend as you add regions.
    return [
      "hawkes-bay": "Hawke's Bay",
      "wellington": "Wellington",
      "auckland":   "Auckland",
      "queenstown": "Queenstown",
      "rotorua":    "Rotorua",
      "west-coast": "West Coast",
    ]
  }
}
