# Viet Youth Resource Guide — public site

Live: [https://youth.cpalss.com](https://youth.cpalss.com)  
Repo: [cPALSs/youth](https://github.com/cPALSs/youth)

Static GitHub Pages guide for Greater Sacramento Vietnamese **high school and college** youth — peer VSA Instagram map plus opportunities from cPALSs and NorCal UVSA.

## Edit / preview / publish

```bash
# From this folder (Operations/Sites/youth)
python3 -m http.server 8765
# → http://127.0.0.1:8765

git add -A && git commit -m "Update Viet Youth site" && git push
```

Push to `main` deploys via `.github/workflows/deploy-pages.yml`.

## Content

| File | What to edit |
|------|----------------|
| `data/site.json` | Hero, peer chapters, opportunities, coming stub, contact |

CTAs are `mailto:contact@cpalss.com` only — no forms. Do not put officer names, advisor emails, or private sheet links in JSON.

## DNS

On the **cpalss.com** zone:

| Type | Name | Value |
|------|------|--------|
| CNAME | `youth` | `cpalss.github.io` |

Then GitHub repo **Settings → Pages** → custom domain `youth.cpalss.com` → Enforce HTTPS.

## Rules

Visitor pages must not link monorepo paths or private vault docs. See cPALSs `.cursor/rules/github-pages-public-sites.mdc`.
