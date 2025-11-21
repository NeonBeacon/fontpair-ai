import type { Project, ProjectPairing, ProjectsState, FontAnalysis, PairingCritique } from '../types';

const STORAGE_KEY = 'cadmus_projects';

// Generate unique ID
const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Get all projects state from localStorage
export const getProjectsState = (): ProjectsState => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error reading projects from localStorage:', error);
    }
    return { projects: [], activeProjectId: null };
};

// Save projects state to localStorage
const saveProjectsState = (state: ProjectsState): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Error saving projects to localStorage:', error);
        throw new Error('Failed to save project data');
    }
};

// Create a new project
export const createProject = (name: string, description?: string, color?: string): Project => {
    const state = getProjectsState();
    const now = Date.now();

    const newProject: Project = {
        id: generateId(),
        name,
        description,
        pairings: [],
        createdAt: now,
        updatedAt: now,
        color
    };

    state.projects.push(newProject);
    state.activeProjectId = newProject.id;
    saveProjectsState(state);

    return newProject;
};

// Get a project by ID
export const getProject = (projectId: string): Project | null => {
    const state = getProjectsState();
    return state.projects.find(p => p.id === projectId) || null;
};

// Get the active project
export const getActiveProject = (): Project | null => {
    const state = getProjectsState();
    if (!state.activeProjectId) return null;
    return state.projects.find(p => p.id === state.activeProjectId) || null;
};

// Set the active project
export const setActiveProject = (projectId: string | null): void => {
    const state = getProjectsState();
    state.activeProjectId = projectId;
    saveProjectsState(state);
};

// Update a project
export const updateProject = (
    projectId: string,
    updates: Partial<Pick<Project, 'name' | 'description' | 'color'>>
): Project | null => {
    const state = getProjectsState();
    const index = state.projects.findIndex(p => p.id === projectId);

    if (index === -1) return null;

    state.projects[index] = {
        ...state.projects[index],
        ...updates,
        updatedAt: Date.now()
    };

    saveProjectsState(state);
    return state.projects[index];
};

// Delete a project
export const deleteProject = (projectId: string): boolean => {
    const state = getProjectsState();
    const index = state.projects.findIndex(p => p.id === projectId);

    if (index === -1) return false;

    state.projects.splice(index, 1);

    // If we deleted the active project, clear it
    if (state.activeProjectId === projectId) {
        state.activeProjectId = state.projects.length > 0 ? state.projects[0].id : null;
    }

    saveProjectsState(state);
    return true;
};

// Add a pairing to a project
export const addPairingToProject = (
    projectId: string,
    leftFont: FontAnalysis | null,
    rightFont: FontAnalysis | null,
    leftPreview?: string,
    rightPreview?: string,
    critique?: PairingCritique,
    notes?: string
): ProjectPairing | null => {
    const state = getProjectsState();
    const project = state.projects.find(p => p.id === projectId);

    if (!project) return null;

    const pairing: ProjectPairing = {
        id: generateId(),
        leftFont,
        rightFont,
        leftPreview,
        rightPreview,
        critique,
        createdAt: Date.now(),
        notes
    };

    project.pairings.push(pairing);
    project.updatedAt = Date.now();
    saveProjectsState(state);

    return pairing;
};

// Update a pairing in a project
export const updatePairing = (
    projectId: string,
    pairingId: string,
    updates: Partial<Pick<ProjectPairing, 'leftFont' | 'rightFont' | 'leftPreview' | 'rightPreview' | 'critique' | 'notes'>>
): ProjectPairing | null => {
    const state = getProjectsState();
    const project = state.projects.find(p => p.id === projectId);

    if (!project) return null;

    const pairingIndex = project.pairings.findIndex(p => p.id === pairingId);
    if (pairingIndex === -1) return null;

    project.pairings[pairingIndex] = {
        ...project.pairings[pairingIndex],
        ...updates
    };

    project.updatedAt = Date.now();
    saveProjectsState(state);

    return project.pairings[pairingIndex];
};

// Remove a pairing from a project
export const removePairingFromProject = (projectId: string, pairingId: string): boolean => {
    const state = getProjectsState();
    const project = state.projects.find(p => p.id === projectId);

    if (!project) return false;

    const index = project.pairings.findIndex(p => p.id === pairingId);
    if (index === -1) return false;

    project.pairings.splice(index, 1);
    project.updatedAt = Date.now();
    saveProjectsState(state);

    return true;
};

// Get all projects
export const getAllProjects = (): Project[] => {
    const state = getProjectsState();
    return state.projects;
};

// Duplicate a project
export const duplicateProject = (projectId: string, newName?: string): Project | null => {
    const state = getProjectsState();
    const original = state.projects.find(p => p.id === projectId);

    if (!original) return null;

    const now = Date.now();
    const newProject: Project = {
        id: generateId(),
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        pairings: original.pairings.map(p => ({
            ...p,
            id: generateId(),
            createdAt: now
        })),
        createdAt: now,
        updatedAt: now,
        color: original.color
    };

    state.projects.push(newProject);
    saveProjectsState(state);

    return newProject;
};

// Export project data (for backup or sharing)
export const exportProjectData = (projectId: string): string | null => {
    const project = getProject(projectId);
    if (!project) return null;

    return JSON.stringify(project, null, 2);
};

// Import project data
export const importProjectData = (jsonData: string): Project | null => {
    try {
        const importedProject = JSON.parse(jsonData) as Project;

        // Validate required fields
        if (!importedProject.name || !Array.isArray(importedProject.pairings)) {
            throw new Error('Invalid project data');
        }

        // Generate new IDs to avoid conflicts
        const now = Date.now();
        const newProject: Project = {
            ...importedProject,
            id: generateId(),
            name: `${importedProject.name} (Imported)`,
            createdAt: now,
            updatedAt: now,
            pairings: importedProject.pairings.map(p => ({
                ...p,
                id: generateId()
            }))
        };

        const state = getProjectsState();
        state.projects.push(newProject);
        saveProjectsState(state);

        return newProject;
    } catch (error) {
        console.error('Error importing project:', error);
        return null;
    }
};

// Get project statistics
export const getProjectStats = (projectId: string): {
    totalPairings: number;
    uniqueFonts: number;
    averageScore: number | null;
} | null => {
    const project = getProject(projectId);
    if (!project) return null;

    const fonts = new Set<string>();
    let totalScore = 0;
    let scoreCount = 0;

    project.pairings.forEach(pairing => {
        if (pairing.leftFont?.fontName) fonts.add(pairing.leftFont.fontName);
        if (pairing.rightFont?.fontName) fonts.add(pairing.rightFont.fontName);
        if (pairing.critique?.overallScore) {
            totalScore += pairing.critique.overallScore;
            scoreCount++;
        }
    });

    return {
        totalPairings: project.pairings.length,
        uniqueFonts: fonts.size,
        averageScore: scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : null
    };
};

// Available project colors
export const PROJECT_COLORS = [
    '#E67E22', // Orange (accent)
    '#3498DB', // Blue
    '#9B59B6', // Purple
    '#1ABC9C', // Teal
    '#E74C3C', // Red
    '#F39C12', // Yellow
    '#2ECC71', // Green
    '#34495E', // Dark blue-gray
];
