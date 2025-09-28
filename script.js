document.addEventListener('DOMContentLoaded', () => {

    // --- 配置区域 ---
    const config = {
        channelId: "3092550",
        readApiKey: "1JCH60ZZR69R58JN",
        historyResults: 100, 
        refreshInterval: 30000,
        tempThreshold: { high: 28, low: 18 },
        humidityThreshold: { high: 70, low: 40 },
        waterLevelThreshold: { low: 10 }
    };

    // --- DOM元素引用 ---
    const elements = {
        liveCardsContainer: document.getElementById('live-cards-container'),
        deviceInfoContainer: document.getElementById('device-info-container'),
        historyRecordsBody: document.getElementById('history-records-body'),
        lastUpdate: document.getElementById('last-update'),
        refreshIcon: document.getElementById('refresh-icon'),
        chartToggles: document.getElementById('chart-toggles'),
        chartCanvas: document.getElementById('main-chart'),
        chartLoader: document.getElementById('chart-loader')
    };

    let mainChart;

    // --- 主要的数据获取和渲染函数 ---
    async function fetchDataAndRender() {
        showRefreshAnimation();
        const apiUrl = `https://api.thingspeak.com/channels/${config.channelId}/feeds.json?api_key=${config.readApiKey}&results=${config.historyResults}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`网络响应错误: ${response.status}`);
            
            const responseText = await response.text();
            if (responseText === '-1' || responseText === '0') throw new Error("云端暂无有效数据");
            
            const data = JSON.parse(responseText);

            if (!data.feeds || data.feeds.length === 0) throw new Error("云端数据格式错误");

            const feeds = data.feeds.map(feed => ({
                timestamp: new Date(feed.created_at),
                temperature: parseFloat(feed.field1),
                humidity: parseFloat(feed.field2),
                waterLevel: parseInt(feed.field3)
            })).filter(feed => !isNaN(feed.temperature));

            if (feeds.length === 0) throw new Error("云端数据无效");

            const latestData = feeds[feeds.length - 1];
            
            renderLiveCards(latestData);
            renderDeviceInfo(data.channel, latestData.timestamp);
            renderHistoryTable(feeds);
            renderChart(feeds);

        } catch (error) {
            console.error("获取数据失败:", error);
            elements.liveCardsContainer.innerHTML = `<div class="col-span-full text-center text-danger p-8 bg-white rounded-xl card-shadow">${error.message}</div>`;
            elements.chartLoader.textContent = "数据加载失败";
        }
    }

    // --- UI渲染函数 ---
    function renderLiveCards(data) {
        const comfort = calculateComfort(data.temperature, data.humidity);
        const cardsHtml = `
            <div class="bg-white rounded-xl p-6 card-shadow transform transition-all duration-300 hover:-translate-y-1">
                <div class="flex items-center space-x-4"><div class="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger"><i class="fa fa-thermometer-half text-xl"></i></div><div><p class="text-gray-500 text-sm">当前温度</p><h3 class="text-2xl font-bold">${data.temperature.toFixed(1)}°C</h3></div></div>
            </div>
            <div class="bg-white rounded-xl p-6 card-shadow transform transition-all duration-300 hover:-translate-y-1">
                <div class="flex items-center space-x-4"><div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary"><i class="fa fa-tint text-xl"></i></div><div><p class="text-gray-500 text-sm">当前湿度</p><h3 class="text-2xl font-bold">${data.humidity.toFixed(0)}%</h3></div></div>
            </div>
            <div class="bg-white rounded-xl p-6 card-shadow transform transition-all duration-300 hover:-translate-y-1">
                <div class="flex items-center space-x-4"><div class="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary"><i class="fa fa-level-up text-xl"></i></div><div><p class="text-gray-500 text-sm">水位高度</p><h3 class="text-2xl font-bold">${data.waterLevel}mm</h3></div></div>
            </div>
            <div class="bg-white rounded-xl p-6 card-shadow transform transition-all duration-300 hover:-translate-y-1">
                <div class="flex items-center space-x-4"><div class="w-12 h-12 rounded-full bg-${comfort.color}/10 flex items-center justify-center text-${comfort.color}"><i class="fa ${comfort.icon} text-xl"></i></div><div><p class="text-gray-500 text-sm">舒适度</p><h3 class="text-2xl font-bold">${comfort.level}</h3></div></div>
            </div>
        `;
        elements.liveCardsContainer.innerHTML = cardsHtml;
    }
    
    function renderDeviceInfo(channel, lastUpdate) {
        const ip = channel.metadata ? JSON.parse(channel.metadata).ip || 'N/A' : 'N/A';
        const infoHtml = `
            <div class="space-y-3 text-sm">
                <div class="flex justify-between"><span class="text-gray-500">设备名称</span><span class="font-medium text-gray-800">${channel.name}</span></div>
                <div class="flex justify-between"><span class="text-gray-500">通道 ID</span><span class="font-medium text-gray-800">${channel.id}</span></div>
                <div class="flex justify-between"><span class="text-gray-500">设备 IP</span><span class="font-medium text-gray-800">${ip}</span></div>
                <div class="flex justify-between"><span class="text-gray-500">最后上线</span><span class="font-medium text-gray-800">${lastUpdate.toLocaleTimeString()}</span></div>
                <div class="flex justify-between items-center"><span class="text-gray-500">状态</span><span class="px-2 py-0.5 bg-success/10 text-success text-xs rounded-full">在线</span></div>
            </div>
        `;
        elements.deviceInfoContainer.innerHTML = infoHtml;
        elements.lastUpdate.textContent = `最后更新: ${lastUpdate.toLocaleTimeString()}`;
    }

    function renderHistoryTable(feeds) {
        let tableHtml = '';
        const abnormalFeeds = feeds.filter(feed => 
            feed.temperature > config.tempThreshold.high || feed.temperature < config.tempThreshold.low ||
            feed.humidity > config.humidityThreshold.high || feed.humidity < config.humidityThreshold.low ||
            feed.waterLevel < config.waterLevelThreshold.low
        ).reverse();

        if (abnormalFeeds.length === 0) {
            elements.historyRecordsBody.innerHTML = `<tr><td colspan="3" class="px-4 py-10 text-center text-gray-500">近期无异常记录</td></tr>`;
            return;
        }

        abnormalFeeds.slice(0, 15).forEach(feed => {
            let type = '', detail = '', typeClass = '';
            if (feed.temperature > config.tempThreshold.high) { type = '高温'; detail = `${feed.temperature.toFixed(1)}°C`; typeClass = 'bg-danger/10 text-danger'; }
            else if (feed.temperature < config.tempThreshold.low) { type = '低温'; detail = `${feed.temperature.toFixed(1)}°C`; typeClass = 'bg-primary/10 text-primary'; }
            else if (feed.humidity > config.humidityThreshold.high) { type = '高湿'; detail = `${feed.humidity.toFixed(0)}%`; typeClass = 'bg-warning/10 text-warning'; }
            else if (feed.humidity < config.humidityThreshold.low) { type = '干燥'; detail = `${feed.humidity.toFixed(0)}%`; typeClass = 'bg-warning/10 text-warning'; }
            else if (feed.waterLevel < config.waterLevelThreshold.low) { type = '低水位'; detail = `${feed.waterLevel}mm`; typeClass = 'bg-secondary/10 text-secondary'; }
            
            tableHtml += `<tr class="hover:bg-light">
                <td class="px-4 py-2"><span class="px-2 py-1 ${typeClass} text-xs rounded-full">${type}</span></td>
                <td class="px-4 py-2 font-medium text-gray-800">${detail}</td>
                <td class="px-4 py-2 text-gray-500">${feed.timestamp.toLocaleTimeString()}</td>
            </tr>`;
        });
        elements.historyRecordsBody.innerHTML = tableHtml;
    }

    function renderChart(feeds) {
        elements.chartLoader.style.display = 'none';
        const labels = feeds.map(feed => feed.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        const tempData = feeds.map(feed => feed.temperature);
        const humiData = feeds.map(feed => feed.humidity);

        if (mainChart) {
            mainChart.data.labels = labels;
            mainChart.data.datasets[0]。data = tempData;
            mainChart.data.datasets[1].data = humiData;
            mainChart.update('none');
        } else {
            mainChart = new Chart(elements.chartCanvas, {
                输入: 'line',
                data: {
                    labels: labels，
                    datasets: [
                        { label: '温度 (°C)'， data: tempData， borderColor: tailwind。config.theme。extend。colors。danger， backgroundColor: 'rgba(255, 77, 79, 0.1)'， tension: 0.4， fill: true， yAxisID: 'y'， pointRadius: 0， borderWidth: 2 }，
                        { label: '湿度 (%)'， data: humiData， borderColor: tailwind。config.theme。extend。colors。primary， backgroundColor: 'rgba(22， 93， 255， 0.1)'， tension: 0.4， fill: true， yAxisID: 'y1'， pointRadius: 0， borderWidth: 2 }
                    ]
                }，
                options: {
                    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                    scales: {
                        x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
                        y: { 输入: 'linear', position: 'left'， title: { display: true， text: '温度 (°C)' }， grid: { color: 'rgba(0, 0, 0, 0.05)' } }，
                        y1: { 输入: 'linear', position: 'right'， title: { display: true， text: '湿度 (%)' }， grid: { drawOnChartArea: false } }
                    }，
                    plugins: { 
                        legend: { display: false },
                        tooltip: {
                            enabled: true, mode: 'index', intersect: false, backgroundColor: '#fff',
                            titleColor: '#333'， bodyColor: '#666'， borderColor: '#ddd'，
                            borderWidth: 1， padding: 10， displayColors: true， boxPadding: 4
                        }
                    }
                }
            });
        }
    }
    
    // --- 辅助函数 ---
    function calculateComfort(temp， humi) {
        if (temp >= 22 && temp <= 26 && humi >= 40 && humi <= 60) return { level: "良好", icon: "fa-smile-o", color: "success" };
        if (temp > config.tempThreshold.high || temp < config.tempThreshold.low || humi > config.humidityThreshold.high || humi < config.humidityThreshold.low) return { level: "较差", icon: "fa-frown-o", color: "danger" };
        return { level: "一般", icon: "fa-meh-o", color: "warning" };
    }
    
    function showRefreshAnimation() {
        elements.refreshIcon.classList.add('animate-spin');
        setTimeout(() => elements.refreshIcon.classList.remove('animate-spin'), 1000);
    }
    
    // --- 事件监听与初始化 ---
    elements.chartToggles.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn || !mainChart) return;
        const datasetIndex = parseInt(btn.dataset.dataset);
        mainChart.setDatasetVisibility(datasetIndex, !mainChart.isDatasetVisible(datasetIndex));
        mainChart.update();
        btn.classList.toggle('opacity-50');
    });

    fetchDataAndRender();
    setInterval(fetchDataAndRender, config.refreshInterval);
});
