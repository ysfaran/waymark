---
kind: research
description: Compares established CLI filter syntax and recommends Waymark filtering conventions
tags: [cli, waymark-metadata]
---

# CLI filter syntax conventions

## Research question

How do established command-line tools express AND, OR, NOT, repeated filter
options, comma-separated values, and grouping, and what do those conventions
imply for Waymark's proposed `find` interface?

## Status

Complete for the primary sources listed below.

## Last updated

2026-07-27.

## Scope and method

This note compares official specifications and first-party manuals for POSIX
and GNU `find` and `grep`, Git, Kubernetes, Docker, GitHub CLI/search, and
Cargo. It evaluates syntax and ergonomics; it is supporting evidence, not an
architectural decision.

## Summary

There is no universal CLI meaning for a comma or a repeated option:

- POSIX `grep` and repeated Git `--grep` patterns use OR, while Git can change
  repeated `--grep` to AND with `--all-match`.
  ([POSIX `grep`][posix-grep], [Git `log`][git-log])
- Docker combines repeated filters with the same key using OR and filters with
  different keys using AND for commands that document that behavior.
  ([Docker image prune][docker-image-prune])
- Kubernetes uses commas between selector requirements as AND, but commas
  inside an `in (...)` value set represent alternatives. Kubernetes does not
  support OR between complete requirements.
  ([Kubernetes selectors][kubernetes-selectors])
- GitHub issue search uses commas within one label qualifier for OR and
  separate label qualifiers for AND.
  ([GitHub issue search][github-issue-search])
- Cargo accepts comma- or space-separated feature values and allows the option
  to be repeated; every supplied feature is enabled.
  ([Cargo build][cargo-build])

The most transferable convention is therefore not a particular punctuation
mark. It is to give each option an explicit, documented set meaning and keep
the simple-option grammar separate from a complete Boolean-expression
grammar.

For Waymark, the evidence favors retaining the simple
`--kinds`/`--tags`/`--require-tags` interface for common queries and offering a
mutually exclusive, single-argument `--filter` expression for arbitrary
grouping. The expression should use the words `NOT`, `AND`, and `OR`, require
explicit operators, and be passed in single quotes.

## Findings by tool

### POSIX and GNU `grep`: repeated patterns are alternatives

POSIX `grep` accepts multiple `-e` and `-f` options and selects a line when any
supplied pattern matches. `-v` inverts the selection and chooses lines matching
none of the supplied patterns. POSIX also recommends single-quoting a complete
pattern argument when it contains characters meaningful to the shell.
([POSIX `grep`][posix-grep])

GNU `grep` follows the same option model: multiple `-e` and `-f` inputs supply
all search patterns, while `--invert-match` inverts the resulting match.
([GNU `grep` matching control][gnu-grep])

Implications:

- Repeating a homogeneous positive criterion to mean OR is familiar.
- A global inversion flag provides only `NOT (A OR B)`; it does not provide
  arbitrary nested Boolean logic.
- Pattern syntax can add its own alternation, but that makes Boolean structure
  depend on the selected pattern language and is not a good analogue for exact
  kind and tag identifiers.

### POSIX and GNU `find`: a complete predicate language

POSIX `find` evaluates a Boolean expression for each encountered file. GNU
`find` documents the operator order as parentheses, NOT, AND, OR, then the
comma/list operator. Adjacent primaries imply AND, and AND/OR evaluation
short-circuits from left to right.
([POSIX `find`][posix-find], [GNU `find` expressions][gnu-find-expressions],
[GNU `find` operators][gnu-find-operators])

The grammar is powerful but exposed directly as shell arguments. POSIX warns
that parentheses and other expression characters must be quoted, and GNU
notes that `!` may also require protection from the shell.
([POSIX `find` usage][posix-find-usage], [GNU `find`
operators][gnu-find-operators])

Implications:

- `NOT` > `AND` > `OR` plus parentheses is an established precedence model.
- Implicit AND saves typing, but makes a generated query less
  self-describing.
- A token-by-token expression forces callers to understand two parsers: the
  shell and the CLI.

### Git: both simple accumulation and full Boolean expressions

Git exposes several useful variants:

- `git log` combines repeated `--grep` patterns with OR by default;
  `--all-match` requires all supplied patterns, and `--invert-grep` negates the
  message match.
  ([Git `log`][git-log])
- `git grep` combines multiple patterns with OR by default, but also provides
  `--and`, `--or`, `--not`, and parentheses. AND has higher precedence than OR.
  Its official example escapes parentheses for the shell, and every pattern in
  a Boolean expression must be introduced with `-e`.
  ([Git `grep`][git-grep])
- Git pathspecs first admit paths matching any positive pathspec, then remove
  matches selected by exclusion pathspecs. This is include-then-exclude set
  algebra, not arbitrary Boolean grouping.
  ([Git pathspec glossary][git-pathspec])

Implications:

