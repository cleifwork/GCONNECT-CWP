# GConnect OC200 voucher balance checker

Guests enter a voucher code in the captive portal to check its remaining time without activating it. Both balance views use the controller labels **Unused**, **In-use**, and **Expired**. A Node.js service on Windows reads the voucher from the OC200 Open API. Keep the API credentials on Windows.

The setup was verified with an OC200 V1, ER605, Omada EAPs, Windows 11, and an Android phone. Confirm that your controller exposes the local Open API and voucher-group endpoints.

| Component | Example to adapt |
|---|---|
| OC200 management and API | `https://192.168.0.2:443` |
| Captive portal origin | `http://192.168.0.2:8088` |
| Guest network | `Voucher_WiFi`, VLAN 10, `192.168.10.0/24` |
| Windows service | VLAN 30, `http://192.168.30.30:3080` |

## 1. Prepare the controller and Windows service

1. Reserve the controller and Windows IPs in DHCP. On a managed ER605, use **Clients → select device → Config → Use Fixed IP Address** and confirm each device received its reserved address.
2. On the local OC200, go to **Global View → Settings → Platform Integration → Open API**. Create a **Client Mode** app scoped to the intended site with **Site Hotspot Manager View Only** permission. Record its Omada ID, Client ID, and Client Secret privately.
3. Use the [Windows desktop setup form](voucher-status-service/README.md#desktop-setup-form) to create a certificate, discover the site, and save `.env` in one interface, or use an option below for site discovery. The form's Windows UI and certificate generation require Windows verification.
4. Follow the [Windows service setup](voucher-status-service/README.md) to install Node, configure `.env` and certificate trust, and verify a lookup on the laptop.

**GConnect V5:** Open **Settings → Voucher Source → Open API**. Enter the controller's Interface Access Address, Omada ID, Client ID, and Client Secret. For a local OC200, connect the phone to a network that can reach it and add the public PEM under **Controller certificate** if it uses private HTTPS. You can generate the certificate files with the [app's setup helper](voucher-status-service/README.md#controller-certificate). Tap the search icon beside **Site ID**, tap **Discover**, and select your site. The app fills the **Site ID** field with the full value. Use that value for `SITE_ID` in the Windows `.env`.

**Manual Open API lookup:** POST to `/openapi/authorize/token?grant_type=client_credentials` with JSON fields `omadacId`, `client_id`, and `client_secret`. Use `Authorization: AccessToken=TOKEN` on `GET /openapi/v1/CONTROLLER_ID/sites?page=1&pageSize=100` and read `siteId` from `result.data`. Site discovery may require site-list permission. Keep TLS verification enabled.

## 2. Allow guest traffic to the checker

On Windows, run this in Administrator PowerShell. Adapt the local IP and guest subnet to your network.

```powershell
New-NetFirewallRule -DisplayName "GConnect Voucher Status - VLAN 10" `
  -Direction Inbound -Action Allow -Protocol TCP `
  -LocalAddress 192.168.30.30 -LocalPort 3080 `
  -RemoteAddress 192.168.10.0/24 -Profile Any
```

Configure these controls in Omada Site View. Keep controller management ports restricted to trusted networks.

| Control | Configuration |
|---|---|
| **Portal → Access Control** | Enable **Pre-Authentication Access** and add an **IP Range** entry for `192.168.30.30/32`. Save the entry, click **Apply** on the parent page, and wait for provisioning. The IP entry has no port restriction, so use the ACL and firewall rules below to limit access. |
| **Gateway ACL** | Permit LAN → LAN TCP from `Voucher_WiFi` to the service IP-Port group `192.168.30.30/32:3080` and to the OC200 portal IP-Port group `192.168.0.2/32:8088`. Place both permits above matching inter-VLAN denies. |
| **EAP ACL** | With **Guest Network** enabled, add `Allow_GCONNECT_Balance_Service` as an enabled **Permit TCP** rule. Select source type **SSID** and the live guest SSID (example `GCONNECT WIFI`). Use the service IP-Port group as the destination and place the permit above matching EAP denies. This resolved the live SSID timeout after login. |

## 3. Upload and test the portal

1. Set `window.GCONNECT_STATUS_URL` in `voucher-status.js` to the Windows endpoint, for example `http://192.168.30.30:3080/voucher-status`. Set `ALLOWED_ORIGINS` on Windows to the captive portal's exact scheme, host, and port, then restart Node if you changed it. The verified setup used HTTP for both. An HTTPS portal requires a browser-trusted HTTPS service endpoint.
2. Build the ZIP with `index.html` and its runtime assets at the root. From the portal project folder, create a fresh archive:

   ```sh
   zip -r gconnect-oc-custom-portal.zip index.html index.css overrides.css index.js \
     jquery.min.js logo.png payment.js timer-info.js voucher-clear.js voucher-status.js img audio \
     -x '*/.DS_Store'
   ```

   Keep the service folder, docs, `.env`, and certificate files outside the archive. Import the ZIP under the intended controller-hosted portal's **Design / Portal Customization** settings and apply.
3. Before entering a voucher, open the service endpoint on a phone connected to the guest SSID. HTTP **405 “Use POST”** confirms reachability. Then use **Check remaining time** in the portal with a known voucher to verify the full lookup.
4. After signing in, open `http://192.168.30.30:3080/balance` in a regular browser and check again. Guests can bookmark this page for when the captive portal closes.

Successful controller authentication plays `audio/login.mp3` before redirecting to the landing page. Playback failure redirects immediately, with a 2.5-second maximum wait for interrupted playback. Invalid vouchers and balance lookups do not trigger the sound. Verify playback on your phone because captive browsers may block audio or close after authentication.

Step 1 of the payment dialog explains that the dedicated payment SSID offers five minutes of free internet. Configure that SSID separately and verify the payment flow on a phone. The **Need help? Chat with the admin** button in the payment dialog opens a placeholder message.

## Troubleshooting

| Symptom | Check |
|---|---|
| Laptop responds but phone times out before login | Confirm the current reserved IP, Windows firewall scope, gateway permit, and **Apply** on the pre-auth page. |
| Phone reaches the endpoint but the portal check fails | Confirm the ZIP uses the right endpoint and the service allows the exact portal origin. Android may show only the IP even when the origin uses port `8088`. |
| Works before login but times out afterward | Verify the EAP permit matches the live SSID and service IP/port. |
| Node reports `fetch failed` | Check the cause code in the Node console. Certificate trust errors point to the public PEM or issuing CA, `ERR_TLS_CERT_ALTNAME_INVALID` points to an address mismatch, and `ECONNREFUSED` points to the configured host or port. See the [Windows service setup](voucher-status-service/README.md#controller-certificate). |

If the Windows IP changes, update the DHCP reservation, firewall local address, gateway and EAP destination groups, pre-auth entry, portal endpoint and ZIP, and any saved links or DNS records. Repeat the phone checks before and after login.

## Local service protection

Keep this service LAN-only: do not port-forward it or publish it through a tunnel. Retain the guest-subnet Windows firewall scope and the Omada service IP/port permits above. CORS is a browser restriction, not client authentication; guests who know a voucher code can check its balance.

The service limits each source IP to six POST attempts per minute, permits one controller lookup at a time, and bounds each lookup to 40 API calls with a 20-second lookup deadline. Rate-limited requests return HTTP 429. Controller requests also have individual timeouts. TLS verification must remain enabled. These limits reduce abuse but do not replace the firewall or prevent a guest from guessing codes across multiple devices.

The launcher and setup form check for Node.js 22 or newer. Local automated HTTP tests cover input validation, origins, rate limiting and overlapping requests; repeat the pre-login and post-login phone tests after replacing `server.mjs`. The Windows setup form still needs Windows verification.
