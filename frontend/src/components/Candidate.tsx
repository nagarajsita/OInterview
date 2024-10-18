import { useEffect, useRef, useState } from "react";
import hang from "../assets/phone.png";
import mic from "../assets/mic.png";
import video from "../assets/video.png";
import send from "../assets/send.png";

const Candidate = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const vRef = useRef<HTMLVideoElement | null>(null);
  const aRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [messages, setMessages] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const pc = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    const socket1 = new WebSocket("ws://localhost:8080");
    setSocket(socket1);

    socket1.onopen = () => {
      socket1.send(
        JSON.stringify({ type: "joinRoom", roomId, role: "sender" })
      );
    };

    socket1.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "chatMessage") {
          setMessages((prevMessages) => [
            ...prevMessages,
            `Receiver: ${data.text}`
          ]);
        } else if (data.type === "createAnswer" && data.sdp) {
          if (pc.current) {
            await pc.current.setRemoteDescription(
              new RTCSessionDescription(data.sdp)
            );
          }
        } else if (data.type === "iceCandidate" && data.candidate) {
          if (pc.current) {
            await pc.current.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
          }
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    };

    return () => {
      socket1.close();
    };
  }, [roomId]);

  const handleSendMessage = () => {
    if (socket && socket.readyState === WebSocket.OPEN && chatInput) {
      socket.send(
        JSON.stringify({ type: "chatMessage", roomId, text: chatInput })
      );
      setMessages((prevMessages) => [...prevMessages, `You: ${chatInput}`]);
      setChatInput("");
    }
  };

  async function startSendingVideo() {
    if (!socket || !roomId) return;

    const peerConnection = new RTCPeerConnection();
    pc.current = peerConnection;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(
          JSON.stringify({ type: "iceCandidate", candidate: event.candidate })
        );
      }
    };

    peerConnection.ontrack = (event) => {
      if (event.track.kind === "video" && vRef.current) {
        vRef.current.srcObject = new MediaStream([event.track]);
      }
      if (event.track.kind === "audio" && aRef.current) {
        aRef.current.srcObject = new MediaStream([event.track]);
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      stream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, stream));

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.send(
        JSON.stringify({
          type: "createOffer",
          roomId,
          sdp: peerConnection.localDescription
        })
      );
    } catch (error) {
      console.error("Error starting video stream:", error);
    }
  }

  return (
    <>
      <div>Interviewee</div>
      <input
        type="text"
        placeholder="Enter Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        className="p-2 border rounded mb-4"
      />
      <button
        className="border m-2 p-2"
        onClick={startSendingVideo}
        disabled={!roomId}
      >
        Send Video
      </button>

      <div className="flex flex-row justify-evenly items-center border p-5 rounded-lg shadow-lg">
        {/* Remote Video */}
        <div className="flex flex-col items-center bg-white p-2 rounded-full shadow-md mx-4">
          <div className="relative w-32 h-32">
            <video
              autoPlay
              ref={vRef}
              className="w-full h-full object-cover rounded-full shadow-md"
            />
          </div>
        </div>

        {/* Local Video */}
        <div className="relative flex flex-col items-center bg-white p-2 rounded-full shadow-lg mx-4">
          <div className="relative w-32 h-32">
            <video
              autoPlay
              ref={localVideoRef}
              className="w-full h-full object-cover rounded-full shadow-md"
            />
            <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 ">
              <img
                src={video}
                alt="video"
                className="w-8 h-8 p-1 rounded-full shadow-lg bg-white"
              />
            </div>
            <div className="absolute top-1/2 -right-8 transform translate-x-1/2 -translate-y-1/2 ">
              <img
                src={mic}
                alt="mic"
                className="w-8 h-8 p-1 rounded-full shadow-lg bg-white"
              />
            </div>
            <div className="absolute bottom-0 right-0 transform translate-x-1/2 translate-y-1/2 ">
              <img
                src={hang}
                alt="hang-up"
                className="w-8 h-8 p-1 rounded-full shadow-lg bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-row border p-5 rounded-lg shadow-lg bg-white mt-1">
        <div className="w-2/3 h-[200px] border">code editor</div>
        {/* chat  */}
        <div className="w-1/3 h-[210px] border rounded-lg p-3 shadow-md">
          <div className="flex flex-col h-full">
            <textarea
              rows={10}
              readOnly
              value={messages.join("\n")}
              className="resize-none p-2 rounded-lg border border-gray-300 bg-white mb-2 h-3/4 overflow-y-auto"
            />
            <div className="flex space-x-2 mt-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message"
                className="flex-grow p-2 rounded-lg border border-gray-300"
              />
              <button
                onClick={handleSendMessage}
                className="rounded-lg size-10"
              >
                <img src={send} alt={"send"} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Candidate;
