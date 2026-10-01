import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FileText, Trash2 } from "lucide-react";
import { draftDb, type Draft } from "./drafts";
import { useApp } from "../../stores/app";
import { Empty, Skeleton, IconButton } from "../../components/Feedback";
import { dateLabel } from "../../utils/mail";
import type { Attachment } from "../../types";
export function DraftsPage() {
  const { t, i18n } = useTranslation();
  const user = useApp((s) => s.user);
  const open = useApp((s) => s.openCompose);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["drafts", user?.email],
    queryFn: () =>
      draftDb(user!.email).draft.orderBy("createTime").reverse().toArray(),
    enabled: !!user,
  });
  const edit = async (draft: Draft) => {
    const attachments =
      (await draftDb(user!.email).att.get(draft.draftId!))?.attachments || [];
    open();
    window.dispatchEvent(
      new CustomEvent<Draft & { attachments: Attachment[] }>("open-draft", {
        detail: { ...draft, attachments },
      }),
    );
  };
  const remove = async (id: number) => {
    if (!confirm(t("confirmDelete"))) return;
    await draftDb(user!.email).draft.delete(id);
    await draftDb(user!.email).att.delete(id);
    qc.invalidateQueries({ queryKey: ["drafts", user?.email] });
  };
  return (
    <div className="mail-view">
      <div className="list-toolbar">
        <h2>{t("drafts")}</h2>
      </div>
      {query.isLoading ? (
        <Skeleton />
      ) : !query.data?.length ? (
        <Empty />
      ) : (
        <div className="mail-list">
          {query.data.map((d) => (
            <div
              className="mail-row draft-row"
              key={d.draftId}
              onClick={() => edit(d)}
            >
              <FileText size={18} />
              <span className="row-sender">
                {d.receiveEmail.join(", ") || t("noRecipient")}
              </span>
              <span className="row-subject">{d.subject || t("noSubject")}</span>
              <time>{dateLabel(d.createTime, i18n.language)}</time>
              <span onClick={(e) => e.stopPropagation()}>
                <IconButton
                  title={t("delete")}
                  onClick={() => remove(d.draftId!)}
                >
                  <Trash2 size={17} />
                </IconButton>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
