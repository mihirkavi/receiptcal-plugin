# ReceiptCal plugin

**Receipts do the logging.** Connect your own ReceiptCal account to an AI assistant to inspect food logs, request recipe ideas, and prepare confirmed pantry, planning and support actions.

This is the MIT-licensed developer integration, not the ReceiptCal iOS/Android apps or hosted backend. It is distributed directly on GitHub and is **not an approved listing in the OpenAI plugin directory**. A GitHub release does not change host eligibility, approval requirements, service terms or account permissions. Hosted use requires a ReceiptCal account and a client that supports OAuth and Streamable HTTP MCP.

## Connect to the hosted service

MCP endpoint: `https://mcp.receiptcal.com/mcp`

Use your client's custom MCP connection flow, then authenticate in ReceiptCal's browser page. Never paste passwords or tokens into chat. Client and workspace policies can restrict custom connections. For ChatGPT, use a custom MCP connection only where your plan/workspace supports it; this repository does not bypass directory review.

### Codex

Add this GitHub marketplace using a current Codex client:

```sh
codex plugin marketplace add https://github.com/mihirkavi/receiptcal-plugin.git
codex plugin add receiptcal@receiptcal-plugins
```

Open the client's plugin interface, select `receiptcal` from `receiptcal-plugins`, and connect your account. The portable `plugin.json`/`mcp.json` are canonical; `.codex-plugin/plugin.json` supports compatible older clients. Host versions differ; consult [OpenAI's installation documentation](https://developers.openai.com/plugins/build/plugins).

### Claude Code

```sh
claude plugin marketplace add mihirkavi/receiptcal-plugin
claude plugin install receiptcal@receiptcal-plugins
```

Authenticate the ReceiptCal server through the host's MCP connection flow. See [Claude marketplace documentation](https://code.claude.com/docs/en/plugin-marketplaces).

## Develop locally

Node.js 22 or later is required. No backend source checkout is needed.

```sh
git clone https://github.com/mihirkavi/receiptcal-plugin.git
cd receiptcal-plugin
npm ci
npm run validate
npm run configure:local
```

The generated, ignored `.mcp.local.json` points to the local stdio connector. It is optional; the distributed plugin uses the hosted MCP server. Local account commands include `npm run auth -- login` and `npm run auth -- logout`. Enter credentials only in your own terminal. Local auth uses macOS Keychain where available and a permission-restricted local file fallback; environment credentials are supported for controlled development. Do not commit credentials or generated local configuration.

`src/capabilities.ts` is the typed capability registry; `src/server.ts` implements MCP tools; `src/api-client.ts` calls the versioned ReceiptCal APIs; tests use synthetic data and mocked responses. Extend the registry, add schema and behavior tests, run validation, then open a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Behavior and limits

- Account writes are prepared first; show the preview and obtain explicit approval before `confirm_action`. The account, expiry and single-use checks remain enforced. A few recommendation/quality reads may update derived records.
- Shopping tools prepare retailer handoffs, never purchases. Nutrition is estimated, with provenance and uncertainty, and is not medical advice.
- Camera, HealthKit/Health Connect permission flows and live voice capture remain native app features. The optional local connector can upload receipt files from configured allowed roots; default roots are its working directory and Downloads. Restrict `RECEIPTCAL_ALLOWED_FILE_ROOTS` to a dedicated test directory.
- API protocol versions are compatibility paths, not app version numbers. Some source capabilities depend on service rollout. V6 community recipes remain gated; a tool existing in source does not prove production availability. Do not retry a disabled capability through older routes.
- Source tests and protocol checks do not certify a live authenticated journey in every host. See [VALIDATION.md](VALIDATION.md).

## Privacy, support and licensing

[Service privacy](https://mcp.receiptcal.com/privacy) · [Service terms](https://mcp.receiptcal.com/terms) · [Security reporting](SECURITY.md)

File code bugs with synthetic reproduction steps in [GitHub issues](https://github.com/mihirkavi/receiptcal-plugin/issues). Never include receipts, health details, chats, account identifiers, tokens or screenshots containing personal data. Account-specific reports belong in ReceiptCal's private support flow.

The MIT license covers this repository. It does not grant rights to the private app/backend, customer data, third-party content, or ReceiptCal trademarks. The hosted service retains its own terms and availability limits. This release is not published to npm or the MCP Registry.
