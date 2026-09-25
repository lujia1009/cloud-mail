import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Maximize2, Minus, X, Paperclip, Trash2, Send, Eraser } from "lucide-react";
import { useApp } from "../../stores/app";
import { mail } from "../../api/mail";
import { draftDb, type Draft } from "./drafts";
import { RichEditor, type RichEditorHandle } from "./RichEditor";
import { IconButton } from "../../components/Feedback";
import { bytes, mailHtml } from "../../utils/mail";
import type { Attachment } from "../../types";
const readBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
const splitAddresses = (input: string) => [
  ...new Set(
    input
      .split(/[;,，\s]+/)
      .map((v) => v.trim())
      .filter(Boolean),
  ),
];
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
export function Compose() {
  const { t } = useTranslation();
  const open = useApp((s) => s.composeOpen);
  const mode = useApp((s) => s.composeMode);
  const source = useApp((s) => s.composeMail);
  const account = useApp((s) => s.account);
  const user = useApp((s) => s.user);
  const config = useApp((s) => s.config);
  const close = useApp((s) => s.closeCompose);
  const notify = useApp((s) => s.notify);
  const qc = useQueryClient();
  const [recipient, setRecipient] = useState("");
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("writer") || "{}")
          .sendRecipientRecord || []
      );
    } catch {
      return [];
    }
  });
  const [contactsOpen, setContactsOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [draftId, setDraftId] = useState<number | undefined>();
  const [draftMeta, setDraftMeta] = useState<Pick<
    Draft,
    "accountId" | "sendEmail" | "name" | "sendType" | "emailId"
  > | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [confirmClose, setConfirmClose] = useState(false);
  const initialMessage = useRef({ recipient: "", subject: "", html: "" });
  const editor = useRef<RichEditorHandle>(null);
  const pendingDraft = useRef<(Draft & { attachments?: Attachment[] }) | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    if (pendingDraft.current) {
      const d = pendingDraft.current;
      pendingDraft.current = null;
      setDraftId(d.draftId);
      setDraftMeta({
        accountId: d.accountId,
        sendEmail: d.sendEmail,
        name: d.name,
        sendType: d.sendType,
        emailId: d.emailId,
      });
      setRecipient(d.receiveEmail.join(", "));
      setSubject(d.subject);
      setHtml(d.content);
      setAttachments(d.attachments || []);
      setTimeout(() => {
        if (editor.current) editor.current.innerHTML = d.content;
      }, 0);
      initialMessage.current = { recipient: d.receiveEmail.join(", "), subject: d.subject, html: d.content };
      return;
    }
    setDraftId(undefined);
    setDraftMeta(null);
    const initialRecipient = mode === "reply" && source ? source.sendEmail : "";
    const sourceSubject = source?.subject || "";
    const initialSubject = source
      ? mode === "reply" && !/^(Re:|Re：|回复：|回复:)/.test(sourceSubject)
        ? `Re: ${sourceSubject}`
        : sourceSubject
      : "";
    setRecipient(initialRecipient);
    setSubject(initialSubject);
    setAttachments([]);
    const quoted = source?.content
      ? mailHtml(source.content, config)
      : `<pre style="white-space:pre-wrap">${escapeHtml(source?.text || "")}</pre>`;
    const initial =
      source && mode === "forward"
        ? `<br><br><blockquote>${quoted}</blockquote>`
        : source && mode === "reply"
          ? `<br><br><div>${escapeHtml(source.createTime)} ${escapeHtml(source.name || "")} &lt;${escapeHtml(source.sendEmail)}&gt; ${t("wrote")}:</div><blockquote>${quoted}</blockquote>`
          : "";
    setHtml(initial);
    initialMessage.current = { recipient: initialRecipient, subject: initialSubject, html: initial };
    if (editor.current) editor.current.innerHTML = initial;
    setMinimized(false);
  }, [open, mode, source?.emailId]);
  useEffect(() => {
    if (!user) return;
    const handle = (e: Event) => {
      pendingDraft.current = (
        e as CustomEvent<Draft & { attachments?: Attachment[] }>
      ).detail;
    };
    window.addEventListener("open-draft", handle);
    return () => window.removeEventListener("open-draft", handle);
  }, [user]);
  const save = async () => {
    if (!user) return;
    const body = editor.current?.getContent() || html;
    if (!recipient && !subject && !body.trim()) {
      if (draftId) {
        const db = draftDb(user.email);
        await db.draft.delete(draftId);
        await db.att.delete(draftId);
        qc.invalidateQueries({ queryKey: ["drafts", user.email] });
      }
      close();
      return;
    }
    const db = draftDb(user.email);
    const draft: Draft = {
      createTime: new Date().toISOString().replace("T", " ").slice(0, 19),
      sendEmail: draftMeta?.sendEmail || account?.email || user.email,
      accountId:
        draftMeta?.accountId || account?.accountId || user.account.accountId,
      name: draftMeta?.name || account?.name || user.name,
      receiveEmail: splitAddresses(recipient),
      subject,
      content: body,
      text: editor.current?.getText() || "",
      sendType: draftMeta?.sendType || (mode === "new" ? "" : mode),
      emailId: draftMeta?.emailId || source?.emailId || 0,
    };
    const id = draftId || (await db.draft.add(draft));
    if (draftId) await db.draft.put({ ...draft, draftId });
    await db.att.put({ draftId: id, attachments });
    qc.invalidateQueries({ queryKey: ["drafts", user.email] });
    notify(t("saveDraft"));
    close();
  };
  const discard = async () => {
    if (user && draftId) {
      await draftDb(user.email).draft.delete(draftId);
      await draftDb(user.email).att.delete(draftId);
      qc.invalidateQueries({ queryKey: ["drafts", user.email] });
    }
    close();
  };
  const clearContent = () => {
    if (!confirm(t("clearContentConfirm"))) return;
    setRecipient("");
    setSubject("");
    setHtml("");
    setAttachments([]);
    setDraftId(undefined);
    setDraftMeta(null);
    if (editor.current) editor.current.innerHTML = "";
  };
  const requestClose = () => {
    if (draftId) {
      void save();
      return;
    }
    const body = editor.current?.getContent() || html;
    if ((!recipient && !subject && !body.trim() && !attachments.length) ||
      (mode !== "new" && !attachments.length && recipient === initialMessage.current.recipient && subject === initialMessage.current.subject && body === initialMessage.current.html)) {
      close();
      return;
    }
    setConfirmClose(true);
  };
  const send = async () => {
    const recipients = splitAddresses(recipient);
    if (
      !recipients.length ||
      !recipients.every((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v))
    ) {
      notify(t("emptyRecipientMsg"));
      return;
    }
    if (!subject) {
      notify(t("emptySubjectMsg"));
      return;
    }
    const content = editor.current?.getContent() || html;
    if (!content.trim()) {
      notify(t("emptyContentMsg"));
      return;
    }
    setSending(true);
    setSendProgress(0);
    try {
      await mail.send(
        {
          sendEmail: draftMeta?.sendEmail || account?.email || user?.email,
          accountId:
            draftMeta?.accountId ||
            account?.accountId ||
            user?.account.accountId,
          name: draftMeta?.name || account?.name || user?.name,
          sendType: draftMeta?.sendType || (mode === "new" ? "" : mode),
          emailId: draftMeta?.emailId || source?.emailId || 0,
          receiveEmail: recipients,
          text: editor.current?.getText() || "",
          content,
          subject,
          attachments,
        },
        setSendProgress,
      );
      if (user && draftId) {
        await draftDb(user.email).draft.delete(draftId);
        await draftDb(user.email).att.delete(draftId);
      }
      qc.invalidateQueries({ queryKey: ["mail"] });
      qc.invalidateQueries({ queryKey: ["drafts"] });
      const updated = [...new Set([...recipients, ...recent])].slice(0, 500);
      setRecent(updated);
      localStorage.setItem(
        "writer",
        JSON.stringify({ sendRecipientRecord: updated }),
      );
      notify(t("sendSuccessMsg"));
      close();
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };
  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const next = await Promise.all(
      Array.from(files).map(async (file) => ({
        filename: file.name,
        size: file.size,
        contentType: file.type,
        content: await readBase64(file),
      })),
    );
    setAttachments((v) => [...v, ...next]);
  };
  if (!open) return null;
  return (
    <div
      className={`compose-window ${minimized ? "minimized" : ""} ${maximized ? "maximized" : ""}`}
      role="dialog"
      aria-label={t("compose")}
    >
      <div className="compose-heading">
        <strong>
          {mode === "reply"
            ? t("reply")
            : mode === "forward"
              ? t("forward")
              : t("compose")}
        </strong>
        <div>
          <IconButton
            title={t("minimize")}
            onClick={() => setMinimized(!minimized)}
          >
            <Minus size={16} />
          </IconButton>
          <IconButton
            title={t("maximize")}
            onClick={() => setMaximized(!maximized)}
          >
            <Maximize2 size={16} />
          </IconButton>
          <IconButton title={t("close")} onClick={requestClose}>
            <X size={18} />
          </IconButton>
        </div>
      </div>
      {!minimized && (
        <>
          <div className="compose-fields">
            <label>
              <span>{t("from")}</span>
              <span>
                {draftMeta?.name || account?.name || user?.name} &lt;
                {draftMeta?.sendEmail || account?.email || user?.email}&gt;
              </span>
            </label>
            <label>
              <span>{t("to")}</span>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="name@example.com"
                list="recent-contacts"
              />
              <datalist id="recent-contacts">
                {recent.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={() => {
                  setSelectedContacts(
                    splitAddresses(recipient).filter((v) => recent.includes(v)),
                  );
                  setContactsOpen(true);
                }}
              >
                {t("recentContacts")}
              </button>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("subject")}
            />
          </div>
          <RichEditor
            ref={editor}
            value={html}
            onChange={(content) => setHtml(content)}
          />
          {attachments.length > 0 && (
            <div className="compose-attachments">
              {attachments.map((a, i) => (
                <span key={i}>
                  <Paperclip size={14} />
                  {a.filename} <small>{bytes(a.size)}</small>
                  <button
                    title={t("delete")}
                    onClick={() =>
                      setAttachments((v) => v.filter((_, n) => n !== i))
                    }
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="compose-footer">
            {sending && (
              <progress
                max={100}
                value={sendProgress}
                aria-label={t("sending")}
              >
                {sendProgress}%
              </progress>
            )}
            <button
              className="primary-button"
              disabled={sending}
              onClick={send}
            >
              <Send size={17} />
              {sending ? t("sending") : t("send")}
            </button>
            <span className="footer-spacer" />
            <IconButton
              title={t("attachments")}
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip size={19} />
            </IconButton>
            <IconButton title={t("clearContentConfirm")} onClick={clearContent}>
              <Eraser size={19} />
            </IconButton>
            <IconButton title={t("discard")} onClick={discard}>
              <Trash2 size={19} />
            </IconButton>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />
        </>
      )}
      {contactsOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{t("recentContacts")}</h2>
            <div className="contacts-list">
              {recent.map((email) => (
                <label key={email}>
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(email)}
                    onChange={(e) =>
                      setSelectedContacts(
                        e.target.checked
                          ? [...selectedContacts, email]
                          : selectedContacts.filter((v) => v !== email),
                      )
                    }
                  />
                  {email}
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                disabled={!selectedContacts.length}
                onClick={() => {
                  if (!confirm(t("confirmDelete"))) return;
                  const next = recent.filter(
                    (v) => !selectedContacts.includes(v),
                  );
                  setRecent(next);
                  localStorage.setItem(
                    "writer",
                    JSON.stringify({ sendRecipientRecord: next }),
                  );
                  setRecipient(
                    splitAddresses(recipient)
                      .filter((v) => !selectedContacts.includes(v))
                      .join(", "),
                  );
                  setSelectedContacts([]);
                }}
              >
                {t("delete")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecipient(
                    [
                      ...new Set([
                        ...splitAddresses(recipient).filter(
                          (v) => !recent.includes(v),
                        ),
                        ...selectedContacts,
                      ]),
                    ].join(", "),
                  );
                  setContactsOpen(false);
                }}
              >
                {t("select")}
              </button>
              <button type="button" onClick={() => setContactsOpen(false)}>
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmClose && (
        <div className="modal-backdrop">
          <div className="modal" role="alertdialog" aria-label={t("saveDraftConfirm")}>
            <h2>{t("saveDraftConfirm")}</h2>
            <div className="modal-actions">
              <button type="button" onClick={() => setConfirmClose(false)}>{t("cancel")}</button>
              <button type="button" onClick={() => { setConfirmClose(false); void discard(); }}>{t("discard")}</button>
              <button type="button" className="primary-button" onClick={() => { setConfirmClose(false); void save(); }}>{t("saveDraft")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
