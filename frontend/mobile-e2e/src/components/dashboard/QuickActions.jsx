import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import NewApplicationModal from '../modals/NewApplicationModal';

const QuickActions = ({ onRefresh, isRefreshing = false }) => {
    const [isNewAppModalOpen, setIsNewAppModalOpen] = useState(false);

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className='text-2xl font-bold'>Dashboard</h1>
                <div className="flex space-x-4">
                    <button 
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className={`btn btn-sm inline-flex items-center ${
                            isRefreshing
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white ring-1 ring-zinc-900/10 hover:bg-gray-50'
                        }`}
                    >
                        <RefreshCw className={`size-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Actualisation...' : 'Actualiser'}
                    </button>
                    <button className="btn btn-sm bg-white ring-1 ring-zinc-900/10">
                        Reports
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                        </svg>
                    </button>
                    <button 
                        className="btn btn-sm bg-emerald-600 text-white"
                        onClick={() => setIsNewAppModalOpen(true)}
                    >
                        New Application
                    </button>
                </div>
            </div>
            <NewApplicationModal 
                isOpen={isNewAppModalOpen}
                onClose={() => setIsNewAppModalOpen(false)}
            />
        </>
    );
};

export default QuickActions;
