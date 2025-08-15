import React, { useRef } from 'react';
import { useLive2DModel } from './hooks/useLive2DModel';
import { useLive2DResize } from './hooks/useLive2DResize';
import { useAIAvatar } from './useAIAvatar';

interface Live2DCanvasProps {
    onReady?: () => void;
}

export const Live2DCanvas: React.FC<Live2DCanvasProps> = ({ onReady }) => {
    const { character } = useAIAvatar();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useLive2DResize({
        containerRef,
        modelInfo: character?.live2d_model_info,
        showSidebar: false,
        mode: 'chat',
        canvasRef,
    });

    const { handlers } = useLive2DModel({
        character: character ?? undefined,
        canvasRef: canvasRef,
        mode: 'chat',
        onReady,
    });

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            <canvas id="canvas" ref={canvasRef} {...handlers} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};