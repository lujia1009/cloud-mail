export interface Account {
  accountId: number;
  email: string;
  name: string;
  allReceive: number;
  status: number;
  sort: number;
}
export interface User {
  userId: number;
  email: string;
  name: string;
  account: Account;
  permKeys: string[];
  role: Record<string, any>;
  type: number;
  sendCount: number;
}
export interface Attachment {
  attId?: number;
  key?: string;
  filename: string;
  size: number;
  content?: string;
  contentType?: string;
}
export interface Mail {
  emailId: number;
  sendEmail: string;
  name: string;
  subject: string;
  recipient: string;
  toEmail: string;
  type: number;
  status: number;
  message?: string;
  unread: number;
  createTime: string;
  isDel: number;
  isStar: number;
  listText?: string;
  text?: string;
  content?: string;
  attList?: Attachment[];
  accountId?: number;
}
export interface MailPage {
  list: Mail[];
  total: number;
  latestEmail?: { emailId: number };
}
export interface SiteConfig {
  title?: string;
  domainList?: string[];
  r2Domain?: string;
  [key: string]: any;
}
