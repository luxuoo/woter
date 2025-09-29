// 配置对象
const CONFIG = {
    apiEndpoint: 'https://api.example.com/sensor-data',
    refreshInterval: 60000, // 60秒自动刷新一次
    chartTheme: {
        backgroundColor: 'white',
        textColor: '#333',
        gridColor: 'rgba(0, 0, 0, 0.1)'
    },
    thresholds: {
        temperature: {
            min: 10,
            max: 35,
            warning: {
                low: 15,
                high: 30
            },
            danger: {
                low: 10,
                high: 35
            }
        },
        humidity: {
            min: 30,
            max: 80,
            warning: {
                low: 40,
                high: 70
            },
            danger: {
                low: 30,
                high: 80
            }
        },
        waterLevel: {
            min: 0,
            max: 50,
            warning: {
                low: 5,
                high: 40
            },
            danger: {
                low: 0,
                high: 50
            }
        }
    },
    dataPoints: 100 // 增加数据获取量
};

// DOM 元素
const elements = {
    dateTime: document.getElementById('date-time'),
    loadingIndicator: document.getElementById('loading-indicator'),
    miniLoading: document.getElementById('mini-loading'),
    errorMessage: document.getElementById('error-message'),
    temperatureValue: document.getElementById('temperature-value'),
    humidityValue: document.getElementById('humidity-value'),
    waterLevelValue: document.getElementById('water-level-value'),
    tempChange: document.getElementById('temp-change'),
    humidityChange: document.getElementById('humidity-change'),
    waterChange: document.getElementById('water-change'),
    tempAlert: document.getElementById('temp-alert'),
    humidityAlert: document.getElementById('humidity-alert'),
    waterAlert: document.getElementById('water-alert'),
    tempAvg: document.getElementById('temp-avg'),
    humidityAvg: document.getElementById('humidity-avg'),
    waterAvg: document.getElementById('water-avg'),
    refreshBtn: document.getElementById('refresh-btn'),
    exportBtn: document.getElementById('export-btn'),
    timeRange: document.getElementById('time-range'),
    showTemperature: document.getElementById('show-temperature'),
    showHumidity: document.getElementById('show-humidity'),
    showWaterLevel: document.getElementById('show-water-level'),
    chartContainer: document.getElementById('environment-chart')
};

// 全局变量
let chart;
let sensorData = [];
let previousData = null;

// 初始化函数
function init() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // 初始化时生成一些模拟数据，以便立即显示变化值
    initializeData();
    
    // 事件监听器
    elements.refreshBtn.addEventListener('click', fetchData);
    elements.exportBtn.addEventListener('click', exportData);
    elements.timeRange.addEventListener('change', updateChart);
    elements.showTemperature.addEventListener('change', updateChart);
    elements.showHumidity.addEventListener('change', updateChart);
    elements.showWaterLevel.addEventListener('change', updateChart);
    
    // 自动刷新
    setInterval(fetchData, CONFIG.refreshInterval);
}

// 初始化数据，生成两组数据以便立即显示变化值
async function initializeData() {
    try {
        // 生成第一组数据
        const response1 = await simulateApiRequest();
        sensorData = response1.data;
        
        // 保存为上一次数据
        previousData = {
            temperature: sensorData[sensorData.length - 1].temperature,
            humidity: sensorData[sensorData.length - 1].humidity,
            waterLevel: sensorData[sensorData.length - 1].waterLevel
        };
        
        // 生成第二组略有不同的数据
        const response2 = await simulateApiRequest(true);
        sensorData = response2.data;
        
        // 更新UI
        updateUI();
        
    } catch (error) {
        console.error('初始化数据失败:', error);
    }
}

// 更新日期时间
function updateDateTime() {
    const now = new Date();
    elements.dateTime.textContent = now.toLocaleString();
}

// 获取数据
async function fetchData() {
    try {
        // 保存上一次数据用于比较
        if (sensorData.length > 0) {
            previousData = {
                temperature: sensorData[sensorData.length - 1].temperature,
                humidity: sensorData[sensorData.length - 1].humidity,
                waterLevel: sensorData[sensorData.length - 1].waterLevel
            };
        }
        
        // 显示小型加载指示器
        elements.miniLoading.classList.remove('hidden');
        
        // 模拟API请求
        const response = await simulateApiRequest();
        
        // 处理数据
        sensorData = response.data;
        
        // 更新UI
        updateUI();
        
        // 隐藏加载指示器
        elements.miniLoading.classList.add('hidden');
        
    } catch (error) {
        console.error('获取数据失败:', error);
        elements.errorMessage.classList.remove('hidden');
        elements.miniLoading.classList.add('hidden');
        
        // 3秒后隐藏错误信息
        setTimeout(() => {
            elements.errorMessage.classList.add('hidden');
        }, 3000);
    }
}

