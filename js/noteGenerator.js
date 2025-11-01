/**
 * 便签生成器模块
 * 负责生成随机便签,包括位置、颜色、文字的随机化
 * 集成多个语录API源,支持自适应大小
 */

class NoteGenerator {
    constructor() {
        this.messages = [];
        this.usedMessages = new Set(); // 记录已使用的文字,避免重复
        this.colors = ['pink', 'green', 'yellow', 'blue', 'purple', 'orange'];
        this.noteCount = 0;
        this.canvas = null;
        this.notes = []; // 存储所有便签的位置信息,用于避免重叠
        this.useHitokoto = true; // 是否使用一言API
        this.hitokotoCache = []; // 一言缓存
        this.usedApiTexts = new Set(); // 已使用的API文本(去重)
        this.apiSources = [
            { name: 'hitokoto', url: 'https://v1.hitokoto.cn/?c=a&c=b&c=d&c=h&c=i&c=k', enabled: true },
            { name: 'jinrishici', url: 'https://v1.jinrishici.com/all.json', enabled: true },
            { name: 'local', url: null, enabled: true } // 本地文本库
        ];
        this.currentApiIndex = 0;
        this.debugMode = false; // 调试模式开关
    }

    /**
     * 日志输出(仅在调试模式开启时输出)
     */
    log(...args) {
        if (this.debugMode) {
            console.log(...args);
        }
    }

    /**
     * 设置调试模式
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.log(`🔧 调试模式已${enabled ? '开启' : '关闭'}`);
    }

    /**
     * 初始化生成器,加载文本库
     */
    async init(canvasElement) {
        this.canvas = canvasElement;

        // 加载本地文本库作为备用
        try {
            const response = await fetch('data/messages.json');
            const data = await response.json();
            this.messages = data.messages;
            this.log(`✅ 加载了 ${this.messages.length} 条本地鼓励语`);
        } catch (error) {
            console.error('❌ 加载文本库失败:', error);
            // 使用备用文本
            this.messages = [
                '坚持梦想', '不怕失败', '一起加油', '你值得被爱', '保持耐心',
                '做最好的自己', '相信自己', '自信满满', '闪闪发光', '勇往直前',
                '人生如逆旅,我亦是行人', '山高路远,看世界也看自己',
                '慢慢来,比较快', '热爱可抵岁月漫长', '温柔且坚定'
            ];
        }

        // 后台预加载语录(不阻塞初始化)
        this.preloadHitokoto();
    }

