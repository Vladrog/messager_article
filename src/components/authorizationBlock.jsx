import React, { useState } from "react";
import axios from 'axios';
import socket from "../socket";
import localIp from "../getIp";


export default function AuthorizationBlock({onLogin, checkedRoom}) {
  const [roomId, setRoomId] = React.useState("");
  const [userKey, setKey] = React.useState("");
  const [userName, setUserName] = React.useState("");
  const [isLoading, setLoading] = React.useState(false);

  const onEnter = async () => {
    if (!roomId || !userName || !userKey || userKey.length!=16) {
        return alert("Одно из полей не заполнено или длина ключа меньше 16 символов");
    }
    if (!roomId || !userName || !userKey) {
        return alert("Одно из полей не заполнено");
    }
    else 
    {
      const obj = {
        roomId, 
        userName,
        userKey
      }
        setLoading(true);
        await axios.post('http://' + localIp + ':9999/rooms', obj);
        onLogin(obj);
    }
  };
  return (
    <div className="authorizationBlock d-flex flex-column">
      <input
        className="authorizationInput"
        id="authorizationInputRoomId"
        type="text"
        placeholder="Идентификатор комнаты"
        maxLength="45"
        value={roomId}
        onChange={(e) => {
          setRoomId(e.target.value)
          socket.emit("CHECK_ROOM", e.target.value)
      }}
      />
      <input
        className="authorizationInput"
        id="authorizationInputName"
        type="text"
        placeholder="Ваше имя"
        maxLength="45"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
      />
      <input
        className="authorizationInput"
        id="authorizationInputKey"
        type="text"
        placeholder="Ключ"
        maxLength="16"
        value={userKey}
        onChange={(e) => setKey(e.target.value)}
      />
      <button
        className="authorizationButton btn btn-success"
        id="authorizationButtonEnter"
        onClick={onEnter}
        disabled = {isLoading}
      >
        {isLoading ? "Вход...": (checkedRoom ? "Войти" : "Создать")}
      </button>
    </div>
  );
}
