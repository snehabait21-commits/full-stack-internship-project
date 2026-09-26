import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState } from "react";
import { createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { useEffect, useContext } from "react";
import { useTheme } from "next-themes";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [otpPending, setOtpPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const { setTheme } = useTheme();

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));

    if (userdata?.theme) {
      setTheme(userdata.theme);
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    setOtpPending(false);
    setPendingEmail("");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };
      const response = await axiosInstance.post("/user/login", payload);

      // Task 5: if a new location was detected, show OTP screen instead of logging in
      if (response.data.otpRequired) {
        setPendingEmail(firebaseuser.email);
        setOtpPending(true);
      } else {
        login(response.data.result);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Task 5: submit the OTP the user entered
  const verifyOtp = async (otp) => {
    try {
      const response = await axiosInstance.post("/user/verify-otp", {
        email: pendingEmail,
        otp,
      });
      login(response.data.result);
      setOtpPending(false);
      setPendingEmail("");
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error?.response?.data?.message || "Verification failed",
      };
    }
  };

  useEffect(() => {
    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        try {
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
          };
          const response = await axiosInstance.post("/user/login", payload);

          if (response.data.otpRequired) {
            setPendingEmail(firebaseuser.email);
            setOtpPending(true);
          } else {
            login(response.data.result);
          }
        } catch (error) {
          console.error(error);
          logout();
        }
      }
    });
    return () => unsubcribe();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        handlegooglesignin,
        setTheme,
        otpPending,
        pendingEmail,
        verifyOtp,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);