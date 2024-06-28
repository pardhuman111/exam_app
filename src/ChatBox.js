import React, { useState, useEffect, useCallback } from 'react';
import { usePubNub } from 'pubnub-react';
import './ChatBox.css'; // Import the CSS file

const ChatBox = () => {
  const pubnub = usePubNub();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  const toggleChatBox = () => {
    setIsOpen(!isOpen);
  };

  const handleMessage = useCallback((event) => {
    const newMessage = {
      text: event.message,
      timestamp: new Date().getTime(),
      id: `${event.message}-${new Date().getTime()}`, // Unique id to prevent duplication
      remainingTime: 60
    };
    setMessages((prevMessages) => {
      const exists = prevMessages.some((msg) => msg.id === newMessage.id);
      if (!exists) {
        return [...prevMessages, newMessage];
      }
      return prevMessages;
    });
  }, []);

  useEffect(() => {
    pubnub.addListener({ message: handleMessage });
    pubnub.subscribe({ channels: ['chat'] });

    return () => {
      pubnub.removeListener({ message: handleMessage });
      pubnub.unsubscribe({ channels: ['chat'] });
    };
  }, [pubnub, handleMessage]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((prevMessages) =>
        prevMessages
          .map((msg) => ({
            ...msg,
            remainingTime: msg.remainingTime - 1
          }))
          .filter((msg) => msg.remainingTime > 0)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const sendMessage = () => {
    if (text.trim()) {
      pubnub.publish({ channel: 'chat', message: text });
      setText('');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="chatbox-container">
      <button className="chatbox-button" onClick={toggleChatBox}>
        {isOpen ? 'Close Chatbox' : 'Open Chatbox'}
      </button>
      {isOpen && (
        <div className="chatbox">
          <h2>Chatbox</h2>
          <div className="chatbox-messages">
            {messages.map((message) => (
              <div key={message.id} className="chatbox-message">
                <p className="message-text">{message.text}</p>
                <p className="message-time">{formatTime(message.timestamp)}</p>
                <p className="message-timer">{message.remainingTime}s</p>
              </div>
            ))}
          </div>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      )}
    </div>
  );
};

export default ChatBox;
