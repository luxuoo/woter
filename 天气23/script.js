// 和风天气API配置
const API_KEY = '16ad6adeb7474a75a33116a10a34170b'; // 已替换为您提供的API密钥
const BASE_URL = 'https://devapi.qweather.com/v7';

// DOM元素
const citySearchInput = document.getElementById('city-search');
const searchBtn = document.getElementById('search-btn');
const loadingElement = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const weatherContainer = document.getElementById('weather-container');
const locationElement = document.getElementById('location');
const currentDateElement = document.getElementById('current-date');
const currentIconElement = document.getElementById('current-icon');
const currentTempElement = document.getElementById('current-temp');
const currentDescriptionElement = document.getElementById('current-description');
const windSpeedElement = document.getElementById('wind-speed');
const humidityElement = document.getElementById('humidity');
const visibilityElement = document.getElementById('visibility');
const feelsLikeElement = document.getElementById('feels-like');
const forecastContainer = document.getElementById('forecast-container');
const tempChartCanvas = document.getElementById('temp-chart');
const aqiValueElement = document.getElementById('aqi-value');
const aqiDescriptionElement = document.getElementById('aqi-description');
const pm25Element = document.getElementById('pm25');
const pm10Element = document.getElementById('pm10');
const no2Element = document.getElementById('no2');
const so2Element = document.getElementById('so2');

// 图表实例
let tempChart = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 默认加载北京的天气
    getWeatherData('北京');
    
    // 搜索按钮点击事件
    searchBtn.addEventListener('click', () => {
        const city = citySearchInput.value.trim();
        if (city) {
            getWeatherData(city);
        }
    });
    
    // 回车键搜索
    citySearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = citySearchInput.value.trim();
            if (city) {
                getWeatherData(city);
            }
        }
    });
});

// 获取城市ID
async function getCityId(cityName) {
    try {
        const response = await fetch(`https://geoapi.qweather.com/v2/city/lookup?location=${encodeURIComponent(cityName)}&key=${API_KEY}`);
        const data = await response.json();
        
        if (data.code === '200' && data.location && data.location.length > 0) {
            return {
                id: data.location[0].id,
                name: data.location[0].name,
                adm1: data.location[0].adm1,
                adm2: data.location[0].adm2
            };
        } else {
            throw new Error('城市未找到');
        }
    } catch (error) {
        console.error('获取城市ID失败:', error);
        throw error;
    }
}

// 获取天气数据
async function getWeatherData(cityName) {
    showLoading();
    hideError();
    
    try {
        // 获取城市ID
        const cityInfo = await getCityId(cityName);
        
        // 并行请求多个API
        const [currentWeather, forecast, airQuality] = await Promise.all([
            fetch(`${BASE_URL}/weather/now?location=${cityInfo.id}&key=${API_KEY}`).then(res => res.json()),
            fetch(`${BASE_URL}/weather/7d?location=${cityInfo.id}&key=${API_KEY}`).then(res => res.json()),
            fetch(`${BASE_URL}/air/now?location=${cityInfo.id}&key=${API_KEY}`).then(res => res.json())
        ]);
        
        // 更新UI
        updateCurrentWeather(currentWeather, cityInfo);
        updateForecast(forecast);
        updateAirQuality(airQuality);
        updateTemperatureChart(forecast);
        
        // 显示天气容器
        weatherContainer.classList.remove('d-none');
    } catch (error) {
        console.error('获取天气数据失败:', error);
        showError();
    } finally {
        hideLoading();
    }
}

// 更新当前天气
function updateCurrentWeather(data, cityInfo) {
    if (data.code === '200' && data.now) {
        const now = data.now;
        
        // 更新位置
        locationElement.textContent = `${cityInfo.name}, ${cityInfo.adm1}`;
        
        // 更新日期
        const currentDate = new Date();
        currentDateElement.textContent = formatDate(currentDate);
        
        // 更新天气图标
        currentIconElement.src = `https://a.hecdn.net/img/common/icon/202106d/${now.icon}.png`;
        currentIconElement.alt = now.text;
        
        // 更新温度和描述
        currentTempElement.textContent = `${now.temp}°C`;
        currentDescriptionElement.textContent = now.text;
        
        // 更新详细信息
        windSpeedElement.textContent = `${now.windSpeed} km/h`;
        humidityElement.textContent = `${now.humidity}%`;
        visibilityElement.textContent = `${now.vis} km`;
        feelsLikeElement.textContent = `${now.feelsLike}°C`;
    }
}

