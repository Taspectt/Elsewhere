# elsewhere 3.1

**One textbox, one stacking toggle, and a changing atmosphere.** A static, non-generative-AI web application for GitHub Pages. No Python server, build system, or user-supplied API key.

## What changed from 3.0

### Music: exact first, then graceful fallback

- **Exact artist**: search the Apple/iTunes music catalog and check the returned `artistName`, then show an official track-specific Apple Music player.
- **Related artist**: if there are no verified matches, try a few related artists. For example, a Travis Scott request can offer a Don Toliver recording. The player shows the **actual** performing artist, and marks the match as a similar-artist fallback.
- **Related genre**: if the official catalog returns nothing suitable, search Audius and Openverse audio for genre terms rather than silencing everything. A last-resort atmosphere is procedural noise, not a falsely labeled commercial song.
- **No accidental replacement**: a verified Steve Lacy track always takes priority over a similar artist. Spotify never automatically takes over a selected Apple Music track.
- **Fresh tracks**: recent choices are avoided when alternatives are available.

The related-artist mappings are human-curated search **seeds**, not automated audio-similarity measurements. The app does not have access to Spotify's commercial catalog search without developer authorization. Commercial embeds require user interaction and may be limited to previews or signed-in users.

### Pictures: keep the user's subject

- **Pizza stays pizza**, **Frank Ocean stays Frank Ocean**. Music may influence the colors/effects but can't redefine the visual subject.
- Image search starts **immediately** for everyday subjects, independently of music search.
- A suitable licensed still image may display **before** the moving-background search finishes. The site can then replace it with a better-matching, playable video.
- Falls back from online video/GIF to photos, then to included local scenes if external media cannot load.
- Contains a small **original, hand-authored pizza SVG** as an offline fallback. This is deliberately a backup, not a replacement for photographic search results.

### Still included

- Fullscreen moving backgrounds from licensed sources, and video retry/stall handling.
- Visual effects, atmosphere colors, animated scene transitions, occasional relevant scene changes.
- Stacking mode that retains the original prompt.
- Minimal centered input, stacking switch, and required visible commercial-music embeds.
- Performance-aware particle effects.

## Publish on GitHub Pages

1. Unzip the download.
2. Upload `index.html`, `favicon.svg`, `README.md`, and the **entire** `assets` folder into the repository root.
3. GitHub repository → **Settings → Pages** → **Deploy from a branch** → **main**, `/(root)`.
4. Open the Pages URL. No Python backend is needed.

## Shortcuts

Enter: generate a scene. **N**: next song. **R**: next matching background. **M**: mute local audio. **P**: music player. **I**: attribution/source information. **F**: fullscreen.

## Important limitations

Public APIs can be rate-limited, block browser cross-origin requests, or become unavailable. Source licenses and attribution must be checked before redistribution, and third-party catalogs may provide imperfect metadata. Full songs on commercial services depend on their official player behavior and the visitor's account. Muted video backgrounds can autoplay in many browsers but are not guaranteed everywhere.

**Testing performed:** browser integration tests with simulated catalog/media API responses; the moving-background suite also exercised a real local WebM fixture. The live availability of external providers was **not** verified in this environment. Both test suites passed as of this build.
