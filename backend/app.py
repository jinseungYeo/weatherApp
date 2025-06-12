from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
import requests
import os
import json
from supabase import create_client, Client

# 환경변수 로드
load_dotenv()

# 환경변수
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")

# 필수 키 확인
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase 환경변수가 설정되지 않았습니다.")
if not GEMINI_API_KEY:
    raise ValueError("Gemini API 키가 없습니다.")
if not OPENWEATHER_API_KEY:
    raise ValueError("OpenWeather API 키가 없습니다.")
if not KAKAO_REST_API_KEY:
    raise ValueError("Kakao API 키가 없습니다.")

# 서비스 설정
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-1.5-flash')

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 배포시에는 프론트 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 요청 바디 모델
class LocationRequest(BaseModel):
    lat: float
    lon: float

def get_address_from_coords(lat, lon):
    try:
        url = "https://dapi.kakao.com/v2/local/geo/coord2address.json"
        headers = {"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}
        params = {"x": lon, "y": lat}
        response = requests.get(url, headers=headers, params=params).json()
        doc = response.get("documents", [])
        if doc:
            addr = doc[0]
            return addr.get("road_address", {}).get("address_name") or addr.get("address", {}).get("address_name")
        return "주소 정보 없음"
    except:
        return "주소 정보 오류"

@app.get("/test-weather")
async def test_weather(lat: float, lon: float):
    weather_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric&lang=kr"
    res = requests.get(weather_url).json()
    if res.get("cod") != 200:
        return {"error": "날씨 정보를 불러오지 못했습니다."}
    weather = {
        "city_name": res.get("name", "알 수 없음"),
        "temp": res["main"]["temp"],
        "description": res["weather"][0]["description"],
        "icon": res["weather"][0].get("icon", ""),
        "feels_like": res["main"].get("feels_like", ""),
        "detailed_address": get_address_from_coords(lat, lon)
    }
    return {"weather": weather}

@app.post("/recommend")
async def recommend(data: LocationRequest):
    lat, lon = data.lat, data.lon

    # 날씨 가져오기
    weather_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric&lang=kr"
    weather_res = requests.get(weather_url).json()
    if weather_res.get("cod") != 200:
        return {"error": "날씨 정보를 불러오는 데 실패했습니다."}

    current_weather = {
        "description": weather_res["weather"][0]["description"],
        "temp": weather_res["main"]["temp"],
        "feels_like": weather_res["main"]["feels_like"],
        "city_name": weather_res.get("name", "알 수 없음"),
        "icon": weather_res["weather"][0].get("icon", ""),
        "detailed_address": get_address_from_coords(lat, lon)
    }

    # 옷 정보 가져오기
    clothes_res = supabase.table('clothes').select("id, name, category, image_url").execute()
    clothes_list = clothes_res.data

    if not clothes_list:
        return {"error": "옷 정보를 찾을 수 없습니다."}

    categorized_clothes = {'top': [], 'bottom': [], 'outer': [], 'shoes': []}
    for item in clothes_list:
        category = item.get("category", "").lower()
        if category in categorized_clothes:
            categorized_clothes[category].append(item)

    # Gemini 프롬프트 구성
    prompt = f"""
    당신은 AI 패션 스타일리스트입니다.
    날씨: {json.dumps(current_weather, ensure_ascii=False)}
    옷 리스트: {json.dumps(clothes_list, ensure_ascii=False)}

    날씨에 맞춰 추천 스타일 3세트를 JSON으로 생성해주세요.
    각 세트는 'top', 'bottom', 'shoes' (추울 땐 'outer') 포함.
    각 아이템은 id, name, image_url 포함.
    스타일 설명도 함께 포함.
    """

    try:
        gemini_response = gemini_model.generate_content(prompt)
        gemini_text = gemini_response.text.strip("```json").strip("```")
        recommendations = json.loads(gemini_text)["recommendations"]
    except Exception as e:
        return {"error": "Gemini 응답 파싱 실패", "details": str(e)}

    return {
        "weather": current_weather,
        "recommendations": recommendations
    }
