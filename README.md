# GConnect Custom WiFi Portal — OC200 (OC-GCONNECT)

> [!NOTE]
> Tested with an OC200 V1 running Omada Controller **6.2.14.12**, an ER605, EAP225 access points, Windows 11, and an Android phone. Compatibility with other controller versions and hardware must be verified. The original Cloud-Based Controller project remains on the `main` branch.

**OC-GCONNECT** is a custom captive portal for voucher-based WiFi access, with rates, e-wallet instructions, and a remaining-time checker.

The **portal is hosted by the OC200**. The **balance checker uses a separate local Node.js service** on an always-on computer to read the OC200 Open API. Controller credentials stay on that computer.

## Interface Description

1. **Header Section**
   - GCONNECT FEEDS banner with a blue gradient and WiFi pattern.
   - SEE RATES and Back to Login navigation.
2. **Main Section**
   - GConnect branding and a greeting based on the time of day.
   - Responsive layout with light and dark mode support.
3. **Voucher Code Section**
   - Voucher input and GCONNECT login button.
   - Check remaining time opens a separate dialog without activating the voucher.
   - Timer information explains the operator's voucher and pause policy; actual behavior depends on controller voucher settings.
4. **WiFi Rates Page**
   - Cash/GCash prices, plan durations, and user limits.
   - E-wallet payment instructions with a copy-number button.
5. **Remaining WiFi Time**
   - Manual voucher entry with Not Activated, Active, and Expired status pills.
   - Readable durations such as `2 days 3h 15 min`.
   - A standalone `/balance` page users can bookmark and revisit after authentication.

## Demo

Use a configured test SSID to preview the complete login and balance flow. A local HTML preview shows the interface but cannot validate OC200 authentication or live API behavior. No OC200-specific demo video is linked yet.

## Authors

- [@cleifwork](https://github.com/cleifwork)

## Installation & Configuration

### Requirements

- An OC200 with the documented local Open API and a site-scoped API application.
- A compatible Omada network and voucher-enabled portal.
- An always-on device for the balance service; the documented setup uses Windows 11 and **Node.js 22 or newer**.
- A reserved service-host IP, certificate trust, and narrowly scoped firewall/ACL access.

Start with the **[setup and troubleshooting guide](SETUP-GUIDE.md)**. The **[Windows service README](voucher-status-service/README.md)** provides the concise service reference.

To clone this version directly:

```bash
git clone --branch OC-GCONNECT --single-branch https://github.com/cleifwork/GCONNECT-CWP.git
```

1. Configure the local API application, certificate trust, and private service `.env`.
2. Start the service and verify a manual voucher lookup.
3. Configure Windows Firewall, gateway ACLs, portal pre-authentication access, and the EAP Permit exception for access with Guest Network enabled.
4. Set the service URL in `voucher-status.js`, build the static portal ZIP, upload it to the OC200, and Apply.
5. Test before and after voucher authentication on the intended SSID.

> [!IMPORTANT]
> The GitHub source ZIP is **not** the controller upload ZIP. Package only the static portal files listed below, at the ZIP root. Exclude the service folder, documentation, experiments, `.env`, certificates, and private keys. Each operator must generate their own controller certificate and configure their own API credentials and network addresses.

From the project root on macOS/Linux:

```bash
zip -r oc200-gconnect-portal.zip index.html index.css overrides.css index.js \
  voucher-status.js payment.js timer-info.js jquery.min.js logo.png \
  background.png background_mobile.png img
```

The current deployment uses `192.168.30.30:3080`; adapt this address to your network. Follow the guide's IP-change checklist whenever moving the service.

## Running Tests

Run the local service tests:

```bash
cd voucher-status-service
node --test
```

These tests do not contact a live OC200 and are not loaded during normal service operation. Also verify on a phone:

- Before login: portal loads, balance lookup works, and checking does not activate a voucher.
- After login: internet access and the standalone balance page work with Guest Network enabled.
- Isolation: unrelated LAN resources remain inaccessible; separately verify guest-to-guest isolation on your APs.

## Optimizations & Improvements

- Mobile-friendly login and balance dialogs with consistent input styling.
- Dark mode, status colors, and compact multi-day duration display.
- E-wallet instructions and copy-number action.
- Server-side API credentials, token reuse, bounded searches, and request limits.
- Documented pre-authentication, gateway, and EAP exceptions for the balance service.

### Current Limitations

- Voucher entry is manual. Connection-based autofill is parked under `experiments/` and is not used by the service.
- Some per-device voucher timing modes do not expose a shared remaining-time value; the checker reports this rather than inventing a duration.
- Android may close the captive browser after login. Bookmark the standalone balance page in a regular browser.
- Local friendly-domain resolution remains unresolved in this deployment; use the reserved IP until DNS is verified.
- Automatic startup/reboot recovery and comprehensive isolation testing remain deployment tasks. Do not expose the service through public port forwarding.

## Screenshots

OC200 screenshots can be added here after removing voucher codes and private installation details. The interface descriptions above reflect this branch; screenshots from `main` may show a different portal implementation.

## Support

### Join our FB Group

[GConnect App (Omada Voucher Solution)](https://www.facebook.com/groups/1776872022780742)

### Subscribe to our YouTube Channel

[@JDIYMPH](https://www.youtube.com/channel/UC9O3ezuyjS7C6V7-ZAHCQrA)

This is a community integration. Support and API availability depend on controller and device firmware.

## Tech Stack

- **Portal:** HTML, CSS, JavaScript, and jQuery.
- **Balance service:** Node.js built-in HTTP server and fetch; no external npm dependencies.
- **Controller integration:** Local Omada Open API with OAuth client credentials.
- **Setup tools:** PowerShell scripts for site discovery and certificate generation.
