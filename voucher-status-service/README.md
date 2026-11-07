# Windows 11 voucher balance service

1. Install Node.js **22 or newer**. Copy the service to `C:\GConnect\voucher-status-service`. The runtime files are `server.mjs`, `balance.mjs`, and `balance.html`. No npm dependencies are required.
2. Copy `.env.example` to `.env` and replace the placeholders with your local controller and Open API app settings. Example addresses:

   ```ini
   OC200_URL=https://192.168.0.2:443
   OMADA_ID=YOUR_CONTROLLER_ID
   SITE_ID=YOUR_SITE_ID
   CLIENT_ID=YOUR_APP_CLIENT_ID
   CLIENT_SECRET=YOUR_APP_CLIENT_SECRET
   PORT=3080
   ALLOWED_ORIGINS=http://192.168.0.2:8088
   ```

   See the [main setup guide](../SETUP-GUIDE.md#1-prepare-the-controller-and-windows-service) for both ways to find `SITE_ID`. `ALLOWED_ORIGINS` matches the captive portal's exact scheme, host, and port. Use a comma-separated list if you serve more than one portal origin. Keep `.env` private.
3. For a private controller certificate, put the public trust PEM in `C:\GConnect\certs\gconnect-trust-cert.pem`. Double-click `start-gconnect-serv.cmd` in the service folder, or start it in PowerShell:

   ```powershell
   Set-Location C:\GConnect\voucher-status-service
   $env:NODE_EXTRA_CA_CERTS = "C:\GConnect\certs\gconnect-trust-cert.pem"
   node --env-file=.env server.mjs
   ```

   With a publicly trusted controller certificate, use the direct Node command without setting a custom CA path. Expect `Voucher status service listening on port 3080`. Running Node directly avoids the `npm.ps1` execution-policy issue.
4. From another PowerShell window, test with a known voucher:

   ```powershell
   $code = Read-Host "Voucher code"
   Invoke-RestMethod -Method Post -Uri http://localhost:3080/voucher-status `
     -ContentType "application/json" -Body (@{code=$code} | ConvertTo-Json)
   ```

   A successful lookup returns `found`, `status`, and `remainingSeconds` when the controller provides it. Checking a voucher does not redeem it. For Windows Firewall, Omada pre-auth access, ACLs, and the phone test, follow the [main setup guide](../SETUP-GUIDE.md).

## Controller certificate

To generate a certificate with GConnect V5, enter the local controller address under **Settings → Voucher Source → Open API**. In **Controller certificate**, tap **Setup**, enter the controller's IPv4 address, and tap **Share setup package**. Transfer the ZIP to Windows and extract it. Run `launch-gcontroller-cert.cmd` as prompted and choose a PFX password. It creates `omada-controller-https.pfx` and `gconnect-trust-cert.pem` in `C:\GConnect\certs`. Use the PFX for the OC200 import and the public PEM for Windows trust. If using the app for site discovery, add that same public PEM under **Controller certificate** on the phone.

The certificate's Subject Alternative Name must match the IP or hostname in `OC200_URL`. If installing a private certificate on the OC200, import its password-protected PFX in **HTTPS Certificate**, save, and restart the controller as required. Use the corresponding public certificate PEM for a self-signed certificate or the issuing CA PEM for a privately issued certificate. The launcher reads that PEM from the sibling `certs` folder. After replacement, restart Node and repeat the local lookup to verify trust. Keep the PFX and private key out of the portal ZIP and Git.

## Keep the service running

Leave the console open or minimized and prevent sleep while plugged in. Screen-off and locking are fine. For startup after sign-in, put a shortcut to `start-gconnect-serv.cmd` in `shell:startup`. Verify startup after reboot on your PC.
