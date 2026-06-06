/**
 * 今日投喂 · WebSocket 实时通知服务器
 *
 * 启动: node server.js
 * 默认端口: 3456
 *
 * 协议说明:
 *   客户端 → 服务器: { type, payload }
 *   服务器 → 客户端: { type, payload, sender }
 *
 *   消息类型:
 *   - order-new      新订单（女朋友 → 广播给饲养员）
 *   - order-update   订单状态更新（饲养员 → 广播给女朋友）
 *   - menu-update    菜品库变更（饲养员 → 广播同步）
 *   - ping/pong      心跳保活
 *   - clients-count  在线客户端数量
 */

const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3456;

// 创建 HTTP 服务器（用于健康检查）
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', clients: wss.clients.size, uptime: process.uptime() }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>🍜 今日投喂 WebSocket 服务器</h1><p>在线客户端: ${wss.clients.size}</p><p>端口: ${PORT}</p>`);
  }
});

const wss = new WebSocketServer({ server });

// 客户端连接管理
const clients = new Map(); // ws -> { id, role, connectedAt }
let clientIdCounter = 0;

wss.on('connection', (ws, req) => {
  const clientId = `c_${++clientIdCounter}_${Date.now().toString(36)}`;
  const ip = req.socket.remoteAddress || 'unknown';
  clients.set(ws, { id: clientId, role: 'unknown', connectedAt: Date.now() });

  console.log(`[+] 客户端连接: ${clientId} (${ip})  在线: ${wss.clients.size}`);

  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'welcome',
    payload: { clientId, clientsCount: wss.clients.size },
    timestamp: Date.now()
  }));

  // 广播在线人数
  broadcast({ type: 'clients-count', payload: { count: wss.clients.size } });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const clientInfo = clients.get(ws) || {};

      switch (msg.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        case 'set-role':
          // 客户端声明角色: 'girlfriend' | 'boyfriend'
          clientInfo.role = msg.payload?.role || 'unknown';
          clients.set(ws, clientInfo);
          console.log(`[i] ${clientId} 角色: ${clientInfo.role}`);
          break;

        case 'order-new':
          // 女朋友下单 → 广播给所有人
          console.log(`[📋] 新订单: ${clientId}`);
          broadcast({
            type: 'order-new',
            payload: msg.payload,
            sender: clientId
          }, ws); // 排除发送者自己
          break;

        case 'order-update':
          // 饲养员更新订单状态
          console.log(`[🔄] 订单更新: ${clientId} -> ${msg.payload?.status}`);
          broadcast({
            type: 'order-update',
            payload: msg.payload,
            sender: clientId
          }, ws);
          break;

        case 'menu-update':
          // 菜品库变更
          console.log(`[📝] 菜单更新: ${clientId}`);
          broadcast({
            type: 'menu-update',
            payload: msg.payload,
            sender: clientId
          }, ws);
          break;

        default:
          console.log(`[?] 未知消息类型: ${msg.type}`);
          break;
      }
    } catch (e) {
      console.error('[!] 消息解析失败:', e.message);
      ws.send(JSON.stringify({ type: 'error', payload: { message: '无效的消息格式' } }));
    }
  });

  ws.on('close', () => {
    console.log(`[-] 客户端断开: ${clientId}  在线: ${wss.clients.size - 1}`);
    clients.delete(ws);
    broadcast({ type: 'clients-count', payload: { count: wss.clients.size } });
  });

  ws.on('error', (err) => {
    console.error(`[!] 客户端错误 ${clientId}:`, err.message);
    clients.delete(ws);
  });
});

function broadcast(msg, excludeWs = null) {
  const data = JSON.stringify({ ...msg, timestamp: Date.now() });
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === 1) {
      client.send(data);
    }
  });
}

server.listen(PORT, () => {
  console.log('');
  console.log('  🍜  今日投喂 · WebSocket 服务器已启动');
  console.log(`  📡  端口: ${PORT}`);
  console.log(`  🌐  健康检查: http://localhost:${PORT}/health`);
  console.log('');
  console.log('  等待客户端连接...');
  console.log('');
});

// 心跳检测（每30秒清理死连接）
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState !== 1) {
      clients.delete(ws);
    }
  });
}, 30000);

console.log('启动中...');
