import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface WeatherData {
  city_name: string;
  temp: number;
  description: string;
  lat: number;
  lon: number;
}

interface RecommendationItem {
  name: string;
  image_url: string;
}

interface Recommendation {
  style_description: string;
  items: {
    top: RecommendationItem;
    bottom: RecommendationItem;
    shoes: RecommendationItem;
    outer?: RecommendationItem;
  };
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'weather' | 'recommendation'>('home');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState<boolean>(false);

  const SERVER_IP = '192.168.0.11:5000'; // 너의 Flask 서버 IP에 맞게 수정 필요

  const getLocation = async () => {
    setLoadingWeather(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('위치 권한이 필요합니다.');
      setLoadingWeather(false);
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    fetchWeather(location.coords.latitude, location.coords.longitude);
  };

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`http://${SERVER_IP}/test-weather?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      if (data.weather) {
        setWeatherData({ ...data.weather, lat, lon });
      } else {
        alert('날씨 데이터를 불러오지 못했습니다.');
      }
    } catch (e) {
      console.error('날씨 API 오류:', e);
      alert('날씨 정보를 불러오지 못했습니다.');
    } finally {
      setLoadingWeather(false);
    }
  };

  const fetchRecommendations = async () => {
    if (!weatherData) return;
    setLoadingRecommendations(true);
    try {
      const res = await fetch(`http://${SERVER_IP}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: weatherData.lat, lon: weatherData.lon }),
      });
      const data = await res.json();
      if (data.recommendations) {
        setRecommendations(data.recommendations);
        setCurrentIndex(0);
      } else {
        alert('추천 결과가 없습니다.');
      }
    } catch (e) {
      console.error('추천 API 오류:', e);
      alert('추천 정보를 불러오지 못했습니다.');
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const HomePage = () => (
    <View style={styles.centered}>
      <Text style={styles.title}>AI 패션 스타일리스트</Text>
      <Text style={styles.subtitle}>오늘 날씨에 맞는 스타일을 추천합니다.</Text>
      <TouchableOpacity style={styles.button} onPress={() => setCurrentPage('weather')}>
        <Text style={styles.buttonText}>시작하기</Text>
      </TouchableOpacity>
    </View>
  );

  const WeatherPage = () => {
    useEffect(() => {
      if (!weatherData) getLocation();
    }, []);

    if (loadingWeather) return <ActivityIndicator style={{ marginTop: 50 }} size="large" />;

    return (
      <View style={styles.container}>
        {weatherData && (
          <View style={styles.centered}>
            <Text style={styles.title}>오늘의 날씨</Text>
            <Text style={styles.subtitle}>
              {weatherData.city_name} / {weatherData.temp.toFixed(1)}°C / {weatherData.description}
            </Text>
            <TouchableOpacity style={styles.button} onPress={() => setCurrentPage('recommendation')}>
              <Text style={styles.buttonText}>추천 받기</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const RecommendationPage = () => {
    useEffect(() => {
      if (recommendations.length === 0) fetchRecommendations();
    }, []);

    const item = recommendations[currentIndex];
    if (loadingRecommendations) return <ActivityIndicator style={{ marginTop: 50 }} size="large" />;
    if (!item) return <Text style={{ textAlign: 'center', marginTop: 30 }}>추천 결과가 없습니다.</Text>;

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>스타일 추천</Text>
        <Text style={styles.subtitle}>{item.style_description}</Text>
        <View style={styles.outfitContainer}>
          {Object.entries(item.items).map(([key, value]) => (
            <View key={key} style={styles.outfitItem}>
              <Image source={{ uri: value.image_url }} style={styles.image} resizeMode="cover" />
              <Text style={styles.itemName}>{value.name}</Text>
              <Text style={styles.itemCategory}>({key})</Text>
            </View>
          ))}
        </View>
        <View style={styles.navigation}>
          <TouchableOpacity
            onPress={() => setCurrentIndex(i => Math.max(0, i - 1))}
            style={[styles.button, { backgroundColor: '#999' }]}>
            <Text style={styles.buttonText}>이전</Text>
          </TouchableOpacity>
          <Text>{currentIndex + 1} / {recommendations.length}</Text>
          <TouchableOpacity
            onPress={() => setCurrentIndex(i => Math.min(recommendations.length - 1, i + 1))}
            style={[styles.button, { backgroundColor: '#999' }]}>
            <Text style={styles.buttonText}>다음</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setCurrentPage('home')} style={styles.button}>
          <Text style={styles.buttonText}>처음으로</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f9f9' }}>
      {currentPage === 'home' && <HomePage />}
      {currentPage === 'weather' && <WeatherPage />}
      {currentPage === 'recommendation' && <RecommendationPage />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, marginBottom: 20, textAlign: 'center' },
  button: {
    backgroundColor: '#1E90FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 10,
  },
  buttonText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
  outfitContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 20,
  },
  outfitItem: { width: 120, margin: 10, alignItems: 'center' },
  image: { width: 100, height: 100, borderRadius: 10, marginBottom: 5 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemCategory: { fontSize: 12, color: '#555' },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 20,
  },
});
