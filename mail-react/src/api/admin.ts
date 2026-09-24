import { del, get, post, put } from "./client";
type Params = Record<string, string | number | undefined>;
export const admin = {
  users: (p: Params) => get<any>("/user/list", p),
  addUser: (v: any) => post("/user/add", v),
  userPassword: (v: any) => put("/user/setPwd", v),
  userStatus: (v: any) => put("/user/setStatus", v),
  userType: (v: any) => put("/user/setType", v),
  resetSend: (userId: number) => put("/user/resetSendCount", { userId }),
  restoreUser: (userId: number, type: number) =>
    put("/user/restore", { userId, type }),
  deleteUsers: (userIds: number[]) =>
    del("/user/delete", { userIds: userIds.join(",") }),
  userAccounts: (userId: number, num: number, size: number) =>
    get<any>("/user/allAccount", { userId, num, size }),
  deleteAccount: (accountId: number) =>
    del("/user/deleteAccount", { accountId }),
  roles: () => get<any[]>("/role/list"),
  availableRoles: () => get<any[]>("/role/selectUse"),
  tree: () => get<any[]>("/role/tree"),
  addRole: (v: any) => post("/role/add", v),
  setRole: (v: any) => put("/role/set", v),
  deleteRole: (roleId: number) => del("/role/delete", { roleId }),
  defaultRole: (roleId: number) => put("/role/setDefault", { roleId }),
  keys: (p: Params) => get<any>("/regKey/list", p),
  addKey: (v: any) => post("/regKey/add", v),
  deleteKeys: (regKeyIds: number[]) =>
    del("/regKey/delete", { regKeyIds: regKeyIds.join(",") }),
  clearKeys: () => del("/regKey/clearNotUse"),
  keyHistory: (regKeyId: number) => get<any>("/regKey/history", { regKeyId }),
  analysis: (timeZone: string) => get<any>("/analysis/echarts", { timeZone }),
};
