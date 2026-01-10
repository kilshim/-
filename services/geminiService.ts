
import { GoogleGenAI, Type } from "@google/genai";
import { Script, Panel } from '../types';
import { STYLE_PRESETS } from '../constants';

const SESSION_STORAGE_KEY = 'CUSTOM_GEMINI_API_KEY';

// Safety settings to prevent image generation blocking on standard comic content
const SAFETY_SETTINGS = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
];

// API 오류 시 사용할 대기 아이디어 풀
const FALLBACK_IDEAS_POOL = [
    { title: "MBTI가 바뀐 커플", plot: "극단적인 T 남자친구와 극단적인 F 여자친구의 MBTI가 하루아침에 뒤바뀌었다. 감성적인 남친과 냉철한 여친의 대혼란 데이트." },
    { title: "냉장고 요정와의 협상", plot: "자취생의 냉장고에 요정이 산다. 유통기한이 지난 음식을 먹으려 할 때마다 요정이 나타나 잔소리를 하며 음식을 뺏어간다." },
    { title: "꼰대 고양이", plot: "최신 고양이 번역기를 샀다. 기대하며 켰는데, 우리 집 고양이가 나보다 더한 꼰대 마인드로 집안일 훈수를 두기 시작한다." },
    { title: "거짓말이 현실로", plot: "딱 10분 동안 내가 하는 모든 빈말이 현실이 된다. '밥 한번 먹자'고 했다가 전국민과 식사를 하게 생겼다." },
    { title: "다이어트의 신", plot: "다이어트를 결심한 주인공. 하지만 세상의 모든 음식이 말을 걸며 유혹하기 시작한다. 치킨이 내 이름을 부른다." },
    { title: "전여친이 직장 상사", plot: "새로 이직한 꿈의 직장. 팀장님이 하필이면 최악으로 헤어졌던 전 여자친구다. 그녀의 복수가 업무지시로 시작된다." },
    { title: "지하철 외계인", plot: "매일 같은 칸에 타는 아저씨가 아무래도 외계인 같다. 오늘 그가 스마트폰이 아닌 오이를 귀에 대고 통화하는 걸 목격했다." },
    { title: "로또 1등 신입사원", plot: "입사 첫날 로또 1등에 당첨됐다. 퇴사하고 싶지만 부모님의 자랑이라 회사는 다녀야 한다. 웃음을 참느라 안면근육이 떨린다." },
    { title: "헬스장 고인물 할아버지", plot: "동네 헬스장에 나타난 90세 할아버지. 지팡이를 짚고 오셔서는 3대 500을 가볍게 치고 사라지신다." },
    { title: "미래에서 온 배달", plot: "배달 앱 오류로 30년 후의 내가 시킨 음식이 도착했다. 영수증에는 '당뇨 조심해서 먹어라'는 메모가 적혀있다." },
];

const getApiKey = (): string | null => {
    // 1. Session Storage (Manual Entry)
    if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) return stored;
    }

    // 2. Environment Variables (Various Prefixes for Vercel/Vite/Next/CRA)
    // process.env.API_KEY is preferred as per instructions, but fallbacks are needed for client-side builds.
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.API_KEY) return process.env.API_KEY;
        if (process.env.NEXT_PUBLIC_API_KEY) return process.env.NEXT_PUBLIC_API_KEY;
        if (process.env.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
    }

    // 3. Vite Import Meta (Specific to Vite builds)
    try {
        // @ts-ignore
        if (import.meta && import.meta.env && import.meta.env.VITE_API_KEY) {
            // @ts-ignore
            return import.meta.env.VITE_API_KEY;
        }
    } catch (e) {
        // Ignore errors if import.meta is not available
    }

    return null;
};

export const hasApiKey = (): boolean => {
    return !!getApiKey();
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
    const key = getApiKey();
    if (!key) {
        throw new Error("API Key가 설정되지 않았습니다. 설정 메뉴에서 키를 입력하거나 환경 변수를 확인해주세요.");
    }
    return new GoogleGenAI({ apiKey: key });
};

