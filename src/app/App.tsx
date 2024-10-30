
import { useEffect, useRef } from "react";
import { MyQueryClientProvider } from "./providers/MyQueryClientProvider/MyQueryClientProvider";
import { MyReduxProvider } from "./providers/MyReduxProvider/MyReduxProvider";
import { store } from "./store";
import { webRTCService } from "@/shared/api/webrtcService";

function App() {
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Инициализируем соединение
    webRTCService.initializeConnection();

    const startCall = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }

      stream.getTracks().forEach((track) => webRTCService.peerConnection!.addTrack(track, stream));

      const offer = await webRTCService.peerConnection!.createOffer();
      await webRTCService.peerConnection!.setLocalDescription(offer);
      webRTCService.sendMessage({ type: 'offer', content: offer });
    };

    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
      await webRTCService.peerConnection!.setRemoteDescription(new RTCSessionDescription(answer));
    };

    webRTCService.peerConnection!.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    webRTCService.peerConnection!.onicecandidate = (event) => {
      if (event.candidate) {
        webRTCService.sendMessage({ type: 'candidate', content: event.candidate });
      }
    };

    startCall();

    return () => {
      webRTCService.peerConnection?.close();
      webRTCService.ws?.close();
    };
  }, []);

  const endCall = () => {
    webRTCService.peerConnection?.close();
    webRTCService.ws?.close();
    const localStream = localAudioRef.current?.srcObject as MediaStream;
    localStream.getTracks().forEach((track) => track.stop());
  };

  return (
    <MyReduxProvider store={store}>
      <MyQueryClientProvider>
        <div>
          <audio ref={localAudioRef} autoPlay playsInline muted />
          <audio ref={remoteAudioRef} autoPlay playsInline />
          <button onClick={endCall}>Завершить звонок</button>
        </div>
      </MyQueryClientProvider>
    </MyReduxProvider>
  );
};

export default App;
