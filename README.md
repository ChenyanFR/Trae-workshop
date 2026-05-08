# Art Exhibition

A browser-based 3D virtual art gallery built with Three.js.

## Overview

Walk through a 3D gallery space, view artworks up close, and interact with an AI guide that knows about the pieces on display.

## Features

**Two roles**

- Curator: upload artworks, edit artwork info, arrange the exhibition, and use Mr. Hue to adjust the gallery's lighting and wall colors.
- Visitor: walk freely through the gallery, click any artwork to enter focus mode, and ask Mr. Hue questions about what's on view.

**Mr. Hue**

An AI gallery guide powered by the Claude API. In curator mode he adjusts the scene atmosphere based on your description. In visitor mode he answers questions about the focused artwork, drawing on a built-in art knowledge base for more relevant responses.

**Focus Mode**

Click an artwork to view it fullscreen. Navigate between pieces with the arrow keys, open the detail page for full information, or ask Mr. Hue a question directly from the overlay.

## Stack

- Three.js — 3D rendering
- Vite — build tool
- Claude API (Anthropic) — AI features

## Running locally

```bash
cd art-exhibition
npm install
# create a .env file and set VITE_ANTHROPIC_API_KEY
npm run dev
```