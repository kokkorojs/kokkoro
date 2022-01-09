"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindMasterEvents = exports.createBot = exports.getAllBot = exports.getBot = exports.linkStart = void 0;
const path_1 = require("path");
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const oicq_1 = require("oicq");
const plugin_1 = __importDefault(require("./plugin"));
const command_1 = require("./command");
const util_1 = require("./util");
const help_1 = require("./help");
const { cyan } = util_1.colors;
const config_1 = require("./config");
const command_2 = require("./command");
// 所有机器人实例
const all_bot = new Map();
function getBot(uin) {
    return all_bot.get(uin);
}
exports.getBot = getBot;
function getAllBot() {
    return all_bot;
}
exports.getAllBot = getAllBot;
// 登录 bot
async function login() {
    const { bots } = (0, config_1.getGlobalConfig)();
    for (const uin in bots) {
        const { auto_login, login_mode, config } = bots[uin];
        // 是否自动登录
        if (!auto_login)
            continue;
        const data_dir = (0, path_1.join)(__workname, '/data/bots');
        const bot = (0, oicq_1.createClient)(Number(uin), { ...config, data_dir });
        bot.logger.mark(`正在登录账号: ${uin}`);
        switch (login_mode) {
            /**
             * 扫描登录
             *
             * 优点是不需要过滑块和设备锁
             * 缺点是万一 token 失效，无法自动登录，需要重新扫码
             */
            case 'qrcode':
                bot
                    .on('system.login.qrcode', function (event) {
                    bot.logger.mark(`扫码完成后拍 "Enter" 键继续...`);
                    process.stdin.once('data', () => {
                        this.login();
                    });
                })
                    .on('system.login.error', function (event) {
                    const { message } = event;
                    this.terminate();
                    bot.logger.error(message);
                    bot.logger.error(`当前账号无法登录，拍 "Enter" 键继续...`);
                    process.stdin.once('data', () => { });
                })
                    .login();
                break;
            /**
             * 密码登录
             *
             * 优点是一劳永逸
             * 缺点是需要过滑块，可能会报环境异常
             */
            case 'password':
                bot
                    // 监听滑动验证码事件
                    .on('system.login.slider', function (event) {
                    bot.logger.mark(`取 ticket 教程：https://github.com/takayama-lily/oicq/wiki/01.滑动验证码和设备锁`);
                    process.stdout.write('ticket: ');
                    process.stdin.once('data', this.submitSlider.bind(this));
                })
                    // 监听登录保护验证事件
                    .on('system.login.device', function () {
                    bot.logger.mark(`验证完成后拍 "Enter" 键继续...`);
                    process.stdin.once('data', () => this.login());
                })
                    .on('system.login.error', function (event) {
                    const { message } = event;
                    if (message.includes('密码错误')) {
                        inputPassword(bot);
                    }
                    else {
                        this.terminate();
                        bot.logger.error(message);
                        bot.logger.error(`当前账号无法登录，拍 "Enter" 键继续...`);
                        process.stdin.once('data', () => { });
                    }
                });
                try {
                    bot.login(await (0, promises_1.readFile)((0, path_1.join)(bot.dir, 'password')));
                }
                catch {
                    inputPassword(bot);
                }
                break;
            default:
                bot.logger.error(`你他喵的 login_mode 改错了`);
                break;
        }
        all_bot.set(Number(uin), bot);
    }
}
//#region inputPassword
// 输入密码
function inputPassword(bot) {
    bot.logger.mark(`首次登录请输入密码：`);
    process.stdin.once('data', async (data) => {
        const input = String(data).trim();
        if (!input.length)
            return inputPassword(bot);
        const password = (0, crypto_1.createHash)('md5').update(input).digest();
        await (0, promises_1.writeFile)((0, path_1.join)(bot.dir, 'password'), password, { mode: 0o600 });
        bot.login(password);
    });
}
//#endregion
//#region createBot
// 创建 bot
async function createBot(uin, delegate, parent) {
    const config = {
        platform: 5,
        log_level: 'info',
        data_dir: (0, path_1.join)(__workname, '/data/bots'),
    };
    const bot = (0, oicq_1.createClient)(uin, config);
    bot
        .on("system.login.qrcode", function (event) {
        const { image } = event;
        delegate.reply([
            `>登录流程：扫码完成后输入 "ok"\n>取消登录：输入 "cancel"\n`,
            oicq_1.segment.image(image)
        ]);
        // 监听消息
        parent.on("message.private", function listenLogin(event) {
            if (event.from_id === delegate.from_id) {
                const { raw_message } = event;
                switch (raw_message) {
                    case 'ok':
                        bot.login();
                        this.off("message.private", listenLogin);
                        break;
                    case 'cancel':
                        bot.terminate();
                        delegate.reply(">登录流程：已取消");
                        break;
                }
            }
        });
    })
        .on("system.login.error", function (data) {
        this.terminate();
        delegate.reply(`>登录流程遇到错误：${data.message}\n>登录已取消`);
    })
        .login();
    return bot;
}
exports.createBot = createBot;
//#endregion
/**
 * @description 全部 bot 给全部 master 发消息
 * @param message - 发送的消息文本
 */
