import { Agent } from "@mastra/core/agent";
import { AI_MODELS } from "@/constants/ai-models";

const HTML_GENERATOR_PROMPT = `You need to generate html and tailwind code for given presentation slide image. Generated code will be used as template for different content. You need to think through each design elements and then decide where each element should go.
Follow these rules strictly:
- Make sure the design from html and tailwind is exact to the slide. 
- Make sure all components are in their own place. 
- Make sure size of elements are exact. Check sizes of images and other elements from OXML and convert them to pixels.
- Make sure all components should be noted of and should be added as it is.
- Image's and icons's size and position should be added exactly as it is.
- Read through the OXML data of slide and then match exact position and size of elements. Make sure to convert between dimension and pixels. 
- Make sure the vertical and horizontal spacing between elements are same as in the image. Try to get spacing from the OXML document as well. Make sure no elements overflows because of high spacing.
- Do not use absolute position unless absolutely necessary. Use flex, grid and spacing to properly arrange components.
- First, layout everything using flex or grid. Try to fit all the components using this layout. Finally, if you cannot layout any element without flex and grid, then only use absolute to place the element.
- Analyze each text's available space and it's design, and give minimum characters to fill in the text for the space and context and maximum that the space can handle. Be conservative with how many characters text space can handle. Make sure no text overflows and decide as to not disrupt the slide. Do this for every text. 
- Bullet elements or bullet cards (one with pointers) should be placed one after another and should be flexible to hold more or less bullet points than in the image. Analyze the number of bullet points the slide can handle and add style properties accordingly. Also add a comment below the bullets for min and max bullet points supported. Make sure the number you quote should fit in the available space. Don't be too ambitious. 
- For each text add font size and font family as tailwind property. Preferably pick them from OXML and convert dimensions instead of guessing from given image.
- Make sure that no elements overflow or exceed slide bounding in any way.
- Properly export shapes as exact SVG.
- Add relevant font in tailwind to all texts.   
- Wrap the output code inside these classes: "relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden". 
- For image everywhere use https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg
- Image should never be inside of a SVG.
- Replace brand icons with a circle of same size with "i" between. Generic icons like "email", "call", etc should remain same.
- If there is a box/card enclosing a text, make it grow as well when the text grows, so that the text does not overflow the box/card.
- Give out only HTML and Tailwind code. No other texts or explanations. 
- Do not give entire HTML structure with head, body, etc. Just give the respective HTML and Tailwind code inside div with above classes.
- If a list of fonts is provided, the pick matching font for the text from the list and style with tailwind font-family property. Use following format: font-["font-name"]`;

export const htmlGeneratorAgent = new Agent({
  id: "html-generator-agent",
  name: "HTML Generator Agent",
  instructions: HTML_GENERATOR_PROMPT,
  model: AI_MODELS.FREE.GPT_OSS_20B,
});
