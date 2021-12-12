"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindMasterEvents = exports.createBot = exports.loginBot = void 0;
const path_1 = require("path");
const crypto_1 = require("crypto");
const child_process_1 = require("child_process");
const promises_1 = require("fs/promises");
const oicq_1 = require("oicq");
const help_1 = require("./help");
const plugin_1 = __importDefault(require("./plugin"));
const setting_1 = require("./setting");
const config_1 = require("./config");
// 维护组 QQ
const admin = [2225151531];
// 所有机器人实例
const all_bot = new Map();
//#region broadcastOne
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
//#endregion
//#region broadcastAll
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
//#endregion
//#region onMessage
/**
 * @description 指令消息监听
 * @param this - bot 实例对象
 * @param data - bot 接收到的消息对象
 */
async function onMessage(event) {
    let message;
    const { message_type, raw_message } = event;
    const { user_level, prefix } = getUserLevel(event);
    // 权限判断，群聊指令需要 level 4 以上，私聊指令需要 level 5 以上
    switch (message_type) {
        case 'group':
            if (user_level < 4 || !raw_message.startsWith(prefix))
                return;
            break;
        case 'private':
            if (user_level < 5 || !raw_message.startsWith(prefix))
                return;
            break;
    }
    const { cmd, params } = (0, config_1.parseCommandline)(raw_message.replace(prefix, ''));
    for (const type of ['all', 'group', 'private']) {
        if (!eval(`cmdHanders.${type}[cmd]`))
            continue;
        this.logger.info(`收到指令，正在处理: ${raw_message}`);
        if (message_type !== type && type !== 'all') {
            event.reply(`Error：指令 ${cmd} 不支持${message_type === 'group' ? '群聊' : '私聊'}`);
            return;
        }
        message = await eval(`cmdHanders.${type}[cmd]?.call(this, params, event)`);
    }
    message = message || `Error：未知指令: ${cmd}`;
    event.reply(message);
    this.logger.info(`处理完毕，指令回复: ${message}`);
}
//#endregion
//#region getUserLevel
/**
 * @description 获取成员等级
 * @param event 群消息事件对象
 * @returns
 *   level 0 群成员（随活跃度提升）
 *   level 1 群成员（随活跃度提升）
 *   level 2 群成员（随活跃度提升）
 *   level 3 管  理
 *   level 4 群  主
 *   level 5 主  人
 *   level 6 维护组
 */
