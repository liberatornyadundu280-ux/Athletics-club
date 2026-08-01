import { useCallback, useEffect, useMemo, useState } from "react";
import {
  confirmPhoneVerificationCode,
  createAccountWithEmail,
  createPhoneRecaptcha,
  logout,
  resetPassword,
  sendPhoneVerificationCode,
  signInWithEmail,
  signInWithGoogle,
  subscribeToAuthChanges,
} from "../../services/auth";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const runAuthAction = useCallback(async (action) => {
    setAuthError("");

    try {
      return await action();
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  }, []);

  const loginWithEmail = useCallback(
    (email, password) =>
      runAuthAction(() => signInWithEmail(email.trim(), password)),
    [runAuthAction],
  );

  const registerWithEmail = useCallback(
    ({ email, password, displayName }) =>
      runAuthAction(() =>
        createAccountWithEmail({
          displayName: displayName?.trim(),
          email: email.trim(),
          password,
        }),
      ),
    [runAuthAction],
  );

  const loginWithGoogle = useCallback(
    () => runAuthAction(signInWithGoogle),
    [runAuthAction],
  );

  const sendPhoneCode = useCallback(
    (phoneNumber, recaptchaContainerId = "phone-recaptcha") =>
      runAuthAction(() => {
        const verifier = createPhoneRecaptcha(recaptchaContainerId);
        return sendPhoneVerificationCode(phoneNumber.trim(), verifier);
      }),
    [runAuthAction],
  );

  const confirmPhoneCode = useCallback(
    (confirmationResult, verificationCode) =>
      runAuthAction(() =>
        confirmPhoneVerificationCode(
          confirmationResult,
          verificationCode.trim(),
        ),
      ),
    [runAuthAction],
  );

  const sendPasswordReset = useCallback(
    (email) => runAuthAction(() => resetPassword(email.trim())),
    [runAuthAction],
  );

  const signOutUser = useCallback(() => runAuthAction(logout), [runAuthAction]);

  const value = useMemo(
    () => ({
      authError,
      confirmPhoneCode,
      loading,
      loginWithEmail,
      loginWithGoogle,
      registerWithEmail,
      sendPasswordReset,
      sendPhoneCode,
      signOutUser,
      user,
      userLoggedIn: Boolean(user),
    }),
    [
      authError,
      confirmPhoneCode,
      loading,
      loginWithEmail,
      loginWithGoogle,
      registerWithEmail,
      sendPasswordReset,
      sendPhoneCode,
      signOutUser,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
