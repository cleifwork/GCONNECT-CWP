# GConnect OC200 Voucher Balance Checker

A community setup guide for checking an Omada voucher's remaining time from a custom captive portal.

## What this does

Current runtime uses manual voucher entry. Connection-based autofill is parked; see the rollback section for Windows replacement files and optional permission cleanup.

Guests enter a voucher code and read its status and available time. Checking does not authenticate the client, redeem the voucher, or start its timer. The normal GCONNECT login button still performs authentication.

The custom portal opens a balance dialog and sends a request to a small Node.js service. That service authenticates with the OC200 Open API, searches the voucher groups, and returns a limited balance response. API credentials remain on the service computer.

## Tested environment and current limits

This setup was verified with an OC200 V1 running Controller 6.2.14.12, an ER605, Omada EAPs, a Windows 11 computer, and an Android captive browser. Endpoint availability must be verified on other versions; Open API documentation for a Cloud-Based Controller alone does not establish local-controller support.

Working: local API authentication, certificate verification, voucher lookup, guest access before authentication on the test SSID, and the portal balance form. The revised dialog layout still needs testing on each target phone/browser.

The live SSID balance-service exception was subsequently verified with Guest Network enabled (see EAP ACL section). Unattended Windows startup/reboot recovery and comprehensive client-isolation testing remain pending.

When Omada returns `timingByClientUsage=true`, its documentation says `timeLeftSec` and `timeUsedSec` are omitted. The checker reports a device-specific balance message rather than inventing a duration. Per-device session lookup is not implemented.

## Example addressing — adapt to your network

| Component | Example |
|---|---|
| OC200 management/API | https://192.168.0.2:443 |
| Guest network | VLAN 10, 192.168.10.0/24 |
| Service computer | 192.168.30.30, on VLAN 30 |
| Balance service | http://192.168.30.30:3080/voucher-status |
| Actual captive portal origin in this test | http://192.168.0.2:8088 |

Deployment update (October 30): the user confirmed the PC received reserved address `192.168.30.30` and updated the Windows firewall, gateway ACL destination, pre-authentication exception, and LAN DNS destination. The portal endpoint now uses that address; the user subsequently confirmed access worked again after the network exceptions were corrected. This confirms restored reachability; no separate standalone-page or full voucher-status regression test was recorded in that confirmation. Local DNS names remain unresolved, so retain the IP-based URL.

The address displayed in Android's WiFi sign-in header hides the protocol and port. Do not assume it is the portal's full origin.

## 1. Prepare the PC and IP reservations

Install Node.js 22 or newer on Windows. Copy `voucher-status-service` to `C:\GConnect\voucher-status-service`. The service has no external npm dependencies.

Reserve both the controller and service computer addresses on the DHCP server. With the ER605 managed by Omada, we used Site View → Clients → select the client → Config → Use Fixed IP Address, selected its existing network, and reserved its existing IP. Confirm each MAC address. This is a DHCP reservation; leave the clients using DHCP.

Controller Settings → Access Config → Controller Hostname/IP is an advertised address, not the setting that assigns the controller a static IP.

### Changing the service PC IP: update every dependency

Keep the reserved IP stable. During the October 30 migration from `192.168.30.21` to `192.168.30.30`, the service responded locally but the phone stalled until network access was corrected. A single IP change affects multiple independently saved settings:

1. Change the ER605 DHCP reservation for the PC, renew/reconnect its adapter, and verify the actual IPv4 address.
2. Update the Windows inbound firewall rule's **LocalAddress**, preserving TCP 3080 and the guest-subnet scope.
3. Update the gateway and EAP ACL destination IP/port groups or references. Keep the balance-service permit above the guest-to-IoT deny.
4. Update Omada's pre-authentication exception to the new IP `/32`; save the entry and click the parent page's **Apply**.
5. Update `window.GCONNECT_STATUS_URL` in `voucher-status.js`, rebuild the static portal ZIP, upload it, and apply the portal changes.
6. Update any LAN DNS records, bookmarks, QR codes, or landing URLs containing the old IP. Local DNS resolution remains unresolved in this deployment; do not assume a saved DNS record works.
7. Verify from the PC and an unauthenticated guest phone. A browser GET to `http://SERVICE-PC-IP:3080/voucher-status` should return HTTP 405 with `{"error":"Use POST"}`; that confirms reachability, not a successful voucher lookup. Then test the portal's actual balance check.

