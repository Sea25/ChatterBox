const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const clients = new Map();
const messageHistory = [];
const users = new Set();

wss.on('connection', (ws) => {
  const id = uuidv4();
  let username = 'Anonymous';

  clients.set(ws, { id, username });
  
  // Send current user list to all clients
  const updateUserList = () => {
    const userList = Array.from(users);
    [...clients.keys()].forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'userList',
          users: userList
        }));
      }
    });
  };

  // Send message history to new client
  if (messageHistory.length > 0) {
    ws.send(JSON.stringify({
      type: 'history',
      data: messageHistory
    }));
  }

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    if (data.type === 'username') {
      username = data.username;
      users.add(username);
      clients.set(ws, { id, username });
      updateUserList();
      return;
    }
    
    if (data.type === 'typing') {
      [...clients.keys()].forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'typing',
            username: username
          }));
        }
      });
      return;
    }

    const fullMessage = {
      id: uuidv4(),
      sender: username,
      content: data.content,
      timestamp: new Date().toISOString()
    };

    // Add to history (limit to last 100 messages)
    messageHistory.push(fullMessage);
    if (messageHistory.length > 100) messageHistory.shift();

    // Broadcast to all clients
    const outbound = JSON.stringify({
      type: 'message',
      data: fullMessage
    });

    [...clients.keys()].forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(outbound);
      }
    });
  });

  ws.on('close', () => {
    users.delete(username);
    clients.delete(ws);
    updateUserList();
    console.log(`Client disconnected: ${username}`);
  });
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);