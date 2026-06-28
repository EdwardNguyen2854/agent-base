import { randomUUID } from "node:crypto";
import type {
  Project,
  ProjectId,
  ProjectSource,
  SourceChunk,
  SourceId,
  SourceKind,
  SourceState,
} from "@agent-base/domain/project.js";
import {
  MAX_PROJECT_SOURCES,
  validateSourceFile,
  validateSourceLimits,
} from "@agent-base/domain/project.js";

export type { Project, ProjectId, ProjectSource, SourceChunk, SourceId };
export type WorkspaceId = string;

export type ProjectInput = Readonly<{
  workspaceId: WorkspaceId;
  name: string;
  description: string;
}>;

export type ProjectWithSources = Readonly<{
  project: Project;
  sources: readonly ProjectSource[];
}>;

export type ProcessedSourceChunk = Readonly<{
  content: string;
  locator: SourceChunk["locator"];
  tokenCount: number;
}>;

export interface SearchResult {
  chunk: SourceChunk;
  score: number;
}

export interface ProjectRepository {
  createProject(project: Project): Promise<Project>;
  loadProject(id: ProjectId): Promise<Project | undefined>;
  listProjects(workspaceId: WorkspaceId): Promise<readonly Project[]>;
  addSource(source: ProjectSource): Promise<ProjectSource>;
  removeSource(sourceId: SourceId): Promise<void>;
  loadProjectSources(projectId: ProjectId): Promise<readonly ProjectSource[]>;
  updateSourceState(
    sourceId: SourceId,
    state: SourceState,
    error?: string,
  ): Promise<void>;
  storeChunks(chunks: readonly SourceChunk[]): Promise<void>;
  deleteChunksBySource(sourceId: SourceId): Promise<void>;
  deleteChunksByProject(projectId: ProjectId): Promise<void>;
  searchProjectChunks(
    projectId: ProjectId,
    query: string,
  ): Promise<readonly SearchResult[]>;
  listReadySourceIds(projectId: ProjectId): Promise<readonly SourceId[]>;
}

export class ProjectNotFoundError extends Error {
  constructor(id: string) {
    super(`Project ${id} not found`);
    this.name = "ProjectNotFoundError";
  }
}

export async function createProject(
  repository: ProjectRepository,
  input: ProjectInput,
): Promise<Project> {
  const name = input.name.trim();
  if (!name) throw new Error("Project name is required");
  const project: Project = {
    id: randomUUID(),
    workspaceId: input.workspaceId,
    name,
    description: input.description.trim(),
    createdAt: new Date(),
  };
  return repository.createProject(project);
}

export async function listProjects(
  repository: ProjectRepository,
  workspaceId: WorkspaceId,
): Promise<readonly Project[]> {
  return repository.listProjects(workspaceId);
}

export async function loadProject(
  repository: ProjectRepository,
  id: ProjectId,
): Promise<Project> {
  const project = await repository.loadProject(id);
  if (!project) throw new ProjectNotFoundError(id);
  return project;
}

export async function loadProjectWithSources(
  repository: ProjectRepository,
  id: ProjectId,
): Promise<ProjectWithSources> {
  const project = await loadProject(repository, id);
  const sources = await repository.loadProjectSources(id);
  return { project, sources };
}

export async function loadProjectSources(
  repository: ProjectRepository,
  id: ProjectId,
): Promise<readonly ProjectSource[]> {
  await loadProject(repository, id);
  return repository.loadProjectSources(id);
}

export type AddSourceInput = Readonly<{
  name: string;
  size: number;
}>;

export async function addSource(
  repository: ProjectRepository,
  projectId: ProjectId,
  input: AddSourceInput,
): Promise<ProjectSource> {
  const project = await loadProject(repository, projectId);
  const validation = validateSourceFile(input.name, input.size);
  if (!validation.ok) throw new Error(validation.error);

  const sources = await repository.loadProjectSources(project.id);
  validateSourceLimits(sources.length);

  const source: ProjectSource = {
    id: randomUUID(),
    projectId: project.id,
    name: input.name,
    kind: validation.kind,
    size: input.size,
    state: "pending",
    uploadedAt: new Date(),
  };
  return repository.addSource(source);
}

export async function removeSource(
  repository: ProjectRepository,
  projectId: ProjectId,
  sourceId: SourceId,
): Promise<void> {
  await loadProject(repository, projectId);
  await repository.deleteChunksBySource(sourceId);
  await repository.removeSource(sourceId);
}

export async function updateSourceState(
  repository: ProjectRepository,
  sourceId: SourceId,
  state: SourceState,
  error?: string,
): Promise<void> {
  await repository.updateSourceState(sourceId, state, error);
}

export async function searchSources(
  repository: ProjectRepository,
  projectId: ProjectId,
  query: string,
): Promise<readonly SearchResult[]> {
  return repository.searchProjectChunks(projectId, query);
}

export async function listReadySourceIds(
  repository: ProjectRepository,
  projectId: ProjectId,
): Promise<readonly SourceId[]> {
  return repository.listReadySourceIds(projectId);
}
