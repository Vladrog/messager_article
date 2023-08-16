import React from "react";
import socket from "../socket";
import crypt from "../crypt"

export default function ChatBlock({
  users,
  messages,
  userName,
  roomId,
  userKey,
  roomKey,
  onAddMessage,
}) {
  const [messageValue, setMessageValue] = React.useState("");
  const messagesRef = React.useRef(null);

  const onSendMessage = () => {
    let bits = crypt.encode(messageValue, userKey);
    let messageEncoded = JSON.stringify(bits);
    socket.emit("ROOM:NEW_MESSAGE_FROM", {
      roomId,
      userName,
      text: messageEncoded,
    });
    onAddMessage({ userName, text: messageEncoded });
    setMessageValue("");
  };

  React.useEffect(() => {
    messagesRef.current.scrollTo(0, 99999);
  }, [messages]);

  return (
    <div className="chatBlock d-flex flex-row border border-secondary rounded">
      <div className="usersBlock border">
        <b>Комната: {roomId}</b>
        <hr />
        <b>Онлайн: {users.length}</b>
        <div className="usersList d-flex flex-column">
          {users.map((name) => (
            <div className="user">{name}</div>
          ))}
        </div>
      </div>
      <div className="messagesBlock">
        <div ref={messagesRef} className="messages">
          {messages.map((message) => (
            <div
              className={
                "message" + (userName === message.userName ? "To" : "From")
              }
            >
              <div className="message">
                <div
                  className={
                    "messageText messageText" +
                    (userName === message.userName ? "To" : "From")
                  }
                >
                  {message.text}
                </div>
                <p
                  className={
                    "messageUser text-muted messageUserFrom" +
                    (userName === message.userName ? "To" : "From")
                  }
                >
                  {message.userName}
                </p>
              </div>
              <div className="messageSpacer"></div>
            </div>
          ))}
        </div>
        <div className="inputBlock d-flex flex-column">
          <textarea
            className="messageInput"
            value={messageValue}
            onChange={(e) => setMessageValue(e.target.value)}
            rows="3"
          ></textarea>
          <button onClick={onSendMessage} className="btn btn-primary">
            Отправить
          </button>
          <p>Введенный ключ: {userKey}</p>
        </div>
      </div>
    </div>
  );
}
