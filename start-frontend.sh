#!/bin/bash
cd "$(dirname "$0")/frontend"
npx vite --host 0.0.0.0 --port 5173
