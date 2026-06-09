const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'http://localhost:8080';
  }

  const { protocol, hostname } = window.location;
  const apiHost = hostname === 'localhost' || hostname === '127.0.0.1' ? 'localhost' : hostname;

  return `${protocol}//${apiHost}:8080`;
};

export const environment = {
  production: false,
  apiBaseUrl: getApiBaseUrl(),
};
