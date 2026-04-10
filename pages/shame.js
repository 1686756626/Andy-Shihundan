/**
 * pages/shame.js — 丑事墙页面
 */
Object.assign(app, {
    renderShame(el) {
        const items = this.data || [];
        // 按id倒序，最新的在上面
        items.sort((a, b) => b.id - a.id);

        el.innerHTML = `
            <div class="shame-hero">
                <h1>Andy 丑事墙</h1>
                <p>记录那些不堪回首的光辉岁月</p>
                <div class="shame-counter">
                    📛 已收录丑事 <span>${items.length}</span> 件
                </div>
            </div>
            <div class="shame-wall">
                ${items.map(item => `
                    <div class="shame-card">
                        <div class="shame-header">
                            <div class="shame-tag">${item.tag || '🤡 丑事'}</div>
                            <div class="shame-date">${item.date || ''}</div>
                        </div>
                        <div class="shame-text">${item.text}</div>
                        ${item.witness ? `<div class="shame-footer"><span class="witness">${item.witness}</span></div>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
});
