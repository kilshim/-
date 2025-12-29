
import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Overlay } from '../../types';

interface SpeechBubbleProps {
    overlay: Overlay;
    panelBounds: DOMRect | undefined;
    onUpdate: (updates: Partial<Overlay>) => void;
    isSelected: boolean;
    onSelect: () => void;
    isInteractive?: boolean;
}

type DragHandleType = 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'tail' | 'tail-base';
const RESIZE_HANDLES: ('nw' | 'ne' | 'sw' | 'se')[] = ['nw', 'ne', 'sw', 'se'];
const MIN_WIDTH_PERCENT = 10;
const MIN_HEIGHT_PERCENT = 5;
const TAIL_WIDTH = 18;
const SVG_PADDING = 100; 

const getBubblePath = (overlay: Overlay, tailLocal: {x: number, y: number, offset: number} | null) => {
    const { design, w, h, style } = overlay;
    
    switch (design) {
        case 'spiky':
            return "M 50,5 L 55,20 L 70,15 L 65,30 L 85,30 L 80,45 L 95,50 L 80,55 L 85,70 L 65,70 L 70,85 L 55,80 L 50,95 L 45,80 L 30,85 L 35,70 L 15,70 L 20,55 L 5,50 L 20,45 L 15,30 L 35,30 L 30,15 L 45,20 Z";
        case 'cloud':
        case 'rectangle':
        case 'standard':
        case 'rounded': {
            const isCloud = design === 'cloud';
            const bodyRect = { x: 5, y: 5, w: 90, h: 80 };
            
            let rx: number, ry: number;
            const aspectRatio = (w && h) ? w / h : 1;

            if (design === 'rounded') {
                const baseRadius = style.borderRadius ?? 12;
                // 비율에 따른 왜곡을 방지하기 위해 가로/세로 곡률을 각각 계산
                // 100x100 가상 공간에서의 곡률 반지름을 역산하여 미학적 밸런스 유지
                rx = baseRadius * (1 / (aspectRatio > 1 ? aspectRatio : 1)) * 1.2;
                ry = baseRadius * (aspectRatio > 1 ? 1 : aspectRatio) * 1.2;
                
                rx = Math.min(rx, bodyRect.w / 2.1);
                ry = Math.min(ry, bodyRect.h / 2.1);
            } else if (design === 'standard') {
                rx = 18;
                ry = 18;
            } else {
                rx = 0;
                ry = 0;
            }

            const staticCloudPath = "M 25,65 A 20,20 0 0 1 15,40 A 15,15 0 0 1 30,15 A 15,15 0 0 1 55,10 A 25,25 0 0 1 85,30 A 20,20 0 0 1 80,70 A 15,15 0 0 1 60,85 A 20,20 0 0 1 35,85 A 15,15 0 0 1 25,65 Z";
            const rectBodyPath = `M ${bodyRect.x + rx},${bodyRect.y} H ${bodyRect.x + bodyRect.w - rx} A ${rx},${ry} 0 0 1 ${bodyRect.x + bodyRect.w},${bodyRect.y + ry} V ${bodyRect.y + bodyRect.h - ry} A ${rx},${ry} 0 0 1 ${bodyRect.x + bodyRect.w - rx},${bodyRect.y + bodyRect.h} H ${bodyRect.x + rx} A ${rx},${ry} 0 0 1 ${bodyRect.x},${bodyRect.y + bodyRect.h - ry} V ${bodyRect.y + ry} A ${rx},${ry} 0 0 1 ${bodyRect.x + rx},${bodyRect.y} Z`;

            if (!tailLocal) return isCloud ? staticCloudPath : rectBodyPath;

            const { x: tx, y: ty, offset } = tailLocal;
            const cx = 50;
            const cy = 45; 
            const angle = Math.atan2(ty - cy, tx - cx) * 180 / Math.PI;

            if (isCloud) {
                const cloudParts = {
                    start: "M 25,65",
                    left: " A 20,20 0 0 1 15,40",
                    topLeft: " A 15,15 0 0 1 30,15",
                    top: " A 15,15 0 0 1 55,10",
                    topRight: " A 25,25 0 0 1 85,30",
                    right: " A 20,20 0 0 1 80,70",
                    bottomRight: " A 15,15 0 0 1 60,85",
                    bottom: " A 20,20 0 0 1 35,85",
                    bottomLeft: " A 15,15 0 0 1 25,65",
                };
                let path = cloudParts.start;
                if (angle >= 135 || angle < -135) {
                    const y_center = cy + (ty-cy)*0.3 + offset;
                    const y1 = Math.max(40 + TAIL_WIDTH, Math.min(65, y_center + TAIL_WIDTH/2));
                    const y2 = y1 - TAIL_WIDTH;
                    path += ` L 16,${y1} L ${tx},${ty} L 16,${y2}` + cloudParts.left;
                } else path += cloudParts.left;
                path += cloudParts.topLeft;
                if (angle >= -135 && angle < -45) {
                    const x_center = cx + (tx-cx)*0.3 + offset;
                    const x1 = Math.max(30, Math.min(55 - TAIL_WIDTH, x_center - TAIL_WIDTH/2));
                    const x2 = x1 + TAIL_WIDTH;
                    path += ` L ${x1},12 L ${tx},${ty} L ${x2},12` + cloudParts.top;
                } else path += cloudParts.top;
                path += cloudParts.topRight;
                if (angle >= -45 && angle < 45) {
                    const y_center = cy + (ty-cy)*0.3 + offset;
                    const y1 = Math.max(30, Math.min(70 - TAIL_WIDTH, y_center - TAIL_WIDTH/2));
                    const y2 = y1 + TAIL_WIDTH;
                    path += ` L 84,${y1} L ${tx},${ty} L 84,${y2}` + cloudParts.right;
                } else path += cloudParts.right;
                path += cloudParts.bottomRight;
                if (angle >= 45 && angle < 135) {
                    const x_center = cx + (tx-cx)*0.3 + offset;
                    const x1 = Math.max(35, Math.min(60 - TAIL_WIDTH, x_center - TAIL_WIDTH/2));
                    const x2 = x1 + TAIL_WIDTH;
                    path += ` L ${x2},85 L ${tx},${ty} L ${x1},85` + cloudParts.bottom;
                } else path += cloudParts.bottom;
                path += cloudParts.bottomLeft;
                return path + " Z";
            } else {
                let path = `M ${bodyRect.x + rx},${bodyRect.y} H ${bodyRect.x + bodyRect.w - rx} A ${rx},${ry} 0 0 1 ${bodyRect.x + bodyRect.w},${bodyRect.y + ry}`;
                if (angle >= -45 && angle < 45) {
                    const y_center = cy + (ty-cy)*0.3 + offset;
                    const y1 = Math.max(bodyRect.y + ry, Math.min(bodyRect.y + bodyRect.h - TAIL_WIDTH, y_center - TAIL_WIDTH/2));
                    const y2 = y1 + TAIL_WIDTH;
                    path += ` V ${y1} L ${tx},${ty} L ${bodyRect.x + bodyRect.w},${y2} V ${bodyRect.y + bodyRect.h - ry}`;
                } else path += ` V ${bodyRect.y + bodyRect.h - ry}`;
                path += ` A ${rx},${ry} 0 0 1 ${bodyRect.x + bodyRect.w - rx},${bodyRect.y + bodyRect.h}`;
                if (angle >= 45 && angle < 135) {
                    const x_center = cx + (tx-cx)*0.3 + offset;
                    const x1 = Math.max(bodyRect.x + rx, Math.min(bodyRect.x + bodyRect.w - TAIL_WIDTH, x_center - TAIL_WIDTH/2));
                    const x2 = x1 + TAIL_WIDTH;
                    path += ` H ${x2} L ${tx},${ty} L ${x1},${bodyRect.y + bodyRect.h} H ${bodyRect.x + rx}`;
                } else path += ` H ${bodyRect.x + rx}`;
                path += ` A ${rx},${ry} 0 0 1 ${bodyRect.x},${bodyRect.y + bodyRect.h - ry}`;
                if (angle >= 135 || angle < -135) {
                     const y_center = cy + (ty-cy)*0.3 + offset;
                     const y1 = Math.max(bodyRect.y + ry, Math.min(bodyRect.y + bodyRect.h - TAIL_WIDTH, y_center - TAIL_WIDTH/2));
                     const y2 = y1 + TAIL_WIDTH;
                     path += ` V ${y2} L ${tx},${ty} L ${bodyRect.x},${y1} V ${bodyRect.y + ry}`;
                } else path += ` V ${bodyRect.y + ry}`;
                path += ` A ${rx},${ry} 0 0 1 ${bodyRect.x + rx},${bodyRect.y}`;
                if (angle >= -135 && angle < -45) {
                     const x_center = cx + (tx-cx)*0.3 + offset;
                     const x1 = Math.max(bodyRect.x + rx, Math.min(bodyRect.x + bodyRect.w - TAIL_WIDTH, x_center - TAIL_WIDTH/2));
                     const x2 = x1 + TAIL_WIDTH;
                     path += ` H ${x1} L ${tx},${ty} L ${x2},${bodyRect.y} Z`;
                } else path += ` Z`;
                return path;
            }
        }
        default: return "";
    }
}

