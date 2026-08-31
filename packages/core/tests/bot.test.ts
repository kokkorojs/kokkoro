import { expect, spyOn, test } from 'bun:test';

import { createBot } from './helpers';

test('发送图片', async () => {
  const bot = createBot();
  const uploadUserFile = spyOn(bot, 'uploadUserFile').mockResolvedValue({
    file_uuid: 'user-file',
    file_info: 'user-file-info',
    ttl: 0,
  });
  const sendUserMessage = spyOn(bot, 'sendUserMessage').mockResolvedValue({
    id: 'user-message',
    timestamp: '2026-08-31T00:00:00+08:00',
  });
  const uploadGroupFile = spyOn(bot, 'uploadGroupFile').mockResolvedValue({
    file_uuid: 'group-file',
    file_info: 'group-file-info',
    ttl: 0,
  });
  const sendGroupMessage = spyOn(bot, 'sendGroupMessage').mockResolvedValue({
    id: 'group-message',
    timestamp: '2026-08-31T00:00:00+08:00',
  });

  await bot.sendUserImage('user-openid', 'https://example.com/user.png', {
    msg_id: 'user-msg-id',
  });
  await bot.sendGroupImage('group-openid', 'https://example.com/group.png', {
    msg_id: 'group-msg-id',
  });

  expect(uploadUserFile).toHaveBeenCalledWith('user-openid', {
    file_type: 1,
    url: 'https://example.com/user.png',
    srv_send_msg: false,
  });
  expect(sendUserMessage).toHaveBeenCalledWith('user-openid', {
    msg_id: 'user-msg-id',
    msg_type: 7,
    media: { file_info: 'user-file-info' },
  });
  expect(uploadGroupFile).toHaveBeenCalledWith('group-openid', {
    file_type: 1,
    url: 'https://example.com/group.png',
    srv_send_msg: false,
  });
  expect(sendGroupMessage).toHaveBeenCalledWith('group-openid', {
    msg_id: 'group-msg-id',
    msg_type: 7,
    media: { file_info: 'group-file-info' },
  });
});
