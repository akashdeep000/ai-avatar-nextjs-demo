"use client";

import { createContext } from 'react';
import { AIAvatarState, VoiceInputState } from './state/types';

export interface AIAvatarContextType extends AIAvatarState {
    backendUrl: string;
    // Action Functions
    fetchCharacters: () => Promise<void>;
    connect: () => void;
    disconnect: () => void;
    sendText: (text: string) => void;
    startRecording: () => void;
    stopRecording: () => void;
    interrupt: () => void;
    selectCharacter: (characterId: string) => void;
    setVoiceInput: (voiceInput: VoiceInputState) => void;
}

export const AIAvatarContext = createContext<AIAvatarContextType | undefined>(undefined);