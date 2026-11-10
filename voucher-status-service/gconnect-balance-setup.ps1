# Windows PowerShell 5.1 and Node.js 22 or newer.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[Windows.Forms.Application]::EnableVisualStyles()
$form = New-Object Windows.Forms.Form
$form.Text = 'GConnect Balance Setup'
$form.Size = New-Object Drawing.Size(740, 760)
$form.MinimumSize = $form.Size
$form.StartPosition = 'CenterScreen'
$script:verified = ''
$script:sites = @()

function Field($label, $value, $y, $masked = $false) {
    $caption = New-Object Windows.Forms.Label
    $caption.Text = $label
    $caption.SetBounds(20, $y + 4, 190, 25)
    $box = New-Object Windows.Forms.TextBox
    $box.Text = $value
    $box.UseSystemPasswordChar = $masked
    $box.SetBounds(215, $y, 475, 26)
    $form.Controls.AddRange(@($caption, $box))
    return $box
}
function Button($text, $x, $y, $width) {
    $button = New-Object Windows.Forms.Button
    $button.Text = $text
    $button.SetBounds($x, $y, $width, 34)
    $form.Controls.Add($button)
    return $button
}
function Notice($text) {
    [void][Windows.Forms.MessageBox]::Show($form, $text, 'GConnect Balance Setup')
}
function Confirm-Replace($paths) {
    $existing = @($paths | Where-Object { Test-Path -LiteralPath $_ })
    if (!$existing.Count) { return $true }
    return [Windows.Forms.MessageBox]::Show($form,
        "Replace existing files? Keep a private backup first.`r`n" + ($existing -join "`r`n"),
        'Confirm replacement', 'YesNo', 'Warning') -eq 'Yes'
}
function Root {
    if (![IO.Path]::IsPathRooted($folder.Text.Trim())) { throw 'Enter an absolute installation folder.' }
    return [IO.Path]::GetFullPath($folder.Text.Trim())
}
function Controller {
    $uri = $null
    if (![Uri]::TryCreate($controller.Text.Trim(), [UriKind]::Absolute, [ref]$uri) -or
        $uri.Scheme -ne 'https' -or $uri.AbsolutePath -ne '/' -or $uri.UserInfo -or $uri.Query -or $uri.Fragment) {
        throw 'Enter an HTTPS controller address without a path, for example https://192.168.0.2:443.'
    }
    return $uri
}
function Signature {
    return (@($controller.Text, $omada.Text, $client.Text, $secret.Text, $pem.Text, (Root),
        (Get-FileHash -LiteralPath $pem.Text -Algorithm SHA256).Hash) | ConvertTo-Json -Compress)
}
function Env-Value([string]$value) {
    if ($value -match '[\r\n\x00]') { throw 'Configuration values must fit on one line.' }
    foreach ($quote in @("'", '`', '"')) {
        if (!$value.Contains($quote)) { return $quote + $value + $quote }
    }
    throw 'A value contains all three quote characters. Configure that value manually.'
}

$controller = Field 'Controller HTTPS URL' 'https://192.168.0.2:443' 25
$omada = Field 'Omada ID' '' 63
$client = Field 'Client ID' '' 101
$secret = Field 'Client Secret' '' 139 $true
$folder = Field 'Installation folder' 'C:\GConnect' 177
$pem = Field 'Public trust PEM' 'C:\GConnect\certs\gconnect-trust-cert.pem' 215
$browse = Button 'Choose PEM' 215 252 125
$create = Button 'Create certificate' 350 252 165
$password = Field 'New PFX password' '' 302 $true
$confirmPassword = Field 'Confirm PFX password' '' 340 $true
$show = New-Object Windows.Forms.CheckBox
$show.Text = 'Show passwords'
$show.SetBounds(525, 258, 170, 25)
$form.Controls.Add($show)
$show.Add_CheckedChanged({
    $secret.UseSystemPasswordChar = !$show.Checked
    $password.UseSystemPasswordChar = !$show.Checked
    $confirmPassword.UseSystemPasswordChar = !$show.Checked
})
$discover = Button 'Test connection and discover sites' 215 383 320
$siteLabel = New-Object Windows.Forms.Label
$siteLabel.Text = 'Select site'
$siteLabel.SetBounds(20, 437, 190, 25)
$siteList = New-Object Windows.Forms.ComboBox
$siteList.DropDownStyle = 'DropDownList'
$siteList.SetBounds(215, 431, 475, 28)
$form.Controls.AddRange(@($siteLabel, $siteList))
$origin = Field 'Portal origin' 'http://192.168.0.2:8088' 478
$port = Field 'Service port' '3080' 516
$save = Button 'Save configuration' 215 560 200
$status = New-Object Windows.Forms.Label
$status.Text = 'Choose a public PEM, or create a certificate and import its PFX into OC200 before discovery. Node.js 22+ must be installed.'
$status.SetBounds(20, 617, 675, 90)
$form.Controls.Add($status)

