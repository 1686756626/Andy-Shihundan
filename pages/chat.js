/**
 * pages/chat.js — AI 聊天页面（支持历史记录持久化）
 */
Object.assign(app, {
    _chatSessionId: null,
    _chatStreaming: false,
    _chatController: null,
    _storageKey: 'andy_chat_history',

    _loadHistory() {
        try {
            const data = localStorage.getItem(this._storageKey);
            if (!data) return [];
            const parsed = JSON.parse(data);
            // 恢复 session_id
            if (parsed.sessionId) this._chatSessionId = parsed.sessionId;
            return parsed.messages || [];
        } catch (e) {
            return [];
        }
    },

    _saveHistory(messages) {
        try {
            localStorage.setItem(this._storageKey, JSON.stringify({
                sessionId: this._chatSessionId,
                messages: messages
            }));
        } catch (e) {}
    },

    _clearHistory() {
        localStorage.removeItem(this._storageKey);
        this._chatSessionId = String(Date.now());
        this.renderChat(document.getElementById('content'));
    },

    renderChat(el) {
        // 初始化 session
        if (!this._chatSessionId) {
            const saved = this._loadHistory();
            if (!this._chatSessionId) this._chatSessionId = String(Date.now());
        }

        const history = this._loadHistory();

        el.innerHTML = `
            <div class="chat-page">
                <div class="chat-toolbar">
                    <span class="chat-toolbar-title">🤖 AI 聊天</span>
                    ${history.length > 0 ? '<button class="chat-clear-btn" id="chat-clear" title="清空聊天记录">🗑️ 清空</button>' : ''}
                </div>
                <div class="chat-welcome" id="chat-welcome" style="${history.length > 0 ? 'display:none' : ''}">
                    <div class="emoji">🤖</div>
                    <h2>AI 聊天</h2>
                    <p>有什么想问的？尽管说。<br>别问 Andy 的丑事，太多了说不完。</p>
                </div>
                <div class="chat-messages" id="chat-messages"></div>
                <div class="chat-input-area">
                    <div class="chat-input-wrap">
                        <textarea id="chat-input" rows="1"
                            placeholder="${CONFIG.chat.placeholder}"
                            onkeydown="app._handleChatKey(event)"></textarea>
                        <button class="chat-send-btn" id="chat-send" onclick="app._sendChat()">➤</button>
                    </div>
                </div>
            </div>
        `;

        // 渲染历史消息
        if (history.length > 0) {
            const msgs = document.getElementById('chat-messages');
            history.forEach(msg => {
                const div = document.createElement('div');
                div.className = 'chat-msg ' + msg.role;
                div.innerHTML = '<div class="bubble">' + msg.html + '</div>';
                msgs.appendChild(div);
            });
            msgs.scrollTop = msgs.scrollHeight;
        }

        // 清空按钮
        const clearBtn = document.getElementById('chat-clear');
        if (clearBtn) clearBtn.addEventListener('click', () => this._clearHistory());

        // auto-resize
        const ta = document.getElementById('chat-input');
        ta.addEventListener('input', function() {
            this.style.height = '48px';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
        ta.focus();
    },

    _handleChatKey(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this._sendChat();
        }
    },

    _appendMsg(role, html) {
        const msgs = document.getElementById('chat-messages');
        const welcome = document.getElementById('chat-welcome');
        if (welcome) welcome.style.display = 'none';

        const div = document.createElement('div');
        div.className = 'chat-msg ' + role;
        div.innerHTML = '<div class="bubble">' + html + '</div>';
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
        return div;
    },

    async _sendChat() {
        const input = document.getElementById('chat-input');
        const btn = document.getElementById('chat-send');
        const text = input.value.trim();
        if (!text || this._chatStreaming) return;

        input.value = '';
        input.style.height = '48px';
        this._appendMsg('user', escapeHtml(text));

        // 保存用户消息
        const history = this._loadHistory();
        history.push({ role: 'user', html: escapeHtml(text) });

        this._chatStreaming = true;
        btn.disabled = true;
        btn.innerHTML = '⏳';

        const agentId = CONFIG.chat.agentId;
        const apiBase = CONFIG.chat.apiBase;

        try {
            const payload = {
                input: [{ content: [{ type: 'text', text: text }] }],
                session_id: this._chatSessionId,
                user_id: CONFIG.chat.userId,
                channel: 'console'
            };

            this._chatController = new AbortController();
            const resp = await fetch(apiBase + '/agents/' + agentId + '/console/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: this._chatController.signal
            });

            if (!resp.ok) throw new Error('API 返回 ' + resp.status);

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let aiDiv = this._appendMsg('ai', '<span style="color:#9ca3af">思考中...</span>');
            let aiBubble = aiDiv.querySelector('.bubble');
            let fullText = '';
            let buffer = '';
            let renderTimer = null;

            const scheduleRender = () => {
                if (renderTimer) return;
                renderTimer = setTimeout(() => {
                    renderTimer = null;
                    if (fullText) {
                        aiBubble.innerHTML = simpleMarkdown(fullText);
                        document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
                    }
                }, 80);
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
                                for (const p of parts) {
                                    if (p.type === 'text' && p.text) t += p.text;
                                }
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
                aiBubble.innerHTML = simpleMarkdown(fullText);
            } else {
                fullText = '（无回复）';
                aiBubble.innerHTML = '<span style="color:#6b7280">（无回复）</span>';
            }
            document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;

            // 保存 AI 回复
            history.push({ role: 'ai', html: simpleMarkdown(fullText) });
            this._saveHistory(history);

            // 显示清空按钮
            let clearBtn = document.getElementById('chat-clear');
            if (!clearBtn) {
                const toolbar = el.querySelector('.chat-toolbar');
                if (toolbar) {
                    clearBtn = document.createElement('button');
                    clearBtn.className = 'chat-clear-btn';
                    clearBtn.id = 'chat-clear';
                    clearBtn.title = '清空聊天记录';
                    clearBtn.textContent = '🗑️ 清空';
                    clearBtn.addEventListener('click', () => this._clearHistory());
                    toolbar.appendChild(clearBtn);
                }
            }

        } catch (err) {
            if (err.name !== 'AbortError') {
                const errMsg = '<span style="color:#ef4444">⚠️ ' + err.message + '</span>';
                this._appendMsg('ai', errMsg);
                history.push({ role: 'ai', html: errMsg });
                this._saveHistory(history);
            }
        } finally {
            this._chatStreaming = false;
            btn.disabled = false;
            btn.innerHTML = '➤';
            this._chatController = null;
        }
    }
});
