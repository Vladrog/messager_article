import React from "react";
import AuthorizationBlock from "./components/authorizationBlock";
import ChatBlock from "./components/chatBlock";
import axios from "axios";
import socket from "./socket";
import crypt from "./crypt";
import localIp from "./getIp";

let userKey;
let roomKey;

function App() {
  const [state, dispatch] = React.useReducer(Reducer, {
    joined: false,
    roomId: null,
    userName: null,
    userKey: null,
    roomKey: null,
    users: [],
    messages: [],
    checkedRoom: false
  });
  
  const onLogin = async (obj) => {
    dispatch({
      type: "JOINED",
      payload: obj,
    });

    socket.emit("ROOM:JOIN", obj);
    const { data } = await axios.get(
      "http://" + localIp + ":9999/rooms/" + obj.roomId
    );

    data.messages.forEach(element => {
      element.text = crypt.decode(element.text, obj.userKey)
    });

    userKey = obj.userKey;
    roomKey = data.roomKey;

    dispatch({
      type: "SET_DATA",
      payload: data
    })

  };

  const setUsers = (users) => {
    dispatch({
      type: "SET_USERS",
      payload: users,
    });

  };

  const addMessage = (message) => {

    let bits = JSON.parse(message.text);
    message.text = crypt.decode(bits, userKey);
   

    dispatch({
      type: "NEW_MESSAGE_TO",
      payload: message,
    });
  };

  const reconnect = () => {
    if (state.joined) {
      const obj = {
        ...state
      }
      socket.emit("ROOM:JOIN", obj);
    } 
  }

  React.useEffect(() => {
    socket.removeAllListeners();
    socket.on("ROOM:SET_USERS", setUsers);
    socket.on("ROOM:NEW_MESSAGE_TO", addMessage);
    socket.on("CONNECTION", reconnect)
    socket.on("CHECKED_ROOM", (success) => {
      dispatch ({
        type: "CHECKED_ROOM",
        payload: success
      })
    })
  }, []);

  return (
    <div className="container">
      {state.joined ? (
        <ChatBlock {...state} onAddMessage={addMessage} />
      ) : (
        <AuthorizationBlock onLogin={onLogin} {...state} />
      )}
    </div>
  );
}

function Reducer(state, action) {
  switch (action.type) {
    case "JOINED":
      return {
        ...state,
        joined: true,
        roomId: action.payload.roomId,
        userName: action.payload.userName,
        userKey: action.payload.userKey
      };
    case "SET_USERS":
      return {
        ...state,
        users:action.payload
      }
    case "SET_DATA":
      return {
        ...state,
        users: action.payload.users,
        messages: action.payload.messages,
        roomKey: action.payload.roomKey
      };
    case "NEW_MESSAGE_TO":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case "CHECKED_ROOM":
      return {
        ...state,
        checkedRoom: action.payload
      };
    default:
      return state;
  }
}

export default App;
