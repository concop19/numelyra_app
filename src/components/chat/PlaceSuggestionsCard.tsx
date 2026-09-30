import React from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface PlaceSuggestionsPayload {
  areaLabel: string;
  attribution: 'Google Maps';
  places: Array<{
    placeId?: string;
    name: string;
    mapsUrl: string;
    address?: string;
    /** Optional so previously saved location cards still render safely. */
    distanceKm?: number;
    primaryType?: string;
    priceLevel?: string | null;
    openNow?: boolean | null;
    whySelected?: string;
  }>;
}

function formatPriceLevel(level: string | null): string | null {
  if (level === 'PRICE_LEVEL_INEXPENSIVE') return 'Tiết kiệm';
  if (level === 'PRICE_LEVEL_MODERATE') return 'Giá vừa';
  if (level === 'PRICE_LEVEL_EXPENSIVE') return 'Cao cấp';
  if (level === 'PRICE_LEVEL_VERY_EXPENSIVE') return 'Rất cao cấp';
  return null;
}

export function PlaceSuggestionsCard({ data }: { data?: PlaceSuggestionsPayload }) {
  if (!data || !Array.isArray(data.places) || data.places.length === 0) return null;

  const openMap = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('unsupported');
      await Linking.openURL(url);
    } catch {
      Alert.alert('Không mở được Google Maps', 'Bạn có thể thử lại sau.');
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTitle}><Ionicons name="map-outline" size={16} color="#FFD28B" /><Text style={styles.title}>Địa điểm đã lọc</Text></View>
        <Text style={styles.area} numberOfLines={1}>{data.areaLabel}</Text>
      </View>
      {data.places.map((place, index) => {
        const distance = typeof place.distanceKm === 'number' && Number.isFinite(place.distanceKm)
          ? `${place.distanceKm.toFixed(1)} km`
          : null;
        const price = formatPriceLevel(place.priceLevel ?? null);

        return (
        <TouchableOpacity key={place.placeId ?? `${place.name}-${index}`} style={styles.placeRow} onPress={() => { void openMap(place.mapsUrl); }} activeOpacity={0.75} accessibilityRole="link" accessibilityLabel={`Mở ${place.name} trên Google Maps`}>
          <View style={styles.marker}><Ionicons name="location" size={14} color="#2D173B" /></View>
          <View style={styles.placeCopy}>
            <Text style={styles.placeName} numberOfLines={2}>{place.name}</Text>
            {place.address ? <Text style={styles.address} numberOfLines={1}>{place.address}</Text> : null}
            {distance || price || place.openNow !== null && place.openNow !== undefined ? <Text style={styles.meta}>
              {[distance, price, place.openNow === true ? 'Đang mở' : place.openNow === false ? 'Đã đóng' : null].filter(Boolean).join(' · ')}
            </Text> : null}
            {place.whySelected ? <Text style={styles.reason} numberOfLines={2}>{place.whySelected}</Text> : null}
          </View>
          <Ionicons name="open-outline" size={17} color="#C9B4E6" />
        </TouchableOpacity>
        );
      })}
      <Text style={styles.attribution}>Nguồn địa điểm: Google Maps</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 360, alignSelf: 'center', marginTop: 8, borderRadius: 16, padding: 12, backgroundColor: 'rgba(29, 21, 45, 0.94)', borderWidth: 1, borderColor: '#55406F' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  title: { color: '#FFF1D6', fontSize: 13, fontWeight: '800' },
  area: { color: '#BAAECD', fontSize: 11, flexShrink: 1, textAlign: 'right' },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(203, 182, 230, 0.14)' },
  marker: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD28B' },
  placeCopy: { flex: 1, minWidth: 0 },
  placeName: { color: '#F7F3FF', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  address: { color: '#C5B9D3', fontSize: 11, lineHeight: 15, marginTop: 1 },
  meta: { color: '#FFD28B', fontSize: 11, lineHeight: 16, marginTop: 2, fontWeight: '600' },
  reason: { color: '#AFA1C1', fontSize: 11, lineHeight: 15, marginTop: 2, fontStyle: 'italic' },
  attribution: { color: '#9D92B1', fontSize: 10, marginTop: 8 },
});
