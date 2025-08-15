import React from 'react';
import { Live2DCanvas } from './Live2DCanvas';
import { useAIAvatar } from './useAIAvatar';

interface AIAvatarCanvasProps {
    onReady?: () => void;
}

export const AIAvatarCanvas: React.FC<AIAvatarCanvasProps> = ({ onReady }) => {
    const { isCharecterLoaded, connectionStatus } = useAIAvatar();

    if (connectionStatus !== 'CONNECTED' || !isCharecterLoaded) {

        return <div className="flex items-center justify-center h-full">Loading Character...</div>;
    }

    return <Live2DCanvas onReady={onReady} />;
};