# Extension Index

插件索引

This plugin helps you view and organize your installed third‑party Obsidian plugins. It keeps the original plugin names while displaying their Chinese aliases and descriptions.

用于查阅与整理你已安装的 Obsidian 第三方插件，保留插件原名，同步展示中文别名与功能说明；支持设置分组和排序规则，内置 10000+插件释意思，也支持自定义和AI批量修改。

![已安装插件列表：中文别名、独立排序与手动分组](docs/01-封面.png)

*Obsidian 1.14.5 桌面版中的实际界面。截图来自独立测试库，示例插件和分组仅用于演示。*

## 三步上手 / See it in action

1. 打开「设置 → 第三方插件 → 已安装插件」，直接查看原名旁的中文别名和下方的用途说明。左侧插件入口也会分行显示原名与别名。
2. 在已安装列表搜索原名或中文别名；按需要调整左右两处的排序，或开启「分组显示」并将插件归入自己的分组。
3. 点击插件名称旁的小铅笔，写下自己的别名和备注。个人修改优先显示，也可以在编辑窗口恢复预置内容。
4. 在本插件的设置详情中，可以使用免费的翻译功能和配置自己的AI模型，对未翻译的软件补充。

例如，截图中的 `Dataview` 显示为「笔记数据查询」，并被放入「日常工具」分组；这只是测试库里的示例归类，不会预设你的分组。

## 主要功能

- 在侧边栏分行展示插件原名及中文别名；已安装插件列表支持按原名或中文别名搜索，可自定义排序与分组。
- 支持为插件设置自定义别名、备注和分组，也能随时恢复预置内容；个人编辑内容优先级高于自动生成内容与内置资料库。
- 内置 10000+ 条离线中文参考资料。资料可能存在翻译不准确或内容滞后的情况，欢迎通过反馈渠道指正。
- 可按需联网翻译缺失的插件介绍，或是调用你自行配置的 AI 服务解析插件公开文档。相关功能需手动启用，调用 AI 服务可能产生费用。
  
![已安装插件列表：中文别名、独立排序与手动分组](docs/PixPin_2026-11-02_21-50-00.png.png)

*免费翻译只处理缺少中文说明的插件，不覆盖个人备注；AI 分析需要自行配置服务。截图同样来自独立测试库。*

离线资料和个人备注无需联网。本插件不会读取或发送你的笔记正文或个人备注；联网翻译会发送插件名称和描述，AI 分析可附带公开 README 摘录。仅支持 Obsidian 1.14.5 及以上桌面版，界面目前为中文。按时间排序使用插件文件夹的创建时间，它不一定等于安装时间。本插件不负责安装、更新或卸载其他插件。

## Requirements / 运行要求

- Obsidian **1.14.5 or later** on desktop. Mobile support has not been verified and is not declared.
- Chinese interface and Chinese generated output. Plugin-list integration uses native settings DOM and may require adaptation after future Obsidian updates.
- No runtime dependencies, telemetry, account requirement for offline use, or hosted backend operated by this project.

## Install / 安装

Community-store availability is shown on the [directory listing](https://community.obsidian.md/plugins/plugin-zh-notes). If the entry is still under review, use a published GitHub release for manual installation.

For manual installation, download `main.js`, `manifest.json`, and `styles.css` from the same published GitHub release. Put them in `<your vault configuration directory>/plugins/plugin-zh-notes/`, reload the plugin list, and enable it. When updating, preserve your existing `data.json`.

Do not treat a draft release or this repository's default branch as a published installable version. Release tags use the exact manifest version, without a `v` prefix.

## Use / 使用方法

1. Open **Settings → Community plugins → Installed plugins**. 中文别名和说明直接显示在已安装列表中；左侧插件设置入口显示原名和中文别名。
2. 左右两处可分别选择排序。已安装插件列表支持按中文别名搜索；打开「分组显示」，通过「管理分组」新建分组，并在插件行选择归属。
3. Click the small pencil next to a plugin name to edit your alias and description. Restore defaults through the same editor when needed.
4. Open **Settings → Extension Index → 免费翻译** to fill only missing descriptions. Existing personal notes are preserved.
5. For AI, choose **AI 分析**, select a provider and model, enter your API key, and click **保存并测试**. After a successful test, click **开始分析**.

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

The left settings navigation keeps each original plugin name on the first line and shows its Chinese alias below. The Installed plugins list has a separate search box that matches original names and Chinese aliases; Obsidian's native search may not match the added aliases. Compatibility with other plugins that rewrite the same settings list is not guaranteed. The runtime does not install or update itself or other plugins.

## Development / 开发

This is a plain CommonJS JavaScript plugin. `src/plugin.js` is the authoritative source. `npm run build` checks it and copies its exact bytes to the runtime asset `main.js`, including the embedded MIT notices. There is no transpilation, minification, or executable download. The compact array near the top is the bundled text reference dataset, not obfuscated program logic.

```bash
npm ci
npm run build
npm test
```

`build` can regenerate `main.js` from a clean checkout even when the output is absent. Tests use Node's built-in runner, including a clean-directory regeneration check. Node 22 or later is recommended; no npm runtime dependencies are required. CI verifies tests and that regenerated release assets match the committed bytes. Release automation creates **drafts only**.

Desktop validation uses a dedicated QA vault with disabled manifest-only fixture plugins. Automated checks do not substitute for the official preview scan or physical-device tests.

## License and attribution / 许可与署名

Original plugin implementation and local curation: **Copyright (c) 2026 Frank998-dpf**, licensed under [MIT](LICENSE).

The bundled Chinese reference dataset derives from [miaoziguan/obsidian-chinese-plugin-market](https://github.com/miaoziguan/obsidian-chinese-plugin-market), fixed commit `c14006e74c678cf63174ae4de72a2a8e9832e253`, under MIT, **Copyright (c) 2024 羽鳞君 (miaoziguan)**. Dataset fields were selected, cleaned, and partly rewritten against the official community catalog. No upstream plugin runtime code was copied. Full third-party notice: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The complete upstream MIT notice is also embedded in `main.js`, so it is retained when Obsidian installs only the standard runtime assets.

## Support / 反馈

Report bugs or specific translation corrections in [GitHub Issues](https://github.com/Frank998-dpf/plugin-zh-notes/issues). Include the target plugin ID and a short description; remove API keys, personal paths, and private note content before attaching logs or screenshots.
