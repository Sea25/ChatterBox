// Get username from localStorage
let username = localStorage.getItem('whatsappUsername');
if (!username) window.location.href = 'index.html';

// WebSocket connection with error handling
let socket;
try {
  socket = new WebSocket('ws://localhost:8080');
} catch (e) {
  alert("Failed to connect to chat server. Please make sure the server is running.");
  console.error("WebSocket error:", e);
}

const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typing-indicator');
const onlineCount = document.getElementById('online-count');
const userAvatar = document.getElementById('user-avatar');
const clearChatButton = document.getElementById('clear-chat');
const emojiButton = document.getElementById('emoji-button');

// Set user avatar initial
userAvatar.textContent = username.charAt(0).toUpperCase();

let isTyping = false;
let typingTimeout;

// Connection handlers
if (socket) {
  socket.onopen = () => {
    console.log('Connected to chat server');
    addSystemMessage('You are now connected!');
    
    // Send username to server
    socket.send(JSON.stringify({
      type: 'username',
      username: username
    }));
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'history') {
      // Load past messages
      data.data.forEach(msg => addMessage(msg, false));
    } else if (data.type === 'message') {
      // Add new message
      addMessage(data.data, true);
    } else if (data.type === 'typing') {
      // Show typing indicator
      if (data.username !== username) {
        showTypingIndicator(data.username);
      }
    } else if (data.type === 'userList') {
      // Update online users count
      updateOnlineCount(data.users.length);
    }
  };

  socket.onclose = () => {
    addSystemMessage('Connection lost. Trying to reconnect...');
    setTimeout(() => window.location.reload(), 3000);
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    addSystemMessage('Connection error. Please refresh the page.');
  };
}

// Message sending functionality
function sendMessage() {
  const content = messageInput.value.trim();
  if (content && socket && socket.readyState === WebSocket.OPEN) {
    const message = {
      sender: username,
      content: content,
      timestamp: new Date().toISOString()
    };
    try {
      socket.send(JSON.stringify(message));
      messageInput.value = "";
    } catch (e) {
      console.error("Failed to send message:", e);
      addSystemMessage("Failed to send message. Please try again.");
    }
  }
}

// Send message when button is clicked or Enter is pressed
sendButton.onclick = sendMessage;
messageInput.onkeypress = (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
};

// Typing detection
messageInput.addEventListener('input', () => {
  if (!isTyping) {
    isTyping = true;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'typing',
        username: username
      }));
    }
  }
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    isTyping = false;
  }, 2000);
});

// Clear chat functionality
clearChatButton.addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm("Are you sure you want to clear all messages?")) {
    messagesDiv.innerHTML = '<div class="message-date">TODAY</div>';
  }
});

// Message display functions
function addMessage(msg, animate) {
  const isSent = msg.sender === username;
  const messageElement = document.createElement('div');
  messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
  
  if (animate) {
    messageElement.style.animation = 'fadeIn 0.3s ease';
  }

  messageElement.innerHTML = `
    <div class="message-content">${msg.content}</div>
    <div class="message-time">${formatTime(msg.timestamp)}</div>
  `;
  
  messagesDiv.appendChild(messageElement);
  scrollToBottom();
}

function addSystemMessage(text) {
  const systemMsg = document.createElement('div');
  systemMsg.className = 'message-date';
  systemMsg.textContent = text;
  messagesDiv.appendChild(systemMsg);
  scrollToBottom();
}

function showTypingIndicator(username) {
  typingIndicator.textContent = `${username} is typing...`;
  clearTimeout(typingIndicator.timeout);
  typingIndicator.timeout = setTimeout(() => {
    typingIndicator.textContent = '';
  }, 2000);
}

function updateOnlineCount(count) {
  onlineCount.textContent = `${count} online`;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}