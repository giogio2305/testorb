import { Dialog, Transition } from '@headlessui/react';
import { Code, Eye, GitCompare, Send, Sparkles } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useUpdateTest } from '../../hooks/useQueryApplications';
import { aiService } from '../../services/api';

export default function EditTestModal({ isOpen, setIsOpen, test, applicationId }) {
    const [testName, setTestName] = useState('');
    const [scriptContent, setScriptContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [type, setType] = useState('text');
    const [showAIChat, setShowAIChat] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAILoading, setIsAILoading] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [viewMode, setViewMode] = useState('edit'); // 'edit', 'preview', 'diff'
    const [aiModifiedContent, setAiModifiedContent] = useState('');
    const [showDiff, setShowDiff] = useState(false);

    const updateTestMutation = useUpdateTest();

    useEffect(() => {
        if (test) {
            setTestName(test.name || '');
            setScriptContent(test.scriptContent || '');
            setOriginalContent(test.scriptContent || '');
            setType(test.type || 'text');
            setAiModifiedContent('');
            setShowDiff(false);
        }
    }, [test]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!testName.trim() || !scriptContent.trim()) {
            return;
        }

        try {
            await updateTestMutation.mutateAsync({
                applicationId,
                testId: test._id,
                data: {
                    testName: testName.trim(),
                    scriptContent: scriptContent.trim(),
                    type,
                },
            });
            setIsOpen(false);
        } catch (error) {
            console.error('Error updating test:', error);
        }
    };

    const handleAIModification = async () => {
        if (!aiPrompt.trim()) {
            setAiError("Veuillez entrer une instruction pour l'IA.");
            return;
        }

        setIsAILoading(true);
        setAiError(null);

        try {
            const response = await aiService.modifyTest({
                originalText: scriptContent,
                prompt: aiPrompt,
                context: `Test name: ${testName}, Test type: ${type}`,
            });

            setAiModifiedContent(response.modifiedText);
            setShowDiff(true);
            setViewMode('diff');
            setAiPrompt('');
        } catch (error) {
            console.error('Error modifying text with AI:', error);
            setAiError(error.response?.data?.message || "Erreur lors de la modification avec l'IA");
        } finally {
            setIsAILoading(false);
        }
    };

    const acceptAIChanges = () => {
        setScriptContent(aiModifiedContent);
        setShowDiff(false);
        setAiModifiedContent('');
        setViewMode('edit');
        setShowAIChat(false);
    };

    const rejectAIChanges = () => {
        setShowDiff(false);
        setAiModifiedContent('');
        setViewMode('edit');
    };

    const handleClose = () => {
        setIsOpen(false);
        setTestName('');
        setScriptContent('');
        setOriginalContent('');
        setType('text');
        setShowAIChat(false);
        setAiPrompt('');
        setAiError(null);
        setViewMode('edit');
        setAiModifiedContent('');
        setShowDiff(false);
    };

    const renderViewModeButtons = () => (
        <div className='flex space-x-2 mb-4'>
            <button
                type='button' // IMPORTANT: Ajouter type="button"
                onClick={(e) => {
                    e.preventDefault(); // Empêcher la soumission du formulaire
                    e.stopPropagation(); // Empêcher la propagation
                    setViewMode('edit');
                }}
                className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors ${
                    viewMode === 'edit'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
                <Code className='w-4 h-4' />
                <span>Éditer</span>
            </button>
            <button
                type='button' // IMPORTANT: Ajouter type="button"
                onClick={(e) => {
                    e.preventDefault(); // Empêcher la soumission du formulaire
                    e.stopPropagation(); // Empêcher la propagation
                    setViewMode('preview');
                }}
                className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors ${
                    viewMode === 'preview'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
                <Eye className='w-4 h-4' />
                <span>Aperçu</span>
            </button>
            {showDiff && (
                <button
                    type='button' // IMPORTANT: Ajouter type="button"
                    onClick={(e) => {
                        e.preventDefault(); // Empêcher la soumission du formulaire
                        e.stopPropagation(); // Empêcher la propagation
                        setViewMode('diff');
                    }}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors ${
                        viewMode === 'diff'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    <GitCompare className='w-4 h-4' />
                    <span>Diff IA</span>
                </button>
            )}
        </div>
    );

    const renderCodeEditor = () => {
        switch (viewMode) {
            case 'edit':
                return (
                    <textarea
                        value={scriptContent}
                        onChange={(e) => setScriptContent(e.target.value)}
                        rows={20}
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm'
                        placeholder='Contenu du script de test...'
                        required
                    />
                );
            case 'preview':
                return (
                    <div className='border border-gray-300 rounded-md overflow-hidden'>
                        <SyntaxHighlighter
                            language='javascript'
                            style={vscDarkPlus}
                            customStyle={{
                                margin: 0,
                                borderRadius: 0,
                                fontSize: '14px',
                                maxHeight: '500px',
                            }}
                            showLineNumbers
                        >
                            {scriptContent || '// Aucun contenu'}
                        </SyntaxHighlighter>
                    </div>
                );
            case 'diff':
                return (
                    <div className='border border-gray-300 rounded-md overflow-hidden'>
                        <ReactDiffViewer
                            oldValue={scriptContent}
                            newValue={aiModifiedContent}
                            splitView={true}
                            leftTitle='Code actuel'
                            rightTitle='Modifications IA'
                            showDiffOnly={false}
                            useDarkTheme={false}
                            styles={{
                                variables: {
                                    light: {
                                        codeFoldGutterBackground: '#f7f7f7',
                                        codeFoldBackground: '#f1f8ff',
                                    },
                                },
                                diffContainer: {
                                    fontSize: '14px',
                                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                                },
                            }}
                        />
                        <div className='p-4 bg-gray-50 border-t flex justify-end space-x-3'>
                            <button
                                type='button' // IMPORTANT: Ajouter type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    rejectAIChanges();
                                }}
                                className='px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors'
                            >
                                Rejeter
                            </button>
                            <button
                                type='button' // IMPORTANT: Ajouter type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    acceptAIChanges();
                                }}
                                className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors'
                            >
                                Accepter les modifications
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as='div' className='relative z-50' onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter='ease-out duration-300'
                    enterFrom='opacity-0'
                    enterTo='opacity-100'
                    leave='ease-in duration-200'
                    leaveFrom='opacity-100'
                    leaveTo='opacity-0'
                >
                    <div className='fixed inset-0 bg-black bg-opacity-25' />
                </Transition.Child>

                <div className='fixed inset-0 overflow-y-auto'>
                    <div className='flex min-h-full items-center justify-center p-4 text-center'>
                        <Transition.Child
                            as={Fragment}
                            enter='ease-out duration-300'
                            enterFrom='opacity-0 scale-95'
                            enterTo='opacity-100 scale-100'
                            leave='ease-in duration-200'
                            leaveFrom='opacity-100 scale-100'
                            leaveTo='opacity-0 scale-95'
                        >
                            <Dialog.Panel className='w-full max-w-7xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all'>
                                <Dialog.Title
                                    as='h3'
                                    className='text-lg font-medium leading-6 text-gray-900 mb-4 flex items-center justify-between'
                                >
                                    <span>Modifier le test</span>
                                    <button
                                        type='button'
                                        onClick={() => setShowAIChat(!showAIChat)}
                                        className='flex items-center space-x-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors'
                                    >
                                        <Sparkles className='w-4 h-4' />
                                        <span>Assistant IA</span>
                                    </button>
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className='space-y-4'>
                                    <div className='grid grid-cols-2 gap-4'>
                                        <div>
                                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                                Nom du test
                                            </label>
                                            <input
                                                type='text'
                                                value={testName}
                                                onChange={(e) => setTestName(e.target.value)}
                                                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                                                placeholder='Nom du test'
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                                Type de test
                                            </label>
                                            <select
                                                value={type}
                                                onChange={(e) => setType(e.target.value)}
                                                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                                            >
                                                <option value='text'>Text</option>
                                                <option value='appium'>Appium</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div
                                        className={`grid ${
                                            showAIChat ? 'grid-cols-2' : 'grid-cols-1'
                                        } gap-4`}
                                    >
                                        <div>
                                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                                Contenu du script
                                            </label>
                                            {renderViewModeButtons()}
                                            {renderCodeEditor()}
                                        </div>

                                        {showAIChat && (
                                            <div className='bg-purple-50 p-4 rounded-lg'>
                                                <h4 className='text-md font-medium text-purple-900 mb-3 flex items-center'>
                                                    <Sparkles className='w-5 h-5 mr-2' />
                                                    Assistant IA
                                                </h4>
                                                <div className='space-y-3'>
                                                    <div>
                                                        <label className='block text-sm font-medium text-gray-700 mb-2'>
                                                            Que souhaitez-vous modifier ?
                                                        </label>
                                                        <textarea
                                                            value={aiPrompt}
                                                            onChange={(e) =>
                                                                setAiPrompt(e.target.value)
                                                            }
                                                            rows={8}
                                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm'
                                                            placeholder="Exemple: 'Ajoute une vérification d'erreur après chaque action', 'Optimise les sélecteurs pour être plus robustes', 'Ajoute des commentaires explicatifs'..."
                                                        />
                                                    </div>

                                                    {aiError && (
                                                        <div className='p-3 bg-red-100 text-red-700 rounded-md text-sm'>
                                                            {aiError}
                                                        </div>
                                                    )}

                                                    <button
                                                        type='button'
                                                        onClick={handleAIModification}
                                                        disabled={isAILoading || !aiPrompt.trim()}
                                                        className='w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                                                    >
                                                        {isAILoading ? (
                                                            <>
                                                                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                                                                <span>
                                                                    Modification en cours...
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Send className='w-4 h-4' />
                                                                <span>Modifier avec l'IA</span>
                                                            </>
                                                        )}
                                                    </button>

                                                    <div className='text-xs text-gray-500'>
                                                        💡 Conseils: Soyez précis dans vos
                                                        instructions. L'IA peut ajouter des
                                                        fonctionnalités, optimiser le code, corriger
                                                        des erreurs, ou restructurer le script.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className='flex justify-end space-x-3 pt-4'>
                                        <button
                                            type='button'
                                            className='px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors'
                                            onClick={handleClose}
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            type='submit'
                                            disabled={updateTestMutation.isPending}
                                            className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors'
                                        >
                                            {updateTestMutation.isPending
                                                ? 'Sauvegarde...'
                                                : 'Sauvegarder'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
