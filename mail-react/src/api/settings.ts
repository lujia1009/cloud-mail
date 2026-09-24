import { del, get, put } from "./client";
export const settings = {
  query: () => get<Record<string, any>>("/setting/query"),
  save: (v: Record<string, unknown>) => put("/setting/set", v),
  background: (background: string) =>
    put("/setting/setBackground", { background }),
  deleteBackground: () => del("/setting/deleteBackground"),
  blacklist: (v: Record<string, unknown>) => put("/setting/setBlacklist", v),
};
