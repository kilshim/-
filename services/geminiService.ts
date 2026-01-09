
import { GoogleGenAI, Type } from "@google/genai";
import { Script, Panel } from '../types';
import { STYLE_PRESETS } from '../constants';

const SESSION_STORAGE_KEY = 'CUSTOM_GEMINI_API_KEY';

export const hasApiKey = (): boolean => {
    return !!sessionStorage.getItem(SESSION_STORAGE_KEY) || !!process.env.API_KEY;
};

export const saveApiKey = (key: string) => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, key);
};

export const removeApiKey = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
};

export const validateApiKey = async (key: string): Promise<boolean> => {
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: 'test',
        });
        return true;
    } catch (error) {
        console.error("API Key validation failed:", error);
        return false;
    }
}

const getClient = () => {
    // sessionStorage에 저장된 키가 있으면 우선 사용, 없으면 환경변수 사용
    const key = sessionStorage.getItem(SESSION_STORAGE_KEY) || process.env.API_KEY;
    if (!key) {
        throw new Error("API Key가 설정되지 않았습니다.");
    }
    return new GoogleGenAI({ apiKey: key });
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
      model: 'gemini-3-pro-preview',
      contents: `4컷 만화에 사용할 ${genre} 장르의 참신하고 재미있는 주제 5개를 제안해줘. 일상적인 공감대나 예상치 못한 반전이 있는 아이디어가 좋아. 한국어로, JSON 형식으로만 응답해줘. 예: {"ideas": ["주제1", "주제2", ...]}.`,
    });
    const jsonString = response.text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(jsonString);
    return result.ideas;
  } catch (error) {
    console.error("Error generating ideas:", error);
    return ["AI-powered toothbrush goes on strike", "A cat discovers its owner is a famous cat-meme influencer", "Two pigeons argue about the best spot to find french fries", "A houseplant plots world domination", "A ghost who is afraid of the dark"];
  }
};

export const generateScript = async (topic: string, genre: string, style: string): Promise<Script> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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
        const prompt = `4컷 만화 캐릭터 시트 생성. 캐릭터 설명: ${visual}, 스타일: ${stylePreset}. 정면, 상반신, 중립적인 표정, 단색 배경. 글자 포함 금지.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: "1:1",
                    imageSize: "1K"
                }
            }
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("이미지 데이터가 없습니다.");
    } catch (error) {
        console.error("Error generating character image:", error);
        return `https://picsum.photos/seed/${encodeURIComponent(visual)}/512/512`;
    }
};

const dataUrlToGeminiPart = (dataUrl: string) => {
    const match = dataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) throw new Error("Invalid data URL");
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
        const parts: any[] = [{ text: `만화 스타일: ${stylePresetPrompt}` }];

        const relevantCharacters = characterReferences.filter(c => 
            panel.action.includes(c.name) || panel.scene.includes(c.name) || panel.dialogue.some(d => d.by === c.name)
        );

        relevantCharacters.forEach(charRef => {
            parts.push({ text: `캐릭터 '${charRef.name}' 참고용 이미지:` });
            parts.push(dataUrlToGeminiPart(charRef.image));
        });

        parts.push({ text: `생성할 내용: ${panel.scene}, ${panel.action}. 텍스트나 테두리 없이 꽉 찬 풀-블리드 이미지로 그려줘.` });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: {
                imageConfig: {
                    aspectRatio: panel.aspectRatio || "1:1",
                    imageSize: "1K"
                }
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("이미지 데이터가 없습니다.");
    } catch (error) {
        console.error("Error generating panel image:", error);
        return `https://picsum.photos/seed/panel-${panel.idx}/512/512`;
    }
};

export const generateInstagramPost = async (topic: string, tone: string): Promise<{ caption: string, hashtags: string }> => {
    try {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `주제 "${topic}", 톤 "${tone}" 기반 인스타그램 포스트 생성. JSON 형식 응답: {"caption": "...", "hashtags": "..."}.`,
        });
        const jsonString = response.text.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error generating Instagram post:", error);
        return { caption: "오늘의 만화!", hashtags: "#웹툰 #만화" };
    }
};
