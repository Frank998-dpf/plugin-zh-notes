# 0.6.6

- Let free translation fill missing Chinese plugin names as well as descriptions, while keeping original names visible.
- Include plugins with an existing Chinese description but no Chinese name in the completion list; reuse existing descriptions to save translation quota.
- Preserve personal notes and existing Chinese aliases. Keep completed descriptions when name translation fails, and explain untranslated brand names or abbreviations in the editor.
- Update completion labels and help text. Continue using the existing translation service with no additional providers or dependencies.

# 0.6.5

- Update 8,833 offline Chinese plugin aliases and descriptions from the supplied revised translation list, while retaining previously reviewed overrides and personal notes.
- Remove the repeated Obsidian review-status sentence from remaining offline descriptions.
- Correct additional product names, technical terms, and unclear aliases, including Granola, Kindle, MathVoice, and video aspect ratios.
- Retain the plugin-list sorting and viewport fixes published in 0.6.4.

# 0.6.4

- Keep the installed-plugin list at the same position after confirming uninstall from a native icon button.
- Continue viewport restoration briefly after Obsidian removes the plugin row.

# 0.6.3

- Keep the installed-plugin list in place when uninstalling a plugin, including after the confirmation dialog closes.
- Preserve the sidebar scroll position during the resulting list update.

# 0.6.2

- Expand offline Chinese references from 6,329 to 9,754 entries, covering all 9,741 plugins with more than 10 cumulative downloads in the 2026-11-02 official-directory snapshot and retaining 13 earlier references outside that selection.
- Add 3,425 descriptions and aliases written from official plugin introductions, with consistent Obsidian terms and preserved service requirements; keep personal notes and generated caches as higher-priority data.
- Remove repeated original names from displayed aliases, retain inline accented aliases in the installed list, and simplify the sidebar sorting label.
- Hide generated-source status rows in the installed list and omit recognized repetitive description tails; original saved data and editor provenance remain available.
- Retry untranslated multiword names by translating their parts, normalize Vault terminology, preserve an existing alias when translation fails, and report partial completion explicitly.
- Add coverage and translation regression checks. No new runtime dependencies; desktop Obsidian 1.14.5 or newer remains required.

# 0.6.1

- Rename the plugin to Extension Index (插件索引) while keeping the existing plugin ID and user data.

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
