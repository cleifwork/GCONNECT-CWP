$folder = "C:\GConnect\voucher-status-service"
New-Item -ItemType Directory -Force -Path $folder | Out-Null

$cert = New-SelfSignedCertificate `
    -Type Custom `
    -Subject "CN=GConnect OC200" `
    -FriendlyName "GConnect OC200 HTTPS" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256 `
    -KeyExportPolicy Exportable `
    -NotAfter (Get-Date).AddYears(2) `
    -TextExtension @(
        "2.5.29.17={text}IPAddress=192.168.0.2",
        "2.5.29.19={critical}{text}ca=false",
        "2.5.29.37={text}1.3.6.1.5.5.7.3.1"
    ) `
    -KeyUsage DigitalSignature,KeyEncipherment

$pfxPassword = Read-Host "Choose a password for the PFX file" -AsSecureString

Export-PfxCertificate `
    -Cert $cert `
    -FilePath "$folder\oc200.pfx" `
    -Password $pfxPassword | Out-Null

$pem = "-----BEGIN CERTIFICATE-----`r`n" +
    [Convert]::ToBase64String(
        $cert.RawData,
        [Base64FormattingOptions]::InsertLineBreaks
    ) +
    "`r`n-----END CERTIFICATE-----`r`n"

[IO.File]::WriteAllText(
    "$folder\oc200-cert.pem",
    $pem,
    [Text.Encoding]::ASCII
)

Write-Host "Created oc200.pfx and oc200-cert.pem in $folder"