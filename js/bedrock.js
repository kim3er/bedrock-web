"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bedrock = void 0;
var tslib_1 = require("tslib");
var child_process_1 = require("child_process");
var events_1 = require("events");
var path_1 = tslib_1.__importDefault(require("path"));
var fs_1 = tslib_1.__importDefault(require("fs"));
var fsx = tslib_1.__importStar(require("./fsx"));
var luxon_1 = require("luxon");
var mkdirp_1 = tslib_1.__importDefault(require("mkdirp"));
var del_1 = tslib_1.__importDefault(require("del"));
var fsp = fs_1.default.promises;
var BedrockEvents = (function () {
    function BedrockEvents() {
    }
    BedrockEvents.SERVER_STARTED = 'server-started';
    BedrockEvents.SERVER_STOPPED = 'server-stopped';
    BedrockEvents.PERMISSIONS_LISTED = 'permissions-listed';
    BedrockEvents.SAVE_HELD = 'save-held';
    BedrockEvents.SAVE_RESUMED = 'save-resume';
    BedrockEvents.PLAYER_CONNECTED = 'player-connected';
    BedrockEvents.PLAYER_DISCONNECTED = 'player-disconnected';
    return BedrockEvents;
}());
var BedrockMessages = (function () {
    function BedrockMessages() {
    }
    BedrockMessages.SERVER_STARTED = '[INFO] Server started.';
    BedrockMessages.SERVER_STOPPED = 'Quit correctly';
    BedrockMessages.SAVE_HELD = 'Saving...';
    BedrockMessages.SAVE_RESUMED = 'Changes to the level are resumed.';
    return BedrockMessages;
}());
var Bedrock = (function () {
    function Bedrock(serverPath) {
        this.events = new events_1.EventEmitter();
        this.backupTimeoutId = null;
        this.backingUp = false;
        this.currentMessage = '';
        this.settings = {};
        this._playerCount = 0;
        this.serverPath = serverPath;
    }
    Object.defineProperty(Bedrock.prototype, "playerCount", {
        get: function () {
            return this._playerCount;
        },
        enumerable: false,
        configurable: true
    });
    Bedrock.prototype.dataListener = function (data) {
        var dataStr = data.toString();
        if (dataStr.substring(dataStr.length - 1) !== '\n') {
            this.currentMessage += dataStr;
            return;
        }
        var message = this.currentMessage + dataStr.trim();
        this.currentMessage = '';
        if (message === BedrockMessages.SERVER_STARTED) {
            this.events.emit(BedrockEvents.SERVER_STARTED);
        }
        else if (message === BedrockMessages.SERVER_STOPPED) {
            this.events.emit(BedrockEvents.SERVER_STOPPED);
        }
        else if (message === BedrockMessages.SAVE_HELD) {
            this.events.emit(BedrockEvents.SAVE_HELD);
        }
        else if (message === BedrockMessages.SAVE_RESUMED) {
            this.events.emit(BedrockEvents.SAVE_RESUMED);
        }
        else if (message.startsWith('[INFO] Player connected')) {
            var arr = message
                .replace('[INFO] Player connected: ', '')
                .split(', xuid: ');
            var player = {
                handle: arr[0],
                xuid: arr[1]
            };
            if (++this._playerCount > 0) {
                this.startBackups();
            }
            this.events.emit(BedrockEvents.PLAYER_CONNECTED, player);
        }
        else if (message.startsWith('[INFO] Player disconnected')) {
            var arr = message
                .replace('[INFO] Player disconnected: ', '')
                .split(', xuid: ');
            var player = {
                handle: arr[0],
                xuid: arr[1]
            };
            if (--this._playerCount === 0) {
                this.stopBackups();
            }
            this.events.emit(BedrockEvents.PLAYER_DISCONNECTED, player);
        }
        else if (message.includes('"command":')) {
            this.events.emit(BedrockEvents.PERMISSIONS_LISTED, message);
        }
    };
    Bedrock.prototype.send = function (cmd) {
        this.server.stdin.write(cmd + "\n");
    };
    Bedrock.prototype.sendAndWait = function (cmd, event, timeout) {
        var _this = this;
        if (timeout === void 0) { timeout = 30000; }
        return new Promise(function (resolve, reject) {
            var listener = (function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                clearTimeout(timeoutId);
                resolve(args);
            }).bind(_this);
            var timeoutId = setTimeout(function () {
                _this.events.off(event, listener);
                reject(new Error("Request timed out: " + cmd));
            }, timeout);
            _this.events.once(event, listener);
            _this.server.stdin.write(cmd + "\n");
        });
    };
    Bedrock.prototype.once = function (event, timeout) {
        var _this = this;
        if (timeout === void 0) { timeout = 30000; }
        return new Promise(function (resolve, reject) {
            var listener = (function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                clearTimeout(timeoutId);
                resolve(args);
            }).bind(_this);
            var timeoutId = setTimeout(function () {
                _this.events.off(event, listener);
                reject(new Error('Request timed out'));
            }, timeout);
            _this.events.once(event, listener);
        });
    };
    Bedrock.prototype.wait = function (ms) {
        return new Promise(function (r) {
            setTimeout(function () { return r(); }, ms);
        });
    };
    Bedrock.prototype.startBackups = function () {
        var _this = this;
        if (this.backupTimeoutId !== null) {
            return;
        }
        this.backupTimeoutId = setTimeout(function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.backup()];
                    case 1:
                        _a.sent();
                        this.backupTimeoutId = null;
                        this.startBackups();
                        return [2];
                }
            });
        }); }, 5 * 1000 * 60);
    };
    Bedrock.prototype.stopBackups = function () {
        if (this.backupTimeoutId === null) {
            return;
        }
        clearTimeout(this.backupTimeoutId);
        this.backupTimeoutId = null;
    };
    Bedrock.prototype.load = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var contents, lines, _i, lines_1, line, cleaned, keyValue;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, fsp.readFile(path_1.default.join(this.serverPath, 'server.properties'))];
                    case 1:
                        contents = _a.sent();
                        lines = contents.toString().split('\n');
                        for (_i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                            line = lines_1[_i];
                            cleaned = line.trim();
                            if (cleaned.startsWith('#') || !cleaned.includes('=')) {
                                continue;
                            }
                            keyValue = cleaned.split('=');
                            this.settings[keyValue[0].trim()] = keyValue[1].trim();
                        }
                        return [2];
                }
            });
        });
    };
    Bedrock.prototype.start = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!Object.keys(this.settings).length) return [3, 2];
                        return [4, this.load()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (this.isRunning()) {
                            throw new Error('Server already running');
                        }
                        this.server = child_process_1.spawn(path_1.default.join(this.serverPath, 'bedrock_server.exe'));
                        this.server.stdout.on('data', this.dataListener.bind(this));
                        return [4, this.once(BedrockEvents.SERVER_STARTED)];
                    case 3:
                        _a.sent();
                        console.log(this.settings['server-name'] + " started!");
                        return [2];
                }
            });
        });
    };
    Bedrock.prototype.stop = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.isRunning()) {
                            return [2];
                        }
                        return [4, this.sendAndWait('stop', BedrockEvents.SERVER_STOPPED)];
                    case 1:
                        _a.sent();
                        return [4, new Promise(function (r) {
                                _this.server.once('close', function () {
                                    _this.server = undefined;
                                    _this._playerCount = 0;
                                    r();
                                });
                            })];
                    case 2:
                        _a.sent();
                        return [2];
                }
            });
        });
    };
    Bedrock.prototype.isRunning = function () {
        return this.server !== undefined;
    };
    Bedrock.prototype.listPermissions = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var args, message, arr;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.sendAndWait('permission list', BedrockEvents.PERMISSIONS_LISTED)];
                    case 1:
                        args = _a.sent();
                        message = args[0];
                        arr = message
                            .replace(/(\*|)###(\*|)/g, '')
                            .replace(/\s/g, '')
                            .replace('}{', '}*###*{')
                            .split('*###*');
                        return [2, {
                                ops: JSON.parse(arr[0]).result,
                                permissions: JSON.parse(arr[1]).result
                            }];
                }
            });
        });
    };
    Bedrock.prototype.saveQuery = function () {
        var _this = this;
        return new Promise(function (r) {
            _this.server.stdout.once('data', function (data) {
                var message = data.toString().trim();
                if (message.length === 0 || !message.startsWith('Data saved.')) {
                    r(null);
                    return;
                }
                var arr = message
                    .replace('Data saved. Files are now ready to be copied.', '')
                    .trim()
                    .split(', ');
                var files = [];
                for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
                    var f = arr_1[_i];
                    var fArr = f.split(':');
                    files.push({ name: fArr[0], size: Number(fArr[1]) });
                }
                r(files);
            });
            _this.send('save query');
        });
    };
    Bedrock.prototype.backup = function (name) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var files, backupBasePath, backupPath, idx, _i, files_1, file, srcPath, destPath;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.backingUp) {
                            throw new Error('Already backing up');
                        }
                        this.backingUp = true;
                        this.sendAndWait('save hold', BedrockEvents.SAVE_HELD);
                        return [4, this.saveQuery()];
                    case 1:
                        files = _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!(files === null)) return [3, 5];
                        return [4, this.wait(100)];
                    case 3:
                        _a.sent();
                        return [4, this.saveQuery()];
                    case 4:
                        files = _a.sent();
                        return [3, 2];
                    case 5:
                        backupBasePath = path_1.default.join(this.serverPath, 'backups');
                        return [4, fsx.exists(backupBasePath)];
                    case 6:
                        if (!!(_a.sent())) return [3, 8];
                        return [4, fsp.mkdir(backupBasePath)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8:
                        backupPath = path_1.default.join(backupBasePath, luxon_1.DateTime.utc().toFormat('yyyy-MM-dd-HH-mm'));
                        if (name !== undefined) {
                            backupPath += "-" + name;
                        }
                        return [4, fsx.exists(backupPath)];
                    case 9:
                        if (!_a.sent()) return [3, 13];
                        idx = 1;
                        _a.label = 10;
                    case 10: return [4, fsx.exists(backupPath + "-" + idx)];
                    case 11:
                        if (!_a.sent()) return [3, 12];
                        idx++;
                        return [3, 10];
                    case 12:
                        backupPath = backupPath + "-" + idx;
                        _a.label = 13;
                    case 13: return [4, fsp.mkdir(backupPath)];
                    case 14:
                        _a.sent();
                        _i = 0, files_1 = files;
                        _a.label = 15;
                    case 15:
                        if (!(_i < files_1.length)) return [3, 20];
                        file = files_1[_i];
                        srcPath = path_1.default.join(this.serverPath, 'worlds', file.name), destPath = path_1.default.join(backupPath, file.name);
                        if (!file.name.includes(path_1.default.posix.sep)) return [3, 17];
                        return [4, mkdirp_1.default(destPath.substring(0, destPath.lastIndexOf(path_1.default.sep)))];
                    case 16:
                        _a.sent();
                        _a.label = 17;
                    case 17: return [4, fsp.copyFile(srcPath, destPath)];
                    case 18:
                        _a.sent();
                        _a.label = 19;
                    case 19:
                        _i++;
                        return [3, 15];
                    case 20:
                        this.send('save resume');
                        this.backingUp = false;
                        return [2];
                }
            });
        });
    };
    Bedrock.prototype.listBackups = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var backupBasePath;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        backupBasePath = path_1.default.join(this.serverPath, 'backups');
                        return [4, fsx.exists(backupBasePath)];
                    case 1:
                        if (!(_a.sent())) {
                            return [2, []];
                        }
                        return [4, fsp.readdir(backupBasePath, {
                                withFileTypes: false
                            })];
                    case 2: return [2, _a.sent()];
                }
            });
        });
    };
    Bedrock.prototype.restore = function (backupName) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var backupBasePath, backupPath;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        backupBasePath = path_1.default.join(this.serverPath, 'backups'), backupPath = path_1.default.join(backupBasePath, backupName);
                        return [4, fsx.exists(backupPath)];
                    case 1:
                        if (!(_a.sent())) {
                            return [2];
                        }
                        this.stopBackups();
                        return [4, this.backup('before-restore')];
                    case 2:
                        _a.sent();
                        return [4, this.stop()];
                    case 3:
                        _a.sent();
                        return [4, del_1.default(path_1.default.join(this.serverPath, 'worlds', this.settings['level-name']), { force: true })];
                    case 4:
                        _a.sent();
                        fsx.copyDir(backupPath, path_1.default.join(this.serverPath, 'worlds'));
                        return [4, this.start()];
                    case 5:
                        _a.sent();
                        return [2];
                }
            });
        });
    };
    return Bedrock;
}());
exports.Bedrock = Bedrock;
