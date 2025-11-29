
import React from 'react';
import { useProjectContext } from '../../hooks/useProjectContext';
import { AppStep, Panel, Character } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';

const Step2Script: React.FC = () => {
  const { project, setProject, setStep } = useProjectContext();

  if (!project.script) {
    return <div>스크립트를 불러오는 중... 문제가 발생하면 이전 단계로 돌아가세요.</div>;
  }

  const handleCharacterChange = (index: number, field: keyof Character, value: string) => {
    setProject(p => {
      if (!p.script) return p;
      const updatedCharacters = p.script.characters.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      );
      return { ...p, script: { ...p.script, characters: updatedCharacters } };
    });
  };

  const handlePanelChange = (index: number, field: keyof Panel, value: string) => {
    setProject(p => {
      if (!p.script) return p;
      const updatedPanels = p.script.panels.map((panel, i) =>
        i === index ? { ...panel, [field]: value } : panel
      );
      return { ...p, script: { ...p.script, panels: updatedPanels } };
    });
  };
  
  const handleDialogueChange = (panelIndex: number, dialogueIndex: number, value: string) => {
    setProject(p => {
      if (!p.script) return p;
      const updatedPanels = [...p.script.panels];
      const targetPanel = { ...updatedPanels[panelIndex] };
      const updatedDialogue = [...targetPanel.dialogue];
      updatedDialogue[dialogueIndex] = { ...updatedDialogue[dialogueIndex], text: value };
      targetPanel.dialogue = updatedDialogue;
      updatedPanels[panelIndex] = targetPanel;
      return { ...p, script: { ...p.script, panels: updatedPanels } };
    });
  };


  const goNext = () => setStep(AppStep.CHARACTERS);
  const goBack = () => setStep(AppStep.TOPIC);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">2. 대본 확인 및 수정</h2>
      <p className="text-gray-600 dark:text-gray-400">AI가 생성한 대본입니다. 마음에 들게 수정하고 다음 단계로 넘어가세요.</p>

      <Card className="space-y-4">
        <h3 className="text-xl font-semibold text-purple-400 dark:text-purple-300">등장인물</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {project.script.characters.map((char, index) => (
            <div key={index} className="space-y-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
              <input value={char.name} onChange={e => handleCharacterChange(index, 'name', e.target.value)} className="w-full bg-transparent font-bold text-lg text-gray-900 dark:text-white" />
              <textarea value={char.visual} onChange={e => handleCharacterChange(index, 'visual', e.target.value)} rows={2} className="w-full bg-transparent text-sm text-gray-600 dark:text-gray-300 resize-none" />
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-purple-400 dark:text-purple-300">컷별 내용</h3>
        {project.script.panels.map((panel, pIndex) => (
          <Card key={panel.idx} className="!p-0 overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-800 p-3">
              <h4 className="font-bold">컷 #{panel.idx}</h4>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">장면/배경</label>
                <textarea value={panel.scene} onChange={e => handlePanelChange(pIndex, 'scene', e.target.value)} rows={2} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded-md mt-1 text-sm resize-none"/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">행동</label>
                <textarea value={panel.action} onChange={e => handlePanelChange(pIndex, 'action', e.target.value)} rows={1} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded-md mt-1 text-sm resize-none"/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">대사</label>
                {panel.dialogue.map((d, dIndex) => (
                  <div key={dIndex} className="flex items-center gap-2 mt-1">
                    <span className="font-semibold text-purple-400 dark:text-purple-300 w-16 text-right text-sm">{d.by}:</span>
                    <input value={d.text} onChange={e => handleDialogueChange(pIndex, dIndex, e.target.value)} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded-md text-sm"/>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="secondary" onClick={goBack}>이전</Button>
        <Button onClick={goNext}>캐릭터 생성하기</Button>
      </div>
    </div>
  );
};

export default Step2Script;
