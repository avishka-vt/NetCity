# NetCity — Educational Network Puzzle Game (MVP)

NetCity is an educational puzzle game designed for students in Grades 7 and 8 that teaches how computer networks function. The player builds network infrastructure for a growing city: connecting buildings to a central server, selecting appropriate cable types (copper vs. fiber), managing budgets, and observing packet deliveries.

The game is designed to embed inside a host project via a single Express router mount:
```javascript
app.use('/netcity', createNetCityRouter());
```

---

## Getting Started

### Prerequisites
- Node.js 20 or newer
- npm

### Installation & Running
```bash
npm install
npm start
```
By default, the server runs on port 3000:
- **Mock Host Demo (Pop-up Launcher)**: [http://localhost:3000/netcity/host-demo.html](http://localhost:3000/netcity/host-demo.html)
- **Full Window Game (Direct Dev Mode)**: [http://localhost:3000/netcity/index.html](http://localhost:3000/netcity/index.html)
- **Root redirect**: [http://localhost:3000/](http://localhost:3000/) redirects directly to the host demo.

### Running Acceptance Tests
```bash
npm test
```
Runs the built-in Node test runner (`node --test test/*.test.js`) covering all acceptance test specifications from Section 12.5.

---

## Project Structure

```
netcity/
├── server.js               # Express application mounting the router
├── netcity-router.js       # The one export the host needs: createNetCityRouter()
├── package.json            # Scripts, dependencies (Express 5), metadata
├── public/
│   ├── index.html          # Full-window standalone development page
│   ├── host-demo.html      # Mock host educational portal demonstrating pop-up
│   └── game/
│       ├── sim.js          # Pure deterministic network simulation core
│       ├── generate.js     # Mulberry32 PRNG, FNV-1a, BFS pathfinding & checks
│       ├── levels.js       # Level configurations (1.1 - 1.4), cable types, messages
│       ├── host.js         # Browser local-storage Host Adapter (netcity.progress.v1)
│       ├── ui.js           # Canvas 2D rendering, drag-to-connect, modals, cleanup
│       ├── index.js        # Entry points: mountGame, openGame, openLauncher
│       └── game.css        # Scoped CSS styles (all prefixed with nc-)
└── test/
    ├── acceptance.test.js  # All 7 acceptance tests from section 12.5 + Express test
    └── mock-dom.js         # Headless DOM mock for lifecycle & leak testing in Node
```

---

## Assumptions

Where the specification was silent or underspecified, the simplest choices were made and documented here:

1. **Seed Text Format & Generation**:
   - Seeds are generated as short 6-character alphanumeric strings (e.g. `k4x9q2`, `a7b3c9`).
   - When "Reset" or "Play again" is chosen, the existing seed is reused.
   - When "New layout" or "Next level" is chosen, a fresh seed is generated.
   - For generation hashing, `world:<seed>#<attempt>` is hashed using 32-bit FNV-1a. For packet timing, `net:<seed>` is hashed with FNV-1a.

2. **Distance and Obstacle Handling**:
   - Distance is strictly shortest grid path (Manhattan / cardinal moves: Up, Down, Left, Right) navigating around obstacles using BFS.
   - During level generation checks and Par computation, obstacles are defined as walls plus all other buildings on the grid.
   - Cables cannot pass through walls or buildings. However, cables may cross or share squares with other cables, and cannot enter squares the same cable already uses (no self-intersection).

3. **Message Scheduling & Stagger**:
   - Initial messages from buildings are staggered between 4 to 16 ticks using the deterministic `net:<seed>` PRNG. Subsequent messages are scheduled every 24 ticks + 0 to 12 extra ticks (1.2s to 1.8s at 20 ticks/sec).
   - A message is delivered on time if the elapsed ticks from transmission to server arrival does not exceed 40 ticks (2.0s). Because copper (max 10 squares at 1 sq/tick) and fiber (max 40 squares at 4 sq/tick) take at most 10 ticks, connected cables always deliver on time.
   - Buildings without a cable still attempt transmission; messages are immediately lost and the building displays a warning marker (`⚠️`).

4. **Dragging Backtrack / Undo**:
   - Dragging backwards onto the immediately preceding square in the path pops the last step (backtracking/undo).
   - Dragging cannot extend past the server square.
   - Releasing the mouse on the server finalizes and validates the cable. Releasing anywhere else cancels the drag and restores the hint: *"Drop the cable on the server to finish it."*

5. **Level Progression & Unlocking**:
   - Level 1.1 is unlocked by default.
   - Levels 1.2, 1.3, and 1.4 unlock when the preceding level has been finished with at least 1 star.
   - When "Play" is clicked in the launcher, the game opens the first unfinished unlocked level. If all 4 levels have been completed, it opens Level 1.4.

6. **Default Storage Fallback**:
   - In environments where browser `localStorage` is unavailable or blocked (e.g., restricted iframe or privacy sandbox), `BrowserHostAdapter` falls back gracefully to an in-memory storage dictionary so progress remains intact within the active session.

7. **Responsive Canvas Square Size**:
   - The square size is computed dynamically on load and window resize as `Math.max(16, Math.floor(Math.min((width - 16) / 24, (height - 16) / 14)))` to guarantee whole-number square coordinates and crisp canvas rendering without fractional blur.

---

## Acceptance Tests (Section 12.5)

All 7 test requirements from Section 12.5 are implemented in `test/acceptance.test.js`:

1. **Determinism**: The same level and seed produce an identical stored map when generated twice. (Verified across multiple seeds and all 4 levels).
2. **Generation Checks**: For each level (1.1, 1.2, 1.3, 1.4), 500 different seeds (2,000 maps total) all pass every generation check. (Reported 0 fallbacks required across all 2,000 seeds).
3. **Scripted Solution**: A scripted optimal solver (BFS shortest route with cheapest allowed cable) solves all 2,000 generated maps and achieves a perfect 3-star score on every single seed.
4. **Refusal Invariants**: Tested that copper > 10 squares (11+ sq), fiber > 40 squares (41+ sq), routes through walls, routes through other buildings, and routes exceeding available budget are refused with exact specified feedback messages and leave simulation state completely unchanged.
5. **Refunds**: Tapping/removing a cable refunds 100% of its cost and purges in-flight packets.
6. **Progress Persistence**: Verified persistence under key `netcity.progress.v1`, preservation across reloads, and retention of highest stars and lowest cost.
7. **Zero Leak Lifecycle**: Opening and closing the game full-window 20 consecutive times leaves 0 extra event listeners on `window` and `document`, and 0 active animation loops or timers.
8. **Express Integration**: Confirmed router mounts at `/netcity` and serves assets and mock host page with HTTP 200.
