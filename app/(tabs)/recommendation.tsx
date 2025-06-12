import { API_URL } from '@/constants/Api';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

type RouteParams = {
  lat: string;
  lon: string;
};

export default function RecommendationScreen() {
  const params = useLocalSearchParams() as RouteParams;
  const { lat, lon } = params;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const url = `${API_URL}/recommend`;
      console.log('📤 요청 URL:', url);

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: parseFloat(lat), lon: parseFloat(lon) }),
        });
        const result = await res.json();
        console.log('✅ 추천 응답:', result);

        if (result.error) throw new Error(result.error);
        setData(result);
      } catch (err: any) {
        console.error('🚨 추천 오류:', err.message);
        Alert.alert('추천 실패', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📍 {data.weather.detailed_address}</Text>
      <Text>🌡️ {data.weather.temp}°C, {data.weather.description}</Text>

      {data.recommendations?.map((styleSet: any, index: number) => (
        <View key={index} style={styles.card}>
          <Text style={styles.subtitle}>스타일 {index + 1}</Text>
          <Text>{styleSet.description}</Text>
          {['top', 'bottom', 'shoes', 'outer'].map((part) => {
            const item = styleSet[part];
            if (!item) return null;
            return (
              <View key={item.id} style={styles.item}>
                <Image source={{ uri: item.image_url }} style={styles.image} />
                <Text>{item.name}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  card: { backgroundColor: '#f0f0f0', borderRadius: 8, padding: 10, marginTop: 10 },
  item: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  image: { width: 50, height: 50, marginRight: 10, borderRadius: 4 },
});
