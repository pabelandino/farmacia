import { useState } from 'react';
import { hasPermission } from '@farmaplus/domain';
import { api } from '../api/client';
import { getUser } from '../api/session';
import { LABELS } from '../constants/labels';
import { useFeedback } from '../hooks/useFeedback';
import { ConfirmModal } from './ConfirmModal';
import { SubmitButton } from './SubmitButton';

export function VoidInvoiceButton({
  id,
  number,
  status,
  onVoided,
}: {
  id: number;
  number?: number;
  status: string;
  onVoided?: () => void;
}) {
  const { catchError, toastSuccess } = useFeedback();
  const [open, setOpen] = useState(false);
  const [voiding, setVoiding] = useState(false);
  if (status === 'VOID' || !hasPermission(getUser(), 'voidInvoice')) return null;

  const title = number ? `${LABELS.voidConfirmTitle} Nº ${number}` : LABELS.voidConfirmTitle;

  async function confirmVoid() {
    setVoiding(true);
    try {
      await api(`/api/invoices/${id}/void`, { method: 'POST' });
      toastSuccess(LABELS.invoiceVoided);
      setOpen(false);
      onVoided?.();
    } catch (err) {
      catchError(err, LABELS.voidFailed);
    } finally {
      setVoiding(false);
    }
  }

  return (
    <>
      <SubmitButton type="button" variant="danger" className="px-3 py-1.5" onClick={() => setOpen(true)}>
        {LABELS.void}
      </SubmitButton>
      <ConfirmModal
        open={open}
        title={title}
        lead={LABELS.voidConfirmLead}
        description={LABELS.voidConfirm}
        confirmLabel={LABELS.voidConfirmAction}
        tone="danger"
        loading={voiding}
        onConfirm={confirmVoid}
        onClose={() => { if (!voiding) setOpen(false); }}
      />
    </>
  );
}