- A separate “require all” control is familiar, but a global switch such as
  `--all-match` cannot express `(A OR B) AND C` within one homogeneous field.
- Full Boolean syntax handles every grouping, but Git's escaped-parenthesis
  example illustrates the shell cost of exposing operators as separate
  arguments.
- Include-then-exclude syntax is compact when exclusion is the only advanced
  need; it does not replace a general expression when callers need multiple
  OR groups.

### Kubernetes: comma means AND at one level and OR at another

Kubernetes label selectors join comma-separated requirements with AND.
Set-based requirements use `in`, `notin`, existence, and non-existence tests;
the values inside `in (production, qa)` are alternatives. The API explicitly
does not support OR between complete requirements. Its CLI examples quote
set-based selectors containing parentheses.
([Kubernetes selectors][kubernetes-selectors])

Implications:

- Comma can safely denote “a list,” but its Boolean meaning depends on what the
  list contains.
- A constrained selector language can be compact and useful without being
  logically complete.
- Quoting one expression argument is clearer than requiring callers to escape
  individual parentheses.

### Docker: same-key OR, different-key AND

Docker filtering accepts repeated `--filter key=value` flags. The general
filter documentation shows repeated positive filters used as OR alternatives.
The `docker image prune` reference makes the grouping rule explicit for that
command: values under the same key are ORed, while different keys are ANDed.
Docker also documents unintuitive behavior for multiple negated label filters,
and warns that supported fields and matching behavior vary by command.
([Docker filters][docker-filters], [Docker image
prune][docker-image-prune])

Implications:

- OR within one dimension and AND across dimensions is a strong precedent for
  `kinds`, optional tags, and required tags being separate groups.
- Repetition alone is not self-explanatory; the help text must state how
  same-option and different-option occurrences combine.
- Negation deserves an explicit grammar rather than being inferred from
  punctuation attached to values.

### GitHub CLI/search: simple qualifiers plus a query language

`gh issue list` exposes dedicated filter flags and a separate `--search`
argument that accepts GitHub's advanced query syntax.
([GitHub CLI `issue list`][gh-issue-list])

GitHub's issue filter language supports `AND`, `OR`, implicit AND through
whitespace, and parentheses. Within label qualifiers, a comma expresses OR
while separate qualifiers express AND. A leading hyphen excludes a qualifier.
([GitHub issue search][github-issue-search])

That leading-hyphen negation conflicts with command option parsing in
`gh search`; the official CLI manual requires `--` before a query beginning
with or containing such a negative qualifier in the demonstrated form.
([GitHub CLI `search`][gh-search])

Implications:

- Dedicated flags plus one advanced-query argument is an established
  two-level interface.
- `field:value` predicates are compact and familiar.
- Punctuation-based negation can collide with option parsing.
- Allowing both dedicated flags and an advanced query is possible, but then
  the tool must define their cross-grammar combination. Mutual exclusion is
  simpler.

### Cargo: comma-separated and repeated values flatten into one set

Cargo's `--features` accepts comma- or space-separated values, may be repeated,
and enables all values supplied across occurrences.
([Cargo build][cargo-build], [Cargo features][cargo-features])

Implications:

- Supporting both commas and repeated options is established.
- Both spellings should flatten into the same semantic group. Giving
  `--tags a,b` different logic from `--tags a --tags b` would be surprising.

## Shell-safety findings

POSIX identifies `|`, `&`, `;`, parentheses, whitespace, and several other
characters as requiring quoting when they are intended literally; `!` and
comma may also need quoting in some circumstances. Single quotes preserve the
literal value of their contents.
([POSIX shell quoting][posix-shell-quoting])

Consequences for a Waymark expression:

- Do not use a bare `|` as a list separator or OR operator; the shell treats it
  as a pipeline operator.
- Avoid symbolic `&&`, `||`, and `!` in documented examples.
- Pass the whole filter as one single-quoted option argument:

  ```sh
  waymark find \
    --filter 'kind:convention AND (tag:react OR tag:typescript) AND NOT tag:deprecated'
  ```

- Keep kind and tag identifiers constrained so a normal predicate does not need
  nested quoting.

## Options for Waymark

### Option A: simple flags only

```sh
waymark find \
  --kinds adr,convention \
  --tags react,typescript \
  --require-tags review
```

One possible documented algebra is:

```text
(kind = adr OR kind = convention)
AND
(tag = react OR tag = typescript)
AND
tag = review
```

Strengths:

- Covers the motivating review-agent query.
- Uses exact values and avoids a parser inside the CLI.
- Mirrors Docker's OR-within/AND-across grouping and Cargo's value
  accumulation.

Limit:

- Cannot express multiple arbitrary groups such as
  `(react AND typescript) OR (vue AND javascript)`.

### Option B: Boolean expression only

```sh
waymark find \
  --filter '(kind:adr OR kind:convention) AND (tag:react OR tag:typescript)'
```