If the PC responds but the phone times out, check firewall, ACL, and applied pre-authentication settings first. Portal cache cannot explain failure of the direct new-IP URL. If the direct URL works but the portal still calls the old IP, verify the uploaded ZIP and refresh/reopen the portal. The server was observed listening on `0.0.0.0:3080`, so that configuration does not require rebinding when the PC IP changes. A friendly DNS name can simplify client URLs, but IP-based network exceptions still need updating.


Keep the PC powered and prevent sleep while plugged in. Screen-off is fine; system sleep stops service availability. Use a trusted network for the service host and configure guest access narrowly.

## 2. Create the API application

Log in to the local OC200. In Global View → Settings → Platform Integration → Open API, create a Client Mode application. Give it the intended site's privileges and Site Hotspot Manager View Only permission. Site discovery may require additional site-list visibility depending on role/version.

Record the Interface Access Address, Omada ID, Client ID, and Client Secret locally. Never embed the secret in the portal ZIP, screenshots, social posts, or browser JavaScript. Replace a secret if exposed.

The documented token request is:

```http
POST /openapi/authorize/token?grant_type=client_credentials
Content-Type: application/json

{"omadacId":"CONTROLLER_ID","client_id":"CLIENT_ID","client_secret":"CLIENT_SECRET"}
```

Subsequent API calls use `Authorization: AccessToken=TOKEN`, not an assumed Bearer header. The response provides `expiresIn`; the service obtains a fresh token shortly before expiry. Changing app permissions can invalidate tokens.

## 3. Discover the Site ID

After obtaining a token, request:

```http
GET /openapi/v1/CONTROLLER_ID/sites?page=1&pageSize=100
Authorization: AccessToken=TOKEN
```

Find your site's `siteId` in `result.data`. Follow pagination if necessary. The supplied Open API access guide and the controller's own endpoint documentation are the reference for this request.

During initial discovery we encountered an untrusted default certificate. A one-time `curl.exe --insecure` request helped isolate authentication from certificate errors, but the running service uses certificate verification. Do not globally disable Node TLS verification.

Error `-44106` means the controller rejected the Client ID/Secret. Copy the complete secret from the same app; the visible field can be clipped. Do not substitute a TP-Link account password.

## 4. Configure a matching OC200 certificate

The original controller certificate had CN `localhost` and no Subject Alternative Name. Trusting it alone would not make it valid for the controller's LAN IP.

For this single-controller LAN deployment, we generated a self-signed server certificate with the controller IP as an IP SAN, exported a password-protected PFX, imported it into OC200, restarted the controller, and explicitly trusted its public PEM certificate in Node. A private CA or an existing properly issued certificate is also possible.

Back up the controller configuration first. Certificate import/restart can interrupt portal authentication. If replacing an existing valid certificate, assess other integrations before proceeding. Run this on Windows only after adapting the IP and destination path:

```powershell
$folder = "C:\GConnect\voucher-status-service"
New-Item -ItemType Directory -Force -Path $folder | Out-Null
$cert = New-SelfSignedCertificate `
  -Type Custom -Subject "CN=GConnect OC200" `
  -FriendlyName "GConnect OC200 HTTPS" `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 `
  -KeyExportPolicy Exportable -NotAfter (Get-Date).AddYears(2) `
  -TextExtension @(
    "2.5.29.17={text}IPAddress=192.168.0.2",
    "2.5.29.19={critical}{text}ca=false",
    "2.5.29.37={text}1.3.6.1.5.5.7.3.1"
  ) -KeyUsage DigitalSignature,KeyEncipherment