// 模拟API请求
async function simulateApiRequest(isSecondRequest = false) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const data = [];
            const now = new Date();
            
            // 生成更多数据点
            for (let i = CONFIG.dataPoints; i >= 0; i--) {
                const time = new Date(now.getTime() - i * 600000); // 每10分钟一个数据点
                // 如果是第二次请求，生成略有不同的数据
                const variation = isSecondRequest ? Math.random() * 5 - 2.5 : 0;
                data.push({
                    timestamp: time.getTime(),
                    time: time.toLocaleTimeString(),
                    temperature: Math.random() * (35 - 10) + 10 + variation,
                    humidity: Math.random() * (80 - 30) + 30 + variation,
                    waterLevel: Math.random() * 50 + variation
                });
            }
            
            resolve({ data });
        }, isSecondRequest ? 100 : 1000); // 第二次请求更快完成
    });
}

// 更新UI
function updateUI() {
    if (sensorData.length === 0) return;
    
    const latestData = sensorData[sensorData.length - 1];
    
    // 更新实时数据
    elements.temperatureValue.textContent = latestData.temperature.toFixed(1);
    elements.humidityValue.textContent = latestData.humidity.toFixed(1);
    elements.waterLevelValue.textContent = latestData.waterLevel.toFixed(1);
    
    // 更新数据变化
    updateChangeValues(latestData);
    
    // 更新预警状态
    updateAlerts(latestData);
    
    // 更新数据均值
    updateAverages();
    
    // 更新图表
    updateChart();
}

// 更新数据变化值
function updateChangeValues(latestData) {
    if (!previousData) return;
    
    // 温度变化
    const tempChange = latestData.temperature - previousData.temperature;
    elements.tempChange.textContent = formatChange(tempChange, '°C');
    elements.tempChange.className = getChangeClass(tempChange);
    
    // 湿度变化
    const humidityChange = latestData.humidity - previousData.humidity;
    elements.humidityChange.textContent = formatChange(humidityChange, '%');
    elements.humidityChange.className = getChangeClass(humidityChange);
    
    // 水位变化
    const waterChange = latestData.waterLevel - previousData.waterLevel;
    elements.waterChange.textContent = formatChange(waterChange, 'cm');
    elements.waterChange.className = getChangeClass(waterChange);
}

