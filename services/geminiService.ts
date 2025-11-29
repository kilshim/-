
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Script, Panel } from '../types';
import { STYLE_PRESETS } from '../constants';

const STORAGE_KEY = 'GEMINI_API_KEY_ENC';

// Helper to "encrypt" (obfuscate) the key before storing
const encryptKey = (key: string): string => {
  try {
    return btoa(key);
  } catch (e) {
    return key;
  }
};

// Helper to "decrypt"
const decryptKey = (key: string): string => {
  try {
    return atob(key);
  } catch (e) {
    return key;
  }
};

export const hasApiKey = (): boolean => {
    return !!localStorage.getItem(STORAGE_KEY);
};

export const saveApiKey = (key: string) => {
    localStorage.setItem(STORAGE_KEY, encryptKey(key));
};

export const removeApiKey = () => {
    localStorage.removeItem(STORAGE_KEY);
};

export const validateApiKey = async (key: string): Promise<boolean> => {
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        // Make a lightweight call to test the key
        await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'test',
        });
        return true;
    } catch (error) {
        console.error("API Key validation failed:", error);
        return false;
    }
}

const getClient = () => {
    const encryptedKey = localStorage.getItem(STORAGE_KEY);
    if (!encryptedKey) {
        throw new Error("API Key not found. Please set your Gemini API Key in settings.");
    }
    const apiKey = decryptKey(encryptedKey);
    return new GoogleGenAI({ apiKey });
};

const scriptSchema = {
  type: Type.OBJECT,
  properties: {
    characters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "캐릭터 이름" },
          summary: { type: Type.STRING, description: "캐릭터 성격이나 역할 요약" },
          visual: { type: Type.STRING, description: "헤어스타일, 복장, 소품 등 외형 묘사" },
        },
        required: ["name", "summary", "visual"],
      },
    },
    panels: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          idx: { type: Type.INTEGER, description: "컷 번호 (1-4)" },
          scene: { type: Type.STRING, description: "배경과 구도 설명" },
          action: { type: Type.STRING, description: "캐릭터의 행동" },
          dialogue: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                by: { type: Type.STRING, description: "대사를 말하는 캐릭터 이름" },
                text: { type: Type.STRING, description: "캐릭터의 대사" },
              },
              required: ["by", "text"],
            },
          },
          notes: { type: Type.STRING, description: "감정 표현, 효과음, 강조할 소품 등 추가 정보" },
        },
        required: ["idx", "scene", "action", "dialogue", "notes"],
      },
    },
    tone: { type: Type.STRING, description: "만화의 전체적인 톤앤매너 (예: 유머, 힐링, 풍자)" },
  },
  required: ["characters", "panels", "tone"],
};

export const generateIdeas = async (genre: string): Promise<string[]> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `4컷 만화에 사용할 ${genre} 장르의 참신하고 재미있는 주제 5개를 제안해줘. 일상적인 공감대나 예상치 못한 반전이 있는 아이디어가 좋아. 한국어로, JSON 형식으로만 응답해줘. 예: {"ideas": ["주제1", "주제2", ...]}.`,
    });
    const jsonString = response.text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(jsonString);
    return result.ideas;
  } catch (error) {
    console.error("Error generating ideas:", error);
    // Propagate error if it's an API key issue so the UI can handle it
    if (error instanceof Error && error.message.includes("API Key")) throw error;
    
    return ["AI-powered toothbrush goes on strike", "A cat discovers its owner is a famous cat-meme influencer", "Two pigeons argue about the best spot to find french fries", "A houseplant plots world domination", "A ghost who is afraid of the dark"];
  }
};

export const generateScript = async (topic: string, genre: string, style: string): Promise<Script> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `주제: "${topic}", 장르: ${genre}, 스타일: ${style}를 바탕으로 4컷 만화 대본을 생성해줘. 컷 1은 도입, 컷 4는 반전이나 여운이 있어야 해. 대사는 컷당 1~2개를 넘지 않게 간결하게 작성해줘.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: scriptSchema,
      }
    });
    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as Script;
  } catch (error) {
    console.error("Error generating script:", error);
    if (error instanceof Error && error.message.includes("API Key")) throw error;

    return {
      characters: [{ name: "지혜", summary: "평범한 직장인", visual: "단발머리, 오피스룩" }, { name: "냥이", summary: "지혜의 반려묘", visual: "치즈태비 고양이" }],
      panels: [
        { idx: 1, scene: "소파 위", action: "지혜가 노트북을 하고 있고, 냥이가 옆에서 식빵을 굽고 있다.", dialogue: [{ by: "지혜", text: "오늘따라 일이 많네..." }], notes: "평화로운 저녁" },
        { idx: 2, scene: "소파 위", action: "냥이가 지혜의 노트북 키보드 위로 올라간다.", dialogue: [{ by: "지혜", text: "어, 냥이야 비켜줄래?" }], notes: "약간의 방해" },
        { idx: 3, scene: "소파 위, 노트북 화면 클로즈업", action: "냥이가 키보드를 마구 밟아 알 수 없는 글자들이 입력되고 있다.", dialogue: [{ by: "냥이", text: "(골골송)" }], notes: "타자 소리 효과음" },
        { idx: 4, scene: "소파 위", action: "지혜가 놀란 표정으로 화면을 보고, 냥이는 만족스러운 표정으로 앉아있다. 화면에는 '초고속 양자컴퓨팅 알고리즘 완성'이라는 글자가 떠 있다.", dialogue: [{ by: "지혜", text: "이...이걸 네가...?" }], notes: "황당하고 놀란 분위기" }
      ],
      tone: "코믹, 반전"
    };
  }
};

export const generateCharacterImage = async (visual: string, style: string): Promise<string> => {
    try {
        const ai = getClient();
        const stylePreset = STYLE_PRESETS.find(s => s.id === style)?.name || style;
        const prompt = `4컷 만화 캐릭터 시트 생성.
