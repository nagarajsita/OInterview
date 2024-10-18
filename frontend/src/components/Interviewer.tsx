import { useEffect, useRef, useState } from "react";
import hang from "../assets/phone.png";
import mic from "../assets/mic.png";
import video from "../assets/video.png";
import send from "../assets/send.png";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
const Interviewer = () => {
  const vRef = useRef<HTMLVideoElement | null>(null);
  const aRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [messages, setMessages] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(true);
  let pc: RTCPeerConnection | null = null;

  useEffect(() => {
    if (!roomId) return;

    const socket = new WebSocket("ws://localhost:8080");
    setSocket(socket);
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "joinRoom", roomId, role: "receiver" }));
    };

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "createOffer") {
        pc = new RTCPeerConnection();
        pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
  
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.send(
              JSON.stringify({
                type: "iceCandidate",
                roomId,
                candidate: event.candidate
              })
            );
          }
        };

        pc.ontrack = (event) => {
          console.log("Received track:", event.track.kind);
          if (event.track.kind === "video" && vRef.current) {
            vRef.current.srcObject = new MediaStream([event.track]);
          }
          if (event.track.kind === "audio" && aRef.current) {
            aRef.current.srcObject = new MediaStream([event.track]);
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.send(
          JSON.stringify({ type: "createAnswer", roomId, sdp: pc.localDescription })
        );
      } else if (message.type === "iceCandidate" && pc) {
        pc.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
      else if(message.type === "chatMessage"){
        setMessages((prevMessages) => [...prevMessages, `Sender: ${message.text}`]);
      }
    };
    return () => {
      socket.close();
    }
  }, [roomId]);
  
  const handleSendMessage = () => {
    if (socket && socket.readyState === WebSocket.OPEN && chatInput) {
      socket.send(JSON.stringify({type: "chatMessage", roomId, text: chatInput}))
      setMessages((prevMessages) => [...prevMessages, `You: ${chatInput}`]);
      setChatInput("");
    }
  }

  const handleCreateRoom = () => {
    setIsModalOpen(false);
  }

  const generateRandomRoomId = () => {
    const randomString = Math.random().toString(36).substring(2, 10);
    setRoomId(randomString);
    navigator.clipboard.writeText(randomString).then(() => {
      toast.success("Room ID copied to clipboard!");
      handleCreateRoom();
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

  return (
    <div className="p-4">
     <ToastContainer position="top-right"/>
      {isModalOpen && (
        <div className="fixed inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Create a Room</h2>
            <div className="flex mb-4">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Room ID"
                className="border p-2 flex-grow mr-2"
              />
              <button
                onClick={generateRandomRoomId}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Generate ID
              </button>
            </div>
            
          </div>
        </div>
      )}

      {roomId && (
        <>
        <p>Room Id: {roomId}</p>
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
                {/* Floating Icons */}
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
          {/* code editor and chat */}
          <div className="flex flex-row border p-5 rounded-lg shadow-lg bg-white mt-1">
            <div className="w-2/3 h-[200px] border">
              code editor
            </div>
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
                    <img src={send} alt="send" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Interviewer;