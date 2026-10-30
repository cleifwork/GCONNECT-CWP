$ErrorActionPreference = "Stop"

$controller = "https://192.168.0.2"
$omadaId = "84b323420fb8d06cd880fefab23ffb90"
$clientId = "55377c3da2a54105bf6226a814e3bab8"

$secret = Read-Host "Client Secret" -AsSecureString
$credential = [System.Net.NetworkCredential]::new("", $secret)

$body = @{
    omadacId      = $omadaId
    client_id     = $clientId
    client_secret = $credential.Password
} | ConvertTo-Json -Compress

# Send JSON through stdin to avoid Windows command-line quoting problems.
$authText = $body | curl.exe --silent --show-error --insecure `
    --request POST `
    "$controller/openapi/authorize/token?grant_type=client_credentials" `
    --header "Content-Type: application/json" `
    --data-binary "@-"

if ($LASTEXITCODE -ne 0) {
    throw "Could not connect to the controller."
}

$auth = $authText | ConvertFrom-Json

if ($auth.errorCode -ne 0 -or !$auth.result.accessToken) {
    throw "Authentication failed: $($auth.errorCode) $($auth.msg)"
}

$sitesText = curl.exe --silent --show-error --insecure `
    "$controller/openapi/v1/$omadaId/sites?page=1&pageSize=100" `
    --header "Authorization: AccessToken=$($auth.result.accessToken)"

if ($LASTEXITCODE -ne 0) {
    throw "Could not retrieve sites."
}

$sites = $sitesText | ConvertFrom-Json

if ($sites.errorCode -ne 0) {
    throw "Site lookup failed: $($sites.errorCode) $($sites.msg)"
}

$sites.result.data | Select-Object name, siteId