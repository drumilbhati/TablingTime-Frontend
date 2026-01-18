import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";

const handleSuccess = async (credentialResponse: CredentialResponse) => {
  try {
    const response = await fetch("/api/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: credentialResponse.credential,
      }),
    });
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Login returned data: ", data);
  } catch (error) {
    console.log("Error occurred: ", error);
  }
};

const Login = () => {
  return (
    <div>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => console.log("login failed")}
        useOneTap
      />
    </div>
  );
};

export default Login;
