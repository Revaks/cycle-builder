import NumberInput from './NumberInput';
import type { ComputedGroup } from '../domain/types';
import { formatKg } from '../utils/format';

interface GroupEditorProps {
  group: ComputedGroup;
  index: number;
  onUpdate: (patch: Partial<Pick<ComputedGroup, 'percent' | 'reps' | 'sets'>>) => void;
  onRemove: () => void;
}

export default function GroupEditor({ group, index, onUpdate, onRemove }: GroupEditorProps) {
  return (
    <div className="group-editor">
      <div className="group-fields">
        <label className="field">
          <span>Подходы</span>
          <NumberInput
            label={`Подходы группы ${index + 1}`}
            value={group.sets}
            min={1}
            max={20}
            step={1}
            onChange={(value) => onUpdate({ sets: value ?? group.sets })}
          />
        </label>
        <label className="field">
          <span>Повторы</span>
          <NumberInput
            label={`Повторы группы ${index + 1}`}
            value={group.reps}
            min={1}
            max={100}
            step={1}
            onChange={(value) => onUpdate({ reps: value ?? group.reps })}
          />
        </label>
        <label className="field">
          <span>Процент</span>
          <NumberInput
            label={`Процент группы ${index + 1}`}
            value={group.percent}
            min={0}
            max={100}
            step={1}
            suffix="%"
            onChange={(value) => onUpdate({ percent: value ?? group.percent })}
          />
        </label>
      </div>
      <div className="group-live">
        <span>Рабочий вес</span>
        <strong>{formatKg(group.weight)}</strong>
      </div>
      <button type="button" className="text-button text-button-danger" onClick={onRemove}>
        Удалить группу
      </button>
    </div>
  );
}
