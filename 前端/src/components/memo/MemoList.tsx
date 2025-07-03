import React from 'react';
import { Memo } from '../types';
import { LABELS_ZH } from '../constants';
import { TrashIcon, CalendarIcon, ClockIcon, CheckCircleIcon, SparklesIcon } from './icons';

interface MemoListProps {
    memos: Memo[];
    onToggleComplete: (memoId: string, isCompleted: boolean) => void;
    onDelete: (memoId: string) => void;
    onRequestExecute: (memo: Memo) => void;
    disabled?: boolean;
}

const formatDueDate = (isoString: string | null): { date: string, time: string, isPast: boolean } => {
    if (!isoString) return { date: '', time: '', isPast: false };

    const date = new Date(isoString);
    const now = new Date();
    
    const isPast = date < now;

    const dateOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    };

    return {
        date: date.toLocaleDateString('zh-CN', dateOptions),
        time: date.toLocaleTimeString('zh-CN', timeOptions),
        isPast,
    };
};

const MemoList: React.FC<MemoListProps> = ({ memos, onToggleComplete, onDelete, onRequestExecute, disabled = false }) => {
    return (
        <div className="space-y-4">
            {memos.map(memo => {
                const { date, time, isPast } = formatDueDate(memo.dueDateTime);
                const isCompleted = memo.isCompleted;
                const isExecutable = memo.taskType === 'add_part' && !isCompleted;

                return (
                    <div
                        key={memo.id}
                        className={`p-4 border rounded-xl transition-all duration-200 ease-in-out flex items-start gap-4 ${
                            disabled ? 'opacity-60 cursor-not-allowed' : ''} ${
                            isCompleted
                                ? 'bg-slate-100/80 border-slate-200/90 opacity-70'
                                : `bg-white border-slate-200/90 shadow-sm hover:shadow-md hover:border-sky-200`
                        }`}
                    >
                        <button
                            onClick={() => !disabled && onToggleComplete(memo.id, memo.isCompleted)}
                            disabled={disabled}
                            aria-label={isCompleted ? '标记为未完成' : '标记为已完成'}
                            className={`mt-1 flex-shrink-0 p-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 transition-colors ${
                                isCompleted ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-emerald-500'
                            }`}
                        >
                            <CheckCircleIcon className="w-6 h-6" />
                        </button>

                        <div className="flex-grow">
                            <p className={`text-slate-800 break-words ${isCompleted ? 'line-through text-slate-500' : ''}`}>
                                {memo.task}
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
                                {memo.dueDateTime && (
                                    <div className={`flex items-center ${isCompleted ? 'text-slate-500' : isPast ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                                        <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                                        <span>{date}</span>
                                        <ClockIcon className="w-3.5 h-3.5 ml-2 mr-1.5" />
                                        <span>{time}</span>
                                    </div>
                                )}
                                {memo.partNumber && (
                                    <div className={`flex items-center font-mono py-0.5 px-1.5 rounded ${isCompleted ? 'text-slate-500 bg-slate-200' : 'text-sky-700 bg-sky-100'}`}>
                                        {LABELS_ZH.RELATED_PART_LABEL}: {memo.partNumber}
                                    </div>
                                )}
                                {memo.orderName && (
                                     <div className={`flex items-center font-mono py-0.5 px-1.5 rounded ${isCompleted ? 'text-slate-500 bg-slate-200' : 'text-purple-700 bg-purple-100'}`}>
                                        {LABELS_ZH.RELATED_ORDER_LABEL}: {memo.orderName}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-1 ml-auto flex-shrink-0">
                            {isExecutable && (
                                <button
                                    onClick={() => !disabled && onRequestExecute(memo)}
                                    disabled={disabled}
                                    aria-label={LABELS_ZH.AI_EXECUTE_BUTTON}
                                    title={LABELS_ZH.AI_EXECUTE_BUTTON}
                                    className="p-2 text-purple-500 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                                >
                                    <SparklesIcon className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={() => !disabled && onDelete(memo.id)}
                                disabled={disabled}
                                aria-label="删除备忘"
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MemoList;
