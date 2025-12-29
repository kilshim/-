
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useProjectContext } from '../../hooks/useProjectContext';
import { AppStep, Panel as PanelType, Dialogue, Overlay } from '../../types';
import { generatePanelImage, generateInstagramPost } from '../../services/geminiService';
import { OVERLAY_DESIGNS, GOOGLE_FONTS } from '../../constants';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { SparklesIcon, TrashIcon, MessageSquarePlusIcon, DownloadIcon, BubbleDownloadIcon } from '../Icons';
import SpeechBubble from './SpeechBubble';
import * as htmlToImage from 'html-to-image';

const ASPECT_RATIOS = [
    { id: '1:1', name: '1:1 (정방형)' },
    { id: '4:3', name: '4:3 (가로)' },
    { id: '16:9', name: '16:9 (와이드)' },
    { id: '3:4', name: '3:4 (세로)' },
    { id: '9:16', name: '9:16 (세로 와이드)' },
];

// --- InteractivePanel Component ---
const InteractivePanel: React.FC<{
    panel: PanelType;
    onOverlayUpdate: (overlayId: string, updates: Partial<Overlay>) => void;
    selectedOverlayId: string | null;
    setSelectedOverlayId: (id: string | null) => void;
    isInteractive?: boolean;
    onBoundsChange?: (bounds: DOMRect) => void;
}> = ({ panel, onOverlayUpdate, selectedOverlayId, setSelectedOverlayId, isInteractive = true, onBoundsChange }) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const [bounds, setBounds] = useState<DOMRect>();

    useEffect(() => {
        const el = panelRef.current;
        if (!el) return;

        const resizeObserver = new ResizeObserver(() => {
            const newBounds = el.getBoundingClientRect();
            setBounds(newBounds);
            onBoundsChange?.(newBounds);
        });

        resizeObserver.observe(el);
        
        const initialBounds = el.getBoundingClientRect();
        if (initialBounds.width > 0) {
            setBounds(initialBounds);
            onBoundsChange?.(initialBounds);
        }

        return () => resizeObserver.disconnect();
    }, [onBoundsChange]);

    const aspectRatioStyle = {
        aspectRatio: panel.aspectRatio?.replace(':', ' / ') || '1 / 1',
    };

    const handlePanelClick = (e: React.MouseEvent) => {
        if (!isInteractive) return;
        // 패널 배경이나 이미지 클릭 시에만 선택 해제
        if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG') {
            setSelectedOverlayId(null);
        }
    };

    return (
        <div
            ref={panelRef}
            style={aspectRatioStyle}
            className={`w-full overflow-hidden relative group cursor-default ${
                isInteractive 
                ? 'bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-700' 
                : 'bg-black' // 최종 결과물에서는 배경을 검정으로 하여 풀블리드 느낌 강화
            }`}
            onClick={handlePanelClick}
        >
            {panel.isGenerating && <div className="w-full h-full flex items-center justify-center animate-pulse text-gray-400 dark:text-gray-500">컷 생성중...</div>}
            {panel.imageUrl && !panel.isGenerating && (
                <img src={panel.imageUrl} alt={`Panel ${panel.idx}`} className="w-full h-full object-cover block" />
            )}
             {!panel.imageUrl && !panel.isGenerating && (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">이미지를 생성해주세요.</div>
            )}

            {isInteractive && <div className="absolute top-2 left-2 bg-black/50 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center select-none pointer-events-none">{panel.idx}</div>}
            
            {panel.overlays.map(overlay => (
                <SpeechBubble
                    key={overlay.id}
                    overlay={overlay}
                    panelBounds={bounds}
                    onUpdate={(updates) => onOverlayUpdate(overlay.id, updates)}
                    isSelected={isInteractive && (overlay.id === selectedOverlayId)}
                    onSelect={() => setSelectedOverlayId(overlay.id)}
                    isInteractive={isInteractive}
                />
            ))}
        </div>
    );
};

