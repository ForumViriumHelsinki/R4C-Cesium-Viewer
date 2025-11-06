#!/bin/bash
# Server cleanup script for CI workflows

if [ ! -z "$SERVER_PID" ]; then
  # Check if process exists before killing
  if kill -0 $SERVER_PID 2>/dev/null; then
    echo "Terminating server process $SERVER_PID..."
    kill $SERVER_PID 2>/dev/null
    # Wait up to 5 seconds for graceful shutdown
    for i in {1..5}; do
      if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "Server process $SERVER_PID terminated gracefully"
        break
      fi
      sleep 1
    done
    # Force kill if still running
    if kill -0 $SERVER_PID 2>/dev/null; then
      echo "Force killing server process $SERVER_PID..."
      kill -9 $SERVER_PID 2>/dev/null || true
    fi
  else
    echo "Server process $SERVER_PID already terminated"
  fi
fi
