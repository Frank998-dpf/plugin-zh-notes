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
  "\nmodule.exports.testAPI = { BUILTINS, managementData, sortPlugins, parseData, getNote, chunks, endpointUrl, aiNote, fingerprint, ChineseNotesSettings, PROVIDERS, settingsSignature, needsTranslation };", context);
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
  assert.equal(getNote(data, "granite").description, "");
  assert.equal(getNote(data, "blinks").description, "");
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
  let resume;
  p.http = async () => new Promise((resolve) => { resume = () => resolve({ json: { responseStatus: 200, responseData: { translatedText: "查看日期" } } }); });
  const pending = p.generateOne("calendar", "translation");
  while (!resume) await new Promise((resolve) => setImmediate(resolve));
  p.cancelTask(); resume();
  await assert.rejects(pending, /停止/);
  assert.equal(p.data.cache.calendar, undefined);
  assert.equal(p.activeRun, null);
});

test("生成期间恢复预置会取消该目标任务，迟到结果不会重新填回", async () => {
  const p = plugin();
  p.installedManifests = async () => [fixtureManifest];
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
  p.data.cache.cached = { description: "缓存", kind: "translation" };
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
