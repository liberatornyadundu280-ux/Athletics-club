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
import {
  addAdmin as addAdminToService,
  readAdmins,
  removeAdmin as removeAdminFromService,
} from "../../services/adminService";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [isAdmin, setIsAdmin] = useState(null);
  const [adminEmails, setAdminEmails] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (!currentUser) {
        setIsAdmin(null);
        setAdminEmails([]);
      }
    });

    return unsubscribe;
  }, []);

  const refreshAdmins = useCallback(async () => {
    const admins = await readAdmins();
    setAdminEmails(admins);
    return admins;
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let mounted = true;


    async function checkAdminStatus() {
      try {
        const admins = await readAdmins(user.email);
        if (mounted) {
          setIsAdmin(admins.some((admin) => admin.email === user.email?.toLowerCase()));
          setAdminEmails(admins);
        }
      } catch (error) {
        if (mounted) {
          setIsAdmin(false);
          setAdminEmails([]);
          setAuthError(error.message || "Unable to verify dashboard access.");
        }
      }
    }

    checkAdminStatus();

    return () => {
      mounted = false;
    };
  }, [user]);

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

  const addAdmin = useCallback(
    async (email) => {
      const normalizedEmail = email.trim();
      await addAdminToService(normalizedEmail, user?.email);
      await refreshAdmins();
    },
    [refreshAdmins, user],
  );

  const removeAdmin = useCallback(
    async (email) => {
      await removeAdminFromService(email, user?.email);
      await refreshAdmins();
    },
    [refreshAdmins, user],
  );

  const value = useMemo(
    () => ({
      addAdmin,
      adminEmails,
      adminLoading: isAdmin === null,
      authError,
      confirmPhoneCode,
      isAdmin,
      loading,
      loginWithEmail,
      loginWithGoogle,
      registerWithEmail,
      removeAdmin,
      sendPasswordReset,
      sendPhoneCode,
      signOutUser,
      user,
      userLoggedIn: Boolean(user),
    }),
    [
      addAdmin,
      adminEmails,
      authError,
      confirmPhoneCode,
      isAdmin,
      loading,
      loginWithEmail,
      loginWithGoogle,
      registerWithEmail,
      removeAdmin,
      sendPasswordReset,
      sendPhoneCode,
      signOutUser,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
