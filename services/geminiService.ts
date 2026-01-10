
import { GoogleGenAI, Type } from "@google/genai";
import { Script, Panel } from '../types';
import { STYLE_PRESETS } from '../constants';

const SESSION_STORAGE_KEY = 'CUSTOM_GEMINI_API_KEY';

// API 오류 시 사용할 대기 아이디어 풀 (API 호출 실패 시에도 사용자가 경험을 유지하도록 함)
const FALLBACK_IDEAS_POOL = [
    "MBTI가 반대로 바뀐 커플의 하루",
    "회사 탕비실 냉장고에 사는 요정와의 협상",
    "고양이 번역기를 썼더니 내 고양이가 꼰대였다",
    "모든 거짓말이 현실이 되는 10분의 시간",
    "다이어트 실패를 합리화하는 101가지 방법",
    "전 여자친구가 직장 상사로, 현 여자친구가 부하직원으로",
    "지하철 옆자리 사람이 외계인이라는 확실한 증거",
    "로또 1등 당첨된 걸 숨겨야 하는 신입사원",
    "헬스장 고인물 할아버지 vs 신입 PT 쌤",
    "배달 음식을 시켰는데 미래의 내가 배달왔다",
    "스마트폰 중독 치료 모임에 간 스마트폰들",
    "소개팅에 나갔는데 상대방이 내 흑역사를 다 알고 있다",
    "집주인이 월세를 안 받는 대신 매일 개그를 요구한다",
    "편의점 알바생이 알고보니 재벌 3세 회장님",
    "중고거래 하러 나갔는데 상대가 전여친",
    "엘리베이터에 갇혔는데 방귀 뀐 범인을 찾아야 한다",
    "면접장에서 사장님 가발이 날아갔을 때의 대처법",
    "우리 집 강아지가 밤마다 이족보행을 연습한다",
    "무인도에 떨어졌는데 가져온 게 회사 노트북뿐",
    "조별과제 하는데 조원들이 어벤져스 빌런들이다",
    "엄마 몰래 산 게임기를 들키지 않기 위한 첩보 작전",
    "짝사랑하는 사람 앞에서 콧물 풍선을 불었다",
    "성형외과 의사가 내 얼굴을 보더니 환불해줬다",
    "좀비 사태가 터졌는데 헬스장에 갇혀서 근손실 걱정 중",
    "타임머신을 타고 과거로 갔는데 로또 번호를 까먹었다",
    "내가 키우던 다육이가 말을 걸기 시작했다",
    "출근길 지하철이 판타지 세계로 연결되었다",
    "하루아침에 인기 아이돌이 된 음치",
    "편의점 폐기 도시락 쟁탈전",
    "독서실 옆자리 사람이 수상하다",
    "머리가 벗겨졌는데 초능력이 생겼다",
    "알바 면접을 봤는데 사장님이 우리 아빠",
    "헤어진 연인이 같은 엘리베이터에 탔다",
    "맛집 줄 서다가 만난 운명의 상대",
    "동물원 사육사가 동물을 무서워함",
    "헬스장 거울 속의 내가 뚱뚱해 보인다",
    "꿈속에서 로또 번호를 봤는데 기억이 안 난다",
    "소개팅 상대가 사실은 구미호",
    "직장 상사가 내 덕질 계정을 팔로우했다",
    "반려견이 내 일기장을 읽고 있다"
];

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
        // 키가 없으면 에러를 던져서 catch 블록의 Fallback 로직을 타게 함
        throw new Error("API Key가 설정되지 않았습니다.");
    }
    return new GoogleGenAI({ apiKey: key });
};

// Markdown 코드 블록 등을 제거하여 순수 JSON 문자열만 추출하는 헬퍼 함수
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
          visual: { type: Type.STRING, description: "헤어스타일, 의상 컬러, 특징 등 외형을 매우 구체적으로 묘사 (이미지 생성용)" },
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
          scene: { type: Type.STRING, description: "배경과 조명, 분위기 묘사" },
          action: { type: Type.STRING, description: "캐릭터의 행동과 표정" },
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
      items: { type: Type.STRING },
    },
  },
  required: ["ideas"],
};

