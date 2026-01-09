const isLocalHost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

const CONFIG = {
  API_BASE_URL: isLocalHost
    ? 'http://127.0.0.1:3000'
    : 'https://hacktrackmmu.herokuapp.com',
};
