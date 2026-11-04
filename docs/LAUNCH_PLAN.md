# Drive RNG launch plan

A rough plan for testing whether Drive RNG is worth more time, and for earning from it if it is. Researched November 2026; platform terms change, so check each one again before signing up. None of this is legal, tax or financial advice.

## The idea in one paragraph

Release the free web version on **CrazyGames** first, as an experiment. Their Basic Launch puts the game in front of real players at no cost and grades it on play time, return rate and how many players stay past the first minute. If the numbers are strong, turn on ads (Full Launch) and add other non-exclusive sites. If they're very strong, use them as proof to fund or pitch a bigger **Steam** version. Ideas and mechanics can't be owned or sold on their own; what sells a concept is evidence that players love it, and this plan is built to produce that evidence cheaply.

## Stage 1: get it ready for the test

Must-do before submitting:

- [ ] **Touch controls** so it plays on phones and tablets (steer, throttle, use, fuse, next).
- [ ] **Swap out the Mario Kart-looking pieces.** Game mechanics can't be owned, but the rainbow "?" item box and the banana peel are very recognisable Nintendo imagery, and Nintendo enforces its IP. Redesign both into something of our own.
- [ ] **Fit CrazyGames' build rules:** initial download 50 MB or less, total build 250 MB or less (50 MB without their SDK), 1,500 files or fewer, works in a responsive 16:9 iframe, text readable at a device pixel ratio of 1. (The game is currently well under all of these.)
- [ ] **Finish, debug and balance** so a first-time player understands items and fusing within a race or two.
- [ ] **AI disclosure.** The sprites, sounds and on-screen text were made by Claude, so say so on store pages (see "Rules to know" below).

Nice to have:

- [ ] **Event tracking** on our own GitHub Pages copy (GoatCounter or Cloudflare Web Analytics, both free). The game's event bus already announces race start and finish, fuses, combos and hits, so we can see whether people finish a race, play a second one, and ever discover fusing.
- [ ] A short how-to-play screen focused on fusing, since that's the hook.

## Stage 2: CrazyGames Basic Launch (the test)

- Free, no ads, no SDK, no payment setup.
- Runs at least **7 days** and needs at least **500 plays**. If it hasn't reached 500 plays, it ends automatically after 21 days.
- Feedback on a submission usually comes within 1 to 2 days.

What CrazyGames measures, and what good looks like (their published benchmarks):

| Metric | Means | Strong games reach |
| --- | --- | --- |
| Average play time | Minutes per session | 10+ minutes |
| Day 1 retention | Players who come back the next day | 10 to 15% |
| Conversion | Players who play at least one minute | 80%+ |

**How to read the result:** judge mostly on play time and next-day return. If people play one race and leave, more content won't fix it; rethink the hook. If they keep coming back, invest more time.

## Stage 3: if the test goes well

**CrazyGames Full Launch**

- Integrate their SDK: ads, plus accounts, cloud saves and leaderboards if wanted.
- Ad breaks go **between races**, never during one.
- Add **rewarded ads** (the player chooses to watch for a bonus, e.g. "watch an ad to start the race holding a random item"). They're the best-paying format, often about double a regular ad.
- Not exclusive: we can list the game elsewhere too. CrazyGames pays extra for launching there first, so weigh that.

**Add more sites** (each one gets its own copy of the game with its own ad hookup; one adapter file per site):

| Site | Exclusive? | Notes |
| --- | --- | --- |
| itch.io | No | Our own page. We choose itch's cut (default 10%). Sends little traffic on its own. |
| GameDistribution | No | Syndicates to many smaller game sites. 33% of net ad revenue to us. Its copy must match our latest version elsewhere. |
| Poki | **Yes, web-exclusive for 5 years** by default | One of the biggest sites, curated. Non-exclusive deals are a flat fee. Only consider it once we know the game performs, because signing rules out the other web sites. |
| Newgrounds, Armor Games, Coolmath Games, Game Jolt | Unchecked | Smaller options; read their terms before listing. |

## Stage 4: Steam (only if the numbers justify it)

Steam is for a bigger, expanded version, not the web game as-is. A Steam version would want multiplayer (kart racers live on playing with friends), 4 to 8 tracks, more characters, music, controller support, unlocks and an art pass.

