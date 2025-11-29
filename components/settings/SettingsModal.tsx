
import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { saveApiKey, removeApiKey, validateApiKey, hasApiKey } from '../../services/geminiService';
import { CheckCircleIcon, XCircleIcon } from '../Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failure'>('idle');

  useEffect(() => {
    if (isOpen) {
      setIsSaved(hasApiKey());
      setTestStatus('idle');
      setApiKey(''); // Don't show the actual key for security, just indicate if it exists
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    
    // Optionally test before saving or just save
    saveApiKey(apiKey);
    setIsSaved(true);
    setApiKey(''); // Clear input after save
    
    // Auto test on save
    handleTestConnection(apiKey);
  };

  const handleTestConnection = async (keyToTest?: string) => {
    setTestStatus('testing');
    // If testing a new key, use that. Otherwise use stored key (need to retrieve it internally in service if we implemented a getter, 
    // but here we only have the setter. For security we don't return the key to UI. 
    // So we can only test the 'new' key being entered, or we assume the service uses the stored one if validApiKey is called without args - 
    // but our service wrapper expects a key for validation or uses stored for calls.
    // Let's modify logic: if keyToTest is passed, use it. If not, we can't easily retrieve it back to UI for security without exposing it. 
    // So we will rely on the user entering a key to test, OR trusting the stored one works if they don't enter new one.
    
    // However, the best UX for "Test Connection" button when input is empty but key is saved:
    // We should probably allow the service to validate the *stored* key.
    // But `validateApiKey` currently takes a string. Let's assume we pass the current input.
    
    const key = keyToTest || apiKey;
    
    if (!key && isSaved) {
        // We can't verify the *stored* key easily without exposing it or adding a specific service method.
        // Let's just ask user to enter it if they want to test, or we update service to allow testing stored key.
        // For now, let's just assume we are testing the INPUT key.
        setTestStatus('idle');
        alert("새로운 키를 입력하여 테스트해주세요.");
        return;
    }

    const isValid = await validateApiKey(key);
    setTestStatus(isValid ? 'success' : 'failure');
    
    if (isValid && keyToTest) {
        // If we tested a specific key and it worked, ensure it is saved
        saveApiKey(key);
        setIsSaved(true);
        setApiKey('');
    }
  };

  const handleClear = () => {
    removeApiKey();
    setIsSaved(false);
    setApiKey('');
    setTestStatus('idle');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          ⚙️ API 설정
        </h2>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Google Gemini API Key를 입력하세요. 키는 브라우저의 로컬 저장소에 암호화되어 안전하게 저장됩니다.
          </p>
          
          <div className="space-y-2">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              API Key
            </label>
            <div className="relative">
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestStatus('idle');
                }}
                placeholder={isSaved ? "키가 저장되어 있습니다 (변경하려면 입력)" : "API Key를 입력하세요 (AI Studio)"}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {isSaved && !apiKey && (
                 <div className="absolute right-3 top-2.5 text-green-500">
                    <CheckCircleIcon className="w-5 h-5" />
                 </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
             <div className="flex gap-2">
                <Button 
                    onClick={() => handleSave()} 
                    disabled={!apiKey}
                    className="flex-1"
                >
                    저장하기
                </Button>
                <Button 
                    onClick={() => handleTestConnection(apiKey)} 
                    variant="secondary"
                    disabled={!apiKey}
                    isLoading={testStatus === 'testing'}
                >
                    연결 테스트
                </Button>
             </div>
             
             {isSaved && (
                <Button onClick={handleClear} variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    저장된 키 삭제
                </Button>
             )}
          </div>

          {testStatus === 'success' && (
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md flex items-center gap-2 text-sm">
                <CheckCircleIcon className="w-5 h-5" />
                연결 성공! API Key가 유효합니다.
            </div>
          )}
          
          {testStatus === 'failure' && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md flex items-center gap-2 text-sm">
                <XCircleIcon className="w-5 h-5" />
                연결 실패. API Key를 확인해주세요.
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-purple-500 hover:underline flex items-center justify-center">
                Google AI Studio에서 키 발급받기 &rarr;
            </a>
          </div>
        </div>

        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
            <XCircleIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
