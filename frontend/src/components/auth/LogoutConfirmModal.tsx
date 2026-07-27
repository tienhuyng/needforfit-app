import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/template';

interface LogoutConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal open={open} title={t('auth.logoutConfirm.title')} onClose={onClose}>
      <p className="text-sm text-muted-foreground">{t('auth.logoutConfirm.message')}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('auth.logoutConfirm.cancel')}
        </Button>
        <Button type="button" variant="danger" onClick={handleConfirm}>
          {t('auth.logoutConfirm.confirm')}
        </Button>
      </div>
    </Modal>
  );
};
