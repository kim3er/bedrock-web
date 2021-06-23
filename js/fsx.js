"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyDir = exports.exists = void 0;
var tslib_1 = require("tslib");
var fs_1 = tslib_1.__importDefault(require("fs"));
var mkdirp_1 = tslib_1.__importDefault(require("mkdirp"));
var path_1 = tslib_1.__importDefault(require("path"));
var fsp = fs_1.default.promises;
function exists(srcPath) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var _a;
        return tslib_1.__generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4, fsp.access(srcPath)];
                case 1:
                    _b.sent();
                    return [2, true];
                case 2:
                    _a = _b.sent();
                    return [2, false];
                case 3: return [2];
            }
        });
    });
}
exports.exists = exists;
function copyDir(srcPath, destPath) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var entries, _i, entries_1, entry, entryPath, stat, destEntryPath;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, fsp.readdir(srcPath)];
                case 1:
                    entries = _a.sent();
                    if (entries === null) {
                        throw new Error('Directory not found');
                    }
                    return [4, mkdirp_1.default(destPath)];
                case 2:
                    _a.sent();
                    _i = 0, entries_1 = entries;
                    _a.label = 3;
                case 3:
                    if (!(_i < entries_1.length)) return [3, 9];
                    entry = entries_1[_i];
                    entryPath = path_1.default.join(srcPath, entry);
                    return [4, fsp.stat(entryPath)];
                case 4:
                    stat = _a.sent();
                    if (stat === null) {
                        throw new Error('Entry not found');
                    }
                    destEntryPath = path_1.default.join(destPath, entry);
                    if (!stat.isFile()) return [3, 6];
                    return [4, fsp.copyFile(entryPath, destEntryPath)];
                case 5:
                    _a.sent();
                    return [3, 8];
                case 6: return [4, copyDir(entryPath, destEntryPath)];
                case 7:
                    _a.sent();
                    _a.label = 8;
                case 8:
                    _i++;
                    return [3, 3];
                case 9: return [2];
            }
        });
    });
}
exports.copyDir = copyDir;
