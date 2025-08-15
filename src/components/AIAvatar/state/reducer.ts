import { v4 as uuidv4 } from 'uuid';
import { AIAvatarAction, AIAvatarState, PlaybackTask } from './types';

export const initialState: AIAvatarState = {
    connectionStatus: 'DISCONNECTED',
    aiState: 'IDLE',
    asrState: 'IDLE',
    messages: [],
    voiceInput: {
        mode: 'conversation',
        continuous: true,
    },
    character: null,
    isCharecterLoaded: false,
    characters: [],
    playbackQueue: [],
    partialTranscript: '',
    isConnecting: false,
    isLLMComplete: true,
};

export const aiAvatarReducer = (state: AIAvatarState, action: AIAvatarAction): AIAvatarState => {
    switch (action.type) {
        // User Actions
        case 'USER_SEND_TEXT':
            return {
                ...state,
                aiState: 'THINKING',
                asrState: state.voiceInput.mode === 'conversation' && state.voiceInput.continuous ? 'LISTENING' : 'IDLE',
                messages: [...state.messages, { id: uuidv4(), author: 'user', text: action.payload.text }],
                isLLMComplete: false,
            };
        case 'USER_START_RECORDING':
            return { ...state, asrState: 'LISTENING' };
        case 'USER_STOP_RECORDING':
            return { ...state, asrState: state.asrState === "PROCESSING" ? "PROCESSING" : state.asrState === "LISTENING_PROCESSING" ? "PROCESSING" : "IDLE" };
        case 'USER_SELECT_CHARACTER':
            return { ...state, character: state.characters.find(c => c.id === action.payload.characterId) || null, isCharecterLoaded: false };
        case 'USER_INTERRUPT':
            return { ...state, aiState: 'IDLE', asrState: 'LISTENING', playbackQueue: [], isLLMComplete: true };
        case 'USER_AUDIO_CHUNK_SENT':
            return {
                ...state,
                asrState: 'LISTENING_PROCESSING',
            };
        case 'USER_AUDIO_END_SENT':
            if (state.voiceInput.mode === 'conversation') {
                return {
                    ...state,
                    asrState: state.voiceInput.continuous ? 'LISTENING_PROCESSING' : 'PROCESSING',
                };
            }
            return state;

        // System Events
        case 'SYSTEM_CONNECT':
            return { ...state, connectionStatus: 'CONNECTING' };
        case 'SYSTEM_DISCONNECT':
            return { ...initialState };
        case 'SYSTEM_SET_CHARACTERS':
            return { ...state, characters: action.payload.characters };
        case 'SYSTEM_PLAYBACK_FINISHED': {
            const newQueue = state.playbackQueue.slice(1);
            const isQueueEmpty = newQueue.length === 0;

            if (isQueueEmpty && state.isLLMComplete) {
                return {
                    ...state,
                    playbackQueue: newQueue,
                    aiState: 'IDLE',
                    asrState: state.voiceInput.mode === 'conversation' && !state.voiceInput.continuous ? 'LISTENING' : state.asrState,
                };
            }

            return {
                ...state,
                playbackQueue: newQueue,
                aiState: state.isLLMComplete ? 'SPEAKING' : 'THINKING_SPEAKING',
            };
        }
        case 'SYSTEM_SET_VOICE_INPUT':
            return {
                ...state,
                voiceInput: action.payload.voiceInput,
                asrState: action.payload.voiceInput.mode === 'conversation' && state.aiState === 'IDLE' ? 'LISTENING' : action.payload.voiceInput.mode === 'conversation' && action.payload.voiceInput.continuous ? 'LISTENING' : 'IDLE',
            };

        // Server Messages
        case 'SERVER_CONNECT_SUCCESS':
            return { ...state, connectionStatus: 'CONNECTED', isConnecting: false };
        case 'SERVER_CHARACTER_READY':
            return { ...state, character: action.payload.character, isCharecterLoaded: true, asrState: 'LISTENING' };
        case 'SERVER_CONNECT_ERROR':
            return { ...state, connectionStatus: 'ERROR' };
        case 'SERVER_DISCONNECTED':
            return { ...initialState };
        case 'SERVER_AVATAR_SPEAK': {
            const newPayload = action.payload as PlaybackTask;
            const lastMessage = state.messages[state.messages.length - 1];

            const updatedMessages =
                lastMessage?.author === 'ai'
                    ? [
                        ...state.messages.slice(0, -1),
                        { ...lastMessage, text: lastMessage.text + ' ' + newPayload.text },
                    ]
                    : [...state.messages, { id: uuidv4(), author: 'ai' as const, text: newPayload.text }];

            return {
                ...state,
                aiState: 'THINKING_SPEAKING',
                messages: updatedMessages,
                playbackQueue: [...state.playbackQueue, newPayload],
                isLLMComplete: false,
            };
        }
        case 'SERVER_AVATAR_IDLE': {
            // The LLM is done, but audio might still be playing.
            // The state will be fully set to IDLE by the final SYSTEM_PLAYBACK_FINISHED event.
            return {
                ...state,
                aiState: state.playbackQueue.length > 0 ? 'SPEAKING' : 'IDLE',
                isLLMComplete: true,
            };
        }
        case 'SERVER_ASR_PARTIAL':
            return { ...state, partialTranscript: action.payload.text, asrState: 'LISTENING_PROCESSING' };
        case 'SERVER_ASR_FINAL': {
            if (!action.payload.text) {
                return { ...state, asrState: state.voiceInput.mode === 'conversation' ? 'LISTENING' : 'IDLE' };
            }

            const newAsrState = state.voiceInput.mode === 'conversation' && state.voiceInput.continuous ? 'LISTENING' : 'IDLE';

            return {
                ...state,
                aiState: 'THINKING',
                asrState: newAsrState,
                messages: [...state.messages, { id: uuidv4(), author: 'user', text: action.payload.text }],
                partialTranscript: '',
                isLLMComplete: false,
            };
        }
        default:
            return state;
    }
};