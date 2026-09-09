import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle2, AlertTriangle, Trash2, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { parseWorkbook } from '../lib/parseExcel';
import { db } from '../store/db';
import type { Dataset } from '../lib/types';
import { PageHead, SectionTitle } from '../components/ui';
import { fmtNum } from '../lib/format';

export default function Upload() {
  const { dataset, setDataset, reloadDataset, session, logout } = useApp();
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Dataset | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleFile(file: File) {
    setError('');
    setSaved(false);
    setPreview(null);
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const ds = await parseWorkbook(buf, file.name);
      setPreview(ds);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this file.');
    } finally {
      setBusy(false);
    }
  }

  function confirmSave() {
    if (!preview) return;
    const res = setDataset(preview);
    if (!res.ok) {
      setError(`Could not save — ${res.error}.`);
      return;
    }
    setSaved(true);
    setPreview(null);
  }

  const span = (ds: Dataset) =>
    ds.minDate && ds.maxDate
      ? `${ds.minDate.slice(0, 10)} → ${ds.maxDate.slice(0, 10)}`
      : 'no dates found';

  if (session?.role !== 'admin') {
    return (
      <div>
        <PageHead title="Upload" />
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <Lock className="h-9 w-9 text-violet-400" />
          <p className="text-base font-bold text-gray-700">Only the Administrator can upload data</p>
          <p className="text-sm text-gray-500">
            You are signed in as a viewer. Sign in with the <b>admin</b> account
            (<code>admin</code> / <code>admin123</code>) to upload the Excel file and set targets.
          </p>
          <button
            className="btn-primary mt-1"
            onClick={() => {
              logout();
              nav('/login');
            }}
          >
            Switch account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHead title="Upload" subtitle="Lead Excel file (admin)" />

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className="card flex flex-col items-center gap-2 border-2 border-dashed border-violet-200 p-8 text-center"
      >
        <UploadCloud className="h-10 w-10 text-violet-400" />
        <p className="font-bold text-gray-700">Drop the .xlsx file here</p>
        <p className="text-xs text-gray-500">Any file name is fine. Data is parsed on your device.</p>
        <button className="btn-primary mt-2" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Reading…' : 'Choose file'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {saved && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Saved. This data stays in the app until you upload a new file.
        </div>
      )}

      {preview && (
        <div className="mt-4">
          <SectionTitle>Preview</SectionTitle>
          <div className="card space-y-1 p-4 text-sm">
            <Row k="File" v={preview.fileName} />
            <Row k="Rows" v={fmtNum(preview.rowCount)} />
            <Row k="Date span (Assigned Date)" v={span(preview)} />
            <Row k="Marketing Officers in file" v={`${preview.roster.length}`} />
            <Row
              k="Converted / Pending / Rejected"
              v={`${fmtNum(preview.leads.filter((l) => l.statusClass === 'progress').length)} / ${fmtNum(
                preview.leads.filter((l) => l.statusClass === 'pending').length,
              )} / ${fmtNum(preview.leads.filter((l) => l.statusClass === 'rejected').length)}`}
            />
            <Row
              k="Largest single lead amount (Col E)"
              v={`₹ ${fmtNum(Math.max(0, ...preview.leads.map((l) => l.leadAmount)))}`}
            />
          </div>

          {Math.max(0, ...preview.leads.map((l) => l.leadAmount)) >= 1_00_00_000 && (
            <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">
              One or more leads have a very large <b>Column E</b> amount (≥ ₹1 crore). If that is a typo in the
              source file it will inflate the "Lead Amount" totals — check the export.
            </div>
          )}

          <div className="mt-2 rounded-2xl bg-gray-100 p-3 text-xs text-gray-600">
            <b>Officers detected:</b> {preview.roster.join(', ')}
          </div>
          {preview.unmappedGroups.length > 0 && (
            <div className="mt-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">
              <b>Unclassified products</b>: {preview.unmappedGroups.map((u) => `${u.name} (${u.count})`).join(', ')}
            </div>
          )}
          {preview.convertedNoAccount > 0 && (
            <div className="mt-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">
              <b>{fmtNum(preview.convertedNoAccount)} converted lead(s) have no account/policy number</b> in the
              progress columns. Per the rules, these count towards achievement <b>amount</b> but not achievement
              <b> number</b>.
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button className="btn-primary flex-1" onClick={confirmSave}>
              Save &amp; publish
            </button>
            <button className="btn-outline" onClick={() => setPreview(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {dataset && !preview && (
        <div className="mt-6">
          <SectionTitle>Current data</SectionTitle>
          <div className="card space-y-1 p-4 text-sm">
            <Row k="File" v={dataset.fileName} />
            <Row k="Rows" v={fmtNum(dataset.rowCount)} />
            <Row k="Date span" v={span(dataset)} />
            <Row k="Uploaded" v={new Date(dataset.uploadedAt).toLocaleString('en-IN')} />
          </div>
          <button
            className="btn mt-3 bg-rose-50 text-rose-700 hover:bg-rose-100"
            onClick={() => {
              if (confirm('Remove the current dataset? Reports will be empty until you upload again.')) {
                db.clearDataset();
                reloadDataset();
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Remove current data
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gray-50 py-1.5 last:border-0">
      <span className="text-gray-500">{k}</span>
      <span className="text-right font-medium text-gray-800">{v}</span>
    </div>
  );
}
