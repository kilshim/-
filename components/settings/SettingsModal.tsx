
import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { saveApiKey, removeApiKey } from '../../services/geminiService';
import { XCircleIcon, CheckCircleIcon } from '../Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // sessionStorage에 키가 있는지 확인
      const storedKey = sessionStorage.getItem('CUSTOM_GEMINI_API_KEY');
      setIsSaved(!!storedKey);
      setApiKey('');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!apiKey.trim()) return;
    saveApiKey(apiKey);
    setIsSaved(true);
    setApiKey('');
    alert('API 키가 현재 세션에 저장되었습니다.');
  };

  const handleClear = () => {
    removeApiKey();
    setIsSaved(false);
    setApiKey('');
    alert('API 키가 삭제되었습니다.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <XCircleIcon className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          ⚙️ API 설정
        </h2>
        
        <div className="space-y-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-md border border-purple-100 dark:border-purple-800">
             <h3 className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-1">🔒 보안 안내</h3>
             <ul className="text-xs text-purple-600 dark:text-purple-400 list-disc pl-4 space-y-1">
                <li>입력하신 키는 <strong>브라우저 메모리(Session)</strong>에만 임시 저장됩니다.</li>
                <li>이미지 생성 시 암호화된 채널을 통해 서버로 전송되며, <strong>서버에는 절대 저장되지 않습니다.</strong></li>
                <li>창을 닫으면 키는 자동 소멸됩니다.</li>
             </ul>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Gemini API Key
            </label>
            <div className="relative">
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isSaved ? "키가 현재 세션에 활성화됨" : "AIza..."}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {isSaved && !apiKey && (
                 <div className="absolute right-3 top-2.5 text-green-500">
                    <CheckCircleIcon className="w-5 h-5" />
                 </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleSave} disabled={!apiKey.trim()} className="w-full">
              세션에 적용하기
            </Button>
            {isSaved && (
              <Button onClick={handleClear} variant="ghost" className="w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                세션 키 삭제
              </Button>
            )}
          </div>

          <div className="text-center pt-2">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-purple-500 hover:underline">
                Google AI Studio에서 무료 키 발급받기 &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
