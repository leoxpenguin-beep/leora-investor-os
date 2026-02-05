# GitHub repo setup (one-time)

The repo **leora-investor-os** could not be created automatically: the PAT in `.cursor/mcp.json` returned **403** (resource not accessible). Create the repo once, then push.

## 1. Create the repo on GitHub

**Option A – GitHub website (no token change)**  
1. Go to https://github.com/new  
2. Repository name: **leora-investor-os**  
3. Description: `Leora Investor OS — Cursor IDE style investor app (Orbit + Cockpit), Supabase snapshot-based, read-only.`  
4. Private  
5. Add a README, add .gitignore → **Node**, no license  
6. Create repository  

**Option B – Fix token and use API/CLI**  
- **Fine-grained PAT:** In GitHub → Settings → Developer settings → Personal access tokens → your token → enable **Repository creation** (and grant access to the account/org).  
- **Classic PAT:** Use a token with **repo** scope.  
Then run the create script (see below) or use GitHub CLI: `gh repo create leora-investor-os --private --source=. --remote=origin --push`.

## 2. Push branches

From the repo root (this folder):

```bash
git push -u origin main
git push -u origin develop
git push origin feat/module0-app-skeleton feat/module0-backend-supabase docs/locked-copy-and-guardrails
```

## 3. Open PR

Create a PR **develop → main** titled: **Repo scaffold + rules**

URL (after repo exists):  
`https://github.com/leoxpenguin-beep/leora-investor-os/compare/main...develop`
