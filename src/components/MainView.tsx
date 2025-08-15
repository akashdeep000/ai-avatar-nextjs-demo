import React, { useEffect, useState } from 'react';
import { AIAvatarCanvas, useAIAvatar } from '../components/AIAvatar';
import Chat from './Chat';

const MainView: React.FC = () => {
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const {
        messages,
        voiceInput,
        partialTranscript,
        aiState,
        asrState,
        sendText,
        startRecording,
        stopRecording,
        interrupt,
        setVoiceInput,
        connect,
    } = useAIAvatar();

    useEffect(() => {
        connect();
    }, [connect]);

    const setRecordingMode = (mode: 'conversation' | 'manual') => {
        if (mode === 'manual') {
            setVoiceInput({ mode: 'manual' });
        } else {
            setVoiceInput({ mode: 'conversation', continuous: voiceInput.mode === 'conversation' ? voiceInput.continuous : false });
        }
    };

    const setContinuousListening = (enabled: boolean) => {
        if (voiceInput.mode === 'conversation') {
            setVoiceInput({ ...voiceInput, continuous: enabled });
        }
    };

    return (
        <div className="flex h-full flex-col md:flex-row">
            <div className="w-full h-2/3 md:min-w-1/2 md:h-full">
                <AIAvatarCanvas onReady={() => setIsModelLoaded(true)} />
            </div>
            <div className="w-full h-1/3 md:w-1/2 md:max-w-xl md:h-full border-t md:border-l md:border-t-0">
                <Chat
                    onSendMessage={sendText}
                    messages={messages}
                    aiState={aiState}
                    asrState={asrState}
                    voiceInput={voiceInput}
                    partialTranscript={partialTranscript}
                    recordingMode={voiceInput.mode}
                    setRecordingMode={setRecordingMode}
                    continuousListening={voiceInput.mode === 'conversation' ? voiceInput.continuous : false}
                    setContinuousListening={setContinuousListening}
                    startRecording={startRecording}
                    stopRecording={stopRecording}
                    interrupt={interrupt}
                    isModelLoaded={isModelLoaded}
                />
            </div>
        </div>
    );
};

export default MainView;