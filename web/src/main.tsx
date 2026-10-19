import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router-dom";
import "./index.css";
import { initTelegram } from "./telegram";
import { AppShell, FlowShell } from "./components/AppShell";
import Home from "./screens/Home";
import SoundClone from "./screens/SoundClone";
import Recording from "./screens/Recording";
import SampleComparison from "./screens/SampleComparison";
import LyricGenerator from "./screens/LyricGenerator";
import SongProfile from "./screens/SongProfile";
import Settings from "./screens/Settings";

initTelegram();

// Hash router: survives being served under any base path and inside the
// Telegram in-app webview without server-side route config.
const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/clone", element: <SoundClone /> },
      { path: "/lyrics", element: <LyricGenerator /> },
      { path: "/settings", element: <Settings /> },
    ],
  },
  {
    element: <FlowShell />,
    children: [
      { path: "/clone/record", element: <Recording /> },
      { path: "/clone/compare", element: <SampleComparison /> },
      { path: "/song/:id", element: <SongProfile /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
