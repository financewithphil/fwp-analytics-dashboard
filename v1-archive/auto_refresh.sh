#!/bin/bash
# Auto-refresh scrape data for Finance With Phil dashboard
# Usage: Add to crontab for scheduled updates
#   crontab -e
#   0 8 * * 1 ~/Documents/Claude/Projects/Manychat/Marketing\ CRM/auto_refresh.sh
#
# This triggers a re-scrape by updating scrape_state.json with a refresh flag.
# The dashboard checks this flag and shows a "stale data" indicator.

DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_FILE="$DIR/data/scrape_state.json"

# Update last check timestamp
python3 -c "
import json
from datetime import datetime

with open('$STATE_FILE') as f:
    state = json.load(f)

state['lastAutoCheck'] = datetime.now().isoformat()
state['needsRefresh'] = True

with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)

print(f'Auto-refresh check at {datetime.now().isoformat()}')
print(f'Data last scraped: {state.get(\"instagram\", {}).get(\"lastScrapedDate\", \"unknown\")}')
"

# Append follower counts to history file for long-term tracking
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
# Only one entry per day
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
    print(f'Follower snapshot saved: {followers}')
else:
    print('Snapshot already exists for today')
"

echo "Dashboard auto-refresh check complete"
