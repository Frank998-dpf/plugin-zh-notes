# 0.6.0

- Show each installed plugin's original name and Chinese alias on separate lines in the settings sidebar.
- Add independent name and plugin-folder creation-time sorting for the sidebar and installed list.
- Add manual groups, group assignment, collapse, and alias-aware search to the installed list.
- Keep the current plugin row in place when an enable/disable action redraws the native settings list.
- Preserve existing notes and settings. Folder creation time is not an installation timestamp and may change after copying or restoring a vault.

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
