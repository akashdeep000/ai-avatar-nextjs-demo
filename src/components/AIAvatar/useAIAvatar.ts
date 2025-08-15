import { useContext } from 'react';
import { AIAvatarContext, AIAvatarContextType } from './AIAvatarContext';

export const useAIAvatar = (): AIAvatarContextType => {
    const context = useContext(AIAvatarContext);
    if (!context) {
        throw new Error('useAIAvatar must be used within an AIAvatarProvider');
    }
    return context;
};