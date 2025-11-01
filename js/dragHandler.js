/**
 * 便签拖拽处理模块
 * 实现便签的拖拽功能
 */

class DragHandler {
    constructor(generator) {
        this.generator = generator;
        this.draggedElement = null;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
    }

    /**
     * 为便签元素添加拖拽事件
     */
    enableDrag(noteElement) {
        // 鼠标按下
        noteElement.addEventListener('mousedown', (e) => {
            this.startDrag(e, noteElement);
        });

        // 触摸开始(移动端支持)
        noteElement.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            this.startDrag(touch, noteElement);
        }, { passive: false });
    }

    /**
     * 开始拖拽
     */
    startDrag(event, noteElement) {
        // 阻止默认行为(避免文本选择)
        event.preventDefault();

        this.isDragging = true;
        this.draggedElement = noteElement;

        // 记录鼠标相对于便签的偏移量
        const rect = noteElement.getBoundingClientRect();
        this.offsetX = event.clientX - rect.left;
        this.offsetY = event.clientY - rect.top;

        // 添加拖拽样式
        noteElement.classList.add('dragging');

        // 提升z-index
        noteElement.style.zIndex = '1000';

        // 添加全局移动和释放事件
        document.addEventListener('mousemove', this.onDrag);
        document.addEventListener('mouseup', this.endDrag);
        document.addEventListener('touchmove', this.onDragTouch, { passive: false });
        document.addEventListener('touchend', this.endDrag);
    }

    /**
     * 拖拽中(鼠标)
     */
    onDrag = (e) => {
        if (!this.isDragging || !this.draggedElement) return;

        this.updatePosition(e.clientX, e.clientY);
    }

    /**
     * 拖拽中(触摸)
     */
    onDragTouch = (e) => {
        if (!this.isDragging || !this.draggedElement) return;

        e.preventDefault(); // 防止页面滚动
        const touch = e.touches[0];
        this.updatePosition(touch.clientX, touch.clientY);
    }

    /**
     * 更新便签位置
     */
    updatePosition(clientX, clientY) {
        const canvas = this.generator.canvas;
        const canvasRect = canvas.getBoundingClientRect();
        const noteWidth = this.draggedElement.offsetWidth;
        const noteHeight = this.draggedElement.offsetHeight;

        // 计算新位置
        let newX = clientX - canvasRect.left - this.offsetX;
        let newY = clientY - canvasRect.top - this.offsetY;

        // 限制在画布范围内
        newX = Math.max(0, Math.min(newX, canvasRect.width - noteWidth));
        newY = Math.max(0, Math.min(newY, canvasRect.height - noteHeight));

        // 更新DOM位置
        this.draggedElement.style.left = `${newX}px`;
        this.draggedElement.style.top = `${newY}px`;
    }

    /**
     * 结束拖拽
     */
    endDrag = () => {
        if (!this.isDragging || !this.draggedElement) return;

        // 移除拖拽样式
        this.draggedElement.classList.remove('dragging');

        // 恢复z-index
        this.draggedElement.style.zIndex = '1';

        // 更新生成器中的位置记录
        const left = parseFloat(this.draggedElement.style.left);
        const top = parseFloat(this.draggedElement.style.top);
        this.generator.updateNotePosition(this.draggedElement, left, top);

        // 清理状态
        this.draggedElement = null;
        this.isDragging = false;

        // 移除全局事件
        document.removeEventListener('mousemove', this.onDrag);
        document.removeEventListener('mouseup', this.endDrag);
        document.removeEventListener('touchmove', this.onDragTouch);
        document.removeEventListener('touchend', this.endDrag);
    }

    /**
     * 禁用拖拽
     */
    disableDrag(noteElement) {
        noteElement.style.cursor = 'default';
    }
}

// 导出为全局变量
window.DragHandler = DragHandler;
