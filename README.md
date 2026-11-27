# Save Fit

Save workouts from Instagram, TikTok and YouTube Shorts and turn them into structured, playable workouts.

Share a reel to Save Fit → the server downloads it, samples frames, reads the caption → Claude writes a structured workout (parts, exercises, sets, reps, timings, step-by-step instructions, form cues, mistakes, easier/harder versions, muscles, equipment) → it lands in your library with the coach's name and thumbnail. Press play and the player runs it: timed moves count down after a get-ready countdown and move on by themselves, rep moves show the count and wait for you to tap **Done**.

| | |
|---|---|
| `apps/mobile` | Expo (React Native) app for Android and iOS: HeroUI Native + Uniwind, Expo Router, Zustand + SQLite |
| `server` | Small Node server: yt-dlp + ffmpeg to fetch the post, Claude to structure it. Keeps the API key off the phone |
| `docs/DESIGN.md` | Design system and motion rules |

## Features

- **Share sheet import** (Android and iOS): share a post to Save Fit and it starts converting right away. You can also paste a link, or paste/write the workout text.
- **Library** of pastel workout cards: title, coach, thumbnail, big minutes number, filter by type.
- **Workout detail**: duration, exercise count, equipment, target muscles, parts (warm-up / circuit / cool-down) with rounds, and every exercise expandable to numbered steps, cues, common mistakes, breathing, tempo, load, easier/harder variations. "Worth a quick check" lists anything the AI had to guess.
- **Player**: always dark, big buttons (104 pt main button, 72 pt prev/next), countdown ring, rep counter, rest screens with +15 s / skip, beeps for the last 3 seconds, haptics, keeps the screen awake, loops the coach's video clip for the current move, celebration at the end.
- **Edit everything**: title, coach, type, level, parts (rounds, rest between rounds, order) and exercises (timed/reps, duration, reps, sets, rest, each side, load, steps, cues, notes), add/remove/reorder.
- **Merge workouts**: pick workouts in order (e.g. warm-up from coach A, main set from coach B, stretch from coach C) and save them as one. Each part keeps its own coach credit and video.
- Light and dark themes, three sample workouts on first launch.

## Run it

### 1. Server (on your computer)

Needs Node 22+, `ffmpeg` and `yt-dlp` (`brew install ffmpeg yt-dlp`, or `pip install yt-dlp`).

```bash
cd server
npm install
cp .env.example .env      # add your ANTHROPIC_API_KEY
npm run dev               # http://0.0.0.0:8787
```

Or with Docker: `docker build -t save-fit-server server && docker run -p 8787:8787 --env-file server/.env -v savefit:/data save-fit-server`.

Instagram sometimes needs a logged-in session to download: export cookies to a file and set `YTDLP_COOKIES`. When the download fails anyway, the server falls back to the post's caption and thumbnail.

### 2. App on Android with Expo Go (fastest)

```bash
cd apps/mobile
npm install
cp .env.example .env      # set EXPO_PUBLIC_API_URL=http://<your computer's LAN IP>:8787
npx expo start
```

Scan the QR code with Expo Go. Everything works in Expo Go **except the share sheet**, which needs native code; paste links in the app instead. You can also set the server address in **Settings → Server**.

### 3. Share sheet: development build (EAS)

```bash
npm install -g eas-cli
cd apps/mobile
eas login
eas build --profile development --platform android   # installable APK, no Play account needed
npx expo start --dev-client
```

Then share any reel/TikTok → **Save Fit**. iOS builds need an Apple Developer account (the share extension needs an App Group); the config is already in `app.config.ts`.

## Checks

```bash
cd apps/mobile && npm run typecheck && npm test && npm run verify   # verify = Android bundle
cd server && npm run typecheck && npm test
```

## How the AI conversion works

1. `yt-dlp` downloads the video (≤720p), thumbnail, caption, creator and any subtitles.
2. `ffmpeg` samples up to 24 frames (512 px) with timestamps.
3. Claude (`claude-opus-5-5` by default; set `CLAUDE_MODEL`, e.g. `claude-sonnet-5-5` for lower cost) gets the caption, subtitles and frames, and returns JSON that matches a strict schema (`server/src/schema.ts`), including the video segment for each exercise.
4. The app normalises and clamps the result (`apps/mobile/src/lib/normalize.ts`), so a bad answer can't break the player.

Server-side refusal fallbacks are enabled (`fallbacks: "default"`).

## Roadmap

- On-device model for the conversion (Apple Foundation Models / Gemini Nano) with the server as fallback.
- Speech-to-text of the coach's voice-over (today only subtitles and on-screen text are used).
- Exercise library and muscle data from an open dataset to enrich and normalise names.
- Cloud sync and accounts; Live Activities / lock-screen timer.
