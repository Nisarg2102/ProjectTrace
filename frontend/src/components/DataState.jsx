export default function DataState({ loading, error, reload }) {
  if (loading) return <p role="status" className="p-4">Loading…</p>;
  if (error) return <div className="error" role="alert">{error} <button className="underline" onClick={reload}>Try again</button></div>;
  return null;
}