// 更新天气预报
function updateForecast(data) {
    if (data.code === '200' && data.daily) {
        // 清空预报容器
        forecastContainer.innerHTML = '';
        
        // 添加每日预报
        data.daily.forEach((day, index) => {
            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';
            
            const date = new Date();
            date.setDate(date.getDate() + index);
            
            forecastItem.innerHTML = `
                <h3>${index === 0 ? '今天' : formatDay(date)}</h3>
                <img src="https://a.hecdn.net/img/common/icon/202106d/${day.iconDay}.png" alt="${day.textDay}">
                <p>${day.textDay}</p>
                <div class="temp-range">
                    <span class="max-temp">${day.tempMax}°</span>
                    <span class="min-temp">${day.tempMin}°</span>
                </div>
            `;
            
            forecastContainer.appendChild(forecastItem);
        });
    }
}

// 更新空气质量
function updateAirQuality(data) {
    if (data.code === '200' && data.now) {
        const air = data.now;
        
        // 更新AQI值和描述
        aqiValueElement.textContent = air.aqi;
        aqiDescriptionElement.textContent = getAQIDescription(air.aqi);
        
        // 设置AQI值的颜色
        aqiValueElement.style.color = getAQIColor(air.aqi);
        
        // 更新详细污染物数据
        pm25Element.textContent = `${air.pm2p5} μg/m³`;
        pm10Element.textContent = `${air.pm10} μg/m³`;
        no2Element.textContent = `${air.no2} μg/m³`;
        so2Element.textContent = `${air.so2} μg/m³`;
    }
}

// 更新温度图表
function updateTemperatureChart(data) {
    if (data.code === '200' && data.daily) {
        const dates = [];
        const maxTemps = [];
        const minTemps = [];
        
        data.daily.forEach((day, index) => {
            const date = new Date();
            date.setDate(date.getDate() + index);
            dates.push(index === 0 ? '今天' : formatDay(date));
            maxTemps.push(day.tempMax);
            minTemps.push(day.tempMin);
        });
        
        // 如果图表已存在，销毁它
        if (tempChart) {
            tempChart.destroy();
        }
        
        // 创建新图表
        tempChart = new Chart(tempChartCanvas, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: '最高温度',
                        data: maxTemps,
                        borderColor: '#FF6384',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: '最低温度',
                        data: minTemps,
                        borderColor: '#36A2EB',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                family: "'PingFang SC', 'Microsoft YaHei', sans-serif"
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return value + '°C';
                            }
                        }
                    }
                }
            }
        });
    }
}

// 根据AQI值获取描述
function getAQIDescription(aqi) {
    aqi = parseInt(aqi);
    if (aqi <= 50) return '优';
    if (aqi <= 100) return '良';
    if (aqi <= 150) return '轻度污染';
    if (aqi <= 200) return '中度污染';
    if (aqi <= 300) return '重度污染';
    return '严重污染';
}

// 根据AQI值获取颜色
function getAQIColor(aqi) {
    aqi = parseInt(aqi);
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#99004c';
    return '#7e0023';
}

// 格式化日期
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('zh-CN', options);
}

// 格式化星期几
function formatDay(date) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
}

// 显示加载中
function showLoading() {
    loadingElement.classList.remove('d-none');
    weatherContainer.classList.add('d-none');
}

// 隐藏加载中
function hideLoading() {
    loadingElement.classList.add('d-none');
}

// 显示错误信息
function showError() {
    errorMessage.classList.remove('d-none');
    weatherContainer.classList.add('d-none');
}

// 隐藏错误信息
function hideError() {
    errorMessage.classList.add('d-none');
} 