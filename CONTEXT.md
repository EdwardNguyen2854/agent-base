# Agent Base

Agent Base is the domain for configuring AI workers, organizing evidence-backed work, and preserving what happened during execution.

## Ownership and organization

**Owner**:
The person who controls an Agent Base installation and its resources.
_Avoid_: User, Member, Administrator

**Workspace**:
The top-level ownership and isolation boundary containing Agent Base resources.
_Avoid_: Account, Tenant, Organization

**Project**:
A durable body of related work containing Sources and Tasks.
_Avoid_: Folder, Space, Repository

## Agent design

**Agent**:
A stable identity for a reusable AI worker configuration.
_Avoid_: Assistant, Bot, Model

**Agent Draft**:
The mutable, unpublished configuration being prepared for an Agent.
_Avoid_: Working Agent, Editable Version

**Agent Version**:
An immutable, published snapshot of an Agent's configuration.
_Avoid_: Agent Revision, Prompt Version

**Workflow**:
A predefined or semi-predefined execution path through known steps, checks, and approvals.
_Avoid_: Agent, Run

**Connector**:
A controlled capability through which an Agent can access an external source or system.
_Avoid_: Plugin, Tool Provider, Integration

**Credential**:
A secret that authorizes an Owner to use a Connector or model service.
_Avoid_: Password, Token Record

## Evidence

**Source**:
An evidence-bearing document or web resource that can support research.
_Avoid_: Knowledge, Context, Reference File

**Project Source**:
A Source owned by a Project and reusable across its Tasks.
_Avoid_: Attachment, Workspace Document

**Web Source**:
A public web Source discovered while performing a Run.
_Avoid_: Search Result, Link

**Source Excerpt**:
An exact retained passage from a Source that supports part of a Report.
_Avoid_: Snippet, Context Chunk, Quote Record

## Work and execution

**Task**:
A durable research goal within a Project.
_Avoid_: Prompt, Job, Request

**Run**:
One execution attempt to complete a Task using a specific Agent Version and fixed inputs.
_Avoid_: Task, Session, Conversation

**Research Plan**:
The proposed questions, evidence strategy, and boundaries for a Run.
_Avoid_: Workflow, Checklist

**Plan Approval**:
The Owner's decision that permits a Run to proceed beyond planning.
_Avoid_: Confirmation, Review

**Run Event**:
An observable fact recorded during a Run.
_Avoid_: Log Line, Trace Message

**Report**:
An immutable, evidence-linked research result produced by one Run.
_Avoid_: Artifact, Answer, Response

**Accepted Report**:
The Report selected by the Owner as the outcome of a Task.
_Avoid_: Final Run, Latest Report
