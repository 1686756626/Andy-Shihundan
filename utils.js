/**
 * utils.js — Andy 石鸡蛋 工具函数
 */

/** 简易 Markdown → HTML */
function simpleMarkdown(text) {
    if (!text) return '';
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    html = html.replace(/\n/g, '<br>');
    return html;
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
    return Date.now();
}
