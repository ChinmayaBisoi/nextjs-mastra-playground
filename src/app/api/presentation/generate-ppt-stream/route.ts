import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import PptxGenJS from "pptxgenjs";
import { mastra } from "@/mastra";

const slideSchema = z.object({
  title: z.string(),
  content: z.array(z.string()),
  layout: z.enum(["title", "content", "titleContent", "imageText"]),
  notes: z.string().optional(),
});

const outlineSchema = z.object({
  slides: z.array(slideSchema),
});

type StreamMessage =
  | {
      type: "progress";
      current: number;
      total: number;
      message: string;
    }
  | {
      type: "slide";
      slideIndex: number;
      slide: z.infer<typeof slideSchema>;
    }
  | {
      type: "complete";
      presentationId: string;
    }
  | {
      type: "error";
      error: string;
    };

function createStreamMessage(message: StreamMessage): string {
  return `data: ${JSON.stringify(message)}\n\n`;
}

// Helper function to convert outline slide to editor slide format
function convertOutlineSlideToEditorSlide(
  outlineSlide: z.infer<typeof slideSchema>,
  index: number
) {
  const elements: any[] = [];
  let zIndex = 1;

  // Add title element
  if (outlineSlide.title) {
    const titleElement = {
      id: `slide-${index}-title`,
      type: "text",
      content: outlineSlide.title,
      x: 100,
      y: 100,
      width: 1080,
      height: 80,
      fontSize: outlineSlide.layout === "title" ? 56 : 40,
      color: "#000000",
      fontWeight: "bold",
      align: outlineSlide.layout === "title" ? "center" : "left",
      zIndex: zIndex++,
    };
    elements.push(titleElement);
  }

  // Add content elements (bullet points)
  if (outlineSlide.content && outlineSlide.content.length > 0) {
    const startY = outlineSlide.layout === "title" ? 250 : 200;
    const spacing = 60;
    const fontSize = 24;
    const lineHeight = 32;

    outlineSlide.content.forEach((contentItem, contentIndex) => {
      const contentElement = {
        id: `slide-${index}-content-${contentIndex}`,
        type: "text",
        content: contentItem,
        x: 150,
        y: startY + contentIndex * spacing,
        width: 980,
        height: lineHeight,
        fontSize,
        color: "#333333",
        fontWeight: "normal",
        align: "left",
        zIndex: zIndex++,
      };
      elements.push(contentElement);
    });
  }

  return {
    id: `slide-${index}`,
    background: "#ffffff",
    elements,
  };
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { presentationId, outline } = await req.json();

    if (!presentationId) {
      return NextResponse.json(
        { error: "presentationId is required" },
        { status: 400 }
      );
    }

    // Fetch presentation and verify ownership
    const presentation = await prisma.presentation.findUnique({
      where: { id: presentationId },
    });

    if (!presentation) {
      return NextResponse.json(
        { error: "Presentation not found" },
        { status: 404 }
      );
    }

    if (presentation.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized - not your presentation" },
        { status: 403 }
      );
    }

    // Use provided outline or existing outline from database
    let slidesData: z.infer<typeof outlineSchema> | null = null;

    if (outline) {
      // Validate and use provided outline
      slidesData = outlineSchema.parse(outline);
      // Update presentation with new outline
      await prisma.presentation.update({
        where: { id: presentationId },
        data: {
          outline: outline as Prisma.InputJsonValue,
        },
      });
    } else if (presentation.outline) {
      // Use existing outline from database
      slidesData = outlineSchema.parse(presentation.outline);
    } else {
      return NextResponse.json(
        { error: "No outline available. Please generate an outline first." },
        { status: 400 }
      );
    }

    if (!slidesData || !slidesData.slides || slidesData.slides.length === 0) {
      return NextResponse.json(
        { error: "Invalid outline data" },
        { status: 400 }
      );
    }

    const totalSlides = slidesData.slides.length;

    // Get presentation title from first slide or description
    const title =
      slidesData.slides[0]?.title || presentation.description || "Presentation";

    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // Send initial progress
          controller.enqueue(
            encoder.encode(
              createStreamMessage({
                type: "progress",
                current: 0,
                total: totalSlides,
                message: "Starting PPT generation...",
              })
            )
          );

          // Generate layout theme using the layout theme agent
          const layoutThemeAgent = mastra?.getAgent("layoutThemeAgent");
          let layoutTheme: {
            theme: {
              primaryColor: string;
              secondaryColor?: string;
              accentColor?: string;
              backgroundColor?: string;
              textColor?: string;
              headingFont: string;
              bodyFont: string;
              headingFontSize: number;
              bodyFontSize: number;
              titleFontSize: number;
              lineSpacing?: number;
              slideMargin?: number;
            };
            layouts: {
              title: Record<string, unknown>;
              content: Record<string, unknown>;
              titleContent: Record<string, unknown>;
              imageText: Record<string, unknown>;
            };
          } | null = null;

          if (layoutThemeAgent) {
            try {
              // Check if controller is still open before enqueuing
              try {
                controller.enqueue(
                  encoder.encode(
                    createStreamMessage({
                      type: "progress",
                      current: 0,
                      total: totalSlides,
                      message: "Generating layout theme...",
                    })
                  )
                );
              } catch (enqueueError) {
                // Controller might be closed, log and continue
                console.warn(
                  "Could not enqueue progress message:",
                  enqueueError
                );
              }

              const themePrompt = `Design a professional layout and theme for this presentation about: "${title}"

The presentation has ${totalSlides} slides. Create a cohesive visual theme with appropriate colors, fonts, and spacing, and design optimal layouts for each slide type.`;

              // Add timeout to prevent hanging - skip theme generation if it takes too long
              const timeoutPromise = new Promise<null>((resolve) =>
                setTimeout(() => resolve(null), 10000)
              );

              const themeGenerationPromise = layoutThemeAgent.generate(
                [{ role: "user", content: themePrompt }],
                {
                  structuredOutput: {
                    schema: z.object({
                      theme: z.object({
                        primaryColor: z.string(),
                        secondaryColor: z.string().optional(),
                        accentColor: z.string().optional(),
                        backgroundColor: z.string().optional(),
                        textColor: z.string().optional(),
                        headingFont: z.string(),
                        bodyFont: z.string(),
                        headingFontSize: z.number(),
                        bodyFontSize: z.number(),
                        titleFontSize: z.number(),
                        lineSpacing: z.number().optional(),
                        slideMargin: z.number().optional(),
                      }),
                      layouts: z.object({
                        title: z.record(z.string(), z.unknown()),
                        content: z.record(z.string(), z.unknown()),
                        titleContent: z.record(z.string(), z.unknown()),
                        imageText: z.record(z.string(), z.unknown()),
                      }),
                    }),
                  },
                }
              );

              const themeResponse = await Promise.race([
                themeGenerationPromise,
                timeoutPromise,
              ]);

              // Safely check for theme response
              if (
                themeResponse?.object &&
                typeof themeResponse.object === "object"
              ) {
                layoutTheme = themeResponse.object;
              } else {
                console.warn(
                  "Layout theme response was invalid, using defaults"
                );
              }
            } catch (error) {
              console.error("Failed to generate layout theme:", error);
              // Continue with default theme - don't let this stop the generation
            }
          }

          // Generate PPT file
          const pres = new PptxGenJS();
          if (title) {
            pres.title = title;
          }

          // Use layout theme if available
          const theme = layoutTheme?.theme;
          const layouts = layoutTheme?.layouts;

          // Ensure colors are in correct format (PptxGenJS expects hex without #)
          // Use theme colors from API if provided, otherwise use design system defaults
          // Design system: foreground (text) = oklch(0.145 0 0) ≈ #252525, background = white = #FFFFFF
          const primaryColor =
            theme?.primaryColor?.replace("#", "") || "252525";
          const headingFont = theme?.headingFont || "Calibri";
          const bodyFont = theme?.bodyFont || "Calibri";
          // Use theme text color if provided, otherwise use design system foreground color
          const textColor = theme?.textColor?.replace("#", "") || "252525";

          // Use theme background if provided, otherwise use design system background (white)
          const backgroundColor =
            theme?.backgroundColor?.replace("#", "") || "FFFFFF";

          // Generate slides one by one
          for (let i = 0; i < slidesData.slides.length; i++) {
            const slide = slidesData.slides[i];
            const slideIndex = i;

            // Send progress update (with error handling)
            try {
              controller.enqueue(
                encoder.encode(
                  createStreamMessage({
                    type: "progress",
                    current: slideIndex + 1,
                    total: totalSlides,
                    message: `Generating slide ${slideIndex + 1}/${totalSlides}...`,
                  })
                )
              );
            } catch (enqueueError) {
              // If controller is closed, break out of loop
              console.error(
                "Stream controller closed, stopping generation:",
                enqueueError
              );
              break;
            }

            const pptxSlide = pres.addSlide();

            // Set slide background to white to ensure text visibility
            // PptxGenJS background format - use fill property
            pptxSlide.background = { fill: backgroundColor };

            const layoutSpec = layouts?.[slide.layout];

            switch (slide.layout) {
              case "title":
                const titleLayout =
                  (layoutSpec?.title as
                    | {
                        x?: number;
                        y?: number;
                        w?: number;
                        h?: number;
                        fontSize?: number;
                        bold?: boolean;
                        align?: string;
                      }
                    | undefined) ||
                  (layouts?.title?.title as
                    | {
                        x?: number;
                        y?: number;
                        w?: number;
                        h?: number;
                        fontSize?: number;
                        bold?: boolean;
                        align?: string;
                      }
                    | undefined);
                pptxSlide.addText(slide.title, {
                  x: titleLayout?.x ?? 0.5,
                  y: titleLayout?.y ?? 2,
                  w: titleLayout?.w ?? 9,
                  h: titleLayout?.h ?? 1.5,
                  fontSize: titleLayout?.fontSize ?? theme?.titleFontSize ?? 44,
                  bold: titleLayout?.bold ?? true,
                  color: primaryColor || "252525",
                  fontFace: headingFont,
                  align:
                    (titleLayout?.align as
                      | "left"
                      | "center"
                      | "right"
                      | undefined) ?? "center",
                  valign: "middle",
                });
                break;

              case "content":
                const contentLayout =
                  (layoutSpec?.content as
                    | {
                        x?: number;
                        y?: number;
                        w?: number;
                        h?: number;
                        fontSize?: number;
                        bullet?: boolean;
                        spacing?: number;
                      }
                    | undefined) ||
                  (layouts?.content?.content as
                    | {
                        x?: number;
                        y?: number;
                        w?: number;
                        h?: number;
                        fontSize?: number;
                        bullet?: boolean;
                        spacing?: number;
                      }
                    | undefined);
                slide.content.forEach((item, index) => {
                  const spacing = contentLayout?.spacing ?? 0.8;
                  pptxSlide.addText(item, {
                    x: contentLayout?.x ?? 0.5,
                    y: (contentLayout?.y ?? 0.5) + index * spacing,
                    w: contentLayout?.w ?? 9,
                    h: contentLayout?.h ?? 0.7,
                    fontSize:
                      contentLayout?.fontSize ?? theme?.bodyFontSize ?? 18,
                    bullet: contentLayout?.bullet ?? true,
                    color: textColor || "252525",
                    fontFace: bodyFont,
                    valign: "top",
                  });
                });
                break;

              case "titleContent":
              default:
                const tcTitleLayout =
                  (layoutSpec?.title as
                    | {
                        x?: number;
                        y?: number;
                        w?: number;
                        h?: number;
                        fontSize?: number;
                        bold?: boolean;
                      }
                    | undefined) ||
                  (layouts?.titleContent?.title as
                    | {
                        x?: number;
                        y?: number;
                        w?: number;
                        h?: number;
                        fontSize?: number;
                        bold?: boolean;
                      }
                    | undefined);
                const tcContentLayout =
                  (layoutSpec?.content as
                    | {
                        x?: number;
                        y?: number;
                        w?: number;
                        h?: number;
                        fontSize?: number;
                        bullet?: boolean;
                        spacing?: number;
                      }
                    | undefined) ||
                  (layouts?.titleContent?.content as
                    | {
                        x?: number;
                        y?: number;
                        w?: number;
                        h?: number;
                        fontSize?: number;
                        bullet?: boolean;
                        spacing?: number;
                      }
                    | undefined);

                pptxSlide.addText(slide.title, {
                  x: tcTitleLayout?.x ?? 0.5,
                  y: tcTitleLayout?.y ?? 0.3,
                  w: tcTitleLayout?.w ?? 9,
                  h: tcTitleLayout?.h ?? 0.8,
                  fontSize:
                    tcTitleLayout?.fontSize ?? theme?.headingFontSize ?? 32,
                  bold: tcTitleLayout?.bold ?? true,
                  color: primaryColor || "252525",
                  fontFace: headingFont,
                  valign: "top",
                });

                slide.content.forEach((item, index) => {
                  const spacing = tcContentLayout?.spacing ?? 0.7;
                  pptxSlide.addText(item, {
                    x: tcContentLayout?.x ?? 0.7,
                    y: (tcContentLayout?.y ?? 1.3) + index * spacing,
                    w: tcContentLayout?.w ?? 8.6,
                    h: tcContentLayout?.h ?? 0.6,
                    fontSize:
                      tcContentLayout?.fontSize ?? theme?.bodyFontSize ?? 16,
                    bullet: tcContentLayout?.bullet ?? true,
                    color: textColor || "252525",
                    fontFace: bodyFont,
                    lineSpacing: theme?.lineSpacing ?? 28,
                    valign: "top",
                  });
                });
                break;

              case "imageText":
                const itTitleLayout =
                  (layoutSpec?.title as
                    | {
                        x?: number;
                        y?: number;
                        w?: number;
                        h?: number;
                        fontSize?: number;
                        bold?: boolean;
                      }
                    | undefined) ||
                  (layouts?.imageText?.title as
                    | {
                        x?: number;
                        y?: number;
                        w?: number;
                        h?: number;
                        fontSize?: number;
                        bold?: boolean;
                      }
                    | undefined);
                const itContentLayout =
                  (layoutSpec?.content as
                    | {
                        x?: number;
                        y?: number;
                        w?: number;
                        h?: number;
                        fontSize?: number;
                        bullet?: boolean;
                        spacing?: number;
                      }
                    | undefined) ||
                  (layouts?.imageText?.content as
                    | {
                        x?: number;
                        y?: number;
                        w?: number;
                        h?: number;
                        fontSize?: number;
                        bullet?: boolean;
                        spacing?: number;
                      }
                    | undefined);

                pptxSlide.addText(slide.title, {
                  x: itTitleLayout?.x ?? 0.5,
                  y: itTitleLayout?.y ?? 0.3,
                  w: itTitleLayout?.w ?? 9,
                  h: itTitleLayout?.h ?? 0.8,
                  fontSize:
                    itTitleLayout?.fontSize ?? theme?.headingFontSize ?? 32,
                  bold: itTitleLayout?.bold ?? true,
                  color: primaryColor || "252525",
                  fontFace: headingFont,
                  valign: "top",
                });

                slide.content.forEach((item, index) => {
                  const spacing = itContentLayout?.spacing ?? 0.7;
                  pptxSlide.addText(item, {
                    x: itContentLayout?.x ?? 0.7,
                    y: (itContentLayout?.y ?? 1.3) + index * spacing,
                    w: itContentLayout?.w ?? 4.5,
                    h: itContentLayout?.h ?? 0.6,
                    fontSize:
                      itContentLayout?.fontSize ?? theme?.bodyFontSize ?? 16,
                    bullet: itContentLayout?.bullet ?? true,
                    color: textColor || "252525",
                    fontFace: bodyFont,
                    valign: "top",
                  });
                });
                break;
            }

            if (slide.notes) {
              pptxSlide.addNotes(slide.notes);
            }

            // Convert outline slide to editor format and save to database
            const editorSlide = convertOutlineSlideToEditorSlide(
              slide,
              slideIndex
            );

            // Save slide to database
            try {
              await prisma.slide.upsert({
                where: {
                  presentationId_order: {
                    presentationId: presentationId,
                    order: slideIndex,
                  },
                },
                create: {
                  presentationId: presentationId,
                  order: slideIndex,
                  data: editorSlide as Prisma.InputJsonValue,
                },
                update: {
                  data: editorSlide as Prisma.InputJsonValue,
                },
              });
            } catch (dbError) {
              console.error("Failed to save slide to database:", dbError);
              // Continue with streaming even if DB save fails
            }

            // Stream the slide data (with error handling)
            try {
              controller.enqueue(
                encoder.encode(
                  createStreamMessage({
                    type: "slide",
                    slideIndex,
                    slide,
                  })
                )
              );
            } catch (enqueueError) {
              console.error("Failed to stream slide data:", enqueueError);
              // Continue with next slide even if streaming fails
            }
          }

          // Generate the final PPT file
          try {
            controller.enqueue(
              encoder.encode(
                createStreamMessage({
                  type: "progress",
                  current: totalSlides,
                  total: totalSlides,
                  message: "Finalizing PPT...",
                })
              )
            );
          } catch (enqueueError) {
            console.error(
              "Failed to send finalization progress:",
              enqueueError
            );
            // Continue with PPT generation even if streaming fails
          }

          const base64Buffer = (await pres.write({
            outputType: "base64",
          })) as string;

          const filename = title
            ? `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pptx`
            : "presentation.pptx";

          // Update presentation status
          await prisma.presentation.update({
            where: { id: presentationId },
            data: {
              status: "PPT_GENERATED",
              pptFileUrl: filename,
            },
          });

          // Send completion message
          try {
            controller.enqueue(
              encoder.encode(
                createStreamMessage({
                  type: "complete",
                  presentationId: presentation.id,
                })
              )
            );
          } catch (enqueueError: unknown) {
            // Controller might be closed by client, which is fine
            if (
              enqueueError instanceof TypeError &&
              (enqueueError.message.includes("Invalid state") ||
                enqueueError.message.includes("already closed") ||
                enqueueError.message.includes("Controller"))
            ) {
              // Client disconnected, ignore silently
              return;
            }
            // Only log if it's not a controller closed error
            console.warn("Could not send completion message:", enqueueError);
          }

          // Close the controller
          try {
            controller.close();
          } catch (closeError: unknown) {
            // Controller already closed, which is fine if client disconnected
            if (
              closeError instanceof TypeError &&
              (closeError.message.includes("Invalid state") ||
                closeError.message.includes("already closed") ||
                closeError.message.includes("Controller"))
            ) {
              // Silently ignore - client disconnected
              return;
            }
            // Only log if it's not a controller closed error
            console.warn("Error closing controller:", closeError);
          }
        } catch (error) {
          console.error("Error in stream:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          // Try to send error message
          try {
            controller.enqueue(
              encoder.encode(
                createStreamMessage({
                  type: "error",
                  error: errorMessage,
                })
              )
            );
          } catch (enqueueError: unknown) {
            // Controller might be closed by client, which is fine
            if (
              enqueueError instanceof TypeError &&
              (enqueueError.message.includes("Invalid state") ||
                enqueueError.message.includes("already closed") ||
                enqueueError.message.includes("Controller"))
            ) {
              // Silently ignore - client disconnected
              return;
            }
            // Only log if it's not a controller closed error
            console.warn("Could not send error message:", enqueueError);
          }

          // Close the controller
          try {
            controller.close();
          } catch (closeError: unknown) {
            // Controller already closed, which is fine if client disconnected
            if (
              closeError instanceof TypeError &&
              (closeError.message.includes("Invalid state") ||
                closeError.message.includes("already closed") ||
                closeError.message.includes("Controller"))
            ) {
              // Silently ignore - client disconnected
              return;
            }
            // Only log if it's not a controller closed error
            console.warn("Error closing controller:", closeError);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Error generating PPT stream:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid outline format", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
