// =====================================================================
// PING PANG PARIS — Boutique (version simple : images + prix)
// Charge le catalogue depuis /data/pingpang_data.csv et affiche une grille
// d'articles avec leur image et leur prix. Tap → ouverture du produit sur
// pingpang.paris dans un nouvel onglet.
// =====================================================================

import { useEffect, useState } from 'react';
import { C, fontDisplay, fontSans, kicker } from '../theme';
import Card from '../components/Card';

const PRODUCT_LIMIT = 20;

// Parser CSV multi-ligne (gère les guillemets et retours à la ligne dans les cellules).
function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const text = csvText.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') { cell += '"'; i += 1; }
      else if (ch === '"') { quoted = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') { quoted = true; }
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\r') { /* skip */ }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else { cell += ch; }
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].length > 0));
}

function parseProducts(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length === 0) return [];
  const headers = rows.shift().map(h => h.trim());
  return rows.map(cells => headers.reduce((obj, h, i) => {
    obj[h] = (cells[i] || '').trim();
    return obj;
  }, {})).filter(r => r.type === 'product' && r.title);
}

function formatPrice(min, max) {
  const a = parseFloat(min);
  const b = parseFloat(max);
  if (!Number.isFinite(a)) return '';
  const fmt = n => (n % 1 === 0 ? `${n}\u00A0€` : `${n.toFixed(2)}\u00A0€`);
  if (!Number.isFinite(b) || a === b) return fmt(a);
  return `${fmt(a)} – ${fmt(b)}`;
}

function ProductTile({ product }) {
  const openProduct = () => {
    if (product.url) window.open(product.url, '_blank', 'noopener,noreferrer');
  };
  return (
    <button onClick={openProduct} style={{
      all: 'unset', cursor: product.url ? 'pointer' : 'default',
      display: 'block', width: '100%',
    }}>
      <Card style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          width: '100%', aspectRatio: '1 / 1', borderRadius: 14,
          overflow: 'hidden', background: '#10251d',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {product.main_image_url ? (
            <img src={product.main_image_url} alt={product.title} loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ color: C.inkFaint, fontSize: 11 }}>NO IMAGE</span>
          )}
        </div>
        <div style={{
          fontFamily: fontSans, fontWeight: 700, fontSize: 12.5,
          color: C.ink, lineHeight: 1.25,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>{product.title}</div>
        <div style={{
          fontFamily: fontSans, fontWeight: 700, fontSize: 13,
          color: C.cream, letterSpacing: '0.04em',
        }}>{formatPrice(product.price_min, product.price_max)}</div>
      </Card>
    </button>
  );
}

export default function MerchScreen() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('Chargement…');

  useEffect(() => {
    let cancelled = false;
    fetch('/data/pingpang_data.csv')
      .then(r => { if (!r.ok) throw new Error('CSV introuvable'); return r.text(); })
      .then(text => {
        if (cancelled) return;
        const parsed = parseProducts(text);
        setProducts(parsed.slice(0, PRODUCT_LIMIT));
        setStatus(parsed.length === 0 ? 'Aucun produit' : '');
      })
      .catch(() => { if (!cancelled) setStatus('Impossible de charger les produits'); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ padding: '20px 18px 130px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={kicker}>BOUTIQUE</div>
        <div style={{
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 50, lineHeight: 0.95,
          color: C.ink, letterSpacing: '0.02em', marginTop: 6,
        }}>SHOP</div>
        <div style={{
          fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 8, lineHeight: 1.5,
        }}>Articles Ping Pang Paris — appuie sur un article pour l'acheter.</div>
      </div>

      {status ? (
        <div style={{
          padding: '40px 16px', textAlign: 'center',
          fontFamily: fontSans, fontSize: 13, color: C.inkDim,
        }}>{status}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {products.map(p => (
            <ProductTile key={p.id || p.handle || p.title} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