// 格式化变化值
function formatChange(value, unit) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}${unit}`;
}

// 获取变化类名
function getChangeClass(value) {
    if (value > 0) return 'change-value change-up';
    if (value < 0) return 'change-value change-down';
    return 'change-value change-neutral';
}

// 更新预警状态
function updateAlerts(data) {
    // 温度预警
    elements.tempAlert.className = 'alert-indicator ' + getAlertClass(
        data.temperature,
        CONFIG.thresholds.temperature.warning.low,
        CONFIG.thresholds.temperature.warning.high,
        CONFIG.thresholds.temperature.danger.low,
        CONFIG.thresholds.temperature.danger.high
    );
    
    // 湿度预警
    elements.humidityAlert.className = 'alert-indicator ' + getAlertClass(
        data.humidity,
        CONFIG.thresholds.humidity.warning.low,
        CONFIG.thresholds.humidity.warning.high,
        CONFIG.thresholds.humidity.danger.low,
        CONFIG.thresholds.humidity.danger.high
    );
    
    // 水位预警
    elements.waterAlert.className = 'alert-indicator ' + getAlertClass(
        data.waterLevel,
        CONFIG.thresholds.waterLevel.warning.low,
        CONFIG.thresholds.waterLevel.warning.high,
        CONFIG.thresholds.waterLevel.danger.low,
        CONFIG.thresholds.waterLevel.danger.high
    );
}

// 获取预警类名
function getAlertClass(value, warningLow, warningHigh, dangerLow, dangerHigh) {
    if (value <= dangerLow || value >= dangerHigh) {
        return 'alert-danger';
    } else if (value <= warningLow || value >= warningHigh) {
        return 'alert-warning';
    } else {
        return 'alert-normal';
    }
}

// 更新数据均值
function updateAverages() {
    // 计算均值
    const tempSum = sensorData.reduce((sum, data) => sum + data.temperature, 0);
    const humiditySum = sensorData.reduce((sum, data) => sum + data.humidity, 0);
    const waterSum = sensorData.reduce((sum, data) => sum + data.waterLevel, 0);
    
    const tempAvg = tempSum / sensorData.length;
    const humidityAvg = humiditySum / sensorData.length;
    const waterAvg = waterSum / sensorData.length;
    
    // 更新UI
    elements.tempAvg.textContent = tempAvg.toFixed(1) + '°C';
    elements.humidityAvg.textContent = humidityAvg.toFixed(1) + '%';
    elements.waterAvg.textContent = waterAvg.toFixed(1) + 'cm';
}

// 更新图表
function updateChart() {
    const ctx = elements.chartContainer.getContext('2d');
    
    // 销毁旧图表
    if (chart) {
        chart.destroy();
    }
    
    // 根据时间范围筛选数据
    const filteredData = filterDataByTimeRange();
    
    // 准备图表数据
    const chartData = {
        labels: filteredData.map(data => data.time),
        datasets: []
    };
    
    // 添加温度数据集
    if (elements.showTemperature.checked) {
        chartData.datasets.push({
            label: '温度 (°C)',
            data: filteredData.map(data => data.temperature),
            borderColor: '#e53935',
            backgroundColor: 'rgba(229, 57, 53, 0.1)',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: false
        });
    }
    
    // 添加湿度数据集
    if (elements.showHumidity.checked) {
        chartData.datasets.push({
            label: '湿度 (%RH)',
            data: filteredData.map(data => data.humidity),
            borderColor: '#1e88e5',
            backgroundColor: 'rgba(30, 136, 229, 0.1)',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: false
        });
    }
    
    // 添加水位数据集
    if (elements.showWaterLevel.checked) {
        chartData.datasets.push({
            label: '水位 (cm)',
            data: filteredData.map(data => data.waterLevel),
            borderColor: '#00acc1',
            backgroundColor: 'rgba(0, 172, 193, 0.1)',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: false
        });
    }
    
    // 自定义背景插件
    const customCanvasBackgroundColor = {
        id: 'customCanvasBackgroundColor',
        beforeDraw: (chart) => {
            const ctx = chart.canvas.getContext('2d');
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = CONFIG.chartTheme.backgroundColor;
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
    };
    
    // 创建图表
    chart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    titleColor: CONFIG.chartTheme.textColor,
                    bodyColor: CONFIG.chartTheme.textColor,
                    borderColor: CONFIG.chartTheme.gridColor,
                    borderWidth: 1
                },
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 12,
                        color: CONFIG.chartTheme.textColor
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: CONFIG.chartTheme.gridColor
                    },
                    ticks: {
                        color: CONFIG.chartTheme.textColor
                    }
                },
                y: {
                    grid: {
                        color: CONFIG.chartTheme.gridColor
                    },
                    ticks: {
                        color: CONFIG.chartTheme.textColor
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.4
                }
            },
            layout: {
                padding: 10
            }
        },
        plugins: [customCanvasBackgroundColor]
    });
}

// 根据时间范围筛选数据
function filterDataByTimeRange() {
    const range = elements.timeRange.value;
    const now = new Date();
    let timeLimit;
    
    switch (range) {
        case '1h':
            timeLimit = now.getTime() - 3600000;
            break;
        case '6h':
            timeLimit = now.getTime() - 21600000;
            break;
        case '24h':
            timeLimit = now.getTime() - 86400000;
            break;
        case '7d':
            timeLimit = now.getTime() - 604800000;
            break;
        case '30d':
            timeLimit = now.getTime() - 2592000000;
            break;
        default:
            timeLimit = now.getTime() - 21600000; // 默认6小时
    }
    
    return sensorData.filter(data => data.timestamp >= timeLimit);
}

// 导出数据
function exportData() {
    // 根据时间范围筛选数据
    const filteredData = filterDataByTimeRange();
    
    // 创建CSV内容
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += '时间,温度 (°C),湿度 (%RH),水位 (cm)\n';
    
    filteredData.forEach(data => {
        csvContent += `${data.time},${data.temperature.toFixed(1)},${data.humidity.toFixed(1)},${data.waterLevel.toFixed(1)}\n`;
    });
    
    // 创建下载链接
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sensor-data-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    
    // 触发下载
    link.click();
    
    // 清理
    document.body.removeChild(link);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);