export const generateIdeas = async (genre: string): Promise<string[]> => {
  try {
    const ai = getClient();
    
    // 프롬프트 강화: 더 창의적이고 구체적인 아이디어를 요구
    const prompt = `
      당신은 센스 있는 웹툰 PD입니다. 
      "${genre}" 장르로 2030 독자들이 좋아할 만한 신선하고 재미있는 4컷 만화 소재 5가지를 추천해주세요.
      
      [필수 조건]
      1. 진부한 클리셰를 비틀거나, 의외의 상황을 설정하세요.
      2. "봇" 같지 않게, 사람이 쓴 것처럼 자연스럽고 구체적인 문장으로 작성하세요.
      3. 각 아이디어는 독립적이고 흥미로워야 합니다.
      4. 한국어로 작성하세요.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: ideasSchema,
        // 창의성을 높이기 위해 temperature 상향 조정
        temperature: 1.1,
        topK: 40,
        topP: 0.95,
      }
    });
    
    const text = response.text || "{}";
    // Markdown formatting 제거 후 파싱
    const result = JSON.parse(cleanJsonString(text));
    
    if (!result.ideas || result.ideas.length === 0) throw new Error("No ideas generated");
    return result.ideas;

  } catch (error) {
    console.warn("API Error or Key missing, using fallback ideas:", error);
    
    // Fallback: 풀에서 랜덤으로 5개 추출하여 매번 다른 결과 제공
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
        역할: 인기 웹툰 스토리 작가
        주제: "${topic}"
        장르: ${genre}
        스타일: ${style}
        
        위 정보를 바탕으로 4컷 만화의 콘티(대본)를 작성해주세요.
        
        [작성 가이드]
        1. 기승전결 구조를 갖추되, 4번째 컷에서는 반드시 웃음 포인트나 반전, 혹은 깊은 여운을 주어야 합니다.
        2. 대사는 스마트폰으로 보기에 좋도록 짧고 간결하게(컷당 2마디 이내) 작성하세요.
        3. [중요] 캐릭터의 외형(visual)은 이미지 생성 AI가 정확히 그릴 수 있도록 구체적인 특징(머리색, 옷 스타일/색상, 안경 유무 등)을 상세히 묘사하세요.
        4. 모든 텍스트는 한국어로 작성하세요.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: scriptSchema,
        temperature: 0.8,
      }
    });
    const jsonString = cleanJsonString(response.text);
    return JSON.parse(jsonString) as Script;
  } catch (error) {
    console.error("Error generating script:", error);
    return {
      characters: [{ name: "지혜", summary: "평범한 직장인", visual: "검은색 단발머리, 흰색 블라우스에 검정 자켓을 입은 오피스룩" }, { name: "냥이", summary: "지혜의 반려묘", visual: "통통한 체형의 노란색 치즈태비 고양이" }],
      panels: [
        { idx: 1, scene: "거실 소파", action: "지혜가 피곤한 표정으로 노트북을 하고 있고, 냥이가 옆에서 식빵을 굽고 있다.", dialogue: [{ by: "지혜", text: "오늘따라 일이 많네..." }], notes: "평화로운 저녁" },
        { idx: 2, scene: "거실 소파", action: "냥이가 지혜의 노트북 키보드 위로 올라가 엉덩이를 들이민다.", dialogue: [{ by: "지혜", text: "어, 냥이야 비켜줄래?" }], notes: "약간의 방해" },
        { idx: 3, scene: "노트북 화면 클로즈업", action: "냥이가 발로 키보드를 마구 밟아 화면에 알 수 없는 복잡한 코드가 입력되고 있다.", dialogue: [{ by: "냥이", text: "(골골송)" }], notes: "타자 소리 효과음" },
        { idx: 4, scene: "거실 소파", action: "지혜가 입을 벌리고 놀란 표정으로 화면을 본다. 화면에는 'NASA 해킹 성공' 메시지가 떠 있다.", dialogue: [{ by: "지혜", text: "이...이걸 네가...?" }], notes: "황당하고 놀란 분위기" }
      ],
      tone: "코믹, 반전"
    };
  }
};

export const generateCharacterImage = async (visual: string, style: string): Promise<string> => {
    try {
        const ai = getClient();
        // Use the detailed prompt from STYLE_PRESETS if available, otherwise use the ID
        const stylePresetPrompt = STYLE_PRESETS.find(s => s.id === style)?.prompt || style;
        
        const prompt = `
            Task: Generate a character sheet for a comic.
            Art Style: ${stylePresetPrompt}
            
            Character Visual Description: ${visual}
            
            Requirements:
            - Front view, upper body portrait.
            - Neutral expression.
            - Simple solid background (e.g., white or light grey).
            - High quality, sharp details.
            - NO text, NO speech bubbles, NO panel borders.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: "1:1",
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
    // Regex handles newlines in base64 and various image types robustly
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
        
        // 1. Define the task and style clearly
        parts.push({ text: `
            [Task]
            Generate a single comic panel illustration.
            
            [Art Style]
            ${stylePresetPrompt}
        `});

        // 2. Provide Character References (Images + Description)
        const relevantCharacters = characterReferences.filter(c => 
            panel.action.includes(c.name) || panel.scene.includes(c.name) || panel.dialogue.some(d => d.by === c.name)
        );

        if (relevantCharacters.length > 0) {
            parts.push({ text: `[Character References]\nUse these characters as visual references:` });
            
            relevantCharacters.forEach(charRef => {
                // Add text description to reinforce the image
                parts.push({ text: `Character Name: ${charRef.name}\nVisual Description: ${charRef.visual}` });
                
                if (charRef.image.startsWith('data:')) {
                    try {
                        parts.push(dataUrlToGeminiPart(charRef.image));
                    } catch (e) {
                        console.warn(`Skipping invalid reference image for ${charRef.name}`);
                    }
                }
            });
        }

        // 3. Define the Scene and Constraints
        parts.push({ text: `
            [Scene Content]
            Background/Setting: ${panel.scene}
            Action/Event: ${panel.action}
            
            [Constraints]
            - Create a full-bleed illustration (no white borders/frames).
            - DO NOT include speech bubbles.
            - DO NOT include text inside the artwork.
            - Maintain the specified art style.
            - High resolution, detailed.
        ` });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                imageConfig: {
                    aspectRatio: panel.aspectRatio || "1:1",
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
            contents: `주제 "${topic}", 톤 "${tone}" 기반 인스타그램 포스트 텍스트를 작성해줘.
            
            [요구사항]
            1. 캡션: 독자의 흥미를 유발하는 짧고 재치있는 문구 (이모지 포함).
            2. 해시태그: 유입이 많은 인기 해시태그 10개 이상.
            3. 반드시 한국어로 작성.
            `,
            config: {
                responseMimeType: "application/json",
                // 인스타그램 포스팅은 약간의 변주가 필요하므로 온도 높임
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