const cleanJsonString = (text: string): string => {
    return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
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
          visual: { type: Type.STRING, description: "이미지 생성용 외형 묘사. (예: '빨간 후드티를 입은 갈색 머리 소년', '파란 넥타이를 맨 흰 고양이')" },
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
          scene: { type: Type.STRING, description: "배경과 조명, 전체적인 분위기" },
          action: { type: Type.STRING, description: "캐릭터의 구체적인 행동, 자세, 표정" },
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
          notes: { type: Type.STRING, description: "연출 팁" },
        },
        required: ["idx", "scene", "action", "dialogue", "notes"],
      },
    },
    tone: { type: Type.STRING, description: "만화의 전체적인 톤앤매너" },
  },
  required: ["characters", "panels", "tone"],
};

const ideasSchema = {
  type: Type.OBJECT,
  properties: {
    ideas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "아이디어의 흥미로운 제목" },
            plot: { type: Type.STRING, description: "2-3문장으로 구성된 구체적인 줄거리 및 반전 요소" }
        },
        required: ["title", "plot"]
      },
    },
  },
  required: ["ideas"],
};

export const generateIdeas = async (genre: string): Promise<{title: string, plot: string}[]> => {
  try {
    const ai = getClient();
    
    const prompt = `
      당신은 웹툰 플랫폼의 메인 PD입니다.
      "${genre}" 장르로 독자들의 이목을 끌 수 있는 4컷 만화 아이디어 5가지를 기획해주세요.
      
      [필수 조건]
      1. 각 아이디어는 '제목'과 '플롯(줄거리)'으로 구성해주세요.
      2. 플롯은 2~3문장으로 작성하되, 기승전결이 느껴지거나 반전 포인트가 포함되어야 합니다.
      3. 뻔한 내용보다는 2030 세대가 공감할 수 있는 현실적인 디테일이나 엉뚱한 상상력을 더해주세요.
      4. 한국어로 자연스럽게 작성하세요.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: ideasSchema,
        temperature: 1.1,
      }
    });
    
    const text = response.text || "{}";
    const result = JSON.parse(cleanJsonString(text));
    
    if (!result.ideas || result.ideas.length === 0) throw new Error("No ideas generated");
    return result.ideas;

  } catch (error) {
    console.warn("API Error or Key missing, using fallback ideas:", error);
    const shuffled = [...FALLBACK_IDEAS_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }
};

export const generateScript = async (topic: string, genre: string, style: string): Promise<Script> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        역할: 베스트 도전 만화 스토리 작가
        주제: "${topic}"
        장르: ${genre}
        스타일: ${style}
        
        위 주제를 바탕으로 4컷 만화의 콘티(대본)를 작성해주세요.
        
        [작성 가이드]
        1. **캐릭터 외형(visual)**: 이미지 생성 AI가 그릴 것이므로, 추상적인 묘사(예: 멋진, 예쁜) 대신 **시각적인 특징(예: 검은색 뿔테 안경, 파란색 후드티, 짧은 단발머리)**을 매우 구체적으로 작성하세요.
        2. **구조**: 1-3컷은 빌드업, 4컷은 확실한 반전이나 웃음 포인트가 있어야 합니다.
        3. **대사**: 컷당 2마디 이내로 짧고 임팩트 있게 작성하세요.
        4. 한국어로 작성하세요.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: scriptSchema,
        temperature: 0.85,
      }
    });
    const jsonString = cleanJsonString(response.text);
    return JSON.parse(jsonString) as Script;
  } catch (error) {
    console.error("Error generating script:", error);
    return {
      characters: [{ name: "지혜", summary: "평범한 직장인", visual: "검은색 단발머리, 흰색 셔츠, 검은색 정장 바지" }, { name: "냥이", summary: "지혜의 반려묘", visual: "통통한 노란색 치즈태비 고양이" }],
      panels: [
        { idx: 1, scene: "거실 소파", action: "지혜가 피곤한 표정으로 소파에 누워있고, 냥이가 배 위에 앉아있다.", dialogue: [{ by: "지혜", text: "아... 내일 월요일 실화냐..." }], notes: "절망적인 분위기" },
        { idx: 2, scene: "거실 소파", action: "냥이가 지혜의 얼굴을 앞발로 툭툭 친다.", dialogue: [{ by: "냥이", text: "야, 일어나. 밥 줘." }], notes: "무심한 표정" },
        { idx: 3, scene: "거실", action: "지혜가 벌떡 일어나 사료를 붓는다.", dialogue: [{ by: "지혜", text: "네네, 드립니다요..." }], notes: "집사의 숙명" },
        { idx: 4, scene: "거실 클로즈업", action: "냥이가 사료는 안 먹고 지혜의 출근 가방에 토를 하고 있다.", dialogue: [{ by: "지혜", text: "야!!!!" }], notes: "경악하는 표정" }
      ],
      tone: "코믹, 일상"
    };
  }
};

export const generateCharacterImage = async (visual: string, style: string): Promise<string> => {
    try {
        const ai = getClient();
        const stylePresetPrompt = STYLE_PRESETS.find(s => s.id === style)?.prompt || style;
        
        const prompt = `
            Design a character sheet.
            Art Style: ${stylePresetPrompt}
            Character Details: ${visual}
            
            Key Requirements:
            1. **Front View Portrait**: Upper body or full body shot facing forward.
            2. **Solid Background**: Use a simple white or light grey background. No complex scenery.
            3. **Consistency**: Clear lines and distinct features suitable for a comic character.
            4. **No Text**: Do not include any text, names, or color palettes in the image.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: "1:1",
                },
                safetySettings: SAFETY_SETTINGS,
            }
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("이미지 데이터가 없습니다. (Safety Blocked?)");
    } catch (error) {
        console.error("Error generating character image:", error);
        throw error;
    }
};

