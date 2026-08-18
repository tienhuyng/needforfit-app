import React, { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { TraineeLayout } from '@/components/trainee/TraineeLayout';
import { Alert } from '@/components/common/Alert';
import { Button, Card, CardContent } from '@/components/template';
import { traineeApi, getApiErrorMessage } from '@/services/trainee.service';
import { createAddExercisesSchema, AddExercisesFormData } from '@/utils/pt-validation';
import { sessionExercisesToFormBlocks } from '@/utils/exercise-blocks';
import {
  BlockExercisesEditor,
  defaultBlock,
  defaultExercise,
} from '@/pages/pt/AddExercisesPage';

export const TraineeAddExercisesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { programId, sessionId } = useParams<{ programId: string; sessionId: string }>();
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [dragBlockIndex, setDragBlockIndex] = useState<number | null>(null);

  const schema = createAddExercisesSchema(t);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<AddExercisesFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      blocks: [{ ...defaultBlock }],
    },
  });

  const {
    fields: blockFields,
    append: appendBlock,
    remove: removeBlock,
    move: moveBlock,
  } = useFieldArray({
    control,
    name: 'blocks',
  });

  useEffect(() => {
    if (!programId || !sessionId) {
      setIsPageLoading(false);
      return;
    }

    const load = async () => {
      setError('');
      setIsPageLoading(true);
      try {
        const session = await traineeApi.getProgramSession(programId, sessionId);
        const blocks = sessionExercisesToFormBlocks(
          session.exercises.map((e) => ({
            exerciseName: e.exerciseName,
            plannedSets: e.plannedSets,
            plannedReps: e.plannedReps,
            plannedWeightKg: e.plannedWeightKg,
            restSeconds: e.restSeconds,
            notes: e.notes,
            orderIndex: 0,
            blockIndex: 0,
            blockType: 'normal',
          }))
        );
        reset({ blocks: blocks.length > 0 ? blocks : [{ ...defaultBlock }] });
      } catch (err) {
        setError(getApiErrorMessage(err, 'trainee.errors.loadFailed'));
      } finally {
        setIsPageLoading(false);
      }
    };

    void load();
  }, [programId, sessionId, reset]);

  const onSubmit = async (data: AddExercisesFormData) => {
    if (!programId || !sessionId) return;
    setError('');
    setIsSaving(true);
    try {
      await traineeApi.addSelfExercises(programId, sessionId, { blocks: data.blocks });
      navigate(`/trainee/programs/${programId}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'trainee.errors.loadFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlockDrop = (targetIndex: number) => {
    if (dragBlockIndex === null || dragBlockIndex === targetIndex) {
      setDragBlockIndex(null);
      return;
    }
    moveBlock(dragBlockIndex, targetIndex);
    setDragBlockIndex(null);
  };

  return (
    <TraineeLayout title={t('pt.exercises.title')} hideNav>
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardContent className="pt-6">
            {error && <Alert type="error" message={error} />}
            {isPageLoading ? (
              <p className="text-muted-foreground">{t('trainee.common.loading')}</p>
            ) : (
              <>
                {errors.blocks?.message && (
                  <Alert type="error" message={errors.blocks.message} />
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                  {blockFields.map((block, blockIndex) => (
                    <BlockExercisesEditor
                      key={block.id}
                      blockIndex={blockIndex}
                      register={register}
                      control={control}
                      errors={errors}
                      canRemoveBlock={blockFields.length > 1}
                      onRemoveBlock={() => removeBlock(blockIndex)}
                      setValue={setValue}
                      getValues={getValues}
                      t={t}
                      isDragging={dragBlockIndex === blockIndex}
                      onDragHandleStart={() => setDragBlockIndex(blockIndex)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleBlockDrop(blockIndex)}
                      onDragEnd={() => setDragBlockIndex(null)}
                    />
                  ))}

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() =>
                      appendBlock({ ...defaultBlock, exercises: [{ ...defaultExercise }] })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('pt.exercises.addBlock')}
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isSubmitting || isSaving}
                  >
                    {isSubmitting || isSaving
                      ? t('pt.exercises.submitting')
                      : t('pt.exercises.submit')}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </TraineeLayout>
  );
};
