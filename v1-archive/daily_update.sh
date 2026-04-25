#!/bin/bash
# Daily data update for Finance With Phil dashboard
# Pushes latest data files to GitHub so the live site stays current.
#
# Usage: Add to crontab for daily updates
#   crontab -e
#   0 9 * * * ~/Documents/Claude/Projects/Manychat/Marketing\ CRM/daily_update.sh >> /tmp/fwp_cron.log 2>&1
#
# What this does:
# 1. Updates scrape_state.json with refresh timestamp
# 2. Appends follower snapshot to follower_history.json
# 3. Syncs index.html from the main dashboard file
# 4. Commits and pushes all data changes to GitHub
# 5. GitHub Pages auto-deploys within ~60 seconds

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR" || exit 1

echo "=== FWP Daily Update: $(date) ==="

# Step 1: Update scrape state timestamp
STATE_FILE="$DIR/data/scrape_state.json"
python3 -c "
import json
from datetime import datetime

with open('$STATE_FILE') as f:
    state = json.load(f)

state['lastAutoCheck'] = datetime.now().isoformat()

with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)

print(f'Scrape state updated at {datetime.now().isoformat()}')
"

# Step 2: Append follower history snapshot
HISTORY_FILE="$DIR/data/follower_history.json"
python3 -c "
import json
from datetime import datetime

with open('$STATE_FILE') as f:
    state = json.load(f)

try:
    with open('$HISTORY_FILE') as f:
        history = json.load(f)
except:
    history = []

today = datetime.now().strftime('%Y-%m-%d')
if not history or history[-1].get('date') != today:
    followers = state.get('followers', {})
    history.append({
        'date': today,
        'instagram': followers.get('instagram', 0),
        'tiktok': followers.get('tiktok', 0),
        'youtube': followers.get('youtube', 0),
        'threads': followers.get('threads', 0),
    })
    with open('$HISTORY_FILE', 'w') as f:
        json.dump(history, f, indent=2)
    print(f'Follower snapshot: {followers}')
else:
    print('Snapshot already exists for today')
"

# Step 3: Sync index.html from main dashboard file
cp "$DIR/Social_Media_Analytics_Dashboard.html" "$DIR/index.html"

# Step 4: Commit and push
cd "$DIR"
git add -A data/ index.html Social_Media_Analytics_Dashboard.html
CHANGES=$(git diff --cached --stat)
if [ -n "$CHANGES" ]; then
    git commit -m "Daily data update $(date +%Y-%m-%d)"
    git push origin main
    echo "Pushed updates to GitHub"
else
    echo "No changes to push"
fi

echo "=== Done ==="
