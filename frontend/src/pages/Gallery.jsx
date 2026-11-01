import SavedGallery from '../components/SavedGallery.jsx';

export default function Gallery() {
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Saved artwork</h1>
      <p className="mb-6 mt-1 text-slate-600 dark:text-slate-400">Everything you saved from the studio on this browser.</p>
      <SavedGallery />
    </div>
  );
}