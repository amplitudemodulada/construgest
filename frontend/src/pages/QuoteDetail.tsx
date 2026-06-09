import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Quote } from '../types';
import { ArrowLeft, FileText, Mail, ShoppingCart, Check, Printer, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const statusLabels: Record<string, { label: string; class: string }> = {
  pendente: { label: 'Pendente', class: 'bg-yellow-100 text-yellow-800' },
  aprovado: { label: 'Aprovado', class: 'bg-green-100 text-green-800' },
  recusado: { label: 'Recusado', class: 'bg-red-100 text-red-800' },
  convertido: { label: 'Convertido em Venda', class: 'bg-blue-100 text-blue-800' },
};

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await api.get(`/quotes/${id}`);
      setQuote(res.data);
    } catch {
      alert('Erro ao carregar orçamento');
      navigate('/quotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = async (status: string) => {
    setStatusUpdating(true);
    try {
      await api.put(`/quotes/${id}`, { status });
      await load();
    } catch {
      alert('Erro ao atualizar status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const convertToSale = async () => {
    if (!confirm('Converter este orçamento em venda? Isso dará baixa no estoque.')) return;
    setConverting(true);
    try {
      const res = await api.post(`/quotes/${id}/convert`, { payment_method: 'pix' });
      navigate(`/sales`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao converter orçamento');
    } finally {
      setConverting(false);
    }
  };

  const generatePDF = async () => {
    if (!quote) return;
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('ORÇAMENTO', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nº ${quote.quote_number}`, pageWidth / 2, 27, { align: 'center' });
      doc.text(`Data: ${new Date(quote.created_at!).toLocaleDateString('pt-BR')}`, pageWidth / 2, 33, { align: 'center' });
      doc.text(`Validade: ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('pt-BR') : 'N/A'}`, pageWidth / 2, 39, { align: 'center' });

      doc.setDrawColor(200, 200, 200);
      doc.line(14, 44, pageWidth - 14, 44);

      let y = 52;
      if (quote.customer_name) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Cliente:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.customer_name, 40, y);
        y += 7;
        if (quote.customer_document) {
          doc.text(`Doc: ${quote.customer_document}`, 40, y);
          y += 7;
        }
        if (quote.customer_email) {
          doc.text(`Email: ${quote.customer_email}`, 40, y);
          y += 7;
        }
        y += 5;
      }

      doc.line(14, y, pageWidth - 14, y);
      y += 5;

      const tableBody = quote.items.map(item => [
        item.product_code || '',
        item.product_name || `Produto #${item.product_id}`,
        item.quantity.toString(),
        formatCurrency(item.unit_price),
        formatCurrency(item.total_price),
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Código', 'Produto', 'Qtd', 'Preço Un.', 'Total']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 70 },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' },
        },
        margin: { left: 14, right: 14 },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 8;

      doc.setFontSize(10);
      doc.text(`Subtotal: ${formatCurrency(quote.subtotal)}`, pageWidth - 14, finalY, { align: 'right' });
      if (quote.discount > 0) {
        doc.text(`Desconto: -${formatCurrency(quote.discount)}`, pageWidth - 14, finalY + 6, { align: 'right' });
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Total: ${formatCurrency(quote.total)}`, pageWidth - 14, finalY + 14, { align: 'right' });

      if (quote.notes) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Observações: ${quote.notes}`, 14, finalY + 28);
      }

      const statusText = `Status: ${statusLabels[quote.status]?.label || quote.status}`;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(statusText, pageWidth / 2, 285, { align: 'center' });
      doc.text('Gerado por Construtor 2026', pageWidth / 2, 290, { align: 'center' });

      doc.save(`orcamento-${quote.quote_number}.pdf`);
    } catch (err) {
      alert('Erro ao gerar PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const sendByEmail = () => {
    if (!quote) return;
    const subject = encodeURIComponent(`Orçamento ${quote.quote_number} - Construtor 2026`);
    const itemsText = quote.items.map(i =>
      `${i.product_name} | Qtd: ${i.quantity} | Preço: ${formatCurrency(i.unit_price)} | Total: ${formatCurrency(i.total_price)}`
    ).join('%0A');
    const body = encodeURIComponent(
      `Olá${quote.customer_name ? ` ${quote.customer_name}` : ''},%0A%0A` +
      `Segue o orçamento nº ${quote.quote_number}:%0A%0A` +
      `${itemsText}%0A%0A` +
      `Subtotal: ${formatCurrency(quote.subtotal)}%0A` +
      `Desconto: ${formatCurrency(quote.discount)}%0A` +
      `Total: ${formatCurrency(quote.total)}%0A%0A` +
      `Validade: ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('pt-BR') : 'N/A'}%0A%0A` +
      (quote.notes ? `Obs: ${quote.notes}%0A%0A` : '') +
      `Atenciosamente,%0AConstrutor 2026`
    );
    window.open(`mailto:${quote.customer_email || ''}?subject=${subject}&body=${body}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/quotes')} className="p-2 hover:bg-gray-100 rounded-lg touch-manipulation">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title">{quote.quote_number}</h1>
            <p className="text-gray-500 mt-1">
              {quote.customer_name || 'Sem cliente'} &mdash; {new Date(quote.created_at!).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={generatePDF} disabled={generatingPdf} className="btn-primary flex items-center gap-2 touch-manipulation">
            {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {generatingPdf ? 'Gerando...' : 'Gerar PDF'}
          </button>
          <button onClick={sendByEmail} className="btn-secondary flex items-center gap-2 touch-manipulation">
            <Mail className="w-4 h-4" /> Enviar por Email
          </button>
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-2 touch-manipulation">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card" ref={printRef}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">ORÇAMENTO</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Nº {quote.quote_number} | Emissão: {new Date(quote.created_at!).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusLabels[quote.status]?.class || 'bg-gray-100 text-gray-800'}`}>
                {statusLabels[quote.status]?.label || quote.status}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Dados do Cliente</h3>
              {quote.customer_name ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Nome:</span> {quote.customer_name}</div>
                  {quote.customer_document && <div><span className="text-gray-500">Doc:</span> {quote.customer_document}</div>}
                  {quote.customer_email && <div><span className="text-gray-500">Email:</span> {quote.customer_email}</div>}
                  {quote.customer_phone && <div><span className="text-gray-500">Telefone:</span> {quote.customer_phone}</div>}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Nenhum cliente vinculado</p>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Validade</h3>
              <p className="text-sm">{quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('pt-BR') : 'Sem data de validade'}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-3 py-2 text-left text-gray-500">Código</th>
                    <th className="px-3 py-2 text-left text-gray-500">Produto</th>
                    <th className="px-3 py-2 text-right text-gray-500">Qtd</th>
                    <th className="px-3 py-2 text-right text-gray-500">Preço Un.</th>
                    <th className="px-3 py-2 text-right text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {quote.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-xs font-mono text-gray-500">{item.product_code || '---'}</td>
                      <td className="px-3 py-2 font-medium">{item.product_name}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4 space-y-1 text-sm">
              <div className="flex justify-end">
                <span className="w-32 text-gray-500">Subtotal:</span>
                <span className="w-28 text-right">{formatCurrency(quote.subtotal)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-end">
                  <span className="w-32 text-gray-500">Desconto:</span>
                  <span className="w-28 text-right text-red-500">-{formatCurrency(quote.discount)}</span>
                </div>
              )}
              <div className="flex justify-end text-lg font-bold">
                <span className="w-32">Total:</span>
                <span className="w-28 text-right">{formatCurrency(quote.total)}</span>
              </div>
            </div>

            {quote.notes && (
              <div className="border-t border-gray-200 mt-4 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Observações</h3>
                <p className="text-sm text-gray-600">{quote.notes}</p>
              </div>
            )}

            <div className="border-t border-gray-200 mt-4 pt-4 text-center text-xs text-gray-400">
              Gerado por Construtor 2026
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="card-header">Status</h3>
            <div className="space-y-2">
              {['pendente', 'aprovado', 'recusado'].map(s => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={statusUpdating || quote.status === s || quote.status === 'convertido'}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors touch-manipulation ${
                    quote.status === s
                      ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Check className={`w-4 h-4 inline mr-2 ${quote.status === s ? 'text-primary-600' : 'text-gray-300'}`} />
                  {statusLabels[s]?.label || s}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="card-header">Ações</h3>
            <div className="space-y-2">
              <button
                onClick={convertToSale}
                disabled={converting || quote.status === 'convertido'}
                className="btn-primary w-full flex items-center justify-center gap-2 touch-manipulation"
              >
                {converting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Convertendo...</>
                ) : (
                  <><ShoppingCart className="w-4 h-4" /> Converter em Venda</>
                )}
              </button>
              <p className="text-xs text-gray-400 text-center">
                {quote.status === 'convertido'
                  ? 'Orçamento já convertido'
                  : 'Converte em venda e dá baixa no estoque'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .card { box-shadow: none; border: 1px solid #e5e7eb; break-inside: avoid; }
          button, .btn-primary, .btn-secondary, nav, header { display: none !important; }
          @page { margin: 15mm; }
        }
      `}</style>
    </div>
  );
}
