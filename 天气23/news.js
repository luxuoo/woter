// 天气新闻相关功能
const NEWS_API_KEY = ''; // 将从管理员设置中获取
const NEWS_API_URL = 'https://api.newscatcherapi.com/v2/search';

// DOM元素
const newsContainer = document.getElementById('news-container');
const newsCategory = document.getElementById('news-category');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 新闻分类切换事件
    if (newsCategory) {
        newsCategory.addEventListener('change', () => {
            loadNews(newsCategory.value);
        });
    }
});

// 加载天气新闻
async function loadNews(category = 'all') {
    if (!newsContainer) return;
    
    // 显示加载中
    newsContainer.innerHTML = `
        <div class="col-12 text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">加载中...</span>
            </div>
        </div>
    `;
    
    try {
        // 获取API设置
        const apiSettings = await getApiSettings();
        const newsApiKey = apiSettings?.newsApiKey || '';
        
        if (!newsApiKey) {
            // 如果没有配置新闻API密钥，使用备用方法
            await loadWeatherAlerts();
            return;
        }
        
        // 构建查询参数
        let query = 'weather';
        if (category === 'alerts') {
            query = 'weather alert OR warning';
        } else if (category === 'events') {
            query = 'weather storm OR flood OR hurricane OR typhoon';
        }
        
        // 获取新闻数据
        const response = await fetch(`${NEWS_API_URL}?q=${encodeURIComponent(query)}&lang=zh&page_size=10`, {
            headers: {
                'x-api-key': newsApiKey
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayNews(data.articles);
        } else {
            throw new Error('获取新闻失败');
        }
    } catch (error) {
        console.error('加载新闻失败:', error);
        
        // 使用备用方法：从和风天气获取天气预警
        try {
            await loadWeatherAlerts();
        } catch (backupError) {
            newsContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        无法获取天气新闻，请稍后再试。
                    </div>
                </div>
            `;
        }
    }
}

// 从和风天气获取天气预警作为备用
async function loadWeatherAlerts() {
    const API_KEY = document.getElementById('weather-api-key')?.value || '16ad6adeb7474a75a33116a10a34170b';
    const cities = ['北京', '上海', '广州', '深圳', '成都', '重庆', '武汉', '西安', '南京', '杭州'];
    const alerts = [];
    
    // 获取多个城市的预警信息
    for (const city of cities) {
        try {
            const cityInfo = await getCityId(city);
            const response = await fetch(`https://devapi.qweather.com/v7/warning/now?location=${cityInfo.id}&key=${API_KEY}`);
            const data = await response.json();
            
            if (data.code === '200' && data.warning && data.warning.length > 0) {
                data.warning.forEach(alert => {
                    alerts.push({
                        title: `${city}${alert.typeName}预警`,
                        summary: alert.text,
                        published_date: alert.pubTime,
                        link: '',
                        media: null,
                        location: city
                    });
                });
            }
        } catch (error) {
            console.error(`获取${city}预警信息失败:`, error);
        }
    }
    
    if (alerts.length > 0) {
        displayNews(alerts);
    } else {
        // 如果没有预警，显示模拟新闻
        displayMockNews();
    }
}

// 显示模拟新闻
function displayMockNews() {
    const mockNews = [
        {
            title: '北京今日高温预警',
            summary: '北京市气象台发布高温黄色预警，预计今日最高气温将达到35℃以上，请注意防暑降温。',
            published_date: new Date().toISOString(),
            link: '',
            media: null,
            location: '北京'
        },
        {
            title: '广东沿海地区台风预警',
            summary: '广东省气象台发布台风蓝色预警，预计未来24小时内沿海地区将有强风雨天气，请注意防范。',
            published_date: new Date().toISOString(),
            link: '',
            media: null,
            location: '广东'
        },
        {
            title: '四川盆地暴雨预警',
            summary: '四川省气象台发布暴雨黄色预警，预计未来12小时内部分地区降雨量将达到50mm以上，请注意防范山洪和地质灾害。',
            published_date: new Date().toISOString(),
            link: '',
            media: null,
            location: '四川'
        },
        {
            title: '全国多地迎来强降雨天气',
            summary: '中央气象台预计，未来三天，华南、江南等地将有较强降雨，局部地区可能出现暴雨，请注意防范。',
            published_date: new Date().toISOString(),
            link: '',
            media: null,
            location: '全国'
        },
        {
            title: '东北地区将迎来降温',
            summary: '气象部门预计，未来两天东北地区将有较强冷空气活动，气温将下降5-8℃，请注意添加衣物。',
            published_date: new Date().toISOString(),
            link: '',
            media: null,
            location: '东北'
        },
        {
            title: '西北地区沙尘天气预警',
            summary: '西北地区多地发布沙尘暴预警，预计未来24小时内将有4-6级风，能见度较低，请注意出行安全。',
            published_date: new Date().toISOString(),
            link: '',
            media: null,
            location: '西北'
        }
    ];
    
    displayNews(mockNews);
}

// 显示新闻
function displayNews(articles) {
    if (!articles || articles.length === 0) {
        newsContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    暂无相关天气新闻。
                </div>
            </div>
        `;
        return;
    }
    
    newsContainer.innerHTML = '';
    
    articles.forEach(article => {
        const newsCard = document.createElement('div');
        newsCard.className = 'col-md-6 col-lg-4 mb-4';
        
        const imageUrl = article.media || 'default-news.jpg';
        const date = new Date(article.published_date).toLocaleDateString('zh-CN');
        
        newsCard.innerHTML = `
            <div class="card h-100">
                ${imageUrl !== 'default-news.jpg' ? `<img src="${imageUrl}" class="card-img-top" alt="${article.title}" onerror="this.src='default-news.jpg'">` : ''}
                <div class="card-body">
                    <h5 class="card-title">${article.title}</h5>
                    <p class="card-text">${article.summary}</p>
                </div>
                <div class="card-footer d-flex justify-content-between align-items-center">
                    <small class="text-muted">${date}</small>
                    ${article.location ? `<span class="badge bg-info">${article.location}</span>` : ''}
                    ${article.link ? `<a href="${article.link}" target="_blank" class="btn btn-sm btn-outline-primary">阅读全文</a>` : ''}
                </div>
            </div>
        `;
        
        newsContainer.appendChild(newsCard);
    });
}

// 获取API设置
async function getApiSettings() {
    // 如果是管理员，从管理员设置中获取
    if (window.currentUser?.isAdmin) {
        const weatherApiKey = document.getElementById('weather-api-key')?.value;
        const newsApiKey = document.getElementById('news-api-key')?.value;
        return { weatherApiKey, newsApiKey };
    }
    
    // 否则从服务器获取
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const response = await fetch(`${API_BASE_URL}/settings/api`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                return await response.json();
            }
        }
    } catch (error) {
        console.error('获取API设置失败:', error);
    }
    
    // 默认返回空对象
    return {};
}

// 暴露给全局的函数
window.loadNews = loadNews;