Strengths:

- Complete grouping with one syntax.
- Closely resembles `find`, `git grep`, and GitHub advanced filters.

Costs:

- Every common query requires operators and quoting.
- Parser errors, precedence, and shell quoting become part of the basic agent
  workflow.

### Option C: simple flags plus a mutually exclusive Boolean expression

Keep Option A as shorthand and add Option B only when grouping requires it.
Reject an invocation that combines `--filter` with `--kinds`, `--tags`, or
`--require-tags`.

Strengths:

- Common queries remain short.
- Advanced queries remain fully expressive.
- Mutual exclusion prevents hidden rules about how two filter grammars
  compose.

Cost:

- The CLI has two query surfaces that must be tested and documented as
  equivalent where their capabilities overlap.

## Recommendation

Option C best fits the evidence and Waymark's agent-first goal.

For the simple flags:

- `--kinds adr,convention` means any listed kind.
- `--tags react,typescript` means at least one listed tag.
- `--require-tags review,typescript` means every listed tag.
- Different option groups combine with AND.
- Repeated occurrences and comma-separated values flatten identically within
  their option group.

This makes a mixed simple query unambiguous:

```sh
waymark find \
  --kinds adr,convention \
  --tags react,vue \
  --require-tags typescript,review
```

```text
(adr OR convention)
AND
(react OR vue)
AND
typescript
AND
review
```

For `--filter`:

- Make it mutually exclusive with all three simple metadata filter options.
- Accept only `kind:<identifier>` and `tag:<identifier>` predicates.
- Use `NOT`, `AND`, and `OR`, with precedence `NOT` > `AND` > `OR`.
- Support parentheses.
- Require operators explicitly; do not infer AND from whitespace.
- Document one single-quoted argument as the canonical shell form.
- Do not give comma a meaning inside the expression; use explicit Boolean
  operators there.

A minimal grammar would be:

```text
filter     = or-expression
or-expression
           = and-expression ("OR" and-expression)*
and-expression
           = unary-expression ("AND" unary-expression)*
unary-expression
           = "NOT" unary-expression
           | "(" filter ")"
           | predicate
predicate  = "kind:" identifier
           | "tag:" identifier
```

This recommendation deliberately does not add regexes, wildcards, implicit
operators, or comparison syntax. None is needed for Waymark's exact,
repository-declared kinds and tags, and each would enlarge the parser without
addressing the motivating queries.

## Sources

- [POSIX `grep`][posix-grep]
- [GNU `grep` matching control][gnu-grep]
- [POSIX `find`][posix-find]
- [POSIX `find` application usage][posix-find-usage]
- [GNU `find` expressions][gnu-find-expressions]
- [GNU `find` Boolean operators][gnu-find-operators]
- [Git `grep`][git-grep]
- [Git `log`][git-log]
- [Git pathspec glossary][git-pathspec]
- [Kubernetes labels and selectors][kubernetes-selectors]
- [Docker filter commands][docker-filters]
- [Docker image-prune filters][docker-image-prune]
- [GitHub CLI `issue list`][gh-issue-list]
- [GitHub issue and pull-request filters][github-issue-search]
- [GitHub CLI `search`][gh-search]
- [Cargo `build` feature selection][cargo-build]
- [Cargo features][cargo-features]
- [POSIX shell quoting][posix-shell-quoting]

[posix-grep]: https://pubs.opengroup.org/onlinepubs/7908799/xcu/grep.html
[gnu-grep]: https://www.gnu.org/software/grep/manual/html_node/Matching-Control.html
[posix-find]: https://pubs.opengroup.org/onlinepubs/9699919799/utilities/find.html
[posix-find-usage]: https://pubs.opengroup.org/onlinepubs/009604399/utilities/find.html
[gnu-find-expressions]: https://www.gnu.org/software/findutils/manual/html_node/find_html/find-Expressions.html
[gnu-find-operators]: https://www.gnu.org/software/findutils/manual/html_node/find_html/Combining-Primaries-With-Operators.html
[git-grep]: https://git-scm.com/docs/git-grep
[git-log]: https://git-scm.com/docs/git-log
[git-pathspec]: https://git-scm.com/docs/gitglossary.html#Documentation/gitglossary.txt-aiddefpathspecapathspec
[kubernetes-selectors]: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors
[docker-filters]: https://docs.docker.com/engine/cli/filter/
[docker-image-prune]: https://docs.docker.com/reference/cli/docker/image/prune/#filtering---filter
[gh-issue-list]: https://cli.github.com/manual/gh_issue_list
[github-issue-search]: https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests
[gh-search]: https://cli.github.com/manual/gh_search
[cargo-build]: https://doc.rust-lang.org/cargo/commands/cargo-build.html#feature-selection
[cargo-features]: https://doc.rust-lang.org/stable/cargo/reference/features.html#command-line-feature-options
[posix-shell-quoting]: https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html#tag_19_02
