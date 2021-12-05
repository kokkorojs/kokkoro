"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.message = exports.checkCommand = exports.lowdb = exports.logger = exports.axios = exports.tips = exports.colors = exports.linkStart = void 0;
global.__workname = process.cwd();
const util_1 = require("./util");
const bot_1 = require("./bot");
const help_1 = require("./help");
const { cyan } = util_1.colors;
async function linkStart() {
    // Acsii Font Name: Mini: http://patorjk.com/software/taag/
    const wellcome = `-------------------------------------------------------------------------------------
\\    / _  | |  _  _  ._ _   _    _|_  _    |   _  |  |   _  ._ _  
 \\/\\/ (/_ | | (_ (_) | | | (/_    |_ (_)   |< (_) |< |< (_) | (_)
-------------------------------------------------------------------------------------`;
    console.log(cyan(wellcome));
    util_1.logger.mark(`----------`);
    util_1.logger.mark(`Package Version: kokkoro@${help_1.KOKKORO_VERSION} (Released on ${help_1.KOKKORO_UPDAY})`);
    util_1.logger.mark(`View Changelogs：${help_1.KOKKORO_CHANGELOGS}`);
    util_1.logger.mark(`----------`);
    util_1.logger.mark(`项目启动完成，开始登录账号`);
    process.title = 'kokkoro';
    const all_bot = await (0, bot_1.loginBot)();
    if (!all_bot.size)
        util_1.logger.info(`当前无可登录的账号，请检查是否开启 auto_login`);
    all_bot.forEach(bot => {
        bot.once('system.online', () => {
            (0, bot_1.bindMasterEvents)(bot);
            bot.logger.info(`可发送 ">help" 给机器人查看指令帮助`);
        });
    });
}
exports.linkStart = linkStart;
var util_2 = require("./util");
Object.defineProperty(exports, "colors", { enumerable: true, get: function () { return util_2.colors; } });
Object.defineProperty(exports, "tips", { enumerable: true, get: function () { return util_2.tips; } });
Object.defineProperty(exports, "axios", { enumerable: true, get: function () { return util_2.axios; } });
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return util_2.logger; } });
Object.defineProperty(exports, "lowdb", { enumerable: true, get: function () { return util_2.lowdb; } });
Object.defineProperty(exports, "checkCommand", { enumerable: true, get: function () { return util_2.checkCommand; } });
Object.defineProperty(exports, "message", { enumerable: true, get: function () { return util_2.message; } });
