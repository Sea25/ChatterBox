// Get username from localStorage
let username = localStorage.getItem('whatsappUsername');
if (!username) window.location.href = 'index.html';

// WebSocket configuration
const socketUrl = `ws://${window.location.host}`;
let socket;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000; // 3 seconds

// DOM elements
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typing-indicator');
const onlineCount = document.getElementById('online-count');
const userAvatar = document.getElementById('user-avatar');
const clearChatButton = document.getElementById('clear-chat');

// Set user avatar
userAvatar.textContent = username.charAt(0).toUpperCase();

// Connection management
function connect() {
  addSystemMessage('Connecting to chat server...');
  
  try {
    socket = new WebSocket(socketUrl);

    socket.onopen = () => {
      reconnectAttempts = 0;
      console.log('Connected to chat server');
      addSystemMessage('Connected successfully!');
      
      // Send username to server
      socket.send(JSON.stringify({
        type: 'username',
        username: username
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'history') {
        data.data.forEach(msg => addMessage(msg, false));
      } else if (data.type === 'message') {
        addMessage(data.data, true);
      } else if (data.type === 'typing') {
        if (data.username !== username) {
          showTypingIndicator(data.username);
        }
      } else if (data.type === 'userList') {
        updateOnlineCount(data.users.length);
      }
    };

    socket.onclose = (event) => {
      if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
        reconnect();
      } else {
        addSystemMessage('Disconnected from server. Please refresh the page.');
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (socket.readyState === WebSocket.CLOSED) {
        reconnect();
      }
    };

  } catch (error) {
    console.error('WebSocket initialization error:', error);
    reconnect();
  }
}

function reconnect() {
  reconnectAttempts++;
  if (reconnectAttempts <= maxReconnectAttempts) {
    addSystemMessage(`Connection lost. Reconnecting... (Attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
    setTimeout(connect, reconnectDelay);
  } else {
    addSystemMessage('Failed to reconnect. Please check your internet connection and refresh the page.');
  }
}

// Initial connection
connect();

// Message handling
function sendMessage() {
  const content = messageInput.value.trim();
  if (!content) return;

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    addSystemMessage('Not connected. Trying to reconnect...');
    connect();
    return;
  }

  try {
    const message = {
      sender: username,
      content: content,
      timestamp: new Date().toISOString()
    };
    socket.send(JSON.stringify(message));
    messageInput.value = "";
  } catch (error) {
    console.error("Failed to send message:", error);
    addSystemMessage("Failed to send message. Please try again.");
  }
}

// Event listeners
sendButton.onclick = sendMessage;
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Clear chat
clearChatButton.addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm("Clear all messages?")) {
    messagesDiv.innerHTML = '<div class="message-date">TODAY</div>';
  }
});

// Helper functions
function addMessage(msg, animate) {
  const isSent = msg.sender === username;
  const messageElement = document.createElement('div');
  messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
  
  if (animate) messageElement.style.animation = 'fadeIn 0.3s ease';

  messageElement.innerHTML = `
    ${!isSent ? `<div class="sender-name">${msg.sender}</div>` : ''}
    <div class="message-content">${msg.content}</div>
    <div class="message-time">${formatTime(msg.timestamp)}</div>
  `;
  
  messagesDiv.appendChild(messageElement);
  scrollToBottom();
}

function addSystemMessage(text) {
  const systemMsg = document.createElement('div');
  systemMsg.className = 'message received';
  systemMsg.innerHTML = `
    <div class="sender-name">System</div>
    <div class="message-content">${text}</div>
    <div class="message-time">${formatTime(new Date().toISOString())}</div>
  `;
  messagesDiv.appendChild(systemMsg);
  scrollToBottom();
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}