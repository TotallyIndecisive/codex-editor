# Codex Editor

A local browser workspace for reviewing and revising generated motion graphics. The current prototype contains two OpenPlatform IDE compositions and a scene review player adapted from Motion OS (see MOTION-OS-LICENSE).

## Run locally

Install Node.js 18 or later. On macOS, Swift and the Apple developer command-line tools are needed for the included renderers. Open this folder in VS Code and press F5, or run `npm start`. Open http://127.0.0.1:4173. The server listens on localhost.

The example recordings are not included. Place `OpenPlatform-IDE-Brand-Snap.mp4`, `Openplatform-IDE-explainer.mp4`, `intro.mp3`, `final.mp3`, `test1.mp4`, and `test2.mp4` in a `media` folder, or set `CODEX_EDITOR_MEDIA_DIR` to their folder before starting. Generated revisions are stored within each composition folder. Imported media lives in `assets/`.

## Working with a coding agent

In the scene review, select a caption and edit its text, position, size or timing. Pin notes to the frame with N. Generate MP4 applies supported field edits and uses the installed, authenticated `codex` CLI to interpret notes as supported manifest edits. Review approved scenes are protected. A copyable brief is also available for a coding agent in VS Code.

This is an early prototype, not a general-purpose video editor. The project list, footage names and two Swift renderers are specific to the OpenPlatform example. The renderer requires macOS, and notes can change only fields represented in the scene manifest. Connecting arbitrary coding agents, importing arbitrary video projects, and rendering new animation types require further implementation. Keep the server local and use trusted input.
