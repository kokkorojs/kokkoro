"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleConfig = exports.parseCommandline = exports.getGlobalConfig = exports.cutBot = exports.addBot = void 0;
const path_1 = require("path");
const promises_1 = require("fs/promises");
const config_path = (0, path_1.resolve)(__workname, 'kkrconfig.json');
const global_config = require(config_path);
function setGlobalConfig() {
    return (0, promises_1.writeFile)(config_path, `${JSON.stringify(global_config, null, 2)}`);
}
function getGlobalConfig() {
    return global_config;
}
exports.getGlobalConfig = getGlobalConfig;
function parseCommandline(commandline) {
    const [cmd, ...params] = commandline.split(' ');
    return {
        cmd, params
    };
}
exports.parseCommandline = parseCommandline;
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
    await setGlobalConfig();
}
exports.addBot = addBot;
async function cutBot(uin) {
    const { bots } = global_config;
    delete bots[uin];
    await setGlobalConfig();
}
exports.cutBot = cutBot;
async function openAutoLogin(self_id) {
    global_config.bots[self_id].auto_login = true;
    await setGlobalConfig();
    return `Success: 已开启账号自动登录`;
}
async function closeAutoLogin(self_id) {
    global_config.bots[self_id].auto_login = false;
    await setGlobalConfig();
    return `Success: 已关闭账号自动登录`;
}
async function addMaster(uin, self_id) {
    const { masters } = global_config.bots[self_id];
    if (!masters.includes(uin)) {
        masters.push(uin);
        await setGlobalConfig();
    }
    return `Success：当前 master 列表：${masters}`;
}
async function deleteMaster(uin, self_id) {
    const { masters } = global_config.bots[self_id];
    if (!masters.includes(uin)) {
        return `Error: ${uin} is not defined`;
    }
    const isMaster = (master) => master === uin;
    const index = masters.findIndex(isMaster);
    masters.splice(index, 1);
    await setGlobalConfig();
    return `Success: 当前 master 列表：${masters}`;
}
async function setPrefix(prefix, self_id) {
    if (prefix) {
        const { prefix: old_prefix } = global_config.bots[self_id];
        global_config.bots[self_id].prefix = prefix;
        await setGlobalConfig();
        return `Success: prefix '${old_prefix}' >>> '${prefix}'`;
    }
    else {
        return `Error: prefix 至少需要一个字符`;
    }
}
async function setPlatform(platform, self_id) {
    const params = [1, 2, 3, 4, 5];
    if (!params.includes(platform))
        return `Error: platform 的合法值为:\n\t[${params.join(', ')}]`;
    const { config } = global_config.bots[self_id];
    const { platform: old_platform } = config;
    global_config.bots[self_id].config.platform = platform;
    await setGlobalConfig();
    return `Success: platform ${old_platform} >>> ${platform}`;
}
async function setLogLevel(log_level, self_id) {
    const params = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'mark', 'off', undefined];
    if (!params.includes(log_level))
        return `Error: platform 的合法值为:\n\t[${params.join(', ')}]`;
    const { config } = global_config.bots[self_id];
    const { log_level: old_log_level } = config;
    global_config.bots[self_id].config.log_level = log_level;
    await setGlobalConfig();
    return `Success: log_level '${old_log_level}' >>> '${log_level}'`;
}
async function handleConfig(params, self_id) {
    if (!params[0])
        return `${self_id}: ${JSON.stringify(global_config.bots[self_id], null, 2)}`;
    let ret;
    try {
        switch (params[0]) {
            case 'opn-al':
                ret = await openAutoLogin(self_id);
                break;
            case 'cls-al':
                ret = await closeAutoLogin(self_id);
                break;
            case 'add-mst':
                ret = await addMaster(Number(params[1]), self_id);
                break;
            case 'del-mst':
                ret = await deleteMaster(Number(params[1]), self_id);
                break;
            case 'prefix':
                ret = await setPrefix(params[1], self_id);
                break;
            case 'platform':
                ret = await setPlatform(Number(params[1]), self_id);
                break;
            case 'log_level':
                ret = await setLogLevel(params[1], self_id);
                break;
            default:
                ret = `Error: 未知参数：${params[0]}`;
                break;
        }
    }
    catch {
        ret = 'Error: kkrconfig.json 写入失败，请检查是否被其它程序占用';
    }
    return ret;
}
exports.handleConfig = handleConfig;
