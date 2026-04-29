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

export const generateMissionArtifact = async (missionTitle: string, description: string): Promise<any> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `A founder just completed this mission: "${missionTitle}". Description: "${description}".
      Generate a short (2-3 word) "Achievement Code" and a stylized "Code Fragment" (e.g., "0xDEADBEEF-CORE") that represents this build.
      Return JSON: { "code": "Achievement Code", "fragment": "Code Fragment", "vibe": "One word to describe the energy (e.g. Kinetic, Brutal, Radiant)" }
      Only return the JSON object.`,
    });
    const text = response.text || '{"code": "MISSION_COMPLETE", "fragment": "TRANS-001", "vibe": "Kinetic"}';
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Artifact Error:", error);
    return { code: "MISSION_COMPLETE", fragment: "TRANS-001", vibe: "Kinetic" };
  }
};

export const suggestPostSpark = async (currentBuild: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User is building: "${currentBuild}". 
      Suggest a short, high-signal "spark" for a community post. 
      It should be brief and inspire other founders. max 20 words.`,
    });
    return response.text || "Building in public is the ultimate synergy.";
  } catch (error) {
    console.error("Spark Error:", error);
    return "Building in public is the ultimate synergy.";
  }
};

export const suggestMatches = async (userProfile: any, otherUsers: any[]): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a high-level founder matchmaking agent. 
      Analyze the current user's profile and a list of other founders. 
      Identify the top 3 most complementary matches.
      
      Current User:
      ${JSON.stringify(userProfile)}
      
      Other Founders:
      ${JSON.stringify(otherUsers)}
      
      Return a JSON array of objects with this structure:
      [
        {
          "uid": "string",
          "reason": "One sentence explaining why they are a great match (e.g., 'Their expertise in backend development perfectly complements your frontend skills.')",
          "synergyScore": number (1-100)
        }
      ]
      
      Only return the JSON array, no other text.`,
    });
    return response.text || "[]";
  } catch (error) {
    console.error("Gemini Match Error:", error);
    return "[]";
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
