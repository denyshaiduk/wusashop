/* Публічна конфігурація вітрини. Не додавайте сюди паролі чи ключі. */
(function() {
  var localHosts = ['localhost', '127.0.0.1'];
  var isLocal = localHosts.includes(window.location.hostname);
  window.WUSA_API_URL = window.WUSA_API_URL || (isLocal ? '' : 'https://api.wusashop.com.ua');
}());