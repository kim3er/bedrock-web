"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var bedrock_1 = require("./bedrock");
var express_1 = tslib_1.__importDefault(require("express"));
var node_sass_middleware_1 = tslib_1.__importDefault(require("node-sass-middleware"));
var path = tslib_1.__importStar(require("path"));
var app = express_1.default();
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'hbs');
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use(node_sass_middleware_1.default({
    src: path.join(__dirname, '../public'),
    dest: path.join(__dirname, '../public'),
    sourceMap: true
}));
app.use(express_1.default.static(path.join(__dirname, '../public')));
(function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var bedrock;
    return tslib_1.__generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                bedrock = new bedrock_1.Bedrock('c:\\bedrock-server');
                process.stdin.on('data', function (data) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
                    var message;
                    return tslib_1.__generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                message = data.toString().trim();
                                if (!(message === 'stop')) return [3, 2];
                                return [4, bedrock.stop()];
                            case 1:
                                _a.sent();
                                process.exit();
                                return [3, 6];
                            case 2:
                                if (!(message === 'list backups')) return [3, 4];
                                return [4, bedrock.listBackups()];
                            case 3:
                                _a.sent();
                                return [3, 6];
                            case 4:
                                if (!message.startsWith('restore')) return [3, 6];
                                return [4, bedrock.restore(message.replace('restore ', '').trim())];
                            case 5:
                                _a.sent();
                                _a.label = 6;
                            case 6: return [2];
                        }
                    });
                }); });
                process.on('exit', function () {
                    bedrock && bedrock.stop();
                });
                return [4, bedrock.start()];
            case 1:
                _a.sent();
                app.get('/', function (req, res) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
                    var _a, _b, _c;
                    var _d;
                    return tslib_1.__generator(this, function (_e) {
                        switch (_e.label) {
                            case 0:
                                _b = (_a = res).render;
                                _c = ['index'];
                                _d = {
                                    title: 'Express',
                                    message: req.query.backup
                                        ? req.query.backup === '1'
                                            ? 'Backed up'
                                            : req.query.backup + " restored"
                                        : null
                                };
                                return [4, bedrock.listBackups()];
                            case 1:
                                _b.apply(_a, _c.concat([(_d.backups = _e.sent(),
                                        _d)]));
                                return [2];
                        }
                    });
                }); });
                app.post('/restore/:backup', function (req, res) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
                    var backupName;
                    return tslib_1.__generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                backupName = req.params.backup;
                                if (typeof backupName !== 'string' || !backupName.length) {
                                    console.log(backupName, typeof backupName !== 'string');
                                    throw new Error('Backup name not recognised');
                                }
                                return [4, bedrock.restore(backupName)];
                            case 1:
                                _a.sent();
                                res.redirect("/?backup=" + req.params.backup);
                                return [2];
                        }
                    });
                }); });
                app.post('/backup', function (req, res) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
                    return tslib_1.__generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4, bedrock.backup('manual')];
                            case 1:
                                _a.sent();
                                res.redirect("/?backup=1");
                                return [2];
                        }
                    });
                }); });
                app.listen(3000, function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
                    return tslib_1.__generator(this, function (_a) {
                        console.log("The Borg are listening at http://localhost:3000");
                        return [2];
                    });
                }); });
                return [2];
        }
    });
}); })();
