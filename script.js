// ===============================================================
// --- 诊断专用脚本 ---
// 这个脚本的唯一目的，是确认JS文件本身能否被正确执行。
// ===============================================================

// 1. 在脚本文件被加载时，立即在控制台打印一条消息
console。log("诊断脚本文件 (script.js) 已被浏览器加载。");

// 2. 当页面的基本结构（DOM）加载完毕后，执行里面的代码
document。addEventListener('DOMContentLoaded'， () => {
    
    // 3. 在控制台打印第二条消息
    console.log("DOMContentLoaded 事件已成功触发！");

    // 4. 尝试修改页面上的一个元素来提供视觉反馈
    const header = document.querySelector('h1');
    if (header) {
        header。textContent = "JavaScript 正在工作！";
        header。style。color = "red";
        console。log("页面标题已被成功修改为红色。");
    } else {
        console。error("错误：未能找到页面标题元素 (h1)。");
    }
});
