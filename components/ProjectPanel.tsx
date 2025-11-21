import React, { useState, useEffect } from 'react';
import type { Project, FontAnalysis, PairingCritique } from '../types';
import {
    getAllProjects,
    createProject,
    deleteProject,
    setActiveProject,
    getActiveProject,
    addPairingToProject,
    getProjectStats,
    PROJECT_COLORS,
    updateProject
} from '../services/projectService';

interface ProjectPanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentLeftFont: FontAnalysis | null;
    currentRightFont: FontAnalysis | null;
    currentCritique: PairingCritique | null;
    leftPreview?: string;
    rightPreview?: string;
    onProjectChange?: (project: Project | null) => void;
}

const ProjectPanel: React.FC<ProjectPanelProps> = ({
    isOpen,
    onClose,
    currentLeftFont,
    currentRightFont,
    currentCritique,
    leftPreview,
    rightPreview,
    onProjectChange
}) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProjectState] = useState<Project | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    // Load projects on mount and when panel opens
    useEffect(() => {
        if (isOpen) {
            refreshProjects();
        }
    }, [isOpen]);

    const refreshProjects = () => {
        const allProjects = getAllProjects();
        setProjects(allProjects);
        const active = getActiveProject();
        setActiveProjectState(active);
        onProjectChange?.(active);
    };

    const handleCreateProject = () => {
        if (!newProjectName.trim()) return;

        const project = createProject(newProjectName.trim(), undefined, newProjectColor);
        setNewProjectName('');
        setNewProjectColor(PROJECT_COLORS[0]);
        setIsCreating(false);
        refreshProjects();
    };

    const handleSelectProject = (projectId: string) => {
        setActiveProject(projectId);
        refreshProjects();
    };

    const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this project? All pairings will be lost.')) {
            deleteProject(projectId);
            refreshProjects();
        }
    };

    const handleSaveCurrentPairing = () => {
        if (!activeProject) {
            alert('Please select or create a project first');
            return;
        }

        if (!currentLeftFont && !currentRightFont) {
            alert('No fonts to save. Analyze at least one font first.');
            return;
        }

        addPairingToProject(
            activeProject.id,
            currentLeftFont,
            currentRightFont,
            leftPreview,
            rightPreview,
            currentCritique || undefined
        );

        refreshProjects();
        alert('Pairing saved to project!');
    };

    const handleStartEditing = (project: Project, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingProjectId(project.id);
        setEditingName(project.name);
    };

    const handleSaveEdit = (projectId: string) => {
        if (editingName.trim()) {
            updateProject(projectId, { name: editingName.trim() });
            refreshProjects();
        }
        setEditingProjectId(null);
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop overlay - click to close */}
            <div
                className="fixed inset-0 bg-black/40 z-40"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <div
                className="fixed inset-y-0 left-0 w-80 bg-surface border-r border-border shadow-2xl z-50 flex flex-col animate-slide-in-left"
                style={{ animation: 'slideInLeft 0.3s ease-out' }}
            >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-bold text-primary">Projects</h2>
                <button
                    onClick={onClose}
                    className="text-secondary hover:text-primary transition-colors p-1"
                    aria-label="Close panel"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Save Current Button */}
            {(currentLeftFont || currentRightFont) && (
                <div className="p-3 border-b border-border">
                    <button
                        onClick={handleSaveCurrentPairing}
                        className="w-full px-4 py-2 bg-accent text-surface font-bold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        Save Current Pairing
                    </button>
                </div>
            )}

            {/* Projects List */}
            <div className="flex-1 overflow-y-auto p-3">
                {projects.length === 0 && !isCreating ? (
                    <div className="text-center py-8 text-secondary">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <p className="text-sm mb-4">No projects yet</p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="text-accent hover:underline text-sm"
                        >
                            Create your first project
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {projects.map(project => {
                            const stats = getProjectStats(project.id);
                            const isActive = activeProject?.id === project.id;
                            const isEditing = editingProjectId === project.id;

                            return (
                                <div
                                    key={project.id}
                                    onClick={() => !isEditing && handleSelectProject(project.id)}
                                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                                        isActive
                                            ? 'bg-accent/20 border-2 border-accent'
                                            : 'bg-teal-dark/50 border border-teal-medium hover:border-accent/50'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {project.color && (
                                                <span
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: project.color }}
                                                />
                                            )}
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit(project.id);
                                                        if (e.key === 'Escape') setEditingProjectId(null);
                                                    }}
                                                    onBlur={() => handleSaveEdit(project.id)}
                                                    className="flex-1 bg-transparent border-b border-accent text-primary text-sm font-semibold focus:outline-none"
                                                    autoFocus
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span className="text-primary font-semibold text-sm truncate">
                                                    {project.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={(e) => handleStartEditing(project, e)}
                                                className="p-1 text-secondary hover:text-accent transition-colors"
                                                title="Edit name"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteProject(project.id, e)}
                                                className="p-1 text-secondary hover:text-red-400 transition-colors"
                                                title="Delete project"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Project Stats */}
                                    <div className="mt-2 flex items-center gap-3 text-xs text-secondary">
                                        <span>{stats?.totalPairings || 0} pairings</span>
                                        <span>{stats?.uniqueFonts || 0} fonts</span>
                                        {stats?.averageScore && (
                                            <span className="text-accent">{stats.averageScore}/10 avg</span>
                                        )}
                                    </div>

                                    <div className="mt-1 text-xs text-secondary/70">
                                        Updated {formatDate(project.updatedAt)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Create Project Form */}
                {isCreating && (
                    <div className="mt-3 p-3 bg-teal-dark/70 rounded-lg border border-teal-medium">
                        <input
                            type="text"
                            placeholder="Project name..."
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateProject();
                                if (e.key === 'Escape') setIsCreating(false);
                            }}
                            className="w-full bg-transparent border-b border-accent/50 text-primary text-sm py-1 px-0 placeholder-secondary focus:outline-none focus:border-accent"
                            autoFocus
                        />

                        {/* Color Picker */}
                        <div className="flex items-center gap-2 mt-3">
                            <span className="text-xs text-secondary">Color:</span>
                            <div className="flex gap-1">
                                {PROJECT_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setNewProjectColor(color)}
                                        className={`w-5 h-5 rounded-full transition-transform ${
                                            newProjectColor === color ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'
                                        }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={handleCreateProject}
                                disabled={!newProjectName.trim()}
                                className="flex-1 px-3 py-1.5 bg-accent text-surface text-sm font-semibold rounded-md hover:opacity-90 disabled:opacity-50 transition-all"
                            >
                                Create
                            </button>
                            <button
                                onClick={() => {
                                    setIsCreating(false);
                                    setNewProjectName('');
                                }}
                                className="px-3 py-1.5 bg-secondary/30 text-primary text-sm font-semibold rounded-md hover:bg-secondary/50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border">
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="w-full px-4 py-2 bg-secondary/30 text-primary font-semibold rounded-lg hover:bg-secondary/50 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Project
                    </button>
                )}
            </div>
        </div>
        </>
    );
};

export default ProjectPanel;
