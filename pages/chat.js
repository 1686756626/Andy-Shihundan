/**
 * pages/chat.js — AI 聊天页面（完整版）
 * 
 * 功能：多会话 · 历史持久化 · 打字机效果 · 消息操作 · 快捷提问 · 移动端优化
 */
Object.assign(app, {
    _chatStreaming: false,
    _chatController: null,
    _currentSessionId: null,
    _sessionsKey: 'andy_sessions',
    _activeKey: 'andy_active_session',

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
                        <div class="chat-input-wrap">
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

        const msg = { role, html, raw: raw || '' };
        const div = document.createElement('div');
        div.className = 'chat-msg ' + role;
        div.dataset.raw = msg.raw;
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
        if (!text || this._chatStreaming) return;

        input.value = '';
        input.style.height = '48px';
        this._appendMsg('user', escapeHtml(text), text);

        const session = this._getSession(this._currentSessionId);
        if (!session) return;
        const history = session.messages || [];
        history.push({ role: 'user', html: escapeHtml(text), raw: text });

        // 自动标题（第一条消息）
        if (history.filter(m => m.role === 'user').length === 1) {
            this._updateSession(this._currentSessionId, { title: text.slice(0, 30), messages: history });
            this._refreshSidebar();
        } else {
            this._updateSession(this._currentSessionId, { messages: history });
        }

        this._chatStreaming = true;
        btn.disabled = true;
        btn.innerHTML = '⏳';

        try {
            const payload = {
                input: [{ content: [{ type: 'text', text }] }],
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
            let fullText = '';
            let buffer = '';
            let renderTimer = null;

            const scheduleRender = () => {
                if (renderTimer) return;
                renderTimer = setTimeout(() => {
                    renderTimer = null;
                    if (fullText) {
                        aiBubble.innerHTML = renderMarkdown(fullText) + '<span class="typing-cursor">▍</span>';
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
                                fullText = parsed.text;
                            } else if (parsed.content) {
                                const parts = Array.isArray(parsed.content) ? parsed.content : [parsed.content];
                                let t = '';
                                for (const p of parts) { if (p.type === 'text' && p.text) t += p.text; }
                                if (t) fullText = t;
                            } else if (parsed.delta) {
                                if (parsed.delta.text) fullText += parsed.delta.text;
                            }
                        } catch (e) {}
                    }
                    scheduleRender();
                }
            }

            if (renderTimer) { clearTimeout(renderTimer); renderTimer = null; }

            if (fullText) {
                aiBubble.innerHTML = renderMarkdown(fullText);
                aiDiv.dataset.raw = fullText;
            } else {
                fullText = '（无回复）';
                aiBubble.innerHTML = '<span style="color:#6b7280">（无回复）</span>';
            }
            const msgs = document.getElementById('chat-messages');
            if (msgs) msgs.scrollTop = msgs.scrollHeight;

            // 保存 AI 回复
            const session2 = this._getSession(this._currentSessionId);
            const hist2 = session2 ? session2.messages : [];
            hist2.push({ role: 'ai', html: renderMarkdown(fullText), raw: fullText });
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

        // 移除最后一条 AI 消息
        let last = session.messages.pop();
        if (last.role !== 'ai') { session.messages.push(last); return; }

        // 获取上一条用户消息
        let lastUser = '';
        for (let i = session.messages.length - 1; i >= 0; i--) {
            if (session.messages[i].role === 'user') { lastUser = session.messages[i].raw; break; }
        }
        if (!lastUser) return;

        this._updateSession(this._currentSessionId, { messages: session.messages });
        this.renderChat(document.getElementById('content'));

        // 用上一条用户消息重新发送
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
