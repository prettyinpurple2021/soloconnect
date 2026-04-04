import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const generatePostContent = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert solopreneur assistant. Help the user write a professional, engaging post for their community feed. 
      The user's idea is: "${prompt}". 
      Provide a concise, impactful post (max 150 words) with relevant hashtags.`,
    });
    return response.text || "Sorry, I couldn't generate content at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating content. Please try again.";
  }
};

export const generateEventDescription = async (title: string, context: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an event planner for solopreneurs. Create a compelling description for an event titled "${title}". 
      Additional context: "${context}". 
      Make it sound professional, inviting, and clear about the value of attending.`,
    });
    return response.text || "Sorry, I couldn't generate a description.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating description.";
  }
};

export const summarizeNotifications = async (notifications: string[]): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a personal assistant for a busy solopreneur. Summarize the following recent notifications in a concise, friendly way (max 100 words). 
      Focus on what's important and what needs action.
      Notifications:
      ${notifications.map((n, i) => `${i + 1}. ${n}`).join('\n')}`,
    });
    return response.text || "No summary available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating summary.";
  }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Generate a professional, modern, and high-quality image for a solopreneur's social media post. 
            The theme is: "${prompt}". 
            Style: Clean, minimalist, tech-forward, with vibrant but professional colors. 
            Avoid text in the image.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64Data = part.inlineData.data;
        return `data:image/png;base64,${base64Data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Error:", error);
    return null;
  }
};

export const analyzePulse = async (stats: any): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `As a SoloScribe AI Analyst, analyze these community stats and provide a one-sentence punchy insight for the "Founder Pulse" dashboard. 
      Stats: ${JSON.stringify(stats)}
      Focus on momentum, engagement, or growth. Keep it under 15 words.`,
    });
    return response.text || "Momentum is building. Keep pushing!";
  } catch (error) {
    console.error("Gemini Pulse Error:", error);
    return "Momentum is building. Keep pushing!";
  }
};

export const createChatSession = (systemInstruction: string): Chat => {
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction,
    },
  });
};
