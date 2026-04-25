#!/usr/bin/env bash
# Serve the dashboard locally for JSON fetch() to work (file:// won't allow fetch)
cd "$(dirname "$0")"
echo "Dashboard: http://localhost:8080/Social_Media_Analytics_Dashboard.html"
python3 -m http.server 8080
