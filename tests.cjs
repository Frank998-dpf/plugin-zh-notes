"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
let requestHandler = async () => { throw new Error("测试未配置网络响应"); };

const context = {
  module: { exports: {} },
  URL, TextEncoder, setTimeout, clearTimeout,
  require(name) {
    assert.equal(name, "obsidian");
    return { Plugin: class {}, Modal: class {}, Notice: class {}, PluginSettingTab: class {},
      SecretComponent: class { setValue() { return this; } onChange() { return this; } },
      requestUrl: (options) => requestHandler(options) };
  },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "main.js"), "utf8") +
  "\nmodule.exports.testAPI = { BUILTINS, managementData, sortPlugins, rowEnabled, parseData, getNote, chunks, endpointUrl, aiNote, fingerprint, ChineseNotesSettings, PROVIDERS, settingsSignature, needsTranslation };", context);
const Plugin = context.module.exports;
const { parseData, getNote } = Plugin.testAPI;
const { chunks, endpointUrl, aiNote, fingerprint } = Plugin.testAPI;
const { ChineseNotesSettings } = Plugin.testAPI;
const { PROVIDERS, settingsSignature, needsTranslation } = Plugin.testAPI;

function plugin() {
  const result = new Plugin();
  result.data = parseData(null);
  result.writeQueue = Promise.resolve();
  result.refreshAll = () => {};
  result.saveData = async () => {};
  result.app = { secretStorage: { getSecret: () => null } };
  result.readManifest = async () => (await result.installedManifests())[0];
  return result;
}

test("官方清理输出文件后，构建仍可从独立源码精确重建并保留许可", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-zh-build-"));
  try {
    fs.mkdirSync(path.join(temp, "src"));
    fs.mkdirSync(path.join(temp, "scripts"));
    fs.copyFileSync(path.join(__dirname, "src", "plugin.js"), path.join(temp, "src", "plugin.js"));
    fs.copyFileSync(path.join(__dirname, "scripts", "build.cjs"), path.join(temp, "scripts", "build.cjs"));
    assert.equal(fs.existsSync(path.join(temp, "main.js")), false);
    execFileSync(process.execPath, [path.join(temp, "scripts", "build.cjs")], { cwd: temp });
    assert.deepEqual(fs.readFileSync(path.join(temp, "main.js")), fs.readFileSync(path.join(__dirname, "main.js")));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("商店标准安装资产保留完整第三方 MIT 许可，不依赖额外文件安装", () => {
  const runtime = fs.readFileSync(path.join(__dirname, "main.js"), "utf8");
  const licenseNotice = runtime.slice(0, runtime.indexOf('"use strict";'));
  assert.match(licenseNotice, /Copyright \(c\) 2024 羽鳞君 \(miaoziguan\)/);
  assert.match(licenseNotice, /Permission is hereby granted, free of charge/);
  assert.match(licenseNotice, /THE SOFTWARE IS PROVIDED "AS IS"/);
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "manifest.json"), "utf8"));
  assert.equal(manifest.id, "plugin-zh-notes");
  assert.equal(manifest.name, "Extension Index");
  assert.match(manifest.name, /^[A-Za-z0-9 +()-]+$/);
  assert.doesNotMatch(manifest.name, /plugin|obsidian/i);
  assert.equal(manifest.author, "Frank998-dpf");
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.ok(manifest.description.length <= 250 && manifest.description.endsWith("."));
  const packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
  const versions = JSON.parse(fs.readFileSync(path.join(__dirname, "versions.json"), "utf8"));
  assert.equal(packageInfo.version, manifest.version);
  assert.equal(versions[manifest.version], manifest.minAppVersion);
});

test("新安装可使用预置，未知插件为空", () => {
  const data = parseData(null);
  assert.equal(getNote(data, "dataview").alias, "笔记数据查询");
  assert.equal(getNote(data, "unknown").description, "");
});

