import React, { useState, useRef } from 'react';
import api from '../services/api';
import { Download, Database, FileJson, Shield, HardDrive, AlertTriangle, Upload, RotateCcw } from 'lucide-react';

export default function Backup() {
  const [downloadingDb, setDownloadingDb] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const dbFileRef = useRef<HTMLInputElement>(null);
  const jsonFileRef = useRef<HTMLInputElement>(null);

  const downloadDb = async () => {
    setDownloadingDb(true);
    setResult(null);
    try {
      const res = await api.get('/backup/download', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `construtor-backup-${new Date().toISOString().slice(0, 10)}.db`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setResult({ type: 'error', message: 'Erro ao baixar backup' });
    } finally {
      setDownloadingDb(false);
    }
  };

  const exportJson = async () => {
    setExportingJson(true);
    setResult(null);
    try {
      const res = await api.get('/backup/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `construtor-export-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setResult({ type: 'error', message: 'Erro ao exportar dados' });
    } finally {
      setExportingJson(false);
    }
  };

  const restoreDb = async (file: File) => {
    if (!confirm('ATENÇÃO: Restaurar um backup substituirá TODOS os dados atuais. Deseja continuar?')) return;
    setRestoring(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('backup', file);
      const res = await api.post('/backup/restore', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult({ type: 'success', message: res.data.message });
    } catch (err: any) {
      setResult({ type: 'error', message: err.response?.data?.detail || 'Erro ao restaurar backup' });
    } finally {
      setRestoring(false);
      if (dbFileRef.current) dbFileRef.current.value = '';
    }
  };

  const importJson = async (file: File) => {
    if (!confirm('ATENÇÃO: Importar dados substituirá TODOS os dados atuais. Deseja continuar?')) return;
    setImporting(true);
    setResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await api.post('/backup/import', data);
      setResult({ type: 'success', message: res.data.message });
    } catch (err: any) {
      setResult({ type: 'error', message: err.response?.data?.detail || 'Erro ao importar dados. Verifique se o arquivo JSON é válido.' });
    } finally {
      setImporting(false);
      if (jsonFileRef.current) jsonFileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Backup do Sistema</h1>
        <p className="text-gray-500 mt-1">Faça backup, exporte, restaure ou importe dados do sistema</p>
      </div>

      {result && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          result.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {result.type === 'success' ? <RotateCcw className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <p className="text-sm font-medium">{result.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-100 rounded-xl">
              <Database className="w-8 h-8 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Backup Completo (.db)</h3>
              <p className="text-sm text-gray-500 mt-1">
                Baixe o arquivo completo do banco de dados SQLite.
              </p>
              <button onClick={downloadDb} disabled={downloadingDb} className="btn-primary mt-4 flex items-center gap-2 touch-manipulation">
                {downloadingDb ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Baixando...</>
                ) : (
                  <><Download className="w-4 h-4" /> Baixar Backup .db</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <FileJson className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Exportar Dados (JSON)</h3>
              <p className="text-sm text-gray-500 mt-1">
                Exporte todas as tabelas em formato JSON legível.
              </p>
              <button onClick={exportJson} disabled={exportingJson} className="btn-secondary mt-4 flex items-center gap-2 touch-manipulation">
                {exportingJson ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div> Exportando...</>
                ) : (
                  <><Download className="w-4 h-4" /> Exportar JSON</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Restaurar / Importar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card border-2 border-dashed border-gray-300">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Upload className="w-8 h-8 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Restaurar Backup (.db)</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Envie um arquivo .db previamente baixado para restaurar os dados. Substitui completamente o banco atual.
                </p>
                <input
                  ref={dbFileRef}
                  type="file"
                  accept=".db"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) restoreDb(e.target.files[0]); }}
                />
                <button
                  onClick={() => dbFileRef.current?.click()}
                  disabled={restoring}
                  className="btn-danger mt-4 flex items-center gap-2 touch-manipulation"
                >
                  {restoring ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Restaurando...</>
                  ) : (
                    <><RotateCcw className="w-4 h-4" /> Restaurar .db</>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="card border-2 border-dashed border-gray-300">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-violet-100 rounded-xl">
                <FileJson className="w-8 h-8 text-violet-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Importar JSON</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Envie um arquivo JSON exportado para importar os dados. Substitui completamente o banco atual.
                </p>
                <input
                  ref={jsonFileRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) importJson(e.target.files[0]); }}
                />
                <button
                  onClick={() => jsonFileRef.current?.click()}
                  disabled={importing}
                  className="btn-danger mt-4 flex items-center gap-2 touch-manipulation"
                >
                  {importing ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Importando...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Importar JSON</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">Aviso importante</h3>
            <p className="text-sm text-amber-700 mt-2">
              O banco de dados está em disco temporário (<code className="text-xs bg-amber-100 px-1 rounded">/tmp</code>) e pode ser resetado entre deployments no Vercel Hobby.
            </p>
            <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
              <li>Faça backups regulares para evitar perda de dados</li>
              <li>Restaurar ou importar substitui <strong>todos</strong> os dados atuais</li>
              <li>O backup .db é um arquivo SQLite padrão, pode ser aberto com qualquer ferramenta compatível</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
