import { Route, Routes, BrowserRouter } from "react-router-dom";
import Candidate from "./components/Candidate";
import Hero from "./components/Hero";
import Interviewer from "./components/Interviewer";


function App() {
  return (
    <>
      <div className="flex flex-col min-h-screen bg-blue-100 items-center">
        <div className="flex flex-row border-1 shadow-lg  bg-white m-1 mt-4 rounded-full p-2 w-full lg:w-3/4">
          <div className="relative items-center justify-center text-2xl">
            <span className="text-3xl font-bold text-blue-700">O</span>
            <span className="absolute left-full top-1/2 transform -translate-y-1/2">Interview</span>
          </div>
        </div>

        <div className="border-1 shadow-lg m-1 bg-white rounded-2xl p-2 w-full lg:w-3/4">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Hero/>}/>
            <Route path="/candidate" element={<Candidate />} />
            <Route path="/interviewer" element={<Interviewer />} />
          </Routes>
        </BrowserRouter>
      </div>
      </div>
    </>
  );
}

export default App;
