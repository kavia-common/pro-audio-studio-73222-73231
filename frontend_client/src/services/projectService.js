const PROJECT_LIST_KEY = 'demo-project-ids';
const PROJECT_PREFIX = 'demo-project:';

/**
 * PUBLIC_INTERFACE
 * saveProject persists project to localStorage and returns saved version with id.
 */
async function saveProject(project) {
  let id = project.id || crypto.randomUUID();
  const saved = { ...project, id };
  const list = new Set(JSON.parse(window.localStorage.getItem(PROJECT_LIST_KEY) || '[]'));
  list.add(id);
  window.localStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(Array.from(list)));
  window.localStorage.setItem(PROJECT_PREFIX + id, JSON.stringify(saved));
  return saved;
}

/**
 * PUBLIC_INTERFACE
 * loadProject loads a project by id.
 */
async function loadProject(id) {
  const raw = window.localStorage.getItem(PROJECT_PREFIX + id);
  if (!raw) throw new Error('Project not found');
  return JSON.parse(raw);
}

/**
 * PUBLIC_INTERFACE
 * listProjects returns an array of {id, name, updatedAt}.
 */
async function listProjects() {
  const ids = JSON.parse(window.localStorage.getItem(PROJECT_LIST_KEY) || '[]');
  return ids.map(id => {
    const p = JSON.parse(window.localStorage.getItem(PROJECT_PREFIX + id) || '{}');
    return { id, name: p.name || 'Untitled', updatedAt: p.updatedAt || 0 };
  });
}

const projectService = { saveProject, loadProject, listProjects };
export default projectService;
