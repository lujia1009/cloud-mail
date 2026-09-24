import { del, get, post, put } from "./client";
import type { User, SiteConfig } from "../types";
export const auth = {
  login: (email: string, password: string) =>
    post<{ token: string }>("/login", { email, password }),
  register: (form: Record<string, unknown>) => post<unknown>("/register", form),
  logout: () => del("/logout"),
  user: () => get<User>("/my/loginUserInfo"),
  config: () => get<SiteConfig>("/setting/websiteConfig"),
  password: (password: string) => put("/my/resetPassword", { password }),
  deleteSelf: () => del("/my/delete"),
  oauth: (
    provider: "linuxDo" | "github" | "google",
    code: string,
    redirectUri: string,
  ) =>
    post<{ token?: string; [key: string]: any }>(`/oauth/${provider}/login`, {
      code,
      redirectUri,
    }),
  bind: (form: Record<string, unknown>) => put("/oauth/bindUser", form),
};
