/**
 * utils.js — Andy 石鸡蛋 工具函数
 */

/** 增强版 Markdown → HTML（支持代码块、列表、引用、链接等） */
function renderMarkdown(text) {
    if (!text) return '';
    let html = text;

    // 先保护代码块，避免内部被转义/替换
    const codeBlocks = [];
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        const idx = codeBlocks.length;
        codeBlocks.push('<div class="md-code-block"><div class="md-code-header"><span>' + (lang || 'code') + '</span><button class="md-copy-btn" onclick="copyCode(this)">复制</button></div><pre><code>' + escapeHtmlInner(code.trimEnd()) + '</code></pre></div>');
        return '%%CODEBLOCK_' + idx + '%%';
    });

    // 内联代码
    const inlineCodes = [];
    html = html.replace(/`([^`]+)`/g, (_, code) => {
        const idx = inlineCodes.length;
        inlineCodes.push('<code class="md-inline-code">' + escapeHtmlInner(code) + '</code>');
        return '%%INLINECODE_' + idx + '%%';
    });

    // 转义 HTML（代码块已保护）
    html = html.replace(/&/g, '&amp;');
    html = html.replace(/</g, '&lt;');
    html = html.replace(/>/g, '&gt;');

    // 引用块
    html = html.replace(/^&gt;\s?(.*)$/gm, '<div class="md-quote">$1</div>');

    // 标题
    html = html.replace(/^### (.+)$/gm, '<div class="md-h3">$1</div>');
    html = html.replace(/^## (.+)$/gm, '<div class="md-h2">$1</div>');
    html = html.replace(/^# (.+)$/gm, '<div class="md-h1">$1</div>');

    // 粗体、斜体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // 无序列表
    html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li class="md-li">$1</li>');

    // 有序列表
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="md-li-ol">$1</li>');

    // 把连续的 li 包在 ul/ol 里
    html = html.replace(/((<li class="md-li">.*<\/li>\n?)+)/g, '<ul class="md-ul">$1</ul>');
    html = html.replace(/((<li class="md-li-ol">.*<\/li>\n?)+)/g, '<ol class="md-ol">$1</ol>');

    // 换行
    html = html.replace(/\n/g, '<br>');

    // 去掉多余的 <br> 在块级元素前后
    html = html.replace(/<br><(div|ul|ol)/g, '<$1');
    html = html.replace(/<\/(div|ul|ol)><br>/g, '</$1>');

    // 还原代码块和内联代码
    codeBlocks.forEach((block, i) => {
        html = html.replace('%%CODEBLOCK_' + i + '%%', block);
    });
    inlineCodes.forEach((code, i) => {
        html = html.replace('%%INLINECODE_' + i + '%%', code);
    });

    return html;
}

function escapeHtmlInner(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 复制代码块（全局函数供 onclick 调用） */
function copyCode(btn) {
    const code = btn.closest('.md-code-block').querySelector('code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        btn.textContent = '已复制 ✓';
        setTimeout(() => { btn.textContent = '复制'; }, 1500);
    });
}

/** HTML 转义 */
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

/** 格式化日期 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    return dateStr;
}

/** 生成唯一 ID */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
