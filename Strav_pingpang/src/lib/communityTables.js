// =====================================================================
// PING PANG PARIS — Tables publiques ajoutées par la communauté
//
// Couche d'accès pour la fonctionnalité « ajouter une table par photo »
// du Finder. Lecture/écriture dans la table Supabase `community_tables`
// (via le client REST de supabaseClient.js) et upload de la photo dans le
// bucket Storage `table-photos` (via le SDK de supabase.js).
//
// Tout dégrade proprement si Supabase n'est pas configuré : les lectures
// renvoient [] et les écritures lèvent une erreur explicite côté UI.
// =====================================================================

import { selectRows, insertRow, isSupabaseConfigured } from './supabaseClient';
import { supabase } from './supabase';

const TABLE = 'community_tables';
const BUCKET = 'table-photos';

export { isSupabaseConfigured };

// --- Lecture ---------------------------------------------------------

// Renvoie les tables communautaires visibles (status != 'rejected'),
// normalisées au même format que les tables du CSV monde.
export async function listCommunityTables() {
  if (!isSupabaseConfigured) return [];
  try {
    const rows = await selectRows(TABLE, {
      select: 'id,lat,lon,name,nb_tables,indoor,type,photo_url,status',
      status: 'neq.rejected',
      order: 'created_at.desc',
    });
    return (rows || [])
      .map((r) => ({
        id: r.id,
        lat: Number(r.lat),
        lon: Number(r.lon),
        name: r.name || '',
        type: r.type || '',
        nb: Number(r.nb_tables) || 1,
        indoor: r.indoor || '',
        photo: r.photo_url || '',
        community: true,
      }))
      .filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lon));
  } catch {
    return [];
  }
}

// --- Anti-doublon (haversine pur, réutilisable) ----------------------

const EARTH_R = 6371000; // m

export function distanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(a));
}

// Renvoie les tables de `list` situées à <= radiusM de (lat, lon),
// triées par distance croissante. `list` = tables {lat, lon, ...}.
export function findNearbyTables(lat, lon, list, radiusM = 50) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Array.isArray(list)) return [];
  const out = [];
  for (const t of list) {
    if (!Number.isFinite(t.lat) || !Number.isFinite(t.lon)) continue;
    const d = distanceMeters(lat, lon, t.lat, t.lon);
    if (d <= radiusM) out.push({ ...t, distance: d });
  }
  return out.sort((a, b) => a.distance - b.distance);
}

// --- Upload photo ----------------------------------------------------

// Redimensionne/compresse l'image côté client (max ~1280px, JPEG ~0.8)
// pour garder un upload léger. Renvoie un Blob JPEG.
function compressImage(file, maxSize = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height >= width && height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression échouée'))),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible'));
    };
    img.src = url;
  });
}

// Upload la photo dans le bucket et renvoie { photo_url, photo_path }.
export async function uploadTablePhoto(file) {
  if (!isSupabaseConfigured) throw new Error('Supabase non configuré');
  const blob = await compressImage(file);
  const id =
    (crypto.randomUUID && crypto.randomUUID()) ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `tables/${id}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { photo_url: data.publicUrl, photo_path: path };
}

// --- Insertion -------------------------------------------------------

// Insère une nouvelle table communautaire. Renvoie la ligne normalisée.
export async function addCommunityTable({
  lat,
  lon,
  name = '',
  nb_tables = 1,
  indoor = '',
  type = '',
  photo_url = '',
  photo_path = '',
}) {
  if (!isSupabaseConfigured) throw new Error('Supabase non configuré');
  const rows = await insertRow(TABLE, {
    lat,
    lon,
    name,
    nb_tables,
    indoor,
    type,
    photo_url,
    photo_path,
    status: 'pending',
  });
  const r = Array.isArray(rows) ? rows[0] : rows;
  return {
    id: r?.id,
    lat: Number(r?.lat ?? lat),
    lon: Number(r?.lon ?? lon),
    name: r?.name ?? name,
    type: r?.type ?? type,
    nb: Number(r?.nb_tables ?? nb_tables) || 1,
    indoor: r?.indoor ?? indoor,
    photo: r?.photo_url ?? photo_url,
    community: true,
  };
}
