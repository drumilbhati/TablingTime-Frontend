import { Button } from "@/components/ui/button";
import { useGoogleLogin, type CodeResponse } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  // 1. Move the hook inside the component
  const login = useGoogleLogin({
    onSuccess: async (codeResponse: CodeResponse) => {
      try {
        console.log("Auth Code received:", codeResponse.code);

        // 2. Send the 'code' to your backend
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/auth/google`, // Match your backend route
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: codeResponse.code,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        if (data.token) {
          // Save to localStorage
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));

          navigate("/");
        }
        console.log("Login returned data: ", data);
      } catch (error) {
        console.error("Login failed:", error);
      }
    },
    flow: "auth-code", // Required to get the 'code' your backend wants
  });

  return (
    <div className="flex justify-center items-center h-svh">
      <Button onClick={() => login()}>Login with Google</Button>
    </div>
  );
};

export default Login;
