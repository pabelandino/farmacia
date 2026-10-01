import { inputClass } from './formClasses';

export function SuggestInput({
  value,
  onChange,
  options,
  listId,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  listId: string;
  placeholder?: string;
}) {
  return (
    <>
      <input
        className={inputClass}
        list={listId}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}
