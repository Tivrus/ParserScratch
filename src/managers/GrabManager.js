import {generateUUID} from '../utils/MathUtils.js'

export class GrabManager {
  constructor(containersConfig = {}) {
    this.state = {
      isGrabbed: false,
      area: null,            // 'workspace' | 'block-templates' | 'drag-overlay' | 'other'
      target: null,          // 'block' | 'template' | 'empty'
      element: null,         // захваченный элемент или контейнер
      grabKey: null,
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
      // dragOverlay: resolve(config.dragOverlay || '#drag-overlay')
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
    let grabKey = null;
    
    if (areaName === 'workspace') {
      const block = event.target.closest('.workspace-block');
      if (block) {
        target = 'block';
        element = block;
        grabKey = block.UUID;
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
            grabKey = template.dataset.blockId;
        } else {
            target = 'empty';
            element = container;
        }
    }

    const rect = container.getBoundingClientRect();
    const localX = event.clientX - Math.round(rect.left);
    const localY = event.clientY - rect.top;
    const prevState = { ...this.state };
    
    this.state = {
      isGrabbed: true,
      area: areaName,
      target,
      element,
      grabKey,
      start: {
        x: localX,
        y: localY,
        clientX: event.clientX,
        clientY: event.clientY,
        timestamp: Date.now()
      },
      end: { x: 0, y: 0, clientX: 0, clientY: 0, timestamp: 0 }
    };

    // Эмитим событие на соответствующем контейнере
    this.#emit(container, 'grab-start', {
      ...this.state.start,
      area: this.state.area,
      target: this.state.target,
      grabKey: this.state.grabKey,
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


    this.#emit(container, 'grab-end', {
      ...this.state,
      deltaX,
      deltaY,
      duration,
      moved
    });

    this.state.isGrabbed = false;
  }

  #handleGrabCancel() {
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
}
