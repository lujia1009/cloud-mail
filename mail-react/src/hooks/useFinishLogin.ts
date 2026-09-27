import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { auth } from "../api/auth";
import { useApp } from "../stores/app";

export function useFinishLogin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return async (token: string) => {
    localStorage.setItem("token", token);
    const user = await auth.user().catch((error) => {
      localStorage.removeItem("token");
      throw error;
    });
    useApp.getState().setUser(user);
    useApp.getState().setAccount(user.account);
    qc.setQueryData(["me"], user);
    sessionStorage.removeItem("oauthSetup");
    sessionStorage.setItem("showLoginNotice", "1");
    void qc.invalidateQueries({ queryKey: ["config"] });
    navigate("/inbox", { replace: true });
  };
}
