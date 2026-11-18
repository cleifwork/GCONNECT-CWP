# Windows 11 voucher balance service

1. Use the [portable Node.js runtime](#portable-nodejs) below; a separate Node.js installation is optional. Copy the service to `C:\GConnect\voucher-status-service`. The runtime files are `server.mjs`, `balance.mjs`, and `balance.html`. No npm dependencies are required.
2. Use the [desktop setup form](#desktop-setup-form), or copy `.env.example` to `.env` and replace the placeholders with your local controller and Open API app settings. Example addresses:

   ```ini
   OC200_URL=https://192.168.0.2:443
   OMADA_ID=YOUR_CONTROLLER_ID
   SITE_ID=YOUR_SITE_ID
   CLIENT_ID=YOUR_APP_CLIENT_ID
   CLIENT_SECRET=YOUR_APP_CLIENT_SECRET
   PORT=3080
   ALLOWED_ORIGINS=http://192.168.0.2:8088
   ```

   See the [main setup guide](../SETUP-GUIDE.md#1-prepare-the-controller-and-windows-service) for ways to find `SITE_ID`. `ALLOWED_ORIGINS` matches the captive portal's exact scheme, host, and port. Use a comma-separated list if you serve more than one portal origin. Keep `.env` private.
3. For a private controller certificate, put the public trust PEM in `C:\GConnect\certs\gconnect-trust-cert.pem`. Double-click `start-gconnect-serv.cmd` in the service folder, or start it in PowerShell:

   ```powershell
   Set-Location C:\GConnect\voucher-status-service
   $env:NODE_EXTRA_CA_CERTS = "C:\GConnect\certs\gconnect-trust-cert.pem"
   & '..\runtime\node.exe' --env-file=.env server.mjs
   ```

   With a publicly trusted controller certificate, use the direct Node command without setting a custom CA path. Expect `Voucher status service listening on port 3080`. Running Node directly avoids the `npm.ps1` execution-policy issue.
4. From another PowerShell window, test with a known voucher:

   ```powershell
   $code = Read-Host "Voucher code"
   Invoke-RestMethod -Method Post -Uri http://localhost:3080/voucher-status `
     -ContentType "application/json" -Body (@{code=$code} | ConvertTo-Json)
   ```

   A successful lookup returns `found`, `status`, and `remainingSeconds` when the controller provides it. Checking a voucher does not redeem it. For Windows Firewall, Omada pre-auth access, ACLs, and the phone test, follow the [main setup guide](../SETUP-GUIDE.md).

## Portable Node.js

The operator confirmed the portable runtime works on Windows 11 on November 18, 2026, using **Node.js v26.13.0 for Windows x64**. No separate Node.js installation or npm dependencies are needed for this service.

The repository includes `runtime/node.exe` and its matching `runtime/LICENSE`, so a normal clone or GitHub source ZIP includes the portable runtime. The executable is about 95.5 MiB; check future replacements against GitHub's 100 MiB per-file limit before committing them.

Keep these folders together under the installation folder (example):

```text
C:\GConnect\
  runtime\
    node.exe
    LICENSE
  certs\
    gconnect-trust-cert.pem
  voucher-status-service\
    gconnect-balance-checker.cmd
    gconnect-balance-checker.ps1
    setup-controller.mjs
    start-gconnect-serv.cmd
    server.mjs
    balance.mjs
    balance.html
    .env
```

Double-click `gconnect-balance-checker.cmd` to configure the checker, then `start-gconnect-serv.cmd` to run it. Both look for `..\runtime\node.exe` relative to their own folder, then the standard Windows Node.js installation, then PATH. Choosing an installation folder in the form controls where configuration and certificates are saved; keep the service scripts and sibling runtime in that installation folder when starting the installed service.

**Fallback:** If the portable executable fails, move or rename it so the scripts can use an installed runtime. Download Windows x64 Node.js **22 or newer** from the [official Node.js download page](https://nodejs.org/en/download), open a new terminal, and run the launcher again. For a direct PowerShell start with installed Node.js, use `node --env-file=.env server.mjs` instead of the portable command above.

Retain the matching full Node.js `LICENSE`, including third-party notices, with `node.exe`. When updating the runtime, replace both from the same official release, restart the service, and test a voucher lookup. Keep the runtime, service, configuration, and certificates outside the controller's static portal ZIP. Portable operation is confirmed; this does not establish a complete fresh-install or new-certificate test.

## Controller certificate

To generate a certificate with GConnect V5, enter the local controller address under **Settings → Voucher Source → Open API**. In **Controller certificate**, tap **Setup**, enter the controller's IPv4 address, and tap **Share setup package**. Transfer the ZIP to Windows and extract it. Run `launch-gcontroller-cert.cmd` as prompted and choose a PFX password. It creates `omada-controller-https.pfx` and `gconnect-trust-cert.pem` in `C:\GConnect\certs`. Use the PFX for the OC200 import and the public PEM for Windows trust. If using the app for site discovery, add that same public PEM under **Controller certificate** on the phone.

The certificate's Subject Alternative Name must match the IP or hostname in `OC200_URL`. If installing a private certificate on the OC200, import its password-protected PFX in **HTTPS Certificate**, save, and restart the controller as required. Use the corresponding public certificate PEM for a self-signed certificate or the issuing CA PEM for a privately issued certificate. The launcher reads that PEM from the sibling `certs` folder. After replacement, restart Node and repeat the local lookup to verify trust. Keep the PFX and private key out of the portal ZIP and Git.

## Keep the service running

Leave the console open or minimized and prevent sleep while plugged in. Screen-off and locking are fine. For startup after sign-in, put a shortcut to `start-gconnect-serv.cmd` in `shell:startup`. Verify startup after reboot on your PC.

## Desktop setup form

To open **GConnect Voucher Setup**, copy `gconnect-balance-checker.cmd`, `gconnect-balance-checker.ps1`, and `setup-controller.mjs` together onto the Windows PC. Keep the sibling `runtime` folder as shown above, or install Node.js 22 or newer, then double-click `gconnect-balance-checker.cmd`.

1. In **Set up certificate trust**, enter the controller HTTPS URL and choose the installation folder (example `C:\GConnect`). Select **Use an existing PEM** and browse to the public trust certificate, or select **Create a new certificate** to reveal the PFX password fields and the **Create certificate** button. Import the generated `certs\omada-controller-https.pfx` into the controller, save, and restart the controller before testing. The form selects the matching public PEM after creation.
2. In **Connect and select a site**, enter your Omada ID, Client ID, and Client Secret. Use **Paste** to fill a connection field from the clipboard. Click **Test connection and discover sites**, then choose your site. The Open API app needs site-list permission.
3. In **Save the checker configuration**, enter the exact portal origin and service port, then click **Save configuration**. The form writes `voucher-status-service\.env` and places the public PEM in the sibling `certs` folder. It asks before replacing existing files.

Place the runtime files and `start-gconnect-serv.cmd` in the selected service folder, then start the service and test a voucher using the steps above.

The form does not change controller settings, firewall rules, ACLs, or the portal ZIP. It runs only during setup. The Node API helper has been tested locally against a mock HTTPS controller; a complete fresh-install workflow, including new certificate generation, still requires Windows 11 verification. Keep generated credentials and PFX files private.

## Local service protection

Keep this service LAN-only: do not port-forward it or publish it through a tunnel. Retain the guest-subnet Windows firewall scope and the Omada service IP/port permits above. CORS is a browser restriction, not client authentication; guests who know a voucher code can check its balance.

The service limits each source IP to six POST attempts per minute, permits one controller lookup at a time, and bounds each lookup to 40 API calls with a 20-second lookup deadline. Rate-limited requests return HTTP 429. Controller requests also have individual timeouts. TLS verification must remain enabled. These limits reduce abuse but do not replace the firewall or prevent a guest from guessing codes across multiple devices.

The launcher and setup form check for Node.js 22 or newer. Local automated HTTP tests cover input validation, origins, rate limiting and overlapping requests; repeat the pre-login and post-login phone tests after replacing `server.mjs`.
