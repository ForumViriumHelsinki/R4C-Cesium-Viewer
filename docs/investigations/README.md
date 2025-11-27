# Investigations

This directory contains debugging investigations, performance analysis, and technical deep-dives.

## Active Investigations

### [tree-rendering/](./tree-rendering/)

Investigation into tree rendering issues, DataClone errors, and toggle functionality problems.

**Documents:**

- [DATACLONE_ERROR_ANALYSIS.md](./tree-rendering/DATACLONE_ERROR_ANALYSIS.md) - Analysis of DataClone errors in tree rendering
- [ISSUE_QUICK_REFERENCE.md](./tree-rendering/ISSUE_QUICK_REFERENCE.md) - Quick reference for known tree issues
- [TOGGLE_CODE_TRACE.md](./tree-rendering/TOGGLE_CODE_TRACE.md) - Code trace for tree toggle functionality

## Purpose

Investigation documents serve to:

- Document debugging processes and findings
- Track complex technical issues over time
- Share knowledge about tricky problems
- Provide reference for similar future issues
- Capture lessons learned

## When to Create an Investigation

Create an investigation document when:

- A bug requires extensive debugging (>2 hours)
- The issue involves multiple systems or complex interactions
- The root cause is non-obvious or unintuitive
- The solution might help with similar future problems
- Performance analysis reveals interesting patterns

## Investigation Structure

A good investigation document includes:

1. **Problem Statement** - Clear description of the issue
2. **Symptoms** - Observable behavior and error messages
3. **Investigation Process** - Steps taken, hypotheses tested
4. **Root Cause** - Final determination of the underlying issue
5. **Solution** - How it was fixed or worked around
6. **Prevention** - How to avoid similar issues in the future
7. **Related Issues** - Links to similar problems or relevant docs