$password = Read-Host "Choose a PFX password" -AsSecureString
Export-PfxCertificate -Cert $cert -FilePath "$folder\oc200.pfx" `
  -Password $password | Out-Null
$pem = "-----BEGIN CERTIFICATE-----`r`n" +
  [Convert]::ToBase64String($cert.RawData,
    [Base64FormattingOptions]::InsertLineBreaks) +
  "`r`n-----END CERTIFICATE-----`r`n"
[IO.File]::WriteAllText("$folder\oc200-cert.pem", $pem, [Text.Encoding]::ASCII)
```

In controller SSL Certificate settings, choose PFX, import `oc200.pfx`, supply its password, save, and restart the controller. Verify its certificate now identifies GConnect OC200 and includes the intended IP SAN.

PFX is binary: unreadable characters in a text editor are normal. Do not edit/save it as text. Keep the PFX and its password private. The PEM contains only the public certificate and is used for Node trust. Browsers can still show a warning unless they separately trust the certificate.

Track the certificate expiry date. Replacement requires updating the controller certificate and the trusted PEM, then restarting the service.

## 5. Configure and start the service

Copy `.env.example` to `.env` in the service folder. Use your own values:

```ini
OC200_URL=https://192.168.0.2:443
OMADA_ID=YOUR_CONTROLLER_ID
SITE_ID=YOUR_SITE_ID
CLIENT_ID=YOUR_APP_CLIENT_ID
CLIENT_SECRET=YOUR_APP_CLIENT_SECRET
PORT=3080
ALLOWED_ORIGINS=http://192.168.0.2:8088
```

The origin must match protocol, host, and port exactly. Multiple explicitly permitted origins can be comma-separated. Keep `.env` off the portal upload and restrict its Windows file permissions to the service account/administrators.

Start in PowerShell:

```powershell
cd C:\GConnect\voucher-status-service
$env:NODE_EXTRA_CA_CERTS = "$PWD\oc200-cert.pem"
node --env-file=.env server.mjs
```

Expected: `Voucher status service listening on port 3080`. Leave the terminal running during testing. Using Node directly avoids PowerShell execution-policy errors from `npm.ps1`; no policy change is required.

## 6. Verify locally before changing the portal

In another terminal:

```powershell
$code = Read-Host "Voucher code"
Invoke-RestMethod -Method Post `
  -Uri http://localhost:3080/voucher-status `
  -ContentType "application/json" `
  -Body (@{code=$code} | ConvertTo-Json)
```

A verified unused 30-minute voucher returned `found=True`, `status=unused`, `remainingSeconds=1800`, and `deviceSpecific=False`. Missing time is distinct from zero. This read does not redeem the voucher.

The service uses these documented read-only routes, paginating and checking for an exact code match:

```text
GET /openapi/v1/{omadacId}/sites/{siteId}/hotspot/voucher-groups
GET /openapi/v1/{omadacId}/sites/{siteId}/hotspot/voucher-groups/{groupId}?searchKey=CODE&page=1&pageSize=100
```

Opening the service URL directly in a browser sends GET, so `405` / `{"error":"Use POST"}` is expected. It confirms basic connectivity, not successful API authentication or browser cross-origin access.

## 7. Allow guest access to the service

Run in Administrator PowerShell, adapting the destination and guest subnet:

```powershell
New-NetFirewallRule `
  -DisplayName "GConnect Voucher Status - VLAN 10" `
  -Direction Inbound -Action Allow -Protocol TCP `
  -LocalAddress 192.168.30.30 -LocalPort 3080 `
  -RemoteAddress 192.168.10.0/24 -Profile Any
```

ER605 routing/ACLs must also permit the guest subnet to this host/port. Do not expose controller management or the whole service-host network to guests. Existing explicit Windows block rules or third-party security software may override this allow rule.

### EAP ACL exception: access after authentication with Guest Network enabled

Verified on the live **GCONNECT WIFI** SSID on October 30: the phone retained `192.168.10.100` after voucher authentication. The balance service worked before authentication but timed out afterward. The gateway permit already correctly targeted `192.168.30.30/32`, TCP 3080, above the deny rules. Temporarily disabling Guest Network restored access; an explicit EAP Permit exception then allowed the operator to keep Guest Network enabled and successfully access the balance service after login.

