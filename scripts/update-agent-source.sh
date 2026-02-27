#!/bin/bash
# Sync container agent source to bind mount location
# Run this after modifying files in container/agent-runner/src/

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_SRC="$PROJECT_ROOT/container/agent-runner/src"
MOUNT_TARGET="$PROJECT_ROOT/data/sessions/main/agent-runner-src"

if [ ! -d "$AGENT_SRC" ]; then
  echo "Error: Source directory not found: $AGENT_SRC"
  exit 1
fi

# Create target if it doesn't exist
mkdir -p "$MOUNT_TARGET"

# Copy files
echo "Copying agent source files..."
cp -r "$AGENT_SRC"/* "$MOUNT_TARGET/"

echo "✓ Agent source updated at $MOUNT_TARGET"
echo ""
echo "Restart nanoclaw to apply changes:"
echo "  macOS:  launchctl kickstart -k gui/\$(id -u)/com.nanoclaw"
echo "  Linux:  systemctl --user restart nanoclaw"
