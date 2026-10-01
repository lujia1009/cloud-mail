import { create } from "zustand";
import type { Account, SiteConfig, User, Mail } from "../types";
type Theme = "light" | "dark" | "system";
interface AppState {
  user: User | null;
  config: SiteConfig;
  account: Account | null;
  sidebarCollapsed: boolean;
  mobileNav: boolean;
  theme: Theme;
  composeOpen: boolean;
  composeMode: "new" | "reply" | "forward";
  composeMail: Mail | null;
  toast: string;
  setUser: (v: User | null) => void;
  setConfig: (v: SiteConfig) => void;
  setAccount: (v: Account | null) => void;
  toggleSidebar: () => void;
  setMobileNav: (v: boolean) => void;
  setTheme: (v: Theme) => void;
  openCompose: (mode?: "new" | "reply" | "forward", mail?: Mail | null) => void;
  closeCompose: () => void;
  notify: (v: string) => void;
}
export const useApp = create<AppState>((set) => ({
  user: null,
  config: {},
  account: null,
  sidebarCollapsed: false,
  mobileNav: false,
  theme: (localStorage.getItem("virevan-theme") as Theme) || "system",
  composeOpen: false,
  composeMode: "new",
  composeMail: null,
  toast: "",
  setUser: (user) => set({ user }),
  setConfig: (config) => set({ config }),
  setAccount: (account) => set({ account }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileNav: (mobileNav) => set({ mobileNav }),
  setTheme: (theme) => {
    localStorage.setItem("virevan-theme", theme);
    set({ theme });
  },
  openCompose: (composeMode = "new", composeMail = null) =>
    set({ composeOpen: true, composeMode, composeMail }),
  closeCompose: () =>
    set({ composeOpen: false, composeMode: "new", composeMail: null }),
  notify: (toast) => {
    set({ toast });
    setTimeout(() => set({ toast: "" }), 4500);
  },
}));
export const hasPerm = (user: User | null, key: string) =>
  !!user?.permKeys?.some((p) => p === "*" || p === key);
