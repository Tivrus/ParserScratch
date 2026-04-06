export class GrabManager {
  constructor(containersConfig = {}, { debug = false } = {}) {
    // containersConfig = {
    //   workspace: HTMLElement | string,   // обязательный
    //   blockTemplates: HTMLElement | string, // опциональный
    //   dragOverlay: HTMLElement | string    // опциональный
    // }
    this.debug = debug;
    this.state = {
      isGrabbed: false,
      area: null,            // 'workspace' | 'block-templates' | 'drag-overlay' | 'other'
      target: null,          // 'block' | 'template' | 'empty'
      element: null,         // захваченный элемент или контейнер
      blockUUID: null,
      start: { x: 0, y: 0, clientX: 0, clientY: 0, timestamp: 0 },
      end: { x: 0, y: 0, clientX: 0, clientY: 0, timestamp: 0 }
    };

    // Резолвим селекторы в элементы
    this.containers = this.#resolveContainers(containersConfig);
    
    if (!this.containers.workspace) {
      console.error('[GrabManager] Workspace container is required');
      return;
    }

    this.#initListeners();
    
    if (this.debug) {
      this.#log('GrabManager initialized', { 
        containers: Object.keys(this.containers).filter(k => this.containers[k]),
        debug: true 
      });
    }
  }

  #resolveContainers(config) {
    const resolve = (val) => {
      if (!val) return null;
      if (typeof val === 'string') return document.getElementById(val) || document.querySelector(val);
      if (val instanceof HTMLElement) return val;
      return null;
    };

    return {
      workspace: resolve(config.workspace || '#workspace'),
      blockTemplates: resolve(config.blockTemplates || '#block-templates'),
      dragOverlay: resolve(config.dragOverlay || '#drag-overlay')
    };
  }

  #initListeners() {
    // Слушаем mousedown на ВСЕХ контейнерах
    Object.entries(this.containers).forEach(([areaName, container]) => {
      if (!container) return;
      
      container.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || this.state.isGrabbed) return;
        
        this.#handleGrabStart(e, areaName, container);
      });
    });

    // Глобальные слушатели для отпускания
    document.addEventListener('mouseup', (e) => {
      if (this.state.isGrabbed) {
        this.#handleGrabEnd(e);
      }
    });

    window.addEventListener('blur', () => {
      if (this.state.isGrabbed) {
        this.#handleGrabCancel('window blur');
      }
    });
  }

  #handleGrabStart(event, areaName, container) {
    // Определяем тип цели
    let target = 'empty';
    let element = null;
    let blockUUID = null;
    
    if (areaName === 'workspace') {
      const block = event.target.closest('.workspace-block');
      if (block) {
        target = 'block';
        element = block;
        blockUUID = block.dataset.blockUUID;
      } else {
        target = 'empty';
        element = container;
      }
    } 
    else if (areaName === 'blockTemplates') {
        const template = event.target.closest('.block-template');
        if (template) {
            target = 'template';
            element = template;
            blockUUID = template.dataset.blockId || null; // ← КЛЮЧЕВОЕ ИЗМЕНЕНИЕ
        } else {
            target = 'empty';
            element = container;
        }
    }
    else if (areaName === 'dragOverlay') {
      target = 'overlay';
      element = container;
    }

    // Сохраняем координаты относительно соответствующего контейнера
    const rect = container.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    const prevState = { ...this.state };
    
    this.state = {
      isGrabbed: true,
      area: areaName,
      target,
      element,
      blockUUID,
      start: {
        x: localX,
        y: localY,
        clientX: event.clientX,
        clientY: event.clientY,
        timestamp: Date.now()
      },
      end: { x: 0, y: 0, clientX: 0, clientY: 0, timestamp: 0 }
    };

    if (this.debug) {
      this.#log('🖱️ GRAB START', {
        area: this.state.area,
        target: this.state.target,
        blockUUID: this.state.blockUUID,
        local: [this.state.start.x.toFixed(1), this.state.start.y.toFixed(1)],
        client: [this.state.start.clientX, this.state.start.clientY],
        wasGrabbed: prevState.isGrabbed
      });
    }

    // Эмитим событие на соответствующем контейнере
    this.#emit(container, 'grab-start', {
      ...this.state.start,
      area: this.state.area,
      target: this.state.target,
      blockUUID: this.state.blockUUID,
      element: this.state.element
    });

    event.stopPropagation();
  }

  #handleGrabEnd(event) {
    const container = this.#getContainerByArea(this.state.area);
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    this.state.end = {
      x: localX,
      y: localY,
      clientX: event.clientX,
      clientY: event.clientY,
      timestamp: Date.now()
    };

    const deltaX = this.state.end.x - this.state.start.x;
    const deltaY = this.state.end.y - this.state.start.y;
    const duration = this.state.end.timestamp - this.state.start.timestamp;
    const moved = Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3;

    if (this.debug) {
      this.#log(`✋ GRAB END (${moved ? 'MOVED' : 'CLICK'})`, {
        area: this.state.area,
        target: this.state.target,
        blockUUID: this.state.blockUUID,
        movement: {
          dx: deltaX.toFixed(1),
          dy: deltaY.toFixed(1),
          dist: Math.hypot(deltaX, deltaY).toFixed(1)
        },
        duration: `${duration}ms`,
        moved
      });
    }

    this.#emit(container, 'grab-end', {
      ...this.state,
      deltaX,
      deltaY,
      duration,
      moved
    });

    this.state.isGrabbed = false;
  }

  #handleGrabCancel(reason) {
    if (this.debug) {
      this.#log(`⚠️ GRAB CANCELLED (${reason})`, {
        area: this.state.area,
        target: this.state.target,
        blockUUID: this.state.blockUUID
      });
    }

    const container = this.#getContainerByArea(this.state.area);
    if (container) {
      this.#emit(container, 'grab-cancel', { ...this.state });
    }

    this.state.isGrabbed = false;
  }

  #getContainerByArea(areaName) {
    return this.containers[areaName] || this.containers.workspace;
  }

  #emit(targetElement, eventName, detail) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    });
    targetElement.dispatchEvent(event);
  }

  // Публичные методы для внешней проверки
  isBlockGrabbed() {
    return this.state.isGrabbed && this.state.target === 'block';
  }

  isTemplateGrabbed() {
    return this.state.isGrabbed && this.state.target === 'template';
  }

  isGrabbedInWorkspace() {
    return this.state.isGrabbed && this.state.area === 'workspace';
  }

  isGrabbedInTemplates() {
    return this.state.isGrabbed && this.state.area === 'blockTemplates';
  }

  getCurrentState() {
    return { ...this.state };
  }

  // Утилита логирования
  #log(message, data = null) {
    const timestamp = new Date().toISOString().slice(11, 23);
    const styleBase = 'font-weight: bold; padding: 2px 4px; border-radius: 3px;';
    
    let styleColor = styleBase + ' background: #34495e; color: #ecf0f1;';
    if (message.includes('GRAB START')) styleColor = styleBase + ' background: #2c3e50; color: #3498db;';
    else if (message.includes('MOVED')) styleColor = styleBase + ' background: #1e3a5f; color: #34c759;';
    else if (message.includes('CLICK')) styleColor = styleBase + ' background: #5a2d6e; color: #ff9500;';
    else if (message.includes('CANCELLED')) styleColor = styleBase + ' background: #4a1414; color: #ff453a;';
    
    console.log(
      `%c[GrabManager] %c${timestamp} %c${message}`,
      'color: #666; font-weight: normal;',
      'color: #888; font-weight: normal;',
      styleColor,
      data ? data : ''
    );
  }
}