Under **Network Config → ACL → EAP ACL**, create the following rule (menu grouping can vary by controller version):

| Setting | Working rule specification |
|---|---|
| Description / identification | `Allow_GCONNECT_Balance_Service` |
| Status | Enabled |
| Policy | Permit |
| Protocol | TCP |
| Source type / selection | SSID / `GCONNECT WIFI` |
| Destination type | IP-Port Group |
| Destination group | `GConnect_Balance_Service2` |
| Group IP subnet | `192.168.30.30/32` |
| Group port | `3080` |

These are the instructed identifiers for the successful configuration; names themselves do not affect matching. Verify the selected group's actual IP and port, especially when duplicate or truncated names appear. Place the permit above matching EAP deny rules, save/apply, and wait for provisioning. Leave **Guest Network enabled** on the SSID. Retain the gateway permits/denies and Windows firewall scope.

The three access controls serve different roles: the portal pre-authentication exception allows access before voucher login; the EAP Permit supplies the narrow exception through Guest Network filtering; the gateway Permit allows the routed VLAN10-to-VLAN30 service traffic. A gateway Permit alone did not override the observed EAP Guest restriction. The rule is a service exception, not a replacement for guest isolation or permission to access all of VLAN30. IPv6 and isolation between clients across both APs were not separately verified in this test.

Verify the direct service URL and actual balance lookup before and after authentication, with Guest Network enabled. A direct browser GET to `/voucher-status` returning 405 “Use POST” confirms HTTP reachability only. If only authenticated access times out, inspect this EAP exception in addition to the gateway ACL and host firewall. After an IP change, update **both** the EAP and gateway destination references/groups, plus pre-authentication and the host firewall.

## 8. Allow access before voucher authentication

In Site View → Network Config → Authentication → Portal → Access Control, enable Pre-Authentication Access and add an IP Range entry:

```text
192.168.30.30/32
```

Save the entry AND click the parent page's Apply button. Missing Apply caused requests to stall in this deployment. Wait for device provisioning.

This form did not offer port restrictions; firewall/ACL restrictions must limit access on the host/network. The entry permits reaching the service, not general internet access. Guest Network restrictions can still apply separately.

From an unauthenticated phone, open the service URL in regular Chrome. Proceed only when it returns `Use POST`.

## 9. Configure and upload the custom portal

Set `window.GCONNECT_STATUS_URL` in `voucher-status.js` to the service endpoint. Use a stable reserved IP or hostname. An HTTPS portal requires a trusted HTTPS service endpoint; browsers block HTTPS pages fetching HTTP resources. Our verified test used an HTTP portal on port 8088 and an HTTP service on port 3080.

Import the custom ZIP into the intended portal profile's Design/Portal Customization section. It is a controller-hosted custom portal, not External Portal Server. Keep `index.html` and dependencies at the archive root. Do not upload the Windows service folder, `.env`, PFX, or private keys. Keep below your controller's upload size limit.

The supplied `oc200-gconnect-portal.zip` includes the checker button below GCONNECT and a balance dialog. It copies the login voucher field when opened. Unused vouchers show available time and Not activated; active vouchers show remaining time. A balance lookup never calls the authentication endpoint.

## 10. Diagnose a cross-origin failure

Deployment follow-up: the operator verified balance checking on GTEST with Guest Network enabled after applying the pre-authentication exception. The earlier failure did not establish that Guest Network must be disabled. Preserve Guest Network protection and test the applied exception first. Gateway permit rules for the service (TCP 3080) and OC200 HTTP portal (TCP 8088), above denies to Default and IoT networks, were also verified on GTEST; a deny to Share_WiFi was added for future use. The subsequent live-SSID test required the EAP Permit exception documented above; reboot recovery remains pending.

UI follow-up: the balance dialog reuses the login voucher input styles, icon, and focus treatment. Opening it explicitly focuses/selects the code inside the click handler; mobile keyboard display remains controlled by the browser and requires device testing.

