# Distribution decisions

Researched October 6, 2026 against primary sources.

- [OpenAI packaging](https://developers.openai.com/plugins/build/plugins): use portable Agent Plugins manifests, relative paths and an explicit repository marketplace. Compatibility manifests remain supported; repository distribution is separate from directory approval.
- [Agent Plugins MCP schema](https://agent-plugins.org/schemas/1.0.0/mcp.schema.json): portable HTTP transport is `streamable-http`; compatibility host configs use `http`.
- [Claude marketplaces](https://code.claude.com/docs/en/plugin-marketplaces): publish an explicit marketplace manifest, relative plugin source, and installation instructions.
- [GitHub MCP server](https://github.com/github/github-mcp-server) and [Stripe AI tooling](https://github.com/stripe/ai): public source and contribution/licensing guidance can coexist with separately operated authenticated services. We follow that separation, not their product-specific capabilities.
- [MCP Registry](https://registry.modelcontextprotocol.io/docs): registry publication is an additional distribution step, not automatic from a GitHub release. This release makes no registry-listing claim.

Use semantic version tags, reproducible lockfiles, source bundles/checksums, synthetic tests, a security contact and explicit compatibility limits. Export only the connector from the private product repository. Never change the private repository's visibility or export its history.
