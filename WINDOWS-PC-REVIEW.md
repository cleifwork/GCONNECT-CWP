# Windows host readiness review

Reviewed from the operator's supplied PowerShell output on October 30, 2026 (Asia/Manila). This is a snapshot, not a live inspection. No Windows settings were changed by this review.

| Check | Evidence | Assessment |
|---|---|---|
| Node executable | Reported v26.13.0, Program Files/nodejs/node.exe | Running the service successfully; release/support status was not independently verified |
| Power scheme | Balanced | Keep; High Performance is unnecessary for this small service |
| AC sleep and hibernate | Both zero (Never) | Suitable for continuous operation while plugged in |
| Battery sleep/hibernate | 7200 / 10800 seconds | 2-hour sleep / 3-hour hibernate on battery; reasonable protection, not uninterrupted battery operation |
| Network | WiFi 192.168.30.21, gateway 192.168.30.1 | Correct service host address; DHCP reservation still needs separate confirmation |
| Network profile | Public | Keep unless there is another specific reason to change; the narrow rule already works with this profile |
| Listener | 0.0.0.0 TCP 3080, node process | Running and accepts IPv4 on all interfaces; firewall remains important |
| Working set | 57,925,632 bytes | Approximately 55.2 MiB at this instant; not a peak or leak assessment |
| Firewall | Enabled inbound Allow, TCP 3080, local service IP, remote guest /24, Profile Any | Correct narrow destination/port/subnet scope for this deployment; other firewall rules were not audited |
| Scheduled task search | No matches | No matching startup task found; other startup mechanisms were not inspected |
| Certificate file | Present | Presence verified, not certificate contents/expiry |
| Persistent certificate environment | User and Machine values absent | Interactive session configuration currently needed; task launcher should set the path explicitly |
| HTTP endpoint | 405 / Use POST | Local HTTP connectivity works; this particular check does not exercise controller TLS/authentication |

## Priority improvements

1. Configure unattended startup and failure recovery. Current evidence does not demonstrate automatic startup after reboot or logout. Set the certificate variable in a launcher used by the scheduled task rather than depending on the interactive terminal. Run under a restricted account with access to `.env` and the PEM. Stop the manual instance before starting a task, to avoid port conflicts. Verify a reboot without manually opening the service.
2. Confirm a DHCP reservation for the PC. Its IP appears in the portal URL, Windows firewall rule, gateway ACL destination, pre-authentication exception, and DNS/bookmark/landing URLs. If changed, follow the complete IP-change checklist in SETUP-GUIDE.md.
3. Keep AC sleep/hibernate disabled. A laptop lid-close action can still suspend the PC; inspect it separately if applicable. Keep safe battery behavior. Screen-off may remain enabled.
4. Complete production guest isolation. The working test SSID deliberately has Guest Network unchecked; it should not be deployed broadly without equivalent restrictions and a narrow service exception.
5. Keep Windows and Node updated, schedule restarts, and verify recovery. Do not disable security updates to achieve uptime. Wired Ethernet and a UPS are optional reliability improvements, not prerequisites. Changing adapters/IPs requires coordinated firewall/portal changes.

No High Performance power scheme, global firewall disable, Public-to-Private profile switch, or global TLS-verification bypass is needed.

## Additional read-only checks

```powershell
# Lid-close behavior (laptops); AC index 0 means Do nothing.
powercfg /query SCHEME_CURRENT SUB_BUTTONS LIDACTION

# Existing PEM identity and expiry, using the same Node runtime.
node -e "const fs=require('fs'),c=require('crypto');const x=new c.X509Certificate(fs.readFileSync('C:/GConnect/voucher-status-service/oc200-cert.pem'));console.log({subject:x.subject,subjectAltName:x.subjectAltName,validTo:x.validTo})"
```

These checks do not audit all restart triggers, WiFi power management, Home Assistant configuration, antivirus, or firmware power-loss recovery. Avoid altering shared host settings without considering Home Assistant's availability too.

## Address reservation update — October 30

The user subsequently reserved and received `192.168.30.30` via DHCP. The inbound VLAN 10 rule was verified as enabled, TCP 3080, local address `192.168.30.30`, remote subnet `192.168.10.0/24`. The earlier `.21` address above is the original audit snapshot.

The user confirmed restored access on `.30.30` after updating the network exceptions. A local GET returned HTTP 405 “Use POST” and the listener was `0.0.0.0:3080`; the phone initially stalled, so the issue was not established as portal cache.
