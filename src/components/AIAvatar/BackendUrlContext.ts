import { createContext, useContext } from 'react';

export const BackendUrlContext = createContext<string | null>(null);

export const useBackendUrl = (): string => {
    const context = useContext(BackendUrlContext);
    if (!context) {
        throw new Error('useBackendUrl must be used within an AIAvatarProvider');
    }
    return context;
};