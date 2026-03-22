import { useState } from "react";
import { AuthUser } from "../App";

type LoginProps = {
  setUser: (user: AuthUser) => void;
};

export default function Login({ setUser }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const trimmedEmail = email.trim();

  const postJson = async (url: string, body: unknown) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error: any = new Error(data?.message || "Request failed");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  };

  const withLoading = async (task: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await task();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    if (!trimmedEmail || !password) {
      setMessage("Please enter both email and password.");
      return;
    }

    await withLoading(async () => {
      try {
        const data = await postJson("http://localhost:5000/auth/login", {
          email: trimmedEmail,
          password
        });
        setUser(data);
      } catch (error: any) {
        if (error?.status === 401) {
          setMessage("Invalid email or password.");
          return;
        }
        setMessage(error?.data?.message || error?.message || "Login failed.");
      }
    });
  };

  const register = async () => {
    if (!trimmedEmail || !password) {
      setMessage("Please enter both email and password.");
      return;
    }

    await withLoading(async () => {
      try {
        await postJson("http://localhost:5000/auth/register", {
          email: trimmedEmail,
          password
        });
        setMessage("Registration successful. Please login.");
      } catch (error: any) {
        setMessage(error?.data?.message || error?.message || "Registration failed.");
      }
    });
  };

  return (
    <div className="card auth-card">
      <h1>Vi-Notes</h1>
      <p>Human writing authenticity verification</p>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="row">
        <button onClick={login} disabled={isLoading}>
          {isLoading ? "Working..." : "Login"}
        </button>
        <button onClick={register} disabled={isLoading} className="muted-btn">
          Register
        </button>
      </div>

      {message ? <p className="status-text">{message}</p> : null}
    </div>
  );
}