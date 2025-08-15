import { AIAvatarAction, Character } from '../state/types';

type Dispatch = React.Dispatch<AIAvatarAction>;

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private dispatch: Dispatch;

    constructor(dispatch: Dispatch) {
        this.dispatch = dispatch;
    }

    public connect(url: string, characterId: string): void {
        if (this.ws) {
            this.disconnect();
        }

        const clientId = Date.now();
        const wsUrl = `${url}/ws/${clientId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            this.dispatch({ type: 'SERVER_CONNECT_SUCCESS' });
            this.sendMessage('session:start', { character_id: characterId });
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                switch (message.type) {
                    case 'session:ready': {
                        const fullCharacter = {
                            ...(message.payload.character as Record<string, unknown>),
                            live2d_model_info: message.payload.live2d_model_info,
                        };
                        this.dispatch({ type: 'SERVER_CHARACTER_READY', payload: { character: fullCharacter as Character } });
                        break;
                    }
                    case 'avatar:speak':
                        this.dispatch({ type: 'SERVER_AVATAR_SPEAK', payload: message.payload });
                        break;
                    case 'avatar:idle':
                        this.dispatch({ type: 'SERVER_AVATAR_IDLE' });
                        break;
                    case 'asr:partial':
                        this.dispatch({ type: 'SERVER_ASR_PARTIAL', payload: { text: message.payload.text } });
                        break;
                    case 'asr:final':
                        this.dispatch({ type: 'SERVER_ASR_FINAL', payload: { text: message.payload.text } });
                        break;
                    default:
                        console.warn('Unknown WebSocket message type:', message.type);
                        break;
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            this.dispatch({ type: 'SERVER_DISCONNECTED' });
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.dispatch({ type: 'SERVER_CONNECT_ERROR' });
        };
    }

    public disconnect(): void {
        if (this.ws) {
            this.ws.onclose = null; // Prevent dispatching DISCONNECT on manual close
            this.ws.close();
            this.ws = null;
        }
    }

    public sendMessage(type: string, payload: Record<string, unknown>): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = { type, payload };
            this.ws.send(JSON.stringify(message));
        }
    }
}