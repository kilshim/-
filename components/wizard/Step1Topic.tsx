
import React, { useState } from 'react';
import { useProjectContext } from '../../hooks/useProjectContext';
import { AppStep } from '../../types';
import { generateIdeas, generateScript } from '../../services/geminiService';
import { GENRES, STYLE_PRESETS, FORMATS } from '../../constants';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { WandIcon } from '../Icons';

const Step1Topic: React.FC = () => {
  const { project, updateProject, setStep } = useProjectContext();
  const [topic, setTopic] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  const handleGenerateIdeas = async () => {
    setIsGeneratingIdeas(true);
    const newIdeas = await generateIdeas(project.genre);
    setIdeas(newIdeas);
    setIsGeneratingIdeas(false);
  };

  const handleSelectIdea = (idea: string) => {
    setTopic(idea);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;

    setIsGeneratingScript(true);
    updateProject({ title: topic });
    const scriptData = await generateScript(topic, project.genre, project.style);
    
    // Initialize project script structure
    updateProject({
      script: {
        characters: scriptData.characters.map((c, i) => ({ ...c, id: `char-${i}` })),
        panels: scriptData.panels.map(p => ({ ...p, overlays: [], aspectRatio: '1:1' })),
        tone: scriptData.tone,
      }
    });

    setIsGeneratingScript(false);
    setStep(AppStep.SCRIPT);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">1. 만화 주제 정하기</h2>
      <p className="text-gray-600 dark:text-gray-400">만화의 주제, 장르, 그림 스타일을 선택하세요. 좋은 아이디어가 없다면 AI에게 추천받을 수 있습니다.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="genre" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">장르</label>
            <select
              id="genre"
              value={project.genre}
              onChange={(e) => updateProject({ genre: e.target.value })}
              className="w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-gray-900 dark:text-white"
            >
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">스타일</label>
            <select
              id="style"
              value={project.style}
              onChange={(e) => updateProject({ style: e.target.value })}
              className="w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-gray-900 dark:text-white"
            >
              {STYLE_PRESETS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="format" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">만화 형식</label>
            <select
              id="format"
              value={project.format}
              onChange={(e) => updateProject({ format: e.target.value as '4-cut' | 'continuous' })}
              className="w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-gray-900 dark:text-white"
            >
              {FORMATS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">주제</label>
          <textarea
            id="topic"
            rows={3}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            placeholder="예: 고양이가 갑자기 말을 하기 시작했다"
          />
        </div>

        <div className="space-y-4">
          <Button type="button" variant="secondary" onClick={handleGenerateIdeas} isLoading={isGeneratingIdeas} icon={<WandIcon className="w-4 h-4" />}>
            AI로 아이디어 추천받기
          </Button>
          {ideas.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-2">추천 아이디어</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ideas.map((idea, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectIdea(idea)}
                    className="text-left p-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-600 rounded-md transition-colors text-sm"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
        
        <div className="text-right">
          <Button type="submit" isLoading={isGeneratingScript} disabled={!topic}>
            대본 생성하기
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Step1Topic;
