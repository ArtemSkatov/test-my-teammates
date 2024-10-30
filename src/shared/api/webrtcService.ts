type WebRTCService = {
    peerConnection: RTCPeerConnection | null;
    ws: WebSocket | null;
    initializeConnection: () => void;
    createOffer: () => Promise<RTCSessionDescriptionInit>;
    createAnswer: () => Promise<RTCSessionDescriptionInit>;
    setRemoteDescription: (description: RTCSessionDescriptionInit) => Promise<void>;
    addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
};

function connectToSignalingServer() {
    const ws = new WebSocket('ws://localhost:8080/ws');

    ws.onopen = () => {
        console.log("Соединение с signaling-сервером установлено");
    };

    ws.onclose = (event) => {
        console.warn(`Соединение закрыто: ${event.code}, переподключение...`);
        setTimeout(connectToSignalingServer, 1000); // Попытка переподключения через 1 секунду
    };

    ws.onerror = (error) => {
        console.error("Ошибка WebSocket:", error);
    };

    ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'offer') {
            await webRTCService.peerConnection.setRemoteDescription(new RTCSessionDescription(message.content));
            const answer = await webRTCService.peerConnection.createAnswer();
            await webRTCService.peerConnection.setLocalDescription(answer);
            webRTCService.sendMessage({ type: 'answer', content: answer });
        } else if (message.type === 'answer') {
            // Проверяем, что состояние позволяет установить answer
            if (webRTCService.peerConnection.signalingState === "have-local-offer") {
                await webRTCService.peerConnection.setRemoteDescription(new RTCSessionDescription(message.content));
            } else {
                console.warn("Attempted to set remote answer SDP in an invalid state:", webRTCService.peerConnection.signalingState);
            }
        } else if (message.type === 'candidate') {
            await webRTCService.peerConnection.addIceCandidate(new RTCIceCandidate(message.content));
        }
    };

    return ws;
}

export const webRTCService: WebRTCService = {
    peerConnection: null,
    ws: null,

    initializeConnection() {
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
            ],
        });

        // Создаем WebSocket-подключение к signaling-серверу
        this.ws = connectToSignalingServer();

        this.ws.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'offer') {
                // Если получено предложение, устанавливаем его
                if (this.peerConnection.signalingState === 'stable') {
                    await this.setRemoteDescription(message.content);
                    const answer = await this.createAnswer();
                    this.sendMessage({ type: 'answer', content: answer });
                } else {
                    console.warn("Received offer in invalid signaling state:", this.peerConnection.signalingState);
                }
            } else if (message.type === 'answer') {
                // Если получен ответ, устанавливаем его
                if (this.peerConnection.signalingState === 'have-local-offer') {
                    await this.setRemoteDescription(message.content);
                } else {
                    console.warn("Received answer in invalid signaling state:", this.peerConnection.signalingState);
                }
            } else if (message.type === 'candidate') {
                // Если получен ICE-кандидат
                await this.addIceCandidate(message.content);
            }
        };

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendMessage({ type: 'candidate', content: event.candidate });
            }
        };

        this.peerConnection.ontrack = (event) => {
            console.log("Received Remote Stream:", event.streams[0]);
        };
    },

    async createOffer() {
        if (!this.peerConnection) throw new Error("PeerConnection not initialized");
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        this.sendMessage({ type: 'offer', content: offer });
        return offer;
    },

    async createAnswer() {
        if (!this.peerConnection) throw new Error("PeerConnection not initialized");
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.sendMessage({ type: 'answer', content: answer });
        return answer;
    },

    async setRemoteDescription(description) {
        if (!this.peerConnection) throw new Error("PeerConnection not initialized");
        await this.peerConnection.setRemoteDescription(description);
    },

    async addIceCandidate(candidate) {
        if (!this.peerConnection) throw new Error("PeerConnection not initialized");
        await this.peerConnection.addIceCandidate(candidate);
    },

    // Функция для отправки сообщения через WebSocket
    sendMessage(message: any) {
        console.log("Sending message:", message);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error("WebSocket connection not open");
        }
    },
};