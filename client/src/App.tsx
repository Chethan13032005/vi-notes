import { useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";
import Login from "./Components/Login";
import Editor from "./Components/Editor";
import CertificateView from "./pages/CertificateView";
import "./App.css";

export type AuthUser = {
  _id: string;
  email: string;
  token: string; // Added for JWT token support
};

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/verify/:certificateId" element={<CertificateView />} />

        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <div className="app-shell">
                <Login setUser={setUser} />
              </div>
            )
          }
        />

        <Route
          path="/register"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <div className="app-shell">
                <Login setUser={setUser} />
              </div>
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            user ? (
              <div className="app-shell">
                <Editor user={user} onLogout={() => setUser(null)} />
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="*"
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;