import { useMicVAD } from '@ricky0123/vad-react';
import { useCallback, useEffect, useState } from 'react';
import { WebSocketClient } from '../services/WebSocketClient';
import { AIAvatarAction, AiState, AsrState, VoiceInputState } from '../state/types';

interface UseInternalVoiceInputProps {
    voiceInputState: VoiceInputState;
    aiState: AiState;
    asrState: AsrState;
    dispatch: React.Dispatch<AIAvatarAction>;
    webSocketClient: WebSocketClient | null;
}

export const useInternalVoiceInput = ({ voiceInputState, aiState, asrState, dispatch, webSocketClient }: UseInternalVoiceInputProps) => {
    const [isVadRunning, setIsVadRunning] = useState(false);

    // Automatic interrupt for conversation mode
    const onSpeechRealStart = useCallback(() => {
        if (voiceInputState.mode === 'conversation' && (aiState === 'SPEAKING' || aiState === 'THINKING_SPEAKING' || aiState === "THINKING")) {
            dispatch({ type: 'USER_INTERRUPT' });
            webSocketClient?.sendMessage('user:interrupt', {});
        }
    }, [aiState, voiceInputState, dispatch, webSocketClient]);

    const onSpeechEnd = useCallback(
        (audio: Float32Array) => {
            if (!webSocketClient) return;

            const pcm16 = new Int16Array(audio.length);
            for (let i = 0; i < audio.length; i++) {
                pcm16[i] = Math.max(-1, Math.min(1, audio[i])) * 0x7fff;
            }

            const buffer = pcm16.buffer;
            const blob = new Blob([buffer], { type: 'application/octet-stream' });
            const reader = new FileReader();

            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    const base64data = reader.result.split(',')[1];
                    webSocketClient.sendMessage('user:audio_chunk', { data: base64data });
                    dispatch({ type: 'USER_AUDIO_CHUNK_SENT' });
                    if (voiceInputState.mode === 'conversation') {
                        webSocketClient.sendMessage('user:audio_end', {});
                        dispatch({ type: 'USER_AUDIO_END_SENT' });
                    }
                }
            };

            reader.readAsDataURL(blob);
        },
        [webSocketClient, voiceInputState]
    );

    const { loading, start, pause } = useMicVAD({
        onSpeechRealStart,
        onSpeechEnd,
        redemptionFrames: 20,
        submitUserSpeechOnPause: true,
    });

    // VAD control logic based on ASR state
    useEffect(() => {
        const shouldBeListening = asrState === 'LISTENING' || asrState === 'LISTENING_PROCESSING';
        if (shouldBeListening && !isVadRunning) {
            start();
            setIsVadRunning(true);
        } else if (!shouldBeListening && isVadRunning) {
            pause();
            // In manual mode, explicitly send audio_end when recording stops
            if (voiceInputState.mode === 'manual' && asrState === 'PROCESSING') {
                webSocketClient?.sendMessage('user:audio_end', {});
                dispatch({ type: 'USER_AUDIO_END_SENT' });
            }
            setIsVadRunning(false);
        }
    }, [asrState, isVadRunning, start, pause, voiceInputState, webSocketClient]);

    return { loading, start, pause };
};