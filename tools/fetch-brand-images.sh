#!/usr/bin/env bash
# Probe where the old platform's brand images can still be fetched, and save what is found.
# Run by .github/workflows/brand-probe.yml (GitHub's runners can reach the internet; the build sandbox cannot).
set -u
OUT=${1:-found}; mkdir -p "$OUT"
ID=4e911b3d-b027-4c6a-8f76-c90e63535892
FILES=("logo.png" "HappyCitizen%201.png" "HappyCitizen%203.png" "HappyCitizen%204.png" "HappyCitizen%207.png" "HappyCitizen%20a.png")
echo "name,source,http,bytes,type"
for f in "${FILES[@]}"; do
  name=$(python3 -c "import urllib.parse,sys;print(urllib.parse.unquote(sys.argv[1]))" "$f")
  got=""
  for src in \
    "https://static.databutton.com/public/$ID/$f" \
    "https://web.archive.org/web/2026id_/https://static.databutton.com/public/$ID/$f" \
    "https://web.archive.org/web/2025id_/https://static.databutton.com/public/$ID/$f" \
    "https://web.archive.org/web/2id_/https://static.databutton.com/public/$ID/$f"; do
    tmp=$(mktemp)
    code=$(curl -sS -L -m 40 -o "$tmp" -w "%{http_code}" "$src" 2>/dev/null || echo 000)
    type=$(file -b --mime-type "$tmp" 2>/dev/null || echo ?)
    bytes=$(stat -c %s "$tmp" 2>/dev/null || echo 0)
    echo "$name,${src%%/public*},$code,$bytes,$type"
    if [ "$code" = "200" ] && [[ "$type" == image/* ]] && [ "$bytes" -gt 1000 ] && [ -z "$got" ]; then cp "$tmp" "$OUT/$name"; got=1; fi
    rm -f "$tmp"
  done
done
echo "--- saved:"; ls -la "$OUT"

echo "=== favicon candidates on the old host"
for f in favicon.ico favicon.png favicon.svg icon.png apple-touch-icon.png favicon-light.svg favicon-dark.svg; do
  tmp=$(mktemp); code=$(curl -sS -L -m 30 -o "$tmp" -w "%{http_code}" "https://static.databutton.com/public/$ID/$f" 2>/dev/null || echo 000)
  echo "$f,$code,$(stat -c %s "$tmp"),$(file -b --mime-type "$tmp")"; rm -f "$tmp"
done
echo "=== what the live demo website serves"
for site in https://citizen-website-demo.vercel.app; do
  echo "-- $site/ head:"; curl -sS -L -m 30 "$site/" | grep -io '<link[^>]*icon[^>]*>\|<title>[^<]*</title>' | head
  for p in icon.png brand/logo.png "brand/HappyCitizen%201.png" favicon.ico; do
    tmp=$(mktemp); code=$(curl -sS -m 30 -o "$tmp" -w "%{http_code}" "$site/$p" 2>/dev/null || echo 000)
    echo "$p,$code,$(stat -c %s "$tmp"),$(file -b --mime-type "$tmp")"; rm -f "$tmp"
  done
done
