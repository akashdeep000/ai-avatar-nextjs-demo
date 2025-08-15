import { useCallback, useEffect, useRef, useState } from 'react';
import { AIAvatarAction, AiState, PlaybackTask } from '../state/types';
import { audioBufferToWav } from '../utils/audio';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Live2DModel = any;

interface UseInternalPlaybackProps {
    playbackQueue: PlaybackTask[];
    aiState: AiState;
    dispatch: React.Dispatch<AIAvatarAction>;
    setExpression: (expression: string) => void;
    startMotion: (group: string, index: number, priority: number) => void;
}

/**
 * Hook to handle queued playback for AI avatar TTS output.
 * Uses an AudioContext path that avoids routing audio into the mic/VAD stream.
 */
export const useInternalPlayback = ({
    playbackQueue,
    aiState,
    dispatch,
    setExpression,
    startMotion,
}: UseInternalPlaybackProps) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const currentModelRef = useRef<Live2DModel | null>(null);
    const currentUrlRef = useRef<string | null>(null);

    // Single shared AudioContext for playback
    const audioContextRef = useRef<AudioContext | null>(null);
    if (!audioContextRef.current) {
        audioContextRef.current =
            new (window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext })
                    .webkitAudioContext)();
    }

    /** Interrupts any ongoing playback */
    const interrupt = useCallback(() => {
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.onended = null;
            currentAudioRef.current = null;
        }
        if (currentUrlRef.current) {
            URL.revokeObjectURL(currentUrlRef.current);
            currentUrlRef.current = null;
        }
        if (currentModelRef.current && currentModelRef.current._wavFileHandler) {
            currentModelRef.current._wavFileHandler.releasePcmData();
        }
        setIsSpeaking(false);
    }, []);

    /** Plays a base64-encoded WAV or PCM audio string through a separate path */
    const playAudio = useCallback(
        async (audioBase64: string) => {
            const audioContext = audioContextRef.current!;
            const decodedData = atob(audioBase64);
            const arrayBuffer = new ArrayBuffer(decodedData.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            for (let i = 0; i < decodedData.length; i++) {
                uint8Array[i] = decodedData.charCodeAt(i);
            }

            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const wavBuffer = audioBufferToWav(audioBuffer);
            const blob = new Blob([wavBuffer], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            currentUrlRef.current = url;

            const audio = new Audio(url);
            audio.crossOrigin = 'anonymous'; // avoid CORS issues if blob is external
            currentAudioRef.current = audio;

            // Connect to model if available
            const live2dManager = (
                window as { getLive2DManager?: () => { getModel: (index: number) => Live2DModel } }
            ).getLive2DManager?.();
            if (live2dManager) {
                const model = live2dManager.getModel(0);
                if (model) {
                    currentModelRef.current = model;
                    if (model._wavFileHandler) {
                        model._wavFileHandler.start(url);
                    }
                }
            }

            // Use Web Audio API to route audio without mic/VAD loopback
            const track = audioContext.createMediaElementSource(audio);
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 1.0; // set volume
            track.connect(gainNode).connect(audioContext.destination);

            const playPromise = new Promise<void>((resolve, reject) => {
                audio.onended = () => {
                    if (currentUrlRef.current) {
                        URL.revokeObjectURL(currentUrlRef.current);
                        currentUrlRef.current = null;
                    }
                    if (currentAudioRef.current === audio) {
                        currentAudioRef.current = null;
                        currentModelRef.current = null;
                    }
                    resolve();
                };
                audio.onerror = (e) => {
                    console.error('Audio playback error:', e);
                    reject(new Error('Audio playback error'));
                };
            });

            try {
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
                await audio.play();
            } catch (error) {
                console.warn('audio.play() failed, possibly due to autoplay policy:', error);
                if (error instanceof Error && error.name === 'NotAllowedError' && audioContext.state === 'suspended') {
                    const unlockAudio = async () => {
                        try {
                            await audioContext.resume();
                            await audio.play();
                        } catch (unlockError) {
                            console.error('Failed to unlock audio context:', unlockError);
                        } finally {
                            document.body.removeEventListener('click', unlockAudio);
                            document.body.removeEventListener('touchstart', unlockAudio);
                        }
                    };
                    document.body.addEventListener('click', unlockAudio, { once: true });
                    document.body.addEventListener('touchstart', unlockAudio, { once: true });
                } else {
                    throw error;
                }
            }

            return playPromise;
        },
        []
    );

    /** Handles queued playback execution */
    useEffect(() => {
        if (playbackQueue.length > 0 && !isSpeaking) {
            const task = playbackQueue[0];
            setIsSpeaking(true);

            const executeTask = async (taskToExecute: PlaybackTask) => {
                try {
                    if (taskToExecute.expressions.length > 0) {
                        setExpression(taskToExecute.expressions[0].name);
                    }
                    if (taskToExecute.motions.length > 0) {
                        startMotion(taskToExecute.motions[0].group, taskToExecute.motions[0].index, 2);
                    }

                    if (taskToExecute.audio) {
                        await playAudio(taskToExecute.audio);
                    }
                } catch (error) {
                    console.error('Error executing playback task:', error);
                } finally {
                    setIsSpeaking(false);
                    dispatch({ type: 'SYSTEM_PLAYBACK_FINISHED' });
                }
            };

            executeTask(task);
        }
    }, [playbackQueue, isSpeaking, dispatch, playAudio, setExpression, startMotion]);

    /** Stop playback if AI state changes out of speaking modes */
    useEffect(() => {
        if (aiState !== 'SPEAKING' && aiState !== 'THINKING_SPEAKING') {
            interrupt();
        }
    }, [aiState, interrupt]);
};
