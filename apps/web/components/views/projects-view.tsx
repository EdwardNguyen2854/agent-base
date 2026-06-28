"use client";

import {
  ArrowUpRight,
  Files,
  Folder,
  ListChecks,
  Plus,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "../../app/data-provider";
import { cn } from "../../lib/utils";
import { Magnetic } from "../motion/magnetic";
import { Reveal, Stagger, StaggerItem } from "../motion/reveal";
import { Button } from "../ui/button";
import { SearchInput } from "../ui/inputs";
import { PageHeader } from "../ui/page";
import { EmptyState } from "../ui/states";

export function ProjectsView() {
  const [state] = useData();
  const [query, setQuery] = useState("");
  const projects = useMemo(() => {
    if (!query.trim()) return state.projects;
    const needle = query.toLowerCase();
    return state.projects.filter((project) =>
      `${project.name} ${project.description}`.toLowerCase().includes(needle),
    );
  }, [state.projects, query]);

  return (
    <div className="space-y-12 md:space-y-16">
      <Reveal>
        <PageHeader
          eyebrow="Workspace"
          title="Projects"
          description="Organize reusable Sources and research Tasks. Each project is a durable body of related work."
          actions={
            <Magnetic strength={0.18}>
              <Button
                variant="primary"
                icon={<Plus size={14} weight="bold" />}
                asChild
              >
                <Link href="/projects/new">Start a research project</Link>
              </Button>
            </Magnetic>
          }
        />
      </Reveal>

      <Reveal>
        <div className="container-page flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search projects…"
            ariaLabel="Search projects"
          />
          <span className="text-[12px] font-semibold uppercase tracking-wider text-muted">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        </div>
      </Reveal>

      {projects.length === 0 ? (
        <EmptyState
          icon={<Folder size={22} weight="regular" />}
          title="No matching projects"
          description="Adjust your search or create a new project."
          action={
            <Button variant="primary" asChild>
              <Link href="/projects/new">New project</Link>
            </Button>
          }
        />
      ) : (
        <Reveal>
          <Stagger
            className="container-page grid grid-cols-12 gap-5 md:gap-6"
            gap={0.06}
          >
            {projects.map((project, index) => {
              const sourceCount = project.sources.length;
              const taskCount = state.tasks.filter(
                (task) => task.projectId === project.id,
              ).length;
              const layout =
                index % 4 === 0
                  ? "col-span-12 lg:col-span-6"
                  : index % 4 === 1
                    ? "col-span-12 sm:col-span-6 lg:col-span-3"
                    : index % 4 === 2
                      ? "col-span-12 sm:col-span-6 lg:col-span-3"
                      : "col-span-12 lg:col-span-12";
              return (
                <StaggerItem key={project.id} className={layout}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="group flex h-full flex-col rounded-[1.75rem] border border-border bg-surface p-7 shadow-[var(--shadow-card),var(--shadow-inset-highlight)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-text/15 hover:shadow-[var(--shadow-card-hover)] md:p-8"
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={cn(
                          "grid size-12 place-items-center rounded-2xl",
                          sourceCount > 0
                            ? "bg-accent-soft text-accent-hover"
                            : "bg-surface-soft text-muted",
                        )}
                      >
                        <Folder size={22} weight="regular" />
                      </span>
                      <ArrowUpRight
                        size={18}
                        weight="bold"
                        className="text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                        aria-hidden
                      />
                    </div>
                    <h3 className="mt-7 text-[19px] font-semibold tracking-tight text-text">
                      {project.name}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-muted">
                      {project.description || "No description yet."}
                    </p>
                    <div className="mt-auto flex items-center gap-4 border-t border-border pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Files size={13} weight="regular" />
                        {sourceCount} sources
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <ListChecks size={13} weight="regular" />
                        {taskCount} tasks
                      </span>
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </Reveal>
      )}
    </div>
  );
}

export function NewProjectView() {
  const [, source] = useData();
  return (
    <NewProjectForm
      onSubmit={(name, description) => source.createProject(name, description)}
    />
  );
}

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { TextAreaField, TextField } from "../ui/field";
import { Panel } from "../ui/surfaces";

function NewProjectForm({
  onSubmit,
}: {
  onSubmit: (name: string, description: string) => { id: string };
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const project = onSubmit(name, description);
    router.push(`/projects/${project.id}/sources`);
  };
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="New"
        title="Create a project"
        description="Create the working hub before adding Sources, Tasks, and Runs."
      />
      <Reveal>
        <form onSubmit={submit} className="container-page">
          <Panel className="mx-auto max-w-2xl">
            <TextField
              label="Project name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Q3 market scan"
              required
            />
            <div className="mt-5" />
            <TextAreaField
              label="Description"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does this project cover?"
            />
            <div className="mt-8 flex items-center justify-end gap-2 border-t border-border pt-5">
              <Button variant="ghost" asChild>
                <Link href="/projects">Cancel</Link>
              </Button>
              <Button variant="primary" type="submit">
                Create project
              </Button>
            </div>
          </Panel>
        </form>
      </Reveal>
    </div>
  );
}
