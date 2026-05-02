//
//  QiwiosityAudioPlayer.swift
//  Qiwiosity
//
//  Plays POI narration audio and keeps the Now Playing info centre in
//  sync so the CarPlay Now Playing template shows the right title, and
//  the system lock-screen / Control Centre widgets also work.
//
//  Audio file naming convention (matches the content/ pipeline):
//    <poi_id>.<length>.mp3     e.g.  napier-marine-parade.standard.mp3
//
//  Files are copied into the iOS bundle by the Expo config plugin from
//  `mobile/assets/audio/` — identical to what the React Native side
//  reads, so headline/standard parity is automatic.
//

import AVFoundation
import MediaPlayer
import UIKit

protocol QiwiosityAudioPlayerDelegate: AnyObject {
  func audioPlayerDidStart(poi: POI)
  func audioPlayerDidFinish(poi: POI)
}

class QiwiosityAudioPlayer: NSObject {
  static let shared = QiwiosityAudioPlayer()

  weak var delegate: QiwiosityAudioPlayerDelegate?

  private var player: AVAudioPlayer?
  private var currentPOI: POI?

  private override init() {
    super.init()
    configureAudioSession()
    wireRemoteCommands()
  }

  // MARK: - Public API

  func play(poi: POI, length: String = "standard") {
    stop()

    guard let url = audioURL(for: poi.id, length: length)
            ?? audioURL(for: poi.id, length: length == "standard" ? "headline" : "standard") else {
      NSLog("[Qiwiosity/Audio] No bundled audio for \(poi.id); silent skip.")
      return
    }

    do {
      let p = try AVAudioPlayer(contentsOf: url)
      p.delegate = self
      p.prepareToPlay()
      p.play()
      self.player = p
      self.currentPOI = poi
      updateNowPlaying(poi: poi, duration: p.duration)
      delegate?.audioPlayerDidStart(poi: poi)
    } catch {
      NSLog("[Qiwiosity/Audio] Failed to play \(url.lastPathComponent): \(error.localizedDescription)")
    }
  }

  func stop() {
    player?.stop()
    player = nil
    if let poi = currentPOI {
      delegate?.audioPlayerDidFinish(poi: poi)
    }
    currentPOI = nil
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
  }

  var isPlaying: Bool { player?.isPlaying ?? false }

  // MARK: - Private

  private func audioURL(for poiId: String, length: String) -> URL? {
    let name = "\(poiId).\(length)"
    return Bundle.main.url(forResource: name, withExtension: "mp3")
  }

  private func configureAudioSession() {
    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
      try session.setActive(true)
    } catch {
      NSLog("[Qiwiosity/Audio] Audio session setup failed: \(error.localizedDescription)")
    }
  }

  private func updateNowPlaying(poi: POI, duration: TimeInterval) {
    var info: [String: Any] = [
      MPMediaItemPropertyTitle:          poi.name,
      MPMediaItemPropertyAlbumTitle:     "Qiwiosity — Stories Along the Way",
      MPMediaItemPropertyArtist:         poi.regionPretty,
      MPMediaItemPropertyPlaybackDuration: duration,
      MPNowPlayingInfoPropertyPlaybackRate: 1.0,
      MPNowPlayingInfoPropertyElapsedPlaybackTime: 0.0,
    ]
    if let art = artwork() {
      info[MPMediaItemPropertyArtwork] = art
    }
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
  }

  private func artwork() -> MPMediaItemArtwork? {
    guard let img = UIImage(named: "QiwiosityNowPlayingArtwork") else { return nil }
    return MPMediaItemArtwork(boundsSize: img.size) { _ in img }
  }

  private func wireRemoteCommands() {
    let cc = MPRemoteCommandCenter.shared()
    cc.playCommand.addTarget { [weak self] _ in
      self?.player?.play() ?? ()
      return .success
    }
    cc.pauseCommand.addTarget { [weak self] _ in
      self?.player?.pause() ?? ()
      return .success
    }
    cc.stopCommand.addTarget { [weak self] _ in
      self?.stop()
      return .success
    }
    cc.togglePlayPauseCommand.addTarget { [weak self] _ in
      guard let p = self?.player else { return .noActionableNowPlayingItem }
      p.isPlaying ? p.pause() : p.play()
      return .success
    }
    cc.skipForwardCommand.preferredIntervals = [15]
    cc.skipForwardCommand.addTarget { [weak self] _ in
      guard let p = self?.player else { return .noActionableNowPlayingItem }
      p.currentTime = min(p.currentTime + 15, p.duration)
      return .success
    }
    cc.skipBackwardCommand.preferredIntervals = [15]
    cc.skipBackwardCommand.addTarget { [weak self] _ in
      guard let p = self?.player else { return .noActionableNowPlayingItem }
      p.currentTime = max(p.currentTime - 15, 0)
      return .success
    }
  }
}

extension QiwiosityAudioPlayer: AVAudioPlayerDelegate {
  func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
    if let poi = currentPOI {
      delegate?.audioPlayerDidFinish(poi: poi)
    }
    currentPOI = nil
    self.player = nil
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
  }
}
