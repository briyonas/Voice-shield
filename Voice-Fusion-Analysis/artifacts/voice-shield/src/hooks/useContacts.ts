import { useCallback, useEffect, useState } from "react";
import type { Contact } from "@/lib/voiceshield/types";

const STORAGE_KEY = "voiceshield_contacts";

const DEFAULT_CONTACTS: Contact[] = [
  { id: "1", name: "Mom", phone: "+91 98765 43210", armed: true },
  { id: "2", name: "Priya", phone: "+91 87654 32109", armed: true },
];

function loadContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONTACTS;
    const parsed = JSON.parse(raw) as Contact[];
    if (!Array.isArray(parsed)) return DEFAULT_CONTACTS;
    return parsed;
  } catch {
    return DEFAULT_CONTACTS;
  }
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>(loadContacts);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
    } catch {
      /* ignore */
    }
  }, [contacts]);

  const add = useCallback((name: string, phone: string) => {
    const n = name.trim();
    const p = phone.trim();
    if (!n || !p) return;
    setContacts((c) => [
      ...c,
      { id: `${Date.now()}`, name: n, phone: p, armed: true },
    ]);
  }, []);

  const remove = useCallback((id: string) => {
    setContacts((c) => c.filter((x) => x.id !== id));
  }, []);

  const toggle = useCallback((id: string) => {
    setContacts((c) =>
      c.map((x) => (x.id === id ? { ...x, armed: !x.armed } : x)),
    );
  }, []);

  return { contacts, add, remove, toggle, setContacts };
}
