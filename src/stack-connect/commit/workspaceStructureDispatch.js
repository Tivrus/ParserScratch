import * as Global from '../../constants/Global.js';

/** Уведомить подписчиков полотна об изменении структуры стека (после commit / split). */
export function dispatchWorkspaceStructureChanged(){
  const workspaceRootEl = document.getElementById(Global.DOM_IDS.workspace);
  if (workspaceRootEl){
    workspaceRootEl.dispatchEvent(
      new CustomEvent(Global.WORKSPACE_EVENTS.structureChanged, {
        bubbles: true,
      })
    );
  }
}