const dataUrlToGeminiPart = (dataUrl: string) => {
    const match = dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,([\s\S]+)$/);
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
        
        const parts: any[] = [];
        
        // 1. Reference Images (First!) - Model pays more attention to images at the start
        const relevantCharacters = characterReferences.filter(c => 
            panel.action.includes(c.name) || panel.scene.includes(c.name) || panel.dialogue.some(d => d.by === c.name)
        );

        relevantCharacters.forEach(charRef => {
            if (charRef.image.startsWith('data:')) {
                try {
                    parts.push(dataUrlToGeminiPart(charRef.image));
                } catch (e) { console.warn(`Skipping invalid ref image for ${charRef.name}`); }
            }
        });

        // 2. Constructed Text Prompt (Unified)
        let textPrompt = `[Style Definition]\n${stylePresetPrompt}\n\n`;
        
        if (relevantCharacters.length > 0) {
            textPrompt += `[Character References]\n`;
            relevantCharacters.forEach(c => {
                textPrompt += `- ${c.name}: ${c.visual}\n`;
            });
            textPrompt += `(Use the attached reference images for these characters)\n\n`;
        }

        textPrompt += `[Scene Description]\n`;
        textPrompt += `Location/Background: ${panel.scene}\n`;
        textPrompt += `Action/Pose: ${panel.action}\n\n`;
        
        textPrompt += `[Strict Generation Rules]\n`;
        textPrompt += `1. Draw exactly the scene described above in the defined style.\n`;
        textPrompt += `2. Maintain character consistency with the provided references.\n`;
        textPrompt += `3. **NO TEXT**: Do not draw any speech bubbles, sound effects, or text.\n`;
        textPrompt += `4. **Full Color**: High quality illustration.\n`;

        parts.push({ text: textPrompt });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                imageConfig: {
                    aspectRatio: panel.aspectRatio || "1:1",
                },
                safetySettings: SAFETY_SETTINGS,
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("이미지 데이터가 없습니다. (Safety Blocked?)");
    } catch (error) {
        console.error("Error generating panel image:", error);
        throw error;
    }
};

export const generateInstagramPost = async (topic: string, tone: string): Promise<{ caption: string, hashtags: string }> => {
    try {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `주제 "${topic}", 톤 "${tone}" 기반 인스타그램 포스트 텍스트를 작성해줘.
            
            [요구사항]
            1. 캡션: 독자의 흥미를 유발하는 짧고 재치있는 문구 (이모지 포함).
            2. 해시태그: 유입이 많은 인기 해시태그 10개 이상.
            3. 반드시 한국어로 작성.
            `,
            config: {
                responseMimeType: "application/json",
                temperature: 0.8,
            }
        });
        const jsonString = cleanJsonString(response.text);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error generating Instagram post:", error);
        return { caption: "오늘의 만화!", hashtags: "#웹툰 #만화 #인스타툰 #일상 #공감" };
    }
};
