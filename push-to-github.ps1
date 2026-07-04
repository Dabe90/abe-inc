# One-time setup: log into GitHub and push this repo for Vercel auto-deploy.
Set-Location $PSScriptRoot

$Gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $Gh)) {
  Write-Host "Installing GitHub CLI..."
  winget install --id GitHub.cli -e --accept-package-agreements --accept-source-agreements
}

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
  [System.Environment]::GetEnvironmentVariable("Path", "User")

Write-Host "Checking GitHub login..."
$ErrorActionPreference = "SilentlyContinue"
& $Gh auth status *> $null
$loggedIn = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = "Stop"

if (-not $loggedIn) {
  Write-Host ""
  Write-Host "Not logged in yet. A browser window will open."
  Write-Host "Choose: GitHub.com, HTTPS, Login with a web browser"
  Write-Host ""
  & $Gh auth login -h github.com -p https -w
  if ($LASTEXITCODE -ne 0) {
    Write-Host "GitHub login failed. Run this script again after logging in."
    exit 1
  }
}

$repo = "abe-inc"
Write-Host ""
Write-Host "Creating github.com/Dabe90/$repo and pushing main..."

$ErrorActionPreference = "SilentlyContinue"
& $Gh repo create $repo --public --source=. --remote=origin --push
$created = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = "Stop"

if (-not $created) {
  $hasRemote = git remote get-url origin 2>$null
  if (-not $hasRemote) {
    git remote add origin "https://github.com/Dabe90/$repo.git"
  }
  git push -u origin main
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed. Make sure you completed GitHub login above."
    exit 1
  }
}

Write-Host ""
Write-Host "Done: https://github.com/Dabe90/$repo"
Write-Host "Next in Vercel: Project abe-inc, Settings, Git, Connect, abe-inc"
