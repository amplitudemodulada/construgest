import React, { useState } from 'react';
import api from '../services/api';
import { Download, Database, FileJson, Shield, HardDrive, AlertTriangle } from 'lucide-react';

export default function Backup() {
  const [downloadingDb, setDownloadingDb] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);

  const downloadDb = async () => {
    setDownloadingDb(true);
    try {
      const res = await api.get('/backup/download', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      const filename = `construtor-backup-${new Date().toISOString().slice(0, 10)}.db`;
      a.setAttribute('download', filename);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Erro ao baixar backup');
    } finally {
      setDownloadingDb(false);
    }
  };

  const exportJson = async () => {
    setExportingJson(true);
    try {
      const res = await api.get('/backup/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      const filename = `construtor-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.setAttribute('download', filename);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Erro ao exportar dados');
    } finally {
      setExportingJson(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Backup do Sistema</h1>
        <p className="text-gray-500 mt-1">Faça backup completo ou exporte os dados do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-100 rounded-xl">
              <Database className="w-8 h-8 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Backup Completo (.db)</h3>
              <p className="text-sm text-gray-500 mt-1">
                Baixe o arquivo completo do banco de dados SQLite. Contém todas as informações do sistema.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <HardDrive className="w-3 h-3" />
                  <span>Arquivo único .db — compatível com SQLite</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Ambiente serverless: dados são voláteis, faça backups regulares</span>
                </div>
              </div>
              <button
                onClick={downloadDb}
                disabled={downloadingDb}
                className="btn-primary mt-4 flex items-center gap-2 touch-manipulation"
              >
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
                Exporte todas as tabelas do sistema em formato JSON legível. Ideal para migração ou análise.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Shield className="w-3 h-3" />
                  <span>Formato estruturado com todas as entidades</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <FileJson className="w-3 h-3" />
                  <span>Compatível com importação em outras ferramentas</span>
                </div>
              </div>
              <button
                onClick={exportJson}
                disabled={exportingJson}
                className="btn-secondary mt-4 flex items-center gap-2 touch-manipulation"
              >
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

      <div className="card bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">Aviso importante</h3>
            <p className="text-sm text-amber-700 mt-1">
              Por estar hospedado em ambiente serverless (Vercel Hobby), o banco de dados SQLite é armazenado em disco temporário (<code className="text-xs bg-amber-100 px-1 rounded">/tmp</code>) e pode ser resetado entre deployments. 
              Recomenda-se fazer backup regularmente para evitar perda de dados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
