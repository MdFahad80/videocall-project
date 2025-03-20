import React, { use, useEffect, useRef, useState } from 'react';
import socketInstance from '../components/socketio/VideoCallSocket';
import { FaBars, FaTimes, FaPhoneAlt, FaMicrophone, FaVideo } from "react-icons/fa";
import Lottie from "lottie-react";
import wavingAnimation from "../../assets/waving.json";
import { FaPhoneSlash } from "react-icons/fa6";
import apiClient from "../../apiClient";
import { useUser } from '../../context/UserContextApi';
import { RiLogoutBoxLine } from "react-icons/ri";
import { useNavigate } from 'react-router-dom';
import Peer from 'simple-peer'

const Dashboard = () => {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOnline, setUserOnline] = useState([]);
  const [stream, setStream] = useState(null);
  const [me, setMe] = useState("");

  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [modalUser, setModalUser] = useState(null);

  const myVideo = useRef(null);
  const reciverVideo = useRef(null);
  const connectionRef = useRef(null);
  const hasJoined = useRef(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const [reciveCall, setReciveCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callerName, setCallerName] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);

  const socket = socketInstance.getSocket();

  useEffect(() => {
    if (user && socket && !hasJoined.current) {
      socket.emit("join", { id: user._id, name: user.username });
      hasJoined.current = true;
    }

    socket.on("me", (id) => setMe(id));

    socket.on("callToUser", (data) => {
      setReciveCall(true);
      setCaller(data);
      setCallerName(data.name);
      setCallerSignal(data.signal);
    });

    socket.on("callRejected", (data) => {
      alert(`Call rejected by ${data.name}`);
    });

    socket.on("callEnded", (data) => {
      console.log("Call ended by", data.name);
      endCallCleanup();
    });

    socket.on("userUnavailable", (data) => {
      alert(data.message || "User is not available.");
    });

    socket.on("userBusy", (data) => {
      alert(data.message || "User is currently in another call.");
    });

    socket.on("online-users", (onlineUsers) => {
      setUserOnline(onlineUsers);
    });

    return () => {
      socket.off("me");
      socket.off("callToUser");
      socket.off("callRejected");
      socket.off("callEnded");
      socket.off("userUnavailable");
      socket.off("userBusy");
      socket.off("online-users");
    };
  }, [user, socket]);

  const handelSelectedUser = (userId) => {
    if (callAccepted || reciveCall) {
      alert("You must end the current call before starting a new one.");
      return;
    }
    const selected = filteredUsers.find(user => user._id === userId);
    setModalUser(selected);
    setShowUserDetailModal(true);
  };

  const startCall = async () => {
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(currentStream);
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }

      setIsSidebarOpen(false);
      setSelectedUser(modalUser._id);

      const peer = new Peer({ initiator: true, trickle: false, stream: currentStream });

      peer.on("signal", (data) => {
        socket.emit("callToUser", {
          callToUserId: modalUser._id,
          signalData: data,
          from: me,
          name: user.username,
          email: user.email,
          profilepic: user.profilepic,
        });
      });

      peer.on("stream", (remoteStream) => {
        if (reciverVideo.current) reciverVideo.current.srcObject = remoteStream;
      });

      socket.once("callAccepted", (data) => {
        setCallAccepted(true);
        setCaller(data.from);
        peer.signal(data.signal);
      });

      connectionRef.current = peer;
      setShowUserDetailModal(false);
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  };

  const handelacceptCall = async () => {
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(currentStream);
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }

      setCallAccepted(true);
      setReciveCall(true);
      setIsSidebarOpen(false);

      const peer = new Peer({ initiator: false, trickle: false, stream: currentStream });

      peer.on("signal", (data) => {
        socket.emit("answeredCall", {
          signal: data,
          from: me,
          to: caller.from,
        });
      });

      peer.on("stream", (remoteStream) => {
        if (reciverVideo.current) reciverVideo.current.srcObject = remoteStream;
      });

      if (callerSignal) peer.signal(callerSignal);

      connectionRef.current = peer;
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  };

  const handelrejectCall = () => {
    setReciveCall(false);
    setCallAccepted(false);
    socket.emit("reject-call", { to: caller.from, name: user.username });
  };

  const handelendCall = () => {
    socket.emit("call-ended", { to: caller?.from || selectedUser, name: user.username });
    endCallCleanup();
  };

  const endCallCleanup = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (reciverVideo.current) reciverVideo.current.srcObject = null;
    if (myVideo.current) myVideo.current.srcObject = null;
    connectionRef.current?.destroy();
    setStream(null);
    setReciveCall(false);
    setCallAccepted(false);
    setSelectedUser(null);
  };

  const isOnlineUser = (userId) => userOnline.some((u) => u.userId === userId);

  const allusers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/user');
      if (response.data.success !== false) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    allusers();
  }, []);

    // Toggle Mute/Unmute
    const toggleMute = () => {
      if (stream) {
        stream.getAudioTracks().forEach(track => track.enabled = isMuted);
        setIsMuted(!isMuted);
      }
    };
  
    // Toggle Camera On/Off
    const toggleCamera = () => {
      if (stream) {
        stream.getVideoTracks().forEach(track => track.enabled = !isCameraOn);
        setIsCameraOn(!isCameraOn);
      }
    };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = async () => {
    if (callAccepted || reciveCall) {
      alert("You must end the call before logging out.");
      return;
    }
    try {
      await apiClient.post('/auth/logout');
      socket.off("disconnect");
      socket.disconnect();
      socketInstance.setSocket();
      updateUser(null);
      localStorage.removeItem("userData");
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };
  

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`bg-gradient-to-br from-blue-900 to-purple-800 text-white w-64 h-full p-4 space-y-4 fixed z-20 transition-transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Users</h1>
          <button
            type="button"
            className="md:hidden text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <FaTimes />
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 mb-2"
        />

        {/* User List */}
        <ul className="space-y-4 overflow-y-auto">
          {filteredUsers.map((user) => (
            <li
              key={user._id}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selectedUser === user._id
                ? "bg-green-600"
                : "bg-gradient-to-r from-purple-600 to-blue-400"
                }`}
              onClick={() => handelSelectedUser(user._id)}
            >
              <div className="relative">
                <img
                  src={user.profilepic || "/default-avatar.png"}
                  alt={`${user.username}'s profile`}
                  className="w-10 h-10 rounded-full border border-white"
                />
                {isOnlineUser(user._id) && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full shadow-lg animate-bounce"></span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">{user.username}</span>
                <span className="text-xs text-gray-400 truncate w-32">
                  {user.email}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* Logout */}
        {user && <div
          onClick={handleLogout}
          className="absolute bottom-2 left-4 right-4 flex items-center gap-2 bg-red-400 px-4 py-1 cursor-pointer rounded-lg"
        >
          <RiLogoutBoxLine />
          Logout
        </div>}
      </aside>

      {/* Main Content */}
      {selectedUser || reciveCall || callAccepted ? (
        <div className="relative w-full h-screen bg-black flex items-center justify-center">
          {/* Remote Video */}
          <video
            ref={reciverVideo}
            autoPlay
            className="absolute top-0 left-0 w-full h-full object-contain rounded-lg"
          />

          {/* Local PIP Video */}
          <div className="absolute bottom-[75px] md:bottom-0 right-1 bg-gray-900 rounded-lg overflow-hidden shadow-lg">
            <video
              ref={myVideo}
              autoPlay
              playsInline
              className="w-32 h-40 md:w-56 md:h-52 object-cover rounded-lg"
            />
          </div>

          {/* Username + Sidebar Button */}
          <div className="absolute top-4 left-4 text-white text-lg font-bold flex gap-2 items-center">
            <button
              type="button"
              className="md:hidden text-2xl text-white cursor-pointer"
              onClick={() => setIsSidebarOpen(true)}
            >
              <FaBars />
            </button>
            {callerName || "Caller"}
          </div>

          {/* Call Controls */}
          <div className="absolute bottom-4 w-full flex justify-center gap-4">
            <button
              type="button"
              className="bg-red-600 p-4 rounded-full text-white shadow-lg cursor-pointer"
              onClick={handelendCall}
            >
              <FaPhoneSlash size={24} />
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="bg-gray-700 p-4 rounded-full text-white shadow-lg cursor-pointer"
            >
              <FaMicrophone size={24} />
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              className="bg-gray-700 p-4 rounded-full text-white shadow-lg cursor-pointer"
            > 
              <FaVideo size={24} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-6 md:ml-72 text-white">
          {/* Mobile Sidebar Toggle */}
          <button
            type="button"
            className="md:hidden text-2xl text-black mb-4"
            onClick={() => setIsSidebarOpen(true)}
          >
            <FaBars />
          </button>

          {/* Welcome */}
          <div className="flex items-center gap-5 mb-6 bg-gray-800 p-5 rounded-xl shadow-md">
            <div className="w-20 h-20">
              <Lottie animationData={wavingAnimation} loop autoplay />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                Hey {user?.username || "Guest"}! 👋
              </h1>
              <p className="text-lg text-gray-300 mt-2">
                Ready to <strong>connect with friends instantly?</strong>
                Just <strong>select a user</strong> and start your video call! 🎥✨
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-sm">
            <h2 className="text-lg font-semibold mb-2">💡 How to Start a Video Call?</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-400">
              <li>📌 Open the sidebar to see online users.</li>
              <li>🔍 Use the search bar to find a specific person.</li>
              <li>🎥 Click on a user to start a video call instantly!</li>
            </ul>
          </div>
        </div>
      )}
      {/*call user pop up */}
      {showUserDetailModal && modalUser && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className='font-black text-xl mb-2'>User Details</p>
              <img
                src={modalUser.profilepic || "/default-avatar.png"}
                alt="User"
                className="w-20 h-20 rounded-full border-4 border-blue-500"
              />
              <h3 className="text-lg font-bold mt-3">{modalUser.username}</h3>
              <p className="text-sm text-gray-500">{modalUser.email}</p>

              <div className="flex gap-4 mt-5">
                <button
                  onClick={() => {
                    setSelectedUser(modalUser._id);
                    startCall(); // function that handles media and calling
                    setShowUserDetailModal(false);
                  }}
                  className="bg-green-600 text-white px-4 py-1 rounded-lg w-28 flex items-center gap-2 justify-center"
                >
                  Call <FaPhoneAlt />
                </button>
                <button
                  onClick={() => setShowUserDetailModal(false)}
                  className="bg-gray-400 text-white px-4 py-1 rounded-lg w-28"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Call Modal */}
      {reciveCall && !callAccepted && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-2">Call From...</p>
              <img
                src={caller?.profilepic || "/default-avatar.png"}
                alt="Caller"
                className="w-20 h-20 rounded-full border-4 border-green-500"
              />
              <h3 className="text-lg font-bold mt-3">{callerName}</h3>
              <p className="text-sm text-gray-500">{caller?.email}</p>
              <div className="flex gap-4 mt-5">
                <button
                  type="button"
                  onClick={handelacceptCall}
                  className="bg-green-500 text-white px-4 py-1 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Accept <FaPhoneAlt />
                </button>
                <button
                  type="button"
                  onClick={handelrejectCall}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Reject <FaPhoneSlash />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default Dashboard;