// Get username from localStorage
let username = localStorage.getItem('whatsappUsername');
if (!username) window.location.href = 'index.html';

// Set up WebSocket connection with error handling
let socket;
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typing-indicator');
const onlineCount = document.getElementById('online-count');
const userAvatar = document.getElementById('user-avatar');
const clearChatButton = document.getElementById('clear-chat');

// Set user avatar initial
userAvatar.textContent = username.charAt(0).toUpperCase();

let isTyping = false;
let typingTimeout;

function connectWebSocket() {
  try {
    socket = new WebSocket('ws://localhost:8080');
    
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

    socket.onclose = () => {
      addSystemMessage('Connection lost. Reconnecting...');
      setTimeout(connectWebSocket, 3000);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      addSystemMessage('Connection error. Trying to reconnect...');
    };
  } catch (e) {
    console.error('WebSocket initialization error:', e);
    addSystemMessage('Failed to connect. Please refresh the page.');
  }
}

// Initial connection
connectWebSocket();

// Message sending with error handling
function sendMessage() {
  const content = messageInput.value.trim();
  if (!content) return;
  
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    addSystemMessage('Not connected to server. Trying to reconnect...');
    connectWebSocket();
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
  } catch (e) {
    console.error("Failed to send message:", e);
    addSystemMessage("Failed to send message. Please try again.");
  }
}

// Event listeners
sendButton.onclick = sendMessage;
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Typing detection
messageInput.addEventListener('input', () => {
  if (!isTyping) {
    isTyping = true;
    if (socket?.readyState === WebSocket.OPEN) {
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

// Keep input area visible on mobile
window.addEventListener('resize', () => {
  const activeElement = document.activeElement;
  if (activeElement === messageInput) {
    setTimeout(() => {
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
});