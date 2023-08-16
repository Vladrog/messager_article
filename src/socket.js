import io from "socket.io-client";
import localIp from "./getIp";

const socket = io("http://" + localIp + ":9999");

export default socket;