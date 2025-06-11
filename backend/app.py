from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

# CORS 허용 (React Native 또는 웹에서 호출 가능하게)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 배포 시에는 도메인 지정 권장
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 (index.html 및 JS, CSS 등) 제공
#app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

# index.html 라우트
@app.get("/", response_class=HTMLResponse)
async def read_index():
    return FileResponse("frontend/index.html")

# 날씨 테스트 API
@app.get("/test-weather")
async def test_weather(lat: float, lon: float):
    return {
        "weather": {
            "city_name": "Seoul",
            "temp": 26.3,
            "description": "맑음"
        }
    }

# 추천 API
@app.post("/recommend")
async def recommend(request: Request):
    data = await request.json()
    lat = data.get("lat")
    lon = data.get("lon")

    return {
        "recommendations": [
            {
                "style_description": "시원한 여름 캐주얼룩",
                "items": {
                    "top": {
                        "name": "린넨 셔츠",
                        "image_url": "https://example.com/shirt.jpg"
                    },
                    "bottom": {
                        "name": "면 반바지",
                        "image_url": "https://example.com/shorts.jpg"
                    },
                    "shoes": {
                        "name": "샌들",
                        "image_url": "https://example.com/sandals.jpg"
                    }
                }
            }
        ]
    }

# 실행
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True)
