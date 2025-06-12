// app/(tabs)/weather.tsx
import { API_URL } from '@/constants/Api';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';

type WeatherData = {
  detailed_address: string;
  temp: number;
  description: string;
  lat: number;
  lon: number;
};

export default function WeatherScreen() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 거부', '위치 권한이 필요합니다.');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude;
      const lon = location.coords.longitude;

      const url = `${API_URL}/test-weather?lat=${lat}&lon=${lon}`;
      try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.weather) {
          setWeather({ ...data.weather, lat, lon });
        } else {
          Alert.alert('오류', '날씨 정보를 불러올 수 없습니다.');
        }
      } catch (err) {
        console.error('날씨 API 오류:', err);
        Alert.alert('오류', '날씨 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>오늘의 날씨</Text>
      {weather ? (
        <>
          <Text>📍 {weather.detailed_address}</Text>
          <Text>🌡️ {weather.temp}°C</Text>
          <Text>🌤️ {weather.description}</Text>
          <Button
            title="스타일 추천 받기"
            onPress={() =>
              router.push({
                pathname: '/recommendation',
                params: {
                  lat: weather.lat.toString(),
                  lon: weather.lon.toString(),
                },
              })
            }
          />
        </>
      ) : (
        <Text>날씨 정보를 불러올 수 없습니다.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});
