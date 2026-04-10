/**
 * pages/chat.js — AI 聊天页面
 */
Object.assign(app, {
    _chatSessionId: String(Date.now()),
    _chatStreaming: false,
    _chatController: null,

    renderChat(el) {
        el.innerHTML = `
            <div class="chat-page">
                <div class="chat-welcome" id="chat-welcome">
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
                aiBubble.innerHTML = '<span style="color:#6b7280">（无回复）</span>';
            }
            document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;

        } catch (err) {
            if (err.name !== 'AbortError') {
                this._appendMsg('ai', '<span style="color:#ef4444">⚠️ ' + err.message + '</span>');
            }
        } finally {
            this._chatStreaming = false;
            btn.disabled = false;
            btn.innerHTML = '➤';
            this._chatController = null;
        }
    }
});
