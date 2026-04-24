#!/usr/bin/env node

console.error([
  'Blocked: the legacy Vite frontend source/styles are not the release frontend.',
  'Use the committed dist/ bundle served by the Go backend on port 3005.',
  'Do not rebuild or overwrite dist/ from src/ unless the frontend source is rebuilt from the current 3005 UI first.',
].join('\n'))

process.exit(1)
