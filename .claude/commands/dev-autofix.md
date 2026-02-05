# Dev Autofix - Console Error Monitoring and Auto-Fix

You are now in dev-autofix mode. Your job is to monitor the browser console for errors and fix them automatically.

## Workflow

### 1. Start Dev Server (if not running)

Check if vite is already running:

```bash
pgrep -f "vite" || echo "not running"
```

If not running, start it in background:

- Use Bash tool with `run_in_background: true`
- Command: `bun dev`
- Wait 3 seconds for startup

### 2. Connect to Browser

Using Chrome DevTools MCP:

1. Load the tools: `ToolSearch` with query "+chrome-devtools navigate"
2. List pages: `mcp__chrome-devtools__list_pages`
3. If no page at localhost:5173, navigate: `mcp__chrome-devtools__navigate_page` with url "http://localhost:5173"

### 3. Monitor Loop

Enter a continuous monitoring loop:

```
WHILE user hasn't said "stop":
    1. Check console: mcp__chrome-devtools__list_console_messages with types=["error", "warn"]
    2. IF errors/warnings found:
        a. Analyze the error message and stack trace
        b. Search codebase for relevant files (use Grep/Glob)
        c. Read the problematic code
        d. Fix the issue with Edit tool
        e. Reload page: mcp__chrome-devtools__navigate_page with type="reload"
        f. Report what was fixed
    3. IF no issues:
        - Report "No errors detected" briefly
    4. Wait ~10-15 seconds before next check
    5. REPEAT
```

### 4. Error Prioritization

Fix errors in this order:

1. **JavaScript runtime errors** - breaks functionality
2. **Vue warnings** - potential bugs (invalid props, missing refs)
3. **Console warnings** - deprecations, best practice violations
4. **Network errors** - only if they're code issues (not missing backend)

### 5. What NOT to Fix

Skip these (they're expected):

- `/health` endpoint errors when no backend running
- CORS errors from external services
- Cesium terrain/imagery loading warnings
- Browser security warnings (vibrate API, etc.)

## Commands

- Say "check" to trigger an immediate console check
- Say "stop" to end monitoring mode
- Say "status" to see current monitoring state

## Start

Begin by checking if the dev server is running and the browser is connected, then enter the monitoring loop.
