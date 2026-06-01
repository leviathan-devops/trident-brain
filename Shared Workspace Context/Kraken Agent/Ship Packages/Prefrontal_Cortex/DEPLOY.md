# DEPLOY — Kraken Prefrontal Cortex v1.3.1

## Prerequisites

- OpenCode 1.14.x running Node.js
- Docker container image `opencode-test:1.14.34` (or compatible)
- MiMo API key: `tp-ssy5nlzfc5vccack4ccierszbs0fojjp0lp3uj37hlp328ci`
- (Optional) OpenFang installed for FeedbackBrain Hand
- (Optional) Anthropic API key for FeedbackBrain deep analysis

## Step 1: Deploy Bundle

```bash
PLUGIN_DIR="/path/to/opencode/plugins/kraken-agent"
mkdir -p "$PLUGIN_DIR/dist"
cp kraken-prefrontal-cortex/dist/index.js "$PLUGIN_DIR/dist/"
```

## Step 2: Configure opencode.json

```json
{
  "model": "xiaomi-token-plan-sgp/mimo-v2.5-pro",
  "provider": {
    "xiaomi-token-plan-sgp": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://token-plan-sgp.xiaomimimo.com/v1",
        "apiKey": "tp-ssy5nlzfc5vccack4ccierszbs0fojjp0lp3uj37hlp328ci"
      }
    }
  },
  "plugin": ["file:///root/.config/opencode/plugins/kraken-agent/dist/index.js"],
  "agent": {
    "kraken": {
      "name": "kraken",
      "mode": "primary",
      "tools": {}
    }
  },
  "permission": {"*": {"*": "allow"}}
}
```

CRITICAL: `model` at TOP LEVEL. `tools` as OBJECT `{}`. NOT array.

## Step 3: Container Deploy (T2 Protocol)

```bash
PROJECT="pfc-$(date +%m%d%H%M%S)"
SNAP="/tmp/snap-${PROJECT}"
mkdir -p "$SNAP/plugins/kraken-agent/dist"

cp kraken-prefrontal-cortex/dist/index.js "$SNAP/plugins/kraken-agent/dist/"
# Write opencode.json from Step 2 to $SNAP/opencode.json

CONTAINER="test-${PROJECT}"
docker run -d --rm --name "$CONTAINER" \
  --entrypoint "" \
  -v "$SNAP:/root/.config/opencode" \
  opencode-test:1.14.34 \
  /bin/sh -c '/usr/local/lib/node_modules/opencode-ai/node_modules/opencode-linux-x64-baseline/bin/opencode --agent kraken 2>&1; sleep 3600'

sleep 28

tmux new-session -d -s "$CONTAINER" \
  "docker exec -it $CONTAINER /usr/local/lib/node_modules/opencode-ai/node_modules/opencode-linux-x64-baseline/bin/opencode --agent kraken 2>&1; sleep 60"
sleep 8
tmux send-keys -t "$CONTAINER" Escape
sleep 2
```

## Step 4: Deploy OpenFang Hand (Optional)

```bash
cp -r kraken-prefrontal-cortex/hands/kraken-prefrontal-cortex ~/.openfang/hands/
openfang start &
sleep 6
openfang hand install ~/.openfang/hands/kraken-prefrontal-cortex
openfang hand activate kraken-prefrontal-cortex
```

## Verification

After deploy, send a test message and check for PFC hook output:

```bash
tmux send-keys -t "$CONTAINER" "echo hello" Enter
sleep 10
tmux capture-pane -t "$CONTAINER" -p -S -200 | strings | grep -E "\[PFC|\[SyncBridge\]|\[Execution"
```

Expected output:
```
[ExecutionTracer] Initialized for session=...
[PFC Tracer] Created and started trajectory
[SyncBridge] Sent afferent heartbeat (sync-...)
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "exec format error" | Use baseline binary, not musl |
| "ProviderModelNotFoundError" | `model` must be at TOP LEVEL of opencode.json |
| Plugin not loading | Check `plugin` path uses `file:///` URI |
| No hook output in docker logs | Use `tmux capture-pane`, not `docker logs` |
| Container dies immediately | Wait 28s for DB migration |
| Hand not found after restart | Run `openfang hand install` + `activate` each session |
