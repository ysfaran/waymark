# Waymark

Waymark helps coding agents selectively discover repository documentation
without interpreting the agent's task.

## Language

**Coding Agent**:
The caller that decides which documentation criteria matter for its current
task and queries Waymark with those criteria.
_Avoid_: User, Waymark agent

**Document Discovery**:
Selecting repository documents through explicit criteria supplied by a coding
agent. Discovery does not infer intent or judge semantic relevance.
_Avoid_: AI search, semantic search

**Waymark Document**:
A repository Markdown or MDX file that opts into document discovery by
declaring valid Waymark metadata. Files without that metadata are not Waymark
Documents.
_Avoid_: Indexed document, registered file

**Unregistered Document**:
A candidate Markdown or MDX file that has no Waymark Metadata. It is outside
document discovery and is not an invalid Waymark Document.
_Avoid_: Invalid document, missing document

**Waymark Metadata**:
The frontmatter declaration that opts a Markdown file into document discovery
and describes how coding agents can select it. It identifies one document kind,
provides a description, and may add tags.
_Avoid_: Document attributes, index fields

**Document Kind**:
The single primary role of a Waymark Document, expressing why a coding agent
would read it.
_Avoid_: Document type, kind tag

**Document Tag**:
An optional subject facet of a Waymark Document, expressing what the document
is about. A document may have any number of tags.
_Avoid_: Kind, label

**Document Description**:
A concise selection cue stating a Waymark Document's contents and scope so a
coding agent can decide whether to open it.
_Avoid_: Summary, agent instruction

**Content Query**:
An optional case-insensitive literal substring used to narrow metadata-selected
Waymark Documents by their Markdown bodies.
_Avoid_: Full-text search, semantic query

**Metadata Filter**:
Explicit criteria supplied by a coding agent to select Waymark Documents by
Document Kind and Document Tag.
_Avoid_: Relevance query, search prompt
