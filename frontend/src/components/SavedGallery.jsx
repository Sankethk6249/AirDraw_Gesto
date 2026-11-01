import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Download, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { assetUrl, deleteDrawing, listDrawings, updateDrawing } from '../services/api.js';
import { downloadDataUrl } from '../utils/canvasUtils.js';

export default function SavedGallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listDrawings());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!preview) return undefined;
    const onKey = (e) => e.key === 'Escape' && setPreview(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  const rename = async (item) => {
    const title = draftTitle.trim();
    if (!title || title === item.title) return setEditingId(null);
    setBusyId(item.id);
    try {
      const updated = await updateDrawing(item.id, title);
      setItems((list) => list.map((d) => (d.id === item.id ? updated : d)));
      setEditingId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setBusyId(item.id);
    try {
      await deleteDrawing(item.id);
      setItems((list) => list.filter((d) => d.id !== item.id));
      if (preview?.id === item.id) setPreview(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const download = async (item) => {
    try {
      const blob = await (await fetch(assetUrl(item.imageUrl))).blob();
      const url = URL.createObjectURL(blob);
      downloadDataUrl(url, `${item.title.replace(/[^\w-]+/g, '_') || 'airdraw'}.png`);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      setError('Could not download the image. Please try again.');
    }
  };

  if (loading) {
    return <p className="flex items-center gap-2 py-16 text-slate-500"><Loader2 className="animate-spin" size={18} /> Loading your artwork…</p>;
  }

  return (
    <div>
      {error && (
        <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300">
          <span>{error}</span>
          <button type="button" onClick={load} className="shrink-0 font-semibold underline">Retry</button>
        </div>
      )}

      {!error && items.length === 0 && (
        <div className="glass grid place-items-center rounded-2xl px-6 py-16 text-center">
          <p className="text-lg font-semibold">No saved drawings yet</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Draw something in the studio and press Save to see it here.</p>
          <Link to="/studio?camera=1" className="btn-primary mt-5">Start Drawing</Link>
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <li key={item.id} className="glass overflow-hidden rounded-2xl">
            <button type="button" className="block w-full bg-slate-900/5 dark:bg-black/20" onClick={() => setPreview(item)} aria-label={`Preview ${item.title}`}>
              <img src={assetUrl(item.imageUrl)} alt={item.title} loading="lazy" className="aspect-video w-full object-cover" />
            </button>
            <div className="space-y-2 p-3">
              {editingId === item.id ? (
                <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); rename(item); }}>
                  <input
                    autoFocus
                    value={draftTitle}
                    maxLength={80}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300/60 bg-transparent px-2 py-1 text-sm dark:border-white/20"
                    aria-label="Drawing title"
                  />
                  <button type="submit" className="btn-ghost !p-1.5" aria-label="Save title" disabled={busyId === item.id}><Check size={16} /></button>
                  <button type="button" className="btn-ghost !p-1.5" aria-label="Cancel" onClick={() => setEditingId(null)}><X size={16} /></button>
                </form>
              ) : (
                <p className="truncate font-semibold" title={item.title}>{item.title}</p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
              <div className="flex gap-1.5">
                <button type="button" className="btn-ghost !px-2.5 !py-1.5" onClick={() => { setEditingId(item.id); setDraftTitle(item.title); }} aria-label="Rename"><Pencil size={15} /></button>
                <button type="button" className="btn-ghost !px-2.5 !py-1.5" onClick={() => download(item)} aria-label="Download"><Download size={15} /></button>
                <button type="button" className="btn-ghost !px-2.5 !py-1.5 hover:!text-rose-500" onClick={() => remove(item)} aria-label="Delete" disabled={busyId === item.id}><Trash2 size={15} /></button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={preview.title} onClick={() => setPreview(null)}>
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <img src={assetUrl(preview.imageUrl)} alt={preview.title} className="max-h-[80vh] rounded-xl shadow-2xl" />
            <figcaption className="mt-3 flex items-center justify-between gap-3 text-white">
              <span className="font-semibold">{preview.title}</span>
              <span className="flex gap-2">
                <button type="button" className="btn-ghost !text-white" onClick={() => download(preview)}><Download size={16} /> Download</button>
                <button type="button" className="btn-ghost !text-white" onClick={() => setPreview(null)}><X size={16} /> Close</button>
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}