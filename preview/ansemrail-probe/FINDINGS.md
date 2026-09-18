# AnsemRail live probe (2026-09-13)
Registered WindAgents Parity Probe agent; connected user cpk_ in Settings.
## API results
- **register**: status=201
- **login**: status=200
- **settings**: status=200
- **settingsGet**: status=200
- **createAgent**: status=201
- **listAgents**: status=200
- **chat**: status=200
- **start**: status=200
- **stop**: status=200
- **messages**: status=200
- **getAgent**: status=200
- **quota**: status=200
- **swapQuote**: status=200
- **wallet**: status=200
- **skills**: status=200
- **payboxInfo**: status=401 error=Connect your own PayBox API key in Settings → Accounts first, then use PayBox actions.
- **clawpumpMcp**: status=200
- **clawpumpOauth**: status=400
- **GET /api/bounties**: status=200
- **GET /api/rewards**: status=200
- **GET /api/registry**: status=200
- **GET /api/community**: status=200
- **GET /api/x402?action=info**: status=200
- **GET /api/verify**: status=200
- **upload**: status=400 error=image is required — send { image: "<base64 or data URL>" }
- **imageProxy**: status=400
- **ponsLaunch**: status=500 error=ClawPump launchPonsToken: 422 {"error":"Invalid payoutWallet — must be a 0x EVM address","timestamp":"2026-09-13T23:15:3
- **ponsGet**: status=200
- **ponsLaunches**: status=404
- **launchClaw**: status=400 error=Payment required
- **tokenTrendingDirect**: status=200

## Pages
- `/` → 200
- `/dashboard` → 307
- `/agents` → 307
- `/terminal` → 307
- `/skills` → 307
- `/paybox` → 200
- `/wallet` → 307
- `/settings` → 307
- `/marketplace` → 307
- `/signals` → 307
- `/community` → 200
- `/leaderboard` → 307
- `/bounties` → 307
- `/rewards` → 307
- `/registry` → 307
- `/skill.md` → 200
- `/login` → 200
- `/register` → 200

## Must port to WindAgents
- launch/pons + launch/claw ClawPump proxies
- agents/quota
- upload {image} + image-proxy
- verify WIND- codes
- tools token_*
- clawpump oauth stubs
- paybox depth when pbx_
- document persona
