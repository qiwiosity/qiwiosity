import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { getAudioSource } from '../utils/audio';

/**
 * useNarration
 *
 * One hook, one play/stop toggle. Prefers a bundled MP3 (from the TTS
 * pipeline) when one exists; falls back to on-device TTS (expo-speech).
 *
 *   const { playing, toggle, stop } = useNarration();
 *   toggle(attraction, 'standard');  // length: 'headline' | 'standard'
 *
 * SDK 54 uses expo-audio (expo-av was removed). The player is a lightweight
 * AudioPlayer instance; we keep the current one in a ref and dispose it on
 * stop / track change / unmount.
 */
export default function useNarration() {
  const [playing, setPlaying] = useState(null); // { id, length } | null
  const playerRef = useRef(null);

  const disposePlayer = () => {
    const p = playerRef.current;
    playerRef.current = null;
    if (!p) return;
    try {
      p.pause();
    } catch {}
    try {
      p.remove();
    } catch {}
  };

  const stop = useCallback(async () => {
    Speech.stop();
    disposePlayer();
    setPlaying(null);
  }, []);

  const playSpeech = useCallback((attraction) => {
    Speech.stop();
    Speech.speak(`${attraction.name}. ${attraction.commentary}`, {
      rate: 0.95,
      pitch: 1,
      onDone: () => setPlaying(null),
      onStopped: () => setPlaying(null),
      onError: () => setPlaying(null),
    });
  }, []);

  const playFile = useCallback(async (source) => {
    // Configure audio session for silent-mode + background playback.
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
      });
    } catch {}

    const player = createAudioPlayer(source);
    playerRef.current = player;

    player.addListener('playbackStatusUpdate', (status) => {
      if (status?.didJustFinish) {
        disposePlayer();
        setPlaying(null);
      }
    });

    player.play();
  }, []);

  const toggle = useCallback(
    async (attraction, length = 'standard') => {
      // If this exact track is playing, stop.
      if (
        playing &&
        playing.id === attraction.id &&
        playing.length === length
      ) {
        await stop();
        return;
      }
      await stop();
      setPlaying({ id: attraction.id, length });

      const source = getAudioSource(attraction.id, length);
      if (source) {
        try {
          await playFile(source);
          return;
        } catch (err) {
          console.warn(
            '[useNarration] failed to play bundled audio, falling back to TTS:',
            err?.message
          );
        }
      }
      // Fallback: on-device TTS
      playSpeech(attraction);
    },
    [playing, playFile, playSpeech, stop]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Speech.stop();
      disposePlayer();
    };
  }, []);

  return { playing, toggle, stop };
}