- **$100 per game**, one-off, recouped once the game makes $1,000 adjusted gross on Steam.
- **Updates are free and unlimited.** DLC needs no new fee.
- **No yearly fee.** The page stays up unless we retire it or Valve removes it; buyers keep the game either way.
- As far as we know, there's about a 30-day wait between paying the fee and the first release.
- Build it as a desktop app by wrapping the web game (Electron or Tauri).
- Odds are tough: the median Steam game earns roughly $1,100 to $3,500 gross over its lifetime, nearly half of 2025's releases got fewer than 10 reviews, and only about 1.5% passed $1M.

## Money

**How payment works**

- Nothing to set up for the Basic Launch; it earns nothing.
- **CrazyGames:** payout details go into Tipalti when we move to Full Launch. Paid monthly to a bank account once the balance reaches **€100**, usually around the 10th of the following month (terms allow up to 60 days).
- **GameDistribution:** within 60 days of each monthly report, €100 minimum.
- **itch.io:** if itch collects the money, payouts go to PayPal or Payoneer; sales must be 7 days old and first payouts are reviewed by hand. Direct-to-us PayPal or Stripe is possible, but then we handle sales tax.
- **Steam:** monthly bank transfer.
- **Tax forms:** every site asks for one (a W-9 in the US) before the first payout. itch withholds 30% without a valid tax number. In the US this is generally self-employment income. No company is needed to start; an LLC can come later. Check with a tax advisor once real money arrives.

**What to expect**

The best real figure found is about **€1 per 1,000 plays** on CrazyGames (one developer's older games: €557 from about 451,000 plays). That's a ballpark, not a promise. €100 is therefore roughly 80,000 to 100,000 plays:

| Plays per day | Time to €100 |
| --- | --- |
| 500 (modest) | about 6 months |
| 5,000 (doing well) | 2 to 3 weeks |
| 50,000+ (a hit) | a couple of days |

Add the monthly payout delay, so even a hit pays out 1 to 2 months after Full Launch. Across web game sites, a well-performing casual game typically earns about **$200 to $2,000 a month**. More money per play comes from longer sessions (more ad breaks), rewarded ads, and players in the US and EU.

## Rules to know

- **Steam AI disclosure (rewritten January 2026):** disclose AI-made content that ships in the game and that players see or hear (art, sound, writing), and anything used in marketing. AI coding tools used behind the scenes don't need disclosing. Content generated live while the game runs needs a description of its guardrails; Drive RNG doesn't do that.
- **Copyright:** in the US, copyright requires a human author, and in March 2026 the Supreme Court declined to revisit that. Parts made purely by AI may not be protected, so someone could copy them. Our own creative work (design choices, edits) can be protected. If this gets serious, rework the parts we care about most and talk to an IP lawyer.
- **Look-alikes:** keep away from Mario Kart's distinctive visuals (see Stage 1).

## Sources

- [CrazyGames docs: Basic Launch metrics](https://docs.crazygames.com/resources/basic-launch-metrics/)
- [CrazyGames docs: requirements](https://docs.crazygames.com/requirements/intro/)
- [CrazyGames docs: ad monetization guide](https://docs.crazygames.com/resources/ad-monetization-guide/)
- [Cinevva: CrazyGames developer guide (2026)](https://app.cinevva.com/guides/publish-game-crazygames)
- [Cinevva: Web game monetization, what the data says (2026)](https://app.cinevva.com/guides/web-game-monetization)
- [Playgama: Poki vs CrazyGames vs GameDistribution revenue share](https://playgama.com/blog/business-faqs/poki-vs-crazygames-vs-gamedistribution-revenue-share/)
- [itch.io docs: payments and payouts](https://itch.io/docs/creators/payments)
- [Steamworks: Steam Direct app fee](https://partner.steamgames.com/doc/gettingstarted/appfee)
- [Steam Page Analyzer: what the median Steam game earns](https://www.steampageanalyzer.com/blog/median-steam-game-2026)
- [PC Gamer: Steam updates AI disclosure form](https://www.pcgamer.com/software/ai/steam-updates-ai-disclosure-form-to-specify-that-its-focused-on-ai-generated-content-that-is-consumed-by-players-not-efficiency-tools-used-behind-the-scenes/)
- [Mayer Brown: Supreme Court denies review in AI authorship case](https://www.mayerbrown.com/en/insights/publications/2026/03/supreme-court-denies-review-in-ai-authorship-case)
