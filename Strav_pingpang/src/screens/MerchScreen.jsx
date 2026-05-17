import { useEffect, useMemo, useState } from 'react';
import { C, fontDisplay, fontSans, kicker, btnPrimary } from '../theme';
import Card from '../components/Card';

const PRODUCT_LIMIT = 10;

// Multi-line aware CSV parser: handles quoted fields containing commas AND newlines.
function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const text = csvText.replace(/^﻿/, '');

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

function parseProductsCsv(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length === 0) return [];
  const headers = rows.shift().map(h => h.trim());
  return rows.map(cells => {
    return headers.reduce((obj, header, idx) => {
      obj[header] = (cells[idx] || '').trim();
      return obj;
    }, {});
  }).filter(r => r.type === 'product' && r.title);
}

function splitPipe(s) {
  return s ? s.split('|').map(x => x.trim()).filter(Boolean) : [];
}

function formatPrice(min, max) {
  const a = parseFloat(min);
  const b = parseFloat(max);
  if (!Number.isFinite(a)) return '';
  const fmt = n => (n % 1 === 0 ? `${n}€` : `${n.toFixed(2)}€`);
  if (!Number.isFinite(b) || a === b) return fmt(a);
  return `${fmt(a)} – ${fmt(b)}`;
}

function ProductCard({ product, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        all: 'unset', cursor: 'pointer', display: 'block', width: '100%',
      }}
    >
      <Card style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          width: '100%', aspectRatio: '1 / 1', borderRadius: 14,
          overflow: 'hidden', background: '#10251d',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {product.main_image_url ? (
            <img
              src={product.main_image_url}
              alt={product.title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
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

function ProductDetail({ product, onBack }) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = useMemo(() => splitPipe(product.image_urls), [product]);
  const colors = useMemo(() => splitPipe(product.colors), [product]);
  const sizes = useMemo(() => splitPipe(product.sizes), [product]);
  const hero = images[imgIdx] || product.main_image_url;
  const desc = product.description_text || product.meta_description || '';

  return (
    <div style={{ padding: '14px 18px 140px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button
        onClick={onBack}
        style={{
          all: 'unset', cursor: 'pointer',
          fontFamily: fontSans, fontSize: 12, fontWeight: 700,
          letterSpacing: '0.14em', color: C.mint,
        }}
      >← MERCH</button>

      <div style={{
        width: '100%', aspectRatio: '1 / 1', borderRadius: 18, overflow: 'hidden',
        background: '#10251d',
      }}>
        {hero && (
          <img src={hero} alt={product.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>

      {images.length > 1 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setImgIdx(i)}
              style={{
                all: 'unset', cursor: 'pointer',
                width: 56, height: 56, flexShrink: 0,
                borderRadius: 10, overflow: 'hidden',
                border: `2px solid ${i === imgIdx ? C.cream : 'transparent'}`,
              }}
            >
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}

      <div>
        <div style={kicker}>{product.product_type || 'PRODUIT'}</div>
        <div style={{
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 32, lineHeight: 1.05,
          color: C.ink, marginTop: 6,
        }}>{product.title}</div>
        <div style={{
          fontFamily: fontSans, fontWeight: 700, fontSize: 22,
          color: C.cream, marginTop: 8, letterSpacing: '0.02em',
        }}>{formatPrice(product.price_min, product.price_max)}</div>
      </div>

      {desc && (
        <Card>
          <div style={kicker}>DESCRIPTION</div>
          <div style={{
            marginTop: 10, fontFamily: fontSans, fontSize: 13.5, lineHeight: 1.55,
            color: C.inkDim,
          }}>{desc}</div>
        </Card>
      )}

      {(colors.length > 0 || sizes.length > 0) && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {colors.length > 0 && (
            <div>
              <div style={kicker}>COULEURS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {colors.map(col => (
                  <span key={col} style={{
                    padding: '6px 12px', borderRadius: 999,
                    border: `1px solid ${C.border}`, background: 'rgba(8,22,17,0.45)',
                    fontFamily: fontSans, fontSize: 11, fontWeight: 700,
                    color: C.ink, letterSpacing: '0.06em',
                  }}>{col}</span>
                ))}
              </div>
            </div>
          )}
          {sizes.length > 0 && (
            <div>
              <div style={kicker}>TAILLES</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {sizes.map(s => (
                  <span key={s} style={{
                    padding: '6px 12px', borderRadius: 8,
                    border: `1px solid ${C.border}`, background: 'rgba(8,22,17,0.45)',
                    fontFamily: fontSans, fontSize: 11, fontWeight: 700,
                    color: C.ink, letterSpacing: '0.06em', minWidth: 24, textAlign: 'center',
                  }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <a
        href={product.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...btnPrimary, textAlign: 'center', textDecoration: 'none', display: 'block', padding: '15px' }}
      >
        ACHETER SUR PINGPANG.PARIS →
      </a>
    </div>
  );
}

export default function MerchScreen() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('Chargement…');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('/data/pingpang_data.csv')
      .then(r => {
        if (!r.ok) throw new Error('CSV introuvable');
        return r.text();
      })
      .then(text => {
        const parsed = parseProductsCsv(text);
        setProducts(parsed.slice(0, PRODUCT_LIMIT));
        setStatus(parsed.length === 0 ? 'Aucun produit' : '');
      })
      .catch(() => setStatus('Impossible de charger les produits'));
  }, []);

  if (selected) {
    return <ProductDetail product={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div style={{ padding: '20px 18px 130px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={kicker}>MERCH</div>
        <div style={{
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 50, lineHeight: 0.95,
          color: C.ink, letterSpacing: '0.02em', marginTop: 6,
        }}>SHOP</div>
        <div style={{
          fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 8, lineHeight: 1.5,
        }}>Pièces Ping Pang Paris — apparel et accessoires.</div>
      </div>

      {status ? (
        <div style={{
          padding: '40px 16px', textAlign: 'center',
          fontFamily: fontSans, fontSize: 13, color: C.inkDim,
        }}>{status}</div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        }}>
          {products.map(p => (
            <ProductCard key={p.id || p.handle} product={p} onClick={() => setSelected(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