    /**
     * 预加载一言语录(异步,不阻塞)
     */
    async preloadHitokoto() {
        try {
            // 并发获取5条语录(提速)
            const promises = Array(5).fill(null).map(() => this.fetchFromAPIs());
            const results = await Promise.allSettled(promises);

            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    this.hitokotoCache.push(result.value);
                }
            });

            this.log(`✅ 预加载了 ${this.hitokotoCache.length} 条语录`);
        } catch (error) {
            console.warn('⚠️ 预加载语录失败,将使用本地文本', error);
        }
    }

    /**
     * 从多个API源获取语录(带重试机制)
     */
    async fetchFromAPIs() {
        // 尝试所有API源
        for (let i = 0; i < this.apiSources.length; i++) {
            const source = this.apiSources[this.currentApiIndex];
            this.currentApiIndex = (this.currentApiIndex + 1) % this.apiSources.length;

            if (!source.enabled) continue;

            try {
                let text = null;

                if (source.name === 'hitokoto') {
                    text = await this.fetchHitokoto();
                } else if (source.name === 'jinrishici') {
                    text = await this.fetchJinrishici();
                } else if (source.name === 'local') {
                    text = this.getLocalMessage();
                }

                // 检查是否重复
                if (text && !this.usedApiTexts.has(text)) {
                    this.usedApiTexts.add(text);
                    return text;
                }
            } catch (error) {
                console.warn(`${source.name} API 失败:`, error);
                continue;
            }
        }

        return null;
    }

    /**
     * 从一言API获取语录
     */
    async fetchHitokoto() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2秒超时

            const response = await fetch('https://v1.hitokoto.cn/?c=a&c=b&c=d&c=h&c=i&c=k', {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await response.json();

            // 组合语录和来源
            let text = data.hitokoto;
            if (data.from && data.from !== '网络' && data.from.length < 15) {
                text += `\n—— ${data.from}`;
            }

            return text;
        } catch (error) {
            throw new Error('Hitokoto API 请求失败');
        }
    }

    /**
     * 从今日诗词API获取语录
     */
    async fetchJinrishici() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const response = await fetch('https://v1.jinrishici.com/all.json', {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await response.json();

            // 组合诗词内容和作者
            let text = data.content;
            if (data.author && data.author.length < 10) {
                text += `\n—— ${data.author}`;
            }

            return text;
        } catch (error) {
            throw new Error('今日诗词 API 请求失败');
        }
    }

    /**
     * 从本地文本库获取
     */
    getLocalMessage() {
        const availableMessages = this.messages.filter(
            msg => !this.usedApiTexts.has(msg)
        );

        if (availableMessages.length === 0) {
            // 重置使用记录
            this.usedApiTexts.clear();
            return this.messages[Math.floor(Math.random() * this.messages.length)];
        }

        const randomIndex = Math.floor(Math.random() * availableMessages.length);
        return availableMessages[randomIndex];
    }

    /**
     * 获取随机且未使用过的文字(优化版)
     */
    async getRandomMessage() {
        // 优先从缓存获取(即时返回,不等待)
        if (this.hitokotoCache.length > 0) {
            const text = this.hitokotoCache.shift();

            // 异步补充缓存(不阻塞)
            if (this.hitokotoCache.length < 3) {
                this.fetchFromAPIs().then(newText => {
                    if (newText) {
                        this.hitokotoCache.push(newText);
                    }
                }).catch(() => {});
            }

            return text;
        }

        // 缓存为空,直接使用本地文本(快速返回)
        return this.getLocalMessage();
    }

    /**
     * 获取随机颜色
     */
    getRandomColor() {
        const randomIndex = Math.floor(Math.random() * this.colors.length);
        return this.colors[randomIndex];
    }

    /**
     * 计算文字适合的便签尺寸(优化版 - 防止溢出)
     */
    calculateNoteSize(text) {
        const length = text.length;

        // 统一尺寸,避免大小不一
        let width = 100;
        let height = 100;
        let fontSize = 0.75;

        // 根据文字长度微调
        if (length > 50) {
            // 超长文本
            width = 130;
            height = 120;
            fontSize = 0.65;
        } else if (length > 40) {
            // 长文本稍大
            width = 120;
            height = 110;
            fontSize = 0.68;
        } else if (length > 25) {
            // 中长文本
            width = 115;
            height = 108;
            fontSize = 0.7;
        } else if (length > 15) {
            // 中等长度
            width = 110;
            height = 105;
            fontSize = 0.72;
        } else if (length < 8) {
            // 短文本
            width = 90;
            height = 90;
            fontSize = 0.8;
        }

        return { width, height, fontSize };
    }

    /**
     * 计算爱心路径上的位置(响应式优化)
     */
    getHeartPosition(index, totalNotes) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const centerX = canvasRect.width / 2;
        const centerY = canvasRect.height / 2;

        // 爱心参数方程
        const angle = (index / totalNotes) * Math.PI * 2;

        // 响应式缩放 - 根据屏幕大小自动调整
        const baseScale = Math.min(canvasRect.width, canvasRect.height);
        let scale;

        if (baseScale < 500) {
            // 手机竖屏 - 更小的爱心
            scale = baseScale * 0.025;
        } else if (baseScale < 768) {
            // 手机横屏/平板竖屏
            scale = baseScale * 0.028;
        } else if (baseScale < 1024) {
            // 平板横屏
            scale = baseScale * 0.032;
        } else {
            // 桌面
            scale = baseScale * 0.035;
        }

        const t = angle;
        const x = 16 * Math.pow(Math.sin(t), 3) * scale;
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale;

        return {
            x: centerX + x - 50,
            y: centerY + y - 50
        };
    }

    /**
     * 生成随机位置(避免重叠)
     */
    getRandomPosition(noteWidth, noteHeight) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const padding = 20; // 边距
        const minDistance = 160; // 便签之间的最小距离

        let attempts = 0;
        const maxAttempts = 30; // 减少尝试次数,提升性能

        while (attempts < maxAttempts) {
            const x = padding + Math.random() * (canvasRect.width - noteWidth - padding * 2);
            const y = padding + Math.random() * (canvasRect.height - noteHeight - padding * 2);

            // 检查是否与现有便签重叠
            const tooClose = this.notes.some(note => {
                const dx = note.x - x;
                const dy = note.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance < minDistance;
            });

            if (!tooClose) {
                return { x, y };
            }

            attempts++;
        }

        // 如果尝试多次都找不到合适位置,返回完全随机的位置
        return {
            x: padding + Math.random() * (canvasRect.width - noteWidth - padding * 2),
            y: padding + Math.random() * (canvasRect.height - noteHeight - padding * 2)
        };
    }

    /**
     * 生成一个新便签(优化版 - 爱心路径排列)
     */
    async generateNote() {
        const message = await this.getRandomMessage();
        const color = this.getRandomColor();
        const size = this.calculateNoteSize(message);

        // 使用爱心路径位置
        const position = this.getHeartPosition(this.noteCount, 50); // 假设最多50个便签形成完整爱心

        // 创建便签元素
        const note = document.createElement('div');
        note.className = `note ${color}`;
        note.textContent = message;
        note.style.left = `${position.x}px`;
        note.style.top = `${position.y}px`;
        note.style.width = `${size.width}px`;
        note.style.height = `${size.height}px`;
        note.style.fontSize = `${size.fontSize}rem`;
        note.style.setProperty('--note-index', this.noteCount); // 设置递增的z-index

        // 添加唯一ID
        note.dataset.id = `note-${Date.now()}-${Math.random()}`;

        // 记录便签信息
        this.notes.push({
            x: position.x,
            y: position.y,
            element: note
        });

        // 添加到画布
        this.canvas.appendChild(note);
        this.noteCount++;

        this.log(`📝 生成便签 #${this.noteCount}: "${message.substring(0, 15)}..." (${color})`);

        return note;
    }

    /**
     * 清空所有便签
     */
    clearAll() {
        while (this.canvas.firstChild) {
            this.canvas.removeChild(this.canvas.firstChild);
        }
        this.notes = [];
        this.noteCount = 0;
        this.usedMessages.clear();
        this.log('🗑️ 已清空所有便签');
    }

    /**
     * 移除指定便签
     */
    removeNote(noteElement) {
        const index = this.notes.findIndex(note => note.element === noteElement);
        if (index !== -1) {
            this.notes.splice(index, 1);
            noteElement.remove();
            this.noteCount--;
        }
    }

    /**
     * 更新便签位置(拖拽后)
     */
    updateNotePosition(noteElement, x, y) {
        const index = this.notes.findIndex(note => note.element === noteElement);
        if (index !== -1) {
            this.notes[index].x = x;
            this.notes[index].y = y;
        }
    }

    /**
     * 获取当前便签数量
     */
    getCount() {
        return this.noteCount;
    }
}

// 导出为全局变量
window.NoteGenerator = NoteGenerator;
