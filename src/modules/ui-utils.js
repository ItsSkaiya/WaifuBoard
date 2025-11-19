export function showMessage(messageBar, message, type = 'success') {
  if (!messageBar) return;
  messageBar.textContent = message;

  if (type === 'error') {
    messageBar.classList.remove('bg-green-600');
    messageBar.classList.add('bg-red-600');
  } else {
    messageBar.classList.remove('bg-red-600');
    messageBar.classList.add('bg-green-600');
  }

  messageBar.classList.remove('hidden', 'translate-y-16');

  setTimeout(() => {
    messageBar.classList.add('hidden', 'translate-y-16');
  }, 3000);
}