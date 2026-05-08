/** Метаданные категории: ключ, цвет, подпись, опциональные флаги. */
const categories_array = [
  { key: 'Motion', color: '#4C97FF', text: 'Motion' },
  { key: 'Looks', color: '#9966FF', text: 'Looks' },
  { key: 'Sound', color: '#CF63CF', text: 'Sound' },
  { key: 'Events', color: '#FFBF00', text: 'Events' },
  { key: 'Control', color: '#FFAB19', text: 'Control' },
];

const categories_map = new Map(categories_array.map(c => [c.key, c]));
export { categories_array, categories_map };
