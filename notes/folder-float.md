# Start Here: Folder Float

The four homepage path cards now use the user-supplied React Bits FolderFloat component. React is limited to this section; all other pages remain plain HTML. Card text and destination URLs are read from the original cards in index.html.

## Development

- Run npm install after checking out the project.
- Run npm run dev. Stop any older server first; the development URL is http://localhost:3000.
- Changes in src/start-folders rebuild automatically. Refresh the browser to see them.
- Run npm run build before publishing. The generated files in js/generated are intentionally tracked so the existing static/GitHub Pages site still works.
- Run npm run check:folders while the local server is running. The checks use installed Microsoft Edge in headless mode. Screenshots and results go into ignored notes/qa.

## Interaction

Hover with a mouse, or tap/activate the folder to open it. Choices float with Matter.js and can be dragged. Selecting a choice follows the same destination as that path's existing CTA. The CTA below each folder remains available at all times. Tab reaches the open choices; Escape closes and returns focus to the folder. Reduced-motion settings disable movement and physics.

## Reverting this experiment

The exact pre-change index.html, package.json and package-lock.json are saved under notes/backups/folder-float-before (ignored by Git). Existing user edits were already present and were preserved. Do not reset the repository or replace files wholesale if further edits have happened since this experiment.

To revert only the visual change, remove the two js/generated/start-folders references from the HTML head and the empty start-folders-root mount. Remove id="start-cards-fallback" from the original start-grid. The four original card links and markup remain in place. The React source/build tooling can stay for future components. To undo the tooling too, compare with the saved package files and remove only this experiment's dependencies/scripts, src/start-folders, scripts/build.mjs, scripts/check-folders.mjs, and js/generated/start-folders assets.

## Verification

Production bundle built successfully. Automated browser checks cover four folders, unchanged URLs, hover physics, drag without accidental navigation, keyboard focus, Escape, reduced motion, touch toggling, narrow viewport overflow, and browser errors. Desktop/open/mobile screenshots inspected.

## Compact layout revision

Reduced the section heading, folder height and desktop cloud spacing. Phones use two columns; details and 44px choice buttons appear below only the tapped folder. Touch physics are disabled to allow normal vertical scrolling. The larger first version is backed up under notes/backups/folder-float-large.


## Motion smoothing

The folder pills use fixed 120 Hz physics steps, interpolated screen positions, and a short transform transition while moving. Motion pauses its accumulator after a long or hidden frame so it does not catch up with a jump on return. Reopening resyncs to the measured layout before motion starts.