// Alignment Icons
const AlignLeftIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 14h12v2H3v-2zm0-7h18v2H3v-2z"></path></svg>;
const AlignCenterIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm3 14h12v2H6v-2zm-3-7h18v2H3v-2z"></path></svg>;
const AlignRightIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm9 14h9v2h-9v-2zM3 11h18v2H3v-2z"></path></svg>;


// --- Main Step4Panels Component ---
const Step4Panels: React.FC = () => {
    const { project, setProject, updateProject, setStep } = useProjectContext();
    const [isGeneratingPost, setIsGeneratingPost] = useState(false);
    const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
    const comicContainerRef = useRef<HTMLDivElement>(null);
    const overlayDownloadRef = useRef<HTMLDivElement>(null);
    const [panelForOverlayDownload, setPanelForOverlayDownload] = useState<(PanelType & { bounds?: DOMRect }) | null>(null);
    const [panelBoundsMap, setPanelBoundsMap] = useState<Map<number, DOMRect>>(new Map());

    const handleBoundsChange = useCallback((panelIdx: number, bounds: DOMRect) => {
        setPanelBoundsMap(prev => {
            const currentBounds = prev.get(panelIdx);
            if (currentBounds && currentBounds.width === bounds.width && currentBounds.height === bounds.height) {
                return prev;
            }
            const newMap = new Map(prev);
            newMap.set(panelIdx, bounds);
            return newMap;
        });
    }, []);

    // Auto-generate overlays from dialogues on first load
    useEffect(() => {
        if (!project.script) return;
        
        const overlaysExist = project.script.panels.some(p => p.dialogue.length > 0 && p.overlays.length > 0);
        if (overlaysExist) return;

        setProject(p => {
            if (!p.script) return p;
            let needsUpdate = false;
            const newPanels = p.script.panels.map(panel => {
                if (panel.dialogue.length > 0 && panel.overlays.length === 0) {
                    needsUpdate = true;
                    const newOverlays = panel.dialogue.map((d, i): Overlay => {
                      const x = 15 + (i * 5);
                      const y = 10 + (i * 25);
                      const w = 70;
                      const h = 30;
                      return {
                        id: `overlay-${panel.idx}-${i}-${Date.now()}`,
                        panelId: panel.idx,
                        kind: 'balloon',
                        design: 'standard',
                        x, y, w, h,
                        text: d.text,
                        speaker: d.by,
                        style: { 
                            fontSize: 16, 
                            textAlign: 'center', 
                            fontFamily: GOOGLE_FONTS[0].family,
                            strokeWidth: 2.5,
                            lineHeight: 1.4,
                            borderRadius: 12,
                        },
                        tail: {
                            x: x + (w / 2),
                            y: y + h + 15,
                            offset: 0,
                        }
                      }
                    });
                    return { ...panel, overlays: newOverlays };
                }
                return panel;
            });

            if (needsUpdate) {
                return { ...p, script: { ...p.script, panels: newPanels }};
            }
            return p;
        });
    }, [project.script, setProject]);

    const handlePanelUpdate = useCallback((idx: number, updates: Partial<PanelType>) => {
        setProject(p => {
            if (!p.script) return p;
            const updatedPanels = p.script.panels.map(panel => panel.idx === idx ? { ...panel, ...updates } : panel);
            return { ...p, script: { ...p.script, panels: updatedPanels }};
        });
    }, [setProject]);

    const handleOverlayUpdate = (panelIdx: number, overlayId: string, updates: Partial<Overlay>) => {
        setProject(p => {
            if (!p.script) return p;
            const newPanels = p.script.panels.map(panel => {
                if (panel.idx === panelIdx) {
                    const newOverlays = panel.overlays.map(o => o.id === overlayId ? { ...o, ...updates } : o);
                    return { ...panel, overlays: newOverlays };
                }
                return panel;
            });
            return { ...p, script: { ...p.script, panels: newPanels } };
        });
    };
    
    const handlePanelChange = useCallback((idx: number, field: keyof PanelType, value: any) => {
        setProject(p => {
            if (!p.script) return p;
            const updatedPanels = p.script.panels.map(panel => {
                if (panel.idx === idx) {
                    return { ...panel, [field]: value };
                }
                return panel;
            });
            return { ...p, script: { ...p.script, panels: updatedPanels }};
        });
    }, [setProject]);

    const handleDialogueChange = useCallback((panelIdx: number, dialogueIndex: number, value: string) => {
      setProject(p => {
        if (!p.script) return p;
        const newPanels = p.script.panels.map(panel => {
            if (panel.idx === panelIdx) {
                const newDialogues = [...panel.dialogue];
                newDialogues[dialogueIndex] = { ...newDialogues[dialogueIndex], text: value };

                const newOverlays = [...panel.overlays];
                if (newOverlays[dialogueIndex]) {
                    newOverlays[dialogueIndex] = { ...newOverlays[dialogueIndex], text: value };
                }
                return { ...panel, dialogue: newDialogues, overlays: newOverlays };
            }
            return panel;
        });
        return { ...p, script: { ...p.script, panels: newPanels }};
      });
    }, [setProject]);

    const generateImageForPanel = useCallback(async (panel: PanelType) => {
        if (!project.script) return;
        handlePanelUpdate(panel.idx, { isGenerating: true });

        const characterReferences = project.script.characters
            .filter(c => c.referenceImageUrl)
            .map(c => ({
                name: c.name,
                image: c.referenceImageUrl!,
                visual: c.visual,
            }));

        try {
            const imageUrl = await generatePanelImage(panel, characterReferences, project.style);
            handlePanelUpdate(panel.idx, { imageUrl, isGenerating: false });
        } catch (error) {
            console.error(`Failed to generate image for panel ${panel.idx}:`, error);
            handlePanelUpdate(panel.idx, { isGenerating: false });
        }
    }, [project.script, project.style, handlePanelUpdate]);

    const handleAddOverlay = (panelIdx: number) => {
        setProject(p => {
            if (!p.script) return p;
            const newPanels = p.script.panels.map(panel => {
                if (panel.idx === panelIdx) {
                    const newOverlay: Overlay = {
                        id: `overlay-${panel.idx}-${Date.now()}`,
                        panelId: panel.idx,
                        kind: 'balloon',
                        design: 'standard',
                        x: 20, y: 20, w: 60, h: 30,
                        text: '새로운 대사',
                        speaker: p.script?.characters[0]?.name || '',
                        style: {
                            fontSize: 16,
                            textAlign: 'center',
                            fontFamily: GOOGLE_FONTS[0].family,
                            strokeWidth: 2.5,
                            lineHeight: 1.4,
                            borderRadius: 12,
                        },
                        tail: { x: 50, y: 65, offset: 0 },
                    };
                    const newOverlays = [...panel.overlays, newOverlay];
                    return { ...panel, overlays: newOverlays };
                }
                return panel;
            });
            return { ...p, script: { ...p.script, panels: newPanels } };
        });
    };

    const handleDeleteOverlay = () => {
        if (!selectedOverlayId) return;
        setProject(p => {
            if (!p.script) return p;
            const newPanels = p.script.panels.map(panel => {
                const newOverlays = panel.overlays.filter(o => o.id !== selectedOverlayId);
                return { ...panel, overlays: newOverlays };
            });
            return { ...p, script: { ...p.script, panels: newPanels } };
        });
        setSelectedOverlayId(null);
    };

    const handleGeneratePost = async () => {
        if (!project.script?.tone) return;
        setIsGeneratingPost(true);
        const post = await generateInstagramPost(project.title, project.script.tone);
        updateProject({ instagramPost: post });
        setIsGeneratingPost(false);
    };
    
    const handleDownload = useCallback(() => {
        if (comicContainerRef.current === null) {
          return;
        }
        
        const isDarkMode = document.documentElement.classList.contains('dark');

        htmlToImage.toPng(comicContainerRef.current, { 
            cacheBust: true, 
            pixelRatio: 2,
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        })
          .then((dataUrl) => {
            const link = document.createElement('a');
            link.download = `${project.title || 'comic'}.png`;
            link.href = dataUrl;
            link.click();
          })
          .catch((err) => {
            console.error('Oops, something went wrong!', err);
            alert('이미지 다운로드에 실패했습니다.');
          });
    }, [project.title]);

    const handleDownloadOverlays = useCallback((panelIdx: number) => {
        const panel = project.script?.panels.find(p => p.idx === panelIdx);
        if (panel) {
            const bounds = panelBoundsMap.get(panelIdx);
            if (!bounds || bounds.width === 0) {
                alert("Panel dimensions not ready, please wait a moment and try again.");
                return;
            }
            setPanelForOverlayDownload({ ...panel, bounds });
        }
    }, [project.script, panelBoundsMap]);

    useEffect(() => {
        if (panelForOverlayDownload && overlayDownloadRef.current) {
            const node = overlayDownloadRef.current;
            htmlToImage.toPng(node, { 
                cacheBust: true, 
                pixelRatio: 2,
                backgroundColor: 'transparent',
            })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `${project.title || 'comic'}-panel-${panelForOverlayDownload.idx}-overlays.png`;
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.error('Failed to download overlays:', err);
                alert('말풍선 이미지 다운로드에 실패했습니다.');
            })
            .finally(() => {
                setPanelForOverlayDownload(null);
            });
        }
    }, [panelForOverlayDownload, project.title]);

    const goBack = () => setStep(AppStep.CHARACTERS);
    
    const selectedOverlay = project.script?.panels
        .flatMap(p => p.overlays)
        .find(o => o.id === selectedOverlayId);

    const handleOverlayStyleChange = (property: keyof Overlay['style'], value: any) => {
        if (!selectedOverlay) return;
        const panel = project.script?.panels.find(p => p.idx === selectedOverlay.panelId);
        if (panel) {
            const newStyle = { ...selectedOverlay.style, [property]: value };
            handleOverlayUpdate(panel.idx, selectedOverlay.id, { style: newStyle });
        }
    };
    
    const handleDesignChange = (newDesign: Overlay['design']) => {
        if (!selectedOverlay) return;
        const panel = project.script?.panels.find(p => p.idx === selectedOverlay.panelId);
        if (panel) {
            handleOverlayUpdate(panel.idx, selectedOverlay.id, { design: newDesign });
        }
    };
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">4. 만화 생성 및 편집</h2>
            <p className="text-gray-600 dark:text-gray-400">각 컷의 내용을 수정하고 이미지를 생성하세요. 생성된 이미지 위에 말풍선을 추가하고 편집할 수 있습니다.</p>
            
            {selectedOverlay && (
                <div className="sticky top-[76px] z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <h4 className="text-sm font-bold text-purple-400 dark:text-purple-300">말풍선 편집</h4>
                        <div className="border-l border-gray-300 dark:border-gray-600 h-6"></div>
                        <div className="flex items-center gap-x-2">
                          <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">디자인:</label>
                          <div className="flex items-center gap-x-1 bg-gray-200 dark:bg-gray-900 p-1 rounded-md">
                            {OVERLAY_DESIGNS.map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => handleDesignChange(style.id as Overlay['design'])}
                                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                                        selectedOverlay.design === style.id
                                            ? 'bg-purple-600 text-white shadow'
                                            : 'bg-transparent hover:bg-white/60 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    {style.name}
                                </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-x-2">
                            <label htmlFor="border-radius" className="text-sm font-semibold text-gray-800 dark:text-gray-200">곡률:</label>
                            <input
                                type="range"
                                id="border-radius"
                                min="0"
                                max="40"
                                value={selectedOverlay.style.borderRadius ?? 12}
                                onChange={(e) => handleOverlayStyleChange('borderRadius', parseInt(e.target.value, 10))}
                                className="w-24 accent-purple-600"
                            />
                        </div>
                        <div className="border-l border-gray-300 dark:border-gray-600 h-6"></div>
                         <div className="flex items-center gap-x-2">
                            <label htmlFor="font-family" className="text-sm font-semibold text-gray-800 dark:text-gray-200">폰트:</label>
                            <select
                                id="font-family"
                                value={selectedOverlay.style.fontFamily}
                                onChange={(e) => handleOverlayStyleChange('fontFamily', e.target.value)}
                                className="bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-xs py-1"
                            >
                                {GOOGLE_FONTS.map(font => <option key={font.name} value={font.family}>{font.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-x-2">
                            <label htmlFor="font-size" className="text-sm font-semibold text-gray-800 dark:text-gray-200">크기:</label>
                            <input
                                type="number"
                                id="font-size"
                                value={selectedOverlay.style.fontSize}
                                onChange={(e) => handleOverlayStyleChange('fontSize', parseInt(e.target.value, 10) || 16)}
                                className="w-16 bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-xs py-1"
                            />
                        </div>
                        <div className="flex items-center gap-x-1">
                            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 mr-1">정렬:</label>
                             <div className="flex items-center bg-gray-200 dark:bg-gray-900 p-1 rounded-md">
                                {(['left', 'center', 'right'] as const).map(align => {
                                    const Icon = align === 'left' ? AlignLeftIcon : align === 'center' ? AlignCenterIcon : AlignRightIcon;
                                    return (
                                        <button
                                            key={align}
                                            onClick={() => handleOverlayStyleChange('textAlign', align)}
                                            className={`p-1.5 rounded-md transition-colors ${
                                                selectedOverlay.style.textAlign === align
                                                    ? 'bg-purple-600 text-white shadow'
                                                    : 'bg-transparent hover:bg-white/60 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-300'
                                            }`}
                                            aria-label={`Align ${align}`}
                                        >
                                            <Icon />
                                        </button>
                                    )
                                })}
                             </div>
                        </div>
                        <div className="flex items-center gap-x-2">
                            <label htmlFor="line-height" className="text-sm font-semibold text-gray-800 dark:text-gray-200">행간:</label>
                            <input
                                type="number"
                                id="line-height"
                                value={selectedOverlay.style.lineHeight || 1.4}
                                onChange={(e) => handleOverlayStyleChange('lineHeight', parseFloat(e.target.value) || 1.4)}
                                className="w-16 bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-xs py-1"
                                step="0.1"
                                min="0.5"
                            />
                        </div>
                        <div className="flex items-center gap-x-2">
                            <label htmlFor="stroke-width" className="text-sm font-semibold text-gray-800 dark:text-gray-200">선 굵기:</label>
                            <input
                                type="number"
                                id="stroke-width"
                                value={selectedOverlay.style.strokeWidth || 2.5}
                                onChange={(e) => handleOverlayStyleChange('strokeWidth', parseFloat(e.target.value) || 0)}
                                className="w-16 bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-xs py-1"
                                step="0.1"
                                min="0"
                            />
                        </div>
                        <div className="border-l border-gray-300 dark:border-gray-600 h-6"></div>
                        <Button variant="ghost" size="sm" onClick={handleDeleteOverlay} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50" icon={<TrashIcon className="w-4 h-4" />}>
                            삭제
                        </Button>
                    </div>
                </div>
            )}
            
            <div className="space-y-8">
                {project.script?.panels.sort((a,b) => a.idx - b.idx).map(panel => (
                     <Card key={panel.idx} className="!p-6">
                        <div className="grid md:grid-cols-2 gap-8 items-start">
                            <div className="space-y-4">
                                <h4 className="font-bold text-lg text-purple-400 dark:text-purple-300">컷 #{panel.idx}</h4>
                                
                                <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">장면/배경</label>
                                    <textarea value={panel.scene} onChange={e => handlePanelChange(panel.idx, 'scene', e.target.value)} rows={3} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded-md mt-1 text-sm resize-none"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">행동</label>
                                    <textarea value={panel.action} onChange={e => handlePanelChange(panel.idx, 'action', e.target.value)} rows={2} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded-md mt-1 text-sm resize-none"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">대사</label>
                                    {panel.dialogue.map((d, dIndex) => (
                                    <div key={dIndex} className="flex items-center gap-2 mt-1">
                                        <span className="font-semibold text-purple-400 dark:text-purple-300 w-16 text-right text-sm">{d.by}:</span>
                                        <input value={d.text} onChange={e => handleDialogueChange(panel.idx, dIndex, e.target.value)} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded-md text-sm"/>
                                    </div>
                                    ))}
                                </div>
                                <div>
                                    <label htmlFor={`aspect-ratio-${panel.idx}`} className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">이미지 비율</label>
                                     <select
                                        id={`aspect-ratio-${panel.idx}`}
                                        value={panel.aspectRatio}
                                        onChange={(e) => handlePanelChange(panel.idx, 'aspectRatio', e.target.value as PanelType['aspectRatio'])}
                                        className="w-full bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                    >
                                      {ASPECT_RATIOS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button onClick={() => generateImageForPanel(panel)} isLoading={panel.isGenerating} className="flex-grow">
                                        {panel.imageUrl ? '이미지 다시 생성' : '이미지 생성'}
                                    </Button>
                                    <Button onClick={() => handleAddOverlay(panel.idx)} variant="secondary" size="icon" title="말풍선 추가">
                                        <MessageSquarePlusIcon className="w-5 h-5" />
                                    </Button>
                                    <Button onClick={() => handleDownloadOverlays(panel.idx)} variant="secondary" size="icon" title="말풍선 다운로드">
                                        <BubbleDownloadIcon className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                            
                            <div>
                                <InteractivePanel
                                    panel={panel}
                                    selectedOverlayId={selectedOverlayId}
                                    setSelectedOverlayId={setSelectedOverlayId}
                                    onOverlayUpdate={(overlayId, updates) => handleOverlayUpdate(panel.idx, overlayId, updates)}
                                    onBoundsChange={(bounds) => handleBoundsChange(panel.idx, bounds)}
                                />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="space-y-4 mt-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-purple-400 dark:text-purple-300">인스타그램 포스트</h3>
                    <Button variant="ghost" onClick={handleGeneratePost} isLoading={isGeneratingPost} icon={<SparklesIcon className="w-4 h-4"/>}>
                        AI로 생성
                    </Button>
                </div>
                {project.instagramPost && (
                    <div className="space-y-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                        <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">캡션</label>
                            <textarea
                                readOnly
                                value={project.instagramPost.caption}
                                rows={4}
                                className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded-md mt-1 text-sm resize-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">해시태그</label>
                            <textarea
                                readOnly
                                value={project.instagramPost.hashtags}
                                rows={2}
                                className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded-md mt-1 text-sm resize-none"
                            />
                        </div>
                    </div>
                )}
            </Card>
            
            <Card className="space-y-4 mt-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-purple-400 dark:text-purple-300">최종 만화</h3>
                    <Button onClick={handleDownload} icon={<DownloadIcon className="w-4 h-4" />}>
                        이미지로 다운로드
                    </Button>
                </div>
                <div ref={comicContainerRef} className="bg-black">
                    <div className={project.format === '4-cut' ? "grid grid-cols-2 gap-0" : "flex flex-col gap-0"}>
                        {project.script?.panels.sort((a,b) => a.idx - b.idx).map(panel => (
                             <InteractivePanel
                                key={`final-${panel.idx}`}
                                panel={panel}
                                onOverlayUpdate={() => {}}
                                selectedOverlayId={null}
                                setSelectedOverlayId={() => {}}
                                isInteractive={false}
                            />
                        ))}
                    </div>
                </div>
            </Card>

            <div className="flex justify-between mt-8">
                <Button variant="secondary" onClick={goBack}>이전</Button>
            </div>

            {panelForOverlayDownload && panelForOverlayDownload.bounds && (
                <div className="absolute -left-[9999px] top-0 p-4">
                    <div 
                        ref={overlayDownloadRef}
                        style={{
                            width: `${panelForOverlayDownload.bounds.width}px`,
                            height: `${panelForOverlayDownload.bounds.height}px`,
                        }}
                        className="relative bg-transparent"
                    >
                        {panelForOverlayDownload.overlays.map(overlay => (
                            <SpeechBubble
                                key={`download-${overlay.id}`}
                                overlay={overlay}
                                panelBounds={undefined}
                                onUpdate={() => {}}
                                isSelected={false}
                                onSelect={() => {}}
                                isInteractive={false}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Step4Panels;
