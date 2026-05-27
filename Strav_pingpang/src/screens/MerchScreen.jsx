import { useMemo, useState } from 'react';
import { C, fontDisplay, fontSans, kicker } from '../theme';
import Card from '../components/Card';
import { MERCH_CATEGORIES, MERCH_FILTERS, useMerchCatalog } from '../lib/merchCatalog';

function AvailabilityPill({ available }) {
  if (available) return null;
  return (
    <div style={{
      position: 'absolute', top: 8, left: 8,
      padding: '3px 7px', borderRadius: 999,
      background: 'rgba(232,155,139,0.18)',
      border: '1px solid rgba(232,155,139,0.38)',
      color: C.loss,
      fontFamily: fontSans, fontSize: 8.5, fontWeight: 800,
      letterSpacing: '0.10em',
    }}>SOLD</div>
  );
}

function ProductTile({ product, accent, onSelect }) {
  return (
    <button onClick={() => onSelect(product)} style={{
      all: 'unset', cursor: 'pointer',
      display: 'block', minWidth: 0,
    }}>
      <Card style={{
        padding: 0, overflow: 'hidden', borderRadius: 14,
        minHeight: 210,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          position: 'relative',
          height: 130,
          background: `radial-gradient(80% 80% at 50% 20%, ${accent}33 0%, rgba(20,50,38,0) 70%), #112C22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <AvailabilityPill available={product.isAvailable} />
          {product.main_image_url ? (
            <img
              src={product.main_image_url}
              alt={product.displayTitle}
              loading="lazy"
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover',
                filter: product.isAvailable ? 'none' : 'saturate(0.5) opacity(0.72)',
              }}
            />
          ) : (
            <div style={{
              width: 62, height: 74, borderRadius: '42% 42% 8px 8px',
              background: `linear-gradient(180deg, ${accent}, #124638)`,
              border: `1px solid ${accent}`,
            }} />
          )}
        </div>

        <div style={{
          padding: '12px 12px 13px',
          background: 'rgba(8,22,17,0.22)',
          display: 'flex', flexDirection: 'column', gap: 4, flex: 1,
        }}>
          <div style={{
            fontFamily: fontSans, fontWeight: 800, fontSize: 11.5,
            color: C.ink, lineHeight: 1.22,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>{product.displayTitle}</div>
          <div style={{
            fontFamily: fontSans, fontSize: 9.5,
            color: C.inkDim, lineHeight: 1.2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{product.vendor || 'pingpang.paris'}</div>
          <div style={{
            fontFamily: fontSans, fontWeight: 900, fontSize: 13,
            color: C.warm, letterSpacing: '0.02em',
            marginTop: 'auto',
          }}>{product.priceLabel}</div>
        </div>
      </Card>
    </button>
  );
}

function FeaturedProduct({ product, accent, onSelect }) {
  if (!product) return null;

  return (
    <button
      onClick={() => onSelect(product)}
      style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
    >
      <Card style={{
        padding: 14, overflow: 'hidden',
        background: `linear-gradient(180deg, ${accent}22 0%, rgba(20,50,38,0.12) 58%), linear-gradient(180deg, #0E3A30 0%, #124638 100%)`,
        border: `1px solid ${accent}88`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...kicker, color: C.warm }}>BOUTIQUE</div>
            <div style={{
              fontFamily: fontDisplay, fontWeight: 800, fontSize: 28,
              color: C.ink, lineHeight: 0.95, letterSpacing: '0.04em',
              marginTop: 3,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{product.displayTitle}</div>
          </div>
          <div style={{
            flexShrink: 0,
            padding: '4px 10px', borderRadius: 999,
            fontFamily: fontSans, fontWeight: 900, fontSize: 9,
            letterSpacing: '0.10em',
            color: '#092C25', background: C.warm,
          }}>SIGNATURE</div>
        </div>

        <div style={{
          height: 178, borderRadius: 14, overflow: 'hidden',
          background: '#10251D', marginTop: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {product.main_image_url ? (
            <img src={product.main_image_url} alt={product.displayTitle} loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', marginTop: 12 }}>
          <div>
            <div style={{
              fontFamily: fontSans, fontWeight: 900, fontSize: 18,
              color: C.ink, lineHeight: 1,
            }}>{product.priceLabel}</div>
            <div style={{
              fontFamily: fontSans, fontSize: 9.5,
              color: C.inkDim, marginTop: 3,
            }}>{product.isAvailable ? 'En stock' : 'Rupture'}</div>
          </div>
          <div style={{
            padding: '8px 15px', borderRadius: 999,
            background: C.ink, color: '#092C25',
            fontFamily: fontSans, fontWeight: 900, fontSize: 10,
          }}>Voir</div>
        </div>
      </Card>
    </button>
  );
}

function ProductDetail({ product, onClose }) {
  if (!product) return null;

  return (
    <Card style={{
      padding: 14,
      display: 'grid',
      gridTemplateColumns: '82px 1fr',
      gap: 12,
      border: `1px solid ${C.borderHi}`,
    }}>
      <div style={{
        width: 82, height: 96, borderRadius: 13,
        overflow: 'hidden', background: '#10251D',
      }}>
        {product.main_image_url ? (
          <img src={product.main_image_url} alt={product.displayTitle}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : null}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'start',
          gap: 8,
        }}>
          <div style={{
            fontFamily: fontSans, fontWeight: 900, fontSize: 13,
            color: C.ink, lineHeight: 1.2,
          }}>{product.displayTitle}</div>
          <button onClick={onClose} style={{
            background: 'rgba(8,22,17,0.5)', border: `1px solid ${C.borderHi}`,
            color: C.inkDim, borderRadius: 8, width: 24, height: 24,
            fontFamily: fontSans, fontWeight: 900, cursor: 'pointer',
            flexShrink: 0,
          }}>×</button>
        </div>
        <div style={{
          fontFamily: fontSans, fontWeight: 900, fontSize: 15,
          color: C.warm, marginTop: 8,
        }}>{product.priceLabel}</div>
        <div style={{
          fontFamily: fontSans, fontSize: 11,
          color: C.inkDim, lineHeight: 1.45, marginTop: 7,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>{product.description_text || product.meta_description || 'Produit Ping Pang Paris.'}</div>
      </div>
    </Card>
  );
}

export default function MerchScreen({ initialCategory = 'apparel', standalone = false }) {
  const { byCategory, status } = useMerchCatalog();
  const safeInitialCategory = MERCH_CATEGORIES.some(category => category.id === initialCategory)
    ? initialCategory
    : 'apparel';
  const [categoryId, setCategoryId] = useState(safeInitialCategory);
  const [filterId, setFilterId] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const category = MERCH_CATEGORIES.find(item => item.id === categoryId) || MERCH_CATEGORIES[0];
  const filters = MERCH_FILTERS[category.id] || MERCH_FILTERS.apparel;
  const activeFilter = filters.find(filter => filter.id === filterId) || filters[0];
  const products = useMemo(
    () => (byCategory[category.id] || []).filter(product => activeFilter.test(product)),
    [activeFilter, byCategory, category.id],
  );
  const featured = products.find(product => product.isAvailable) || products[0];
  const gridProducts = category.id === 'equipment' && products.length > 2
    ? products.filter(product => product !== featured)
    : products;

  return (
    <div style={{ padding: `20px 18px ${standalone ? 34 : 130}px`, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ ...kicker, color: C.warm }}>BOUTIQUE</div>
        <div style={{
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 46, lineHeight: 0.95,
          color: C.ink, letterSpacing: '0.04em', marginTop: 4,
        }}>{category.label}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {MERCH_CATEGORIES.map(item => {
          const active = item.id === category.id;
          return (
            <button
              key={item.id}
              onClick={() => { setCategoryId(item.id); setFilterId('all'); setSelectedProduct(null); }}
              style={{
                border: active ? `1px solid ${C.warm}` : `1px solid ${C.borderHi}`,
                background: active ? C.warm : 'rgba(8,22,17,0.35)',
                color: active ? '#092C25' : C.ink,
                borderRadius: 999,
                padding: '7px 12px',
                fontFamily: fontSans,
                fontSize: 10,
                fontWeight: 900,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >{item.title}</button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2 }}>
        {filters.map(filter => {
          const active = filter.id === activeFilter.id;
          return (
            <button
              key={filter.id}
              onClick={() => setFilterId(filter.id)}
              style={{
                border: active ? `1px solid ${C.warm}` : `1px solid ${C.borderHi}`,
                background: active ? 'rgba(232,201,155,0.18)' : 'rgba(8,22,17,0.28)',
                color: active ? C.warm : C.inkDim,
                borderRadius: 999,
                padding: '6px 11px',
                fontFamily: fontSans,
                fontSize: 9.5,
                fontWeight: 800,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >{filter.label}</button>
          );
        })}
      </div>

      {status ? (
        <div style={{
          padding: '40px 16px', textAlign: 'center',
          fontFamily: fontSans, fontSize: 13, color: C.inkDim,
        }}>{status}</div>
      ) : products.length === 0 ? (
        <div style={{
          padding: '34px 16px', textAlign: 'center',
          fontFamily: fontSans, fontSize: 13, color: C.inkDim,
        }}>Aucun produit dans ce filtre.</div>
      ) : (
        <>
          <ProductDetail product={selectedProduct} onClose={() => setSelectedProduct(null)} />
          {category.id === 'equipment' && (
            <FeaturedProduct product={featured} accent={category.accent} onSelect={setSelectedProduct} />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {gridProducts.map(product => (
              <ProductTile key={product.id || product.handle || product.title} product={product} accent={category.accent} onSelect={setSelectedProduct} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
