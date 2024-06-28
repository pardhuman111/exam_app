import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import PubNub from 'pubnub';
import { PubNubProvider } from 'pubnub-react';
import ChatBox from './ChatBox';
import Webcam from "react-webcam";
import * as blazeface from '@tensorflow-models/blazeface';
import '@tensorflow/tfjs';

const pubnub = new PubNub({
  publishKey: 'pub-c-b8179c62-2a6a-43c0-bd23-228b9e889363', // Replace with your actual publish key
  subscribeKey: 'sub-c-a806dfaa-9ba8-4dfa-ab07-70f565e43fe8', // Replace with your actual subscribe key
  uuid: 'myUniqueUserId' // Add a unique identifier for the client
});

const App = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [videoBlob, setVideoBlob] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const handleLogin = (e) => {
    e.preventDefault();
    const { username, password } = e.target.elements;
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(user => user.username === username.value && user.password === password.value);

    if (user) {
      setLoggedIn(true);
      setErrorMessage('');
    } else {
      setErrorMessage('Invalid username or password');
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    const { username, password, confirmPassword } = e.target.elements;
    const users = JSON.parse(localStorage.getItem('users')) || [];

    if (users.some(user => user.username === username.value)) {
      setErrorMessage('User already exists');
      return;
    }

    if (password.value !== confirmPassword.value) {
      setErrorMessage('Passwords do not match');
      return;
    }

    users.push({ username: username.value, password: password.value });
    localStorage.setItem('users', JSON.stringify(users));
    setLoggedIn(true);
    setErrorMessage('');
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setWebcamOpen(false);
    setCapturing(false);
    setVideoBlob(null);
    setFaceDetected(false);
  };

  const loadBlazeFace = async () => {
    const model = await blazeface.load();
    detectFace(model);
  };

  const detectFace = async (model) => {
    if (capturing && webcamRef.current && webcamRef.current.video.readyState === 4) {
      const video = webcamRef.current.video;
      const predictions = await model.estimateFaces(video, false);

      setFaceDetected(predictions.length > 0);
    }

    requestAnimationFrame(() => detectFace(model));
  };

  const toggleWebcam = () => {
    setWebcamOpen(prevState => !prevState);
    setCapturing(false);
    setVideoBlob(null);
    setFaceDetected(false);
  };

  const startCapturing = () => {
    setCapturing(true);
    const stream = webcamRef.current.video.srcObject;
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "video/webm" });
    let chunks = [];
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setVideoBlob(blob);
      chunks = [];
    };
    mediaRecorderRef.current.start();
  };

  const stopCapturing = () => {
    setCapturing(false);
    mediaRecorderRef.current.stop();
  };

  const downloadVideo = () => {
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'recorded-video.webm';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (capturing) loadBlazeFace();
  }, [capturing]);

  const loginContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100%',
    backgroundImage: 'url(/photo-1453733190371-0a9bedd82893.avif)',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'cover'
  };

  const loginFormStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: '40px',
    borderRadius: '10px',
    boxShadow: '0 15px 30px rgba(0, 0, 0, 0.2), 0 5px 15px rgba(0, 0, 0, 0.1)',
    textAlign: 'left',
    maxWidth: '400px',
    width: '100%',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
  };

  return (
    <PubNubProvider client={pubnub}>
      <div className="App">
        {!loggedIn ? (
          <div style={loginContainerStyle}>
            {isRegistering ? (
              <form style={loginFormStyle} onSubmit={handleRegister}>
                <h2>Register</h2>
                {errorMessage && <p className="error-message">{errorMessage}</p>}
                <div className="form-group">
                  <label htmlFor="username">Username:</label>
                  <input type="text" id="username" name="username" required />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password:</label>
                  <div className="password-container">
                    <input
                      type={showPasswords ? "text" : "password"}
                      id="password"
                      name="password"
                      required
                    />
                    <span
                      className="toggle-password"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? "👁️" : "🙈"}
                    </span>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password:</label>
                  <div className="password-container">
                    <input
                      type={showPasswords ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      required
                    />
                    <span
                      className="toggle-password"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? "👁️" : "🙈"}
                    </span>
                  </div>
                </div>
                <button type="submit" className="login-button">Register</button>
                <p>Already have an account? <span onClick={() => setIsRegistering(false)} className="toggle-form">Login here</span></p>
              </form>
            ) : (
              <form style={loginFormStyle} onSubmit={handleLogin}>
                <h2>Login</h2>
                {errorMessage && <p className="error-message">{errorMessage}</p>}
                <div className="form-group">
                  <label htmlFor="username">Username:</label>
                  <input type="text" id="username" name="username" required />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password:</label>
                  <div className="password-container">
                    <input
                      type={showPasswords ? "text" : "password"}
                      id="password"
                      name="password"
                      required
                    />
                    <span
                      className="toggle-password"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? "👁️" : "🙈"}
                    </span>
                  </div>
                </div>
                <button type="submit" className="login-button">Login</button>
                <p>New here? <span onClick={() => setIsRegistering(true)} className="toggle-form">Register here</span></p>
              </form>
            )}
          </div>
        ) : (
          <header className="App-header">
            <button className="logout-button" onClick={handleLogout}>Logout</button>
            <h1>Welcome to Monitor Exam</h1>
            {webcamOpen && (
              <>
                <div className={`webcam-container ${faceDetected ? 'face-detected' : 'face-not-detected'}`}>
                  <Webcam
                    className="webcam-view"
                    audio={true}
                    ref={webcamRef}
                    screenshotFormat="image/png"
                  />
                </div>
                <div className="webcam-buttons">
                  {!capturing ? (
                    <button className="start-button" onClick={startCapturing}>Start Capturing</button>
                  ) : (
                    <button className="stop-button" onClick={stopCapturing}>Stop Capturing</button>
                  )}
                  {videoBlob && <button className="download-button" onClick={downloadVideo}>Download</button>}
                </div>
              </>
            )}
            <div className="webcam-toggle-button">
              <button onClick={toggleWebcam}>
                {webcamOpen ? 'Close Webcam' : 'Open Webcam'}
              </button>
            </div>
            <ChatBox />
          </header>
        )}
      </div>
    </PubNubProvider>
  );
};

export default App;