- 캐릭터 설명: ${visual}
- 스타일: ${stylePreset}
- 요구사항: 정면, 상반신, 중립적인 표정, 단색 배경. 그림에 어떤 글자도 포함하지 말 것.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        throw new Error("No image data found in response");
    } catch (error) {
        console.error("Error generating character image:", error);
        if (error instanceof Error && error.message.includes("API Key")) throw error;
        return `https://picsum.photos/seed/${encodeURIComponent(visual)}/512/512`;
    }
};

const dataUrlToGeminiPart = (dataUrl: string) => {
    const match = dataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        console.error("Invalid data URL:", dataUrl.substring(0, 30) + "...");
        throw new Error("Invalid data URL");
    }
    return {
        inlineData: {
            mimeType: match[1],
            data: match[2],
        },
    };
};


export const generatePanelImage = async (
    panel: Omit<Panel, 'imageUrl' | 'isGenerating' | 'overlays'>,
    characterReferences: { name: string; image: string; visual: string }[],
    style: string
): Promise<string> => {
    try {
        const ai = getClient();
        const stylePresetPrompt = STYLE_PRESETS.find(s => s.id === style)?.prompt || 'A clean comic art style.';
        
        const parts: any[] = [];

        // 1. Initial instruction
        const initialPrompt = `**GOAL**: Create a single, high-quality comic book panel.

**CRITICAL STYLE INSTRUCTIONS**:
- The art style is: **${stylePresetPrompt}**.
- Every element in the image must strictly adhere to this style.

**CHARACTER REFERENCE INSTRUCTIONS**:
- You will be given reference images for the characters appearing in this panel.
- The characters you draw MUST look exactly like their provided reference images. Maintain their specific facial features, hair, and clothing.
- Pay close attention to which character is which.
`;
        parts.push({ text: initialPrompt });

        // 2. Add character references
        const relevantCharacters = characterReferences.filter(c => 
            panel.action.includes(c.name) || 
            panel.scene.includes(c.name) || 
            panel.dialogue.some(d => d.by === c.name)
        );

        if (relevantCharacters.length > 0) {
            for (const charRef of relevantCharacters) {
                parts.push({text: `This is the reference for the character named **${charRef.name}**.`});
                parts.push(dataUrlToGeminiPart(charRef.image));
            }
        }

        // 3. Add final panel generation instructions
        const finalPrompt = `
**PANEL CONTENT TO GENERATE**:
Now, using the style and character references above, create the image for this panel:
- **Aspect Ratio**: Strictly ${panel.aspectRatio || '1:1'}.
- **Scene & Background**: ${panel.scene}
- **Characters & Actions**: ${panel.action}
- **Mood & Details**: ${panel.notes}

**FINAL RULES**:
- **DO NOT** include any text, speech bubbles, or panel borders in the image.
- The output should ONLY be the artwork for this single panel.
- **CRITICAL COMPOSITION RULE**: The main subjects MUST be fully visible. Leave a consistent margin around all sides of the subjects so they are never cropped by the panel edges. The composition must feel balanced and not overly cramped.
`;
        parts.push({ text: finalPrompt });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        throw new Error("No image data found in response");

    } catch (error) {
        console.error("Error generating panel image:", error);
        if (error instanceof Error && error.message.includes("API Key")) throw error;
        const seed = encodeURIComponent(`${panel.scene.slice(0, 10)}-${panel.action.slice(0, 10)}`);
        return `https://picsum.photos/seed/${seed}/512/512`;
    }
};


export const generateInstagramPost = async (topic: string, tone: string): Promise<{ caption: string, hashtags: string }> => {
    try {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `4컷 만화의 주제 "${topic}"와 톤 "${tone}"을 바탕으로 인스타그램 포스트를 작성해줘. 본문은 125자 내외로, 이모지를 2-4개 사용하고, 해시태그는 #웹툰 #4컷만화 등을 포함하여 10-15개 정도 생성해줘. 한국어로, JSON 형식으로만 응답해줘. 예: {"caption": "...", "hashtags": "#태그1 #태그2 ..."}.`,
        });
        const jsonString = response.text.replace(/```json|```/g, '').trim();
        const result = JSON.parse(jsonString);
        return result;
    } catch (error) {
        console.error("Error generating Instagram post:", error);
        if (error instanceof Error && error.message.includes("API Key")) throw error;
        return {
            caption: "오늘의 4컷 만화! 🤣 평범한 일상 속 소소한 반전을 담아봤어요. 여러분의 하루에도 즐거운 일이 가득하길 바라요! ✨",
            hashtags: "#웹툰 #인스타툰 #4컷만화 #일상툰 #개그툰 #만화스타그램 #그림일기 #코믹 #반전 #AI만화 #오늘의유머"
        };
    }
};
