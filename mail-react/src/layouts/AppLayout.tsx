import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  Mail,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Sun,
  Moon,
  Settings,
  UserRound,
  PenLine,
  Inbox,
  Star,
  Send,
  FileText,
  ChartPie,
  Users,
  LockKeyhole,
  KeyRound,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Plus,
  LogOut,
  Archive,
  Bell,
  X,
} from "lucide-react";
import DOMPurify from "dompurify";
import { auth } from "../api/auth";
import { ApiError } from "../api/client";
import { accounts } from "../api/mail";
import { useApp, hasPerm } from "../stores/app";
import { IconButton } from "../components/Feedback";
import { Button } from "../components/Controls";
import { Compose } from "../features/compose/Compose";
const links = [
  ["/inbox", "inbox", Inbox],
  ["/starred", "starred", Star],
  ["/sent", "sent", Send, "email:send"],
  ["/drafts", "drafts", FileText, "email:send"],
] as const;
const adminLinks = [
  ["/analysis", "analytics", ChartPie, "analysis:query"],
  ["/all-users", "allUsers", Users, "user:query"],
  ["/all-mail", "allMail", Archive, "all-email:query"],
  ["/role", "permissions", LockKeyhole, "role:query"],
  ["/invite-code", "inviteCode", KeyRound, "reg-key:query"],
  ["/system-settings", "SystemSettings", Settings, "setting:query"],
] as const;
export function AppLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loc = useLocation();
  const qc = useQueryClient();
  const user = useApp((s) => s.user);
  const config = useApp((s) => s.config);
  const account = useApp((s) => s.account);
  const setAccount = useApp((s) => s.setAccount);
  const collapsed = useApp((s) => s.sidebarCollapsed);
  const toggle = useApp((s) => s.toggleSidebar);
  const mobileNav = useApp((s) => s.mobileNav);
  const setMobileNav = useApp((s) => s.setMobileNav);
  const open = useApp((s) => s.openCompose);
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  const notify = useApp((s) => s.notify);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(false);
  const [menu, setMenu] = useState(false);
  const [mailboxMenu, setMailboxMenu] = useState(false);
  const [addMailbox, setAddMailbox] = useState(false);
  const [renameMailbox, setRenameMailbox] = useState(false);
  const [mailboxNewName, setMailboxNewName] = useState("");
  const [mailboxName, setMailboxName] = useState("");
  const [mailboxSuffix, setMailboxSuffix] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [forcedMailboxVerify, setForcedMailboxVerify] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const domains: string[] = config.domainList || [];
  const canAddMailbox =
    config.manyEmail === 0 &&
    config.addEmail === 0 &&
    hasPerm(user, "account:add");
  const canSwitchMailbox =
    config.manyEmail === 0 && hasPerm(user, "account:query");
  const fullMailboxEmail = mailboxName + (mailboxSuffix || domains[0] || "");
  const verifyRequired =
    config.addEmailVerify === 0 ||
    (config.addEmailVerify === 2 && config.addVerifyOpen) ||
    forcedMailboxVerify;
  useEffect(() => {
    if (
      config.manyEmail === 1 &&
      user?.account &&
      account?.accountId !== user.account.accountId
    )
      setAccount(user.account);
  }, [
    config.manyEmail,
    user?.account.accountId,
    account?.accountId,
    setAccount,
  ]);
  useEffect(() => {
    if (domains.length && !domains.includes(mailboxSuffix))
      setMailboxSuffix(domains[0]);
  }, [domains.join(",")]);
  useEffect(() => {
    if (
      config.notice === undefined ||
      !sessionStorage.getItem("showLoginNotice")
    )
      return;
    sessionStorage.removeItem("showLoginNotice");
    if (config.notice === 0) setNoticeOpen(true);
  }, [config.notice]);
  useEffect(() => {
    if (!noticeOpen || !Number(config.noticeDuration)) return;
    const timer = window.setTimeout(
      () => setNoticeOpen(false),
      Number(config.noticeDuration),
    );
    return () => window.clearTimeout(timer);
  }, [noticeOpen, config.noticeDuration]);
  useEffect(() => {
    if (!addMailbox || !verifyRequired || !config.siteKey) return;
    let id: string | undefined;
    const render = () => {
      if (window.turnstile)
        id = window.turnstile.render("#mailbox-turnstile", {
          sitekey: config.siteKey,
          callback: (value: string) => setVerifyToken(value),
        });
    };
    if (window.turnstile) render();
    else {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = render;
      document.head.appendChild(script);
    }
    return () => {
      if (id) window.turnstile?.reset(id);
    };
  }, [addMailbox, verifyRequired, config.siteKey]);
  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: accounts.all,
    enabled: !!user && hasPerm(user, "account:query"),
  });
  const refresh = () => qc.invalidateQueries();
  const updateMailbox = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await qc.invalidateQueries({ queryKey: ["accounts"] });
      await qc.invalidateQueries({ queryKey: ["mail"] });
      notify(t("success"));
      setMailboxMenu(false);
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
      return false;
    }
  };
  const logout = async () => {
    try {
      await auth.logout();
    } catch {
      /* local sign-out still proceeds */
    }
    localStorage.removeItem("token");
    qc.clear();
    navigate("/login");
  };
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(
      `${loc.pathname === "/all-mail" ? "/all-mail" : "/inbox"}?q=${encodeURIComponent(search)}`,
    );
  };
  const nav = (items: typeof links | typeof adminLinks) =>
    (
      items as readonly (readonly [
        string,
        string,
        React.ElementType,
        string?,
      ])[]
    )
      .filter(([, , , perm]) => !perm || hasPerm(user, perm))
      .map(([path, label, Icon]) => (
        <NavLink
          key={path}
          to={path}
          title={t(label)}
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={() => setMobileNav(false)}
        >
          <Icon size={19} strokeWidth={1.9} />
          <span>{t(label)}</span>
        </NavLink>
      ));
  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
      <header className="topbar">
        <div className="brand-area">
          <IconButton
            title={t("more")}
            onClick={() =>
              window.innerWidth < 800 ? setMobileNav(!mobileNav) : toggle()
            }
          >
            <Menu size={22} />
          </IconButton>
          <Link className="brand" to="/inbox">
            <span className="brand-mark">
              <Mail size={25} />
            </span>
            <span>{config.title ?? "Virevan Mail"}</span>
          </Link>
        </div>
        <form className="search-box" onSubmit={submitSearch}>
          <Search size={21} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchMail")}
            aria-label={t("searchMail")}
          />
          {search && (
            <IconButton
              title={t("close")}
              onClick={() => {
                setSearch("");
                navigate(loc.pathname);
              }}
            >
              <X size={17} />
            </IconButton>
          )}
          <IconButton
            title={t("searchOptions")}
            onClick={() => setFilters(!filters)}
          >
            <SlidersHorizontal size={20} />
          </IconButton>
          {filters && (
            <div className="search-popover">
              <p>{t("searchPersonalHint")}</p>
              <Button type="submit">{t("searchMail")}</Button>
            </div>
          )}
        </form>
        <div className="top-actions">
          <IconButton title={t("refresh")} onClick={refresh}>
            <RefreshCw size={20} />
          </IconButton>
          {config.notice === 0 && (
            <IconButton
              title={t("noticeTitle")}
              onClick={() => setNoticeOpen(true)}
            >
              <Bell size={20} />
            </IconButton>
          )}
          <IconButton
            title={t("appearance")}
            onClick={() =>
              setTheme(
                theme === "system"
                  ? "light"
                  : theme === "light"
                    ? "dark"
                    : "system",
              )
            }
          >
            {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
          </IconButton>
          <IconButton
            title={t("settings")}
            onClick={() => navigate("/settings")}
          >
            <Settings size={20} />
          </IconButton>
          <div className="user-menu-wrap">
            <button
              className="avatar"
              onClick={() => setMenu(!menu)}
              title={user?.email}
            >
              {user?.name?.slice(0, 1).toUpperCase() || "V"}
            </button>
            {menu && (
              <div className="popover account-popover">
                <strong>{user?.name}</strong>
                <small>{user?.email}</small>
                <small>{user?.role?.name}</small>
                <small>
                  {t("sendCount")}:{" "}
                  {config.send === 1
                    ? t("disabled")
                    : user?.role?.sendCount
                      ? `${user?.sendCount}/${user.role.sendCount}`
                      : t("unlimited")}
                </small>
                <small>
                  {t("accountCount")}:{" "}
                  {config.manyEmail === 1 || config.addEmail === 1
                    ? t("disabled")
                    : user?.role?.accountCount || t("unlimited")}
                </small>
                <button
                  onClick={() => {
                    setMenu(false);
                    navigate("/settings");
                  }}
                >
                  <UserRound size={16} />
                  {t("settings")}
                </button>
                <button onClick={logout}>
                  <LogOut size={16} />
                  {t("logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        {hasPerm(user, "email:send") && (
          <button
            className="compose-trigger"
            onClick={() => {
              open();
              setMobileNav(false);
            }}
            title={t("compose")}
          >
            <PenLine size={20} />
            <span>{t("compose")}</span>
          </button>
        )}
        <nav>
          {nav(links)}
          <NavLink
            to="/settings"
            title={t("settings")}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            onClick={() => setMobileNav(false)}
          >
            <Settings size={19} />
            <span>{t("settings")}</span>
          </NavLink>
          {adminLinks.some(([, , , perm]) => hasPerm(user, perm)) && (
            <div className="nav-heading">{t("admin")}</div>
          )}
          {nav(adminLinks)}
        </nav>
        <div className="sidebar-bottom">
          <button
            onClick={toggle}
            className="nav-item collapse-control"
            title={collapsed ? t("expand") : t("collapse")}
          >
            {collapsed ? (
              <PanelLeftOpen size={19} />
            ) : (
              <PanelLeftClose size={19} />
            )}
            <span>{collapsed ? t("expand") : t("collapse")}</span>
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="mobile-backdrop"
          onClick={() => setMobileNav(false)}
          aria-label={t("close")}
        />
      )}
      <main className="main-area">
        <div className="mailbox-bar">
          <div className="mailbox-wrap">
            {canSwitchMailbox ? (
              <button
                className="mailbox-select"
                onClick={() => setMailboxMenu(!mailboxMenu)}
              >
                <span className="mailbox-avatar">
                  {account?.email?.slice(0, 1).toUpperCase() || "@"}
                </span>
                <span className="mailbox-text">
                  <strong>{account?.name || t("mailbox")}</strong>
                  <small>{account?.email}</small>
                </span>
                <ChevronDown size={17} />
              </button>
            ) : (
              <div className="mailbox-select" aria-label={t("mailbox")}>
                <span className="mailbox-avatar">
                  {account?.email?.slice(0, 1).toUpperCase() || "@"}
                </span>
                <span className="mailbox-text">
                  <strong>{account?.name || t("mailbox")}</strong>
                  <small>{account?.email}</small>
                </span>
              </div>
            )}
            {canSwitchMailbox && mailboxMenu && (
              <div className="popover mailbox-popover">
                <strong>{t("mailbox")}</strong>
                {(accountsQuery.data || [user?.account])
                  .filter(Boolean)
                  .map((item: any) => (
                    <button
                      key={item.accountId}
                      onClick={() => {
                        setAccount(item);
                        setMailboxMenu(false);
                        navigate("/inbox");
                      }}
                    >
                      <Mail size={16} />
                      {item.email}
                    </button>
                  ))}
                {account && (
                  <div className="mailbox-menu-actions">
                    <small>{account.email}</small>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(account.email);
                        setMailboxMenu(false);
                        notify(t("success"));
                      }}
                    >
                      {t("copyAddress")}
                    </button>
                    {hasPerm(user, "email:send") && (
                      <button
                        onClick={() => {
                          setMailboxNewName(account.name || "");
                          setRenameMailbox(true);
                          setMailboxMenu(false);
                        }}
                      >
                        {t("rename")}
                      </button>
                    )}
                    <button
                      onClick={() =>
                        updateMailbox(() =>
                          accounts.allReceive(account.accountId),
                        ).then((ok) => {
                          if (ok)
                            setAccount({
                              ...account,
                              allReceive: account.allReceive ? 0 : 1,
                            });
                        })
                      }
                    >
                      {account.allReceive
                        ? t("disableAllReceive")
                        : t("allReceive")}
                    </button>
                    {account.accountId !== user?.account.accountId && (
                      <button
                        onClick={() =>
                          updateMailbox(() => accounts.top(account.accountId))
                        }
                      >
                        {t("setTop")}
                      </button>
                    )}
                    {account.accountId !== user?.account.accountId &&
                      hasPerm(user, "account:delete") && (
                        <button
                          onClick={async () => {
                            if (!confirm(t("confirmDelete"))) return;
                            const ok = await updateMailbox(() =>
                              accounts.remove(account.accountId),
                            );
                            if (ok) {
                              setAccount(user?.account || null);
                              navigate("/inbox");
                            }
                          }}
                        >
                          {t("delete")}
                        </button>
                      )}
                  </div>
                )}
                {canAddMailbox && (
                  <button
                    onClick={() => {
                      setMailboxMenu(false);
                      setAddMailbox(true);
                    }}
                  >
                    <Plus size={16} />
                    {t("addMailbox")}
                  </button>
                )}
              </div>
            )}
          </div>
          <span className="mailbox-spacer" />
          <span className="mailbox-status">
            {account?.allReceive === 1 ? t("allReceive") : account?.email}
          </span>
        </div>
        <Outlet />
      </main>
      <Compose />
      {noticeOpen && config.notice === 0 && (
        <div
          className={`site-notice ${config.noticeType || ""}`}
          style={{
            width: Math.min(
              Number(config.noticeWidth ?? 400),
              window.innerWidth - 30,
            ),
            ...(String(config.noticePosition || "top-right").includes("bottom")
              ? { bottom: Number(config.noticeOffset ?? 0) }
              : { top: Number(config.noticeOffset ?? 0) }),
            ...(String(config.noticePosition || "top-right").includes("left")
              ? { left: 16 }
              : { right: 16 }),
          }}
        >
          <button
            className="notice-close"
            onClick={() => setNoticeOpen(false)}
            aria-label={t("close")}
          >
            <X size={17} />
          </button>
          <strong>{config.noticeTitle}</strong>
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(config.noticeContent || ""),
            }}
          />
        </div>
      )}
      {renameMailbox && account && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await updateMailbox(() =>
                accounts.rename(account.accountId, mailboxNewName.trim()),
              );
              if (ok) {
                setAccount({ ...account, name: mailboxNewName.trim() });
                setRenameMailbox(false);
              }
            }}
          >
            <h2>{t("rename")}</h2>
            <input
              required
              value={mailboxNewName}
              onChange={(e) => setMailboxNewName(e.target.value)}
            />
            <div className="modal-actions">
              <button type="button" onClick={() => setRenameMailbox(false)}>
                {t("cancel")}
              </button>
              <button type="submit">{t("save")}</button>
            </div>
          </form>
        </div>
      )}
      {addMailbox && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (verifyRequired && !verifyToken) {
                  notify(t("botVerifyMsg"));
                  return;
                }
                if (
                  fullMailboxEmail.split("@")[0].length <
                  Number(config.minEmailPrefix || 0)
                ) {
                  notify(t("minEmailPrefix", { msg: config.minEmailPrefix }));
                  return;
                }
                if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fullMailboxEmail)) {
                  notify(t("notEmailMsg"));
                  return;
                }
                await accounts.add(fullMailboxEmail, verifyToken);
                await qc.invalidateQueries({ queryKey: ["accounts"] });
                await qc.invalidateQueries({ queryKey: ["me"] });
                await qc.invalidateQueries({ queryKey: ["config"] });
                setAddMailbox(false);
                setMailboxName("");
                setVerifyToken("");
                setForcedMailboxVerify(false);
                notify(t("success"));
              } catch (e) {
                if (e instanceof ApiError && e.code === 400) {
                  setVerifyToken("");
                  setForcedMailboxVerify(true);
                }
                notify(String(e));
              }
            }}
          >
            <h2>{t("addMailbox")}</h2>
            <span className="address-input">
              <input
                required
                value={mailboxName}
                onChange={(e) => setMailboxName(e.target.value)}
                placeholder="name"
              />
              {domains.length > 0 && (
                <select
                  aria-label={t("selectDomain")}
                  value={mailboxSuffix || domains[0]}
                  onChange={(e) => setMailboxSuffix(e.target.value)}
                >
                  {domains.map((domain) => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}
                </select>
              )}
            </span>
            {verifyRequired && <div id="mailbox-turnstile" />}
            <div className="modal-actions">
              <button type="button" onClick={() => setAddMailbox(false)}>
                {t("cancel")}
              </button>
              <button type="submit">{t("add")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
