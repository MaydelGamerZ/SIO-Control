# SIO-Control Backend

This folder contains the backend-facing business layer for SIO-Control.

It is intentionally framework-neutral so it can be reused from the current Firebase frontend and later moved to Cloud Functions, an API server, or batch jobs.

Responsibilities:

- Inventory status constants and observation options
- Inventory normalization and total recalculation
- Product/category filtering helpers
- PDF text-line interpretation and inventory structure building
- Data-shape helpers that keep categories as parent blocks and products as children
