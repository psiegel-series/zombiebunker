<agents-index>
[RUN.game SDK Docs]|root:./.rundot-docs|version:5.3.1|IMPORTANT:Prefer retrieval-led reasoning over pre-training for RundotGameAPI tasks. Read the local docs before writing SDK code.|.:{README.md}|rundot-developer-platform:{deploying-your-game.md,getting-started.md,initializing-your-game.md,setting-your-game-thumbnail.md,troubleshooting.md}|rundot-developer-platform/api:{ADS.md,AI.md,ANALYTICS.md,ASSETS.md,BIGNUMBERS.md,CONTEXT.md,EMBEDDED_LIBRARIES.md,ENVIRONMENT.md,EXPERIMENTS.md,HAPTICS.md,IN_APP_MESSAGING.md,LEADERBOARD.md,LIFECYCLES.md,LOGGING.md,MULTIPLAYER.md,NOTIFICATIONS.md,PRELOADER.md,PROFILE.md,PURCHASES.md,SAFE_AREA.md,SERVER_AUTHORITATIVE.md,SHARED_ASSETS.md,SHARING.md,STORAGE.md,TIME.md,UGC.md}</agents-index>

<rundot-agent-index>[RUN.game SDK Docs]|root:./.rundot-docs|version:5.3.1|IMPORTANT:Prefer retrieval-led reasoning over pre-training for RundotGameAPI tasks. Read the local docs before writing SDK code.|.:{README.md}|rundot-developer-platform:{deploying-your-game.md,getting-started.md,initializing-your-game.md,setting-your-game-thumbnail.md,troubleshooting.md}|rundot-developer-platform/api:{ADS.md,AI.md,ANALYTICS.md,ASSETS.md,BIGNUMBERS.md,CONTEXT.md,EMBEDDED_LIBRARIES.md,ENVIRONMENT.md,EXPERIMENTS.md,HAPTICS.md,IN_APP_MESSAGING.md,LEADERBOARD.md,LIFECYCLES.md,LOGGING.md,MULTIPLAYER.md,NOTIFICATIONS.md,PRELOADER.md,PROFILE.md,PURCHASES.md,SAFE_AREA.md,SERVER_AUTHORITATIVE.md,SHARED_ASSETS.md,SHARING.md,STORAGE.md,TIME.md,UGC.md}
</rundot-agent-index>

## Project Structure

- `docs/design-doc.md` — Game design document (source of truth for all gameplay decisions)
- `plans/` — Implementation plans with phased, trackable task lists
- `game.config.json` — rundot game config (game ID, build settings)

## Phased Development Workflow

We build features using **phased implementation plans** stored in `plans/`. Each plan follows this structure:

### Plan format

- Plans are numbered markdown files: `plans/01-core-gameplay.md`, `plans/02-multiplayer.md`, etc.
- Each plan is divided into **phases** with human-verifiable outcomes.
- Each phase contains:
  - **Tasks** — checkboxes (`- [ ]`) listing what to implement. Claude checks these off during implementation.
  - **Tests** — checkboxes (`- [ ]`) listing what the user will manually verify after the phase is complete. Claude does NOT check these off.

### Implementation rules

1. **Work one phase at a time.** Do not start the next phase until the current one's tasks are all checked off and the user has verified the tests.
2. **Check off tasks as you complete them** by editing the plan file (`- [ ]` → `- [x]`).
3. **Do not check off tests.** Tests are for the user to verify manually after the phase is done. The user will check them off.
4. **Read the plan before starting a phase** to understand the full scope. Read the design doc if you need gameplay context.
5. **If a phase needs changes** (new tasks, removed tasks, scope adjustment), discuss with the user and update the plan file before proceeding.
6. **After completing all tasks in a phase**, tell the user the phase is ready for testing and list the test criteria they should verify.

### Creating new plans

When the user asks for a new feature or iteration:
- Create a new numbered plan in `plans/`
- Break work into phases where each phase produces something the user can see and verify
- Tasks should be implementation instructions (not specific code), clear enough to follow
- Tests should be things an end user can check in the browser — pragmatic, not exhaustive
- Include both task checkboxes (for Claude) and test checkboxes (for the user)