
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Memo } from '../types';
import { LABELS_ZH } from '../constants';
import apiClient from '../apiClient';
import { PlusIcon, SpinnerIcon, PencilSquareIcon } from './icons';
import MemoList from './MemoList';
import ConfirmationModal from './ConfirmationModal';

type ParsedMemoData = Omit<Memo, 'id' | 'userId' | 'isCompleted' | 'createdAt'>;

const SmartMemo: React.FC = () => {
    const [memos, setMemos] = useState<Memo[]>([]);
    const [newMemoText, setNewMemoText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [memoForExecution, setMemoForExecution] = useState<Memo | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    const fetchMemos = useCallback(async () => {
        setIsFetching(true);
        setError(null);
        try {
            const response = await apiClient.get<Memo[]>('/memos');
            const sortedMemos = response.data.sort((a, b) => {
                if (a.isCompleted !== b.isCompleted) {
                    return a.isCompleted ? 1 : -1;
                }
                const dateA = a.dueDateTime ? new Date(a.dueDateTime).getTime() : Infinity;
                const dateB = b.dueDateTime ? new Date(b.dueDateTime).getTime() : Infinity;
                
                if (a.isCompleted) {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
                return dateA - dateB;
            });
            setMemos(sortedMemos);
        } catch (err) {
            console.error("Failed to fetch memos:", err);
            setError(LABELS_ZH.ERROR_FETCHING_MEMOS);
        } finally {
            setIsFetching(false);
        }
    }, []);

    useEffect(() => {
        fetchMemos();
    }, [fetchMemos]);

    const parseMemoWithAI = async (text: string): Promise<ParsedMemoData> => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("API密钥未配置。请在项目根目录的 .env 文件中设置 VITE_GEMINI_API_KEY。");
        }
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `You are a task parsing assistant for a parts ordering system. Your job is to meticulously analyze the user's input and convert it into a single, valid JSON object with NO additional text, explanations, or markdown fences.

Follow these rules STRICTLY:

1.  **Identify Task Type ('taskType')**:
    *   If the input implies adding a part to an order (e.g., using "添加零件", "往...订单里加"), the 'taskType' is **'add_part'**.
    *   Otherwise, the 'taskType' is **'reminder'**.

2.  **Extract Details**:
    *   **'orderName'**: If and ONLY IF 'taskType' is 'add_part', you MUST extract the order's name. Otherwise, it MUST be **null**.
    *   **'dueDateTime'**: Convert any relative time (like 'tomorrow at 3pm', '下周一') to a full ISO 8601 UTC timestamp. The current time is ${new Date().toISOString()}. If no time is mentioned, it MUST be **null**.
    *   **'partNumber'**: Extract the part number if available. The part number itself must not contain spaces. If not available, it MUST be **null**.

3.  **Format the Core Task string ('task') - THIS IS THE MOST IMPORTANT RULE**:
    *   For 'reminder' tasks, 'task' is the core reminder text (e.g., "开会", "call supplier").
    *   For 'add_part' tasks, the 'task' string's format is **NON-NEGOTIABLE**. It MUST follow this exact structure:
        "添加零件 [PART_NUMBER] [PART_NAME] 数量[QUANTITY]"
        *   It MUST start with the literal string "添加零件 ".
        *   Followed by the part number (which should not contain spaces).
        *   Followed by a single space.
        *   Followed by the part name. If the user did not provide a part name, you MUST use the placeholder "(无名称)". The part name itself should not contain spaces.
        *   Followed by a single space.
        *   Followed by the literal string "数量".
        *   Followed IMMEDIATELY by the numeric quantity (e.g., "数量50", NOT "数量 50").

**EXAMPLES (Pay close attention to the 'task' format):**

*   **User Input:** "帮我往‘华东区紧急订单’里添加零件‘轴承A-123’，数量10个"
*   **Your Output (JSON):**
    {
      "task": "添加零件 轴承A-123 (无名称) 数量10",
      "dueDateTime": null,
      "partNumber": "轴承A-123",
      "taskType": "add_part",
      "orderName": "华东区紧急订单"
    }

*   **User Input:** "往 2025Q3订单 加一个 螺丝B，编号 B-SCREW-002，要500个"
*   **Your Output (JSON):**
    {
      "task": "添加零件 B-SCREW-002 螺丝B 数量500",
      "dueDateTime": null,
      "partNumber": "B-SCREW-002",
      "taskType": "add_part",
      "orderName": "2025Q3订单"
    }

*   **User Input:** "remind me to call supplier tomorrow"
*   **Your Output (JSON):**
    {
      "task": "call supplier",
      "dueDateTime": "${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}",
      "partNumber": null,
      "taskType": "reminder",
      "orderName": null
    }

---
Now, parse the following user input: "${text}"`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            },
        });
        
        let jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }

        try {
            const parsed = JSON.parse(jsonStr);
            return {
                task: parsed.task || text,
                dueDateTime: parsed.dueDateTime || null,
                partNumber: parsed.partNumber || null,
                taskType: parsed.taskType || 'reminder',
                orderName: parsed.orderName || null,
            };
        } catch (e) {
            console.error("Failed to parse AI JSON response:", e);
            throw new Error(LABELS_ZH.ERROR_AI_PARSE);
        }
    };

    const handleAddMemo = async () => {
        if (!newMemoText.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const parsedData = await parseMemoWithAI(newMemoText);

            // Add frontend validation as requested by backend AI
            if (parsedData.taskType === 'add_part' && (!parsedData.orderName || parsedData.orderName.trim() === '')) {
                setError("AI未能识别出订单名称，请您在描述中明确指定订单，例如‘往...订单里添加...’。");
                setIsLoading(false);
                return;
            }

            await apiClient.post('/memos', parsedData);
            setNewMemoText('');
            await fetchMemos();
        } catch (err: any) {
            console.error("Failed to add memo:", err);
            const errorMsg = err.response?.data?.error || err.message || LABELS_ZH.ERROR_SAVING_MEMO;
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleAddMemo();
    };

    const handleToggleComplete = async (memoId: string, isCompleted: boolean) => {
        try {
            await apiClient.put(`/memos/${memoId}`, { isCompleted: !isCompleted });
            await fetchMemos();
        } catch (err) {
            console.error("Failed to update memo:", err);
            setError(LABELS_ZH.ERROR_UPDATING_MEMO);
        }
    };

    const handleDeleteMemo = async (memoId: string) => {
        try {
            await apiClient.delete(`/memos/${memoId}`);
            await fetchMemos();
        } catch (err) {
            console.error("Failed to delete memo:", err);
            setError(LABELS_ZH.ERROR_DELETING_MEMO);
        }
    };

    const requestExecuteMemo = (memo: Memo) => {
        setMemoForExecution(memo);
    };

    const handleExecuteMemo = async () => {
        if (!memoForExecution) return;
        
        setIsExecuting(true);
        setError(null);
        try {
            await apiClient.post(`/memos/${memoForExecution.id}/execute`);
            await fetchMemos();
        } catch (err: any) {
            console.error("Failed to execute memo:", err);
            const errorMsg = err.response?.data?.error || err.message || LABELS_ZH.ERROR_EXECUTING_MEMO;
            setError(errorMsg);
        } finally {
            setIsExecuting(false);
            setMemoForExecution(null);
        }
    };

    return (
        <>
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200/80">
            <h2 className="text-2xl font-semibold text-sky-700 mb-6 sm:mb-8 flex items-center">
                <PencilSquareIcon className="w-7 h-7 mr-3 text-sky-600" />
                {LABELS_ZH.SMART_MEMO_TITLE}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch gap-3 mb-6">
                <div className="flex-grow">
                    <label htmlFor="smart-memo-input" className="sr-only">{LABELS_ZH.SMART_MEMO_PLACEHOLDER}</label>
                    <input
                        id="smart-memo-input"
                        type="text"
                        value={newMemoText}
                        onChange={(e) => setNewMemoText(e.target.value)}
                        placeholder={LABELS_ZH.SMART_MEMO_PLACEHOLDER}
                        className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors hover:border-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
                        disabled={isLoading || isExecuting}
                        aria-label={LABELS_ZH.SMART_MEMO_PLACEHOLDER}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading || !newMemoText.trim() || isExecuting}
                    className="inline-flex items-center justify-center px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-all duration-200 ease-in-out shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-opacity-75 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isLoading ? <SpinnerIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5 mr-2" />}
                    <span className="ml-1">{isLoading ? LABELS_ZH.AI_PROCESSING : LABELS_ZH.ADD_MEMO_BUTTON}</span>
                </button>
            </form>
            
            {error && (
                 <div role="alert" className="text-sm text-red-700 my-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                    <strong className="font-semibold">错误：</strong>{error}
                </div>
            )}

            <div className="mt-6">
                {isFetching ? (
                     <div className="text-center py-6 text-slate-600"><SpinnerIcon className="w-6 h-6 mx-auto animate-spin" /></div>
                ) : memos.length > 0 ? (
                    <MemoList 
                        memos={memos} 
                        onToggleComplete={handleToggleComplete} 
                        onDelete={handleDeleteMemo}
                        onRequestExecute={requestExecuteMemo}
                        disabled={isExecuting}
                    />
                ) : (
                    <div className="text-center py-10 text-slate-500">
                        <PencilSquareIcon className="w-12 h-12 mx-auto text-slate-400 mb-3" aria-hidden="true" />
                        <p className="text-md font-medium">{LABELS_ZH.NO_MEMOS}</p>
                    </div>
                )}
            </div>
        </div>

        {memoForExecution && (
            <ConfirmationModal
                isOpen={!!memoForExecution}
                onClose={() => setMemoForExecution(null)}
                onConfirm={handleExecuteMemo}
                title={LABELS_ZH.AI_EXECUTE_CONFIRM_TITLE}
                message={LABELS_ZH.AI_EXECUTE_CONFIRM_MSG}
            />
        )}
        </>
    );
};

export default SmartMemo;
