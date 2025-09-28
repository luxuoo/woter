// 当网页的HTML内容完全加载后执行
document.addEventListener('DOMContentLoaded', () => {

    // --- 配置区域 ---
    const config = {
        channelId: "3092550", // <-- 已修正为正确的Channel ID
        readApiKey: "1JCH60ZZR69R58JN",
        historyResults: 100, // 获取最近100条历史数据用于计算和图表
        refreshInterval: 30000, // 每30秒刷新一次
        // 异常阈值
        tempThreshold: { high: 28, low: 18 },
        humidityThreshold: { high: 70, low: 40 },
        waterLevelThreshold: { low: 10 }
    };

    // --- DOM元素引用 ---
    const elements = {
        deviceStatus: document.getElementById('device-status'),
        lastUpdate: document.getElementById('last-update'),
        refreshIcon: document.getElementById('refresh-icon'),
        temp: {
            value: document.getElementById('temperature-value'),
            bar: document.getElementById('temperature-bar')
        },
        humidity: {
            value: document.getElementById('humidity-value'),
            bar: document.getElementById('humidity-bar')
        },
        water: {
            value: document.getElementById('water-level-value'),
            bar: document.getElementById('water-level-bar')
        },
        comfort: {
            level: document.getElementById('comfort-level'),
            desc: document.getElementById('comfort-desc'),
            icon: document.getElementById('comfort-icon')
        },
        historyRecords: document.getElementById('history-records'),
        chartCanvas: document.getElementById('main-chart')
    };

    let mainChart; // 用于存储Chart.js实例

    // --- 主要的数据获取和渲染函数 ---
    async function fetchDataAndRender() {
        showRefreshAnimation();
        const apiUrl = `https://api.thingspeak.com/channels/${config.channelId}/feeds.json?api_key=${config.readApiKey}&results=${config.historyResults}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`网络响应错误: ${response.status}`);
            
            const responseText = await response.text();
            if (responseText === '-1' || responseText === '0') {
                 updateDeviceStatus('no-data', '云端暂无有效数据');
                 return;
            }
            const data = JSON.parse(responseText);


            if (!data.feeds || data.feeds.length === 0) {
                updateDeviceStatus('no-data', '云端暂无数据');
                return;
            }

            const feeds = data.feeds.map(feed => ({
                timestamp: new Date(feed.created_at),
                temperature: parseFloat(feed.field1),
                humidity: parseFloat(feed.field2),
                waterLevel: parseInt(feed.field3)
            })).filter(feed => !isNaN(feed.temperature));
            
            if (feeds.length === 0) {
                 updateDeviceStatus('no-data', '云端数据格式无效');
                 return;
            }

            const latestData = feeds[feeds.length - 1];
            
            updateDeviceStatus('online', '设备在线');
            updateLastUpdateTime(latestData.timestamp);
            updateDataCards(latestData);
            updateHistoryRecords(feeds);
            updateChart(feeds);

        } catch (error) {
            console.error("获取数据失败:", error);
            updateDeviceStatus('error', `数据获取失败`);
        }
    }

    // --- 更新UI的辅助函数 ---
    function updateDeviceStatus(status, text) {
        const statusMap = {
            'online': { color: 'bg-success', pulse: true },
            'error': { color: 'bg-danger', pulse: true },
            'no-data': { color: 'bg-gray-400', pulse: false },
            'connecting': { color: 'bg-gray-400', pulse: false }
        };
        const currentStatus = statusMap[status] || statusMap['error'];
        elements.deviceStatus.innerHTML = `
            <span class="w-2 h-2 ${currentStatus.color} rounded-full ${currentStatus.pulse ? 'animate-pulse' : ''}"></span>
            <span>${text}</span>
        `;
    }
    
    function updateLastUpdateTime(timestamp) {
        elements.lastUpdate.textContent = `最后更新: ${timestamp.toLocaleTimeString()}`;
    }
    
    function updateDataCards(data) {
        // 更新温度
        elements.temp.value.textContent = `${data.temperature.toFixed(1)}°C`;
        const tempPercent = ((data.temperature - 15) / 25) * 100;
        elements.temp.bar.style.width = `${Math.min(100, Math.max(0, tempPercent))}%`;
        
        // 更新湿度
        elements.humidity.value.textContent = `${data.humidity.toFixed(0)}%`;
        elements.humidity.bar.style.width = `${Math.min(100, Math.max(0, data.humidity))}%`;
        
        // 更新水位
        elements.water.value.textContent = `${data.waterLevel}mm`;
        const waterPercent = (data.waterLevel / 40) * 100;
        elements.water.bar.style.width = `${Math.min(100, Math.max(0, waterPercent))}%`;
        
        // 更新舒适度
        const comfort = calculateComfort(data.temperature, data.humidity);
        elements.comfort.level.textContent = comfort.level;
        elements.comfort.desc.textContent = comfort.description;
        elements.comfort.icon.className = `w-12 h-12 rounded-full bg-${comfort.color}/10 flex items-center justify-center text-${comfort.color}`;
        elements.comfort.icon.innerHTML = `<i class="fa ${comfort.icon} text-xl"></i>`;
        
        // 触发更新动画
        [elements.temp.value, elements.humidity.value, elements.water.value].forEach(el => {
            el.classList.add('data-update-animation');
            setTimeout(() => el.classList.remove('data-update-animation'), 500);
        });
    }

    function calculateComfort(temp, humi) {
        if (temp >= 22 && temp <= 26 && humi >= 40 && humi <= 60) {
            return { level: "良好", description: "当前环境温润适宜，体感舒适。", icon: "fa-smile-o", color: "success" };
        } else if (temp > config.tempThreshold.high || temp < config.tempThreshold.low || humi > config.humidityThreshold.high || humi < config.humidityThreshold.low) {
            return { level: "较差", description: "温度或湿度超出舒适范围。", icon: "fa-frown-o", color: "danger" };
        } else {
            return { level: "一般", description: "环境条件尚可，无明显不适。", icon: "fa-meh-o", color: "warning" };
        }
    }
    
    function updateHistoryRecords(feeds) {
        let recordsHtml = '';
        const abnormalFeeds = feeds.filter(feed => 
            feed.temperature > config.tempThreshold.high ||
            feed.temperature < config.tempThreshold.low ||
            feed.humidity > config.humidityThreshold.high ||
            feed.humidity < config.humidityThreshold.low ||
            feed.waterLevel < config.waterLevelThreshold.low
        ).reverse();

        if (abnormalFeeds.length === 0) {
            elements.historyRecords.innerHTML = `<div class="text-center text-gray-500 pt-10"><i class="fa fa-check-circle-o text-2xl mb-2 text-success"></i><p>近期无异常记录</p></div>`;
            return;
        }

        abnormalFeeds.slice(0, 10).forEach(feed => {
            let type = '', detail = '', typeClass = '';
            if (feed.temperature > config.tempThreshold.high) {
                type = '高温预警'; detail = `温度达到 ${feed.temperature.toFixed(1)}°C`; typeClass = 'bg-danger/10 text-danger';
            } else if (feed.temperature < config.tempThreshold.low) {
                type = '低温预警'; detail = `温度低至 ${feed.temperature.toFixed(1)}°C`; typeClass = 'bg-primary/10 text-primary';
            } else if (feed.humidity > config.humidityThreshold.high) {
                type = '湿度过高'; detail = `湿度达到 ${feed.humidity.toFixed(0)}%`; typeClass = 'bg-warning/10 text-warning';
            } else if (feed.humidity < config.humidityThreshold.low) {
                type = '环境干燥'; detail = `湿度低至 ${feed.humidity.toFixed(0)}%`; typeClass = 'bg-warning/10 text-warning';
            } else if (feed.waterLevel < config.waterLevelThreshold.low) {
                type = '低水位警报'; detail = `水位仅 ${feed.waterLevel}mm`; typeClass = 'bg-secondary/10 text-secondary';
            }
            
            recordsHtml += `
                <div class="flex items-start p-2 rounded-lg hover:bg-light transition-colors">
                    <div class="w-8 h-8 rounded-full ${typeClass} flex items-center justify-center mr-3 flex-shrink-0">
                        <i class="fa fa-exclamation-triangle"></i>
                    </div>
                    <div>
                        <p class="font-medium text-sm">${输入} - <span class="text-gray-500">${detail}</span></p>
                        <p class="text-xs text-gray-400">${feed.timestamp.toLocaleString()}</p>
                    </div>
                </div>`;
        });
        elements.historyRecords.innerHTML = recordsHtml;
    }

    function updateChart(feeds) {
        const labels = feeds.map(feed => feed。timestamp。toLocaleTimeString([]， { hour: '2-digit', minute: '2-digit' }));
        const tempData = feeds.map(feed => feed.temperature);
        const humiData = feeds.map(feed => feed.humidity);

        if (mainChart) {
            mainChart。data。labels = labels;
            mainChart.data.datasets[0]。data = tempData;
            mainChart.data.datasets[1].data = humiData;
            mainChart.update('none');
        } else {
            mainChart = new Chart(elements.chartCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        { label: '温度 (°C)', data: tempData, borderColor: tailwind.config.theme.extend.colors.danger, backgroundColor: 'rgba(255, 77, 79, 0.1)', tension: 0.3, fill: true, yAxisID: 'y' },
                        { label: '湿度 (%)', data: humiData, borderColor: tailwind.config.theme.extend.colors.primary, backgroundColor: 'rgba(22, 93, 255, 0.1)', tension: 0.3, fill: true, yAxisID: 'y1' }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                    scales: {
                        x: { grid: { display: false } },
                        y: { type: 'linear', position: 'left', title: { display: true, text: '温度 (°C)' }, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                        y1: { type: 'linear', position: 'right', title: { display: true, text: '湿度 (%)' }, grid: { drawOnChartArea: false } }
                    },
                    plugins: { legend: { position: 'top' } }
                }
            });
        }
    }
    
    function showRefreshAnimation() {
        elements.refreshIcon.classList.add('animate-spin');
        setTimeout(() => elements.refreshIcon.classList.remove('animate-spin'), 1000);
    }
    
    // --- 初始化 ---
    fetchDataAndRender();
    setInterval(fetchDataAndRender, config.refreshInterval);
});
