import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AuthForm from './pages/Auth/Auth';
import { UserProvider } from "./context/UserContextApi";

import Dashboard from './pages/Dashboard/Dashboard';

function App() {
  return (
    <UserProvider>
    <Router>
      <Routes>
      <Route path="/" element={<Dashboard />} />
        <Route path="/signup" element={<AuthForm type="signup" />} />
        <Route path="/login" element={<AuthForm type="login" />} />
     </Routes>
    </Router>
    </UserProvider>
  );
}

export default App;
