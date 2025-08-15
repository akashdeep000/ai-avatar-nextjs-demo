/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import { updateModelConfig } from '@cubismsdksamples/lappdefine';
import { LAppDelegate } from '@cubismsdksamples/lappdelegate';
import { LAppLive2DManager } from '@cubismsdksamples/lapplive2dmanager';
import { initializeLive2D } from '@cubismsdksamples/main';
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { Character } from "../state/types";
import { useAIAvatar } from '../useAIAvatar';
import { getHttpUrl } from '../utils/url';

interface UseLive2DModelProps {
    character: Character | undefined;
    canvasRef: RefObject<HTMLCanvasElement | null>;
    mode: 'pet' | 'chat';
    onReady?: () => void;
}

interface Position {
    x: number;
    y: number;
}

// Thresholds for tap vs drag detection
const TAP_DURATION_THRESHOLD_MS = 200; // Max duration for a tap
const DRAG_DISTANCE_THRESHOLD_PX = 5; // Min distance to be considered a drag

function parseModelUrl(url: string): { baseUrl: string; modelDir: string; modelFileName: string } {
    try {
        const urlObj = new URL(url);
        const { pathname } = urlObj;

        const lastSlashIndex = pathname.lastIndexOf('/');
        if (lastSlashIndex === -1) {
            throw new Error('Invalid model URL format');
        }

        const fullFileName = pathname.substring(lastSlashIndex + 1);
        const modelFileName = fullFileName.replace('.model3.json', '');

        const secondLastSlashIndex = pathname.lastIndexOf('/', lastSlashIndex - 1);
        if (secondLastSlashIndex === -1) {
            throw new Error('Invalid model URL format');
        }

        const modelDir = pathname.substring(secondLastSlashIndex + 1, lastSlashIndex);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}${pathname.substring(0, secondLastSlashIndex + 1)}`;

        return { baseUrl, modelDir, modelFileName };
    } catch (error) {
        console.error('Error parsing model URL:', error);
        return { baseUrl: '', modelDir: '', modelFileName: '' };
    }
}

export const playAudioWithLipSync = (audioPath: string, modelIndex = 0): Promise<void> => new Promise((resolve, reject) => {
    const live2dManager = window.LAppLive2DManager?.getInstance();
    if (!live2dManager) {
        reject(new Error('Live2D manager not initialized'));
        return;
    }

    const fullPath = `/Resources/${audioPath}`;
    const audio = new Audio(fullPath);

    audio.addEventListener('canplaythrough', () => {
        const model = live2dManager.getModel(modelIndex);
        if (model) {
            if (model._wavFileHandler) {
                model._wavFileHandler.start(fullPath);
                audio.play();
            } else {
                reject(new Error('Wav file handler not available on model'));
            }
        } else {
            reject(new Error(`Model index ${modelIndex} not found`));
        }
    });

    audio.addEventListener('ended', () => {
        resolve();
    });

    audio.addEventListener('error', () => {
        reject(new Error(`Failed to load audio: ${fullPath}`));
    });

    audio.load();
});

export const useLive2DModel = ({
    character,
    canvasRef,
    mode,
    onReady,
}: UseLive2DModelProps) => {
    const { backendUrl } = useAIAvatar();
    const modelInfo = character?.live2d_model_info;
    const isPet = mode === 'pet';
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
    const dragStartPos = useRef<Position>({ x: 0, y: 0 });
    const modelStartPos = useRef<Position>({ x: 0, y: 0 });
    const modelPositionRef = useRef<Position>({ x: 0, y: 0 });
    const prevModelUrlRef = useRef<string | null>(null);
    const isHoveringModelRef = useRef(false);
    const electronApi = (window as any).electron;
    const mouseDownTimeRef = useRef<number>(0);
    const mouseDownPosRef = useRef<Position>({ x: 0, y: 0 });
    const isPotentialTapRef = useRef<boolean>(false);

    useEffect(() => {
        if (!modelInfo || !canvasRef.current) {
            return;
        }

        if (!backendUrl) return;
        const httpUrl = getHttpUrl(backendUrl);
        const relativeUrl = modelInfo?.url;
        const currentUrl = relativeUrl ? `${httpUrl}${relativeUrl}` : undefined;

        if (currentUrl && currentUrl !== prevModelUrlRef.current) {
            prevModelUrlRef.current = currentUrl;

            try {
                const { baseUrl, modelDir, modelFileName } = parseModelUrl(currentUrl);

                if (baseUrl && modelDir) {
                    updateModelConfig(baseUrl, modelDir, modelFileName, Number(modelInfo.kScale));

                    // Release the previous model instance before initializing a new one
                    if (LAppLive2DManager.getInstance()) {
                        LAppLive2DManager.releaseInstance();
                    }

                    initializeLive2D();

                    if (onReady) {
                        onReady();
                    }
                }
            } catch (error) {
                console.error('Error processing model URL:', error);
            }
        }
    }, [modelInfo, canvasRef, onReady, backendUrl]);

    const getModelPosition = useCallback(() => {
        const adapter = (window as any).getLAppAdapter?.();
        if (adapter) {
            const model = adapter.getModel();
            if (model && model._modelMatrix) {
                const matrix = model._modelMatrix.getArray();
                return {
                    x: matrix[12],
                    y: matrix[13],
                };
            }
        }
        return { x: 0, y: 0 };
    }, []);

    const setModelPosition = useCallback((x: number, y: number) => {
        const adapter = (window as any).getLAppAdapter?.();
        if (adapter) {
            const model = adapter.getModel();
            if (model && model._modelMatrix) {
                const matrix = model._modelMatrix.getArray();

                const newMatrix = [...matrix];
                newMatrix[12] = x;
                newMatrix[13] = y;

                model._modelMatrix.setMatrix(newMatrix);
                modelPositionRef.current = { x, y };
            }
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            const currentPos = getModelPosition();
            modelPositionRef.current = currentPos;
            setPosition(currentPos);
        }, 500);

        return () => clearTimeout(timer);
    }, [modelInfo?.url, getModelPosition]);

    const getCanvasScale = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return { width: 1, height: 1, scale: 1 };

        const { width, height, clientWidth } = canvas;
        const scale = width / clientWidth;

        return { width, height, scale };
    }, [canvasRef]);

    const screenToModelPosition = useCallback((screenX: number, screenY: number) => {
        const { width, height, scale } = getCanvasScale();

        const x = ((screenX * scale) / width) * 2 - 1;
        const y = -((screenY * scale) / height) * 2 + 1;

        return { x, y };
    }, [getCanvasScale]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const adapter = (window as any).getLAppAdapter?.();
        if (!adapter || !canvasRef.current) return;

        const model = adapter.getModel();
        const view = LAppDelegate.getInstance().getView();
        if (!view || !model) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const scale = canvas.width / canvas.clientWidth;
        const scaledX = x * scale;
        const scaledY = y * scale;
        const modelX = view._deviceToScreen.transformX(scaledX);
        const modelY = view._deviceToScreen.transformY(scaledY);

        const hitAreaName = model.anyhitTest(modelX, modelY);
        const isHitOnModel = model.isHitOnModel(modelX, modelY);

        if (hitAreaName !== null || isHitOnModel) {
            mouseDownTimeRef.current = Date.now();
            mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
            isPotentialTapRef.current = true;
            setIsDragging(false);

            if (model._modelMatrix) {
                const matrix = model._modelMatrix.getArray();
                modelStartPos.current = { x: matrix[12], y: matrix[13] };
            }
        }
    }, [canvasRef]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const adapter = (window as any).getLAppAdapter?.();
        const view = LAppDelegate.getInstance().getView();
        const model = adapter?.getModel();

        if (isPotentialTapRef.current && adapter && view && model && canvasRef.current) {
            const timeElapsed = Date.now() - mouseDownTimeRef.current;
            const deltaX = e.clientX - mouseDownPosRef.current.x;
            const deltaY = e.clientY - mouseDownPosRef.current.y;
            const distanceMoved = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distanceMoved > DRAG_DISTANCE_THRESHOLD_PX || (timeElapsed > TAP_DURATION_THRESHOLD_MS && distanceMoved > 1)) {
                isPotentialTapRef.current = false;
                setIsDragging(true);

                const canvas = canvasRef.current;
                const rect = canvas.getBoundingClientRect();
                dragStartPos.current = {
                    x: mouseDownPosRef.current.x - rect.left,
                    y: mouseDownPosRef.current.y - rect.top,
                };
            }
        }

        if (isDragging && adapter && view && model && canvasRef.current) {
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;

            const scale = canvas.width / canvas.clientWidth;
            const startScaledX = dragStartPos.current.x * scale;
            const startScaledY = dragStartPos.current.y * scale;
            const startModelX = view._deviceToScreen.transformX(startScaledX);
            const startModelY = view._deviceToScreen.transformY(startScaledY);

            const currentScaledX = currentX * scale;
            const currentScaledY = currentY * scale;
            const currentModelX = view._deviceToScreen.transformX(currentScaledX);
            const currentModelY = view._deviceToScreen.transformY(currentScaledY);

            const dx = currentModelX - startModelX;
            const dy = currentModelY - startModelY;

            const newX = modelStartPos.current.x + dx;
            const newY = modelStartPos.current.y + dy;

            if (adapter.setModelPosition) {
                adapter.setModelPosition(newX, newY);
            } else if (model._modelMatrix) {
                const matrix = model._modelMatrix.getArray();
                const newMatrix = [...matrix];
                newMatrix[12] = newX;
                newMatrix[13] = newY;
                model._modelMatrix.setMatrix(newMatrix);
            }

            modelPositionRef.current = { x: newX, y: newY };
            setPosition({ x: newX, y: newY });
        }

        if (isPet && !isDragging && !isPotentialTapRef.current && electronApi && adapter && view && model && canvasRef.current) {
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const scale = canvas.width / canvas.clientWidth;
            const scaledX = x * scale;
            const scaledY = y * scale;
            const modelX = view._deviceToScreen.transformX(scaledX);
            const modelY = view._deviceToScreen.transformY(scaledY);

            const currentHitState = model.anyhitTest(modelX, modelY) !== null || model.isHitOnModel(modelX, modelY);

            if (currentHitState !== isHoveringModelRef.current) {
                isHoveringModelRef.current = currentHitState;
                electronApi.ipcRenderer.send('update-component-hover', 'live2d-model', currentHitState);
            }
        }
    }, [isPet, isDragging, electronApi, canvasRef]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        const adapter = (window as any).getLAppAdapter?.();
        const model = adapter?.getModel();
        const view = LAppDelegate.getInstance().getView();

        if (isDragging) {
            setIsDragging(false);
            if (adapter) {
                const currentModel = adapter.getModel();
                if (currentModel && currentModel._modelMatrix) {
                    const matrix = currentModel._modelMatrix.getArray();
                    const finalPos = { x: matrix[12], y: matrix[13] };
                    modelPositionRef.current = finalPos;
                    modelStartPos.current = finalPos;
                    setPosition(finalPos);
                }
            }
        } else if (isPotentialTapRef.current && adapter && model && view && canvasRef.current) {
            const timeElapsed = Date.now() - mouseDownTimeRef.current;
            const deltaX = e.clientX - mouseDownPosRef.current.x;
            const deltaY = e.clientY - mouseDownPosRef.current.y;
            const distanceMoved = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (timeElapsed < TAP_DURATION_THRESHOLD_MS && distanceMoved < DRAG_DISTANCE_THRESHOLD_PX) {
                const allowTapMotion = modelInfo?.pointerInteractive !== false;

                if (allowTapMotion && modelInfo?.tapMotions) {
                    const canvas = canvasRef.current;
                    const rect = canvas.getBoundingClientRect();
                    const scale = canvas.width / canvas.clientWidth;
                    const downX = (mouseDownPosRef.current.x - rect.left) * scale;
                    const downY = (mouseDownPosRef.current.y - rect.top) * scale;
                    const modelX = view._deviceToScreen.transformX(downX);
                    const modelY = view._deviceToScreen.transformY(downY);

                    const hitAreaName = model.anyhitTest(modelX, modelY);
                    model.startTapMotion(hitAreaName, modelInfo.tapMotions);
                }
            }
        }

        isPotentialTapRef.current = false;
    }, [isDragging, canvasRef, modelInfo]);

    const handleMouseLeave = useCallback(() => {
        if (isDragging) {
            handleMouseUp({} as React.MouseEvent);
        }
        if (isPotentialTapRef.current) {
            isPotentialTapRef.current = false;
        }
        if (isPet && electronApi && isHoveringModelRef.current) {
            isHoveringModelRef.current = false;
            electronApi.ipcRenderer.send('update-component-hover', 'live2d-model', false);
        }
    }, [isPet, isDragging, electronApi, handleMouseUp]);

    return {
        position,
        isDragging,
        handlers: {
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp,
            onMouseLeave: handleMouseLeave,
        },
    };
};