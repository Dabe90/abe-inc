# Add Zoho Mail DNS records for abestack.com on Vercel.
# Run AFTER you add abestack.com in Zoho Mail and copy your verification TXT value.
#
# Usage:
#   .\scripts\setup-zoho-dns.ps1 -VerificationTxt "zoho-verification=zb....zmverify.zoho.com"
#
# Optional (after Zoho Admin -> Email Authentication -> DKIM -> Add selector):
#   .\scripts\setup-zoho-dns.ps1 -VerificationTxt "..." -DkimHost "zmail._domainkey" -DkimValue "v=DKIM1; k=rsa; p=..."

param(
  [Parameter(Mandatory = $true)]
  [string]$VerificationTxt,

  [string]$Domain = "abestack.com",

  [string]$DkimHost = "",
  [string]$DkimValue = ""
)

Set-Location (Join-Path $PSScriptRoot "..")
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
  [System.Environment]::GetEnvironmentVariable("Path", "User")

function Add-DnsRecord {
  param([string[]]$DnsArgs)
  Write-Host "> vercel dns add $($DnsArgs -join ' ')"
  & npx vercel dns add @DnsArgs
  if ($LASTEXITCODE -ne 0) { throw "DNS add failed" }
}

Write-Host "Adding Zoho verification TXT for $Domain..."
Add-DnsRecord @($Domain, "@", "TXT", $VerificationTxt)

Write-Host "Adding Zoho MX records..."
Add-DnsRecord @($Domain, "@", "MX", "mx.zoho.com", "10")
Add-DnsRecord @($Domain, "@", "MX", "mx2.zoho.com", "20")
Add-DnsRecord @($Domain, "@", "MX", "mx3.zoho.com", "50")

Write-Host "Adding SPF record..."
Add-DnsRecord @($Domain, "@", "TXT", "v=spf1 include:zoho.com ~all")

if ($DkimHost -and $DkimValue) {
  Write-Host "Adding DKIM record..."
  Add-DnsRecord @($Domain, $DkimHost, "TXT", $DkimValue)
} else {
  Write-Host ""
  Write-Host "DKIM skipped. After mailboxes work, in Zoho Admin:"
  Write-Host "  Domains -> abestack.com -> Email Authentication -> DKIM -> Add"
  Write-Host "Then re-run with -DkimHost and -DkimValue from Zoho."
}

Write-Host ""
Write-Host "Done. In Zoho Admin, click Verify on abestack.com."
Write-Host "DNS can take 15-60 minutes (sometimes up to 24h)."
Write-Host "Test inbox: send mail to hello@abestack.com from Gmail."
