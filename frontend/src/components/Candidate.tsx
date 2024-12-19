import { useEffect, useRef, useState } from "react";
import hang from "../assets/phone.png";
import mic from "../assets/mic.png";
import micC from "../assets/mic-off.png";

import video from "../assets/video.png";
import videoC from "../assets/video-off.png";
import Editor from "@monaco-editor/react";
import Chat from "./Chat";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";

const Candidate = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const vRef = useRef<HTMLVideoElement | null>(null);
  const aRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [audioP, setAudioP] = useState<boolean>(true);
  const [videoP, setvideoP] = useState<boolean>(true);
  const navigate=useNavigate();
  const [roomId, setRoomId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [language, setLanguage] = useState<string>("javascript");
  const [theme, setTheme] = useState<string>("vs-dark");
  const languages = [
    { label: "JavaScript", value: "javascript" },
    { label: "Python", value: "python" },
    { label: "Java", value: "java" },
    { label: "C++", value: "cpp" }
  ];

  const themes = [
    { label: "Light", value: "light" },
    { label: "Dark", value: "vs-dark" }
  ];

  const cleanupConnection = () => {
    if (localVideoRef.current?.srcObject instanceof MediaStream) {
      localVideoRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop());
    }
    if (vRef.current?.srcObject instanceof MediaStream) {
      vRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    if (aRef.current?.srcObject instanceof MediaStream) {
      aRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    localVideoRef.current = null;
    vRef.current = null;
    aRef.current = null;
  };

  const handleHangUp = () => {
    toast.info(
      ({ closeToast }) => (
        <div>
          <p className="font-medium">Leave Interview Session?</p>
          <div className="flex justify-end mt-2">
            <button
              className="bg-red-500 text-white px-3 py-1 rounded mr-2 hover:bg-red-600"
              onClick={() => {
                confirmHangUp();
                closeToast();
              }}
            >
              Leave Session
            </button>
            <button
              className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
              onClick={closeToast}
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        autoClose: false,
        closeButton: false,
        position: "top-center"
      }
    );
  };

  const confirmHangUp = () => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "terminateRoom",
          roomId,
          role: "receiver"
        })
      );
    }
    cleanupConnection();
    if (socket) {
      socket.close();
    }
    toast.success("Interview session ended successfully");
    setRoomId("");
    setIsModalOpen(true);
    navigate("/"); 
  };

  useEffect(() => {
    const socket1 = new WebSocket("ws://localhost:8080");
    setSocket(socket1);

    socket1.onopen = () => {
      if (roomId) {
        socket1.send(
          JSON.stringify({ type: "joinRoom", roomId, role: "sender" })
        );
      }
    };

    socket1.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "createAnswer" && data.sdp) {
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(
              new RTCSessionDescription(data.sdp)
            );
          }
        } else if (data.type === "iceCandidate" && data.candidate) {
          if (pcRef.current) {
            await pcRef.current.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
          }
        } else if (data.type === "error") {
          alert(data.message);
        } else if(data.type === "MeetingEnded"){
          toast.warning("Interview ended");
          setRoomId("");
          pcRef.current?.close();
          pcRef.current=null
          vRef.current=null
          localVideoRef.current=null
          alert("Meeting ended")
          setTimeout(()=>navigate("/"),5000);
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    };

    return () => {
      socket1.close();
    };
  }, [roomId,navigate]);

  async function startSendingVideo() {
    if (!roomId) return;
    setIsModalOpen(false);
    if (!socket) return;

    const peerConnection = new RTCPeerConnection();
    pcRef.current = peerConnection;

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
        aRef.current.volume = 1;
        aRef.current.play();
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

  const onChangeHandler = (
    value: string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _event: unknown | undefined
  ) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const content = value;
      socket.send(
        JSON.stringify({
          type: "editorContent",
          roomId: roomId,
          content: content
        })
      );
    }
  };

  const toggleVideo = () => {
    if (pcRef.current && pcRef.current.getSenders()) {
      // console.log("inside if")
      const videoSender = pcRef.current
        .getSenders()
        .find((sender) => sender.track?.kind === "video");
      if (videoSender?.track) {
        videoSender.track.enabled = !videoSender.track.enabled;
        setvideoP(videoSender.track.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (pcRef.current && pcRef.current.getSenders()) {
      const audioTrack = pcRef.current
        ?.getSenders()
        .find((sender) => sender.track?.kind === "audio");
      if (audioTrack?.track) {
        audioTrack.track.enabled = !audioTrack.track.enabled;
        setAudioP(audioTrack.track.enabled);
      }
    }
  };

  return (
    
    <>
    <ToastContainer position="top-right" />
      {isModalOpen && (
        <div className="fixed z-50 inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Join Room</h2>
            <div className="flex mb-4">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Room ID"
                className="border p-2 flex-grow mr-2"
              />
              <button
                onClick={startSendingVideo}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}

      {roomId && (
        <>
          {" "}
          <div className="flex flex-row justify-evenly items-center border p-5 rounded-lg shadow-lg">
            {/* Remote Video */}
            <div className="flex flex-col items-center bg-white p-2 rounded-full shadow-md mx-4">
              <div className="relative w-32 h-32">
                <video
                  autoPlay
                  muted
                  ref={vRef}
                  className="w-full h-full object-cover rounded-full shadow-md"
                />
                <audio ref={aRef} autoPlay />
              </div>
            </div>

            {/* Local Video */}
            <div className="relative flex flex-col items-center bg-white p-2 rounded-full shadow-lg mx-4">
              <div className="relative w-32 h-32">
                <video
                  autoPlay
                  muted
                  ref={localVideoRef}
                  className="w-full h-full object-cover rounded-full shadow-md"
                />
                <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 ">
                  {videoP ? (
                    <img
                      src={video}
                      alt="video"
                      onClick={toggleVideo}
                      className="w-8 h-8 p-1 rounded-full shadow-lg bg-white"
                    />
                  ) : (
                    <img
                      src={videoC}
                      alt="video-close"
                      onClick={toggleVideo}
                      className="w-8 h-8 p-1 rounded-full shadow-lg bg-white"
                    />
                  )}
                </div>

                <div className="absolute top-1/2 -right-8 transform translate-x-1/2 -translate-y-1/2 ">
                  {audioP ? (
                    <img
                      src={mic}
                      alt="mic"
                      onClick={toggleAudio}
                      className="w-8 h-8 p-1 rounded-full shadow-lg bg-white"
                    />
                  ) : (
                    <img
                      src={micC}
                      alt="mic-off"
                      onClick={toggleAudio}
                      className="w-8 h-8 p-1 rounded-full shadow-lg bg-white"
                    />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 transform translate-x-1/2 translate-y-1/2 ">
                  <img
                    src={hang}
                    alt="hang-up"
                    className="w-8 h-8 p-1 rounded-full shadow-lg bg-white"
                    onClick={handleHangUp}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-row border p-5 rounded-lg shadow-lg mt-1">
            <div className="w-2/3 h-[300px] rounded-lg p-2 mx-2 border bg-[#38298b] text-white">
              <div className="flex justify-between mb-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="border bg-white text-black rounded p-1"
                >
                  {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="border bg-white text-black rounded p-1"
                >
                  {themes.map((themeOption) => (
                    <option key={themeOption.value} value={themeOption.value}>
                      {themeOption.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="h-[240px] overflow-hidden rounded-lg">
                <Editor
                  language={language}
                  onChange={onChangeHandler}
                  theme={theme}
                  options={{
                    selectionClipboard: false,
                    autoClosingBrackets: "always",
                    "semanticHighlighting.enabled": "configuredByTheme"
                  }}
                  className="h-full w-full mb-2"
                />
              </div>
            </div>
            {/* chat  */}
            <div className="w-1/3 h-[300px] border rounded-lg p-3 shadow-md">
              <div className="flex flex-col h-full">
                <Chat socket={socket} roomId={roomId} role="sender" />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Candidate;
