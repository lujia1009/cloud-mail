import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";
import { r2url } from "../../utils/mail";
import {
  Plus,
  RefreshCw,
  Trash2,
  Edit3,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";
import { admin } from "../../api/admin";
import { settings } from "../../api/settings";
import { useApp, hasPerm } from "../../stores/app";
import {
  Skeleton,
  Empty,
  ErrorState,
  IconButton,
} from "../../components/Feedback";
type Kind = "users" | "roles" | "keys" | "system";
const array = (v: any): any[] => (Array.isArray(v) ? v : []);
export function AdminPage({ kind }: { kind: Kind }) {
  return kind === "users" ? (
    <UsersPage />
  ) : kind === "roles" ? (
    <RolesPage />
  ) : kind === "keys" ? (
    <KeysPage />
  ) : (
    <SystemPage />
  );
}
function useAction(key: string) {
  const qc = useQueryClient();
  const notify = useApp((s) => s.notify);
  const { t } = useTranslation();
  return async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: [key] });
      if (key === "roles")
        await qc.invalidateQueries({ queryKey: ["roles-available"] });
      if (key === "system")
        await qc.invalidateQueries({ queryKey: ["config"] });
      notify(t("success"));
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e));
      return false;
    }
  };
}
function UsersPage() {
  const { t } = useTranslation();
  const user = useApp((s) => s.user);
  const config = useApp((s) => s.config);
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem("user-params") || "{}");
    } catch {
      return {};
    }
  })();
  const [page, setPage] = useState(Number(saved.num) || 1);
  const [size, setSize] = useState(Number(saved.size) || 15);
  const [timeSort, setTimeSort] = useState(Number(saved.timeSort) || 0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(
    Number.isFinite(saved.status) ? saved.status : -1,
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [countView, setCountView] = useState<Record<string, string>>({
    receive: "both",
    send: "both",
    account: "both",
  });
  const [details, setDetails] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [add, setAdd] = useState({ email: "", password: "", type: 0 });
  const [suffix, setSuffix] = useState("");
  const [edit, setEdit] = useState<any>(null);
  const [accountsFor, setAccountsFor] = useState<any>(null);
  const [accountPage, setAccountPage] = useState(1);
  useEffect(() => {
    localStorage.setItem(
      "user-params",
      JSON.stringify({ num: page, size, timeSort, status }),
    );
  }, [page, size, timeSort, status]);
  useEffect(() => {
    if (!suffix && config.domainList?.length) setSuffix(config.domainList[0]);
  }, [config.domainList, suffix]);
  const query = useQuery({
    queryKey: ["users", page, size, search, status, timeSort],
    queryFn: () =>
      admin.users({
        email: search,
        num: page,
        size,
        status: status >= 0 ? status : undefined,
        isDel: status === -2 ? 1 : undefined,
        timeSort,
      }),
  });
  const roles = useQuery({
    queryKey: ["roles-available"],
    queryFn: admin.availableRoles,
  });
  const accountQuery = useQuery({
    queryKey: ["userAccounts", accountsFor?.userId, accountPage],
    queryFn: () => admin.userAccounts(accountsFor.userId, accountPage, 10),
    enabled: !!accountsFor,
  });
  const run = useAction("users");
  const rows = array(query.data?.list);
  const count = (r: any, key: "receive" | "send" | "account") => {
    const fields =
      key === "receive"
        ? ["receiveEmailCount", "delReceiveEmailCount"]
        : key === "send"
          ? ["sendEmailCount", "delSendEmailCount"]
          : ["accountCount", "delAccountCount"];
    const view = countView[key];
    return (
      (view === "deleted" ? 0 : Number(r[fields[0]] || 0)) +
      (view === "active" ? 0 : Number(r[fields[1]] || 0))
    );
  };
  const countSelect = (key: "receive" | "send" | "account", label: string) => (
    <span className="table-count-heading">
      <span>{label}</span>
      <select
        aria-label={`${label} ${t("status")}`}
        value={countView[key]}
        onChange={(e) => setCountView({ ...countView, [key]: e.target.value })}
      >
        <option value="both">{t("all")}</option>
        <option value="active">{t("active")}</option>
        <option value="deleted">{t("deleted")}</option>
      </select>
    </span>
  );
  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>{t("allUsers")}</h1>
        {hasPerm(user, "user:add") && (
          <button
            className="primary-button"
            onClick={() => {
              setAdd({ email: "", password: "", type: 0 });
              setShowAdd(true);
            }}
          >
            <Plus size={17} />
            {t("create")}
          </button>
        )}
      </div>
      <div className="admin-filters">
        <input
          placeholder={t("search")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(Number(e.target.value));
            setPage(1);
          }}
        >
          <option value={-1}>{t("all")}</option>
          <option value={0}>{t("active")}</option>
          <option value={1}>{t("disabled")}</option>
          <option value={-2}>{t("deleted")}</option>
        </select>
        <button
          onClick={() => {
            setTimeSort((v) => (v ? 0 : 1));
            setPage(1);
          }}
        >
          {t("sort")}: {timeSort ? "↑" : "↓"}
        </button>
        <select
          value={size}
          aria-label={t("count")}
          onChange={(e) => {
            setSize(Number(e.target.value));
            setPage(1);
          }}
        >
          {[10, 15, 20, 25, 30, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        {hasPerm(user, "user:delete") && (
          <button
            disabled={!selected.length}
            className="danger-button"
            onClick={async () => {
              if (
                confirm(t("confirmDelete")) &&
                (await run(() => admin.deleteUsers(selected)))
              )
                setSelected([]);
            }}
          >
            <Trash2 size={16} />
            {t("delete")} ({selected.length})
          </button>
        )}
        <IconButton title={t("refresh")} onClick={() => query.refetch()}>
          <RefreshCw size={18} />
        </IconButton>
      </div>
      {query.isLoading ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table users-table">
            <colgroup>
              <col className="users-col-select" />
              <col className="users-col-email" />
              <col className="users-col-role" />
              <col className="users-col-status" />
              <col className="users-col-count" />
              <col className="users-col-count" />
              <col className="users-col-count" />
              <col className="users-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label={t("selectAll")}
                    checked={
                      rows.some((r: any) => r.type !== 0) &&
                      rows
                        .filter((r: any) => r.type !== 0)
                        .every((r: any) => selected.includes(r.userId))
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? rows
                              .filter((r: any) => r.type !== 0)
                              .map((r: any) => r.userId)
                          : [],
                      )
                    }
                  />
                </th>
                <th>{t("emailAccount")}</th>
                <th>{t("permissions")}</th>
                <th>{t("status")}</th>
                <th>{countSelect("receive", t("received"))}</th>
                <th>{countSelect("send", t("sent"))}</th>
                <th>{countSelect("account", t("mailbox"))}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.userId}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`${t("select")} ${r.email}`}
                      disabled={r.type === 0}
                      checked={selected.includes(r.userId)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, r.userId]
                            : selected.filter((id) => id !== r.userId),
                        )
                      }
                    />
                  </td>
                  <td>
                    <strong>{r.email}</strong>
                    <small>{r.createTime}</small>
                    {r.platform && <small>{r.platform}</small>}
                  </td>
                  <td>
                    {array(roles.data).find((v: any) => v.roleId === r.type)
                      ?.name || r.type}
                  </td>
                  <td>
                    {r.isDel
                      ? t("deleted")
                      : r.status === 0
                        ? t("active")
                        : t("disabled")}
                  </td>
                  <td>{count(r, "receive")}</td>
                  <td>{count(r, "send")}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => {
                        setAccountPage(1);
                        setAccountsFor(r);
                      }}
                    >
                      {count(r, "account")}
                    </button>
                  </td>
                  <td className="table-actions">
                    <button onClick={() => setDetails(r)}>
                      {t("details")}
                    </button>
                    {(r.type !== 0 || user?.type === 0) && (
                      <button onClick={() => setEdit(r)}>{t("edit")}</button>
                    )}
                    {r.type !== 0 && hasPerm(user, "user:delete") && (
                      <button
                        className="danger-button"
                        onClick={() => {
                          if (confirm(t("confirmDelete")))
                            run(() => admin.deleteUsers([r.userId]));
                        }}
                      >
                        {t("delete")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="table-pagination">
        <span>{query.data?.total || 0}</span>
        <IconButton
          title={t("previous")}
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={18} />
        </IconButton>
        <span>{page}</span>
        <IconButton
          title={t("next")}
          disabled={page * size >= Number(query.data?.total || 0)}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={18} />
        </IconButton>
      </div>
      {showAdd && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={async (e) => {
              e.preventDefault();
              const email = add.email + suffix;
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !add.type) {
                alert(t("notEmailMsg"));
                return;
              }
              if (await run(() => admin.addUser({ ...add, email })))
                setShowAdd(false);
            }}
          >
            <h2>{t("create")}</h2>
            <label>
              {t("emailAccount")}
              <input
                type="text"
                required
                value={add.email}
                onChange={(e) => setAdd({ ...add, email: e.target.value })}
              />
              <select
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
              >
                {array(config.domainList).map((d: string) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("password")}
              <input
                type="password"
                required
                minLength={6}
                value={add.password}
                onChange={(e) => setAdd({ ...add, password: e.target.value })}
              />
            </label>
            <label>
              {t("permissions")}
              <select
                value={add.type}
                onChange={(e) =>
                  setAdd({ ...add, type: Number(e.target.value) })
                }
              >
                <option value={0}>{t("select")}</option>
                {array(roles.data).map((r: any) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowAdd(false)}>
                {t("cancel")}
              </button>
              <button type="submit">{t("save")}</button>
            </div>
          </form>
        </div>
      )}
      {edit && (
        <div className="modal-backdrop">
          <div className="modal user-edit-modal">
            <h2>{edit.email}</h2>
            {edit.type !== 0 && hasPerm(user, "user:set-status") && (
              <div className="setting-row">
                <span>{t("status")}</span>
                <button
                  className="user-status-button"
                  onClick={async () => {
                    await run(() =>
                      admin.userStatus({
                        userId: edit.userId,
                        status: edit.status ? 0 : 1,
                      }),
                    );
                    setEdit(null);
                  }}
                >
                  {edit.status ? t("enableUser") : t("disableUser")}
                </button>
              </div>
            )}
            {hasPerm(user, "user:set-type") && (
              <div className="setting-row">
                <span>{t("permissions")}</span>
                <select
                  disabled={edit.type === 0}
                  value={edit.type}
                  onChange={async (e) => {
                    await run(() =>
                      admin.userType({
                        userId: edit.userId,
                        type: Number(e.target.value),
                      }),
                    );
                    setEdit(null);
                  }}
                >
                  {array(roles.data).map((r: any) => (
                    <option value={r.roleId} key={r.roleId}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="user-edit-actions">
              {hasPerm(user, "user:set-pwd") && (
                <button
                  onClick={() => {
                    const password = prompt(t("newPassword"));
                    if (password)
                      run(() =>
                        admin.userPassword({ userId: edit.userId, password }),
                      );
                  }}
                >
                  {t("changePassword")}
                </button>
              )}
              {hasPerm(user, "user:reset-send") && (
                <button
                  onClick={() => {
                    if (confirm(t("confirmDelete")))
                      run(() => admin.resetSend(edit.userId));
                  }}
                >
                  {t("resetSendCount")}
                </button>
              )}
              {!!edit.isDel && hasPerm(user, "user:set-status") && (
                <button
                  onClick={() => run(() => admin.restoreUser(edit.userId, 0))}
                >
                  {t("restore")}
                </button>
              )}
            </div>
            <div className="modal-actions">
              <button onClick={() => setEdit(null)}>{t("close")}</button>
            </div>
          </div>
        </div>
      )}
      {accountsFor && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{accountsFor.email}</h2>
            {accountQuery.isLoading ? (
              <Skeleton rows={3} />
            ) : accountQuery.isError ? (
              <ErrorState
                error={accountQuery.error}
                retry={() => accountQuery.refetch()}
              />
            ) : (
              array(accountQuery.data?.list || accountQuery.data).map(
                (a: any) => (
                  <div className="setting-row" key={a.accountId}>
                    {a.email}
                    <span>{a.isDel ? t("deleted") : t("active")}</span>
                    {hasPerm(user, "user:delete") && (
                      <button
                        className="danger-button"
                        onClick={() => {
                          if (confirm(t("confirmDelete")))
                            run(() => admin.deleteAccount(a.accountId)).then(
                              () => accountQuery.refetch(),
                            );
                        }}
                      >
                        {t("delete")}
                      </button>
                    )}
                  </div>
                ),
              )
            )}
            <div className="table-pagination">
              <span>{accountQuery.data?.total || 0}</span>
              <button
                disabled={accountPage <= 1}
                onClick={() => setAccountPage(accountPage - 1)}
              >
                {t("previous")}
              </button>
              <span>{accountPage}</span>
              <button
                disabled={
                  accountPage * 10 >= Number(accountQuery.data?.total || 0)
                }
                onClick={() => setAccountPage(accountPage + 1)}
              >
                {t("next")}
              </button>
            </div>
            <div className="modal-actions">
              <button onClick={() => setAccountsFor(null)}>{t("close")}</button>
            </div>
          </div>
        </div>
      )}
      {details && (
        <div className="modal-backdrop">
          <div className="modal wide">
            <h2>{details.email}</h2>
            <div className="form-grid">
              {[
                "username",
                "platform",
                "trustLevel",
                "createIp",
                "activeIp",
                "activeTime",
                "device",
                "os",
                "browser",
                "createTime",
                "sendCount",
                "sendEmailCount",
                "delSendEmailCount",
                "receiveEmailCount",
                "delReceiveEmailCount",
                "accountCount",
                "delAccountCount",
              ].map((key) => (
                <div className="setting-row" key={key}>
                  <strong>{t(key, { defaultValue: key })}</strong>
                  <span>{String(details[key] ?? "—")}</span>
                </div>
              ))}
            </div>
            {details.sendAction && (
              <div className="setting-row">
                <strong>{t("sendType")}</strong>
                <span>
                  {details.sendAction.hasPerm
                    ? `${details.sendAction.sendType} · ${details.sendAction.sendCount || t("unlimited")}`
                    : t("unauthorized")}
                </span>
              </div>
            )}
            {details.sendAction?.hasPerm &&
              details.sendAction?.sendCount > 0 &&
              hasPerm(user, "user:reset-send") && (
                <button
                  onClick={() => {
                    if (confirm(t("confirmDelete")))
                      run(() => admin.resetSend(details.userId));
                  }}
                >
                  {t("resetSendCount")}
                </button>
              )}
            <div className="modal-actions">
              <button onClick={() => setDetails(null)}>{t("close")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function RolesPage() {
  const { t } = useTranslation();
  const user = useApp((s) => s.user);
  const config = useApp((s) => s.config);
  const query = useQuery({ queryKey: ["roles"], queryFn: admin.roles });
  const tree = useQuery({ queryKey: ["perm-tree"], queryFn: admin.tree });
  const [editing, setEditing] = useState<any>(null);
  const run = useAction("roles");
  const blank = {
    name: "",
    description: "",
    sendType: "count",
    sendCount: 0,
    accountCount: 0,
    sort: 0,
    banEmail: [],
    availDomain: [],
    permIds: [],
  };
  const [form, setForm] = useState<any>(blank);
  const open = (role?: any) => {
    setEditing(role || {});
    setForm(role ? {
      ...role,
      availDomain: array(role.availDomain).map((domain: string) => domain.replace(/^@/, "")),
    } : blank);
  };
  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>{t("permissions")}</h1>
        {hasPerm(user, "role:add") && (
          <button className="primary-button" onClick={() => open()}>
            <Plus size={17} />
            {t("create")}
          </button>
        )}
      </div>
      {query.isLoading ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("description")}</th>
                <th>{t("accountCount")}</th>
                <th>{t("sendCount")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {array(query.data).map((r: any) => (
                <tr key={r.roleId}>
                  <td>
                    <strong>{r.name}</strong>
                  </td>
                  <td>{r.description}</td>
                  <td>{r.accountCount}</td>
                  <td>{r.sendCount}</td>
                  <td>{r.isDefault ? t("default") : ""}</td>
                  <td className="table-actions">
                    {hasPerm(user, "role:set") && (
                      <>
                        <button onClick={() => open(r)}>{t("edit")}</button>
                        <button
                          onClick={() => run(() => admin.defaultRole(r.roleId))}
                        >
                          {t("setDefault")}
                        </button>
                      </>
                    )}
                    {hasPerm(user, "role:delete") && (
                      <button
                        className="danger-button"
                        onClick={() => {
                          if (confirm(t("confirmDelete")))
                            run(() => admin.deleteRole(r.roleId));
                        }}
                      >
                        {t("delete")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <div className="modal-backdrop">
          <form
            className="modal wide role-modal"
            onSubmit={async (e) => {
              e.preventDefault();
              const selectedIds = new Set<number>(
                array(form.permIds).map(Number),
              );
              const permIds = [...selectedIds].filter(
                (id) =>
                  !array(tree.data).some((node: any) => node.permId === id),
              );
              array(tree.data).forEach((node: any) => {
                if (
                  array(node.children).some((child: any) =>
                    selectedIds.has(child.permId),
                  )
                )
                  permIds.push(node.permId);
              });
              const data = {
                ...form,
                banEmail: array(form.banEmail),
                // The Worker compares these values to email.split("@")[1].
                availDomain: array(form.availDomain).map((domain: string) => domain.replace(/^@/, "")),
                permIds,
              };
              if (
                await run(() =>
                  editing.roleId ? admin.setRole(data) : admin.addRole(data),
                )
              )
                setEditing(null);
            }}
          >
            <h2>{editing.roleId ? t("edit") : t("create")}</h2>
            <div className="form-grid">
              <label>
                {t("name")}
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                {t("description")}
                <input
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
              <label>
                {t("sendCount")}
                <input
                  type="number"
                  value={form.sendCount}
                  onChange={(e) =>
                    setForm({ ...form, sendCount: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                {t("accountCount")}
                <input
                  type="number"
                  value={form.accountCount}
                  onChange={(e) =>
                    setForm({ ...form, accountCount: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                {t("sendType")}
                <select
                  value={form.sendType}
                  onChange={(e) =>
                    setForm({ ...form, sendType: e.target.value })
                  }
                >
                  {["count", "day", "internal", "ban"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                {t("sort")}
                <input
                  type="number"
                  value={form.sort}
                  onChange={(e) =>
                    setForm({ ...form, sort: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                {t("availDomain")}
                <select
                  multiple
                  value={array(form.availDomain)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      availDomain: Array.from(
                        e.target.selectedOptions,
                        (option) => option.value,
                      ),
                    })
                  }
                >
                  {array(config.domainList).map((domain: string) => (
                    <option key={domain} value={domain.replace(/^@/, "")}>
                      {domain.replace(/^@/, "")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("banEmail")}
                <input
                  value={array(form.banEmail).join(",")}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      banEmail: e.target.value.split(",").filter(Boolean),
                    })
                  }
                />
              </label>
            </div>
            <h3>{t("permissions")}</h3>
            <div className="permission-tree">
              {array(tree.data).map((node: any) => (
                <div key={node.permId}>
                  <label>
                    <input
                      type="checkbox"
                      checked={
                        array(node.children).length > 0 &&
                        array(node.children).every((child: any) =>
                          array(form.permIds).includes(child.permId),
                        )
                      }
                      onChange={(e) => {
                        const ids = new Set<number>(
                          array(form.permIds).map(Number),
                        );
                        array(node.children).forEach((child: any) =>
                          e.target.checked
                            ? ids.add(child.permId)
                            : ids.delete(child.permId),
                        );
                        setForm({ ...form, permIds: [...ids] });
                      }}
                    />
                    <strong>{node.name}</strong>
                  </label>
                  <div>
                    {array(node.children).map((child: any) => (
                      <label key={child.permId}>
                        <input
                          type="checkbox"
                          checked={array(form.permIds).includes(child.permId)}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              permIds: e.target.checked
                                ? [...array(form.permIds), child.permId]
                                : array(form.permIds).filter(
                                    (id: number) => id !== child.permId,
                                  ),
                            })
                          }
                        />
                        {child.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setEditing(null)}>
                {t("cancel")}
              </button>
              <button type="submit">{t("save")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
function KeysPage() {
  const { t } = useTranslation();
  const user = useApp((s) => s.user);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    count: 1,
    roleId: 0,
    expireTime: "",
  });
  const [history, setHistory] = useState<any[] | null>(null);
  const query = useQuery({
    queryKey: ["keys", search],
    queryFn: () => admin.keys({ code: search }),
  });
  const roles = useQuery({
    queryKey: ["roles-available"],
    queryFn: admin.availableRoles,
  });
  const run = useAction("keys");
  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>{t("inviteCode")}</h1>
        {hasPerm(user, "reg-key:add") && (
          <button
            className="primary-button"
            onClick={() => {
              setForm({
                code: crypto.randomUUID().slice(0, 8),
                count: 1,
                roleId: 0,
                expireTime: "",
              });
              setAddOpen(true);
            }}
          >
            <Plus size={17} />
            {t("create")}
          </button>
        )}
      </div>
      <div className="admin-filters">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search")}
        />
        {hasPerm(user, "reg-key:delete") && (
          <button
            onClick={() => {
              if (confirm(t("confirmDelete"))) run(() => admin.clearKeys());
            }}
          >
            {t("clear")}
          </button>
        )}
      </div>
      {query.isLoading ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("inviteCode")}</th>
                <th>{t("permissions")}</th>
                <th>{t("count")}</th>
                <th>{t("expireTime")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {array(query.data).map((r: any) => (
                <tr key={r.regKeyId}>
                  <td>
                    <strong>{r.code}</strong>
                  </td>
                  <td>{r.roleName}</td>
                  <td>{r.count}</td>
                  <td>{r.expireTime || t("expired")}</td>
                  <td className="table-actions">
                    <button
                      onClick={() => navigator.clipboard.writeText(r.code)}
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={async () =>
                        setHistory(array(await admin.keyHistory(r.regKeyId)))
                      }
                    >
                      {t("history")}
                    </button>
                    {hasPerm(user, "reg-key:delete") && (
                      <button
                        className="danger-button"
                        onClick={() => {
                          if (confirm(t("confirmDelete")))
                            run(() => admin.deleteKeys([r.regKeyId]));
                        }}
                      >
                        {t("delete")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {addOpen && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await run(() =>
                  admin.addKey({
                    ...form,
                  }),
                )
              )
                setAddOpen(false);
            }}
          >
            <h2>{t("create")}</h2>
            <label>
              {t("inviteCode")}
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </label>
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, code: crypto.randomUUID().slice(0, 8) })
              }
            >
              {t("generate")}
            </button>
            <label>
              {t("count")}
              <input
                type="number"
                min={1}
                value={form.count}
                onChange={(e) =>
                  setForm({ ...form, count: Number(e.target.value) })
                }
              />
            </label>
            <label>
              {t("permissions")}
              <select
                value={form.roleId}
                onChange={(e) =>
                  setForm({ ...form, roleId: Number(e.target.value) })
                }
              >
                <option value={0}>{t("select")}</option>
                {array(roles.data).map((r: any) => (
                  <option value={r.roleId} key={r.roleId}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("expireTime")}
              <input
                type="date"
                required
                value={form.expireTime}
                onChange={(e) =>
                  setForm({ ...form, expireTime: e.target.value })
                }
              />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setAddOpen(false)}>
                {t("cancel")}
              </button>
              <button type="submit">{t("save")}</button>
            </div>
          </form>
        </div>
      )}
      {history && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{t("history")}</h2>
            {history.map((r: any) => (
              <div className="setting-row" key={r.userId}>
                {r.email}
                <small>{r.createTime}</small>
              </div>
            ))}
            <div className="modal-actions">
              <button onClick={() => setHistory(null)}>{t("close")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const groups: Record<string, string[]> = {
  General: [
    "title",
    "register",
    "receive",
    "send",
    "manyEmail",
    "addEmail",
    "autoRefresh",
    "noRecipient",
    "loginDomain",
    "loginOpacity",
  ],
  Registration: [
    "regKey",
    "registerVerify",
    "regVerifyCount",
    "addEmailVerify",
    "addVerifyCount",
    "minEmailPrefix",
    "emailPrefixFilter",
    "siteKey",
    "secretKey",
  ],
  Mail: [
    "r2Domain",
    "syncDelete",
    "aiCode",
    "aiCodeFilter",
    "autoCleanDays",
    "autoCleanExclude",
    "blackSubject",
    "blackContent",
    "blackFrom",
  ],
  Delivery: [
    "resendTokens",
    "forwardEmail",
    "forwardStatus",
    "ruleEmail",
    "ruleType",
    "tgBotStatus",
    "tgBotToken",
    "tgChatId",
    "tgMsgFrom",
    "tgMsgTo",
    "tgMsgText",
    "webhookUrl",
    "webhookStatus",
    "webhookRetry",
    "webhookSecret",
  ],
  Storage: [
    "bucket",
    "region",
    "endpoint",
    "s3AccessKey",
    "s3SecretKey",
    "forcePathStyle",
    "customDomain",
  ],
  OAuth: [
    "linuxdoClientId",
    "linuxdoClientSecret",
    "linuxdoSwitch",
    "githubClientId",
    "githubClientSecret",
    "githubSwitch",
    "googleClientId",
    "googleClientSecret",
    "googleSwitch",
  ],
  Notice: [
    "notice",
    "noticeTitle",
    "noticeContent",
    "noticeType",
    "noticeDuration",
    "noticePosition",
    "noticeOffset",
    "noticeWidth",
  ],
};
const secret = new Set([
  "siteKey",
  "secretKey",
  "tgBotToken",
  "webhookSecret",
  "s3AccessKey",
  "s3SecretKey",
  "linuxdoClientSecret",
  "githubClientSecret",
  "googleClientSecret",
]);
function SystemPage() {
  const { t } = useTranslation();
  const user = useApp((s) => s.user);
  const query = useQuery({ queryKey: ["system"], queryFn: settings.query });
  const [section, setSection] = useState("General");
  const [edit, setEdit] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [resendDomain, setResendDomain] = useState("");
  const [noticePreview, setNoticePreview] = useState<Record<
    string,
    any
  > | null>(null);
  const run = useAction("system");
  const data = query.data || {};
  const settingSummary = (key: string) => {
    const current = data[key];
    if (key === "notice" && current !== undefined)
      return Number(current) === 0 ? t("enabled") : t("disabled");
    if (key === "noticeContent")
      return DOMPurify.sanitize(String(current ?? ""), {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });
    if (key === "resendTokens")
      return Object.keys(data.resendTokens || {}).join(", ");
    if (secret.has(key) && current) return "••••••";
    if (Array.isArray(current)) return current.join(", ");
    if (typeof current === "object") return JSON.stringify(current);
    return String(current ?? "");
  };
  useEffect(() => {
    if (!noticePreview || !Number(noticePreview.noticeDuration)) return;
    const timer = window.setTimeout(
      () => setNoticePreview(null),
      Number(noticePreview.noticeDuration),
    );
    return () => window.clearTimeout(timer);
  }, [noticePreview]);
  const start = (key: string) => {
    setEdit(key);
    setValue(
      key === "resendTokens" || secret.has(key)
        ? ""
        : Array.isArray(data[key])
          ? data[key].join(",")
          : typeof data[key] === "object"
            ? JSON.stringify(data[key])
            : String(data[key] ?? ""),
    );
  };
  const save = async () => {
    if (!edit) return;
    if (
      edit === "background" &&
      value &&
      !/^https?:\/\//.test(value) &&
      !value.startsWith("data:image/")
    )
      return;
    if (secret.has(edit) && !value.trim()) {
      setEdit(null);
      return;
    }
    let parsed: any = value;
    if (typeof data[edit] === "number") parsed = Number(value);
    else if (Array.isArray(data[edit]))
      parsed = value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    else if (edit === "resendTokens") {
      if (!resendDomain || !value.trim()) {
        return;
      }
      parsed = { [resendDomain.replace(/^@/, "")]: value.trim() };
    }
    if (
      await run(() =>
        edit === "background"
          ? settings.background(String(parsed))
          : ["blackSubject", "blackContent", "blackFrom"].includes(edit)
            ? settings.blacklist({
                blackSubject:
                  edit === "blackSubject"
                    ? String(parsed)
                    : data.blackSubject || "",
                blackContent:
                  edit === "blackContent"
                    ? String(parsed)
                    : data.blackContent || "",
                blackFrom:
                  edit === "blackFrom" ? String(parsed) : data.blackFrom || "",
              })
            : settings.save({ [edit]: parsed }),
      )
    )
      setEdit(null);
  };
  return (
    <div className="settings-page admin-system">
      <div className="settings-header">
        <h1>{t("SystemSettings")}</h1>
        <nav>
          {Object.keys(groups).map((g) => (
            <button
              className={section === g ? "active" : ""}
              onClick={() => setSection(g)}
              key={g}
            >
              {t(g, { defaultValue: g })}
            </button>
          ))}
        </nav>
      </div>
      {query.isLoading ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : (
        <div className="settings-content">
          <section>
            <div className="system-section-heading">
              <h2>{t(section, { defaultValue: section })}</h2>
              {section === "Notice" && (
                <button onClick={() => setNoticePreview({ ...data, notice: 0 })}>
                  {t("preview")}
                </button>
              )}
            </div>
            {section === "Delivery" && data.hasCfEmail && (
              <div className="setting-row">
                <strong>{t("cloudflareEmailSending")}</strong>
                <span>{t("enabled")}</span>
              </div>
            )}
            {section === "Storage" && (
              <div className="setting-row">
                <strong>{t("storageType")}</strong>
                <span>{String(data.storageType || "—")}</span>
              </div>
            )}
            {section === "Storage" && hasPerm(user, "setting:set") && (
              <button
                onClick={() => {
                  if (confirm(t("confirmDelete")))
                    run(() =>
                      settings.save({
                        bucket: "",
                        endpoint: "",
                        region: "",
                        s3AccessKey: "",
                        s3SecretKey: "",
                        forcePathStyle: 1,
                      }),
                    );
                }}
              >
                {t("clear")}
              </button>
            )}
            {groups[section].map((key) =>
              key === "resendTokens" && data.hasCfEmail ? null : (
                <div className="setting-row" key={key}>
                  <div>
                    <strong>{t(key, { defaultValue: key })}</strong>
                    <small>{settingSummary(key)}</small>
                  </div>
                  {hasPerm(user, "setting:set") && (
                    <button
                      onClick={() => {
                        if (key === "resendTokens")
                          setResendDomain((data.domainList || [])[0] || "");
                        start(key);
                      }}
                    >
                      <Edit3 size={15} />
                      {t("edit")}
                    </button>
                  )}
                  {secret.has(key) &&
                    data[key] &&
                    hasPerm(user, "setting:set") && (
                      <button
                        onClick={() => {
                          if (confirm(t("confirmDelete")))
                            run(() => settings.save({ [key]: "" }));
                        }}
                      >
                        {t("clear")}
                      </button>
                    )}
                  {key === "resendTokens" &&
                    hasPerm(user, "setting:set") &&
                    Object.keys(data.resendTokens || {}).map((domain) => (
                      <button
                        key={domain}
                        onClick={() => {
                          if (confirm(t("confirmDelete")))
                            run(() =>
                              settings.save({ resendTokens: { [domain]: "" } }),
                            );
                        }}
                      >
                        {t("delete")} {domain}
                      </button>
                    ))}
                </div>
              ),
            )}
          </section>
          <section>
            <h2>{t("background")}</h2>
            <div className="setting-row">
              {data.background ? (
                <img
                  alt={t("background")}
                  src={r2url(data.background, data)}
                  style={{ maxWidth: 220, maxHeight: 120, objectFit: "cover" }}
                />
              ) : (
                <span>—</span>
              )}
              {hasPerm(user, "setting:set") && (
                <>
                  <button onClick={() => start("background")}>
                    {t("edit")}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(t("delBackgroundConfirm")))
                        run(() => settings.deleteBackground());
                    }}
                  >
                    {t("delete")}
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}
      {edit && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <h2>{t(edit, { defaultValue: edit })}</h2>
            {edit === "background" && (
              <label>
                Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setValue(String(reader.result));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            )}
            {edit === "resendTokens" && (
              <label>
                {t("selectDomain")}
                <select
                  value={resendDomain}
                  onChange={(e) => setResendDomain(e.target.value)}
                >
                  {(data.domainList || []).map((domain: string) => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {typeof data[edit] === "number" ? (
              <input
                type="number"
                step={edit === "loginOpacity" ? "any" : "1"}
                min={edit === "loginOpacity" ? 0 : undefined}
                max={edit === "loginOpacity" ? 1 : undefined}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            ) : (
              <textarea
                rows={3}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  secret.has(edit) || edit === "resendTokens"
                    ? t("newValue")
                    : ""
                }
              />
            )}
            <div className="modal-actions">
              {edit.startsWith("notice") && (
                <button
                  type="button"
                  onClick={() =>
                    setNoticePreview({
                      ...data,
                      notice: 0,
                      [edit]:
                        typeof data[edit] === "number" ? Number(value) : value,
                    })
                  }
                >
                  {t("preview")}
                </button>
              )}
              <button type="button" onClick={() => setEdit(null)}>
                {t("cancel")}
              </button>
              <button type="submit">{t("save")}</button>
            </div>
          </form>
        </div>
      )}
      {noticePreview && (
        <div
          className={`site-notice ${noticePreview.noticeType || ""}`}
          style={{
            width: Math.min(
              Number(noticePreview.noticeWidth ?? 400),
              window.innerWidth - 30,
            ),
            ...(String(noticePreview.noticePosition || "top-right").includes(
              "bottom",
            )
              ? { bottom: Number(noticePreview.noticeOffset ?? 0) }
              : { top: Number(noticePreview.noticeOffset ?? 0) }),
            ...(String(noticePreview.noticePosition || "top-right").includes(
              "left",
            )
              ? { left: 16, right: "auto" }
              : { right: 16, left: "auto" }),
          }}
        >
          <button
            className="notice-close"
            onClick={() => setNoticePreview(null)}
            aria-label={t("close")}
          >
            ×
          </button>
          <strong>{noticePreview.noticeTitle}</strong>
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(noticePreview.noticeContent || ""),
            }}
          />
        </div>
      )}
    </div>
  );
}