function getUserLevel(event) {
    const { self_id, user_id, sender } = event;
    const { level = 0, role = 'member' } = sender;
    const { bots } = (0, config_1.getGlobalConfig)();
    const { masters, prefix } = bots[self_id];
    let user_level;
    switch (true) {
        case admin.includes(user_id):
            user_level = 6;
            break;
        case masters.includes(user_id):
            user_level = 5;
            break;
        case role === 'owner':
            user_level = 4;
            break;
        case role === 'admin':
            user_level = 3;
            break;
        case level > 4:
            user_level = 2;
            break;
        case level > 2:
            user_level = 1;
            break;
        default:
            user_level = 0;
            break;
    }
    return { user_level, prefix };
}
//#endregion
//#region loginBot
// 登录 bot
async function loginBot() {
    const { bots } = (0, config_1.getGlobalConfig)();
    for (const uin in bots) {
        const { auto_login, login_mode, config } = bots[uin];
        // 是否自动登录
        if (!auto_login)
            break;
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
                    .on("system.login.qrcode", function (event) {
                    bot.logger.mark(`扫码完成后敲击 "Enter" 继续...`);
                    process.stdin.once("data", () => {
                        this.login();
                    });
                })
                    .on('system.login.error', function (event) {
                    this.terminate();
                    bot.logger.error(`当前账号无法登录，按 "Enter" 键退出程序...`);
                    process.stdin.once('data', process.exit);
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
                    .on("system.login.slider", function (event) {
                    bot.logger.mark(`取 ticket 教程：https://github.com/takayama-lily/oicq/wiki/01.滑动验证码和设备锁`);
                    process.stdout.write('ticket: ');
                    process.stdin.once("data", this.submitSlider.bind(this));
                })
                    // 监听登录保护验证事件
                    .on('system.login.device', function () {
                    bot.logger.mark(`验证完成后敲击 "Enter" 继续...`);
                    process.stdin.once('data', () => this.login());
                })
                    .on('system.login.error', function (event) {
                    const { message } = event;
                    if (message.includes('密码错误')) {
                        inputPassword(bot);
                    }
                    else {
                        this.terminate();
                        bot.logger.error(`当前账号无法登录，按 "Enter" 键退出程序...`);
                        process.stdin.once('data', process.exit);
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
    return all_bot;
}
exports.loginBot = loginBot;
//#endregion
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
function onOnline() {
    broadcastOne(this, `此账号刚刚从掉线中恢复，现在一切正常。`);
}
function onOffline(event) {
    const { message } = event;
    broadcastAll(this.uin + `已离线，\n原因为：${message}`);
}
//#region bindMasterEvents
async function bindMasterEvents(bot) {
    const { uin } = bot;
    all_bot.set(uin, bot);
    bot.removeAllListeners('system.login.slider');
    bot.removeAllListeners('system.login.device');
    bot.removeAllListeners('system.login.error');
    bot.on('system.online', onOnline);
    bot.on('system.offline', onOffline);
    bot.on('message', onMessage);
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
//#endregion
const cmdHanders = {
    all: {
        //#region echo
        async echo(params) {
            return params.join(' ');
        },
        //#endregion
    },
    group: {
        //#region setting
        async setting(params, event) {
            if (params[0] === 'help') {
                return help_1.HELP_ALL.setting;
            }
            const { self_id, group_id } = event;
            return await (0, setting_1.handleSetting)(params, self_id, group_id);
        },
        //#endregion
        //#region list
        async list(params, event) {
            const { self_id, group_id } = event;
            return (0, setting_1.getList)(self_id, group_id);
        },
        //#endregion
        //#region option
        async option(params, event) {
            const { self_id, group_id } = event;
            return (0, setting_1.setOption)(self_id, group_id, params);
        },
        //#endregion
    },
    private: {
        //#region help
        async help(params) {
            return help_1.HELP_ALL[params[0]] || help_1.HELP_ALL.default;
        },
        //#endregion
        //#region conf
        async conf(params, event) {
            if (params[0] === 'help') {
                return help_1.HELP_ALL.conf;
            }
            return await (0, config_1.handleConfig)(params, this.uin);
        },
        //#endregion
        //#region restart
        async restart() {
            setTimeout(() => {
                (0, child_process_1.spawn)(process.argv.shift(), process.argv, { cwd: __workname, detached: true, stdio: 'inherit' }).unref();
                process.exit(0);
            }, 3000);
            return `正在重启程序...`;
        },
        //#endregion
        //#region shutdown
        async shutdown() {
            setTimeout(() => process.exit(0), 3000);
            return `正在结束程序...`;
        },
        //#endregion
        //#region enable
        async enable(params, event) {
            const name = params[0];
            const uin = this.uin;
            const bot = all_bot.get(uin);
            try {
                await plugin_1.default.enable(name, bot);
                return `${bot.nickname} (${uin}) 启用插件成功`;
            }
            catch (error) {
                return error.message;
            }
        },
        //#endregion
        //#region disable
        async disable(params, event) {
            const name = params[0];
            const uin = this.uin;
            const bot = all_bot.get(uin);
            try {
                await plugin_1.default.disable(name, bot);
                return `${bot.nickname} (${uin}) 禁用插件成功`;
            }
            catch (error) {
                return error.message;
            }
        },
        //#endregion
        //#region plug
        async plug(params, event) {
            const cmd = params[0];
            if (!cmd) {
                try {
                    const { plugin_modules, node_modules, plugins } = await plugin_1.default.findAllPlugins();
                    const msg = ['可用插件模块列表：'];
                    for (let name of [...plugin_modules, ...node_modules]) {
                        if (name.startsWith('kokkoro-'))
                            name = name.slice(8);
                        const plugin = plugins.get(name);
                        msg.push(`▼ ${name} (${plugin ? '已' : '未'}导入)`);
                        if (plugin) {
                            for (let bot of plugin.binds)
                                msg.push(`\t${bot.nickname} (${bot.uin}),`);
                        }
                    }
                    msg.push(`\n※ 当前目录共检索到 ${plugin_modules.length + node_modules.length} 个插件`);
                    return msg.join('\n');
                }
                catch (error) {
                    const { message } = error;
                    return `Error: ${message}`;
                }
            }
            if (cmd === 'help') {
                return help_1.HELP_ALL.plug;
            }
            const name = params[1];
            const uin = Number(params[2]) || this.uin;
            const bot = all_bot.get(uin);
            let msg = '';
            try {
                if (!name)
                    throw new Error('请输入插件名称');
                switch (cmd) {
                    case 'on-all':
                        for (let [_, bot] of all_bot) {
                            await plugin_1.default.enable(name, bot);
                        }
                        msg = '全部机器人启用插件成功';
                        break;
                    case 'off-all':
                        for (let [_, bot] of all_bot) {
                            await plugin_1.default.disable(name, bot);
                        }
                        msg = '全部机器人禁用插件成功';
                        break;
                    case 'del':
                        await plugin_1.default.deletePlugin(name);
                        msg = '卸载插件成功';
                        break;
                    case 'restart':
                        await plugin_1.default.restartPlugin(name);
                        msg = '重启插件成功';
                        break;
                    default:
                        throw new Error(`未知参数：${cmd}`);
                }
                return `Success: ${msg}`;
            }
            catch (error) {
                const { message } = error;
                return `Error: ${message}`;
            }
        },
        //#endregion
        //#region set
        // async set(params, event) {
        //   let bot = all_bot.get(event.self_id) as Client;
        //   let key = params[0] as keyof ConfBot;
        //   let value = params[1] as any;
        //   if (!key)
        //     return `// 修改输入：>set <key> <value>\n// 修改 platform 需要重新登录\n"${event.self_id}" ${JSON.stringify(bot.config, null, 2)}`
        //   if (!Reflect.has(bot.config, key))
        //     return `Error：请输入正确的key`
        //   if (!value)
        //     return `Error：请输入正确的value`
        //   if (value === `false`)
        //     value = false
        //   if (typeof bot.config[key] === `boolean`)
        //     value = Boolean(value)
        //   if (typeof bot.config[key] === `number`)
        //     value = isNaN(Number(value)) ? bot.config[key] : Number(value)
        //   bot.config[key] = value;
        //   if (key === `log_level`) {
        //     bot.logger.level = value
        //   }
        //   try {
        //     await writeConfBot(bot)
        //     return `Success: 设置成功`
        //   } catch (error) {
        //     const { message } = error as Error;
        //     return `Error: ${message}`
        //   }
        // },
        //#endregion
        //#region login
        async login(params, event) {
            const uin = Number(params[0]);
            switch (true) {
                case all_bot.has(uin):
                    const bot = all_bot.get(uin);
                    // 判断账号是否已登录
                    if (bot?.isOnline()) {
                        return `Error：已经登录过这个号了`;
                    }
                    else {
                        bot?.login();
                        return `Sucess：已将该账号上线`;
                    }
                case !uin:
                    return `Error：请输入账号`;
            }
            const bot = await createBot(uin, event, this);
            bot.once('system.online', function () {
                // 写入数据
                (0, config_1.addBot)(uin, event.sender.user_id);
                bindMasterEvents(bot);
                event.reply('>登录成功');
            });
            return `>开始登录流程，账号：${uin}`;
        },
        //#endregion
        //#region logout
        async logout(params, event) {
            const uin = Number(params[0]);
            const bot = all_bot.get(uin);
            if (!bot)
                return `Error: 账号输入错误，无法找到该实例`;
            await bot.logout();
            return `Success：已将该账号下线`;
        },
        //#endregion
        //#region bot
        async bot(params, event) {
            const msg = [`当前已登录账号：`];
            const cmd = params[0], uin = Number(params[1]);
            if (!cmd) {
                for (let [uin, bot] of all_bot) {
                    msg.push(`▼ ${bot.nickname} (${uin})\n\t状　态：${bot.isOnline() ? '在线' : '离线'}\n\t群　聊：${bot.gl.size} 个\n\t好　友：${bot.fl.size} 个\n\t消息量：${bot.stat.msg_cnt_per_min} / 分`);
                }
                return msg.join('\n');
            }
            if (cmd === 'help') {
                return help_1.HELP_ALL.bot;
            }
            const bot = all_bot.get(uin);
            if (!bot)
                return `Error: 账号输入错误，无法找到该实例`;
            if (cmd === 'del') {
                if (bot.isOnline()) {
                    return `Error：此机器人正在登录中，请先登出在删除`;
                }
                await plugin_1.default.disableAll(bot);
                all_bot.delete(uin);
                (0, config_1.cutBot)(uin);
                return `Sucess：已删除此机器人实例`;
            }
            else {
                return `Error：未知参数：${cmd}`;
            }
        }
        //#endregion
    },
};
