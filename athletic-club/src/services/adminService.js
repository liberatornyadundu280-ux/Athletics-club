import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

const initialAdminEmail = normalizeEmail(import.meta.env.VITE_INITIAL_ADMIN_EMAIL);

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function requireDatabase() {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase must be configured before dashboard access can be used.");
  }
}

function getAdminsDocument() {
  requireDatabase();
  return doc(db, "settings", "siteAdmins");
}

function recordsFromData(data) {
  const emails = Array.isArray(data?.emails) ? data.emails : [];
  const records = Array.isArray(data?.admins) ? data.admins : [];
  return emails.map((email) => {
    const normalized = normalizeEmail(email);
    const record = records.find((item) => normalizeEmail(item.email) === normalized);
    return {
      addedAt: record?.addedAt || "-",
      addedBy: record?.addedBy || "Initial setup",
      email: normalized,
      id: email,
    };
  }).filter((admin) => admin.email);
}

async function ensureInitialAdmin(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!initialAdminEmail || normalizedEmail !== initialAdminEmail) return;
  const adminsDocument = getAdminsDocument();
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(adminsDocument);
    if (snapshot.exists()) return;
    transaction.set(adminsDocument, {
      admins: [{ addedAt: new Date().toISOString(), addedBy: "Initial setup", email: normalizedEmail }],
      emails: [normalizedEmail],
      initialized: true,
    });
  });
}

export async function readAdmins(emailToBootstrap) {
  requireDatabase();
  await ensureInitialAdmin(emailToBootstrap);
  const snapshot = await getDoc(getAdminsDocument());
  return snapshot.exists() ? recordsFromData(snapshot.data()) : [];
}

export async function isUserAdmin(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return false;
  }

  const admins = await readAdmins(normalized);
  return admins.some((admin) => admin.email === normalized);
}

export async function addAdmin(email, addedBy) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error("Email is required.");
  }

  requireDatabase();
  const grantor = normalizeEmail(addedBy);
  const adminsDocument = getAdminsDocument();
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(adminsDocument);
    if (!snapshot.exists()) throw new Error("Admin access has not been initialized yet.");
    const data = snapshot.data();
    const emails = (data.emails || []).map(normalizeEmail);
    if (!emails.includes(grantor)) throw new Error("Only an authorized admin can grant dashboard access.");
    if (emails.includes(normalized)) throw new Error("This user is already an admin.");
    transaction.update(adminsDocument, {
      admins: [...recordsFromData(data), { addedAt: new Date().toISOString(), addedBy: grantor, email: normalized }],
      emails: [...emails, normalized],
    });
  });
}

export async function removeAdmin(email, removedBy) {
  const normalized = normalizeEmail(email);
  requireDatabase();
  const remover = normalizeEmail(removedBy);
  if (normalized === remover) {
    throw new Error("You cannot remove your own admin access.");
  }
  const adminsDocument = getAdminsDocument();
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(adminsDocument);
    if (!snapshot.exists()) throw new Error("Admin access has not been initialized yet.");
    const data = snapshot.data();
    const emails = (data.emails || []).map(normalizeEmail);
    if (!emails.includes(remover)) throw new Error("Only an authorized admin can revoke dashboard access.");
    if (!emails.includes(normalized)) throw new Error("This user is not an admin.");
    transaction.update(adminsDocument, {
      admins: recordsFromData(data).filter((admin) => admin.email !== normalized),
      emails: emails.filter((item) => item !== normalized),
    });
  });
}
