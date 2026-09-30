import * as Location from 'expo-location';

export type PlaceBudget = 'low' | 'medium' | 'flexible';
export type PlaceCompanion = 'solo' | 'date' | 'friends' | 'family';

export interface PlaceSearchPreferences {
  maxDistanceKm: number;
  budget: PlaceBudget;
  companion: PlaceCompanion;
  openNow: boolean;
}

export interface PlaceSearchContext extends PlaceSearchPreferences {
  latitude: number;
  longitude: number;
}

/** Requests a single foreground location only after a person chooses this action. */
export async function getOneTimePlaceLocation(
  preferences: PlaceSearchPreferences
): Promise<PlaceSearchContext> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Bạn cần cho phép dùng vị trí hiện tại để tìm địa điểm gần bạn.');
  }

  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: 5 * 60 * 1000,
    requiredAccuracy: 1_000,
  });
  const position = lastKnown || await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    ...preferences,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}
