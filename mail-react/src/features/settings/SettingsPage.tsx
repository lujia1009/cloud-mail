import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Controls";
import { auth } from "../../api/auth";
import { accounts } from "../../api/mail";
import { useApp, hasPerm } from "../../stores/app";
import { setLanguage } from "../../i18n";
import { Skeleton, ErrorState } from "../../components/Feedback";
export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useApp((s) => s.user);
  const config = useApp((s) => s.config);
  const canManageAccounts =
    config.manyEmail === 0 && hasPerm(user, "account:query");
  const account = useApp((s) => s.account);
  const setAccount = useApp((s) => s.setAccount);
  const setUser = useApp((s) => s.setUser);
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  const notify = useApp((s) => s.notify);
  const [name, setName] = useState(user?.account.name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tab, setTab] = useState("general");
  useEffect(() => {
    if (!canManageAccounts && tab === "accounts") setTab("general");
  }, [canManageAccounts, tab]);
  const query = useQuery({
    queryKey: ["accounts"],
    queryFn: accounts.all,
    enabled: !!user && canManageAccounts,
  });
  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      notify(t("success"));
      qc.invalidateQueries();
      return true;
    } catch (e) {
      notify(String(e));
      return false;
    }
  };
  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>{t("settings")}</h1>
        <nav>
          <button
            className={tab === "general" ? "active" : ""}
            onClick={() => setTab("general")}
          >
            {t("profile")}
          </button>
          {canManageAccounts && (
            <button
              className={tab === "accounts" ? "active" : ""}
              onClick={() => setTab("accounts")}
            >
              {t("mailbox")}
            </button>
          )}
          <button
            className={tab === "appearance" ? "active" : ""}
            onClick={() => setTab("appearance")}
          >
            {t("appearance")}
          </button>
        </nav>
      </div>
      {tab === "general" && (
        <div className="settings-content">
          <section>
            <h2>{t("profile")}</h2>
            <div className="setting-row">
              <div>
                <strong>{t("emailAccount")}</strong>
                <small>{user?.email}</small>
              </div>
            </div>
            <div className="setting-row">
              <div>
                <strong>{t("username")}</strong>
                <small>{t("changeUserName")}</small>
              </div>
              <div className="setting-action">
                <input value={name} onChange={(e) => setName(e.target.value)} />
                <Button
                  disabled={!name.trim()}
                  onClick={async () => {
                    if (!user) return;
                    const ok = await run(() =>
                      accounts.rename(user.account.accountId, name.trim()),
                    );
                    if (ok) {
                      setUser({
                        ...user,
                        name: name.trim(),
                        account: { ...user.account, name: name.trim() },
                      });
                      if (account?.accountId === user.account.accountId)
                        setAccount({ ...account, name: name.trim() });
                    }
                  }}
                >
                  {t("save")}
                </Button>
              </div>
            </div>
            <div className="setting-row">
              <div>
                <strong>{t("password")}</strong>
                <small>{t("changePassword")}</small>
              </div>
              <div className="setting-action">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("newPassword")}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("confirmPassword")}
                />
                <Button
                  disabled={password.length < 6}
                  onClick={() => {
                    if (password !== confirmPassword) {
                      notify(t("confirmPwdFailMsg"));
                      return;
                    }
                    void run(async () => {
                      await auth.password(password);
                      setPassword("");
                      setConfirmPassword("");
                    });
                  }}
                >
                  {t("save")}
                </Button>
              </div>
            </div>
          </section>
          <section>
            <h2>{t("language")}</h2>
            <div className="setting-row">
              <div>{t("language")}</div>
              <select
                value={i18n.language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="zh">简体中文</option>
                <option value="en">English</option>
              </select>
            </div>
          </section>
          {hasPerm(user, "my:delete") && (
            <section>
              <h2>{t("deleteUser")}</h2>
              <div className="setting-row">
                <div>
                  <strong>{t("deleteUser")}</strong>
                  <small>{t("delAccountMsg")}</small>
                </div>
                <button
                  className="danger-button"
                  onClick={() => {
                    if (confirm(t("delAccountConfirm")))
                      run(async () => {
                        await auth.deleteSelf();
                        localStorage.removeItem("token");
                        navigate("/login");
                      });
                  }}
                >
                  {t("deleteUserBtn")}
                </button>
              </div>
            </section>
          )}
        </div>
      )}
      {tab === "accounts" && canManageAccounts && (
        <div className="settings-content">
          <section>
            <h2>{t("mailbox")}</h2>
            {query.isLoading ? (
              <Skeleton rows={3} />
            ) : query.isError ? (
              <ErrorState error={query.error} retry={() => query.refetch()} />
            ) : (
              query.data?.map((a) => (
                <div className="setting-row" key={a.accountId}>
                  <div>
                    <strong>{a.email}</strong>
                    <small>{a.name}</small>
                  </div>
                  <div className="setting-action">
                    <button
                      onClick={() => {
                        setAccount(a);
                        navigate("/inbox");
                      }}
                    >
                      {t("select")}
                    </button>
                    {hasPerm(user, "email:send") && (
                      <button
                        onClick={async () => {
                          const nextName = prompt(t("changeUserName"), a.name);
                          if (!nextName || nextName === a.name) return;
                          const ok = await run(() =>
                            accounts.rename(a.accountId, nextName),
                          );
                          if (ok && account?.accountId === a.accountId)
                            setAccount({ ...account, name: nextName });
                        }}
                      >
                        {t("rename")}
                      </button>
                    )}
                    {a.accountId !== user?.account.accountId && (
                      <button
                        onClick={() => run(() => accounts.top(a.accountId))}
                      >
                        {t("setTop")}
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const ok = await run(() =>
                          accounts.allReceive(a.accountId),
                        );
                        if (ok && account?.accountId === a.accountId)
                          setAccount({
                            ...account,
                            allReceive: account.allReceive ? 0 : 1,
                          });
                      }}
                    >
                      {t("allReceive")}: {a.allReceive === 1 ? "✓" : "—"}
                    </button>
                    {a.accountId !== user?.account.accountId &&
                      hasPerm(user, "account:delete") && (
                        <button
                          className="danger-button"
                          onClick={async () => {
                            if (!confirm(t("confirmDelete"))) return;
                            const ok = await run(() =>
                              accounts.remove(a.accountId),
                            );
                            if (ok && account?.accountId === a.accountId)
                              setAccount(user?.account || null);
                          }}
                        >
                          {t("delete")}
                        </button>
                      )}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      )}
      {tab === "appearance" && (
        <div className="settings-content">
          <section>
            <h2>{t("appearance")}</h2>
            <div className="setting-row">
              <div>{t("appearance")}</div>
              <div className="theme-options">
                {(["light", "dark", "system"] as const).map((v) => (
                  <button
                    key={v}
                    className={theme === v ? "selected" : ""}
                    onClick={() => setTheme(v)}
                  >
                    {t(v)}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
