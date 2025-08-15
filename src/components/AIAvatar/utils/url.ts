export const getHttpUrl = (baseUrl: string): string => {
    if (baseUrl.startsWith('http')) {
        return baseUrl;
    }
    return `http://${baseUrl}`;
};

export const getWsUrl = (baseUrl: string): string => {
    if (baseUrl.startsWith('ws')) {
        return baseUrl;
    }
    if (baseUrl.startsWith('http')) {
        return baseUrl.replace(/^http/, 'ws');
    }
    return `ws://${baseUrl}`;
};