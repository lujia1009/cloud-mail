import { del, get, post, postUpload, put } from "./client";
import type { Account, MailPage, Mail } from "../types";
export const accounts = {
  list: (accountId = 0, size = 30, lastSort?: number) =>
    get<Account[]>("/account/list", { accountId, size, lastSort }),
  all: async () => {
    const result: Account[] = [];
    let cursor = 0;
    let lastSort: number | undefined;
    while (true) {
      const batch = await accounts.list(cursor, 30, lastSort);
      result.push(...batch);
      if (batch.length < 30) return result;
      cursor = batch[batch.length - 1].accountId;
      lastSort = batch[batch.length - 1].sort;
    }
  },
  add: (email: string, token = "") =>
    post<Account>("/account/add", { email, token }),
  rename: (accountId: number, name: string) =>
    put("/account/setName", { accountId, name }),
  allReceive: (accountId: number) =>
    put("/account/setAllReceive", { accountId }),
  top: (accountId: number) => put("/account/setAsTop", { accountId }),
  remove: (accountId: number) => del("/account/delete", { accountId }),
};
export const mail = {
  list: (
    accountId: number,
    allReceive: number,
    type: number,
    emailId = 0,
    size = 50,
    full = 0,
    timeSort = 0,
  ) =>
    get<MailPage>("/email/list", {
      accountId,
      allReceive,
      type,
      emailId,
      size,
      full,
      timeSort,
    }),
  stars: (emailId = 0, size = 50, full = 0) =>
    get<{ list: Mail[] }>("/star/list", { emailId, size, full }),
  latest: (emailId: number, accountId: number, allReceive: number) =>
    get<Mail[]>("/email/latest", { emailId, accountId, allReceive }),
  globalLatest: (emailId: number) =>
    get<Mail[]>("/allEmail/latest", { emailId }),
  global: (params: Record<string, string | number | undefined>) =>
    get<MailPage>("/allEmail/list", params),
  read: (emailIds: number[]) => put("/email/read", { emailIds }),
  remove: (emailIds: number[], global = false) =>
    del(global ? "/allEmail/delete" : "/email/delete", {
      emailIds: emailIds.join(","),
    }),
  star: (emailId: number) => post("/star/add", { emailId }),
  unstar: (emailId: number) => del("/star/cancel", { emailId }),
  send: (
    body: Record<string, unknown>,
    onProgress?: (percent: number) => void,
  ) =>
    onProgress
      ? postUpload<Mail[]>("/email/send", body, onProgress)
      : post<Mail[]>("/email/send", body),
  batchDelete: (params: Record<string, string | number | undefined>) =>
    del("/allEmail/batchDelete", params),
};
