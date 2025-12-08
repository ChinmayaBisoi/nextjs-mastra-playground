import { Agent } from "@mastra/core/agent";
import { AI_MODELS } from "@/constants/ai-models";

const REACT_GENERATOR_PROMPT = `Convert given static HTML and Tailwind slide to a TSX React component so that it can be dynamically populated. Follow these rules strictly while converting:

1) Required imports, a zod schema and HTML layout has to be generated.
2) Schema will populate the layout so make sure schema has fields for all text, images and icons in the layout.
3) For similar components in the layouts (eg, team members), they should be represented by array of such components in the schema.
4) For image and icons icons should be a different schema with two dunder fields for prompt and url separately.
5) Default value for schema fields should be populated with the respective static value in HTML input.
6) In schema max and min value for characters in string and items in array should be specified as per the given image of the slide. You should accurately evaluate the maximum and minimum possible characters respective fields can handle visually through the image. Also give out maximum number of words it can handle in the meta.
7) For image and icons schema should be compulsorily declared with two dunder fields for prompt and url separately.
8) Component name at the end should always be 'dynamicSlideLayout'.
9) **Import or export statements should not be present in the output.**
    - Don't give "import {React} from 'react'"
    - Don't give "import {z} from 'zod'"
10) Always use double quotes for strings.
11) Layout Id, layout name and layout description should be declared and should describe the structure of the layout not its purpose. Do not describe numbers of any items in the layout.
    -layoutDescription should not have any purpose for elements in it, so use '...cards' instead of '...goal cards' and '...bullet points' instead of '...solution bullet points'.
    -layoutDescription should not have words like 'goals', 'solutions', 'problems' in it.
    -layoutName constant should be same as the component name in the layout.
    -Layout Id examples: header-description-bullet-points-slide, header-description-image-slide
    -Layout Name examples: HeaderDescriptionBulletPointsLayout, HeaderDescriptionImageLayout
    -Layout Description examples: A slide with a header, description, and bullet points and A slide with a header, description, and image
12. Only give Code and nothing else. No other text or comments.
13. Do not parse the slideData inside dynamicSlideLayout, just use it as it is. Do not use statements like \`Schema.parse()\` anywhere. Instead directly use the data without validating or parsing.
14. Always complete the reference, do not give "slideData .? .cards" instead give "slideData?.cards".
15. Do not add anything other than code. Do not add "use client", "json", "typescript", "javascript" and other prefix or suffix, just give out code exactly formatted like example.
16. In schema, give default for all fields irrespective of their types, give default values for array and objects as well. 
17. For charts use recharts.js library and follow these rules strictly:
    - Do not import rechart, it will already be imported.
    - There should support for multiple chart types including bar, line, pie and donut in the same size as given. 
    - Use an attribute in the schema to select between chart types.
    - All data should be properly represented in schema.
18. For diagrams use mermaid with appropriate placeholder which can render any diagram. Schema should have a field for code. Render in the placeholder properly.
19. Don't add style attribute in the schema. Colors, font sizes, and all other style attributes should be added directly as tailwind classes.`;

export const reactGeneratorAgent = new Agent({
  id: "react-generator-agent",
  name: "React Generator Agent",
  instructions: REACT_GENERATOR_PROMPT,
  model: AI_MODELS.FREE.GPT_OSS_20B,
});
