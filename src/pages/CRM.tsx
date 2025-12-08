/* eslint-disable @next/next/no-img-element */
/**
 * crm.tsx
 * Drop-in replacement for your CRM page. Place under /src/pages/crm.tsx
 *
 * - Tailwind classes used throughout. Adapt if not using Tailwind.
 * - Replace SAMPLE_CONTACTS and fetchContacts() with your real backend (Supabase/API).
 * - External libs: react-swipeable, lucide-react, papaparse
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import {
  Phone,
  MessageCircle,
  Mail,
  Linkedin,
  Tag as TagIcon,
  Clock,
  Trash2,
  Edit2,
  X as XIcon,
  Search,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import Papa from "papaparse";

/* ----------------------
  Types
   ---------------------- */
type Contact = {
  id: number;
  name: string;
  company?: string | null;
  designation?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  linkedin?: string | null;
  notes?: string | null;
  avatar?: string | null;
  tags?: string[];
  createdAt?: string | null; // ISO
};

type SortKey = "name" | "createdAt" | "company";

/* ----------------------
  Sample data - replace with API / Supabase fetch
   ---------------------- */
const SAMPLE_CONTACTS: Contact[] = [
  {
    id: 1,
    name: "Aisha Khan",
    company: "Orbit Labs",
    designation: "Product Lead",
    phone: "+91 98765 43210",
    whatsapp: "+91 98765 43210",
    email: "aisha@orbit.com",
    linkedin: "https://www.linkedin.com/in/aishak/",
    notes: "Met at trade show. Interested in corporate travel solution.",
    avatar: null,
    tags: ["Lead", "TradeShow"],
    createdAt: "2025-11-20T10:30:00.000Z",
  },
  {
    id: 2,
    name: "Rohit Sharma",
    company: "",
    designation: "",
    phone: null,
    whatsapp: null,
    email: null,
    linkedin: null,
    notes: "No extra info.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80",
    tags: [],
    createdAt: "2025-10-05T15:45:00.000Z",
  },
  // add more sample contacts if you want for development
];

/* ----------------------
  Utilities
   ---------------------- */
const formatCreatedAt = (iso?: string | null) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
};

