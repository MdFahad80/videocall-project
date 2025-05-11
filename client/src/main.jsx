import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// import process from "process";
import { UserProvider } from './context/UserContextApi.jsx';
// import { Buffer } from "buffer";

// window.process = process;
// window.global = window;
// window.Buffer = Buffer;


createRoot(document.getElementById('root')).render(
  <UserProvider>
    <App />
  </UserProvider>
)
