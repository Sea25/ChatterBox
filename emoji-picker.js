// Simple emoji picker functionality
document.addEventListener('DOMContentLoaded', function() {
  const emojiButton = document.getElementById('emoji-button');
  const emojiPicker = document.getElementById('emoji-picker');
  const messageInput = document.getElementById('messageInput');
  
  // Common emojis
  const emojis = ['😀', '😂', '😍', '😎', '😢', '😡', '👍', '👎', '❤️', '🔥', '🎉', '🙏'];
  
  // Populate emoji picker
  emojis.forEach(emoji => {
    const span = document.createElement('span');
    span.className = 'emoji-option';
    span.textContent = emoji;
    span.addEventListener('click', () => {
      messageInput.value += emoji;
      messageInput.focus();
    });
    emojiPicker.appendChild(span);
  });
  
  // Toggle emoji picker
  emojiButton.addEventListener('click', () => {
    emojiPicker.classList.toggle('show');
  });
  
  // Close emoji picker when clicking outside
  document.addEventListener('click', (e) => {
    if (!emojiButton.contains(e.target) && !emojiPicker.contains(e.target)) {
      emojiPicker.classList.remove('show');
    }
  });
});