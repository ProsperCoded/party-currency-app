import { useEffect, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { USER_PROFILE_CONTEXT } from "@/context";
import { storeAuth } from "@/lib/util";
import { getProfileApi } from "@/api/authApi";
import toast from "react-hot-toast";
import { LoadingDisplay } from "@/components/LoadingDisplay";

export default function GoogleAuth() {
  const navigate = useNavigate();
  const { setUserProfile } = useContext(USER_PROFILE_CONTEXT);
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        // Get token and user type from URL query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
        const userType = urlParams.get("user");

        if (!token) {
          setStatus("Authentication failed. No token received.");
          toast.error("Authentication failed");
          setTimeout(() => navigate("/login"), 2000);
          return;
        }

        // Store authentication token and user type
        // storeAuth(token, userType.toLowerCase() || "customer", true);
        storeAuth(token, "customer", true);
        setStatus("Authentication successful. Loading your profile...");

        // Fetch user profile with the new token
        const response = await getProfileApi();

        if (!response.ok) {
          throw new Error("Unable to fetch profile");
        }

        const profile = await response.json();

        // Set user profile in context
        setUserProfile(profile);

        // Wait a brief moment to ensure context is updated
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Success message
        toast.success("Successfully signed in with Google!");

        // Determine redirect based on user type
        const userTypeLC = userType.toLowerCase();
        if (userTypeLC === "admin") {
          navigate("/admin/dashboard");
        } else if (userTypeLC === "merchant") {
          navigate("/merchant/virtual-account");
        } else {
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Google auth callback error:", error);
        setStatus("Authentication error. Please try again.");
        toast.error("Failed to complete authentication");
        setTimeout(() => navigate("/login"), 2000);
      }
    };

    handleGoogleCallback();
  }, [navigate, setUserProfile]);

  return <LoadingDisplay message={status} />;
}
