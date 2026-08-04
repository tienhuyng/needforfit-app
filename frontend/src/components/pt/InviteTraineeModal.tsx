import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/common/Modal';
import { Button, Input } from '@/components/template';
import { Alert } from '@/components/common/Alert';
import { getApiErrorMessage, ptApi } from '@/services/pt.service';

interface InviteTraineeModalProps {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}

export const InviteTraineeModal: React.FC<InviteTraineeModalProps> = ({
  open,
  onClose,
  onInvited,
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await ptApi.inviteTrainee(email.trim());
      setEmail('');
      onInvited();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'pt.errors.inviteFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open={open} title={t('pt.invite.title')} onClose={onClose}>
      <p className="text-sm text-muted-foreground">{t('pt.invite.subtitle')}</p>
      {error && <Alert type="error" message={error} />}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Input
          label={t('pt.invite.email')}
          labelRequired
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="trainee@example.com"
          required
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('pt.invite.cancel')}
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {t('pt.invite.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
