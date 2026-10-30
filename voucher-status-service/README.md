# Windows 11 setup

Controller version note: the operator confirmed OC200 V1.0 running **6.3.0.111** on October 30, 2026. Earlier setup testing was recorded on 6.2.14.12. A full post-upgrade regression test has not been separately recorded.

Current version uses manual voucher entry; connection-based autofill is parked. The runtime files are `server.mjs`, `balance.mjs`, and `balance.html`, alongside your private `.env` and certificate. Test files are optional and run only with `node --test`; they are not loaded by the service.

Guests can revisit `http://PC-IP:3080/balance` in a regular browser after authentication. Deploy `balance.html` alongside `server.mjs` and restart the service when updating. Bookmark that page; Android may close the captive login window after authentication. This standalone page needs a live Windows/phone test.

This service reads voucher balances from the OC200 Open API. Live controller compatibility must be tested before making it available to guests.

1. Install Node.js 22 or newer and copy this service folder to `C:\GConnect\voucher-status-service`.
2. Copy `.env.example` to `.env`. Fill in the OC200 Interface Access Address, Omada ID, Site ID, and an API application's credentials. Give the app Site Hotspot Manager View Only for the intended site. Keep `.env` on the PC; never upload it in the portal ZIP.
3. If OC200 uses a private certificate, trust its issuing CA through `NODE_EXTRA_CA_CERTS` in the Windows environment before starting Node. Do not globally disable TLS verification. Use a controller hostname matching the certificate.
4. In PowerShell, change into the service directory, set `$env:NODE_EXTRA_CA_CERTS = "$PWD\oc200-cert.pem"` for the private controller certificate, and run `node --env-file=.env server.mjs`. This avoids the Windows `npm.ps1` execution-policy issue. No npm dependencies are required.
5. Test with a known voucher: `Invoke-RestMethod -Method Post -Uri http://localhost:3080/voucher-status -ContentType application/json -Body '{"code":"YOUR_TEST_CODE"}'`.
6. Give the PC a DHCP reservation. Allow inbound TCP 3080 in Windows Firewall only from the guest subnet. Permit guest access to that port using your router/VLAN rules, and add the service address to Omada pre-authentication access if guests should check before logging in. Keep controller management inaccessible to guests.
7. Set `window.GCONNECT_STATUS_URL` in the portal's `voucher-status.js` to `http://PC-IP:3080/voucher-status`. Set ALLOWED_ORIGINS to the actual portal origin, including scheme and port. HTTPS portals require an HTTPS service endpoint, normally through a reverse proxy with a trusted certificate; browsers block HTTPS-to-HTTP fetches. Android/browser local-network permissions may also apply.
8. Repackage the portal with voucher-status.js included. Do not include this service folder.
9. For automatic startup, create a Windows Task Scheduler task triggered At startup. Program: full path to `node.exe`; Arguments: `--env-file=.env server.mjs`; Start in: `C:\GConnect\voucher-status-service`. Use a restricted Windows account with permission to read its configuration and restart the task on failure.

The service caches its token until shortly before expiry and obtains another with Client Credentials. It searches paginated voucher groups using exact code matching, allows one lookup at a time, and limits each source IP to six attempts per minute. A voucher code acts as the lookup credential. Avoid publishing the endpoint to the Internet.

Missing remaining time is not treated as zero. Client-duration vouchers with timingByClientUsage=true return a device-specific message; accurate per-device balances need a separately verified session lookup. Group search is limited to 1000 groups. The service exposes no controller-changing routes.

## If the service PC IP changes

Update the DHCP reservation, Windows firewall LocalAddress, gateway ACL destination group, Omada pre-authentication IP `/32` (including parent Apply), portal `GCONNECT_STATUS_URL` and uploaded ZIP, plus DNS records/bookmarks/QR or landing URLs. Keep the permit above guest-to-IoT denies. See SETUP-GUIDE.md → “Changing the service PC IP” for the verification checklist. The deployment now uses reserved `192.168.30.30`; the user confirmed restored access after migration. A direct GET returning 405 “Use POST” verifies connectivity only, not voucher lookup.

## Remaining-time display

Both portal and standalone checkers format returned seconds locally as days, hours, and minutes: `2 days 3h 15 min`, `1 day`, `2h`, or `30 min`. Zero units are omitted; positive time below 60 seconds shows “Less than 1 min”; zero shows `0 min`. Whole minutes are rounded down. Days contain 86400 seconds, hours 3600 seconds. This only changes browser presentation: no additional API calls or changes to voucher timing. The responsive result font accommodates longer values. Syntax and representative formatting cases were checked locally; live phone verification is pending. Upload the rebuilt portal ZIP; for the standalone page, copy updated `balance.html` to the Windows service folder and restart Node.

## Guest SSID exception verified after login

Keep Guest Network enabled. Under EAP ACL, use `Allow_GCONNECT_Balance_Service`: enabled, Permit TCP, source SSID `GCONNECT WIFI`, destination IP-Port group `GConnect_Balance_Service2` containing `192.168.30.30/32` and port `3080`. Put it above matching EAP denies and save/apply. The operator confirmed this resolved the live SSID timeout after authentication while retaining Guest Network. Keep the separate gateway permit, Windows firewall rule, and portal pre-authentication exception. Gateway ACLs alone did not override the observed EAP Guest filtering. Update this EAP destination too if the service IP changes. Full rule identification and verification limits are in SETUP-GUIDE.md.

## Autofill rollback — manual checker retained

Connection-based autofill was parked after live testing failed the strict SSID match. The runtime no longer queries client/session records, exposes `/my-voucher`, or attempts detection on page load. The helper and tests are retained separately under `experiments/voucher-autofill` for later investigation. Manual balance checking, days/hours/minutes formatting, status pills, and the `.30.30` service address remain unchanged.

Replace `server.mjs` and `balance.html` in the Windows service folder and restart Node. Existing `balance.mjs`, `.env`, certificates, firewall and ACLs remain in place. Old `autofill.mjs` and `autofill.test.mjs` copies on Windows are unused and may be deleted. Remove optional `AUTOFILL_*` environment settings if present. Site Clients Manager View Only is no longer required by this service; remove it from the API app if nothing else uses it, retaining the hotspot read permission. No controller portal ZIP update is required. Local balance tests and script syntax checks passed; verify manual lookup after deploying the rollback.
