#!/usr/bin/env tsx
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
var path_1 = require("path");
(0, dotenv_1.config)({ path: path_1.default.resolve(process.cwd(), '.env.local') });
var supabase_1 = require("@/lib/supabase");
var crawl_configuration_service_1 = require("@/lib/services/crawl-configuration.service");
function seedPresets() {
    return __awaiter(this, void 0, void 0, function () {
        var db, _a, data, error, sources, updated, _loop_1, _i, sources_1, s;
        var _this = this;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    db = supabase_1.serverDatabaseService;
                    return [4 /*yield*/, db.executeWithRetry(function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, db.getClient().from('scraper_sources').select('id, name, url, crawl_config, use_crawl, max_pages_per_crawl')];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 1:
                    _a = _e.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        console.error('❌ Failed to fetch scraper_sources', error);
                        process.exit(1);
                    }
                    sources = (_b = data) !== null && _b !== void 0 ? _b : [];
                    console.log("\uD83D\uDD27 Found ".concat(sources.length, " sources"));
                    updated = 0;
                    _loop_1 = function (s) {
                        var hostname, presetKey, preset, merged_1, upErr, e_1;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    _f.trys.push([0, 2, , 3]);
                                    hostname = new URL(s.url).hostname;
                                    presetKey = crawl_configuration_service_1.CrawlConfigurationService.getPresetForHost(hostname);
                                    preset = crawl_configuration_service_1.CrawlConfigurationService.buildPreset(presetKey);
                                    merged_1 = crawl_configuration_service_1.CrawlConfigurationService.mergeConfig(__assign(__assign({}, ((_c = s.crawl_config) !== null && _c !== void 0 ? _c : {})), { startUrls: [s.url] }), __assign(__assign({}, preset), { maxPages: (_d = s.max_pages_per_crawl) !== null && _d !== void 0 ? _d : 50 }));
                                    crawl_configuration_service_1.CrawlConfigurationService.validateConfig(merged_1);
                                    return [4 /*yield*/, db.executeWithRetry(function () { return __awaiter(_this, void 0, void 0, function () {
                                            var _a;
                                            return __generator(this, function (_b) {
                                                switch (_b.label) {
                                                    case 0: return [4 /*yield*/, db.getClient()
                                                            .from('scraper_sources')
                                                            .update({
                                                            crawl_config: merged_1,
                                                            use_crawl: true,
                                                            max_pages_per_crawl: (_a = s.max_pages_per_crawl) !== null && _a !== void 0 ? _a : 50,
                                                        })
                                                            .eq('id', s.id)];
                                                    case 1: return [2 /*return*/, _b.sent()];
                                                }
                                            });
                                        }); })];
                                case 1:
                                    upErr = (_f.sent()).error;
                                    if (upErr)
                                        throw upErr;
                                    updated++;
                                    console.log("\u2705 Updated ".concat(s.name, " (").concat(presetKey, ")"));
                                    return [3 /*break*/, 3];
                                case 2:
                                    e_1 = _f.sent();
                                    console.warn("\u26A0\uFE0F Skipped ".concat(s.name, ":"), e_1);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, sources_1 = sources;
                    _e.label = 2;
                case 2:
                    if (!(_i < sources_1.length)) return [3 /*break*/, 5];
                    s = sources_1[_i];
                    return [5 /*yield**/, _loop_1(s)];
                case 3:
                    _e.sent();
                    _e.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log("\n\uD83C\uDFAF Presets applied to ".concat(updated, "/").concat(sources.length, " sources"));
                    return [2 /*return*/];
            }
        });
    });
}
if (require.main === module) {
    seedPresets().catch(function (e) {
        console.error('❌ Seeding crawl presets failed', e);
        process.exit(1);
    });
}
