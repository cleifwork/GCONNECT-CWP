# Documentation maintenance

When changing this project's portal, voucher-status service, installation process, or deployment configuration, review and update the relevant documentation in the same task.

- `SETUP-GUIDE.md` is the primary community installation and troubleshooting guide.
- `voucher-status-service/README.md` is the concise Windows service setup reference. Keep commands, configuration names, supported Node versions, certificate instructions, and API limitations consistent between the two files and the implementation.
- Preserve the distinction between locally tested behavior, live OC200/phone verification, proposed work, and unfinished production configuration. Never promote an untested assumption into a verified result.
- Document changes to endpoint URLs, CORS origins/ports, firewall scope, pre-authentication access, certificate lifecycle, startup behavior, and voucher timing semantics when relevant.
- Use clearly labeled example addresses and placeholders for IDs and credentials. Never copy real secrets, tokens, configured .env content, private keys, or PFX data into documentation or release packages.
- Prefer editing existing sections over accumulating repeated troubleshooting notes. Preserve useful fixes already established in this deployment.
- Before handing off setup changes, check documented commands against the current scripts/configuration. Record verification limits honestly.
- Keep guide and service source files out of the controller's static portal ZIP. Do not include credentials or certificate private material in any shared archive.
- Documentation maintenance is task-driven; do not create recurring automation, start a background agent, deploy changes, or modify controller/network settings merely to update documentation.

For a documentation-only request, inspect the current implementation and update the existing guide directly. A separate agent is optional and requires explicit user authorization; no resident process is needed.
