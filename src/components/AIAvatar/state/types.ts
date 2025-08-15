export interface WavFileHandler {
    update: (deltaTimeSeconds: number) => unknown;
    releasePcmData: () => void;
    start: (audioPath: string) => void;
}

export interface Live2DModel {
    _wavFileHandler?: WavFileHandler;
}

export interface Live2DManager {
    getModel: (index: number) => Live2DModel | undefined;
}

declare global {
    interface Window {
        getLive2DManager?: () => Live2DManager;
    }
}
export interface MotionDef {
    File: string;
    Sound?: string;
}

export interface ModelInfo {
    url: string;
    kScale?: number;
    pointerInteractive?: boolean;
    expressions?: { name: string; file: string }[];
    tapMotions?: Record<string, MotionDef[]>;
    scrollToResize?: boolean;
    initialXshift?: number;
    initialYshift?: number;
    defaultEmotion?: string;
}

export interface Character {
    id: string;
    name: string;
    image_url: string;
    live2d_model_info: ModelInfo;
}

// The overall state of the AI (what it's currently doing)
export type AiState = 'IDLE' | 'THINKING' | 'THINKING_SPEAKING' | 'SPEAKING';

// The state of the Automatic Speech Recognition
export type AsrState = 'IDLE' | 'LISTENING' | 'LISTENING_PROCESSING' | 'PROCESSING';

// The state of the WebSocket connection
export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

// Represents a single chat message
export interface Message {
    id: string;
    author: 'user' | 'ai';
    text: string;
}

// A single unit of work for the avatar to perform (speak text, play audio, show expression)
export interface PlaybackTask {
    text: string;
    audio: string;
    expressions: { name: string; value: number }[];
    motions: { group: string; index: number }[];
}

// Voice input settings (discriminated union for type safety)
export type VoiceInputState =
    | {
        mode: 'manual';
    }
    | {
        mode: 'conversation';
        continuous: boolean;
    };

// The single, unified state object for the entire system
export interface AIAvatarState {
    connectionStatus: ConnectionStatus;
    aiState: AiState;
    asrState: AsrState;
    messages: Message[];
    voiceInput: VoiceInputState;
    character: Character | null;
    isCharecterLoaded: boolean;
    characters: Character[];
    playbackQueue: PlaybackTask[];
    partialTranscript: string;
    isConnecting: boolean;
    isLLMComplete: boolean;
}

// A discriminated union of every possible event that can change the state
export type AIAvatarAction =
    // User Actions
    | { type: 'USER_SEND_TEXT'; payload: { text: string } }
    | { type: 'USER_START_RECORDING' }
    | { type: 'USER_STOP_RECORDING' }
    | { type: 'USER_SELECT_CHARACTER'; payload: { characterId: string } }
    | { type: 'USER_INTERRUPT' }
    | { type: 'USER_AUDIO_CHUNK_SENT' }
    | { type: 'USER_AUDIO_END_SENT' }

    // System Events
    | { type: 'SYSTEM_CONNECT' }
    | { type: 'SYSTEM_DISCONNECT' }
    | { type: 'SYSTEM_SET_CHARACTERS'; payload: { characters: Character[] } }
    | { type: 'SYSTEM_PLAYBACK_FINISHED' }
    | { type: 'SYSTEM_SET_VOICE_INPUT'; payload: { voiceInput: VoiceInputState } }

    // Server Messages
    | { type: 'SERVER_CONNECT_SUCCESS' }
    | { type: 'SERVER_CHARACTER_READY'; payload: { character: Character } }
    | { type: 'SERVER_CONNECT_ERROR' }
    | { type: 'SERVER_DISCONNECTED' }
    | { type: 'SERVER_AVATAR_SPEAK'; payload: PlaybackTask }
    | { type: 'SERVER_AVATAR_IDLE' }
    | { type: 'SERVER_ASR_PARTIAL'; payload: { text: string } }
    | { type: 'SERVER_ASR_FINAL'; payload: { text: string } };