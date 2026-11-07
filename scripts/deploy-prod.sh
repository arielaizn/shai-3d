#!/usr/bin/env bash
# First production publish, end to end. Run from the project root, once.
#   bash scripts/deploy-prod.sh https://shai-3d.vercel.app 12345678
set -euo pipefail
SITE_URL="${1:?site url, e.g. https://shai-3d.vercel.app}"
ADMIN_PASSWORD="${2:?first admin password, 8+ chars}"
PROD_URL="https://brainy-husky-407.eu-west-1.convex.cloud"

echo "1/5 auth keys + SITE_URL on the production deployment"
npx @convex-dev/auth --prod --skip-git-check --web-server-url "$SITE_URL" < /dev/null
npx convex env set --prod BOOTSTRAP_ADMIN_EMAIL shai@shai-3d.local

echo "2/5 functions and schema"
npx convex deploy -y

echo "3/5 seed: settings, materials, colours, print types, pricing"
npx convex run seed:run --prod

echo "4/5 the admin account"
node scripts/bootstrap-admin.mjs "$PROD_URL" "$ADMIN_PASSWORD"

echo "5/5 deploy to Vercel (environment variables are already set on the project)"
vercel --prod
