# Deploy Abe Stack Firebase Functions after Blaze billing is enabled.
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\scripts\deploy-firebase.ps1

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$project = 'gen-lang-client-0550945038'

Write-Host "Using Firebase project: $project"
firebase use $project

Write-Host ""
Write-Host "Step 1 — GEMINI_API_KEY secret"
Write-Host "If not set yet, you will be prompted to paste your key from https://aistudio.google.com/apikey"
Write-Host ""
firebase functions:secrets:access GEMINI_API_KEY 2>$null
if ($LASTEXITCODE -ne 0) {
  firebase functions:secrets:set GEMINI_API_KEY
}

Write-Host ""
Write-Host "Step 2 — Firestore rules + Functions deploy"
Set-Location functions
npm install
npm run deploy

Write-Host ""
Write-Host "Done. Copy the submitInquiry URL from the output above into js/config.js formEndpoint."
Write-Host "Example: formEndpoint: 'https://us-central1-gen-lang-client-0550945038.cloudfunctions.net/submitInquiry',"
