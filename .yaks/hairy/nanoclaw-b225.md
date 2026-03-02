---
id: nanoclaw-b225
title: Add StoryGraph reading tracking integration
type: feature
priority: 3
created: '2026-03-01T19:41:51Z'
updated: '2026-03-01T19:41:51Z'
---

Integrate StoryGraph reading data to track books read, currently reading, and to-read lists.

## Challenge: No Official API

StoryGraph has **no official API** as of 2026. Feature requested since 2021, marked "Long-term" with no ETA.
- Lead dev (solo developer) acknowledged in 2021: "not a priority"
- 255+ votes, 57 comments, 4+ years waiting
- Users frustrated, some staying on Goodreads because of this

## Available Integration Options

### Option A: CSV Export (Manual)
**Status:** Works today, built-in feature
**Access:** Account → Manage Account → Manage Your Data → Export StoryGraph Library

**Process:**
1. User clicks "Generate Export"
2. Receives email when ready
3. Downloads CSV with library data

**Data Included:**
- Book titles, authors, ISBNs
- Publication years, page counts
- Reading status (read, currently-reading, to-read)
- Dates finished, star ratings
- Genre/mood tags

**Limitations:**
- Manual process (no automation)
- Doesn't include Reading Journal (pages read daily, duration)
- No real-time sync
- User must remember to export

**Use Case:** 
- Good for one-time import/backup
- Could schedule periodic imports (weekly?)
- Parse CSV in container, sync to local database

### Option B: Web Scraping (Unofficial)
**GitHub:** https://github.com/xdesro/storygraph-api
**Tech:** Netlify Functions, web scraping
**Status:** Active project, community-maintained

**What it scrapes:**
- Public profile: app.thestorygraph.com/profile/{USERNAME}
- Book metadata: titles, authors, pages, years
- Genre/mood tags
- Cover image URLs
- Reading lists: read, currently-reading, to-read

**Endpoints:**
- getList(status, limit)
- booksRead()
- currentlyReading()
- toRead()
- profile() - all lists combined

**Requirements:**
- Public StoryGraph profile (privacy setting)
- 30-second timeout limit (Netlify)
- No authentication needed

**Risks:**
- Breaks if StoryGraph changes HTML structure
- Rate limiting concerns
- Against ToS? (unclear)
- No access to private data (reviews, reading journal)

**Implementation:**
- Could deploy own scraper (Python + BeautifulSoup)
- Or call existing Netlify endpoints
- Schedule periodic fetches (daily?)

### Option C: Beeminder Integration (Indirect)
**URL:** https://www.beeminder.com/storygraph
**Status:** Production, actively maintained

**How it works:**
- Beeminder scrapes public StoryGraph profile
- Tracks total pages read (odometer goal)
- Updates multiple times daily
- Automated, no user action needed

**What Beeminder gets:**
- Total pages read (all-time)
- Daily incremental updates
- From public profile only

**Use for NanoClaw:**
- Could reverse-engineer Beeminder's scraping method
- They've solved the reliability/parsing problem
- But still just scraping public data

**Limitations:**
- Only page counts, not book details
- Requires public profile
- Still web scraping (fragile)

### Option D: Wait for Official API
**Timeline:** Unknown, "Long-term" since 2021
**Risk:** Could be years, or never

## Recommended Approach

**Phase 1: CSV Import (Now)**
1. User exports StoryGraph CSV manually
2. Upload to Seafile or paste contents
3. Parse CSV, extract:
   - Books read (with dates, ratings)
   - Currently reading list
   - To-read list
4. Store in local database/file
5. Query for stats, recommendations

**Benefits:**
- Works today, official method
- Complete data access
- No ToS concerns
- User controls when to sync

**Drawbacks:**
- Manual export required
- Not real-time

**Phase 2: Periodic Scraping (If needed)**
1. Deploy Python scraper (BeautifulSoup)
2. Use xdesro/storygraph-api as reference
3. Scrape public profile daily
4. Detect new books/status changes
5. Merge with CSV baseline

**Benefits:**
- More automated
- Near real-time updates

**Risks:**
- Fragile (HTML changes)
- Possible ToS violation
- Requires public profile

**Phase 3: Migrate to Official API (When available)**
1. Monitor StoryGraph roadmap
2. Switch to official API when released
3. Better auth, reliability, features

## CSV Format Details

Based on user reports, StoryGraph CSV includes:
- Title
- Author(s)
- ISBN/ISBN-13
- Publisher
- Publication Year
- Pages
- Star Rating (1-5)
- Date Read/Date Started
- Reading Status (read, currently-reading, to-read, dnf)
- Shelves/Tags
- Review text (if exists)

## Implementation Plan

**Step 1: CSV Parser**


**Step 2: Storage**
- Option A: SQLite database in /workspace/group/
- Option B: JSON file per import
- Option C: Seafile library

**Step 3: Query Interface**
- Books read this year/month
- Currently reading
- Stats: total books, pages, avg rating
- Recommendations based on tags/genres

**Step 4: (Optional) Web Scraper**


## Privacy Considerations

- CSV export: Full access, user-controlled, private
- Web scraping: Public data only, profile must be public
- Recommend CSV as primary, scraping as optional enhancement

## Alternative: Build for Official API Launch

If StoryGraph announces API release:
1. Wait for beta access
2. Implement proper OAuth integration
3. Real-time sync, webhooks, full data access
4. Much better long-term solution

But given 4+ year wait, don't block on this.

## User Experience

**Initial setup:**
1. "Export your StoryGraph library (Account → Manage Data → Export)"
2. "Upload the CSV to Seafile or paste here"
3. Parse, confirm book count
4. "You've read 247 books! Last finished: {title}"

**Queries:**
- "What am I currently reading?"
- "How many books did I read this year?"
- "What's my average rating?"
- "Recommend something based on my reading history"

**Updates:**
- Manual: "Upload new CSV when you want to sync"
- Auto (if scraping): "I check your public profile daily"

## References

- StoryGraph API Roadmap: https://roadmap.thestorygraph.com/features/posts/an-api
- CSV Export Feature: https://roadmap.thestorygraph.com/requests-ideas/posts/export-your-stats-into-csv-excel
- Unofficial Scraper: https://github.com/xdesro/storygraph-api
- Beeminder Integration: https://help.beeminder.com/article/300-the-storygraph
- StoryGraph on X (CSV export): https://x.com/thestorygraph/status/1527600015450963969

## Priority Justification: P3

While nice-to-have for reading tracking:
- No official API (major blocker)
- Workarounds exist but fragile
- CSV export works but manual
- Lower priority than Drive/Docs (more universal need)
- Could wait for official API rather than invest in scraping

Recommend: Start with CSV parser (low effort, works today), decide on scraping based on usage.
