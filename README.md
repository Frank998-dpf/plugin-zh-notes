# 插件中文备注 · Chinese Notes

Add Chinese aliases, short explanations, and personal notes to installed community plugins in Obsidian's native plugin list.

为「设置 → 第三方插件 → 已安装插件」添加中文别名、用途说明和个人备注。保留原始英文名称，通过名称旁的小铅笔编辑中文内容。

## Features / 功能

- **Offline references:** 6,329 bundled Chinese aliases and explanations. The text data is embedded in `main.js`; no extra download is needed.
- **Personal notes:** your own aliases and descriptions take priority over generated caches and bundled references.
- **Optional online translation:** fill missing Chinese descriptions without an API account using MyMemory.
- **Optional AI analysis:** use an OpenAI-compatible Chat Completions endpoint to generate more detailed explanations from public plugin metadata and author README excerpts.
- **Small edit icon:** a subtle pencil beside each plugin name. Original descriptions remain available in the expandable original-text section.

内置资料经过全量规则清理和重点条目修订，仍可能存在错译或过时内容，不代表逐条人工精译或已实测所有第三方插件。

## Requirements / 运行要求

- Obsidian **1.14.5 or later** on desktop. Mobile support has not been verified and is not declared.
- Chinese interface and Chinese generated output. Plugin-list integration uses native settings DOM and may require adaptation after future Obsidian updates.
- No runtime dependencies, telemetry, account requirement for offline use, or hosted backend operated by this project.

## Install / 安装

Community-store availability is shown on the [directory listing](https://community.obsidian.md/plugins/plugin-zh-notes). If the entry is still under review, use a published GitHub release for manual installation.

For manual installation, download `main.js`, `manifest.json`, and `styles.css` from the same published GitHub release. Put them in `<your vault configuration directory>/plugins/plugin-zh-notes/`, reload the plugin list, and enable it. When updating, preserve your existing `data.json`.

Do not treat a draft release or this repository's default branch as a published installable version. Release tags use the exact manifest version, without a `v` prefix.

## Use / 使用方法

1. Open **Settings → Community plugins → Installed plugins**. 中文别名和说明直接显示在已安装列表中。
2. Click the small pencil next to a plugin name to edit your alias and description. Restore defaults through the same editor when needed.
3. Open **Settings → Chinese Notes → 免费翻译** to fill only missing descriptions. Existing personal notes are preserved.
4. For AI, choose **AI 分析**, select a provider and model, enter your API key, and click **保存并测试**. After a successful test, click **开始分析**.

AI provider presets include DeepSeek, Qwen (Beijing), GLM, SiliconFlow, Kimi (China), OpenAI, local Ollama, and a custom compatible endpoint. The base URL is under advanced options. Model names and account permissions can change; a custom model ID can be entered.

停止按钮会阻止后续请求并丢弃迟到结果；已经发出的请求仍可能在服务商端完成和计费。已有生成缓存优先于新版内置资料；需要查看新版预置时，通过编辑窗口恢复预置。

## Network use, costs and privacy / 联网、费用与隐私

Offline references and personal editing work without network requests. Network actions occur only when you explicitly request translation, AI analysis, or an AI connection test.

| Service | Purpose | Data sent |
|---|---|---|
| `api.mymemory.translated.net` | Optional anonymous English-to-Chinese translation | Plugin name and public/local manifest description; no API key |
| `raw.githubusercontent.com` | Read the official community plugin catalog | A request for the public catalog; not an uploaded inventory of installed plugins |
| `api.github.com` | Fetch a plugin author's public README for AI analysis | The public repository path of the target plugin |
| Your selected AI endpoint | Optional analysis or connection test | Plugin ID, name, version, description and at most 6,000 characters of README excerpt; a connection test sends a short synthetic prompt |

Cloud AI presets connect to `api.deepseek.com`, `dashscope.aliyuncs.com`, `open.bigmodel.cn`, `api.siliconflow.cn`, `api.moonshot.cn`, or `api.openai.com`. Ollama uses your local `localhost` service. A custom endpoint sends the same analysis payload to the host you configure. Remote API connections require HTTPS; HTTP is allowed only for local endpoints.

**The plugin does not read or send your note contents or personal plugin annotations for translation or AI analysis.** It reads installed plugin manifests from the vault's own configuration directory. It does not access files outside the vault. Normal IP address and HTTP metadata are visible to the remote services you contact.

**Costs:** the plugin itself is free. Optional AI services may require an account, API key, and payment; a connection test may incur a small API charge. For the official directory, the appropriate payment classification is **Optional payment**. Existing ChatGPT subscriptions do not necessarily include API credit.

MyMemory documents an anonymous allowance of 5,000 characters per day. The plugin applies a conservative local budget of 4,500 characters per vault per UTC day. The service may count shared IP traffic differently; this is not a guarantee of available quota. Failed requests and rate limits preserve existing data.

Personal notes, generated caches, provider settings, key references, and translation-budget records are stored in this plugin's `data.json`. API key values are stored using Obsidian SecretStorage, not plaintext fields in that JSON file. SecretStorage is managed by Obsidian and is not a per-plugin security sandbox or a cross-device synchronization guarantee. Re-enter AI keys on another computer when necessary.

Service policies: [MyMemory terms](https://mymemory.translated.net/doc/usagelimits.php), [GitHub privacy](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). Your chosen AI provider's data handling also applies. There is no project-operated telemetry or translation proxy.

## Compatibility and data / 兼容与数据

Personal notes → generated cache → bundled reference is the lookup priority. Upgrading preserves existing `data.json`; schema-1 notes are read compatibly and migrate only on a subsequent save. Back up `data.json` before downgrading or deleting the plugin folder. This project does not implement cross-vault synchronization.

The left settings navigation keeps original plugin names. Native plugin search does not search the added Chinese annotations. Compatibility with other plugins that rewrite the same settings list is not guaranteed. The runtime does not install or update itself or other plugins.

## Development / 开发

This is a plain CommonJS JavaScript plugin. `main.js` is both the reviewed source and the runtime asset; there is no transpilation, minification step, or generated executable download. The compact array near the top is the bundled text reference dataset, not obfuscated program logic.

```bash
npm ci
npm run build
npm test
```

`build` checks the syntax of the committed runtime source and does not modify it. Tests use Node's built-in runner. Node 22 or later is recommended; no npm runtime dependencies are required. CI verifies tests and that build verification leaves release assets unchanged. Release automation creates **drafts only**.

Desktop validation uses a dedicated QA vault with disabled manifest-only fixture plugins. Automated checks do not substitute for the official preview scan or physical-device tests.

## License and attribution / 许可与署名

Original plugin implementation and local curation: **Copyright (c) 2026 Frank998-dpf**, licensed under [MIT](LICENSE).

The bundled Chinese reference dataset derives from [miaoziguan/obsidian-chinese-plugin-market](https://github.com/miaoziguan/obsidian-chinese-plugin-market), fixed commit `c14006e74c678cf63174ae4de72a2a8e9832e253`, under MIT, **Copyright (c) 2024 羽鳞君 (miaoziguan)**. Dataset fields were selected, cleaned, and partly rewritten against the official community catalog. No upstream plugin runtime code was copied. Full third-party notice: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The complete upstream MIT notice is also embedded in `main.js`, so it is retained when Obsidian installs only the standard runtime assets.

## Support / 反馈

Report bugs or specific translation corrections in [GitHub Issues](https://github.com/Frank998-dpf/plugin-zh-notes/issues). Include the target plugin ID and a short description; remove API keys, personal paths, and private note content before attaching logs or screenshots.
