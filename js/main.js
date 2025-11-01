/**
 * 主程序入口
 * 整合所有模块,实现完整功能
 */

class NoteWallApp {
    constructor() {
        this.generator = null;
        this.dragHandler = null;
        this.isGenerating = false;
        this.generationInterval = null;
        this.generationSpeed = 2000; // 默认2秒生成一个
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
     * 初始化应用
     */
    async init() {
        this.log('🚀 初始化便签墙应用...');

        // 获取DOM元素
        this.canvas = document.getElementById('noteCanvas');
        this.toggleBtn = document.getElementById('toggleBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.noteCountEl = document.getElementById('noteCount');
        this.themeToggle = document.getElementById('themeToggle');
        this.debugBtn = document.getElementById('debugBtn');

        // 初始化调试模式(从 localStorage 读取)
        const savedDebugMode = localStorage.getItem('debugMode') === 'true';
        this.setDebugMode(savedDebugMode);

        // 初始化生成器和拖拽处理器
        this.generator = new NoteGenerator();
        await this.generator.init(this.canvas);
        this.generator.setDebugMode(this.debugMode);
        this.dragHandler = new DragHandler(this.generator);

        // 绑定事件
        this.bindEvents();

        // 自动开始生成
        this.startGeneration();

        this.log('✅ 应用初始化完成!');
    }

    /**
     * 绑定所有事件
     */
    bindEvents() {
        // 开始/暂停按钮
        this.toggleBtn.addEventListener('click', () => {
            if (this.isGenerating) {
                this.stopGeneration();
            } else {
                this.startGeneration();
            }
        });

        // 清空按钮
        this.clearBtn.addEventListener('click', () => {
            this.clearAllNotes();
        });

        // 速度滑块
        this.speedSlider.addEventListener('input', (e) => {
            this.generationSpeed = parseInt(e.target.value);
            this.speedValue.textContent = `${(this.generationSpeed / 1000).toFixed(1)}s`;

            // 如果正在生成,重启定时器以应用新速度
            if (this.isGenerating) {
                // 先清除旧定时器
                if (this.generationInterval) {
                    clearInterval(this.generationInterval);
                    this.generationInterval = null;
                }

                // 重新启动定时器(不立即生成,避免突然出现多个便签)
                this.generationInterval = setInterval(() => {
                    this.generateOne();
                }, this.generationSpeed);
            }
        });

        // 主题切换
        this.themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });

        // 调试模式切换
        this.debugBtn.addEventListener('click', () => {
            this.toggleDebugMode();
        });

        // 折叠/展开面板
        const togglePanelBtn = document.getElementById('togglePanelBtn');
        const controlPanel = document.getElementById('controlPanel');

        togglePanelBtn.addEventListener('click', () => {
            controlPanel.classList.toggle('collapsed');
            this.log(controlPanel.classList.contains('collapsed') ? '📦 控制面板已折叠' : '📂 控制面板已展开');
        });

        // 窗口大小变化时的处理
        let resizeTimeout;
        window.addEventListener('resize', () => {
            // 防抖:窗口停止调整500ms后才重新布局
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.log('📐 窗口大小已改变,重新调整便签位置');
                this.repositionNotes();
            }, 500);
        });
    }

    /**
     * 开始生成便签
     */
    startGeneration() {
        if (this.isGenerating) return;

        this.isGenerating = true;
        this.toggleBtn.innerHTML = '<span class="icon">⏸</span>';
        this.toggleBtn.classList.remove('primary');
        this.toggleBtn.classList.add('secondary');

        // 立即生成第一个
        this.generateOne();

        // 定时生成
        this.generationInterval = setInterval(() => {
            this.generateOne();
        }, this.generationSpeed);

        this.log(`▶️ 开始生成便签 (间隔: ${this.generationSpeed}ms)`);
    }

    /**
     * 停止生成便签
     */
    stopGeneration() {
        if (!this.isGenerating) return;

        this.isGenerating = false;
        this.toggleBtn.innerHTML = '<span class="icon">▶</span>';
        this.toggleBtn.classList.remove('secondary');
        this.toggleBtn.classList.add('primary');

        if (this.generationInterval) {
            clearInterval(this.generationInterval);
            this.generationInterval = null;
        }

        this.log('⏸️ 暂停生成便签');
    }

    /**
     * 生成一个便签
     */
    async generateOne() {
        const note = await this.generator.generateNote();

        // 为便签添加拖拽功能
        this.dragHandler.enableDrag(note);

        // 更新计数显示
        this.updateCount();

        // 添加3D悬浮效果
        this.add3DEffect(note);
    }

    /**
     * 添加3D悬浮效果
     */
    add3DEffect(noteElement) {
        noteElement.addEventListener('mousemove', (e) => {
            const rect = noteElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;

            noteElement.style.transform = `
                perspective(1000px)
                rotateX(${rotateX}deg)
                rotateY(${rotateY}deg)
                scale(1.05)
                translateY(-5px)
            `;
        });

        noteElement.addEventListener('mouseleave', () => {
            noteElement.style.transform = '';
        });
    }

    /**
     * 清空所有便签
     */
    clearAllNotes() {
        // 添加确认
        if (this.generator.getCount() > 0) {
            const confirmed = confirm(`确定要清空所有 ${this.generator.getCount()} 个便签吗?`);
            if (!confirmed) return;
        }

        this.generator.clearAll();
        this.updateCount();
        this.log('🗑️ 已清空所有便签');
    }

    /**
     * 更新便签计数显示
     */
    updateCount() {
        const count = this.generator.getCount();
        this.noteCountEl.textContent = count;
    }

    /**
     * 切换主题
     */
    toggleTheme() {
        const body = document.body;
        const icon = this.themeToggle.querySelector('.icon');

        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            icon.textContent = '🌙';
            this.log('☀️ 切换到浅色主题');
        } else {
            body.classList.add('dark-theme');
            icon.textContent = '☀️';
            this.log('🌙 切换到深色主题');
        }
    }

    /**
     * 窗口大小改变时重新定位所有便签
     */
    repositionNotes() {
        const notes = this.generator.notes;

        notes.forEach((noteInfo, index) => {
            const position = this.generator.getHeartPosition(index, 50);
            noteInfo.element.style.left = `${position.x}px`;
            noteInfo.element.style.top = `${position.y}px`;
            noteInfo.x = position.x;
            noteInfo.y = position.y;
        });

        this.log(`🔄 已重新定位 ${notes.length} 个便签`);
    }

    /**
     * 设置调试模式
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;

        // 同步生成器的调试模式
        if (this.generator) {
            this.generator.setDebugMode(enabled);
        }

        // 更新按钮状态
        if (this.debugBtn) {
            if (enabled) {
                this.debugBtn.classList.add('active');
            } else {
                this.debugBtn.classList.remove('active');
            }
        }

        // 保存到 localStorage
        localStorage.setItem('debugMode', enabled.toString());
    }

    /**
     * 切换调试模式
     */
    toggleDebugMode() {
        const newMode = !this.debugMode;
        this.setDebugMode(newMode);

        // 显示提示
        const message = newMode ? '🐛 调试模式已开启' : '🔇 调试模式已关闭';
        console.log(message); // 这个总是显示,告知用户状态变化
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new NoteWallApp();
    app.init();
});
