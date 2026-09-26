import { useEffect, useMemo, useRef, useState } from "react";
import {
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trash2,
  MailOpen,
  Star,
  Paperclip,
  Reply,
  Forward,
  Download,
  Search,
  Filter,
  MoreVertical,
} from "lucide-react";
import DOMPurify from "dompurify";
import { mail } from "../../api/mail";
import { ApiError } from "../../api/client";
import { useApp, hasPerm } from "../../stores/app";
import {
  Skeleton,
  Empty,
  ErrorState,
  IconButton,
} from "../../components/Feedback";
import { Button } from "../../components/Controls";
import { dateLabel, recipients, subject, r2url, bytes } from "../../utils/mail";
import type { Mail } from "../../types";
type Kind = "inbox" | "sent" | "starred" | "all" | "detail";
type Context = {
  kind: Exclude<Kind, "detail">;
  cursor: number;
  email?: Mail;
  adminType?: string;
  adminField?: string;
  search?: string;
  sort?: number;
};
export function MailPage({ kind }: { kind: Kind }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const loc = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const user = useApp((s) => s.user);
  const account = useApp((s) => s.account);
  const config = useApp((s) => s.config);
  const notify = useApp((s) => s.notify);
  const openCompose = useApp((s) => s.openCompose);
  const [cursorStack, setCursorStack] = useState<number[]>([0]);
  const [selected, setSelected] = useState<number[]>([]);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [adminType, setAdminType] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("all-email-params") || "{}").type ||
        "receive"
      );
    } catch {
      return "receive";
    }
  });
  const [adminField, setAdminField] = useState(() => {
    try {
      const value = JSON.parse(
        localStorage.getItem("all-email-params") || "{}",
      ).searchType;
      return value === "user"
        ? "userEmail"
        : value === "account"
          ? "accountEmail"
          : value || "name";
    } catch {
      return "name";
    }
  });
  const [sort, setSort] = useState(() => {
    try {
      return (
        Number(
          JSON.parse(localStorage.getItem("all-email-params") || "{}").timeSort,
        ) || 0
      );
    } catch {
      return 0;
    }
  });
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchParams, setBatchParams] = useState({
    sendName: "",
    subject: "",
    sendEmail: "",
    toEmail: "",
    startTime: "",
    endTime: "",
    type: "eq",
  });
  const ctx = (loc.state || {}) as Context;
  useEffect(() => {
    if (kind === "all")
      localStorage.setItem(
        "all-email-params",
        JSON.stringify({
          type: adminType,
          searchType:
            adminField === "userEmail"
              ? "user"
              : adminField === "accountEmail"
                ? "account"
                : adminField,
          timeSort: sort,
        }),
      );
  }, [kind, adminType, adminField, sort]);
  const listKind = (kind === "detail" ? ctx.kind || "inbox" : kind) as Exclude<
    Kind,
    "detail"
  >;
  const cursor = cursorStack[cursorStack.length - 1];
  const accountId = account?.accountId || user?.account.accountId || 0;
  const allReceive = account?.allReceive || 0;
  useEffect(() => {
    setCursorStack([0]);
    setSelected([]);
    setActionMenuId(null);
  }, [
    kind,
    accountId,
    allReceive,
    sort,
    adminType,
    adminField,
    searchParams.get("q"),
  ]);
  const listQuery = useQuery({
    queryKey: [
      "mail",
      listKind,
      accountId,
      allReceive,
      cursor,
      sort,
      adminType,
      adminField,
      searchParams.get("q"),
    ],
    queryFn: () =>
      listKind === "starred"
        ? mail
            .stars(cursor, 50, 0)
            .then((v) => ({ list: v.list, total: 0, latestEmail: undefined }))
        : listKind === "all"
          ? mail.global({
              emailId: cursor,
              size: 50,
              full: 0,
              timeSort: sort,
              type: adminType,
              ...(searchParams.get("q")
                ? { [adminField]: searchParams.get("q")! }
                : {}),
            })
          : mail.list(
              accountId,
              allReceive,
              listKind === "sent" ? 1 : 0,
              cursor,
              50,
              0,
              sort,
            ),
    enabled: kind !== "detail" && !!accountId,
    placeholderData: (prev) => prev,
  });
  const fullQuery = useQuery({
    queryKey: [
      "mail-full",
      listKind,
      accountId,
      allReceive,
      cursor,
      sort,
      adminType,
      adminField,
      searchParams.get("q"),
    ],
    queryFn: () =>
      listKind === "starred"
        ? mail
            .stars(cursor, 50, 1)
            .then((v) => ({ list: v.list, total: 0, latestEmail: undefined }))
        : listKind === "all"
          ? mail.global({
              emailId: cursor,
              size: 50,
              full: 1,
              timeSort: sort,
              type: adminType,
              ...(searchParams.get("q")
                ? { [adminField]: searchParams.get("q")! }
                : {}),
            })
          : mail.list(
              accountId,
              allReceive,
              listKind === "sent" ? 1 : 0,
              cursor,
              50,
              1,
              sort,
            ),
    enabled: !!listQuery.data && kind !== "detail" && !!accountId,
    staleTime: 30000,
  });
  const items = (listQuery.data?.list || []).map(
    (m) => fullQuery.data?.list.find((f) => f.emailId === m.emailId) || m,
  );
  useEffect(() => {
    const interval = Number(config.autoRefresh);
    const latestId = listQuery.data?.latestEmail?.emailId;
    if (
      kind === "detail" ||
      !Number.isFinite(interval) ||
      interval < 2 ||
      latestId === undefined ||
      !["inbox", "all"].includes(listKind) ||
      (listKind === "all" && adminType !== "receive")
    )
      return;
    let active = true;
    let timer: number;
    const poll = async () => {
      try {
        const found =
          listKind === "all"
            ? await mail.globalLatest(latestId)
            : await mail.latest(latestId, accountId, allReceive);
        if (active && found.length) {
          await qc.invalidateQueries({
            queryKey: ["mail", listKind, accountId],
          });
          await qc.invalidateQueries({
            queryKey: ["mail-full", listKind, accountId],
          });
        }
      } catch (error) {
        if (error instanceof ApiError && [401, 403].includes(error.code)) {
          active = false;
        }
      }
      if (active) timer = window.setTimeout(poll, interval * 1000);
    };
    timer = window.setTimeout(poll, interval * 1000);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    kind,
    listKind,
    listQuery.data?.latestEmail?.emailId,
    accountId,
    allReceive,
    adminType,
    config.autoRefresh,
    qc,
  ]);
  const search = searchParams.get("q")?.toLowerCase() || "";
  const filtered = useMemo(
    () =>
      listKind === "all" || !search
        ? items
        : items.filter((m) =>
            [m.name, m.sendEmail, m.subject, m.listText, m.toEmail].some((v) =>
              v?.toLowerCase().includes(search),
            ),
          ),
    [items, search, listKind],
  );
  const changeStar = async (e: Mail) => {
    qc.setQueryData(
      [
        "mail",
        listKind,
        accountId,
        allReceive,
        cursor,
        sort,
        adminType,
        adminField,
        searchParams.get("q"),
      ],
      (old: any) =>
        old
          ? {
              ...old,
              list: old.list.map((m: Mail) =>
                m.emailId === e.emailId
                  ? { ...m, isStar: m.isStar ? 0 : 1 }
                  : m,
              ),
            }
          : old,
    );
    try {
      await (e.isStar ? mail.unstar(e.emailId) : mail.star(e.emailId));
      qc.invalidateQueries({ queryKey: ["mail"] });
    } catch (err) {
      qc.invalidateQueries({ queryKey: ["mail"] });
      notify(String(err));
    }
  };
  const remove = async (ids: number[]) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await mail.remove(ids, listKind === "all");
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["mail"] });
      notify(t("success"));
    } catch (e) {
      notify(String(e));
    }
  };
  const markRead = async (ids: number[]) => {
    try {
      await mail.read(ids);
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["mail"] });
    } catch (e) {
      notify(String(e));
    }
  };
  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      notify(t("copySuccessMsg"));
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    }
  };
  const composeFromList = async (mode: "reply" | "forward", row: Mail) => {
    try {
      const full = fullQuery.data?.list.find((item) => item.emailId === row.emailId)
        || (await fullQuery.refetch()).data?.list.find((item) => item.emailId === row.emailId);
      if (!full) throw new Error("Message not found");
      openCompose(mode, full);
      setActionMenuId(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    }
  };
  const searchFromMail = (field: string, value?: string) => {
    if (!value) return;
    setAdminField(field);
    setActionMenuId(null);
    navigate(`/all-mail?q=${encodeURIComponent(value)}`);
  };
  const deliveryStatus = (status: number) =>
    t(
      ({
        0: "received",
        1: "sent",
        2: "delivered",
        3: "bounced",
        4: "complained",
        5: "delayed",
        7: "noRecipient",
        8: "bounced",
      } as Record<number, string>)[status] || "status",
    );
  const next = () => {
    if (!items.length) return;
    setCursorStack((s) => [...s, items[items.length - 1].emailId]);
    setSelected([]);
  };
  if (kind === "detail")
    return (
      <Detail id={Number(params.id)} ctx={ctx} back={() => navigate(-1)} />
    );
  return (
    <div className="mail-view">
      <div className="list-toolbar">
        <label className="check-wrap">
          <input
            type="checkbox"
            aria-label={t("selectAll")}
            checked={filtered.length > 0 && selected.length === filtered.length}
            onChange={(e) =>
              setSelected(
                e.target.checked ? filtered.map((v) => v.emailId) : [],
              )
            }
          />
        </label>
        <IconButton title={t("refresh")} onClick={() => listQuery.refetch()}>
          <RefreshCw size={18} />
        </IconButton>
        <IconButton title={t("sort")} onClick={() => setSort(sort ? 0 : 1)}>
          <Filter size={18} />
        </IconButton>
        {selected.length > 0 && (
          <>
            {listKind === "inbox" && (
              <IconButton title={t("read")} onClick={() => markRead(selected)}>
                <MailOpen size={18} />
              </IconButton>
            )}
            {hasPerm(
              user,
              listKind === "all" ? "all-email:delete" : "email:delete",
            ) && (
              <IconButton title={t("delete")} onClick={() => remove(selected)}>
                <Trash2 size={18} />
              </IconButton>
            )}
          </>
        )}
        {listKind === "all" && (
          <>
            <select
              className="toolbar-select"
              value={adminType}
              onChange={(e) => setAdminType(e.target.value)}
            >
              <option value="all">{t("all")}</option>
              <option value="receive">{t("received")}</option>
              <option value="send">{t("sent")}</option>
              <option value="delete">{t("deleted")}</option>
              <option value="noone">{t("noRecipientTitle")}</option>
            </select>
            <select
              className="toolbar-select"
              value={adminField}
              onChange={(e) => setAdminField(e.target.value)}
            >
              <option value="subject">{t("subject")}</option>
              <option value="name">{t("sender")}</option>
              <option value="userEmail">{t("user")}</option>
              <option value="accountEmail">{t("emailAccount")}</option>
            </select>
            {hasPerm(user, "all-email:delete") && (
              <Button
                className="toolbar-batch"
                onClick={() => setBatchOpen(true)}
              >
                {t("clearEmail")}
              </Button>
            )}
          </>
        )}
        {batchOpen && (
          <div className="modal-backdrop">
            <form
              className="modal"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  !batchParams.sendEmail &&
                  !batchParams.sendName &&
                  !batchParams.subject &&
                  !batchParams.toEmail &&
                  !batchParams.startTime &&
                  !batchParams.endTime
                ) {
                  setBatchOpen(false);
                  return;
                }
                if (!confirm(t("confirmDelete"))) return;
                try {
                  const utc = (value: string, nextDay = false) => {
                    if (!value) return "";
                    const date = new Date(`${value}T00:00:00`);
                    if (nextDay) date.setDate(date.getDate() + 1);
                    return date.toISOString().replace("T", " ").slice(0, 19);
                  };
                  await mail.batchDelete({
                    ...batchParams,
                    startTime: utc(batchParams.startTime),
                    endTime: utc(batchParams.endTime, true),
                  });
                  setBatchOpen(false);
                  qc.invalidateQueries({ queryKey: ["mail"] });
                  notify(t("success"));
                } catch (err) {
                  notify(String(err));
                }
              }}
            >
              <h2>{t("clearEmail")}</h2>
              {(
                [
                  "sendName",
                  "subject",
                  "sendEmail",
                  "toEmail",
                  "startTime",
                  "endTime",
                ] as const
              ).map((field) => (
                <label key={field}>
                  {t(field, { defaultValue: field })}
                  <input
                    type={field.endsWith("Time") ? "date" : "text"}
                    value={batchParams[field]}
                    onChange={(e) =>
                      setBatchParams({
                        ...batchParams,
                        [field]: e.target.value,
                      })
                    }
                  />
                </label>
              ))}
              <label>
                {t("type")}
                <select
                  value={batchParams.type}
                  onChange={(e) =>
                    setBatchParams({ ...batchParams, type: e.target.value })
                  }
                >
                  <option value="eq">{t("equal")}</option>
                  <option value="left">{t("leading")}</option>
                  <option value="include">{t("include")}</option>
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setBatchOpen(false)}>
                  {t("cancel")}
                </button>
                <button type="submit">{t("clear")}</button>
              </div>
            </form>
          </div>
        )}
        <span className="toolbar-spacer" />
        <span className="range-label">
          {items.length
            ? `${(cursorStack.length - 1) * 50 + 1}–${(cursorStack.length - 1) * 50 + items.length}`
            : "0"}
          {listQuery.data?.total ? ` / ${listQuery.data.total}` : ""}
        </span>
        <IconButton
          title={t("previous")}
          disabled={cursorStack.length === 1}
          onClick={() => setCursorStack((s) => s.slice(0, -1))}
        >
          <ChevronLeft size={18} />
        </IconButton>
        <IconButton
          title={t("next")}
          disabled={items.length < 50}
          onClick={next}
        >
          <ChevronRight size={18} />
        </IconButton>
      </div>
      {listQuery.isLoading ? (
        <Skeleton rows={11} />
      ) : listQuery.isError ? (
        <ErrorState error={listQuery.error} retry={() => listQuery.refetch()} />
      ) : filtered.length === 0 ? (
        <Empty text={search ? t("noResults") : undefined} />
      ) : (
        <div className="mail-list">
          {filtered.map((m) => (
            <div
              className={`mail-row ${m.unread === 0 ? "unread" : "read"} ${listKind === "all" ? "admin-mail-row" : ""} ${actionMenuId === m.emailId ? "menu-open" : ""}`}
              key={m.emailId}
              role="link"
              tabIndex={0}
              onContextMenu={(e) => {
                e.preventDefault();
                setActionMenuId(m.emailId);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  navigate(`/mail/${m.emailId}`, {
                    state: {
                      kind: listKind,
                      cursor,
                      email: m,
                      adminType,
                      adminField,
                      search: searchParams.get("q") || "",
                      sort,
                    },
                  });
              }}
              onClick={() =>
                navigate(`/mail/${m.emailId}`, {
                  state: {
                    kind: listKind,
                    cursor,
                    email: m,
                    adminType,
                    adminField,
                    search: searchParams.get("q") || "",
                    sort,
                  },
                })
              }
            >
              <input
                type="checkbox"
                checked={selected.includes(m.emailId)}
                aria-label={`${t("select")} ${subject(m)}`}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  setSelected((s) =>
                    e.target.checked
                      ? [...s, m.emailId]
                      : s.filter((id) => id !== m.emailId),
                  )
                }
              />
              {listKind !== "all" ? (
                <button
                  className={`row-star ${m.isStar ? "is-star" : ""}`}
                  title={t("starred")}
                  onClick={(e) => {
                    e.stopPropagation();
                    changeStar(m);
                  }}
                >
                  <Star size={18} fill={m.isStar ? "currentColor" : "none"} />
                </button>
              ) : (
                <span className="row-star" />
              )}
              <span className="row-sender">
                {m.name || m.sendEmail || m.toEmail}
              </span>
              <span className="row-subject">
                {m.code && (
                  <button
                    className="mail-code"
                    title={t("copyCode")}
                    onClick={(e) => {
                      e.stopPropagation();
                      copyCode(m.code!);
                    }}
                  >
                    [{t("codeLabel")}{m.code}]
                  </button>
                )}
                {subject(m)}
                <span className="row-snippet">
                  {" "}
                  — {m.listText || m.text || ""}
                </span>
                {listKind === "all" && (
                  <span className="admin-mail-meta">
                    <span>{t("user")}: {m.userEmail || "—"}</span>
                    <span>{t("emailAccount")}: {m.type === 0 ? m.toEmail : m.sendEmail}</span>
                    <span>{deliveryStatus(m.status)}{m.isDel ? ` · ${t("selectDeleted")}` : ""}</span>
                  </span>
                )}
              </span>
              {m.attList?.length ? (
                <Paperclip size={15} className="row-attachment" />
              ) : (
                <span className="row-attachment" />
              )}
              <time>{dateLabel(m.createTime, i18n.language)}</time>
              <span
                className={`row-actions ${actionMenuId === m.emailId ? "menu-open" : ""}`}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <IconButton
                  title={t("more")}
                  onClick={() => setActionMenuId(actionMenuId === m.emailId ? null : m.emailId)}
                >
                  <MoreVertical size={17} />
                </IconButton>
                {actionMenuId === m.emailId && (
                  <div className="row-action-menu" role="menu">
                    {m.code && <button type="button" onClick={() => { void copyCode(m.code!); setActionMenuId(null); }}>{t("copyCode")}</button>}
                    {listKind === "inbox" && <button type="button" onClick={() => { void markRead([m.emailId]); setActionMenuId(null); }}>{t("read")}</button>}
                    {(listKind === "inbox" || listKind === "starred") && <button type="button" onClick={() => { void composeFromList("reply", m); }}>{t("reply")}</button>}
                    {listKind !== "all" && <>
                      <button type="button" onClick={() => { void composeFromList("forward", m); }}>{t("forward")}</button>
                      <button type="button" onClick={() => { void changeStar(m); setActionMenuId(null); }}>{t("star")}</button>
                    </>}
                    {listKind === "all" && <>
                      <button type="button" onClick={() => searchFromMail("userEmail", m.userEmail)}>{t("searchUser")}</button>
                      <button type="button" onClick={() => searchFromMail("accountEmail", m.toEmail)}>{t("searchEmail")}</button>
                      <button type="button" onClick={() => searchFromMail("name", m.name)}>{t("searchSender")}</button>
                    </>}
                    {hasPerm(user, listKind === "all" ? "all-email:delete" : "email:delete") &&
                      <button type="button" onClick={() => { void remove([m.emailId]); setActionMenuId(null); }}>{t("delete")}</button>}
                  </div>
                )}
                {hasPerm(
                  user,
                  listKind === "all" ? "all-email:delete" : "email:delete",
                ) && (
                  <IconButton
                    title={t("delete")}
                    onClick={() => remove([m.emailId])}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                )}
                {listKind === "inbox" && m.unread === 0 && (
                  <IconButton
                    title={t("read")}
                    onClick={() => markRead([m.emailId])}
                  >
                    <MailOpen size={17} />
                  </IconButton>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function Detail({
  id,
  ctx,
  back,
}: {
  id: number;
  ctx: Context;
  back: () => void;
}) {
  const { t, i18n } = useTranslation();
  const account = useApp((s) => s.account);
  const user = useApp((s) => s.user);
  const config = useApp((s) => s.config);
  const notify = useApp((s) => s.notify);
  const compose = useApp((s) => s.openCompose);
  const qc = useQueryClient();
  const [expand, setExpand] = useState(false);
  const [preview, setPreview] = useState("");
  const frameObserver = useRef<ResizeObserver | null>(null);
  useEffect(() => () => frameObserver.current?.disconnect(), []);
  const fitMessageFrame = (frame: HTMLIFrameElement) => {
    frameObserver.current?.disconnect();
    const document = frame.contentDocument;
    if (!document?.body) return;
    frame.style.height = "120px";
    const resize = () => {
      const style = document.defaultView?.getComputedStyle(document.body);
      const margins =
        (Number.parseFloat(style?.marginTop || "0") || 0) +
        (Number.parseFloat(style?.marginBottom || "0") || 0);
      const height = Math.max(120, Math.ceil(document.body.scrollHeight + margins));
      if (frame.style.height !== `${height}px`) {
        frame.style.height = `${height}px`;
      }
    };
    resize();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(resize);
      observer.observe(document.body);
      frameObserver.current = observer;
    }
  };
  const kind = ctx.kind || "inbox";
  const accountId = account?.accountId || user?.account.accountId || 0;
  const detailKey = [
    "detail",
    kind,
    accountId,
    id,
    ctx.cursor,
    ctx.adminType,
    ctx.adminField,
    ctx.search,
    ctx.sort,
  ];
  const query = useQuery({
    queryKey: detailKey,
    queryFn: async () => {
      let cursor = ctx.cursor || 0;
      for (let page = 0; page < 25; page++) {
        const result =
          kind === "starred"
            ? await mail.stars(cursor, 50, 1)
            : kind === "all"
              ? await mail.global({
                  emailId: cursor,
                  size: 50,
                  full: 1,
                  type: ctx.adminType || "receive",
                  timeSort: ctx.sort || 0,
                  ...(ctx.search
                    ? { [ctx.adminField || "name"]: ctx.search }
                    : {}),
                })
              : await mail.list(
                  accountId,
                  account?.allReceive || 0,
                  kind === "sent" ? 1 : 0,
                  cursor,
                  50,
                  1,
                  ctx.sort || 0,
                );
        const found = result.list.find((m) => m.emailId === id);
        if (found) return found;
        if (result.list.length < 50) break;
        cursor = result.list[result.list.length - 1].emailId;
      }
      throw new Error("Message not found");
    },
    enabled: !!id && !!accountId,
    initialData: ctx.email?.content || ctx.email?.text ? ctx.email : undefined,
  });
  const m = query.data;
  useEffect(() => {
    if (m?.emailId && m.unread === 0 && kind === "inbox") {
      mail
        .read([m.emailId])
        .then(() => {
          qc.invalidateQueries({ queryKey: ["mail"] });
          qc.setQueryData(detailKey, {
            ...m,
            unread: 1,
          });
        })
        .catch(() => {});
    }
  }, [m?.emailId]);
  const remove = async () => {
    if (!m || !confirm(t("confirmDelete"))) return;
    try {
      await mail.remove([m.emailId], kind === "all");
      qc.invalidateQueries({ queryKey: ["mail"] });
      back();
    } catch (e) {
      notify(String(e));
    }
  };
  const star = async () => {
    if (!m) return;
    try {
      await (m.isStar ? mail.unstar(m.emailId) : mail.star(m.emailId));
      qc.setQueryData(detailKey, {
        ...m,
        isStar: m.isStar ? 0 : 1,
      });
      qc.invalidateQueries({ queryKey: ["mail"] });
    } catch (e) {
      notify(String(e));
    }
  };
  const html = m?.content?.replaceAll(
    "{{domain}}",
    config.r2Domain
      ? `${/^https?:\/\//.test(config.r2Domain) ? config.r2Domain : "https://" + config.r2Domain}`.replace(
          /\/$/,
          "",
        ) + "/"
      : "",
  );
  return (
    <div className="detail-view">
      <div className="detail-toolbar">
        <IconButton title={t("back")} onClick={back}>
          <ArrowLeft size={20} />
        </IconButton>
        {m && (
          <>
            {kind !== "all" && (
              <IconButton title={t("starred")} onClick={star}>
                <Star size={19} fill={m.isStar ? "currentColor" : "none"} />
              </IconButton>
            )}
            {hasPerm(
              user,
              kind === "all" ? "all-email:delete" : "email:delete",
            ) && (
              <IconButton title={t("delete")} onClick={remove}>
                <Trash2 size={19} />
              </IconButton>
            )}
          </>
        )}
      </div>
      <div className="detail-scroll">
        {query.isLoading ? (
          <Skeleton rows={5} />
        ) : query.isError ? (
          <ErrorState error={query.error} retry={() => query.refetch()} />
        ) : (
          m && (
            <article className="message">
              <h1>{subject(m)}</h1>
              <div className="message-meta">
                <div className="sender-avatar">
                  {(m.name || m.sendEmail || "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="message-address">
                  <strong>{m.name || m.sendEmail}</strong>
                  <span>{m.sendEmail}</span>
                  <button
                    className="details-toggle"
                    onClick={() => setExpand(!expand)}
                  >
                    {t("to")}: {recipients(m.recipient) || m.toEmail}{" "}
                    <MoreVertical size={13} />
                  </button>
                  {expand && (
                    <div className="message-details">
                      <div>
                        {t("from")}: {m.sendEmail}
                      </div>
                      <div>
                        {t("to")}: {recipients(m.recipient) || m.toEmail}
                      </div>
                      <div>
                        {t("date")}: {m.createTime}
                      </div>
                    </div>
                  )}
                </div>
                <time>{dateLabel(m.createTime, i18n.language)}</time>
              </div>
              {m.status >= 3 && (
                <div className="status-banner">
                  {m.status === 4
                    ? t("complained")
                    : m.status === 5
                      ? t("delayed")
                      : (() => {
                          try {
                            return (
                              JSON.parse(m.message || "{}").message || m.message
                            );
                          } catch {
                            return m.message;
                          }
                        })()}
                </div>
              )}
              <div className="message-body">
                {html ? (
                  <iframe
                    title={t("mailDetail")}
                    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    onLoad={(event) => fitMessageFrame(event.currentTarget)}
                    srcDoc={`<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>body{font-family:Arial,sans-serif;margin:16px;color:#24272a;overflow-wrap:anywhere}img{max-width:100%;height:auto}pre{white-space:pre-wrap}</style></head><body>${DOMPurify.sanitize(html, { FORBID_TAGS: ["script", "form", "iframe", "object", "embed"] })}</body></html>`}
                  />
                ) : (
                  <pre>{m.text}</pre>
                )}
              </div>
              {!!m.attList?.length && (
                <section className="attachments">
                  <h3>
                    {t("attachments")} ({m.attList.length})
                  </h3>
                  <div className="attachment-list">
                    {m.attList.map((a) => (
                      <div className="attachment" key={a.attId || a.key}>
                        <span>
                          <Paperclip size={18} />
                          {a.filename}
                          <small>{bytes(a.size)}</small>
                        </span>
                        <div>
                          {a.filename.match(
                            /\.(png|jpg|jpeg|bmp|gif|jfif|webp)$/i,
                          ) && (
                            <IconButton
                              title={t("preview")}
                              onClick={() =>
                                setPreview(r2url(a.key || "", config))
                              }
                            >
                              <Search size={17} />
                            </IconButton>
                          )}
                          <a
                            href={r2url(a.key || "", config)}
                            download={a.filename}
                            target="_blank"
                            rel="noreferrer"
                            title={t("download")}
                          >
                            <Download size={17} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </article>
          )
        )}
      </div>
      {m &&
        !query.isLoading &&
        !query.isError &&
        kind !== "all" &&
        hasPerm(user, "email:send") && (
          <div className="detail-reply">
            <div className="detail-reply-inner">
              <Button onClick={() => compose("reply", m)}>
                <Reply size={17} />
                {t("reply")}
              </Button>
              <Button onClick={() => compose("forward", m)}>
                <Forward size={17} />
                {t("forward")}
              </Button>
            </div>
          </div>
        )}
      {preview && (
        <div className="modal-backdrop" onClick={() => setPreview("")}>
          <img
            className="image-preview"
            src={preview}
            alt={t("attachmentPreview")}
          />
        </div>
      )}
    </div>
  );
}
