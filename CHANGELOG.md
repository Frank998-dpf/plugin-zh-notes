# 0.5.2

- Fix clean-environment build verification: keep the authoritative source in `src/plugin.js` and generate `main.js` deterministically with no added dependencies.
- Add a regression test that rebuilds with no existing runtime asset.
- Preserve plugin behavior, offline reference data, personal notes, and API settings.

# 0.5.1

Initial community-directory submission. Community installation becomes available after directory approval.

- Add Chinese aliases, explanations, and editable personal notes to the native installed-plugin list.
- Include 6,329 offline reference entries, optional anonymous translation, and configurable AI analysis.
- Preserve personal notes and existing generated caches during upgrades.
- Embed the full upstream MIT notice in the standard `main.js` installation asset.
- Add the project MIT license, network and cost disclosures, consistent release metadata, and reproducible syntax/test checks.
- Use the native Obsidian settings-heading component while retaining the existing layout.

The plugin itself is free. Optional AI providers may require payment. This release has not been tested on mobile.
