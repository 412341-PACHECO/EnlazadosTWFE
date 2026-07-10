import { Capacitor } from '@capacitor/core';

const BACKEND_PORT = 8080;
const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1']);
const LAN_BACKEND_HOST = '192.168.1.6';

const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return `http://localhost:${BACKEND_PORT}`;
  }

  const platform = Capacitor.getPlatform();

  if (platform === 'android') {
    return `http://10.0.2.2:${BACKEND_PORT}`;
  }

  if (platform === 'ios') {
    return `http://${LAN_BACKEND_HOST}:${BACKEND_PORT}`;
  }

  const { protocol, hostname } = window.location;
  const apiHost = LOCALHOST_HOSTS.has(hostname) ? 'localhost' : hostname;

  return `${protocol}//${apiHost}:${BACKEND_PORT}`;
};

export const environment = {
  production: true,
  apiBaseUrl: getApiBaseUrl(),
};