$browse.Add_Click({
    $dialog = New-Object Windows.Forms.OpenFileDialog
    $dialog.Filter = 'PEM certificate (*.pem)|*.pem|All files (*.*)|*.*'
    if ($dialog.ShowDialog() -eq 'OK') { $pem.Text = $dialog.FileName }
    $dialog.Dispose()
})
$create.Add_Click({
    try {
        $uri = Controller
        if (!$password.Text -or $password.Text -ne $confirmPassword.Text) { throw 'Enter matching PFX passwords.' }
        $certFolder = Join-Path (Root) 'certs'
        $pfxPath = Join-Path $certFolder 'omada-controller-https.pfx'
        $pemPath = Join-Path $certFolder 'gconnect-trust-cert.pem'
        if (!(Confirm-Replace @($pfxPath, $pemPath))) { return }
        [void][IO.Directory]::CreateDirectory($certFolder)
        $ip = $null
        $san = if ([Net.IPAddress]::TryParse($uri.DnsSafeHost, [ref]$ip)) {
            'IPAddress=' + $ip.ToString()
        } else { 'DNS=' + $uri.DnsSafeHost }
        $cert = New-SelfSignedCertificate -Type Custom -Subject 'CN=GConnect OC200' `
            -FriendlyName 'GConnect OC200 HTTPS' -CertStoreLocation 'Cert:\CurrentUser\My' `
            -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 -KeyExportPolicy Exportable `
            -NotAfter (Get-Date).AddYears(2) -KeyUsage DigitalSignature,KeyEncipherment `
            -TextExtension @("2.5.29.17={text}$san", '2.5.29.19={critical}{text}ca=false',
                '2.5.29.37={text}1.3.6.1.5.5.7.3.1')
        Export-PfxCertificate -Cert $cert -FilePath $pfxPath `
            -Password (ConvertTo-SecureString $password.Text -AsPlainText -Force) | Out-Null
        $text = "-----BEGIN CERTIFICATE-----`r`n" +
            [Convert]::ToBase64String($cert.RawData, [Base64FormattingOptions]::InsertLineBreaks) +
            "`r`n-----END CERTIFICATE-----`r`n"
        [IO.File]::WriteAllText($pemPath, $text, [Text.Encoding]::ASCII)
        $pem.Text = $pemPath
        $script:verified = ''
        $password.Clear()
        $confirmPassword.Clear()
        Notice "Created files in $certFolder. Import the PFX into OC200 under HTTPS Certificate using your chosen password. Save/apply and restart the controller as required. Once reachable, test the connection and discover sites."
    } catch { Notice $_.Exception.Message }
})
$discover.Add_Click({
    $process = $null
    try {
        $uri = Controller
        if (!$omada.Text.Trim() -or !$client.Text.Trim() -or !$secret.Text) { throw 'Enter the Omada ID, Client ID and Client Secret.' }
        $script:verified = ''
        $siteList.Items.Clear()
        $signature = Signature
        $info = New-Object Diagnostics.ProcessStartInfo
        $info.FileName = (Get-Command node.exe -ErrorAction Stop).Source
        $info.Arguments = '"' + (Join-Path $PSScriptRoot 'setup-controller.mjs') + '"'
        $info.UseShellExecute = $false
        $info.CreateNoWindow = $true
        $info.RedirectStandardInput = $true
        $info.RedirectStandardOutput = $true
        $info.RedirectStandardError = $true
        $info.StandardOutputEncoding = [Text.Encoding]::UTF8
        $info.EnvironmentVariables.Remove('NODE_TLS_REJECT_UNAUTHORIZED')
        $process = New-Object Diagnostics.Process
        $process.StartInfo = $info
        $form.UseWaitCursor = $true
        $discover.Enabled = $false
        [void]$process.Start()
        $outputTask = $process.StandardOutput.ReadToEndAsync()
        $errorTask = $process.StandardError.ReadToEndAsync()
        $process.StandardInput.Write((@{controller=$uri.GetLeftPart([UriPartial]::Authority);
            omadaId=$omada.Text.Trim(); clientId=$client.Text.Trim(); secret=$secret.Text; pem=$pem.Text} | ConvertTo-Json -Compress))
        $process.StandardInput.Close()
        if (!$process.WaitForExit(60000)) {
            $process.Kill()
            throw 'Discovery timed out. Check the controller and network access.'
        }
        $result = $outputTask.Result | ConvertFrom-Json
        if ($process.ExitCode -ne 0 -or $result.error) { throw ('Discovery failed. ' + $result.error) }
        $script:sites = @($result.sites)
        foreach ($site in $script:sites) {
            if (!$site.siteId) { throw 'A site is missing its ID.' }
            [void]$siteList.Items.Add($site.name + ' - ' + $site.siteId)
        }
        if (!$script:sites.Count) { throw 'No accessible sites found. Check app site privileges.' }
        $siteList.SelectedIndex = 0
        $script:verified = $signature
        $status.Text = 'HTTPS and API authentication verified. Select the intended site and save.'
    } catch { Notice $_.Exception.Message }
    finally {
        if ($process) { $process.Dispose() }
        $form.UseWaitCursor = $false
        $discover.Enabled = $true
    }
})
$save.Add_Click({
    try {
        if (!$script:verified -or $script:verified -ne (Signature) -or $siteList.SelectedIndex -lt 0) {
            throw 'Test connection and discover sites with the current settings first.'
        }
        $portal = $null
        if (![Uri]::TryCreate($origin.Text.Trim(), [UriKind]::Absolute, [ref]$portal) -or
            $portal.Scheme -notin @('http','https') -or $portal.UserInfo -or
            $portal.AbsolutePath -ne '/' -or $portal.Query -or $portal.Fragment) {
            throw 'Enter the portal origin with scheme and port, without a path.'
        }
        $number = 0
        if (![int]::TryParse($port.Text, [ref]$number) -or $number -lt 1 -or $number -gt 65535) {
            throw 'Service port must be between 1 and 65535.'
        }
        $serviceFolder = Join-Path (Root) 'voucher-status-service'
        $certFolder = Join-Path (Root) 'certs'
        $envPath = Join-Path $serviceFolder '.env'
        $destPem = Join-Path $certFolder 'gconnect-trust-cert.pem'
        $copyPem = [IO.Path]::GetFullPath($pem.Text) -ne $destPem
        $targets = @($envPath)
        if ($copyPem) { $targets += $destPem }
        if (!(Confirm-Replace $targets)) { return }
        $settings = [ordered]@{
            OC200_URL=(Controller).GetLeftPart([UriPartial]::Authority)
            OMADA_ID=$omada.Text.Trim(); SITE_ID=$script:sites[$siteList.SelectedIndex].siteId
            CLIENT_ID=$client.Text.Trim(); CLIENT_SECRET=$secret.Text
            PORT=$number.ToString(); ALLOWED_ORIGINS=$portal.GetLeftPart([UriPartial]::Authority)
        }
        $lines = foreach ($key in $settings.Keys) { $key + '=' + (Env-Value $settings[$key]) }
        [void][IO.Directory]::CreateDirectory($serviceFolder)
        [void][IO.Directory]::CreateDirectory($certFolder)
        if ($copyPem) { Copy-Item -LiteralPath $pem.Text -Destination $destPem -Force }
        [IO.File]::WriteAllText($envPath, ($lines -join "`r`n") + "`r`n", (New-Object Text.UTF8Encoding($false)))
        $status.Text = "Saved $envPath. Start the service, test a voucher, then follow SETUP-GUIDE.md for firewall, pre-auth access, gateway/EAP ACLs and portal endpoint configuration."
        Notice 'Configuration saved. Keep .env and certificate private material private. Place the service runtime files in the chosen service folder, then start or restart the service and test a voucher.'
    } catch { Notice $_.Exception.Message }
})
[void]$form.ShowDialog()
$form.Dispose()
