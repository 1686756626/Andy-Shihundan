/**
 * pages/chat.js — AI 聊天页面（完整版）
 * 
 * 功能：多会话 · 历史持久化 · 打字机效果 · 消息操作 · 快捷提问 · 移动端优化 · 文件上传
 */
Object.assign(app, {
    _chatStreaming: false,
    _chatController: null,
    _currentSessionId: null,
    _sessionsKey: 'andy_sessions',
    _activeKey: 'andy_active_session',
    _pendingFiles: [], // 待发送的文件

    // ==================== 会话管理 ====================

    _getAllSessions() {
        try {
            return JSON.parse(localStorage.getItem(this._sessionsKey)) || [];
        } catch { return []; }
    },

    _saveAllSessions(sessions) {
        try { localStorage.setItem(this._sessionsKey, JSON.stringify(sessions)); } catch {}
    },

    _getSession(id) {
        return this._getAllSessions().find(s => s.id === id);
    },

    _getActiveSessionId() {
        return localStorage.getItem(this._activeKey) || null;
    },

    _setActiveSessionId(id) {
        if (id) localStorage.setItem(this._activeKey, id);
        else localStorage.removeItem(this._activeKey);
    },

    _createSession() {
        const sessions = this._getAllSessions();
        const s = {
            id: generateId(),
            sessionId: String(Date.now()),
            title: '新对话',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        sessions.unshift(s);
        this._saveAllSessions(sessions);
        this._currentSessionId = s.id;
        this._setActiveSessionId(s.id);
        return s;
    },

    _updateSession(id, updates) {
        const sessions = this._getAllSessions();
        const idx = sessions.findIndex(s => s.id === id);
        if (idx >= 0) {
            Object.assign(sessions[idx], updates, { updatedAt: Date.now() });
            this._saveAllSessions(sessions);
        }
    },

    _deleteSession(id) {
        let sessions = this._getAllSessions();
        sessions = sessions.filter(s => s.id !== id);
        this._saveAllSessions(sessions);
        if (this._currentSessionId === id) {
            if (sessions.length > 0) {
                this._currentSessionId = sessions[0].id;
                this._setActiveSessionId(sessions[0].id);
            } else {
                this._createSession();
            }
        }
        this.renderChat(document.getElementById('content'));
    },

    // ==================== 主渲染 ====================

    renderChat(el) {
        let sid = this._getActiveSessionId();
        let session = sid ? this._getSession(sid) : null;
        if (!session) {
            session = this._createSession();
        }
        this._currentSessionId = session.id;
        this._setActiveSessionId(session.id);

        const sessions = this._getAllSessions();
        const msgs = session.messages || [];
        this._pendingFiles = [];

        el.innerHTML = `
            <div class="chat-layout">
                <div class="chat-sidebar" id="chat-sidebar">
                    <div class="sidebar-header">
                        <button class="sidebar-new-btn" id="sidebar-new">+ 新对话</button>
                        <button class="sidebar-toggle-btn" id="sidebar-close">✕</button>
                    </div>
                    <div class="sidebar-list" id="sidebar-list">
                        ${sessions.map(s => `
                            <div class="sidebar-item ${s.id === session.id ? 'active' : ''}" data-id="${s.id}">
                                <span class="sidebar-item-title">${this._escapeAttr(s.title)}</span>
                                <button class="sidebar-item-del" data-del="${s.id}" title="删除">✕</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="chat-main">
                    <div class="chat-toolbar">
                        <button class="toolbar-menu-btn" id="sidebar-open">☰</button>
                        <span class="chat-toolbar-title">🤖 AI 聊天</span>
                        ${msgs.length > 0 ? '<button class="chat-clear-btn" id="chat-clear" title="清空当前对话">🗑️</button>' : ''}
                    </div>
                    <div class="chat-body">
                        <div class="chat-welcome" id="chat-welcome" style="${msgs.length > 0 ? 'display:none' : ''}">
                            <div class="emoji">🤖</div>
                            <h2>AI 聊天</h2>
                            <p>有什么想问的？尽管说。<br>别问 Andy 的丑事，太多了说不完。</p>
                            <div class="quick-questions">
                                <button class="qq-btn" data-q="Andy 最丑的事是什么？">Andy 最丑的事是什么？</button>
                                <button class="qq-btn" data-q="讲个笑话">讲个笑话</button>
                                <button class="qq-btn" data-q="你是谁？">你是谁？</button>
                                <button class="qq-btn" data-q="评价一下 Andy">评价一下 Andy</button>
                            </div>
                        </div>
                        <div class="chat-messages" id="chat-messages"></div>
                    </div>
                    <div class="chat-input-area">
                        <div class="chat-file-preview" id="chat-file-preview"></div>
                        <div class="chat-input-wrap">
                            <input type="file" id="chat-file-input" multiple hidden accept="image/*,.txt,.md,.json,.csv,.xml,.html,.css,.js,.py,.java,.c,.cpp,.h,.go,.rs,.ts,.tsx,.jsx,.yaml,.yml,.toml,.ini,.cfg,.log,.sql,.sh,.bat,.ps1,.rb,.php,.swift,.kt,.r,.m,.lua,.pl,.scala,.docx,.pdf">
                            <button class="chat-attach-btn" id="chat-attach" title="上传文件">📎</button>
                            <textarea id="chat-input" rows="1"
                                placeholder="${CONFIG.chat.placeholder}"
                                onkeydown="app._handleChatKey(event)"></textarea>
                            <button class="chat-send-btn" id="chat-send" onclick="app._sendChat()">➤</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 渲染历史消息
        if (msgs.length > 0) {
            const msgsEl = document.getElementById('chat-messages');
            msgs.forEach(msg => this._renderMsg(msgsEl, msg));
            msgsEl.scrollTop = msgsEl.scrollHeight;
        }

        this._bindChatEvents();
    },

    _escapeAttr(s) {
        return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    },

    // ==================== 事件绑定 ====================

    _bindChatEvents() {
        const self = this;

        // 新对话
        document.getElementById('sidebar-new')?.addEventListener('click', () => {
            self._createSession();
            self.renderChat(document.getElementById('content'));
        });

        // 切换会话
        document.getElementById('sidebar-list')?.addEventListener('click', (e) => {
            const del = e.target.closest('[data-del]');
            if (del) { e.stopPropagation(); self._deleteSession(del.dataset.del); return; }
            const item = e.target.closest('.sidebar-item');
            if (item) {
                self._currentSessionId = item.dataset.id;
                self._setActiveSessionId(item.dataset.id);
                self.renderChat(document.getElementById('content'));
            }
        });

        // 侧边栏开关
        document.getElementById('sidebar-close')?.addEventListener('click', () => self._toggleSidebar(false));
        document.getElementById('sidebar-open')?.addEventListener('click', () => self._toggleSidebar(true));

        // 清空
        document.getElementById('chat-clear')?.addEventListener('click', () => {
            self._updateSession(self._currentSessionId, { messages: [] });
            self.renderChat(document.getElementById('content'));
        });

        // 快捷提问
        document.querySelectorAll('.qq-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('chat-input').value = btn.dataset.q;
                self._sendChat();
            });
        });

        // 文件上传
        document.getElementById('chat-attach')?.addEventListener('click', () => {
            document.getElementById('chat-file-input').click();
        });

        document.getElementById('chat-file-input')?.addEventListener('change', (e) => {
            self._handleFiles(e.target.files);
            e.target.value = '';
        });

        // 拖拽上传
        const chatBody = document.querySelector('.chat-body');
        if (chatBody) {
            chatBody.addEventListener('dragover', (e) => {
                e.preventDefault();
                chatBody.classList.add('drag-over');
            });
            chatBody.addEventListener('dragleave', () => {
                chatBody.classList.remove('drag-over');
            });
            chatBody.addEventListener('drop', (e) => {
                e.preventDefault();
                chatBody.classList.remove('drag-over');
                self._handleFiles(e.dataTransfer.files);
            });
        }

        // 粘贴上传（截图等）
        document.getElementById('chat-input')?.addEventListener('paste', (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            const files = [];
            for (const item of items) {
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file) files.push(file);
                }
            }
            if (files.length > 0) {
                e.preventDefault();
                self._handleFiles(files);
            }
        });

        // 消息操作（事件委托）
        document.getElementById('chat-messages')?.addEventListener('click', (e) => {
            const copyBtn = e.target.closest('.msg-copy');
            if (copyBtn) {
                const text = copyBtn.closest('.chat-msg').dataset.raw || '';
                navigator.clipboard.writeText(text).then(() => {
                    copyBtn.textContent = '已复制';
                    setTimeout(() => { copyBtn.textContent = '复制'; }, 1500);
                });
                return;
            }
            const regenBtn = e.target.closest('.msg-regen');
            if (regenBtn) { self._regenerate(); return; }
        });

        // textarea auto-resize & focus
        const ta = document.getElementById('chat-input');
        if (ta) {
            ta.addEventListener('input', function() {
                this.style.height = '48px';
                this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            });
            ta.focus();
        }
    },

    _toggleSidebar(open) {
        const sb = document.getElementById('chat-sidebar');
        if (sb) sb.classList.toggle('open', open);
    },

    // ==================== 文件处理 ====================

    _handleFiles(fileList) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const maxFiles = 5;

        for (const file of fileList) {
            if (this._pendingFiles.length >= maxFiles) {
                alert('最多同时上传 ' + maxFiles + ' 个文件');
                break;
            }
            if (file.size > maxSize) {
                alert(file.name + ' 超过 10MB 限制');
                continue;
            }
            this._pendingFiles.push(file);
        }
        this._renderFilePreview();
    },

    _removePendingFile(idx) {
        this._pendingFiles.splice(idx, 1);
        this._renderFilePreview();
    },

    _renderFilePreview() {
        const preview = document.getElementById('chat-file-preview');
        if (!preview) return;

        if (this._pendingFiles.length === 0) {
            preview.innerHTML = '';
            preview.style.display = 'none';
            return;
        }

        preview.style.display = 'flex';
        preview.innerHTML = this._pendingFiles.map((f, i) => {
            const isImage = f.type.startsWith('image/');
            const sizeStr = f.size < 1024 ? f.size + 'B' :
                            f.size < 1024*1024 ? (f.size/1024).toFixed(1) + 'KB' :
                            (f.size/1024/1024).toFixed(1) + 'MB';
            if (isImage) {
                return `<div class="file-item file-img">
                    <img src="" data-file-idx="${i}" alt="${this._escapeAttr(f.name)}">
                    <div class="file-info"><span>${this._escapeAttr(f.name)}</span><span>${sizeStr}</span></div>
                    <button class="file-remove" data-remove="${i}">✕</button>
                </div>`;
            }
            const icon = this._fileIcon(f.name);
            return `<div class="file-item">
                <div class="file-icon">${icon}</div>
                <div class="file-info"><span>${this._escapeAttr(f.name)}</span><span>${sizeStr}</span></div>
                <button class="file-remove" data-remove="${i}">✕</button>
            </div>`;
        }).join('');

        // 渲染图片缩略图
        this._pendingFiles.forEach((f, i) => {
            if (f.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = preview.querySelector(`[data-file-idx="${i}"]`);
                    if (img) img.src = e.target.result;
                };
                reader.readAsDataURL(f);
            }
        });

        // 删除按钮
        preview.querySelectorAll('.file-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                this._removePendingFile(parseInt(btn.dataset.remove));
            });
        });
    },

    _fileIcon(name) {
        const ext = (name || '').split('.').pop().toLowerCase();
        const map = {
            'js': '📜', 'ts': '📜', 'py': '🐍', 'java': '☕', 'c': '⚙️', 'cpp': '⚙️',
            'json': '📋', 'csv': '📊', 'md': '📝', 'txt': '📄', 'html': '🌐', 'css': '🎨',
            'xml': '📋', 'sql': '🗃️', 'sh': '🖥️', 'yaml': '📋', 'yml': '📋',
            'docx': '📘', 'doc': '📘', 'pdf': '📕',
            'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'webp': '🖼️', 'svg': '🖼️'
        };
        return map[ext] || '📎';
    },

    // 读取文件为各种格式
    _readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    _readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    _readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    async _extractDocxText(file) {
        try {
            if (typeof mammoth === 'undefined') {
                return '[Word 文档解析库加载失败，请刷新页面重试]';
            }
            const buffer = await this._readFileAsArrayBuffer(file);
            const result = await mammoth.extractRawText({ arrayBuffer: buffer });
            return result.value || '[Word 文档内容为空]';
        } catch (e) {
            return '[Word 文档解析失败: ' + e.message + ']';
        }
    },

    async _prepareFiles() {
        const contentParts = [];
        const fileHtmlParts = [];

        for (const file of this._pendingFiles) {
            const isImage = file.type.startsWith('image/');
            const ext = (file.name || '').split('.').pop().toLowerCase();
            const isDocx = ext === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

            if (isImage) {
                // 图片：用 base64 data URL 传给 API
                const dataUrl = await this._readFileAsDataURL(file);
                contentParts.push({
                    type: 'image_url',
                    image_url: { url: dataUrl }
                });
                fileHtmlParts.push(`<div class="msg-image"><img src="${dataUrl}" alt="${this._escapeAttr(file.name)}"></div>`);
            } else if (isDocx) {
                // Word 文档：用 mammoth.js 提取文本
                const text = await this._extractDocxText(file);
                contentParts.push({
                    type: 'text',
                    text: `\n--- 文件: ${file.name} ---\n${text}\n--- 文件结束 ---\n`
                });
                fileHtmlParts.push(`<div class="msg-file-badge">${this._fileIcon(file.name)} ${this._escapeAttr(file.name)}</div>`);
            } else {
                // 其他文本文件：读取内容拼到文本里
                const text = await this._readFileAsText(file);
                contentParts.push({
                    type: 'text',
                    text: `\n--- 文件: ${file.name} ---\n${text}\n--- 文件结束 ---\n`
                });
                fileHtmlParts.push(`<div class="msg-file-badge">${this._fileIcon(file.name)} ${this._escapeAttr(file.name)}</div>`);
            }
        }

        return { contentParts, fileHtmlParts };
    },

    // ==================== 消息渲染 ====================

    _renderMsg(container, msg) {
        const div = document.createElement('div');
        div.className = 'chat-msg ' + msg.role;
        div.dataset.raw = msg.raw || '';
        const html = msg.html || escapeHtml(msg.raw || '');
        const actions = [];
        actions.push('<button class="msg-copy">复制</button>');
        if (msg.role === 'ai') actions.push('<button class="msg-regen">重新生成</button>');
        div.innerHTML = `
            <div class="bubble">${html}</div>
            <div class="msg-actions">${actions.join('')}</div>
        `;
        container.appendChild(div);
        return div;
    },

    _appendMsg(role, html, raw) {
        const msgs = document.getElementById('chat-messages');
        const welcome = document.getElementById('chat-welcome');
        if (welcome) welcome.style.display = 'none';

        const div = document.createElement('div');
        div.className = 'chat-msg ' + role;
        div.dataset.raw = raw || '';
        const actions = [];
        actions.push('<button class="msg-copy">复制</button>');
        if (role === 'ai') actions.push('<button class="msg-regen">重新生成</button>');
        div.innerHTML = `
            <div class="bubble">${html}</div>
            <div class="msg-actions">${actions.join('')}</div>
        `;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
        return div;
    },

    // ==================== 发送消息 ====================

    _handleChatKey(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this._sendChat();
        }
    },

    async _sendChat() {
        const input = document.getElementById('chat-input');
        const btn = document.getElementById('chat-send');
        const text = input.value.trim();
        const hasFiles = this._pendingFiles.length > 0;

        if ((!text && !hasFiles) || this._chatStreaming) return;

        // 准备文件
        let fileData = { contentParts: [], fileHtmlParts: [] };
        if (hasFiles) {
            btn.disabled = true;
            btn.innerHTML = '📂';
            fileData = await this._prepareFiles();
        }

        input.value = '';
        input.style.height = '48px';

        // 构建用户消息显示
        const displayText = text || '（发送了文件）';
        const filesHtml = fileData.fileHtmlParts.join('');
        const userHtml = (filesHtml ? filesHtml : '') + (text ? escapeHtml(text) : '');

        this._appendMsg('user', userHtml, displayText);

        const session = this._getSession(this._currentSessionId);
        if (!session) return;
        const history = session.messages || [];
        history.push({ role: 'user', html: userHtml, raw: displayText });

        // 自动标题
        if (history.filter(m => m.role === 'user').length === 1) {
            this._updateSession(this._currentSessionId, { title: displayText.slice(0, 30), messages: history });
            this._refreshSidebar();
        } else {
            this._updateSession(this._currentSessionId, { messages: history });
        }

        // 清空待发文件
        this._pendingFiles = [];
        this._renderFilePreview();

        this._chatStreaming = true;
        btn.disabled = true;
        btn.innerHTML = '⏳';

        try {
            // 构建 API content
            const apiContent = [];
            // 图片放前面
            for (const part of fileData.contentParts) {
                if (part.type === 'image_url') apiContent.push(part);
            }
            // 文本
            const textParts = fileData.contentParts.filter(p => p.type === 'text');
            const fileText = textParts.map(p => p.text).join('\n');
            const fullText = (text ? text + '\n' : '') + fileText;
            if (fullText.trim()) {
                apiContent.push({ type: 'text', text: fullText.trim() });
            }

            const payload = {
                input: [{ content: apiContent }],
                session_id: session.sessionId,
                user_id: CONFIG.chat.userId,
                channel: 'console'
            };

            this._chatController = new AbortController();
            const resp = await fetch(CONFIG.chat.apiBase + '/agents/' + CONFIG.chat.agentId + '/console/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: this._chatController.signal
            });

            if (!resp.ok) throw new Error('API 返回 ' + resp.status);

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            const aiDiv = this._appendMsg('ai', '<span class="typing-cursor">思考中</span>', '');
            const aiBubble = aiDiv.querySelector('.bubble');
            let fullAiText = '';
            let buffer = '';
            let renderTimer = null;

            const scheduleRender = () => {
                if (renderTimer) return;
                renderTimer = setTimeout(() => {
                    renderTimer = null;
                    if (fullAiText) {
                        aiBubble.innerHTML = renderMarkdown(fullAiText) + '<span class="typing-cursor">▍</span>';
                        const msgs = document.getElementById('chat-messages');
                        if (msgs) msgs.scrollTop = msgs.scrollHeight;
                    }
                }, 60);
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const chunks = buffer.split('\n\n');
                buffer = chunks.pop() || '';

                for (const chunk of chunks) {
                    for (const line of chunk.split('\n')) {
                        if (!line.startsWith('data: ')) continue;
                        const raw = line.slice(6).trim();
                        if (!raw || raw === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(raw);
                            if (parsed.text) {
                                fullAiText = parsed.text;
                            } else if (parsed.content) {
                                const parts = Array.isArray(parsed.content) ? parsed.content : [parsed.content];
                                let t = '';
                                for (const p of parts) { if (p.type === 'text' && p.text) t += p.text; }
                                if (t) fullAiText = t;
                            } else if (parsed.delta) {
                                if (parsed.delta.text) fullAiText += parsed.delta.text;
                            }
                        } catch (e) {}
                    }
                    scheduleRender();
                }
            }

            if (renderTimer) { clearTimeout(renderTimer); renderTimer = null; }

            if (fullAiText) {
                aiBubble.innerHTML = renderMarkdown(fullAiText);
                aiDiv.dataset.raw = fullAiText;
            } else {
                fullAiText = '（无回复）';
                aiBubble.innerHTML = '<span style="color:#6b7280">（无回复）</span>';
            }
            const msgs = document.getElementById('chat-messages');
            if (msgs) msgs.scrollTop = msgs.scrollHeight;

            // 保存 AI 回复
            const session2 = this._getSession(this._currentSessionId);
            const hist2 = session2 ? session2.messages : [];
            hist2.push({ role: 'ai', html: renderMarkdown(fullAiText), raw: fullAiText });
            this._updateSession(this._currentSessionId, { messages: hist2 });

        } catch (err) {
            if (err.name !== 'AbortError') {
                const errMsg = '<span style="color:#ef4444">⚠️ ' + escapeHtml(err.message) + '</span>';
                this._appendMsg('ai', errMsg, err.message);
                const session3 = this._getSession(this._currentSessionId);
                const hist3 = session3 ? session3.messages : [];
                hist3.push({ role: 'ai', html: errMsg, raw: err.message });
                this._updateSession(this._currentSessionId, { messages: hist3 });
            }
        } finally {
            this._chatStreaming = false;
            btn.disabled = false;
            btn.innerHTML = '➤';
            this._chatController = null;
        }
    },

    // ==================== 重新生成 ====================

    async _regenerate() {
        if (this._chatStreaming) return;
        const session = this._getSession(this._currentSessionId);
        if (!session || session.messages.length < 2) return;

        let last = session.messages.pop();
        if (last.role !== 'ai') { session.messages.push(last); return; }

        let lastUser = '';
        for (let i = session.messages.length - 1; i >= 0; i--) {
            if (session.messages[i].role === 'user') { lastUser = session.messages[i].raw; break; }
        }
        if (!lastUser) return;

        this._updateSession(this._currentSessionId, { messages: session.messages });
        this.renderChat(document.getElementById('content'));

        const input = document.getElementById('chat-input');
        input.value = lastUser;
        this._sendChat();
    },

    // ==================== 刷新侧边栏 ====================

    _refreshSidebar() {
        const list = document.getElementById('sidebar-list');
        if (!list) return;
        const sessions = this._getAllSessions();
        list.innerHTML = sessions.map(s => `
            <div class="sidebar-item ${s.id === this._currentSessionId ? 'active' : ''}" data-id="${s.id}">
                <span class="sidebar-item-title">${this._escapeAttr(s.title)}</span>
                <button class="sidebar-item-del" data-del="${s.id}" title="删除">✕</button>
            </div>
        `).join('');
    }
});
