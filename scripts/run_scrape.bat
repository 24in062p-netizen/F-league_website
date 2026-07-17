@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d c:\claude\fleague
npx tsx scripts/scrape.ts >> logs\scrape.log 2>&1
