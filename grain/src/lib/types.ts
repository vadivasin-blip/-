export type Image = { url: string; width?: number | null; height?: number | null };
export type ArtistRef = { id: string; name: string; uri: string };
export type AlbumRef = { id: string; name: string; uri: string; images: Image[]; release_date?: string; album_type?: string; artists?: ArtistRef[] };
export type Track = {
  id: string; uri: string; name: string; duration_ms: number; explicit?: boolean;
  artists: ArtistRef[]; album: AlbumRef; track_number?: number; disc_number?: number;
  is_playable?: boolean; type?: 'track' | 'episode';
};
export type Album = AlbumRef & {
  artists: ArtistRef[]; total_tracks: number; release_date: string; label?: string;
  tracks?: Paging<Omit<Track, 'album'>>; copyrights?: { text: string }[];
};
export type Artist = ArtistRef & { images: Image[]; genres?: string[] };
export type Playlist = {
  id: string; uri: string; name: string; description?: string; images: Image[] | null;
  owner: { id: string; display_name?: string }; public?: boolean; collaborative?: boolean;
  items?: { total: number; href?: string }; tracks?: { total: number; href?: string };
  snapshot_id?: string;
};
export type Paging<T> = { items: T[]; total: number; next: string | null; offset: number; limit: number };
export type User = { id: string; display_name: string; images?: Image[]; product?: string };
export type Device = { id: string; name: string; type: string; is_active: boolean; volume_percent: number | null; supports_volume?: boolean };

/** Трек с датой добавления — для списков плейлиста/любимого. */
export type Row = { track: Track; added_at?: string; key: string };

export type Context = { uri: string; name?: string; kind?: 'playlist' | 'album' | 'artist' | 'collection' | 'search' | 'other' };

export const playlistTotal = (p: Playlist) => p.items?.total ?? p.tracks?.total ?? 0;
export const img = (images: Image[] | null | undefined, min = 0) => {
  if (!images || !images.length) return undefined;
  const sorted = [...images].sort((a, b) => (a.width ?? 640) - (b.width ?? 640));
  return (sorted.find((i) => (i.width ?? 640) >= min) ?? sorted[sorted.length - 1]).url;
};
export const artistsLine = (a: ArtistRef[] | undefined) => (a ?? []).map((x) => x.name).join(', ');