The controller initialization previously set the login voucher wrapper to `display: block`, overriding its flex layout and collapsing the empty icon span. It now sets `display: flex` for voucher authentication, keeping the icon and input aligned as in the checker. A local file preview does not execute this successful controller-settings path, so verify this behavior through the actual portal.

Successful authentication displays “You're connected! Enjoy your WiFi.” with a green success treatment. The configured landing-page redirect still happens immediately, so this message can be brief. Balance checking remains a separate read-only action.

The E-Wallet popup uses a visible border, solid light/dark background, single-line payment number, and Copy button. `payment.js` copies the displayed number without spaces, using a fallback for HTTP captive browsers. If copying is unavailable it instructs guests to press and hold the selectable number. Include payment.js in the portal ZIP. Test clipboard behavior on the target phone and customize payment details before sharing.

Voucher result pills use guest-friendly labels: Not Activated (green), Active (blue), and Expired (muted red), with light/dark palettes. The service's `unused` status maps to Not Activated; `active` maps to Active. Unknown status retains a neutral gray treatment. Found vouchers display their status even when a shared remaining-time value is unavailable.

If direct navigation shows Use POST but the portal says Cannot reach the balance service, verify the actual portal origin. Android can display only the IP even when the portal uses port 8088.

Temporarily add this after `const origin=req.headers.origin;` in `server.mjs`:

```javascript
console.log('Request:', req.method, 'Origin:', origin || '(none)');
```

Restart and try once. Our log showed `OPTIONS Origin: http://192.168.0.2:8088`. Updating ALLOWED_ORIGINS from the portless address to that exact value fixed the browser request. Keep an explicit origin allowlist; do not solve this by exposing credentials or allowing arbitrary origins.

If no request arrives, inspect connectivity, mixed content, captive-browser restrictions, and local-network permissions. If OPTIONS arrives but POST does not, inspect its CORS response and exact allowed origin. No portal update is needed after changing only the server's `.env`; restart the service.

## 11. Plan unattended Windows operation

### Revisit balances after authentication

The service now hosts a standalone page at `http://SERVICE-PC-IP:3080/balance` (also `/`). Copy both updated `server.mjs` and `balance.html` to Windows and restart the service. Existing `.env` and certificate files stay local. The page makes same-origin POST requests, and the service permits its own HTTP origin in addition to the configured portal origins. No API credentials are served. Verify from a guest phone before and after login. Bookmark or print a QR link to this address; the captive login page may no longer appear for authenticated clients. Optionally set this as the promotional landing URL, but Android can close its captive window after authentication, so this cannot guarantee an automatic visit. The service must be running and the guest network must permit its address/port. This standalone page has not yet been live-tested on Windows.

See [Windows host readiness review](WINDOWS-PC-REVIEW.md) for the October 30, 2026 configuration snapshot, evidence, and outstanding reliability improvements. That snapshot contains no credentials and does not replace a reboot/recovery test.

This step is a deployment checklist, not a claim that startup recovery has already been verified.

- Use a dedicated restricted Windows account able to read the service configuration.
- Create a Task Scheduler task triggered At startup, running whether the user is logged in or not.
- Program: full path to `node.exe`.
- Arguments: `--env-file=.env server.mjs`.
- Start in: `C:\GConnect\voucher-status-service`.
- Ensure NODE_EXTRA_CA_CERTS exists in that account's environment BEFORE Node starts, or use a task launcher that sets it explicitly. A variable set in an interactive terminal does not carry into a scheduled task.
- Enable restart on failure and prevent overlapping instances. Remove any task execution time limit appropriate to a continuously running service.
- Disable system sleep on AC power. Do not disable security updates; test recovery after restarts.
- Reboot and test both local API lookup and unauthenticated phone lookup without opening a terminal manually.

## Troubleshooting reference

