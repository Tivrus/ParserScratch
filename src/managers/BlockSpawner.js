import { generateUUID } from '../utils/StringUtils.js';

export class BlockSpawner {
  constructor(blockSetup, grabManager, config = {}) {
    this.blockSetup = blockSetup;
    this.grabManager = grabManager;
    
    // Резолвим контейнеры из конфига или используем дефолтные селекторы
    this.containers = {
      blockTemplates: this.#resolveElement(config.blockTemplatesId || '#block-templates'),
      workspace: this.#resolveElement(config.workspaceId || '#workspace'),
      dragOverlay: this.#resolveElement(config.dragOverlayId || '#drag-overlay')
    };
    
    this.dragPreview = null;      // <g> элемент в drag-overlay
    this.dragBlockId = null;      // blockId захваченного шаблона
    this.dragOffset = { x: 0, y: 0 };
    
    // Валидация обязательных контейнеров
    if (!this.containers.blockTemplates || !this.containers.workspace || !this.containers.dragOverlay) {
      console.error('[BlockSpawner] Required containers not found:', this.containers);
      return;
    }

    this.#init();
  }

  #resolveElement(selectorOrElement) {
    if (!selectorOrElement) return null;
    if (typeof selectorOrElement === 'string') {
      return document.getElementById(selectorOrElement) || document.querySelector(selectorOrElement);
    }
    return selectorOrElement instanceof HTMLElement ? selectorOrElement : null;
  }

  #init() {
    // Слушаем событие захвата от GrabManager на библиотеке шаблонов
    this.containers.blockTemplates.addEventListener('grab-start', (e) => {
      // Защита: не спавним, если уже захвачен блок в рабочей области
      if (this.grabManager.isBlockGrabbed()) {
        return;
      }
      
      // Обрабатываем только захват шаблона (не пустого места)
      if (e.detail.target === 'template' && e.detail.blockUUID) {
        this.#onTemplateGrab(e.detail);
      }
    });

    // Слушаем событие отпускания от GrabManager на ЛЮБОМ контейнере
    document.addEventListener('grab-end', (e) => {
      if (this.dragPreview && this.dragBlockId) {
        this.#onDragEnd(e.detail);
      }
    });

    // Движение — глобальный слушатель для плавного перемещения
    document.addEventListener('mousemove', (e) => {
      if (this.dragPreview && this.dragBlockId) {
        this.#onDragMove(e);
      }
    });

    // Отмена при потере фокуса
    window.addEventListener('blur', () => {
      this.#cleanupDragPreview();
    });
  }


  #onTemplateGrab(grabDetail) {
    // Находим шаблон напрямую по селектору (это <svg>)
    const template = this.containers.blockTemplates.querySelector(
      `svg.block-template[data-block-id="${grabDetail.blockUUID}"]`
    );
    
    if (!template) {
      console.warn('[BlockSpawner] Template SVG not found for blockId:', grabDetail.blockUUID);
      return;
    }

    // Создаём <g> для перетаскивания
    const previewGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    previewGroup.classList.add('block-drag-preview');
    previewGroup.setAttribute('pointer-events', 'none');

    // Клонируем ВСЁ содержимое шаблона (path, text)
    Array.from(template.children).forEach(child => {
      const clone = child.cloneNode(true);
      if (clone.tagName.toLowerCase() === 'path') {
        clone.removeAttribute('filter');
        clone.removeAttribute('animation');
      }
      previewGroup.appendChild(clone);
    });

    // Добавляем в drag-overlay
    this.containers.dragOverlay.appendChild(previewGroup);
    
    // Сохраняем данные для перемещения
    this.dragPreview = previewGroup;
    this.dragBlockId = grabDetail.blockUUID; // blockId шаблона
    
    // Рассчитываем смещение относительно курсора (для плавного перемещения)
    const templateRect = template.getBoundingClientRect();
    this.dragOffset.x = grabDetail.clientX - templateRect.left;
    this.dragOffset.y = grabDetail.clientY - templateRect.top;

    // Позиционируем под курсором
    this.#positionPreview(grabDetail.clientX, grabDetail.clientY);

    // Визуальная обратная связь на шаблоне
    template.classList.add('block-template--dragging');
  }

  #positionPreview(clientX, clientY) {
    if (!this.dragPreview) return;
    
    // Координаты относительно drag-overlay (он должен быть position: fixed/absolute на весь экран)
    const overlayRect = this.containers.dragOverlay.getBoundingClientRect();
    const x = clientX - overlayRect.left - this.dragOffset.x;
    const y = clientY - overlayRect.top - this.dragOffset.y;
    
    this.dragPreview.setAttribute('transform', `translate(${x}, ${y})`);
  }

  #onDragMove(event) {
    this.#positionPreview(event.clientX, event.clientY);
  }

  #onDragEnd(grabDetail) {
    // Определяем, отпустили ли над рабочей областью
    const wsRect = this.containers.workspace.getBoundingClientRect();
    const isOverWorkspace = (
      grabDetail.clientX >= wsRect.left &&
      grabDetail.clientX <= wsRect.right &&
      grabDetail.clientY >= wsRect.top &&
      grabDetail.clientY <= wsRect.bottom
    );

    if (isOverWorkspace && this.dragBlockId) {
      // Рассчитываем финальную позицию относительно рабочей области
      const finalX = grabDetail.clientX - wsRect.left - this.dragOffset.x;
      const finalY = grabDetail.clientY - wsRect.top - this.dragOffset.y;
      
      // Создаём настоящий блок через фабрику
      const realBlock = this.blockSetup.createWorkspaceBlock(
        this.dragBlockId,
        { 
          blockUUID: generateUUID(), // Настоящий уникальный ID
          x: finalX,
          y: finalY 
        }
      );
      
      if (realBlock) {
        this.containers.workspace.appendChild(realBlock);
        
        // Событие для интеграции с другими системами
        this.containers.workspace.dispatchEvent(new CustomEvent('block-spawned', {
          detail: {
            block: realBlock,
            blockUUID: realBlock.dataset.blockUUID,
            blockId: this.dragBlockId,
            x: finalX,
            y: finalY
          },
          bubbles: true
        }));
      }
    }
    
    // Очистка превью в любом случае
    this.#cleanupDragPreview();
  }

  #cleanupDragPreview() {
    if (this.dragPreview) {
      this.dragPreview.remove();
      this.dragPreview = null;
    }
    
    this.dragBlockId = null;
    
    // Убираем визуальную обратную связь со всех шаблонов
    this.containers.blockTemplates.querySelectorAll('.block-template--dragging')
      .forEach(el => el.classList.remove('block-template--dragging'));
  }
}