function broadcastAll(message) {
    const { bots } = (0, config_1.getGlobalConfig)();
    for (const uin in bots) {
        const { masters } = bots[uin];
        for (const master of masters) {
            all_bot.forEach(bot => bot.isOnline() && bot.sendPrivateMsg(master, `通知：\n　　${message}`));
        }
    }
}
/**
 * @description 单个 bot 给 masters 发消息
 * @param bot - bot 实例对象
 * @param message - 发送的消息文本
 */
function broadcastOne(bot, message) {
    const { uin } = bot;
    const { bots } = (0, config_1.getGlobalConfig)();
    const { masters } = bots[uin];
    for (const master of masters)
        bot.sendPrivateMsg(master, `通知：\n　　${message}`);
}
function onOnline() {
    broadcastOne(this, `通知：\n　　该账号刚刚从掉线中恢复，现在一切正常`);
}
function onOffline(event) {
    const { message } = event;
    broadcastAll(`通知：\n　　${this.uin} 已离线，${message}`);
}
/**
 * @description 指令消息监听
 * @param this - bot 实例对象
 * @param data - bot 接收到的消息对象
 */
async function onMessage(event) {
    let message;
    const { message_type, raw_message } = event;
    const { user_level, prefix } = (0, util_1.getUserLevel)(event);
    if (!raw_message.startsWith(prefix))
        return;
    // 权限判断，群聊指令需要 level 3 以上，私聊指令需要 level 5 以上
    switch (message_type) {
        case 'group':
            if (user_level < 3)
                return;
            break;
        case 'private':
            if (user_level < 5)
                return;
            break;
    }
    const command = raw_message.replace(prefix, '');
    const { cmd, params } = (0, command_2.parseCommand)(command);
    for (const type of ['all', 'group', 'private']) {
        if (!command_1.commandHanders[type][cmd])
            continue;
        this.logger.info(`收到指令，正在处理: ${raw_message}`);
        if (message_type !== type && type !== 'all') {
            event.reply(`Error：指令 ${cmd} 不支持${message_type === 'group' ? '群聊' : '私聊'}`);
            return;
        }
        message = await command_1.commandHanders[type][cmd].call(this, params, event);
    }
    message || (message = `Error：未知指令 "${cmd}"`);
    event.reply(message);
    this.logger.info(`处理完毕，指令回复: ${message}`);
}
async function bindMasterEvents(bot) {
    const { uin } = bot;
    all_bot.set(uin, bot);
    bot.removeAllListeners('system.login.qrcode');
    bot.removeAllListeners('system.login.slider');
    bot.removeAllListeners('system.login.device');
    bot.removeAllListeners('system.login.error');
    bot.on('message', onMessage);
    bot.on('system.online', onOnline);
    bot.on('system.offline', onOffline);
    let number = 0;
    const plugins = await plugin_1.default.restorePlugins(bot);
    for (let [_, plugin] of plugins) {
        if (plugin.binds.has(bot))
            ++number;
    }
    setTimeout(() => {
        const { bots } = (0, config_1.getGlobalConfig)();
        const { prefix } = bots[uin];
        broadcastOne(bot, `启动成功，启用了 ${number} 个插件，发送 "${prefix}help" 可以查询 bot 相关指令`);
    }, 1000);
}
exports.bindMasterEvents = bindMasterEvents;
function linkStart() {
    // Acsii Font Name: Doh
    const wellcome = `———————————————————————————————————————————————————————————————————————————————————————————————————
                  _ _                            _          _         _    _
                 | | |                          | |        | |       | |  | |
    __      _____| | | ___ ___  _ __ ___   ___  | |_ ___   | | _____ | | _| | _____  _ __ ___
    \\ \\ /\\ / / _ \\ | |/ __/ _ \\| '_ \` _ \\ / _ \\ | __/ _ \\  | |/ / _ \\| |/ / |/ / _ \\| '__/ _ \\
     \\ V  V /  __/ | | (_| (_) | | | | | |  __/ | || (_) | |   < (_) |   <|   < (_) | | | (_) |
      \\_/\\_/ \\___|_|_|\\___\\___/|_| |_| |_|\\___|  \\__\\___/  |_|\\_\\___/|_|\\_\\_|\\_\\___/|_|  \\___/

———————————————————————————————————————————————————————————————————————————————————————————————————`;
    console.log(cyan(wellcome));
    util_1.logger.mark(`----------`);
    util_1.logger.mark(`Package Version: kokkoro-core@${help_1.KOKKORO_VERSION} (Released on ${help_1.KOKKORO_UPDAY})`);
    util_1.logger.mark(`View Changelogs：${help_1.KOKKORO_CHANGELOGS}`);
    util_1.logger.mark(`----------`);
    util_1.logger.mark(`项目启动完成，开始登录账号`);
    process.title = 'kokkoro';
    login().then(() => {
        if (!all_bot.size)
            util_1.logger.info(`当前无可登录的账号，请检查是否开启 auto_login`);
        all_bot.forEach(bot => {
            bot.once('system.online', () => {
                bindMasterEvents(bot);
                bot.logger.info(`可给机器人发送 ">help" 查看指令帮助`);
            });
        });
    });
}
exports.linkStart = linkStart;
