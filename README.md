# PSPU Ball Game

Simple educational Android game written in Kotlin.

The player moves a platform at the bottom of the screen, reflects balls, breaks blocks, and catches falling bonuses. The goal is to break all blocks before they reach the platform.

## Gameplay

- Move the platform left and right with touch.
- Balls bounce from walls, blocks, and the platform.
- Blocks slowly move down.
- A new row of blocks appears every 8 seconds.
- The player loses if all balls fall down or if blocks reach the platform.
- Bonuses can add extra balls, but the game limits the total number of balls to keep the gameplay balanced.

## APK

The debug APK is stored here:

```text
release/pspu-ball-game-debug.apk
```

## Build

```powershell
.\gradlew.bat assembleDebug
```

The generated APK will also appear in:

```text
app/build/outputs/apk/debug/app-debug.apk
```

## Web Demo

Live demo:

```text
https://pspuballgame.vercel.app/
```

The browser version is a standalone HTML Canvas game stored in:

```text
docs/index.html
```

For GitHub Pages, publish the site from the `main` branch and the `/docs` folder, or use the included GitHub Actions workflow.

Expected Pages URL:

```text
https://olejathehuman.github.io/pspu-game-ball-kotlin/
```

If the page is not live yet, open repository settings on GitHub, go to `Pages`, and select either:

- `Deploy from a branch`: branch `main`, folder `/docs`
- `GitHub Actions`: use the included workflow
