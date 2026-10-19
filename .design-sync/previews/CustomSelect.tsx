import { useEffect, useRef, useState } from 'react';
import { CustomSelect } from 'adn-mens-sana-ui';

const CATEGORIAS = [
  { value: 'primera', label: 'Primera' },
  { value: 'reserva', label: 'Reserva' },
  { value: 'cuarta', label: '4ta división' },
  { value: 'quinta', label: '5ta división' },
];

export const Default = () => {
  const [v, setV] = useState('reserva');
  return <CustomSelect className="w-64" value={v} onChange={setV} options={CATEGORIAS} />;
};

export const Placeholder = () => {
  const [v, setV] = useState('');
  return <CustomSelect className="w-64" value={v} onChange={setV} options={CATEGORIAS} placeholder="Elegí una categoría" />;
};

// The menu opens on click (internal state); the preview clicks it once on mount.
const Opened = ({ searchable }: { searchable?: boolean }) => {
  const [v, setV] = useState('reserva');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector('button')?.click();
  }, []);
  return (
    <div ref={ref} className="h-72">
      <CustomSelect className="w-64" value={v} onChange={setV} options={CATEGORIAS} searchable={searchable} />
    </div>
  );
};

export const Open = () => <Opened />;
export const Searchable = () => <Opened searchable />;

export const Disabled = () => (
  <CustomSelect className="w-64" value="primera" onChange={() => {}} options={CATEGORIAS} disabled />
);
