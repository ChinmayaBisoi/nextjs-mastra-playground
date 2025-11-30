# Slide Converter

Modular converter to transform PowerPoint slide XML files into structured JSON format.

## Structure

```
slide-converter/
├── types.ts          # TypeScript type definitions
├── utils.ts          # Utility functions (unit conversion, attribute extraction)
├── parser.ts         # XML parsing utilities
├── extractors.ts     # Functions to extract data from parsed XML
├── converter.ts      # Main conversion logic
├── index.ts          # Public API exports
└── test-slide1.ts    # Test script for slide 1
```

## Usage

### Convert a single slide

```typescript
import { convertSlideToJsonFile } from './slide-converter';

const outputPath = await convertSlideToJsonFile(
  1, // slide number
  '/path/to/output/cream', // output directory
  '/path/to/output.json' // optional: custom output path
);
```

### Convert slide to JSON object

```typescript
import { convertSlideToJson } from './slide-converter';

const slideJson = await convertSlideToJson(1, '/path/to/output/cream');
```

## Output Format

The converter produces a JSON structure with:

- **slideNumber**: Slide index (1-based)
- **background**: Background color/image
- **elements**: Array of slide elements (images and text)
- **layout**: Layout reference information

### Element Types

**Image Elements:**
- Position, size, transform (flip, rotation)
- Media references (PNG/JPG and SVG)

**Text Elements:**
- Position, size
- Text content
- Formatting (font, size, color, alignment, spacing)

## Unit Conversions

- **Positions/Sizes**: Stored in EMUs (English Metric Units)
- **Font Sizes**: Converted from PowerPoint units (hundredths of a point) to points
- **Colors**: Normalized to hex format with `#` prefix

## Testing

Run the test script:

```bash
npx tsx src/data/slide-converter/test-slide1.ts
```

This will convert slide 1 and save the output to:
`src/data/output/cream/slides-json/slide1.json`

