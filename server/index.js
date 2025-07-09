const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;

const clients = new Map();
const messageHistory = [];
const users = new Set();

app.use(express.static(path.join(__dirname, '../public')));

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

wss.on('connection', (ws) => {
  const id = uuidv4();
  let username = 'Anonymous';

  clients.set(ws, { id, username });

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

    if (data.type === 'clear') {
      messageHistory.length = 0;
      console.log(`Chat cleared by ${username}`);

      const clearMessage = JSON.stringify({ type: 'clear' });
      [...clients.keys()].forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(clearMessage);
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

    messageHistory.push(fullMessage);
    if (messageHistory.length > 100) messageHistory.shift();

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
