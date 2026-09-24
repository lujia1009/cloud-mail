import Dexie, { type Table } from "dexie";
import type { Attachment } from "../../types";
export interface Draft {
  draftId?: number;
  createTime: string;
  sendEmail: string;
  accountId: number;
  name: string;
  receiveEmail: string[];
  subject: string;
  content: string;
  text: string;
  sendType: string;
  emailId: number;
}
class DraftDatabase extends Dexie {
  draft!: Table<Draft, number>;
  att!: Table<{ draftId: number; attachments: Attachment[] }, number>;
  constructor(email: string) {
    super(email);
    this.version(1).stores({ draft: "++draftId,createTime", att: "draftId" });
  }
}
const cache = new Map<string, DraftDatabase>();
export function draftDb(email: string) {
  if (!cache.has(email)) cache.set(email, new DraftDatabase(email));
  return cache.get(email)!;
}
