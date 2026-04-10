/**
 * app.js — Andy 石鸡蛋 主应用
 *
 * 架构概览：
 *   config.js  → CONFIG（站点配置）
 *   utils.js   → 工具函数
 *   app.js     → 本文件，路由 + 渲染 + 数据加载（单页应用）
 *   pages/*.js → 各页面渲染逻辑（Object.assign 挂到 app 上）
 *
 * 数据流：
 *   init() → loadData() → fetch shame.json
 *         → route() → 根据 hash 渲染对应页面
 *
 * 页面路由（hash）：
 *   #shame → renderShame()     丑事墙
 *   #chat  → renderChat()      AI 聊天
 */

const app = {
    data: null,
    currentPage: 'shame',

    async init() {
        await this.loadData();
        window.addEventListener('hashchange', () => this.route());
        this.route();
    },

    async loadData() {
        try {
            const res = await fetch('shame.json?t=' + Date.now());
            this.data = await res.json();
        } catch (e) {
            console.error('加载数据失败:', e);
            this.data = [];
        }
    },

    route() {
        const hash = location.hash.slice(1) || 'shame';
        const parts = hash.split('/');
        const page = parts[0];

        this.currentPage = page;

        // 更新导航高亮
        document.querySelectorAll('.nav-tab').forEach(el => {
            el.classList.toggle('active', el.dataset.page === page);
        });

        const contentEl = document.getElementById('content');
        if (!contentEl) return;

        switch (page) {
            case 'shame': this.renderShame(contentEl); break;
            case 'chat':  this.renderChat(contentEl);  break;
            default:      this.renderShame(contentEl);
        }

        window.scrollTo(0, 0);
    },

    // 占位，由 pages/*.js 通过 Object.assign 挂载
    renderShame() {},
    renderChat() {},
};

// ==================== 启动 ====================
document.addEventListener('DOMContentLoaded', () => app.init());
