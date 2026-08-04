import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/common/Modal';
import { Alert } from '@/components/common/Alert';
import { Button } from '@/components/template';
import { FormLabel } from '@/components/common/FormLabel';
import { ptApi, getApiErrorMessage } from '@/services/pt.service';
import { TraineeListItem } from '@/types/pt';

interface AssignProgramModalProps {
  open: boolean;
  programId: string;
  onClose: () => void;
  onAssigned: () => void;
}

export const AssignProgramModal: React.FC<AssignProgramModalProps> = ({
  open,
  programId,
  onClose,
  onAssigned,
}) => {
  const { t } = useTranslation();
  const [trainees, setTrainees] = useState<TraineeListItem[]>([]);
  const [traineeId, setTraineeId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const result = await ptApi.getTrainees({ status: 'active', limit: 100 });
        setTrainees(result.items);
      } catch (err) {
        setError(getApiErrorMessage(err, 'pt.errors.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [open]);

  const handleAssign = async () => {
    if (!traineeId) return;
    setIsSubmitting(true);
    setError('');
    try {
      await ptApi.assignProgram(programId, { traineeId });
      onAssigned();
      onClose();
      setTraineeId('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'pt.errors.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} title={t('pt.assign.title')} onClose={onClose}>
      {error && <Alert type="error" message={error} />}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('pt.assign.desc')}</p>
        <div>
          <FormLabel htmlFor="trainee-select" required>
            {t('pt.assign.trainee')}
          </FormLabel>
          <select
            id="trainee-select"
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={traineeId}
            onChange={(e) => setTraineeId(e.target.value)}
            disabled={isLoading}
          >
            <option value="">{t('pt.assign.selectTrainee')}</option>
            {trainees.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {[tr.firstName, tr.lastName].filter(Boolean).join(' ') || tr.email}
              </option>
            ))}
          </select>
        </div>
        <Button
          className="w-full"
          onClick={() => void handleAssign()}
          disabled={!traineeId || isSubmitting}
          isLoading={isSubmitting}
        >
          {t('pt.assign.submit')}
        </Button>
      </div>
    </Modal>
  );
};
