
import React, { useEffect, useCallback, useRef } from 'react';
import { useProjectContext } from '../../hooks/useProjectContext';
import { AppStep, Character } from '../../types';
import { generateCharacterImage } from '../../services/geminiService';
import Button from '../ui/Button';
import { RefreshCwIcon } from '../Icons';

const CharacterCard: React.FC<{ character: Character; onUpdate: (id: string, updates: Partial<Character>) => void; onRegenerate: (id: string) => void }> = ({ character, onUpdate, onRegenerate }) => {
  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg p-4 flex flex-col items-center text-center space-y-3 border border-gray-200 dark:border-gray-600">
      <h3 className="text-lg font-bold">{character.name}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 h-10">{character.visual}</p>
      <div className="w-40 h-40 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center overflow-hidden relative">
        {character.isGenerating && <div className="absolute inset-0 flex items-center justify-center bg-black/10 dark:bg-black/30 z-10"><div className="animate-pulse text-purple-600 dark:text-purple-400 font-bold">생성중...</div></div>}
        {!character.isGenerating && character.referenceImageUrl && <img src={character.referenceImageUrl} alt={`${character.name} reference`} className="w-full h-full object-cover" />}
        {!character.isGenerating && !character.referenceImageUrl && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 text-xs p-2 gap-2">
                <span>이미지 생성 실패</span>
                <span className="text-[10px] text-center opacity-70 break-keep">
                    {/* Error hint could be stored in character state if needed, simplified here */}
                    다시 시도해주세요
                </span>
            </div>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={() => onRegenerate(character.id)} disabled={character.isGenerating} icon={<RefreshCwIcon className="w-4 h-4"/>}>
        다시 생성
      </Button>
    </div>
  );
}


const Step3Characters: React.FC = () => {
  const { project, setProject, setStep } = useProjectContext();
  const generatingRef = useRef(false);

  const handleCharacterUpdate = useCallback((id: string, updates: Partial<Character>) => {
    setProject(prevProject => {
      if (!prevProject.script) return prevProject;
      const updatedChars = prevProject.script.characters.map(c => c.id === id ? { ...c, ...updates } : c);
      return {
          ...prevProject,
          script: {
              ...prevProject.script,
              characters: updatedChars,
          }
      };
    });
  }, [setProject]);

  const generateImageForCharacter = useCallback(async (character: Character, silent: boolean = false) => {
    handleCharacterUpdate(character.id, { isGenerating: true });
    try {
      const imageUrl = await generateCharacterImage(character.visual, project.style);
      handleCharacterUpdate(character.id, { referenceImageUrl: imageUrl, isGenerating: false });
    } catch (error: any) {
      console.error(`Failed to generate image for ${character.name}:`, error);
      
      const errorMessage = error.message || "알 수 없는 오류";
      // Only alert if manual action, or if it's a critical error not just a glitch
      if (!silent) {
          alert(`[오류] '${character.name}' 이미지 생성 실패.\n${errorMessage}`);
      }
      
      handleCharacterUpdate(character.id, { isGenerating: false });
    }
  }, [project.style, handleCharacterUpdate]);

  const handleRegenerate = useCallback((id: string) => {
    const char = project.script?.characters.find(c => c.id === id);
    if (char) {
      generateImageForCharacter(char, false);
    }
  }, [project.script, generateImageForCharacter]);

  // Sequential generation to avoid rate limits
  useEffect(() => {
    const generateSequentially = async () => {
        if (!project.script || generatingRef.current) return;
        
        const charsToGenerate = project.script.characters.filter(c => !c.referenceImageUrl && !c.isGenerating);
        
        if (charsToGenerate.length > 0) {
            generatingRef.current = true;
            for (const char of charsToGenerate) {
                // Check if still needs generation (in case user navigated away or changed state)
                if (char.referenceImageUrl) continue; 
                await generateImageForCharacter(char, true);
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            generatingRef.current = false;
        }
    };

    const timer = setTimeout(() => {
        generateSequentially();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goNext = () => setStep(AppStep.PANELS);
  const goBack = () => setStep(AppStep.SCRIPT);
  
  const allImagesGenerated = project.script?.characters.every(c => c.referenceImageUrl);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">3. 등장인물 확인</h2>
      <p className="text-gray-600 dark:text-gray-400">대본을 기반으로 캐릭터들의 기준 이미지를 생성합니다. (순차적으로 생성됩니다)</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {project.script?.characters.map(char => (
          <CharacterCard key={char.id} character={char} onUpdate={handleCharacterUpdate} onRegenerate={handleRegenerate} />
        ))}
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="secondary" onClick={goBack}>이전</Button>
        <Button onClick={goNext} disabled={!allImagesGenerated}>
          만화 생성하기
        </Button>
      </div>
    </div>
  );
};

export default Step3Characters;
