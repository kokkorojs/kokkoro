"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCommand = exports.getStack = exports.getUserLevel = exports.message = exports.colors = exports.logger = void 0;
const axios_1 = __importDefault(require("axios"));
const log4js_1 = require("log4js");
const oicq_1 = require("oicq");
const config_1 = require("./config");
// 维护组 QQ
const admin = [2225151531];
/**
 * @description 控制台彩色打印
 * @param code - ANSI escape code
 * @returns - function
 */
function colorful(code) {
    return (msg) => `\u001b[${code}m${msg}\u001b[0m`;
}
const colors = {
    red: colorful(31), green: colorful(32), yellow: colorful(33),
    blue: colorful(34), magenta: colorful(35), cyan: colorful(36), white: colorful(37),
};
exports.colors = colors;
/**
 * @description 生成图片消息段（oicq 无法 catch 网络图片下载失败，所以单独处理）
 * @param url - 图片 url
 * @param flash - 是否闪图
 * @returns - Promise
 */
function image(url, flash = false) {
    return new Promise((resolve, reject) => {
        // 判断是否为网络链接
        if (!/^https?/g.test(url))
            return resolve(!flash ? oicq_1.segment.image(`file:///${url}`) : oicq_1.segment.flash(`file:///${url}`));
        axios_1.default.get(url, { responseType: 'arraybuffer', timeout: 5000, })
            .then((response) => {
            const image_base64 = `base64://${Buffer.from(response.data, 'binary').toString('base64')}`;
            resolve(!flash ? oicq_1.segment.image(image_base64) : oicq_1.segment.flash(image_base64));
        })
            .catch((error) => {
            reject(`Error: ${error.message}\n图片下载失败，地址:\n${url}`);
        });
    });
}
/**
 * @description 生成 at 成员的消息段
 * @param qq
 * @returns
 */
function at(qq) {
    return oicq_1.segment.at(qq);
}
const message = {
    image, at
};
exports.message = message;
// log4js
const logger = (0, log4js_1.getLogger)('[kokkoro log]');
exports.logger = logger;
logger.level = 'all';
/**
 * 校验指令
 *
 * @param command - 指令对象
 * @param raw_message - 收到的消息
 * @returns - 返回 command 对象匹配的方法名
 */
function checkCommand(command, raw_message) {
    const keys = Object.keys(command);
    const key_length = keys.length;
    for (let i = 0; i < key_length; i++) {
        const key = keys[i];
        if (!command[key].test(raw_message))
            continue;
        return key;
    }
}
exports.checkCommand = checkCommand;
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
    // event: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
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
exports.getUserLevel = getUserLevel;
//#endregion
/**
 * @description 获取调用栈
 * @returns - Array
 */
function getStack() {
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => stack;
    const stack = new Error().stack;
    Error.prepareStackTrace = orig;
    return stack;
}
exports.getStack = getStack;
;