const debounce = <T extends (...args: any[]) => void>(fn: T, wait = 250) => {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

/* ----------------------
  Main component
   ---------------------- */
export default function CRMPage(): JSX.Element {
  // Data & UI state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // modals/drawers
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [tagEditorFor, setTagEditorFor] = useState<number | null>(null);
  const [notesFor, setNotesFor] = useState<number | null>(null);
  const [detailFor, setDetailFor] = useState<number | null>(null);
  const [editFor, setEditFor] = useState<number | null>(null);

  // UI refs
  const searchRef = useRef<HTMLInputElement | null>(null);

  // load data (replace with your API call)
  useEffect(() => {
    // TODO: replace fetchContacts() with your API/Supabase call
    const fetchContacts = async () => {
      // Simulate async fetch
      await new Promise((r) => setTimeout(r, 80));
      setContacts(SAMPLE_CONTACTS);
    };
    fetchContacts();
  }, []);

  // Derived lists (search, filter, sort)
  const allTags = useMemo(() => {
    const s = new Set<string>();
    contacts.forEach((c) => (c.tags || []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [contacts]);

  const filteredSorted = useMemo(() => {
    let list = contacts.slice();

    // search across name, company, designation, email
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        return (
          (c.name || "").toLowerCase().includes(q) ||
          (c.company || "").toLowerCase().includes(q) ||
          (c.designation || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q)
        );
      });
    }

    if (activeTagFilter) {
      list = list.filter((c) => (c.tags || []).includes(activeTagFilter));
    }

    // sort
    list.sort((a, b) => {
      let aa: string | number = "";
      let bb: string | number = "";
      if (sortKey === "name") {
        aa = (a.name || "").toLowerCase();
        bb = (b.name || "").toLowerCase();
      } else if (sortKey === "createdAt") {
        aa = a.createdAt ? Date.parse(a.createdAt) : 0;
        bb = b.createdAt ? Date.parse(b.createdAt) : 0;
      } else if (sortKey === "company") {
        aa = (a.company || "").toLowerCase();
        bb = (b.company || "").toLowerCase();
      }
      if (aa < bb) return sortDir === "asc" ? -1 : 1;
      if (aa > bb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [contacts, query, activeTagFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const currentPageItems = useMemo(() => {
    const s = (page - 1) * pageSize;
    return filteredSorted.slice(s, s + pageSize);
  }, [filteredSorted, page]);

  /* ----------------------
    Selection / bulk actions
     ---------------------- */
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      currentPageItems.forEach((c) => next.add(c.id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkDelete = () => {
    if (selectedIds.size === 0) return;
    // confirm
    if (!confirm(`Delete ${selectedIds.size} selected contacts?`)) return;
    setContacts((prev) => prev.filter((c) => !selectedIds.has(c.id)));
    clearSelection();
  };

  const exportCSV = () => {
    const out = contacts.map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company || "",
      designation: c.designation || "",
      phone: c.phone || "",
      whatsapp: c.whatsapp || "",
      email: c.email || "",
      linkedin: c.linkedin || "",
      tags: (c.tags || []).join(","),
      createdAt: c.createdAt || "",
      notes: c.notes || "",
    }));
    const csv = Papa.unparse(out);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ----------------------
    Single contact actions
     ---------------------- */
  const requestDeleteContact = (id: number) => setDeleteConfirmId(id);
  const confirmDelete = () => {
    if (deleteConfirmId == null) return;
    setContacts((prev) => prev.filter((c) => c.id !== deleteConfirmId));
    setDeleteConfirmId(null);
  };

  const openTagEditor = (id: number | null) => setTagEditorFor(id);
  const openNotes = (id: number | null) => setNotesFor(id);
  const openDetail = (id: number | null) => setDetailFor(id);
  const openEdit = (id: number | null) => setEditFor(id);

  /* ----------------------
    Search (debounced)
     ---------------------- */
  const handleSearch = useMemo(
    () =>
      debounce((v: string) => {
        setQuery(v);
        setPage(1);
      }, 220),
    []
  );

  /* ----------------------
    Render
     ---------------------- */
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <header className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">CRM</h1>
          <span className="text-sm text-slate-500">Contacts</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded overflow-hidden">
            <div className="px-2">
              <Search size={16} />
            </div>
            <input
              ref={searchRef}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name, company, email..."
              className="px-2 py-2 outline-none w-64"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 px-3 py-2 rounded bg-indigo-600 text-white"
              onClick={() => {
                // Add new contact fallback
                const newId = Math.max(0, ...contacts.map((c) => c.id)) + 1;
                const c: Contact = {
                  id: newId,
                  name: `New Contact ${newId}`,
                  createdAt: new Date().toISOString(),
                  tags: [],
                };
                setContacts((prev) => [c, ...prev]);
                openEdit(newId);
              }}
              title="Add contact"
            >
              <Plus size={14} /> Add
            </button>

            <button
              className="flex items-center gap-2 px-3 py-2 rounded border hover:bg-slate-50"
              onClick={() => exportCSV()}
              title="Export CSV"
            >
              <Download size={14} /> Export
            </button>

            <div className="relative">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded border hover:bg-slate-50"
                title="More"
                onClick={() => {
                  // placeholder for additional actions
                  alert("More actions placeholder");
                }}
              >
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters & bulk */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSortKey("name");
                setSortDir((s) => (s === "asc" ? "desc" : "asc"));
              }}
              className="px-2 py-1 rounded border text-xs"
            >
              Sort: {sortKey} ({sortDir})
            </button>

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="px-2 py-1 rounded border text-xs"
            >
              <option value="name">Name</option>
              <option value="createdAt">Created</option>
              <option value="company">Company</option>
            </select>
          </div>

          <div className="flex items-center gap-2 ml-3">
            <button onClick={selectAllOnPage} className="text-xs px-2 py-1 rounded border">
              Select page
            </button>
            <button onClick={clearSelection} className="text-xs px-2 py-1 rounded border">
              Clear
            </button>
            <button onClick={() => bulkDelete()} className="text-xs px-2 py-1 rounded border text-red-600">
              Delete selected ({selectedIds.size})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-slate-600">Filter by tag</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTagFilter(null)}
              className={`px-2 py-1 rounded ${!activeTagFilter ? "bg-slate-200" : "border"}`}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTagFilter((prev) => (prev === t ? null : t))}
                className={`px-2 py-1 rounded ${activeTagFilter === t ? "bg-indigo-600 text-white" : "border"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contacts grid */}
      <div className="grid grid-cols-1 gap-3">
        {currentPageItems.map((c) => (
          <ContactCard
            key={c.id}
            contact={c}
            selected={selectedIds.has(c.id)}
            onToggleSelect={() => toggleSelect(c.id)}
            onDelete={() => requestDeleteContact(c.id)}
            onOpenTags={() => openTagEditor(c.id)}
            onOpenNotes={() => openNotes(c.id)}
            onOpenDetails={() => openDetail(c.id)}
            onEdit={() => openEdit(c.id)}
          />
        ))}
        {currentPageItems.length === 0 && <div className="text-center text-slate-500 py-8">No contacts found</div>}
      </div>

      {/* Pagination */}
      <footer className="mt-4 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredSorted.length)} of {filteredSorted.length}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-2 rounded border disabled:opacity-60"
            disabled={page <= 1}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-sm px-2 py-1 border rounded">{page}</div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="p-2 rounded border disabled:opacity-60"
            disabled={page >= totalPages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </footer>

      {/* Modals / drawers */}
      {deleteConfirmId !== null && (
        <ConfirmModal
          title="Delete contact"
          description="Are you sure you want to delete this contact? This cannot be undone."
          onCancel={() => setDeleteConfirmId(null)}
          onConfirm={() => confirmDelete()}
        />
      )}

      {tagEditorFor !== null && (
        <TagModal
          contact={contacts.find((x) => x.id === tagEditorFor) as Contact}
          onClose={() => setTagEditorFor(null)}
          onSave={(newTags) => {
            setContacts((prev) => prev.map((c) => (c.id === tagEditorFor ? { ...c, tags: newTags } : c)));
            setTagEditorFor(null);
          }}
        />
      )}

      {notesFor !== null && (
        <NotesModal contact={contacts.find((x) => x.id === notesFor) as Contact} onClose={() => setNotesFor(null)} />
      )}

      {detailFor !== null && (
        <DetailDrawer contact={contacts.find((x) => x.id === detailFor) as Contact} onClose={() => setDetailFor(null)} onEdit={() => openEdit(detailFor)} />
      )}

      {editFor !== null && (
        <EditModal
          contact={contacts.find((x) => x.id === editFor) as Contact}
          onClose={() => setEditFor(null)}
          onSave={(updated) => {
            setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setEditFor(null);
          }}
        />
      )}
    </div>
  );
}

/* ----------------------
  Contact Card component (main UI per your spec)
   ---------------------- */
function ContactCard({
  contact,
  selected,
  onToggleSelect,
  onDelete,
  onOpenTags,
  onOpenNotes,
  onOpenDetails,
  onEdit,
}: {
  contact: Contact;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onOpenTags: () => void;
  onOpenNotes: () => void;
  onOpenDetails: () => void;
  onEdit: () => void;
}): JSX.Element {
  const { id, name, company, designation, avatar, tags, createdAt } = contact;
  const initials = (name || "")
    .split(" ")
    .map((s) => (s ? s[0] : ""))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const hasCompanyOrDesignation = Boolean(company) || Boolean(designation);

  const [revealed, setRevealed] = useState<null | "left" | "right">(null);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      setRevealed("left");
      setTimeout(onDelete, 200);
    },
    onSwipedRight: () => {
      setRevealed("right");
      setTimeout(onOpenNotes, 160);
    },
    trackMouse: true,
    preventDefaultTouchmoveEvent: true,
  });

  return (
    <div
      {...handlers}
      className="relative bg-white rounded-lg border shadow-sm hover:shadow-md transition p-4 flex items-start gap-3"
      role="article"
      aria-labelledby={`contact-${id}`}
    >
      {/* Selection checkbox */}
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="mt-1" aria-label={`Select ${name}`} />
      </div>

      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
          {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : <span className="font-semibold text-slate-700">{initials}</span>}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 id={`contact-${id}`} className="text-sm font-medium truncate">
                {name}
              </h3>
            </div>

            {hasCompanyOrDesignation ? (
              <p className="text-xs text-slate-500 truncate mt-1">{company && designation ? `${company} • ${designation}` : company || designation}</p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">&nbsp;</p>
            )}
          </div>

          <div className="flex items-center gap-3 ml-3">
            <button onClick={onOpenTags} title="Tags" className="p-1 rounded hover:bg-slate-100">
              <TagIcon size={16} />
            </button>

            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Clock size={12} />
              <span>{formatCreatedAt(createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Icons row */}
        <div className="mt-3 flex items-center gap-3 text-slate-600">
          {contact.phone && (
            <button className="flex items-center gap-2 text-xs" title="Call" onClick={() => alert(`Call ${contact.phone}`)}>
              <Phone size={16} />
            </button>
          )}

          {contact.whatsapp && (
            <button className="flex items-center gap-2 text-xs" title="WhatsApp" onClick={() => alert(`WhatsApp ${contact.whatsapp}`)}>
              <MessageCircle size={16} />
            </button>
          )}

          {contact.email && (
            <button className="flex items-center gap-2 text-xs" title="Email" onClick={() => alert(`Email ${contact.email}`)}>
              <Mail size={16} />
            </button>
          )}

          {contact.linkedin && (
            <button className="flex items-center gap-2 text-xs" title="LinkedIn" onClick={() => window.open(contact.linkedin, "_blank")}>
              <Linkedin size={16} />
            </button>
          )}

          {contact.notes && (
            <button className="flex items-center gap-2 text-xs" title="Notes" onClick={onOpenNotes}>
              <Edit2 size={16} />
            </button>
          )}

          <div className="flex items-center gap-1 ml-2 flex-wrap">
            {(tags || []).slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full text-slate-700">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex flex-col gap-2 items-end">
        <button onClick={onEdit} className="p-1 rounded hover:bg-slate-100" title="Edit">
          <Edit2 size={14} />
        </button>
        <button onClick={onOpenDetails} className="p-1 rounded hover:bg-slate-100" title="Open">
          <MoreHorizontal size={14} />
        </button>
      </div>
    </div>
  );
}

/* ----------------------
  Tag Modal
   ---------------------- */
function TagModal({ contact, onClose, onSave }: { contact: Contact; onClose: () => void; onSave: (tags: string[]) => void }): JSX.Element {
  const [value, setValue] = useState<string>((contact.tags || []).join(", "));

  const save = () => {
    const newTags = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onSave(newTags);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium">Edit Tags — {contact.name}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <XIcon size={16} />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-3">Enter tags separated by commas.</p>
        <input value={value} onChange={(e) => setValue(e.target.value)} className="w-full border px-3 py-2 rounded mb-3" placeholder="Lead, VIP, TradeShow" />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded">
            Cancel
          </button>
          <button onClick={save} className="px-3 py-2 rounded bg-indigo-600 text-white">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------
  Notes Modal
   ---------------------- */
function NotesModal({ contact, onClose }: { contact: Contact | undefined; onClose: () => void }): JSX.Element | null {
  if (!contact) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium">Notes — {contact.name}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <XIcon size={16} />
          </button>
        </div>

        <div className="text-sm text-slate-700 whitespace-pre-wrap">{contact.notes || "(No notes)"}</div>

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-3 py-2 rounded bg-indigo-600 text-white">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------
  Details Drawer
   ---------------------- */
function DetailDrawer({ contact, onClose, onEdit }: { contact: Contact | undefined; onClose: () => void; onEdit: () => void }): JSX.Element | null {
  if (!contact) return null;
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-white h-full p-4 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">{contact.name}</h3>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="px-2 py-1 rounded border text-sm">
              Edit
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
              <XIcon size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
              {contact.avatar ? <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" /> : <span className="font-semibold">{(contact.name || "").slice(0, 2).toUpperCase()}</span>}
            </div>
            <div>
              <div className="text-sm font-medium">{contact.name}</div>
              <div className="text-xs text-slate-500">
                {contact.company} {contact.company && contact.designation ? "•" : ""} {contact.designation}
              </div>
            </div>
          </div>

          <div>Created: {formatCreatedAt(contact.createdAt)}</div>

          <div className="pt-2">
            <div className="text-xs text-slate-500 mb-1">Contact</div>
            <div className="flex flex-col gap-2">
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} /> <span>{contact.phone}</span>
                </div>
              )}
              {contact.whatsapp && (
                <div className="flex items-center gap-2">
                  <MessageCircle size={14} /> <span>{contact.whatsapp}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} /> <span>{contact.email}</span>
                </div>
              )}
              {contact.linkedin && (
                <div className="flex items-center gap-2">
                  <Linkedin size={14} /> <a href={contact.linkedin} target="_blank" rel="noreferrer" className="underline">
                    LinkedIn
                  </a>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Tags</div>
            <div className="flex gap-2 flex-wrap">{(contact.tags || []).map((t) => (<span key={t} className="px-2 py-1 bg-slate-100 rounded text-xs">{t}</span>))}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Notes</div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">{contact.notes || "(No notes)"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------
  Edit Modal (simple inline editor)
   ---------------------- */
function EditModal({ contact, onClose, onSave }: { contact: Contact | undefined; onClose: () => void; onSave: (c: Contact) => void }): JSX.Element | null {
  const [form, setForm] = useState<Contact | null>(contact ?? null);
  useEffect(() => setForm(contact ?? null), [contact]);

  if (!form) return null;

  const update = (patch: Partial<Contact>) => setForm((s) => ({ ...(s as Contact), ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Edit — {form.name}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <XIcon size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Name" className="w-full border px-3 py-2 rounded" />
          <input value={form.company || ""} onChange={(e) => update({ company: e.target.value })} placeholder="Company" className="w-full border px-3 py-2 rounded" />
          <input value={form.designation || ""} onChange={(e) => update({ designation: e.target.value })} placeholder="Designation" className="w-full border px-3 py-2 rounded" />
          <input value={form.phone || ""} onChange={(e) => update({ phone: e.target.value })} placeholder="Phone" className="w-full border px-3 py-2 rounded" />
          <input value={form.whatsapp || ""} onChange={(e) => update({ whatsapp: e.target.value })} placeholder="WhatsApp" className="w-full border px-3 py-2 rounded" />
          <input value={form.email || ""} onChange={(e) => update({ email: e.target.value })} placeholder="Email" className="w-full border px-3 py-2 rounded" />
          <input value={form.linkedin || ""} onChange={(e) => update({ linkedin: e.target.value })} placeholder="LinkedIn URL" className="w-full border px-3 py-2 rounded" />
          <textarea value={form.notes || ""} onChange={(e) => update({ notes: e.target.value })} placeholder="Notes" className="w-full border px-3 py-2 rounded" />
          <input value={form.avatar || ""} onChange={(e) => update({ avatar: e.target.value })} placeholder="Avatar URL" className="w-full border px-3 py-2 rounded" />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-2 rounded">
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(form as Contact);
            }}
            className="px-3 py-2 rounded bg-indigo-600 text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------
  Confirmation modal
   ---------------------- */
function ConfirmModal({ title, description, onCancel, onConfirm }: { title: string; description: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-sm p-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-4">{description}</p>

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-2 rounded">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-3 py-2 rounded bg-red-600 text-white">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}