//
//  CarPlaySceneDelegate.swift
//  Qiwiosity
//
//  Owns the CarPlay scene lifecycle. iOS hands us a CPInterfaceController
//  and a CPWindow when the phone connects to a CarPlay head unit; we hand
//  it a root template (a tab bar) and from there the rest of the CarPlay
//  UI hangs off CarPlayController.
//
//  This file is injected into ios/<ProjectName>/ by the Expo config
//  plugin `withCarPlay` on every prebuild. Do not edit it in the
//  generated ios/ tree — edit the source in
//  mobile/plugins/withCarPlay/ios/CarPlaySceneDelegate.swift and
//  re-run `npx expo prebuild --clean`.
//

import CarPlay
import UIKit

@available(iOS 14.0, *)
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {

  var interfaceController: CPInterfaceController?
  var carWindow: CPWindow?
  var controller: CarPlayController?

  // MARK: - Connection

  func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didConnect interfaceController: CPInterfaceController,
    to window: CPWindow
  ) {
    self.interfaceController = interfaceController
    self.carWindow = window

    let controller = CarPlayController(
      interfaceController: interfaceController,
      window: window
    )
    self.controller = controller

    interfaceController.setRootTemplate(controller.rootTemplate(), animated: false) { success, error in
      if let error = error {
        NSLog("[Qiwiosity/CarPlay] Failed to set root template: \(error.localizedDescription)")
      } else {
        NSLog("[Qiwiosity/CarPlay] Connected. success=\(success)")
      }
    }
  }

  func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didDisconnect interfaceController: CPInterfaceController,
    from window: CPWindow
  ) {
    NSLog("[Qiwiosity/CarPlay] Disconnected.")
    controller?.stopAudio()
    self.controller = nil
    self.carWindow = nil
    self.interfaceController = nil
  }
}
