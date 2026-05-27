import { useEffect, useMemo, useState } from 'react';

export const MERCH_CATEGORIES = [
  {
    id: 'apparel',
    label: 'APPAREL',
    title: 'Apparel',
    description: 'Textile club, tees et hoodies',
    accent: '#75A7D8',
  },
  {
    id: 'accessories',
    label: 'ACCESSOIRES',
    title: 'Accessoires',
    description: 'Cartes, poignets et détails utiles',
    accent: '#DF575E',
  },
  {
    id: 'equipment',
    label: 'ÉQUIPEMENT',
    title: 'Équipement',
    description: 'Raquettes et training gear',
    accent: '#E2AD56',
  },
];

export const MERCH_FILTERS = {
  apparel: [
    { id: 'all', label: 'Tout', test: () => true },
    { id: 'tshirts', label: 'T-shirts', test: p => /t-shirt|polo/i.test(`${p.title} ${p.product_type}`) },
    { id: 'hoodies', label: 'Hoodies', test: p => /hoodie/i.test(`${p.title} ${p.product_type}`) },
    { id: 'kids', label: 'Kids', test: p => /kids/i.test(p.title) },
    { id: 'icons', label: 'Icons', test: p => /icons collection/i.test(p.tags) },
    { id: 'club', label: 'Le Club', test: p => /le club collection/i.test(p.tags) },
    { id: 'xmas', label: 'Xmas', test: p => /xmas collection/i.test(p.tags) },
  ],
  accessories: [
    { id: 'all', label: 'Tout', test: () => true },
    { id: 'gift', label: 'Cartes', test: p => /gift cards|carte cadeau|credit/i.test(`${p.product_type} ${p.title}`) },
    { id: 'poignet', label: 'Poignet', test: p => /serre-poignet/i.test(p.title) },
  ],
  equipment: [
    { id: 'all', label: 'Tout', test: () => true },
    { id: 'rackets', label: 'Raquettes', test: p => /raquette/i.test(p.title) },
    { id: 'training', label: 'Training', test: p => /tapis|yoga/i.test(p.title) },
  ],
};

export function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const text = csvText.replace(/^\uFEFF/, '');

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r') {
      // Windows line endings are ignored.
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].length > 0));
}

function getMerchCategory(product) {
  const title = (product.title || '').toLowerCase();
  const type = (product.product_type || '').toLowerCase();

  if (title.includes('raquette débutant') || title.includes('tapis de yoga')) {
    return 'equipment';
  }

  if (type.includes('gift cards') || title.includes('carte cadeau') || title.includes('credit') || title.includes('serre-poignet')) {
    return 'accessories';
  }

  return 'apparel';
}

function cleanProductTitle(title) {
  return (title || '')
    .replace(/\s*\|\s*/g, ' ')
    .replace(/^t-shirt\s+i\s+/i, 'T-shirt ')
    .replace(/^kids t-shirt\s+i\s+/i, 'Kids ')
    .replace(/^hoodie\s+/i, 'Hoodie ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatPrice(min, max) {
  const a = parseFloat(min);
  const b = parseFloat(max);
  if (!Number.isFinite(a)) return '';
  const fmt = n => (n % 1 === 0 ? `${n}€` : `${n.toFixed(2)}€`);
  if (!Number.isFinite(b) || a === b) return fmt(a);
  return `${fmt(a)} - ${fmt(b)}`;
}

export function parseProducts(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length === 0) return [];
  const headers = rows.shift().map(h => h.trim());

  return rows
    .map(cells => headers.reduce((obj, h, i) => {
      obj[h] = (cells[i] || '').trim();
      return obj;
    }, {}))
    .filter(row => row.type === 'product' && row.title)
    .map(row => ({
      ...row,
      category: getMerchCategory(row),
      displayTitle: cleanProductTitle(row.title),
      priceLabel: formatPrice(row.price_min, row.price_max),
      isAvailable: row.available === 'true',
    }));
}

export function useMerchCatalog() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('Chargement...');

  useEffect(() => {
    let cancelled = false;

    fetch('/data/pingpang_data.csv')
      .then(response => {
        if (!response.ok) throw new Error('CSV introuvable');
        return response.text();
      })
      .then(text => {
        if (cancelled) return;
        const parsed = parseProducts(text);
        setProducts(parsed);
        setStatus(parsed.length === 0 ? 'Aucun produit' : '');
      })
      .catch(() => {
        if (!cancelled) setStatus('Impossible de charger les produits');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const byCategory = useMemo(() => MERCH_CATEGORIES.reduce((acc, category) => {
    acc[category.id] = products.filter(product => product.category === category.id);
    return acc;
  }, {}), [products]);

  return { products, byCategory, status };
}
