import join_room from "../assets/join-room.svg";
import create_room from "../assets/create-room.svg";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div className="flex flex-row gap-5 justify-evenly h-96 items-center">
     
      <div className="flex flex-col justify-center items-center">
        <p className="text-lg">Join Room</p>
      <Link to={"/candidate"}>
        <img
          src={join_room}
          alt={"join room"}
          width={150}
          height={150}
          className="p-2 rounded-xl shadow-md active:animate-ping"
        />
        </Link>
      </div>

      <div className="flex flex-col justify-center items-center">
        <p className="text-lg ">Create Room</p>
      <Link to={"/interviewer"} >
        <img
          src={create_room}
          alt={"create room"}
          width={150}
          height={150}
          className="p-2 shadow-md rounded-xl active:animate-ping"
          
          />
            </Link>
          
      </div>
    </div>
  );
};

export default Hero;
