import { AiState, AsrState, Message, VoiceInputState } from '@/components/AIAvatar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useEffect, useRef, useState } from 'react';

interface ChatProps {
    onSendMessage: (message: string) => void;
    messages: Message[];
    aiState: AiState;
    voiceInput: VoiceInputState;
    asrState: AsrState;
    partialTranscript: string;
    recordingMode: 'conversation' | 'manual';
    setRecordingMode: (mode: 'conversation' | 'manual') => void;
    continuousListening: boolean;
    setContinuousListening: (enabled: boolean) => void;
    startRecording: () => void;
    stopRecording: () => void;
    interrupt: () => void;
    isModelLoaded: boolean;
}

const Chat: React.FC<ChatProps> = ({
    onSendMessage,
    messages,
    aiState,
    asrState,
    partialTranscript,
    recordingMode,
    setRecordingMode,
    continuousListening,
    setContinuousListening,
    startRecording,
    stopRecording,
    isModelLoaded,
}) => {
    const isRecording = asrState === 'LISTENING' || asrState === 'LISTENING_PROCESSING';
    const [inputValue, setInputValue] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = chatContainerRef.current;
        if (container) {
            const isScrolledToBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
            if (isScrolledToBottom) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, [messages]);

    const handleSendMessage = () => {
        if (inputValue.trim()) {
            onSendMessage(inputValue);
            setInputValue('');
        }
    };

    const handleMicClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4" ref={chatContainerRef}>
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-4 my-4 ${msg.author === 'user' ? 'justify-end' : ''}`}>
                        {msg.author === 'ai' && (
                            <Avatar>
                                <AvatarFallback>AI</AvatarFallback>
                            </Avatar>
                        )}
                        <div className={`rounded-lg p-3 ${msg.author === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            {msg.text}
                        </div>
                        {msg.author === 'user' && (
                            <Avatar>
                                <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                {partialTranscript && (
                    <div className="text-center text-gray-500 italic">
                        {partialTranscript}
                    </div>
                )}
            </div>
            <div className="p-4 border-t">
                <div className='flex gap-2 pb-4'>
                    <p>AI Sate: {aiState}</p> |
                    <p>ASR State: {asrState}</p>
                </div>
                <div className="flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..."
                        disabled={!isModelLoaded}
                    />
                    <Button onClick={handleSendMessage} disabled={!isModelLoaded}>Send</Button>
                    <Button onClick={handleMicClick} variant={isRecording ? 'destructive' : 'outline'} disabled={!isModelLoaded}>
                        {isRecording ? 'Stop' : 'Mic'}
                    </Button>
                    <Select value={recordingMode} onValueChange={(value) => setRecordingMode(value as 'conversation' | 'manual')} disabled={!isModelLoaded}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="conversation">Conversation</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {recordingMode === 'conversation' && (
                    <div className="flex items-center space-x-2 mt-2">
                        <input
                            type="checkbox"
                            id="continuous-listening"
                            checked={continuousListening}
                            onChange={(e) => setContinuousListening(e.target.checked)}
                            disabled={!isModelLoaded}
                        />
                        <label htmlFor="continuous-listening" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Continuous Listening
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;