| Symptom | Check |
|---|---|
| npm.ps1 scripts disabled | Use `node --env-file=.env server.mjs` |
| Connection refused | Service running, listening port, destination IP |
| Local PC works; guest phone fails | Firewall, guest subnet, SSID Guest Network, ACLs, routing |
| Before login stalls; after login works | Pre-auth entry and parent Apply/provisioning |
| fetch failed in service | Underlying TLS/network cause; certificate imported AND controller restarted |
| Certificate IP mismatch | Correct IP SAN, matching OC200_URL |
| -44106 | Complete Client ID/Secret from correct local API app |
| -44112 / -44113 | Expired/invalid token; service retries once with fresh token |
| Portal fails; direct service URL works | Exact CORS origin including port, HTTP/HTTPS, browser restrictions |
| 429 / wait message | Rate limit (six attempts per source IP per minute) or another lookup in progress |
| Device-specific balance | API omits shared remaining time for that timing mode |

## Automation roadmap

An installer could validate Node, collect local configuration without logging secrets, discover sites, verify certificate identity/trust, test a voucher, install a restricted firewall rule and startup task, and produce a portal ZIP with the correct service URL. It should report the actual browser origin and provide explicit router/pre-auth instructions. Controller certificate replacement and production isolation changes need reviewed settings and recovery steps, not blind automation.

The service currently permits one active lookup at a time, has bounded pagination, and exposes no controller-changing routes. Large deployments need measured controller load, improved lookup indexing/cache strategy, and additional abuse protections. A code is the lookup credential: do not publish the service to the Internet by port forwarding.

## Community post draft

Portal timer information: an info button beside the login heading opens a scrollable timer/pause dialog. Include `timer-info.js` in the portal package. Its eligibility text reflects this operator's policy (eligible hourly packages up to 12 hours); it does not configure Omada timing. Verify voucher-group timing and pause behavior before sharing or applying to other sites. Disconnect detection may delay pausing. Balance checks do not activate vouchers.

We tested a voucher remaining-time checker with OC200 V1 / Controller 6.2.14.12. Guests can check a code from the custom portal without activating it. A small local Node.js service uses the controller's documented Open API; credentials stay on the host. The important setup details were a matching trusted controller certificate, guest-to-service firewall access, a pre-authentication /32 exception followed by Apply, and allowing the actual portal origin including port 8088. Live SSID balance access was also verified with Guest Network enabled using the narrow EAP Permit exception. Comprehensive isolation and automatic startup must still be verified for each installation. This is a community integration, not a TP-Link product, and support depends on firmware/API availability.

Share the source, this guide, and a sanitized portal package. Never share a configured .env, API tokens, certificate private keys, or PFX files.

## Remaining-time display

Both portal and standalone checkers format returned seconds locally as days, hours, and minutes: `2 days 3h 15 min`, `1 day`, `2h`, or `30 min`. Zero units are omitted; positive time below 60 seconds shows “Less than 1 min”; zero shows `0 min`. Whole minutes are rounded down. Days contain 86400 seconds, hours 3600 seconds. This only changes browser presentation: no additional API calls or changes to voucher timing. The responsive result font accommodates longer values. Syntax and representative formatting cases were checked locally; live phone verification is pending. Upload the rebuilt portal ZIP; for the standalone page, copy updated `balance.html` to the Windows service folder and restart Node.

## Autofill rollback — manual checker retained

Connection-based autofill was parked after live testing failed the strict SSID match. The runtime no longer queries client/session records, exposes `/my-voucher`, or attempts detection on page load. The helper and tests are retained separately under `experiments/voucher-autofill` for later investigation. Manual balance checking, days/hours/minutes formatting, status pills, and the `.30.30` service address remain unchanged.

Replace `server.mjs` and `balance.html` in the Windows service folder and restart Node. Existing `balance.mjs`, `.env`, certificates, firewall and ACLs remain in place. Old `autofill.mjs` and `autofill.test.mjs` copies on Windows are unused and may be deleted. Remove optional `AUTOFILL_*` environment settings if present. Site Clients Manager View Only is no longer required by this service; remove it from the API app if nothing else uses it, retaining the hotspot read permission. No controller portal ZIP update is required. Local balance tests and script syntax checks passed; verify manual lookup after deploying the rollback.