const SpeechBubble: React.FC<SpeechBubbleProps> = ({ overlay, panelBounds, onUpdate, isSelected, onSelect, isInteractive = true }) => {
    const [isEditingText, setIsEditingText] = useState(false);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const dragHandleRef = useRef<{ type: DragHandleType; startX: number; startY: number; startW: number; startH: number; startLeft: number; startTop: number; startTail: {x:number, y:number, offset: number} | null } | null>(null);

    useEffect(() => {
        if (!isSelected) setIsEditingText(false);
    }, [isSelected]);

    useEffect(() => {
        if (isEditingText && textRef.current) {
            textRef.current.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(textRef.current);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
    }, [isEditingText]);

    const handleTextUpdateAndBlur = () => {
        if (!isInteractive) return;
        if (textRef.current && textRef.current.innerText !== overlay.text) {
            onUpdate({ text: textRef.current.innerText });
        }
        setIsEditingText(false);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: DragHandleType) => {
        if (!isInteractive || isEditingText) return;
        e.preventDefault();
        e.stopPropagation();
        onSelect();

        if (!panelBounds || !bubbleRef.current) return;
        const bubbleRect = bubbleRef.current.getBoundingClientRect();

        dragHandleRef.current = {
            type,
            startX: e.clientX,
            startY: e.clientY,
            startLeft: (bubbleRect.left - panelBounds.left) / panelBounds.width * 100,
            startTop: (bubbleRect.top - panelBounds.top) / panelBounds.height * 100,
            startW: bubbleRect.width / panelBounds.width * 100,
            startH: bubbleRect.height / panelBounds.height * 100,
            startTail: overlay.tail
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!dragHandleRef.current || !panelBounds) return;

        const dxPercent = (e.clientX - dragHandleRef.current.startX) / panelBounds.width * 100;
        const dyPercent = (e.clientY - dragHandleRef.current.startY) / panelBounds.height * 100;

        const { type, startLeft, startTop, startW, startH, startTail } = dragHandleRef.current;
        
        if (type === 'move') {
            let newX = startLeft + dxPercent;
            let newY = startTop + dyPercent;
            newX = Math.max(0, Math.min(100 - startW, newX));
            newY = Math.max(0, Math.min(100 - startH, newY));
            onUpdate({ x: newX, y: newY });
            return;
        }

        if (type === 'tail' && startTail) {
            onUpdate({ tail: { 
                ...startTail,
                x: Math.max(0, Math.min(100, startTail.x + dxPercent)),
                y: Math.max(0, Math.min(100, startTail.y + dyPercent)),
            }});
            return;
        }

        if (type === 'tail-base' && startTail) {
            const cx = 50;
            const cy = 45;
            const localX = (startTail.x - startLeft) / startW * 100;
            const localY = (startTail.y - startTop) / startH * 100;
            const angle = Math.atan2(localY - cy, localX - cx) * 180 / Math.PI;

            let newOffset = startTail.offset;
            if ((angle >= -45 && angle < 45) || (angle >= 135 || angle < -135)) newOffset += dyPercent * 0.5;
            else newOffset += dxPercent * 0.5;
            newOffset = Math.max(-35, Math.min(35, newOffset));
            onUpdate({ tail: { ...startTail, offset: newOffset }});
            return;
        }

        if (type.startsWith('resize-')) {
            let newX = startLeft, newY = startTop, newW = startW, newH = startH;
            if (type.includes('w')) { newW -= dxPercent; newX += dxPercent; }
            if (type.includes('e')) { newW += dxPercent; }
            if (type.includes('n')) { newH -= dyPercent; newY += dyPercent; }
            if (type.includes('s')) { newH += dyPercent; }
            
            if (newW < MIN_WIDTH_PERCENT) {
                if (type.includes('w')) newX = newX + newW - MIN_WIDTH_PERCENT;
                newW = MIN_WIDTH_PERCENT;
            }
            if (newH < MIN_HEIGHT_PERCENT) {
                if (type.includes('n')) newY = newY + newH - MIN_HEIGHT_PERCENT;
                newH = MIN_HEIGHT_PERCENT;
            }
            
            newX = Math.max(0, Math.min(100 - newW, newX));
            newY = Math.max(0, Math.min(100 - newH, newY));
            onUpdate({ x: newX, y: newY, w: newW, h: newH });
            return;
        }
    };
    
    const handleMouseUp = () => {
        dragHandleRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    const handleTextDoubleClick = (e: React.MouseEvent) => {
        if (!isInteractive || isEditingText) return;
        e.stopPropagation();
        onSelect();
        setIsEditingText(true);
    };

    useEffect(() => {
        if (textRef.current && overlay.text !== textRef.current.innerText) {
            textRef.current.innerText = overlay.text;
        }
    }, [overlay.text]);
    
    const localTailCoords = useMemo(() => {
        if (!overlay.tail) return null;
        const localX = (overlay.tail.x - overlay.x) / overlay.w * 100;
        const localY = (overlay.tail.y - overlay.y) / overlay.h * 100;
        return { x: localX, y: localY, offset: overlay.tail.offset };
    }, [overlay.tail, overlay.x, overlay.y, overlay.w, overlay.h]);

    const tailEdgeInfo = useMemo(() => {
        if (!overlay.tail || !localTailCoords) return null;
        const { x: tx, y: ty, offset } = localTailCoords;
        const cx = 50, cy = 45;
        const angle = Math.atan2(ty - cy, tx - cx) * 180 / Math.PI;
        const bodyRect = { x: 5, y: 5, w: 90, h: 80 };

        if (angle >= -45 && angle < 45) return { x: bodyRect.x + bodyRect.w, y: cy + (ty-cy)*0.3 + offset };
        else if (angle >= 45 && angle < 135) return { x: cx + (tx-cx)*0.3 + offset, y: bodyRect.y + bodyRect.h };
        else if (angle >= 135 || angle < -135) return { x: bodyRect.x, y: cy + (ty-cy)*0.3 + offset };
        else return { x: cx + (tx-cx)*0.3 + offset, y: bodyRect.y };
    }, [localTailCoords, overlay.tail]);

    const renderBubble = () => {
        const commonTextClass = "relative w-full h-full break-words px-6 py-4 focus:outline-none flex items-center";
        const textStyle: React.CSSProperties = {
            fontFamily: overlay.style.fontFamily,
            fontSize: `${overlay.style.fontSize}px`,
            textAlign: overlay.style.textAlign,
            lineHeight: overlay.style.lineHeight || 1.3,
            whiteSpace: 'pre-wrap',
            cursor: isInteractive ? (isEditingText ? 'text' : (isSelected ? 'move' : 'pointer')) : 'default',
        };
        const path = getBubblePath(overlay, localTailCoords);

        const textDivProps = {
            ref: textRef,
            contentEditable: isInteractive && isEditingText,
            suppressContentEditableWarning: true,
            onBlur: handleTextUpdateAndBlur,
            onClick: (e: React.MouseEvent) => e.stopPropagation(),
            onDoubleClick: handleTextDoubleClick,
            onMouseDown: (e: React.MouseEvent) => isEditingText && e.stopPropagation(),
        };

        if (path) {
             return (
                <>
                    <svg
                        viewBox={`-${SVG_PADDING} -${SVG_PADDING} ${100 + 2 * SVG_PADDING} ${100 + 2 * SVG_PADDING}`}
                        preserveAspectRatio="none"
                        className="absolute drop-shadow-md pointer-events-none"
                        style={{
                            width: `${100 + 2 * SVG_PADDING}%`,
                            height: `${100 + 2 * SVG_PADDING}%`,
                            left: `-${SVG_PADDING}%`,
                            top: `-${SVG_PADDING}%`,
                        }}
                    >
                        <path
                            d={path}
                            strokeWidth={overlay.style.strokeWidth ?? 2.5}
                            vectorEffect="non-scaling-stroke"
                            style={{ fill: 'white', stroke: 'black' }}
                        />
                    </svg>
                    <div {...textDivProps} className={`${commonTextClass} justify-center font-semibold`} style={{...textStyle, color: 'black'}}>
                        {overlay.text}
                    </div>
                </>
             );
        }

        switch (overlay.design) {
            case 'cinematic':
                return (
                    // FIX: Changed 'white' variable to 'white' string literal to fix 'Cannot find name white' error.
                    <div {...textDivProps} className={`${commonTextClass} justify-center font-extrabold uppercase tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]`} style={{ ...textStyle, color: 'white', WebkitTextStroke: '1.5px black', paintOrder: 'stroke fill' }}>{overlay.text}</div>
                );
            case 'simple':
                 return (
                    <div className="w-full h-full rounded-md p-1" style={{ backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.2)' }}>
                        <div {...textDivProps} className={`${commonTextClass} justify-center font-semibold`} style={{...textStyle, color: 'black'}}>{overlay.text}</div>
                    </div>
                 );
            case 'narration':
                return (
                    <div className="w-full h-full flex flex-col rounded-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid black' }}>
                         <div className="flex-shrink-0" style={{ backgroundColor: 'black', height: '0.25rem' }}></div>
                         <div className="flex-grow p-2">
                            <div {...textDivProps} className={`${commonTextClass} !p-0 font-medium`} style={{...textStyle, color: 'black'}}>{overlay.text}</div>
                        </div>
                    </div>
                );
            case 'webtoon':
                 return (
                    <>
                        <div className="absolute top-0 left-0 w-full h-full rounded-md" style={{ backgroundColor: 'white', border: `${overlay.style.strokeWidth ?? 2.5}px solid black`, boxShadow: '3px 3px 0px rgba(0,0,0,1)' }} />
                        <div {...textDivProps} className={`${commonTextClass} justify-center font-bold`} style={{...textStyle, color: 'black'}}>{overlay.text}</div>
                    </>
                 );
            default: return null;
        }
    };
    
    return (
        <div
            ref={bubbleRef}
            className="absolute select-none"
            style={{
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                width: `${overlay.w}%`,
                height: `${overlay.h}%`,
                zIndex: isSelected ? 20 : 10,
            }}
            onMouseDown={isInteractive ? (e) => handleMouseDown(e, 'move') : undefined}
            onClick={(e) => e.stopPropagation()} 
        >
            <div className={`relative w-full h-full transition-shadow duration-200 ${isInteractive && isSelected ? 'outline-dashed outline-1 outline-purple-400 ring-4 ring-purple-500/10' : ''}`}>
                 {renderBubble()}
                {isInteractive && isSelected && !isEditingText && RESIZE_HANDLES.map(handle => (
                     <div
                        key={handle}
                        className="absolute w-3.5 h-3.5 bg-purple-600 border-2 border-white rounded-full shadow-md hover:scale-125 transition-transform"
                        style={{
                            top: handle.startsWith('n') ? '-7px' : undefined,
                            bottom: handle.startsWith('s') ? '-7px' : undefined,
                            left: handle.endsWith('w') ? '-7px' : undefined,
                            right: handle.endsWith('e') ? '-7px' : undefined,
                            cursor: `${handle}-resize`,
                        }}
                        onMouseDown={(e) => handleMouseDown(e, `resize-${handle}`)}
                    />
                ))}
                {isInteractive && isSelected && !isEditingText && overlay.tail && localTailCoords && (
                    <div
                        className="absolute w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-md -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform"
                        style={{ left: `${localTailCoords.x}%`, top: `${localTailCoords.y}%`, cursor: 'crosshair', zIndex: 1 }}
                        onMouseDown={(e) => handleMouseDown(e, 'tail')}
                    />
                )}
                 {isInteractive && isSelected && !isEditingText && overlay.tail && tailEdgeInfo && (
                    <div
                        className="absolute w-3.5 h-3.5 bg-sky-500 border-2 border-white rounded-full shadow-md -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform"
                        style={{ left: `${tailEdgeInfo.x}%`, top: `${tailEdgeInfo.y}%`, cursor: 'move' }}
                        onMouseDown={(e) => handleMouseDown(e, 'tail-base')}
                    />
                )}
            </div>
        </div>
    );
};

export default SpeechBubble;
