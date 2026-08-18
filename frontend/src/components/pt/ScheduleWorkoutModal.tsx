import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button, Input } from '@/components/template';
import { FormLabel } from '@/components/common/FormLabel';
import { Badge } from '@/components/ui/badge';

type ScheduleWorkoutModalProps = {
  open: boolean;
  workoutName: string;
  onClose: () => void;
  onSubmit: (dates: string[]) => Promise<void>;
};

export const ScheduleWorkoutModal: React.FC<ScheduleWorkoutModalProps> = ({
  open,
  workoutName,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [dates, setDates] = useState<string[]>([]);
  const [pickerDate, setPickerDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addDate = () => {
    if (!pickerDate || dates.includes(pickerDate)) return;
    setDates((prev) => [...prev, pickerDate].sort());
    setPickerDate('');
  };

  const removeDate = (date: string) => {
    setDates((prev) => prev.filter((d) => d !== date));
  };

  const handleSubmit = async () => {
    if (dates.length === 0) {
      setError(t('pt.schedule.dateRequired'));
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit(dates);
      setDates([]);
      onClose();
    } catch {
      setError(t('pt.errors.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('pt.schedule.title')}>
      <p className="mb-4 text-sm text-muted-foreground">
        {t('pt.schedule.desc', { name: workoutName })}
      </p>
      <div className="space-y-4">
        <div>
          <FormLabel htmlFor="schedule-date">{t('pt.schedule.pickDate')}</FormLabel>
          <div className="mt-1 flex gap-2">
            <Input
              id="schedule-date"
              type="date"
              value={pickerDate}
              onChange={(e) => setPickerDate(e.target.value)}
            />
            <Button type="button" variant="secondary" onClick={addDate}>
              {t('pt.schedule.addDate')}
            </Button>
          </div>
        </div>

        {dates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {dates.map((date) => (
              <Badge key={date} variant="secondary" className="gap-1 pr-1">
                <Calendar className="h-3 w-3" />
                {date}
                <button
                  type="button"
                  className="ml-1 rounded-full px-1 hover:bg-muted"
                  onClick={() => removeDate(date)}
                  aria-label={t('pt.schedule.removeDate')}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('pt.schedule.empty')}</p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('pt.common.back')}
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? t('pt.schedule.submitting') : t('pt.schedule.submit')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