test("扩充的离线资料具有中文别名和说明，长度合法且没有已知翻译错误残留", () => {
  const { BUILTINS } = Plugin.testAPI;
  assert.ok(BUILTINS.size >= 6000);
  for (const [id, [alias, description]] of BUILTINS) {
    assert.ok(id.trim() && alias.trim() && description.trim(), id);
    assert.ok(alias.length <= 80 && description.length <= 800, id);
    assert.match(alias, /[\u3400-\u9fff]/, id);
    assert.match(description, /[\u3400-\u9fff]/, id);
    assert.doesNotMatch(alias + description, /MYMEMORY WARNING|QUERY LENGTH|translation failed|降价|乳胶|保管库|保险库|法学硕士|[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/i, id);
    assert.doesNotMatch(description, /该插件尚未经 Obsidian 团队人工审核/, id);
  }
});

test("已核对的错译得到修正，音乐语境和功能不明条目正确处理", () => {
  const data = parseData(null);
  assert.equal(getNote(data, "obsidian42-brat").alias, "插件测试版安装");
  assert.equal(getNote(data, "markdown-prettifier").alias, "Markdown 格式整理");
  assert.equal(getNote(data, "obsidian-leaflet-plugin").alias, "Leaflet 交互地图");
  assert.equal(getNote(data, "auto-journal").alias, "日记自动补建");
  assert.match(getNote(data, "midi-logger").description, /音符/);
  assert.match(getNote(data, "tegaki").description, /发送至外部API/);
  assert.equal(getNote(data, "granite").description, "辅助强化目标管理并改进笔记。");
  assert.equal(getNote(data, "granola-sync-plus").alias, "Granola AI 会议笔记同步");
  assert.match(getNote(data, "zoyclip").description, /9:16 竖屏短视频/);
  assert.match(getNote(data, "blinks").description, /块链接/);
});

test("新增内置条目仍服从个人备注与已有生成缓存的优先级", () => {
  const data = parseData(null);
  data.cache["obsidian42-brat"] = { alias: "我的 AI 别名", description: "我的 AI 说明" };
  assert.equal(getNote(data, "obsidian42-brat").alias, "我的 AI 别名");
  data.entries["obsidian42-brat"] = { alias: "我的备注", description: "我的用途" };
  assert.equal(getNote(data, "obsidian42-brat").alias, "我的备注");
});

test("旧版备注迁移到 schema2，个人文字完整保留且不自动写磁盘", () => {
  const restored = parseData({ schemaVersion: 1, entries: { dataview: { alias: "我的查询", description: "工作记录" } } });
  assert.equal(restored.schemaVersion, 2);
  assert.equal(restored.entries.dataview.alias, "我的查询");
  assert.equal(restored.settings.endpoint, "");
  assert.equal(Object.keys(restored.cache).length, 0);
  assert.throws(() => parseData({ schemaVersion: 99, entries: {} }));
});

test("原生声明式设置 render 返回合法清理值，重绘时不会把 Setting 当函数", () => {
  const p = plugin();
  const tab = new ChineseNotesSettings(p.app, p);
  tab.app = p.app;
  let removed = 0;
  tab.renderPage = (root) => { tab.refs = { root }; };
  const setting = { settingEl: { classList: { add() {} }, append() {}, ownerDocument: { createElement() { return { remove() { removed++; } }; } } } };
  for (const definition of tab.getSettingDefinitions()) {
    const cleanup = definition.render(setting);
    assert.ok(cleanup === undefined || typeof cleanup === "function", definition.name);
    if (cleanup) cleanup();
  }
  assert.equal(removed, 1);
  assert.equal(tab.refs, null);
});

test("八个服务预置提供独立名称及可校验地址", () => {
  assert.equal(PROVIDERS.length, 8);
  assert.equal(new Set(PROVIDERS.map(p => p.id)).size, 8);
  for (const provider of PROVIDERS) if (provider.endpoint) {
    assert.equal(endpointUrl(provider.endpoint), provider.endpoint);
  }
});

test("旧自定义配置及密钥引用迁移到对应档案，不丢失个人备注", () => {
  const p = plugin();
  p.data.settings = { endpoint: "https://custom.example/v1/chat/completions", model: "old-model", secretId: "old-key" };
  p.data.entries.a = { alias: "旧名称", description: "旧说明" };
  const restored = parseData(JSON.parse(JSON.stringify(p.data)));
  assert.equal(restored.settings.provider, "custom");
  assert.equal(restored.profiles.custom.secretId, "old-key");
  assert.equal(restored.entries.a.alias, "旧名称");
});

test("切换服务商不会把前一家密钥带入新服务商草稿", () => {
  const p = plugin();
  p.data.settings = { provider: "deepseek", endpoint: PROVIDERS[0].endpoint, model: "deepseek-flash", secretId: "deepseek-key" };
  const tab = new ChineseNotesSettings(p.app, p);
  tab.currentProvider = "qwen";
  assert.equal(tab.getDraft().secretId, "");
  assert.equal(tab.getDraft().model, "qwen-plus");
  tab.currentProvider = "deepseek";
  assert.equal(tab.getDraft().secretId, "deepseek-key");
});

function mockSecrets(p) {
  const secrets = new Map();
  p.app.secretStorage = { setSecret: (id, value) => secrets.set(id, value), getSecret: id => secrets.get(id) || null };
  return secrets;
}

test("不同服务档案分别保存，普通数据中不出现填写的密钥", async () => {
  const p = plugin();
  mockSecrets(p);
  await p.saveProfile({ provider: "deepseek", endpoint: PROVIDERS[0].endpoint, model: "deepseek-flash", secretId: "" }, "qa-first-key");
  const firstRef = p.data.settings.secretId;
  await p.saveProfile({ provider: "qwen", endpoint: PROVIDERS[1].endpoint, model: "qwen-plus", secretId: "" }, "qa-second-key");
  assert.equal(p.data.profiles.deepseek.secretId, firstRef);
  assert.notEqual(p.data.settings.secretId, firstRef);
  assert.ok(!JSON.stringify(p.data).includes("qa-first-key"));
  assert.ok(!JSON.stringify(p.data).includes("qa-second-key"));
});

test("高级地址换到其他主机时拒绝沿用原密钥", async () => {
  const p = plugin(); mockSecrets(p);
  await p.saveProfile({ provider: "custom", endpoint: "https://first.example/v1", model: "m", secretId: "" }, "qa-origin-key");
  await assert.rejects(p.saveProfile({ ...p.data.settings, endpoint: "https://second.example/v1" }), /重新填写/);
  assert.ok(p.data.settings.endpoint.startsWith("https://first.example"));
});

test("连接测试通过后可启用 AI，重载配置仍能识别测试结果", async () => {
  const p = plugin(); mockSecrets(p);
  await p.saveProfile({ provider: "custom", endpoint: "http://127.0.0.1:8787/v1", model: "test-model", secretId: "" });
  assert.equal(p.isAIReady(), false);
  p.http = async () => ({ json: { choices: [{ message: { content: '{"alias":"连接","description":"连接正常。"}' } }] } });
  await p.testConnection();
  assert.equal(p.isAIReady(), true);
  p.data = parseData(JSON.parse(JSON.stringify(p.data)));
  assert.equal(p.isAIReady(), true);
  assert.equal(p.data.connection.signature, settingsSignature(p.data.settings));
});

test("测试期间配置已变更时不把旧请求标为连接成功", async () => {
  const p = plugin();
  await p.saveProfile({ provider: "custom", endpoint: "http://localhost:8787/v1", model: "old", secretId: "" });
  let resume;
  p.http = async () => new Promise(resolve => { resume = () => resolve({ json: { choices: [{ message: { content: '{"alias":"连接","description":"连接正常。"}' } }] } }); });
  const pending = p.testConnection();
  while (!resume) await new Promise(resolve => setImmediate(resolve));
  await p.saveSettings({ ...p.data.settings, model: "new" });
  resume();
  await assert.rejects(pending, /变更/);
  assert.equal(p.isAIReady(), false);
});

test("连接失败区分密钥和额度，且不回显服务返回的敏感原文", async () => {
  const p = plugin();
  requestHandler = async () => ({ status: 401, json: { error: { message: "invalid secret-value" } } });
  await assert.rejects(p.http({ url: "https://example.com" }, { cancelled: false }), error => /API Key/.test(error.message) && !error.message.includes("secret-value"));
  requestHandler = async () => ({ status: 429, json: { error: { code: "insufficient_quota" } } });
  await assert.rejects(p.http({ url: "https://example.com" }, { cancelled: false }), /余额或额度/);
});

test("已提供中文原始介绍的插件无需重复联网翻译", () => {
  const p = plugin();
  assert.equal(needsTranslation(p.data, { id: "zh-plugin", description: "这是一个 AI 笔记编辑工具。" }), false);
  assert.equal(needsTranslation(p.data, { id: "en-plugin", description: "Edit notes." }), true);
});

test("自动缓存优先于预置，个人修改优先于自动缓存", async () => {
  const p = plugin();
  p.data.cache.dataview = { alias: "AI 别名", description: "生成说明" };
  assert.equal(getNote(p.data, "dataview").alias, "AI 别名");
  await p.saveNote("dataview", { alias: "手动别名", description: "手动说明" });
  assert.equal(getNote(p.data, "dataview").alias, "手动别名");
  await p.saveNote("dataview", null);
  assert.equal(p.data.cache.dataview, undefined);
  assert.equal(getNote(p.data, "dataview").alias, "笔记数据查询");
});

test("损坏的生成缓存可丢弃，但不清空个人备注", () => {
  const data = parseData(null);
  data.entries.a = { alias: "甲", description: "保留" };
  data.cache.b = { alias: 8, description: "损坏", kind: "ai", source: "", fingerprint: "", createdAt: 1 };
  const restored = parseData(JSON.parse(JSON.stringify(data)));
  assert.equal(restored.entries.a.description, "保留");
  assert.equal(restored.cache.b, undefined);
});

test("翻译分段按 UTF8 字节限制，中文和 emoji 不被截断", () => {
  const source = "插件🙂abc".repeat(120);
  const parts = chunks(source);
  assert.equal(parts.join(""), source);
  for (const part of parts) assert.ok(Buffer.byteLength(part, "utf8") <= 450);
});

test("AI 地址规范化，拒绝明文远程连接和地址内凭据", () => {
  assert.equal(endpointUrl("https://example.com/v1"), "https://example.com/v1/chat/completions");
  assert.equal(endpointUrl("http://127.0.0.1:8787/v1/chat/completions"), "http://127.0.0.1:8787/v1/chat/completions");
  for (const address of ["http://example.com/v1", "https://user:pass@example.com", "https://example.com/v1?key=value", "file:///tmp/a"]) {
    assert.throws(() => endpointUrl(address));
  }
});

test("AI 输出只接收受限 JSON 中文字段，拒绝无效返回", () => {
  assert.equal(aiNote('```json\n{"alias":"日历","description":"查看日期。"}\n```').alias, "日历");
  for (const content of ["普通回答", '{"alias":"x","description":"English only"}', '{"alias":null,"description":"中文"}']) {
    assert.throws(() => aiNote(content));
  }
});

test("免费翻译额度在请求前保存，额度不足不发请求", async () => {
  const p = plugin();
  let calls = 0;
  p.http = async () => { calls++; return { json: { responseStatus: 200, responseData: { translatedText: "创建模板" } } }; };
  p.data.usage = { date: new Date().toISOString().slice(0, 10), chars: 4499 };
  await assert.rejects(p.translate("abc", { cancelled: false }), /预算/);
  assert.equal(calls, 0);
  assert.equal(p.data.usage.chars, 4499);
});

test("真实 HTTP 包装不透出包含密钥的底层异常", async () => {
  const p = plugin();
  requestHandler = async () => { throw new Error("secret-content-in-provider-error"); };
  await assert.rejects(p.http({ url: "https://example.com" }, { cancelled: false }), (error) => {
    assert.ok(!error.message.includes("secret-content"));
    return /网络请求失败/.test(error.message);
  });
});

test("翻译返回服务限额错误时不保存成中文内容", async () => {
  const p = plugin();
  p.http = async () => ({ json: { responseStatus: 429, responseData: { translatedText: "MYMEMORY WARNING" } } });
  await assert.rejects(p.translate("Calendar", { cancelled: false }), /额度/);
  assert.equal(Object.keys(p.data.cache).length, 0);
});

const fixtureManifest = { id: "calendar", name: "Calendar", description: "View dates.", version: "1.0" };

test("生成中用户修改备注，自动缓存不能覆盖人工记录", async () => {
  const p = plugin();
  p.installedManifests = async () => [fixtureManifest];
  p.data.cache.calendar = { alias: "日历", description: "" };
  let resume;
  p.translate = async (text) => {
    if (text === fixtureManifest.description) await new Promise((resolve) => { resume = resolve; });
    return "查看日期";
  };
  const pending = p.generateOne("calendar", "translation");
  while (!resume) await new Promise((resolve) => setImmediate(resolve));
  await p.saveNote("calendar", { alias: "我的日历", description: "个人说明" });
  resume(); await pending;
  assert.equal(getNote(p.data, "calendar").description, "个人说明");
  assert.equal(p.data.cache.calendar.kind, "translation");
});

test("停止任务后丢弃迟到的网络结果", async () => {
  const p = plugin();
  p.installedManifests = async () => [fixtureManifest];
  p.data.cache.calendar = { alias: "日历", description: "" };
  let resume;
  p.http = async () => new Promise((resolve) => { resume = () => resolve({ json: { responseStatus: 200, responseData: { translatedText: "查看日期" } } }); });
  const pending = p.generateOne("calendar", "translation");
  while (!resume) await new Promise((resolve) => setImmediate(resolve));
  p.cancelTask(); resume();
  await assert.rejects(pending, /停止/);
  assert.equal(p.data.cache.calendar.description, "");
  assert.equal(p.data.cache.calendar.alias, "日历");
  assert.equal(p.activeRun, null);
});

test("生成期间恢复预置会取消该目标任务，迟到结果不会重新填回", async () => {
  const p = plugin();
  p.installedManifests = async () => [fixtureManifest];
  p.data.cache.calendar = { alias: "日历", description: "" };
  let resume;
  p.http = async () => new Promise((resolve) => { resume = () => resolve({ json: { responseStatus: 200, responseData: { translatedText: "查看日期" } } }); });
  const pending = p.generateOne("calendar", "translation");
  while (!resume) await new Promise((resolve) => setImmediate(resolve));
  await p.saveNote("calendar", null);
  resume();
  await assert.rejects(pending, /停止/);
  assert.equal(p.data.cache.calendar, undefined);
});

test("插件生成过程中更新版本，拒绝保存过期说明", async () => {
  const p = plugin();
  p.installedManifests = async () => [{ ...fixtureManifest, version: "2.0" }];
  p.translate = async () => "日历说明";
  await assert.rejects(p.generate(fixtureManifest, "translation", { cancelled: false }), /更新或移除/);
  assert.equal(p.data.cache.calendar, undefined);
});

test("批量补全跳过人工备注、内置资料和已有缓存", async () => {
  const p = plugin();
  p.data.entries.manual = { alias: "我的", description: "个人" };
  p.data.cache.cached = { alias: "缓存插件", description: "缓存", kind: "translation" };
  p.installedManifests = async () => ["manual", "dataview", "cached", "unknown"].map(id => ({ ...fixtureManifest, id }));
  const generated = [];
  p.generate = async (manifest) => { generated.push(manifest.id); };
  const result = await p.generateBatch("translation");
  assert.equal(generated.join(","), "unknown");
  assert.equal(result.done, 1);
});

test("没有配置 AI 时不发请求；密钥只存在于本次任务内", () => {
  const p = plugin();
  assert.throws(() => p.startRun("ai"), /配置|保存/);
  p.data.settings = { endpoint: "https://example.com/v1/chat/completions", model: "example-model", secretId: "test-key" };
  p.app.secretStorage.getSecret = () => "test-only-secret";
  const run = p.startRun("ai");
  assert.equal(run.key, "test-only-secret");
  assert.ok(!JSON.stringify(p.data).includes("test-only-secret"));
  assert.throws(() => p.startRun("translation"), /已有任务/);
});

test("AI 请求使用配置的模型，缓存可重载且不存 API 密钥", async () => {
  const p = plugin();
  p.data.settings = { endpoint: "https://example.com/v1/chat/completions", model: "sample-model", secretId: "test-key" };
  p.app.secretStorage.getSecret = () => "test-only-secret";
  p.installedManifests = async () => [fixtureManifest];
  p.getCatalog = async () => new Map([["calendar", { repo: "example/calendar", description: "View dates." }]]);
  let body;
  p.http = async (options) => {
    if (options.method === "POST") {
      body = JSON.parse(options.body);
      assert.equal(options.headers.Authorization, "Bearer test-only-secret");
      return { json: { choices: [{ message: { content: '{"alias":"日期日历","description":"查看日期并切换日历。"}' } }] } };
    }
    return { text: "# Calendar\nDisplay dates." };
  };
  const result = await p.generateOne("calendar", "ai");
  assert.match(body.messages[0].content, /突出主要功能/);
  assert.match(body.messages[0].content, /不添加资料不足/);
  assert.equal(body.model, "sample-model");
  assert.ok(body.messages[1].content.includes("Display dates"));
  assert.equal(result.source, "https://github.com/example/calendar");
  assert.equal(result.fingerprint, fingerprint(fixtureManifest));
  assert.equal(parseData(JSON.parse(JSON.stringify(p.data))).cache.calendar.kind, "ai");
  assert.ok(!JSON.stringify(p.data).includes("test-only-secret"));
  assert.equal(p.activeRun, null);
});

test("手动备注覆盖预置，允许主动留空", async () => {
  const p = plugin();
  await p.saveNote("dataview", { alias: "", description: "我的备注" });
  assert.equal(getNote(p.data, "dataview").alias, "");
  assert.equal(getNote(p.data, "dataview").description, "我的备注");
});

test("恢复预置只删除目标记录", async () => {
  const p = plugin();
  await p.saveNote("dataview", { alias: "自定义", description: "修改" });
  await p.saveNote("other", { alias: "其他", description: "保留" });
  await p.saveNote("dataview", null);
  assert.equal(getNote(p.data, "dataview").alias, "笔记数据查询");
  assert.equal(getNote(p.data, "other").description, "保留");
});

test("格式损坏和未知版本不会回落默认值后覆盖", () => {
  for (const raw of [[], {}, { schemaVersion: 2, entries: {} },
    { schemaVersion: 1, entries: [] },
    { schemaVersion: 1, entries: { item: { alias: 7, description: "" } } }]) {
    assert.throws(() => parseData(raw));
  }
});

test("保存超长输入时明确报错，保留旧数据", async () => {
  const p = plugin();
  await assert.rejects(p.saveNote("a", { alias: "x".repeat(81), description: "" }));
  await assert.rejects(p.saveNote("a", { alias: "", description: "x".repeat(801) }));
  assert.equal(Object.keys(p.data.entries).length, 0);
});

test("并发保存被串行化，不丢失其他插件的备注", async () => {
  const p = plugin();
  const persisted = [];
  p.saveData = async (value) => {
    await new Promise((resolve) => setImmediate(resolve));
    persisted.push(JSON.stringify(value));
  };
  await Promise.all([
    p.saveNote("a", { alias: "甲", description: "一" }),
    p.saveNote("b", { alias: "乙", description: "二" }),
    p.saveNote("a", { alias: "甲二", description: "三" }),
  ]);
  const final = JSON.parse(persisted.at(-1));
  assert.equal(final.entries.a.alias, "甲二");
  assert.equal(final.entries.b.alias, "乙");
});

test("磁盘写入失败不发布新状态，后续可重试", async () => {
  const p = plugin();
  p.saveData = async () => { throw new Error("模拟磁盘错误"); };
  await assert.rejects(p.saveNote("dataview", { alias: "新值", description: "" }));
  assert.equal(getNote(p.data, "dataview").alias, "笔记数据查询");
  p.saveData = async () => {};
  await p.saveNote("dataview", { alias: "重试成功", description: "" });
  assert.equal(getNote(p.data, "dataview").alias, "重试成功");
});

test("数据可序列化并重新加载，特殊 ID 不污染原型", async () => {
  const p = plugin();
  await p.saveNote("__proto__", { alias: "安全", description: "<script>text</script>" });
  const restored = parseData(JSON.parse(JSON.stringify(p.data)));
  assert.equal(getNote(restored, "__proto__").alias, "安全");
  assert.equal(getNote(restored, "__proto__").description, "<script>text</script>");
  assert.equal(Object.getPrototypeOf(restored.entries), null);
  assert.equal({}.alias, undefined);
});

test("停用后拒绝新的写入", async () => {
  const p = plugin();
  p.stopped = true;
  await assert.rejects(p.saveNote("a", { alias: "", description: "" }), /停用/);
});

test("发现独立设置窗口并清理已关闭窗口，停用后不再发现", () => {
  const p = plugin();
  const focused = { defaultView: { closed: false } };
  const closed = { defaultView: { closed: true } };
  p.documents = new Map([[closed, {}]]);
  const watched = [];
  const removed = [];
  p.watchDocument = (doc) => watched.push(doc);
  p.unwatchDocument = (doc) => { removed.push(doc); p.documents.delete(doc); };
  context.activeDocument = focused;
  p.syncActiveDocument();
  assert.equal(watched[0], focused);
  assert.equal(removed[0], closed);
  p.stopped = true;
  p.syncActiveDocument();
  assert.equal(watched.length, 1);
  delete context.activeDocument;
});

test("旧版数据新增管理设置时不丢备注、缓存与 AI 配置", () => {
  const p = plugin();
  p.data.entries.dataview = { alias: "我的查询", description: "我的记录" };
  p.data.settings = { endpoint: "https://example.com/v1/chat/completions", model: "example", secretId: "example-key", provider: "custom" };
  const raw = JSON.parse(JSON.stringify(p.data)); delete raw.management;
  const migrated = parseData(raw);
  assert.equal(migrated.entries.dataview.alias, "我的查询");
  assert.equal(migrated.settings.secretId, "example-key");
  assert.equal(migrated.management.grouped, false);
  assert.equal(migrated.management.hideDisabled, false);
  assert.equal(migrated.management.sidebarSort, "default");
});

test("时间排序将未知时间置后，同一时间保留原顺序；原名数字自然排序", () => {
  const { sortPlugins } = Plugin.testAPI;
  const items = [{ name: "Plugin 10", index: 0, ctime: null }, { name: "Plugin 2", index: 1, ctime: 200 },
    { name: "Alpha", index: 2, ctime: 100 }, { name: "beta", index: 3, ctime: 200 }];
  assert.deepEqual(Array.from(sortPlugins(items, "new"), (p) => p.index), [1, 3, 2, 0]);
  assert.deepEqual(Array.from(sortPlugins(items, "old"), (p) => p.index), [2, 1, 3, 0]);
  assert.deepEqual(Array.from(sortPlugins(items, "az"), (p) => p.index), [2, 3, 1, 0]);
  assert.deepEqual(Array.from(sortPlugins(items, "default"), (p) => p.index), [0, 1, 2, 3]);
  assert.equal(items[0].index, 0);
});

test("隐藏未启用设置持久化，列表开关状态按原生样式识别", async () => {
  const p = plugin();
  await p.saveManagement((m) => ({ ...m, hideDisabled: true }));
  assert.equal(parseData(JSON.parse(JSON.stringify(p.data))).management.hideDisabled, true);
  const row = (toggle) => ({ querySelector: () => toggle });
  const toggle = (enabled) => ({ classList: { contains: (name) => name === "is-enabled" && enabled } });
  assert.equal(Plugin.testAPI.rowEnabled(row(toggle(true))), true);
  assert.equal(Plugin.testAPI.rowEnabled(row(toggle(false))), false);
  assert.equal(Plugin.testAPI.rowEnabled(row(null)), true);
});

test("分组新增重命名删除持久化，重复名称拒绝，删除归属和折叠状态自动清理", async () => {
  const p = plugin();
  await p.changeGroup(null, "AI 工具");
  const id = p.data.management.groups[0].id;
  await p.saveManagement((m) => ({ ...m, grouped: true, sidebarSort: "za", listSort: "new",
    assignments: { dataview: id }, collapsed: [id] }));
  await assert.rejects(p.changeGroup(null, "AI 工具"), /已存在/);
  await assert.rejects(p.changeGroup(null, "未分组"), /未分组/);
  await p.changeGroup(id, "效率工具");
  const loaded = parseData(JSON.parse(JSON.stringify(p.data)));
  assert.equal(loaded.management.groups[0].name, "效率工具");
  assert.equal(loaded.management.assignments.dataview, id);
  assert.equal(loaded.management.sidebarSort, "za");
  assert.equal(loaded.management.listSort, "new");
  await p.changeGroup(id, null);
  assert.equal(p.data.management.assignments.dataview, undefined);
  assert.equal(p.data.management.collapsed.length, 0);
  assert.equal(p.data.management.groups.length, 0);
});

test("分组保存失败保留旧状态，并发保存不丢失其他管理设置", async () => {
  const p = plugin();
  p.saveData = async () => { throw new Error("写入失败"); };
  await assert.rejects(p.changeGroup(null, "失败分组"), /写入失败/);
  assert.equal(p.data.management.groups.length, 0);
  p.saveData = async () => {};
  await Promise.all([p.saveManagement((m) => ({ ...m, listSort: "az" })),
    p.saveManagement((m) => ({ ...m, sidebarSort: "new" }))]);
  assert.equal(p.data.management.listSort, "az");
  assert.equal(p.data.management.sidebarSort, "new");
});

test("管理配置忽略非法分组、重复名称和失效归属", () => {
  const { managementData } = Plugin.testAPI;
  const m = managementData({ listSort: "invalid", groups: [{ id: "g-1", name: "工作" },
    { id: "g-2", name: "工作" }, { id: "g-3", name: "未分组" }],
    assignments: { a: "g-1", b: "missing" }, collapsed: ["g-1", "missing", "g-1"] });
  assert.equal(m.groups.length, 1);
  assert.equal(m.assignments.a, "g-1");
  assert.equal(m.assignments.b, undefined);
  assert.equal(m.collapsed.length, 1);
  assert.equal(m.listSort, "default");
});

test("读取插件文件夹创建时间失败时仍返回插件，不以修改时间替代", async () => {
  const p = plugin();
  p.app.vault = { configDir: ".obsidian", adapter: {
    exists: async () => true, list: async () => ({ folders: [".obsidian/plugins/a", ".obsidian/plugins/b"] }),
    read: async (path) => JSON.stringify({ id: path.includes("/a/") ? "a" : "b", name: "Example" }),
    stat: async (path) => { if (path.endsWith("/a")) return { type: "folder", ctime: 123, mtime: 999 }; throw new Error("不可用"); },
  } };
  p.readManifest = Plugin.prototype.readManifest;
  const items = await p.installedManifests();
  assert.equal(items.length, 2);
  assert.equal(items[0].ctime, 123);
  assert.equal(items[1].ctime, null);
});

test("新插件出现时跳过扫描间隔，扫描进行中则补扫一次", async () => {
  const p = plugin();
  p.managementCatalog = new Map();
  p.managementScanAt = Date.now();
  p.managementScanPending = false;
  p.managementRescanRequested = false;
  p.stopped = false;
  let finishFirst;
  let scans = 0;
  p.installedManifests = () => {
    scans++;
    return scans === 1 ? new Promise((resolve) => { finishFirst = resolve; }) :
      Promise.resolve([{ id: "new-plugin", ctime: 200 }]);
  };
  p.scanManagementCatalog();
  assert.equal(scans, 0);
  p.scanManagementCatalog(true);
  assert.equal(scans, 1);
  p.scanManagementCatalog(true);
  finishFirst([{ id: "old-plugin", ctime: 100 }]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(scans, 2);
  assert.equal(p.managementCatalog.get("new-plugin").ctime, 200);
});

test("开关重绘按插件行锚点恢复视口，同时恢复侧栏位置", () => {
  const p = plugin();
  const scroller = { isConnected: true, scrollTop: 200,
    querySelectorAll: () => [{ dataset: { pluginId: "calendar" }, getClientRects: () => [{}],
      getBoundingClientRect: () => ({ top: 80 }) }] };
  const side = { isConnected: true, scrollTop: 0 };
  p.restoreViewport({ viewportLock: { scroller, id: "calendar", rowTop: 120, top: 240, sideScroll: [[side, 60]] } });
  assert.equal(scroller.scrollTop, 160);
  assert.equal(side.scrollTop, 60);
});

test("无文字的原生行图标也能锚定相邻插件，弹窗点击不丢失视口保护", () => {
  const p = plugin();
  const row = { dataset: { pluginId: "removed" }, getClientRects: () => [{}],
    getBoundingClientRect: () => ({ top: 100 }) };
  const next = { dataset: { pluginId: "next" }, getClientRects: () => [{}],
    getBoundingClientRect: () => ({ top: 180 }) };
  const list = { style: { minHeight: "" }, getBoundingClientRect: () => ({ height: 900 }),
    querySelectorAll: () => [row, next] };
  row.parentElement = list;
  row.closest = () => scroller;
  const scroller = { isConnected: true, scrollTop: 200, querySelectorAll: () => [row, next] };
  const control = { closest: () => row };
  const icon = { textContent: "", closest: (selector) => selector === ".setting-item-control" ? control : null };
  const state = { win: { setTimeout: (_fn, delay) => { assert.equal(delay, 15000); return 1; }, clearTimeout: () => {} }, viewportLock: null };
  const doc = { querySelectorAll: () => [] };
  p.holdViewport(doc, state, { type: "pointerdown", target: { closest: (selector) => selector === "button, .clickable-icon" ? icon : null } });
  assert.equal(state.viewportLock.id, "next");
  const lock = state.viewportLock;
  p.holdViewport(doc, state, { type: "click", target: { closest: (selector) => selector === "button, .clickable-icon" ? icon : null } });
  assert.equal(state.viewportLock, lock);
  p.holdViewport(doc, state, { type: "pointerdown", target: { closest: () => null } });
  assert.equal(state.viewportLock.id, "next");
  scroller.querySelectorAll = () => [next];
  next.getBoundingClientRect = () => ({ top: 100 });
  p.restoreViewport(state);
  assert.equal(scroller.scrollTop, 120);
});

test("用户主动滚动时释放高度占位，不把用户拉回旧位置", () => {
  const p = plugin();
  const list = { isConnected: true, style: { minHeight: "900px" } };
  const scroller = { isConnected: true, scrollTop: 400 };
  let cleared = false;
  const state = { win: { clearTimeout: () => { cleared = true; } },
    viewportLock: { list, minHeight: "", scroller, top: 100, timer: 1 } };
  p.releaseViewport(state, false);
  assert.equal(list.style.minHeight, "");
  assert.equal(scroller.scrollTop, 400);
  assert.equal(state.viewportLock, null);
  assert.equal(cleared, true);
});

const presentation = vm.runInContext("({ displayAlias, displayDescription })", context);
test("列表别名移除重复原名并保留中文，不误删相似品牌名", () => {
  assert.equal(presentation.displayAlias("Notebook Navigator: 双栏文件浏览器", "Notebook Navigator"), "双栏文件浏览器");
  assert.equal(presentation.displayAlias("Extension Index: 社区插件中文别名与笔记", "Extension Index"), "社区插件中文别名与笔记");
  assert.equal(presentation.displayAlias("Notebook Navigator", "Notebook Navigator"), "");
  assert.equal(presentation.displayAlias("Floating TOC", "floating toc"), "");
  assert.equal(presentation.displayAlias("FooBar 中文助手", "Foo"), "FooBar 中文助手");
  assert.equal(presentation.displayAlias("中文别名", "Example"), "中文别名");
  assert.equal(presentation.displayAlias("", "Example"), "");
});
test("仅过滤固定的冗余尾句，保留功能、风险说明与原始缓存", () => {
  const raw = "提供编辑工具。除此之外，没有更多功能细节可供说明。";
  assert.equal(presentation.displayDescription(raw), "提供编辑工具。");
  assert.equal(presentation.displayDescription(getNote(parseData(null), "advanced-multi-column").description), "创建交互式多栏布局。");
  assert.equal(presentation.displayDescription("提供中文说明。以上依据插件简介，README 摘要为空，具体用法与范围未在资料中说明。"), "提供中文说明。");
  assert.equal(presentation.displayDescription("改进表格导航。资料中没有更详细的说明，具体用法尚不明确。"), "改进表格导航。");
  assert.equal(presentation.displayDescription("提供选项卡设置。由于缺少 README 说明，更详细的功能与兼容性信息无法确认。"), "提供选项卡设置。");
  assert.equal(presentation.displayDescription("通过 WebDAV 同步。该插件说明只提到同步用途，未提供更多功能细节或版本兼容性信息。"), "通过 WebDAV 同步。");
  assert.equal(presentation.displayDescription("支持自定义排序。除插件简介外，资料未提供更多细节。"), "支持自定义排序。");
  assert.equal(presentation.displayDescription("支持编辑。除插件自述外，没有更多功能细节可供说明。"), "支持编辑。");
  assert.equal(presentation.displayDescription("需要联网，可能产生费用。"), "需要联网，可能产生费用。");
  assert.equal(presentation.displayDescription("除此之外，支持导出。"), "除此之外，支持导出。");
  const data = parseData(null);
  data.entries.example = { alias: "Example: 示例", description: raw };
  presentation.displayDescription(getNote(data, "example").description);
  assert.equal(data.entries.example.description, raw);
});

test("免费翻译同时补全名称和说明", async () => {
  const p = plugin(); p.installedManifests = async () => [{ ...fixtureManifest, id: "unknown-plugin", name: "Age Crypto" }];
  const calls = [];
  p.translate = async text => { calls.push(text); return text === "Age Crypto" ? "age 加密" : "使用 age 加密笔记。"; };
  const result = await p.generateOne("unknown-plugin", "translation");
  assert.equal(result.alias, "age 加密");
  assert.deepEqual(calls, [fixtureManifest.description, "Age Crypto"]);
  assert.equal(result.warning, "");
});
test("免费翻译保留已有个人别名", async () => {
  const p = plugin(); p.installedManifests = async () => [fixtureManifest];
  p.data.entries.calendar = { alias: "我的日历", description: "个人说明" };
  p.translate = async () => "查看日期";
  const result = await p.generateOne("calendar", "translation");
  assert.equal(result.alias, "我的日历");
  assert.equal(result.warning, "");
  assert.equal(getNote(p.data, "calendar").description, "个人说明");
});

test("已核实的内置别名突出功能，纠正字面误译", () => {
  const data = parseData(null);
  assert.equal(getNote(data, "age-crypto").alias, "age 笔记加解密");
  assert.equal(getNote(data, "age-crypto").description, "使用 age 加密或解密笔记。");
  assert.equal(getNote(data, "alignment").alias, "文字居中与右对齐");
  assert.doesNotMatch(getNote(data, "alignment").description, /两端对齐/);
  assert.equal(getNote(data, "aside").alias, "人机协作旁注");
  assert.equal(getNote(data, "table-editor-obsidian").alias, "表格编辑与导航");
  assert.equal(getNote(data, "ai-commit").alias, "AI 提交说明生成");
  assert.equal(getNote(data, "airtable-tabula").alias, "Airtable 式本地表格");
  assert.equal(getNote(data, "asciidoc-live").alias, "AsciiDoc 实时预览");
});

test("官方快照中累计下载超过10次的插件均有离线资料，覆盖集合精确匹配", () => {
  // 2026-11-13 catalog/stats snapshot; retain 61 earlier references outside the selection.
  const retained = new Set(["ai-knowledge-hub","almagest","authors-toolbox","auto-anki","bases-kanban","bases-pill-colors","bastion","bindery","busqueda-sin-tildes","claudian","dada-todo-list","data-files-editor","file-master","floating-sticky-notes","folder-focus","glasscockpit","graph-colour-spawn","graph-spawn","graphnosis","gyazo","hermes-studio","i18n","image-workflow","inkflow","lan-vault-sync","maguilanote","markitdown-flow","md-journal","md-to-hwpx","mindflow","module-box","name-dialogue","neogdsync","nextcloud-sync","note-tidy","notewright","notioneer","nox-sync","np-rf-analysis","obmind","outlook-drop-importer","painter","pkmer","plugin-manager-cn","prism-studio","rchery","run-in-background","section-variants","slexkit","smart-done-mover","speakpen-sync","stickyflow","study-time-statistics","task-manager-bases-view","tasknotes-views","team-relay-sync","thinker","thinker-tomatodo","thinkers","ticktick-bridge","vault-chat-agent"]);
  const ids = [...Plugin.testAPI.BUILTINS.keys()].filter(id => !retained.has(id)).sort();
  assert.equal(ids.length, 10253);
  assert.equal(require("node:crypto").createHash("sha256").update(ids.join("\n")).digest("hex"),
    "30115b9652e8acb725a43962ba856557cbb07478999d93df28a5ea959c2ee930");
});



test("已有中文说明但缺少名称仍会补全，且不重复翻译说明", async () => {
  const p = plugin();
  const manifest = { ...fixtureManifest, id: "new-translator", name: "Chinese UI Translator" };
  p.installedManifests = async () => [manifest];
  p.data.cache[manifest.id] = { alias: "", description: "原有中文说明", kind: "translation" };
  assert.equal(needsTranslation(p.data, manifest), true);
  const calls = [];
  p.translate = async text => { calls.push(text); return "中文界面翻译器"; };
  await p.generateBatch("translation");
  assert.deepEqual(calls, [manifest.name]);
  assert.equal(getNote(p.data, manifest.id).alias, "中文界面翻译器");
  assert.equal(getNote(p.data, manifest.id).description, "原有中文说明");
  assert.equal(needsTranslation(p.data, manifest), false);
});

test("名称翻译失败仍保存说明，品牌原文不会冒充中文译名", async () => {
  for (const fail of [false, true]) {
    const p = plugin();
    p.installedManifests = async () => [{ ...fixtureManifest, id: "new-brand", name: "Brand" }];
    p.translate = async text => {
      if (text !== "Brand") return "查看日期。";
      if (fail) throw new Error("额度不足");
      return "Brand";
    };
    const result = await p.generateOne("new-brand", "translation");
    assert.equal(result.alias, "");
    assert.equal(result.description, "查看日期。");
    assert.match(result.warning, /名称/);
    assert.equal(p.data.cache["new-brand"].description, "查看日期。");
  }
});

test("原生中文名称无需翻译，个人空白备注也不会被批量改写", () => {
  const data = parseData(null);
  const manifest = { id: "new-chinese", name: "中文插件", description: "中文介绍。" };
  assert.equal(needsTranslation(data, manifest), false);
  data.entries[manifest.id] = { alias: "", description: "" };
  assert.equal(needsTranslation(data, { ...manifest, name: "English" }), false);
});

vm.runInContext('module.exports.uiTestAPI = { UI_BUILTINS, uiDictionary, uiTranslationData, uiTranslation, uiLabels };', context);
const uiAPI = Plugin.uiTestAPI;

test('设置页内置词典按插件隔离，覆盖五个插件，个人补翻优先且不混入名称备注', () => {
  assert.equal(Object.keys(uiAPI.UI_BUILTINS).length, 5);
  const data = parseData(null);
  assert.equal(uiAPI.uiDictionary(data, 'calendar')['Words per dot'], '每个圆点代表的字数');
  assert.equal(uiAPI.uiDictionary(data, 'unknown')['Words per dot'], undefined);
  data.uiTranslations.calendar = { enabled: false, strings: { 'Words per dot': '自定义点数' } };
  assert.equal(uiAPI.uiDictionary(data, 'calendar')['Words per dot'], '自定义点数');
  assert.notEqual(getNote(data, 'calendar').alias, '自定义点数');
});

test('设置词典可持久化关闭状态，旧备注数据无损迁移，损坏词典拒绝覆盖', () => {
  const data = parseData(null);
  data.entries.calendar = { alias: '个人日历', description: '个人用途' };
  data.uiTranslations.calendar = { enabled: false, strings: { 'Words per dot': '每个圆点的字数' } };
  const restored = parseData(JSON.parse(JSON.stringify(data)));
  assert.equal(restored.uiTranslations.calendar.enabled, false);
  assert.equal(restored.entries.calendar.alias, '个人日历');
  assert.throws(() => parseData({ ...data, uiTranslations: { calendar: { enabled: true, strings: { Hello: '<b>你好</b>' } } } }));
  assert.throws(() => uiAPI.uiTranslation('Hello', ''));
  assert.equal(uiAPI.uiTranslation('Notion', 'Notion'), 'Notion');
});

test('已有内置词条时设置页补翻不发网络请求', async () => {
  const p = plugin();
  p.uiSessions = new Map();
  p.app.setting = { activeTab: { id: 'calendar', containerEl: { isConnected: true,
    querySelectorAll: () => [] } } };
  p.startRun = () => { throw new Error('不应联网'); };
  await p.translateUiPage('calendar');
});

test('内置设置译文合法且限制在短标签，不收录大段说明', () => {
  let count = 0;
  for (const pack of Object.values(uiAPI.UI_BUILTINS)) for (const [source, value] of Object.entries(pack)) {
    assert.ok(source.length <= 200);
    assert.equal(uiAPI.uiTranslation(source, value), value);
    count++;
  }
  assert.ok(count >= 70 && count <= 120, String(count));
});

function uiPlugin(labels) {
  const p = plugin();
  p.data.settings.endpoint = 'http://localhost:1234/chat/completions';
  p.data.settings.model = 'test-model';
  const elements = labels.map(text => ({ closest: () => null, querySelectorAll: () => [], node: { nodeValue: text } }));
  const root = { isConnected: true, querySelectorAll: () => elements,
    ownerDocument: { createTreeWalker: el => { let done = false; return { nextNode() { if (done) return null; done = true; return el.node; } }; } } };
  p.app.setting = { activeTab: { id: 'test-ui', containerEl: root } };
  p.app.plugins = { manifests: { 'test-ui': { version: '1.0.0' } } };
  p.uiSessions = new Map();
  p.refreshUiTranslation = () => {};
  p.renderUiPopover = () => {};
  return p;
}
function uiResponse(options) {
  const request = JSON.parse(options.body);
  const labels = JSON.parse(request.messages[1].content).labels;
  return { status: 200, json: { choices: [{ message: { content: JSON.stringify(Object.fromEntries(labels.map(item => [item.id, '测试译文 '+item.id]))) } }] } };
}
test('当前插件翻译入口与浮层均不重复打开设置页', () => {
  const p = plugin();
  const root = { setAttribute() {}, querySelector: () => null };
  const doc = { createElement: () => root, body: { append() {} }, addEventListener() {},
    defaultView: { addEventListener() {} }, querySelectorAll: () => [anchor] };
  const anchor = { ownerDocument: doc, setAttribute() {}, closest: () => ({ dataset: { settingId: 'highlightr-plugin' } }) };
  p.app.setting = { activeTab: { id: 'highlightr-plugin', containerEl: { isConnected: true, ownerDocument: doc } },
    openTabById() { throw new Error('不应重新渲染 Highlightr'); } };
  p.closeUiPopover = () => {};
  p.refreshUiTranslation = () => {};
  p.refreshDocument = () => {};
  p.renderUiPopover = () => {};
  p.openPluginTranslation('highlightr-plugin');
  assert.equal(p.uiPopover.id, 'highlightr-plugin');
  assert.equal(p.uiPopover.root, root);
  p.app.setting.activeTab.id = 'other-plugin';
  p.app.setting.openTabById = id => {
    p.app.setting.activeTab.id = id;
    throw new Error('颜色选择器初始化失败');
  };
  p.openUiPopover('highlightr-plugin', anchor);
  assert.equal(p.uiPopover.id, 'highlightr-plugin');
  p.app.setting.openTabById = () => { throw new Error('目标页面无法打开'); };
  p.app.setting.activeTab.id = 'other-plugin';
  assert.throws(() => p.openUiPopover('highlightr-plugin', anchor), /目标页面无法打开/);
});
test('设置页内容更新在观察器回调中立即补译，失效回调不再修改页面', () => {
  const p = plugin();
  let changed, scans = 0, restores = 0;
  const root = { isConnected: true, ownerDocument: { defaultView: {
    MutationObserver: class { constructor(callback) { changed = callback; } }
  } } };
  p.manifest = { id: 'plugin-zh-notes' };
  p.app.setting = { activeTab: { id: 'calendar', containerEl: root } };
  p.uiSessions = new Map();
  p.scanUiSession = () => { scans++; };
  p.restoreUiSession = () => { restores++; };
  p.refreshUiTranslation();
  assert.equal(scans, 1);
  changed();
  assert.equal(scans, 2);
  assert.equal(restores, 1);
  p.uiSessions.clear();
  changed();
  assert.equal(scans, 2);
});
test('侧栏仅拦截当前插件的普通重复点击，保留图标与其他页面操作', () => {
  const p = plugin();
  let refreshes = 0, holds = 0, stopped = 0;
  const doc = { body: {}, addEventListener() {}, defaultView: {
    MutationObserver: class { constructor(callback) { this.callback = callback; } observe() {} }
  } };
  p.documents = new Map();
  p.app.setting = { activeTab: { id: 'calendar', containerEl: { ownerDocument: doc } } };
  p.refreshDocument = () => {};
  p.refreshUiTranslation = () => { refreshes++; };
  p.holdViewport = () => { holds++; };
  p.watchDocument(doc);
  const state = p.documents.get(doc);
  const item = { dataset: { settingId: 'calendar' }, closest: () => ({}) };
  let control = null;
  const event = { type: 'click', button: 0, target: { closest: selector => selector === '[data-setting-id]' ? item : control },
    preventDefault() {}, stopImmediatePropagation() { stopped++; } };
  state.hold(event);
  assert.equal(stopped, 1); assert.equal(holds, 0);
  control = {};
  state.hold(event);
  assert.equal(holds, 1);
  control = null; item.dataset.settingId = 'other-plugin';
  state.hold(event);
  assert.equal(holds, 2);
  state.observer.callback([]);
  assert.equal(refreshes, 1);
});
test('设置页 AI 补翻以两路并发处理，逐批保存，重复补翻完全复用', async () => {
  const p = uiPlugin(Array.from({ length: 45 }, (_, i) => 'Setting '+i));
  let active = 0, peak = 0, requests = 0, saves = 0;
  p.saveData = async () => { saves++; };
  p.http = async options => {
    requests++; active++; peak = Math.max(peak, active);
    assert.ok(JSON.parse(JSON.parse(options.body).messages[1].content).labels.length <= 20);
    await new Promise(resolve => setTimeout(resolve, 2));
    active--; return uiResponse(options);
  };
  await p.translateUiPage('test-ui');
  assert.equal(requests, 3); assert.equal(peak, 2); assert.equal(saves, 3);
  assert.equal(Object.keys(p.data.uiTranslations['test-ui'].strings).length, 45);
  await p.translateUiPage('test-ui');
  assert.equal(requests, 3); assert.equal(p.activeRun, null);
});
test('设置页后续批次失败保留前一批结果，重试只发送剩余内容', async () => {
  const p = uiPlugin(Array.from({ length: 40 }, (_, i) => 'Setting '+i));
  let calls = 0;
  p.http = async options => {
    if (++calls === 2) { await new Promise(resolve => setTimeout(resolve, 10)); throw new Error('模拟服务失败'); }
    return uiResponse(options);
  };
  await assert.rejects(p.translateUiPage('test-ui'), /模拟服务失败/);
  assert.equal(Object.keys(p.data.uiTranslations['test-ui'].strings).length, 20);
  assert.equal(p.activeRun, null);
  await p.translateUiPage('test-ui');
  assert.equal(calls, 3);
  assert.equal(Object.keys(p.data.uiTranslations['test-ui'].strings).length, 40);
});
test('设置页取消后迟到响应不写入词典，原有个人备注保留', async () => {
  const p = uiPlugin(['New setting']);
  let finish;
  p.http = options => new Promise(resolve => { finish = () => resolve(uiResponse(options)); });
  const task = p.translateUiPage('test-ui');
  p.cancelTask(); finish();
  await assert.rejects(task, /任务已停止/);
  assert.equal(p.data.uiTranslations['test-ui'], undefined);
  assert.equal(p.activeRun, null);
});

vm.runInContext('module.exports.needsAIAnalysis = needsAIAnalysis;', context);

test('名称说明的 AI 候选与免费缺失分开计数，已保存 AI 结果及个人备注不重复处理', () => {
  const p = plugin(), m = { id: 'calendar', name: 'Calendar', version: '1.0.0', description: 'Calendar' };
  assert.equal(Plugin.needsAIAnalysis(p.data, m), true);
  assert.equal(needsTranslation(p.data, m), false);
  p.data.cache.calendar = { kind: 'ai', fingerprint: fingerprint(m) };
  assert.equal(Plugin.needsAIAnalysis(p.data, m), false);
  assert.equal(Plugin.needsAIAnalysis(p.data, { ...m, version: '2.0.0' }), true);
  p.data.entries.calendar = { alias: '个人名称', description: '个人说明' };
  assert.equal(Plugin.needsAIAnalysis(p.data, { ...m, version: '2.0.0' }), false);
});

test('未配置 AI 时给出直接配置提示，不发请求或创建任务', async () => {
  const p = uiPlugin(['New setting']);
  p.data.settings = { ...p.data.settings, endpoint: '', model: '' };
  let requests = 0;
  p.http = async () => { requests++; throw new Error('不应联网'); };
  await assert.rejects(p.translateUiPage('test-ui'), /尚未配置 AI 服务/);
  assert.equal(requests, 0); assert.equal(p.activeRun, undefined);
  p.data.settings = { endpoint: 'https://example.com/v1/chat/completions', model: 'test', secretId: '' };
  assert.throws(() => p.startRun('ai'), /尚未配置 AI 服务/);
});

test('设置页任务在首次通知时已携带独立类型与目标，不会被识别为名称分析', () => {
  const p = uiPlugin(['New setting']);
  let snapshot;
  p.notifyUI = () => { snapshot = { kind: p.activeRun.kind, uiId: p.activeRun.uiId }; };
  p.startRun('ai', 'settings-ui', 'test-ui');
  assert.deepEqual(snapshot, { kind: 'settings-ui', uiId: 'test-ui' });
});

test('保存和测试配置只验证连接，重复操作不会调用说明生成或设置页翻译', async () => {
  const p = plugin();
  const tab = new ChineseNotesSettings(p.app, p);
  let saves = 0, tests = 0;
  p.saveProfile = async () => { saves++; };
  p.testConnection = async () => { tests++; };
  p.generateBatch = async () => { throw new Error('不应批量分析'); };
  p.translateUiPage = async () => { throw new Error('不应翻译设置'); };
  tab.refreshUI = () => {};
  await tab.saveAndTest(); await tab.saveAndTest();
  assert.equal(saves, 2); assert.equal(tests, 2);
});

test('已配置的本机接口连接失败不误报成未配置，也不擅自认定是 Ollama', async () => {
  const p = plugin();
  requestHandler = async () => { throw new Error('private-network-detail'); };
  await assert.rejects(p.http({ url: 'http://127.0.0.1:1234/v1/chat/completions', method: 'POST' }, { cancelled: false }), error =>
    /无法连接已配置的 AI 服务/.test(error.message) && !/Ollama|尚未配置|private-network-detail/.test(error.message));
});

test('未配置 AI 的设置页补翻可取消，取消时不启动任何服务', async () => {
  const p = uiPlugin(['New setting']);
  p.isAIReady = () => false;
  let prompts = 0, calls = 0;
  p.chooseFreeTranslation = async () => { prompts++; return 'cancel'; };
  p.translateUiPage = async () => { calls++; };
  await p.requestUiTranslation('test-ui');
  assert.equal(prompts, 1); assert.equal(calls, 0); assert.equal(p.uiTranslationRequest, false);
});

test('未配置 AI 时只有明确同意才选择免费服务，配置入口仅跳转', async () => {
  const p = uiPlugin(['New setting']); p.isAIReady = () => false;
  const calls = [];
  p.translateUiPage = async (id, service) => { calls.push([id, service]); };
  p.chooseFreeTranslation = async () => 'free';
  await p.requestUiTranslation('test-ui');
  assert.deepEqual(calls, [['test-ui', 'free']]);
  let configured = 0;
  p.openSettings = configure => { assert.equal(configure, true); configured++; };
  p.chooseFreeTranslation = async () => 'configure';
  await p.requestUiTranslation('test-ui');
  assert.equal(configured, 1); assert.equal(calls.length, 1);
});

test('AI 已配置并测试时直接使用 AI，已有内置词条时不弹出服务选择', async () => {
  const p = uiPlugin(['New setting']); p.isAIReady = () => true;
  p.chooseFreeTranslation = async () => { throw new Error('不应弹窗'); };
  let service;
  p.translateUiPage = async (_id, selected) => { service = selected; };
  await p.requestUiTranslation('test-ui'); assert.equal(service, 'ai');
  p.data.uiTranslations['test-ui'] = { enabled: true, strings: { 'New setting': '新设置' } };
  p.isAIReady = () => false;
  service = undefined;
  await p.requestUiTranslation('test-ui'); assert.equal(service, undefined);
});

test('免费设置页翻译无需 AI 配置，使用现有 MyMemory 额度且逐条保存', async () => {
  const p = uiPlugin(['First setting', 'Second setting']);
  p.data.settings = { ...p.data.settings, endpoint: '', model: '', secretId: '' };
  let requests = 0;
  p.http = async options => {
    requests++; assert.match(options.url, /^https:\/\/api\.mymemory\.translated\.net\//);
    assert.equal(options.headers, undefined);
    return { json: { responseStatus: 200, responseData: { translatedText: '设置译文' } } };
  };
  await p.translateUiPage('test-ui', 'free');
  assert.equal(requests, 2);
  assert.equal(Object.keys(p.data.uiTranslations['test-ui'].strings).length, 2);
  assert.equal(p.data.usage.chars, 'First settingSecond setting'.length);
  assert.equal(p.activeRun, null);
});

test('免费设置页翻译额度耗尽时不继续请求，已完成词条保留', async () => {
  const p = uiPlugin(['First', 'Second']);
  p.data.usage = { date: new Date().toISOString().slice(0, 10), chars: 4495 };
  let requests = 0;
  p.http = async () => { requests++; return { json: { responseStatus: 200, responseData: { translatedText: '第一项' } } }; };
  await assert.rejects(p.translateUiPage('test-ui', 'free'), /预算/);
  assert.equal(requests, 1);
  assert.equal(p.data.uiTranslations['test-ui'].strings.First, '第一项');
  assert.equal(p.data.uiTranslations['test-ui'].strings.Second, undefined);
  assert.equal(p.activeRun, null);
});

test('服务选择期间重复点击不会叠加弹窗或发起第二次翻译', async () => {
  const p = uiPlugin(['New setting']); p.isAIReady = () => false;
  let finish, prompts = 0;
  p.chooseFreeTranslation = () => { prompts++; return new Promise(resolve => { finish = resolve; }); };
  const pending = p.requestUiTranslation('test-ui');
  await assert.rejects(p.requestUiTranslation('test-ui'), /已有任务/);
  finish('cancel'); await pending;
  assert.equal(prompts, 1);
});

test('界面校验允许品牌与缩写原文，仍拒绝空值、错误类型、HTML 和占位符损坏', () => {
  for (const source of ['lucide-icons (Li)', 'AI', 'Notion', 'CSV (.csv)']) assert.equal(uiAPI.uiTranslation(source, source), source);
  assert.equal(uiAPI.uiTranslation('CSV (.csv)', 'CSV（.csv）'), 'CSV（.csv）');
  for (const value of ['', null, {}, '<b>文字</b>', '文字\n换行']) assert.throws(() => uiAPI.uiTranslation('Label', value));
  assert.equal(uiAPI.uiTranslation('Found ⟦BA0⟧ results', '找到 ⟦BA0⟧ 个结果'), '找到 ⟦BA0⟧ 个结果');
  assert.throws(() => uiAPI.uiTranslation('Found ⟦BA0⟧ results', '找到结果'), /占位符/);
  const data = parseData(null); data.uiTranslations['test-ui'] = { enabled: true, strings: { Notion: 'Notion' } };
  assert.equal(parseData(JSON.parse(JSON.stringify(data))).uiTranslations['test-ui'].strings.Notion, 'Notion');
});

test('插件名称与 ID 从界面候选中排除，不发送给 AI', async () => {
  const p = uiPlugin(['Brand Plugin', 'brand-plugin', 'Other setting']);
  p.app.plugins.manifests['brand-plugin'] = { id: 'brand-plugin', name: 'Brand Plugin', version: '1.0.0' };
  let sent;
  p.http = async options => { sent = JSON.parse(JSON.parse(options.body).messages[1].content).labels; return uiResponse(options); };
  const result = await p.translateUiPage('test-ui');
  assert.deepEqual(sent.map(label => label.text), ['Other setting']);
  assert.equal(result.translated, 1);
});

test('同批合法译文、英文原文和无效结果分别处理，仅重试失败条目', async () => {
  const p = uiPlugin(['Save changes', 'lucide-icons (Li)', 'Broken field']);
  let requests = 0;
  p.http = async options => {
    requests++;
    if (requests === 1) return { json: { choices: [{ message: { content: '{"0":"保存更改","1":"lucide-icons (Li)","2":null}' } }] } };
    const labels = JSON.parse(JSON.parse(options.body).messages[1].content).labels;
    assert.deepEqual(labels.map(label => label.text), ['Broken field']);
    return uiResponse(options);
  };
  const first = await p.translateUiPage('test-ui');
  assert.equal(first.translated, 1); assert.equal(first.preserved, 1); assert.equal(first.failed, 1);
  assert.equal(p.data.uiTranslations['test-ui'].strings['Save changes'], '保存更改');
  assert.equal(p.data.uiTranslations['test-ui'].strings['lucide-icons (Li)'], 'lucide-icons (Li)');
  assert.equal(p.data.uiTranslations['test-ui'].strings['Broken field'], undefined);
  assert.equal(first.failures[0].source, 'Broken field');
  const retry = await p.translateUiPage('test-ui');
  assert.equal(retry.failed, 0); assert.equal(requests, 2);
});

test('缺失字段和整批格式错误不会取消其他批次，有效结果照常落盘', async () => {
  const p = uiPlugin(Array.from({ length: 21 }, (_, index) => 'Setting '+index));
  let calls = 0;
  p.http = async options => {
    calls++;
    const count = JSON.parse(JSON.parse(options.body).messages[1].content).labels.length;
    return count === 20 ? { json: { choices: [{ message: { content: 'not valid JSON' } }] } } : uiResponse(options);
  };
  const result = await p.translateUiPage('test-ui');
  assert.equal(calls, 2); assert.equal(result.failed, 20); assert.equal(result.translated, 1);
  assert.equal(Object.keys(p.data.uiTranslations['test-ui'].strings).length, 1);
  assert.equal(p.activeRun, null);
});

test('侧栏节点被宿主转移到新 document 后，先释放旧控件及记录再挂载', () => {
  const p = plugin();
  const oldDocument = {}, newDocument = { querySelectorAll: () => [] };
  const sideParent = { ownerDocument: newDocument, isConnected: true };
  const listParent = { ownerDocument: newDocument, isConnected: true };
  const side = {}, list = {};
  const previous = { sides: new Map([[sideParent, side]]), lists: new Map([[listParent, list]]) };
  const current = { sides: new Map(), lists: new Map() };
  p.documents = new Map([[oldDocument, previous], [newDocument, current]]);
  const released = [];
  p.cleanSide = (parent, value) => { assert.equal(parent, sideParent); assert.equal(value, side); released.push('side'); };
  p.cleanList = (parent, value) => { assert.equal(parent, listParent); assert.equal(value, list); released.push('list'); };
  p.refreshManagement(newDocument, current);
  assert.deepEqual(released, ['side', 'list']);
  assert.equal(previous.sides.size, 0); assert.equal(previous.lists.size, 0);
  p.refreshManagement(newDocument, current);
  assert.equal(released.length, 2);
});
