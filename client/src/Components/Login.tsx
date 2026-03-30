import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthUser } from "../App";

type AuthMode = "login" | "register";

type LoginProps = {
  setUser: (user: AuthUser) => void;
  mode: AuthMode;
};

const API_BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,128}$/;

export default function Login({ setUser, mode }: LoginProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | ''}>({text: '', type: ''});
  const [isLoading, setIsLoading] = useState(false);

  const trimmedEmail = email.trim();
  const trimmedName = name.trim();
  const isRegisterMode = mode === "register";

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
      setMessage({text: "Please enter both email and password.", type: 'error'});
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setMessage({text: "Please enter a valid email address.", type: 'error'});
      return;
    }

    await withLoading(async () => {
      try {
        const data = await postJson(`${API_BASE_URL}/auth/login`, {
          email: trimmedEmail,
          password
        });
        setUser(data);
      } catch (error: any) {
        if (error?.status === 401) {
          setMessage({text: "Invalid email or password.", type: 'error'});
          return;
        }
        setMessage({text: error?.data?.message || error?.message || "Login failed.", type: 'error'});
      }
    });
  };

  const register = async () => {
    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setMessage({text: "Please complete all fields.", type: 'error'});
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 60) {
      setMessage({text: "Full name should be between 2 and 60 characters.", type: 'error'});
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setMessage({text: "Please enter a valid email address.", type: 'error'});
      return;
    }

    if (password !== confirmPassword) {
      setMessage({text: "Password and confirm password must match.", type: 'error'});
      return;
    }

    if (!STRONG_PASSWORD_REGEX.test(password)) {
      setMessage({text: "Use 10+ chars with uppercase, lowercase, number and symbol.", type: 'error'});
      return;
    }

    await withLoading(async () => {
      try {
        await postJson(`${API_BASE_URL}/auth/register`, {
          name: trimmedName,
          email: trimmedEmail,
          password,
          confirmPassword
        });
        setMessage({text: "Registration successful. Please sign in.", type: 'success'});
      } catch (error: any) {
        setMessage({text: error?.data?.message || error?.message || "Registration failed.", type: 'error'});
      }
    });
  };

  const passwordChecks = [
    {
      label: "10+ characters",
      valid: password.length >= 10
    },
    {
      label: "Uppercase and lowercase letters",
      valid: /[A-Z]/.test(password) && /[a-z]/.test(password)
    },
    {
      label: "At least one number",
      valid: /\d/.test(password)
    },
    {
      label: "At least one symbol",
      valid: /[^A-Za-z\d]/.test(password)
    }
  ];

  const title = isRegisterMode ? "Create your account" : "Welcome back";
  const subtitle = isRegisterMode
    ? "Start tracking your writing."
    : "Continue to your dashboard.";

  return (
    <div className={`card auth-card ${isRegisterMode ? "auth-card-register" : "auth-card-login"}`}>
      <h1>Vi-Notes</h1>
      <h2>{title}</h2>
      <p>{subtitle}</p>

      {isRegisterMode ? (
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Full name"
          autoComplete="name"
        />
      ) : null}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email"
        autoComplete="email"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-label="Password"
        autoComplete={isRegisterMode ? "new-password" : "current-password"}
      />

      {isRegisterMode ? (
        <>
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-label="Confirm password"
            autoComplete="new-password"
          />

          <div className="password-hints" aria-label="Password requirements">
            {passwordChecks.map((check) => (
              <p key={check.label} className={check.valid ? "hint-ok" : "hint-pending"}>
                {check.valid ? `✓ ${check.label}` : `• ${check.label}`}
              </p>
            ))}
          </div>
        </>
      ) : null}

      <div className="row auth-actions">
        <button onClick={isRegisterMode ? register : login} disabled={isLoading}>
          {isLoading ? "Working..." : isRegisterMode ? "Create Account" : "Login"}
        </button>
        <Link className="auth-switch-link" to={isRegisterMode ? "/login" : "/register"}>
          {isRegisterMode ? "Already have an account? Login" : "New here? Create account"}
        </Link>
      </div>

      {message.text ? <p className={`auth-message ${message.type}`}>{message.text}</p> : null}
    </div>
  );
}