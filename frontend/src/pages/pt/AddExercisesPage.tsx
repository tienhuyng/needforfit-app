import React, { useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { PageStickyHeader } from '@/components/common/PageStickyHeader';
import { PTLayout } from '@/components/pt/PTLayout';
import { Alert } from '@/components/common/Alert';
import { FormLabel } from '@/components/common/FormLabel';
import { Button, Card, CardContent, Input } from '@/components/template';
import { ptApi, getApiErrorMessage } from '@/services/pt.service';
import { createAddExercisesSchema, AddExercisesFormData } from '@/utils/pt-validation';
import { sessionExercisesToFormBlocks } from '@/utils/exercise-blocks';
import { cn } from '@/lib/utils';

const defaultExercise = {
  exerciseName: '',
  plannedSets: undefined,
  plannedReps: undefined,
  plannedWeightKg: undefined,
  restSeconds: undefined,
  notes: '',
};

const defaultBlock = {
  blockType: 'normal' as const,
  exercises: [{ ...defaultExercise }],
};

type BlockTypeUi = 'normal' | 'superset';

function isComboBlock(blockType: string): boolean {
  return blockType === 'superset' || blockType === 'dropset';
}

export const AddExercisesPage: React.FC = () => {
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
        const session = await ptApi.getSession(programId, sessionId);
        const blocks = sessionExercisesToFormBlocks(
          session.exercises.map((e) => ({
            exerciseName: e.exerciseName,
            plannedSets: e.plannedSets,
            plannedReps: e.plannedReps,
            plannedWeightKg: e.plannedWeightKg,
            restSeconds: e.restSeconds,
            notes: e.notes,
            orderIndex: e.orderIndex,
            blockIndex: e.blockIndex ?? 0,
            blockType: e.blockType ?? 'normal',
          }))
        );
        reset({ blocks });
      } catch (err) {
        setError(getApiErrorMessage(err, 'pt.errors.loadFailed'));
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
      await ptApi.addExercises(programId, sessionId, { blocks: data.blocks });
      navigate(`/pt/programs/${programId}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'pt.errors.createFailed'));
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
    <PTLayout>
      <PageStickyHeader
        backTo={programId ? `/pt/programs/${programId}` : '/pt/programs'}
        title={t('pt.exercises.title')}
        subtitle={t('pt.exercises.subtitle')}
      />

      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardContent className="pt-6">
            {error && <Alert type="error" message={error} />}
            {isPageLoading ? (
              <p className="text-muted-foreground">{t('pt.common.loading')}</p>
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
    </PTLayout>
  );
};

type BlockEditorProps = {
  blockIndex: number;
  register: ReturnType<typeof useForm<AddExercisesFormData>>['register'];
  control: ReturnType<typeof useForm<AddExercisesFormData>>['control'];
  errors: ReturnType<typeof useForm<AddExercisesFormData>>['formState']['errors'];
  canRemoveBlock: boolean;
  onRemoveBlock: () => void;
  setValue: ReturnType<typeof useForm<AddExercisesFormData>>['setValue'];
  getValues: ReturnType<typeof useForm<AddExercisesFormData>>['getValues'];
  t: (key: string, options?: Record<string, unknown>) => string;
  isDragging: boolean;
  onDragHandleStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
};

const BlockExercisesEditor: React.FC<BlockEditorProps> = ({
  blockIndex,
  register,
  control,
  errors,
  canRemoveBlock,
  onRemoveBlock,
  setValue,
  getValues,
  t,
  isDragging,
  onDragHandleStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  const blockType = useWatch({
    control,
    name: `blocks.${blockIndex}.blockType`,
    defaultValue: 'normal',
  });
  const combo = isComboBlock(blockType);

  const { fields, append, remove } = useFieldArray({
    control,
    name: `blocks.${blockIndex}.exercises`,
  });

  const blockTypeField = register(`blocks.${blockIndex}.blockType`);

  const handleBlockTypeChange = (uiValue: BlockTypeUi) => {
    setValue(`blocks.${blockIndex}.blockType`, uiValue, { shouldValidate: true, shouldDirty: true });
    if (uiValue === 'normal') {
      const current = getValues(`blocks.${blockIndex}.exercises`);
      setValue(`blocks.${blockIndex}.exercises`, [current[0] ?? { ...defaultExercise }], {
        shouldValidate: true,
      });
    }
  };

  const selectValue: BlockTypeUi = combo ? 'superset' : 'normal';

  return (
    <div
      className={cn(
        'space-y-4 rounded-lg border p-4',
        isDragging && 'border-primary/50 bg-muted/30'
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1 sm:max-w-xs">
          <FormLabel htmlFor={`blockType-${blockIndex}`}>{t('pt.exercises.blockType')}</FormLabel>
          <select
            id={`blockType-${blockIndex}`}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectValue}
            onChange={(e) => handleBlockTypeChange(e.target.value as BlockTypeUi)}
            onBlur={blockTypeField.onBlur}
            name={blockTypeField.name}
            ref={blockTypeField.ref}
          >
            <option value="normal">{t('pt.exercises.blockTypes.normal')}</option>
            <option value="superset">{t('pt.exercises.blockTypes.supersetDrop')}</option>
          </select>
        </div>
        <div className="flex shrink-0 items-center gap-1 pt-6">
          <button
            type="button"
            className="cursor-grab rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
            draggable
            onDragStart={onDragHandleStart}
            onDragEnd={onDragEnd}
            aria-label={t('pt.exercises.reorderBlock')}
          >
            <GripVertical className="h-5 w-5" />
          </button>
          {canRemoveBlock && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={onRemoveBlock}
              aria-label={t('pt.exercises.removeBlock')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {fields.map((field, exerciseIndex) => (
        <div key={field.id} className="space-y-3 rounded-md border border-dashed p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {t('pt.exercises.exerciseNumber', { number: exerciseIndex + 1 })}
            </h3>
            {combo && fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(exerciseIndex)}
                aria-label={t('pt.exercises.remove')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Input
            label={t('pt.exercises.name')}
            labelRequired
            error={errors.blocks?.[blockIndex]?.exercises?.[exerciseIndex]?.exerciseName?.message}
            {...register(`blocks.${blockIndex}.exercises.${exerciseIndex}.exerciseName`)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('pt.exercises.sets')}
              type="number"
              min={1}
              {...register(`blocks.${blockIndex}.exercises.${exerciseIndex}.plannedSets`)}
            />
            <Input
              label={t('pt.exercises.reps')}
              type="number"
              min={1}
              {...register(`blocks.${blockIndex}.exercises.${exerciseIndex}.plannedReps`)}
            />
            <Input
              label={t('pt.exercises.weight')}
              type="number"
              min={0}
              step="0.5"
              {...register(`blocks.${blockIndex}.exercises.${exerciseIndex}.plannedWeightKg`)}
            />
            <Input
              label={t('pt.exercises.rest')}
              type="number"
              min={1}
              {...register(`blocks.${blockIndex}.exercises.${exerciseIndex}.restSeconds`)}
            />
          </div>

          <Input
            label={t('pt.exercises.notes')}
            {...register(`blocks.${blockIndex}.exercises.${exerciseIndex}.notes`)}
          />
        </div>
      ))}

      {combo && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => append({ ...defaultExercise })}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t('pt.exercises.addExerciseToBlock')}
        </Button>
      )}
    </div>
  );
};
