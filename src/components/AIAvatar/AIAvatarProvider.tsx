import React, { ReactNode, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { AIAvatarContext } from './AIAvatarContext';
import { BackendUrlContext } from './BackendUrlContext';
import { useInternalPlayback } from './hooks/useInternalPlayback';
import { useInternalVoiceInput } from './hooks/useInternalVoiceInput';
import { useLive2DExpression } from './hooks/useLive2DExpression';
import { useLive2DMotion } from './hooks/useLive2DMotion';
import { WebSocketClient } from './services/WebSocketClient';
import { aiAvatarReducer, initialState } from './state/reducer';
import { Character, VoiceInputState } from './state/types';
import { getHttpUrl, getWsUrl } from './utils/url';

interface AIAvatarProviderProps {
    children: ReactNode;
    backendUrl: string;
}

export const AIAvatarProvider: React.FC<AIAvatarProviderProps> = ({ children, backendUrl }) => {
    const [state, dispatch] = useReducer(aiAvatarReducer, initialState);
    const { character, playbackQueue, voiceInput, aiState, asrState } = state;
    const characterId = character?.id;

    const wsClientRef = useRef<WebSocketClient | null>(null);

    const { setExpression } = useLive2DExpression();
    const { startMotion } = useLive2DMotion();

    useInternalPlayback({ playbackQueue, aiState, dispatch, setExpression, startMotion });
    useInternalVoiceInput({ voiceInputState: voiceInput, aiState, asrState, dispatch, webSocketClient: wsClientRef.current });

    // Action: Fetch characters from the server
    const fetchCharacters = useCallback(async () => {
        try {
            const httpUrl = getHttpUrl(backendUrl);
            const response = await fetch(`${httpUrl}/characters`);
            if (!response.ok) throw new Error(`Failed to fetch characters: ${response.statusText}`);
            const data = await response.json();
            const characters: Character[] = data.characters || [];
            dispatch({ type: 'SYSTEM_SET_CHARACTERS', payload: { characters } });
        } catch (error) {
            console.error('Error fetching characters:', error);
            throw error;
        }
    }, [backendUrl, dispatch]);

    // Action: Connect to the server
    const connect = useCallback(() => {
        dispatch({ type: 'SYSTEM_CONNECT' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backendUrl, dispatch]);

    // Action: Disconnect from the server
    const disconnect = useCallback(() => {
        if (wsClientRef.current) {
            wsClientRef.current.disconnect();
            wsClientRef.current = null;
        }
        dispatch({ type: 'SYSTEM_DISCONNECT' });
    }, [dispatch]);

    // Effect to manage WebSocket connection based on character selection
    useEffect(() => {
        if (characterId && backendUrl) {
            if (wsClientRef.current) {
                wsClientRef.current.disconnect();
            }
            const newClient = new WebSocketClient(dispatch);
            wsClientRef.current = newClient;
            const wsUrl = getWsUrl(backendUrl);
            newClient.connect(wsUrl, characterId);
        }
    }, [characterId, backendUrl, dispatch]);

    // Action: Send a text message
    const sendText = useCallback((text: string) => {
        if (wsClientRef.current) {
            wsClientRef.current.sendMessage('user:text', { text });
            dispatch({ type: 'USER_SEND_TEXT', payload: { text } });
        }
    }, []);

    // Action: Start recording audio
    const startRecording = useCallback(() => {
        dispatch({ type: 'USER_START_RECORDING' });
    }, []);

    // Action: Stop recording audio
    const stopRecording = useCallback(() => {
        dispatch({ type: 'USER_STOP_RECORDING' });
    }, []);

    // Action: Interrupt the AI
    const interrupt = useCallback(() => {
        dispatch({ type: 'USER_INTERRUPT' });
    }, []);

    // Action: Select a character
    const selectCharacter = useCallback((id: string) => {
        dispatch({ type: 'USER_SELECT_CHARACTER', payload: { characterId: id } });
    }, []);

    // Action: Set the voice input state
    const setVoiceInput = useCallback((voiceInputState: VoiceInputState) => {
        dispatch({ type: 'SYSTEM_SET_VOICE_INPUT', payload: { voiceInput: voiceInputState } });
    }, []);

    const contextValue = useMemo(() => ({
        ...state,
        backendUrl,
        fetchCharacters,
        connect,
        disconnect,
        sendText,
        startRecording,
        stopRecording,
        interrupt,
        selectCharacter,
        setVoiceInput,
    }), [state, backendUrl, fetchCharacters, connect, disconnect, sendText, startRecording, stopRecording, interrupt, selectCharacter, setVoiceInput]);

    return (
        <BackendUrlContext.Provider value={backendUrl}>
            <AIAvatarContext.Provider value={contextValue}>
                {children}
            </AIAvatarContext.Provider>
        </BackendUrlContext.Provider>
    );
};