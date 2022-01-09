"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cutBot = exports.addBot = exports.getGlobalConfig = exports.configHanders = void 0;
const path_1 = require("path");
const promises_1 = require("fs/promises");
const config_path = (0, path_1.resolve)(__workname, 'kkrconfig.json');
const global_config = require(config_path);
async function setGlobalConfig() {
    return (0, promises_1.writeFile)(config_path, `${JSON.stringify(global_config, null, 2)}`);
}
function getGlobalConfig() {
    return global_config;
}
exports.getGlobalConfig = getGlobalConfig;
async function addBot(uin, master) {
    const { bots } = global_config;
    bots[uin] = {
        prefix: '>',
        auto_login: true,
        login_mode: 'qrcode',
        masters: [master],
        config: {
            platform: 5,
            log_level: 'info',
        }
    };
    return setGlobalConfig();
}
exports.addBot = addBot;
async function cutBot(uin) {
    const { bots } = global_config;
    delete bots[uin];
    return setGlobalConfig();
}
exports.cutBot = cutBot;
async function configHanders(params, event) {
    const { self_id } = event;
    let message;
    switch (true) {
        case !params.length:
            const config = `${self_id}: ${JSON.stringify(global_config.bots[self_id], null, 2)}`;
            message = config;
            break;
        default:
            message = `Error: 未知参数 "${params[0]}"`;
            break;
    }
    return message;
}
exports.configHanders = configHanders;
