import { useState, type ReactNode } from "react";
import { BookUser, Trash2, Pencil, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, Label } from "@/components/aurion";
import { ACCOUNT_RE } from "@/lib/hedera";
import { removeContact, saveContact, useContacts, type Contact } from "@/lib/contacts";

/** "To" field with saved contacts one tap away, and a quick save for new accounts. */
export function RecipientField({ value, onChange, self }: { value: string; onChange: (v: string) => void; self?: string }) {
  const contacts = useContacts().filter((c) => c.account !== self);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const v = value.trim();
  const match = contacts.find((c) => c.account === v);
  const canSave = ACCOUNT_RE.test(v) && !match && v !== self;
  return (
    <div className="space-y-2">
      <input className="field font-mono tnum" placeholder="To 0.0.…" value={value} onChange={(e) => onChange(e.target.value)} />
      {match && <p className="text-xs text-success">Sending to {match.name}</p>}
      {contacts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {contacts.map((c) => (
            <button key={c.id} type="button" onClick={() => onChange(c.account)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${match?.id === c.id ? "border-primary text-signal" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      {canSave && !naming && (
        <button type="button" className="flex items-center gap-1.5 text-xs text-signal" onClick={() => setNaming(true)}><UserPlus size={14} /> Save to contacts</button>
      )}
      {canSave && naming && (
        <div className="flex gap-2">
          <input autoFocus className="field py-2 text-sm" placeholder="Name, like Mom" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          <Button size="sm" disabled={!name.trim()} onClick={() => { saveContact({ name, account: v }); setNaming(false); setName(""); }}>Save</Button>
        </div>
      )}
    </div>
  );
}

/** Full address book: add, rename, remove. */
function ContactSurface({ children, unframed }: { children: ReactNode; unframed: boolean }) { return unframed ? <div>{children}</div> : <Panel>{children}</Panel>; }
export function ContactsPanel({ unframed = false }: { unframed?: boolean }) {
  const contacts = useContacts();
  const [edit, setEdit] = useState<Partial<Contact> | null>(null);
  const ok = !!edit?.name?.trim() && ACCOUNT_RE.test(edit?.account?.trim() ?? "");
  return (
    <ContactSurface unframed={unframed}>
      {!unframed && <Label>Contacts</Label>}
      {!unframed && <p className="mb-4 text-sm text-muted-foreground">Saved on this device only.</p>}
      {contacts.length === 0 && !edit && (
        <div className="flex min-h-64 flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
          <BookUser className="mb-6 size-20 text-primary" strokeWidth={1} /> Add your first contact.
        </div>
      )}
      <ul className="divide-y divide-border">
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-signal">{c.name.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.name}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">{c.account}{c.note ? ` · ${c.note}` : ""}</p>
            </div>
            <Button size="icon" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => setEdit(c)}><Pencil /></Button>
            <Button size="icon" variant="ghost" aria-label={`Remove ${c.name}`} onClick={() => { if (confirm(`Remove ${c.name}?`)) removeContact(c.id); }}><Trash2 /></Button>
          </li>
        ))}
      </ul>
      {edit ? (
        <div className="mt-4 space-y-3">
          <input className="field" placeholder="Name" aria-label="Contact name" maxLength={40} value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <input className="field font-mono tnum" placeholder="Account 0.0.…" maxLength={16} aria-label="Contact account" value={edit.account ?? ""} onChange={(e) => setEdit({ ...edit, account: e.target.value })} />
          <input className="field" placeholder="Note (optional)" maxLength={80} value={edit.note ?? ""} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
          <div className="flex gap-2">
            <Button className="flex-1" disabled={!ok} onClick={() => { if (!edit.name || !edit.account) return; saveContact({ id: edit.id, name: edit.name, account: edit.account, note: edit.note }); setEdit(null); }}>{edit.id ? "Save changes" : "Add contact"}</Button>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button className="mt-4 w-full" onClick={() => setEdit({})}><UserPlus /> Add contact</Button>
      )}
    </ContactSurface>
  );
}
