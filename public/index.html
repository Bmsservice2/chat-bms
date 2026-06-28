<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BMS Knowledge - Centro Operacional de Inteligência Jurídica</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <script>
        tailwind.config = {
            darkMode: 'class'
        }
        if (!localStorage.getItem("theme") || localStorage.getItem("theme") === "dark") {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    </script>
    <style>
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</head>
<body class="bg-[#f3f4f6] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans h-screen flex flex-col overflow-hidden select-none transition-colors duration-200">

    <input type="file" id="global-vault-upload" class="hidden" />
    <input type="file" id="chat-context-upload" class="hidden" />

    <div id="custom-context-menu" class="hidden absolute bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1.5 w-44 z-50 text-xs font-bold text-slate-600 dark:text-slate-300">
        <button onclick="openRenameModal()" class="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"><i data-lucide="edit-2" class="w-3.5 h-3.5 text-blue-500"></i> Renomear / Mover</button>
        <button onclick="openDeleteModal()" class="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-red-600 dark:text-red-400 flex items-center gap-2"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Apagar Registro</button>
    </div>

    <div id="custom-dialog-modal" class="hidden fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 w-80 max-w-full flex flex-col gap-4">
            <h3 id="modal-title" class="text-sm font-black text-slate-800 dark:text-white">Ação do Cofre</h3>
            <div id="modal-body-content" class="flex flex-col gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400"></div>
            <div class="flex justify-end gap-2 text-xs font-bold mt-2">
                <button onclick="closeCustomModal()" class="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-all">Cancelar</button>
                <button id="modal-confirm-btn" class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all">Confirmar</button>
            </div>
        </div>
    </div>

    <header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 min-h-16 flex items-center justify-between px-6 z-20 shadow-xs">
        <div class="flex items-center gap-3">
            <div class="bg-blue-600 p-2.5 rounded-xl text-white shadow-sm shadow-blue-300 dark:shadow-none">
                <i data-lucide="brain-circuit" class="w-5 h-5"></i>
            </div>
            <span class="font-black text-xl tracking-tight text-slate-900 dark:text-white">BMS <span class="text-blue-600 font-medium">Knowledge</span></span>
        </div>
        
        <div class="flex-1 max-w-xl mx-8 relative">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input type="text" id="global-search-bar" oninput="searchFileTree()" placeholder="Buscar processos, leis, jurisprudências, petições... (Ctrl K)" 
                   class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-semibold text-slate-700 dark:text-slate-200">
        </div>

        <div class="flex items-center gap-3">
            <button onclick="toggleDarkMode()" class="p-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xs active:scale-95">
                <i data-lucide="moon" class="w-4 h-4 dark:hidden"></i>
                <i data-lucide="sun" class="w-4 h-4 hidden dark:block"></i>
            </button>

            <button id="btn-vault-upload" class="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-xs">
                <i data-lucide="upload-cloud" class="w-4 h-4 text-blue-600"></i> Upload Cofre
            </button>
            <div class="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
            
            <div id="server-status-badge" class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-all duration-300">
                <div id="server-status-dot" class="w-2 h-2 bg-slate-400 rounded-full"></div>
                <span id="server-status-text" class="text-[10px] font-black tracking-wide uppercase text-slate-500 dark:text-slate-400">Checando...</span>
            </div>
        </div>
    </header>

    <div class="flex flex-1 overflow-hidden relative" onclick="closeAllDropdownsMenu()">
        <aside id="sidebar-left" class="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden p-4 relative flex-shrink-0" onclick="clearTreeSelection(event)">
            <div class="flex items-center justify-between mb-4 px-1">
                <span class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Processos e Cofre</span>
                <div class="flex gap-1 relative" onclick="e => e.stopPropagation()">
                    <button id="btn-filter-tree" onclick="toggleFilterDropdown(event)" class="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><i data-lucide="filter" class="w-3.5 h-3.5"></i></button>
                    <button onclick="createNewFolderManual(event)" class="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><i data-lucide="folder-plus" class="w-3.5 h-3.5"></i></button>
                    
                    <div id="filter-menu-dropdown" class="hidden absolute top-7 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 w-44 z-30 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <button onclick="changeFilter('all')" class="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">Mostrar Todos</button>
                        <button onclick="changeFilter('md')" class="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">Apenas Texto (.md)</button>
                        <button onclick="changeFilter('pdf')" class="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">Apenas PDFs (.pdf)</button>
                    </div>
                </div>
            </div>

            <div id="file-tree" class="flex-1 overflow-y-auto space-y-0.5 pr-1 text-xs font-semibold text-slate-600 dark:text-slate-300 no-scrollbar">
                <div class="text-slate-400 p-2 animate-pulse">Sincronizando volumes do cofre...</div>
            </div>

            <div class="mt-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5">
                <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><i data-lucide="shield-check" class="w-3.5 h-3.5 text-blue-600"></i> Plano Profissional</span>
                    <span class="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold px-1.5 py-0.5 rounded-md">ATIVO</span>
                </div>
                <div class="text-[10px] text-slate-400 dark:text-slate-500 mb-2 font-medium">Uso de IA e chamadas este mês</div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-1">
                    <div class="bg-blue-600 h-full w-[78%] rounded-full"></div>
                </div>
                <div class="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    <span>7.8k / 10k chamadas</span>
                    <span>78%</span>
                </div>
            </div>
        </aside>

        <div id="resizer-left" class="w-1.5 bg-transparent hover:bg-blue-500 cursor-col-resize z-10 flex-shrink-0 transition-colors"></div>

        <main id="center-panel" class="flex-1 flex flex-col min-w-[300px] overflow-y-auto p-5 gap-4 no-scrollbar">
            <div class="grid grid-cols-4 gap-4">
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center shadow-xs"><div class="p-2 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-lg mr-3"><i data-lucide="scale" class="w-4 h-4"></i></div><div><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Área</p><p class="text-xs font-bold text-slate-700 dark:text-white">Jurisprudência</p></div></div>
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center shadow-xs"><div class="p-2 bg-purple-50 dark:bg-slate-800 text-purple-600 dark:text-purple-400 rounded-lg mr-3"><i data-lucide="file-text" class="w-4 h-4"></i></div><div><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tipo</p><p class="text-xs font-bold text-slate-700 dark:text-white">Petição Inicial</p></div></div>
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center shadow-xs"><div class="p-2 bg-amber-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg mr-3"><i data-lucide="folder-git" class="w-4 h-4"></i></div><div><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fase</p><p class="text-xs font-bold text-slate-700 dark:text-white">Análise Inicial</p></div></div>
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center shadow-xs"><div class="p-2 bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 rounded-lg mr-3"><i data-lucide="target" class="w-4 h-4"></i></div><div><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Foco</p><p class="text-xs font-bold text-slate-700 dark:text-white">Auditar Peças</p></div></div>
            </div>

            <div id="center-preview-container" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col flex-1 overflow-hidden min-h-[350px]">
                <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div>
                        <div class="flex items-center gap-2.5">
                            <h2 id="active-note-title" class="text-sm font-bold text-slate-800 dark:text-white">Selecione um arquivo do cofre</h2>
                            <button id="btn-favorite-star" onclick="toggleActiveFileFavorite()" class="text-slate-300 dark:text-slate-600 hover:text-amber-500 dark:hover:text-amber-400 transition-colors focus:outline-none"><i data-lucide="star" class="w-4 h-4"></i></button>
                        </div>
                        <p id="active-note-meta" class="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Nenhum item ativo no momento</p>
                    </div>
                    
                    <div class="flex items-center gap-1.5">
                        <button onclick="downloadActiveFile()" class="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all" title="Download"><i data-lucide="download" class="w-4 h-4"></i></button>
                        <button onclick="printActiveFile()" class="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all" title="Imprimir"><i data-lucide="printer" class="w-4 h-4"></i></button>
                        <button onclick="fullscreenActiveFile()" class="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all" title="Tela Cheia"><i data-lucide="maximize-2" class="w-4 h-4"></i></button>
                    </div>
                </div>

                <div class="flex gap-2 px-5 border-b border-slate-100 dark:border-slate-800 pb-2 bg-white dark:bg-slate-900">
                    <button id="tab-doc" onclick="switchTab('doc')" class="text-xs font-bold px-4 py-1.5 bg-blue-50 text-blue-600 dark:text-blue-400 rounded-lg transition-all">Documento Original</button>
                    <button id="tab-raw" onclick="switchTab('raw')" class="text-xs font-bold px-4 py-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all">Resumo Markdown</button>
                </div>

                <div class="flex flex-1 overflow-hidden">
                    <div class="w-3/5 p-5 bg-[#fafafa] dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
                        <div id="view-doc" class="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-y-auto p-6 font-sans text-xs text-slate-700 dark:text-slate-300 leading-relaxed select-text">
                            <div class="text-center text-slate-400 my-20">Nenhum documento aberto no monitor.</div>
                        </div>
                        <div id="view-raw" class="hidden flex-1 bg-slate-950 border border-slate-800 text-blue-400 dark:text-blue-400 rounded-xl overflow-y-auto p-4 font-mono text-xs whitespace-pre-wrap select-text">
                            Aguardando seleção...
                        </div>
                    </div>

                    <div class="w-2/5 p-5 flex flex-col gap-4 overflow-y-auto bg-white dark:bg-slate-900 border-l border-slate-50 dark:border-slate-800">
                        <div>
                            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Análise Jurídica</span>
                            <p id="meta-summary" class="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium leading-relaxed">Selecione um arquivo para compilar a análise gerencial.</p>
                        </div>
                        <div class="border-t border-slate-100 dark:border-slate-800 pt-3">
                            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-2">Pontos Relevantes</span>
                            <div id="meta-points" class="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                <div class="flex items-start gap-2 text-slate-400 font-medium"><i data-lucide="minus" class="w-4 h-4 shrink-0"></i> <span>Aguardando arquivo...</span></div>
                            </div>
                        </div>
                        <div>
                            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-2">Conclusão da Peça</span>
                            <div class="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div class="relative w-14 h-14 flex items-center justify-center shrink-0">
                                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                        <path class="text-slate-200 dark:text-slate-700" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        <path id="circle-progress" class="text-blue-600" stroke-dasharray="0, 100" stroke-width="3" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    </svg>
                                    <span id="circle-text" class="absolute text-[11px] font-black text-slate-700 dark:text-white">0%</span>
                                </div>
                                <div>
                                    <p class="text-xs font-bold text-slate-700 dark:text-white">Varredura de Links</p>
                                    <p id="analysis-status-desc" class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Aguardando indexação.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs h-64 min-h-64 flex flex-col relative dark:bg-slate-900 dark:border-slate-800">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5"><i data-lucide="network" class="w-4 h-4 text-blue-600"></i> Malha de Conexões</h3>
                    <span class="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-wider">Malha Neural Orgânica</span>
                </div>
                <div class="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden relative">
                    <canvas id="graph-canvas" class="w-full h-full block cursor-grab active:cursor-grabbing"></canvas>
                </div>
            </div>
        </main>

        <div id="resizer-right" class="w-1.5 bg-transparent hover:bg-blue-500 cursor-col-resize z-10 flex-shrink-0 transition-colors"></div>

        <aside id="sidebar-right" class="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-2xl flex-shrink-0">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold"><i data-lucide="bot" class="w-4 h-4"></i></div>
                    <div>
                        <h3 class="font-bold text-xs text-slate-800 dark:text-white">Assistente BMS</h3>
                        <div class="flex items-center gap-1"><div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div><span class="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Cofre Integrado</span></div>
                    </div>
                </div>
            </div>

            <div class="p-3 bg-amber-50/50 dark:bg-slate-800/30 border-b border-amber-100/60 dark:border-slate-800 flex flex-col gap-1.5">
                <label class="text-[9px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">Token de Validação Local</label>
                <input type="password" id="app-password" value="" placeholder="Insira a chave operacional do cofre..." class="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none">
            </div>

            <div id="chat-messages" class="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#fafafa] dark:bg-slate-950 select-text no-scrollbar">
                <div class="w-full flex justify-start">
                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl rounded-tl-none p-3.5 text-xs max-w-[90%] shadow-xs leading-relaxed">
                        Sincronização efetuada. Selecione uma pasta ou peça do **Cofre** para iniciar a auditoria ou envie instruções estruturadas abaixo.
                    </div>
                </div>
            </div>

            <div id="chat-attachment-area" class="hidden px-3 py-2 bg-blue-50 dark:bg-slate-800 border-t border-blue-100 dark:border-slate-700 flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-300">
                <div class="flex items-center gap-1.5 truncate"><i data-lucide="paperclip" class="w-3.5 h-3.5"></i><span id="chat-attachment-name" class="truncate">anexo.md</span></div>
                <button id="btn-remove-attachment" class="text-slate-400 hover:text-red-500"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>

            <div class="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div class="relative flex items-center gap-2">
                    <button id="btn-chat-attach" class="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 border border-slate-200 dark:border-slate-700 rounded-xl"><i data-lucide="paperclip" class="w-4 h-4"></i></button>
                    <div class="relative flex-1">
                        <input type="text" id="chat-input" placeholder="Pergunte ao Assistente BMS..." class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100">
                        <button id="btn-send" class="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm">
                            <i data-lucide="send" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    </div>

    <script>
        lucide.createIcons();

        const messagesContainer = document.getElementById("chat-messages");
        const chatInput = document.getElementById("chat-input");
        const btnSend = document.getElementById("btn-send");
        const appPassword = document.getElementById("app-password");
        const fileTree = document.getElementById("file-tree");
        const globalSearchBar = document.getElementById("global-search-bar");
        const filterDropdown = document.getElementById("filter-menu-dropdown");
        
        const serverStatusBadge = document.getElementById("server-status-badge");
        const serverStatusDot = document.getElementById("server-status-dot");
        const serverStatusText = document.getElementById("server-status-text");

        const viewDoc = document.getElementById("view-doc");
        const viewRaw = document.getElementById("view-raw");
        const activeNoteTitle = document.getElementById("active-note-title");
        const activeNoteMeta = document.getElementById("active-note-meta");
        const metaSummary = document.getElementById("meta-summary");
        const metaPoints = document.getElementById("meta-points");
        const circleProgress = document.getElementById("circle-progress");
        const circleText = document.getElementById("circle-text");
        const analysisStatusDesc = document.getElementById("analysis-status-desc");
        const favoriteStarBtn = document.getElementById("btn-favorite-star");

        const btnVaultUpload = document.getElementById("btn-vault-upload");
        const globalVaultUpload = document.getElementById("global-vault-upload");
        const btnChatAttach = document.getElementById("btn-chat-attach");
        const chatContextUpload = document.getElementById("chat-context-upload");
        const chatAttachmentArea = document.getElementById("chat-attachment-area");
        const chatAttachmentName = document.getElementById("chat-attachment-name");
        const btnRemoveAttachment = document.getElementById("btn-remove-attachment");

        const canvas = document.getElementById("graph-canvas");
        const ctx = canvas.getContext("2d");

        let chatHistory = [];
        let pendingChatAttachment = null;
        let selectedFileId = null;
        let graphData = { nodes: [], edges: [] };
        let draggedNode = null;
        let currentFilterType = "all";
        let rawContentBuffer = "";
        let contextMenuSelectedPath = null;
        
        let favoriteItems = JSON.parse(localStorage.getItem("bms_favorites") || "{}");
        let collapsedFolders = JSON.parse(localStorage.getItem("bms_collapsed") || "{}");

        // LÓGICA DOS RESIZERS (ARRASTAR COLUNAS)
        const sidebarLeft = document.getElementById('sidebar-left');
        const sidebarRight = document.getElementById('sidebar-right');
        const resizerLeft = document.getElementById('resizer-left');
        const resizerRight = document.getElementById('resizer-right');

        let isResizingLeft = false;
        let isResizingRight = false;

        resizerLeft.addEventListener('mousedown', (e) => {
            isResizingLeft = true;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });

        resizerRight.addEventListener('mousedown', (e) => {
            isResizingRight = true;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizingLeft && !isResizingRight) return;
            if (isResizingLeft) {
                const newWidth = e.clientX;
                if (newWidth > 180 && newWidth < window.innerWidth * 0.5) {
                    sidebarLeft.style.width = `${newWidth}px`;
                }
            }
            if (isResizingRight) {
                const newWidth = window.innerWidth - e.clientX;
                if (newWidth > 220 && newWidth < window.innerWidth * 0.5) {
                    sidebarRight.style.width = `${newWidth}px`;
                }
            }
            if (canvas) resizeCanvas();
        });

        document.addEventListener('mouseup', () => {
            if (isResizingLeft || isResizingRight) {
                isResizingLeft = false;
                isResizingRight = false;
                document.body.style.cursor = 'default';
                resizeCanvas();
            }
        });

        function resizeCanvas() {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        }
        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        function toggleDarkMode() {
            if (document.documentElement.classList.contains("dark")) {
                document.documentElement.classList.remove("dark");
                localStorage.setItem("theme", "light");
            } else {
                document.documentElement.classList.add("dark");
                localStorage.setItem("theme", "dark");
            }
            drawGraph(); 
        }

        function closeAllDropdownsMenu() {
            filterDropdown.classList.add("hidden");
            document.getElementById("custom-context-menu").classList.add("hidden");
        }

        function toggleFilterDropdown(e) {
            e.stopPropagation();
            filterDropdown.classList.toggle("hidden");
        }

        function changeFilter(type) {
            currentFilterType = type;
            closeAllDropdownsMenu();
            buildNotesTree();
        }

        function clearTreeSelection(e) {
            if (e.target.id === "file-tree" || e.target.tagName === "ASIDE") {
                selectedFileId = null;
                activeNoteTitle.innerText = "Selecione um arquivo do cofre";
                activeNoteMeta.innerText = "Raiz do Cofre Ativa";
                rawContentBuffer = "";
                viewDoc.innerHTML = `<div class="text-center text-slate-400 my-20 dark:text-slate-500">Raiz selecionada. Novos diretórios e uploads serão gravados na pasta principal.</div>`;
                updateFavoriteStarUI();
                highlightSelectedRow(null);
            }
        }

        function toggleActiveFileFavorite() {
            if (!selectedFileId) return;
            const cleanPath = selectedFileId.replace(/\/$/, "");
            if (favoriteItems[cleanPath]) {
                delete favoriteItems[cleanPath];
            } else {
                favoriteItems[cleanPath] = true;
            }
            localStorage.setItem("bms_favorites", JSON.stringify(favoriteItems));
            updateFavoriteStarUI();
            buildNotesTree();
        }

        function updateFavoriteStarUI() {
            if (!selectedFileId) {
                favoriteStarBtn.className = "text-slate-300 dark:text-slate-600 focus:outline-none";
                favoriteStarBtn.innerHTML = `<i data-lucide="star" class="w-4 h-4"></i>`;
                lucide.createIcons();
                return;
            }
            const cleanPath = selectedFileId.replace(/\/$/, "");
            const hasStar = !!favoriteItems[cleanPath];
            if (hasStar) {
                favoriteStarBtn.className = "text-amber-500 dark:text-amber-400 focus:outline-none scale-110 transition-transform";
                favoriteStarBtn.innerHTML = `<i data-lucide="star" class="w-4 h-4 fill-amber-500 dark:fill-amber-400"></i>`;
            } else {
                favoriteStarBtn.className = "text-slate-300 dark:text-slate-600 hover:text-amber-500 transition-colors focus:outline-none";
                favoriteStarBtn.innerHTML = `<i data-lucide="star" class="w-4 h-4"></i>`;
            }
            lucide.createIcons();
        }

        function downloadActiveFile() {
            if (!selectedFileId || !rawContentBuffer) return;
            const blob = new Blob([rawContentBuffer], { type: "text/markdown;charset=utf-8" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = selectedFileId.split('/').pop();
            link.click();
        }

        function printActiveFile() {
            if (!selectedFileId) return;
            const printWindow = window.open("", "_blank");
            printWindow.document.write(`<html><head><title>BMS - Imprimir</title></head><body style="font-family:serif;padding:30px;line-height:1.6;">${viewDoc.innerHTML}</body></html>`);
            printWindow.document.close();
            printWindow.print();
        }

        function fullscreenActiveFile() {
            const container = document.getElementById("center-preview-container");
            if (!document.fullscreenElement) container.requestFullscreen().catch(err => console.error(err));
            else document.exitFullscreen();
        }

        async function checkRealServerStatus() {
            try {
                const res = await fetch("/api/status");
                if (res.ok) {
                    serverStatusBadge.className = "flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900 transition-all duration-300";
                    serverStatusDot.className = "w-2 h-2 bg-emerald-500 rounded-full animate-pulse";
                    serverStatusText.className = "text-[10px] font-black tracking-wide uppercase text-emerald-700 dark:text-emerald-400";
                    serverStatusText.innerText = "SERVIDOR ATIVO";
                } else { throw new Error(); }
            } catch (err) {
                serverStatusBadge.className = "flex items-center gap-2 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-xl border border-red-100 dark:border-red-900 transition-all duration-300";
                serverStatusDot.className = "w-2 h-2 bg-red-500 rounded-full animate-pulse";
                serverStatusText.className = "text-[10px] font-black tracking-wide uppercase text-red-700 dark:text-red-400";
                serverStatusText.innerText = "SERVIDOR INATIVO";
            }
        }
        setInterval(checkRealServerStatus, 4000);
        checkRealServerStatus();

        function searchFileTree() {
            const query = globalSearchBar.value.toLowerCase().trim();
            const rows = fileTree.querySelectorAll(".tree-row-container");
            rows.forEach(row => {
                const text = row.getAttribute("data-path").toLowerCase();
                row.classList.toggle("hidden", !text.includes(query));
            });
        }

        function triggerInlineContextMenu(e, path) {
            e.stopPropagation();
            contextMenuSelectedPath = path;
            const menu = document.getElementById("custom-context-menu");
            menu.classList.remove("hidden");
            menu.style.left = `${e.clientX - 160}px`;
            menu.style.top = `${e.clientY + 10}px`;
        }

        function closeCustomModal() {
            document.getElementById("custom-dialog-modal").classList.add("hidden");
        }

        function openRenameModal() {
            document.getElementById("custom-context-menu").classList.add("hidden");
            const modal = document.getElementById("custom-dialog-modal");
            document.getElementById("modal-title").innerText = "Renomear / Mover Item";
            document.getElementById("modal-body-content").innerHTML = `
                <p class="mb-1">Insira o novo caminho completo do registro:</p>
                <input type="text" id="modal-input-field" value="${contextMenuSelectedPath}" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-semibold focus:outline-none text-slate-800 dark:text-white">
            `;
            modal.classList.remove("hidden");
            document.getElementById("modal-confirm-btn").onclick = async () => {
                const newPath = document.getElementById("modal-input-field").value.trim();
                if (newPath) {
                    await renameItem(contextMenuSelectedPath, newPath);
                    closeCustomModal();
                }
            };
        }

        function openDeleteModal() {
            document.getElementById("custom-context-menu").classList.add("hidden");
            const modal = document.getElementById("custom-dialog-modal");
            document.getElementById("modal-title").innerText = "Confirmar Exclusão";
            document.getElementById("modal-body-content").innerHTML = `<p>Tem certeza que deseja apagar permanentemente o item <strong>${contextMenuSelectedPath}</strong> do cofre?</p>`;
            modal.classList.remove("hidden");
            document.getElementById("modal-confirm-btn").onclick = async () => {
                await deleteItem(contextMenuSelectedPath);
                closeCustomModal();
            };
        }

        async function createFolderOnVPS(name) {
            try {
                const res = await fetch("/api/create-folder", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ foldername: name })
                });
                if (res.ok) {
                    buildNotesTree();
                    reloadGlobalGraph();
                }
            } catch (err) { console.error(err); }
        }

        function createNewFolderManual(e) {
            if(e) e.stopPropagation();
            let context = "";
            if (selectedFileId && selectedFileId.endsWith("/")) context = selectedFileId;
            else if (selectedFileId && selectedFileId.includes("/")) context = selectedFileId.substring(0, selectedFileId.lastIndexOf("/")) + "/";
            
            const modal = document.getElementById("custom-dialog-modal");
            document.getElementById("modal-title").innerText = "Criar Nova Pasta";
            document.getElementById("modal-body-content").innerHTML = `
                <p class="mb-1">${context ? 'Subpasta em ' + context : 'Pasta na raiz do cofre:'}</p>
                <input type="text" id="modal-input-field" placeholder="Nome do diretório..." class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-semibold focus:outline-none text-slate-800 dark:text-white">
            `;
            modal.classList.remove("hidden");
            document.getElementById("modal-confirm-btn").onclick = async () => {
                const name = document.getElementById("modal-input-field").value.trim();
                if (name) {
                    await createFolderOnVPS(context + name);
                    closeCustomModal();
                }
            };
        }

        async function deleteItem(p) {
            try {
                const res = await fetch("/api/delete-item", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ targetPath: p })
                });
                if (res.ok) {
                    if(selectedFileId === p || selectedFileId === p + "/") selectedFileId = null;
                    buildNotesTree();
                    reloadGlobalGraph();
                }
            } catch (err) { console.error(err); }
        }

        async function renameItem(oldP, newP) {
            try {
                const res = await fetch("/api/rename-item", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ oldPath: oldP, newPath: newP })
                });
                if (res.ok) {
                    if(selectedFileId === oldP || selectedFileId === oldP + "/") selectedFileId = newP;
                    buildNotesTree();
                    reloadGlobalGraph();
                }
            } catch (err) { console.error(err); }
        }

        function switchTab(type) {
            const tabDoc = document.getElementById("tab-doc");
            const tabRaw = document.getElementById("tab-raw");
            if (type === 'doc') {
                document.getElementById("view-doc").classList.remove("hidden");
                document.getElementById("view-raw").classList.add("hidden");
                tabDoc.className = "text-xs font-bold px-4 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg transition-all";
                tabRaw.className = "text-xs font-bold px-4 py-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all";
            } else {
                document.getElementById("view-doc").classList.add("hidden");
                document.getElementById("view-raw").classList.remove("hidden");
                tabRaw.className = "text-xs font-bold px-4 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg transition-all";
                tabDoc.className = "text-xs font-bold px-4 py-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all";
            }
        }

        function highlightSelectedRow(targetFilename) {
            document.querySelectorAll(".tree-row-container").forEach(row => {
                if (!targetFilename) {
                    row.className = "tree-row-container group flex items-center justify-between w-full rounded-xl p-0.5 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left text-slate-600 dark:text-slate-300";
                    return;
                }
                const rowPath = row.getAttribute("data-path").replace(/\/$/, "");
                const cleanTarget = targetFilename.replace(/\/$/, "");
                if (rowPath === cleanTarget) {
                    row.className = "tree-row-container group flex items-center justify-between w-full rounded-xl p-0.5 border transition-all text-left bg-blue-50/50 dark:bg-blue-950/30 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 shadow-xs";
                } else {
                    row.className = "tree-row-container group flex items-center justify-between w-full rounded-xl p-0.5 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left text-slate-600 dark:text-slate-300";
                }
            });
        }

        // Lógica de GAVETAS (Collapsible Folders) implementada no construtor
        async function buildNotesTree() {
            try {
                const res = await fetch("/api/notes");
                const data = await res.json();
                if (data.items) {
                    fileTree.innerHTML = "";
                    let items = data.items;
                    
                    // Ordena alfabeticamente garantindo hierarquia
                    items.sort((a, b) => a.path.localeCompare(b.path));

                    if (currentFilterType === "md") items = items.filter(i => i.type === "directory" || i.path.endsWith(".md"));
                    if (currentFilterType === "pdf") items = items.filter(i => i.type === "directory" || i.path.endsWith(".pdf"));

                    items.forEach(item => {
                        // Verifica se este item está dentro de uma gaveta fechada (collapsed)
                        let pathParts = item.path.split('/');
                        let isHidden = false;
                        let currentPathCheck = "";
                        for (let i = 0; i < pathParts.length - 1; i++) {
                            currentPathCheck += (i === 0 ? "" : "/") + pathParts[i];
                            if (collapsedFolders[currentPathCheck]) {
                                isHidden = true;
                                break;
                            }
                        }

                        if (isHidden) return; // Se a gaveta pai estiver fechada, não renderiza

                        const row = document.createElement("div");
                        row.setAttribute("data-path", item.path);

                        const btn = document.createElement("button");
                        const isDir = item.type === "directory";
                        const depth = (item.path.match(/\//g) || []).length - (isDir ? 1 : 0);
                        
                        btn.className = "flex-1 text-left py-1.5 flex items-center gap-1.5 font-bold truncate text-xs focus:outline-none";
                        btn.style.paddingLeft = `${depth * 14 + 4}px`;
                        
                        const icon = isDir ? "folder" : (item.path.endsWith('.pdf') ? "file-text" : "file");
                        const iconColor = isDir ? "text-amber-500" : (item.path.endsWith('.pdf') ? "text-red-400" : "text-slate-400");
                        
                        const cleanPath = item.path.replace(/\/$/, "");
                        const hasStar = !!favoriteItems[cleanPath];
                        const starBadge = hasStar ? `<i data-lucide="star" class="w-3 h-3 text-amber-500 fill-amber-500 inline shrink-0 ml-1"></i>` : "";

                        // REQUISITO: Ícone da Gaveta
                        const isCollapsed = !!collapsedFolders[cleanPath];
                        const chevronIcon = isDir ? `<i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-down'}" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>` : `<div class="w-3.5 shrink-0"></div>`;

                        const displayName = isDir ? item.path.slice(0, -1).split('/').pop() : item.path.split('/').pop();

                        btn.innerHTML = `${chevronIcon}<i data-lucide="${icon}" class="w-3.5 h-3.5 ${iconColor} shrink-0"></i> <span class="truncate">${displayName}</span> ${starBadge}`;
                        
                        if (!isDir) {
                            btn.onclick = (e) => { e.stopPropagation(); loadNoteContent(item.path); };
                        } else {
                            btn.onclick = (e) => { 
                                e.stopPropagation(); 
                                // Alterna a Gaveta
                                collapsedFolders[cleanPath] = !collapsedFolders[cleanPath];
                                localStorage.setItem("bms_collapsed", JSON.stringify(collapsedFolders));

                                selectedFileId = item.path; 
                                activeNoteTitle.innerText = displayName;
                                activeNoteMeta.innerText = `Pasta ativa: BaseConhecimento/${item.path}`;
                                updateFavoriteStarUI();
                                highlightSelectedRow(selectedFileId);
                                buildNotesTree();
                            };
                        }

                        const menuBtn = document.createElement("button");
                        menuBtn.className = "opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-500 rounded transition-all focus:outline-none";
                        menuBtn.innerHTML = `<i data-lucide="more-horizontal" class="w-3.5 h-3.5"></i>`;
                        menuBtn.onclick = (e) => { triggerInlineContextMenu(e, item.path); };

                        row.appendChild(btn);
                        row.appendChild(menuBtn);
                        fileTree.appendChild(row);
                    });
                    lucide.createIcons();
                    if (selectedFileId) highlightSelectedRow(selectedFileId);
                }
            } catch (err) { console.error(err); }
        }

        function initPhysicsNodes(data) {
            const width = canvas.parentElement.clientWidth || 500; 
            const height = canvas.parentElement.clientHeight || 230;
            canvas.width = width;
            canvas.height = height;

            const existingNodesMap = new Map(graphData.nodes.map(n => [n.id, n]));
            graphData.nodes = data.nodes.map(n => {
                const old = existingNodesMap.get(n.id);
                return { 
                    id: n.id, label: n.label, 
                    x: old ? old.x : width / 2 + (Math.random() - 0.5) * 160, 
                    y: old ? old.y : height / 2 + (Math.random() - 0.5) * 160, 
                    vx: 0, vy: 0, radius: 5 
                };
            });
            graphData.edges = data.edges.map(e => ({ 
                sourceNode: graphData.nodes.find(n => n.id === e.source), 
                targetNode: graphData.nodes.find(n => n.id === e.target)
            })).filter(e => e.sourceNode && e.targetNode);
        }

        function updatePhysics() {
            const centerX = canvas.width / 2; 
            const centerY = canvas.height / 2;
            
            for (let i = 0; i < graphData.nodes.length; i++) {
                let n1 = graphData.nodes[i];
                for (let j = i + 1; j < graphData.nodes.length; j++) {
                    let n2 = graphData.nodes[j];
                    let dx = n2.x - n1.x; 
                    let dy = n2.y - n1.y; 
                    if (dx === 0) dx = 0.1;
                    let dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 180) {
                        let force = 340 / (dist * dist + 12);
                        if (n1 !== draggedNode) { n1.vx -= (dx/dist)*force; n1.vy -= (dy/dist)*force; }
                        if (n2 !== draggedNode) { n2.vx += (dx/dist)*force; n2.vy += (dy/dist)*force; }
                    }
                }
            }
            graphData.edges.forEach(edge => {
                let dx = edge.targetNode.x - edge.sourceNode.x; 
                let dy = edge.targetNode.y - edge.sourceNode.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 0) {
                    let force = 0.025 * dist;
                    let fx = (dx / dist) * force;
                    let fy = (dy / dist) * force;
                    if (edge.sourceNode !== draggedNode) { edge.sourceNode.vx += fx; edge.sourceNode.vy += fy; }
                    if (edge.targetNode !== draggedNode) { edge.targetNode.vx -= fx; edge.targetNode.vy -= fy; }
                }
            });
            graphData.nodes.forEach(node => {
                if (node === draggedNode) return;
                node.vx += (centerX - node.x) * 0.01; 
                node.vy += (centerY - node.y) * 0.01;
                node.x += node.vx; 
                node.y += node.vy; 
                node.vx *= 0.82; 
                node.vy *= 0.82;
            });
        }

        function drawGraph() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const isDark = document.documentElement.classList.contains("dark");
            
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = isDark ? "#334155" : "#e2e8f0";
            graphData.edges.forEach(edge => { 
                ctx.beginPath(); 
                ctx.moveTo(edge.sourceNode.x, edge.sourceNode.y); 
                ctx.lineTo(edge.targetNode.x, edge.targetNode.y); 
                ctx.stroke(); 
            });
            
            graphData.nodes.forEach(node => {
                const cleanNodeId = node.id.replace(/\/$/, "");
                const cleanSelectedId = selectedFileId ? selectedFileId.replace(/\/$/, "") : "";
                const act = (cleanSelectedId === cleanNodeId);
                
                ctx.beginPath(); 
                ctx.arc(node.x, node.y, act ? 6.5 : 4.5, 0, 2*Math.PI);
                ctx.fillStyle = act ? "#2563eb" : (isDark ? "#3b82f6" : "#64748b"); 
                ctx.fill();
                
                ctx.font = act ? "bold 10px sans-serif" : "10px sans-serif"; 
                ctx.fillStyle = isDark ? "#cbd5e1" : "#334155";
                ctx.textAlign = "center"; 
                ctx.fillText(node.label, node.x, node.y + 15);
            });
        }

        function anim() { 
            updatePhysics(); 
            drawGraph(); 
            requestAnimationFrame(anim); 
        }
        requestAnimationFrame(anim);

        canvas.addEventListener("mousedown", (e) => {
            const rect = canvas.getBoundingClientRect(); 
            const mx = e.clientX - rect.left; 
            const my = e.clientY - rect.top;
            for (let node of graphData.nodes) { 
                if (Math.sqrt((node.x - mx)**2 + (node.y - mouseY)**2) < 18) { draggedNode = node; break; } 
            }
        });
        canvas.addEventListener("mousemove", (e) => { 
            if (draggedNode) { 
                const rect = canvas.getBoundingClientRect(); 
                draggedNode.x = e.clientX - rect.left; 
                draggedNode.y = e.clientY - rect.top; 
            } 
        });
        window.addEventListener("mouseup", () => draggedNode = null);

        async function reloadGlobalGraph() { 
            try { 
                const res = await fetch("/api/graph-data"); 
                const data = await res.json(); 
                initPhysicsNodes(data); 
            } catch(e){} 
        }

        async function loadNoteContent(filename) {
            selectedFileId = filename;
            const shortName = filename.split('/').pop();
            activeNoteTitle.innerText = shortName.replace(/\.(md|pdf|txt)$/i, "");
            
            if (activeNoteMeta) activeNoteMeta.innerText = `Cofre: BaseConhecimento/${filename}`;
            
            viewDoc.innerHTML = `<div class="text-center text-slate-400 my-20 animate-pulse">Indexando bloco documental...</div>`;
            viewRaw.innerText = "Buscando texto bruto...";

            switchTab('doc');
            
            updateFavoriteStarUI();
            highlightSelectedRow(filename);

            if (filename.toLowerCase().endsWith('.pdf')) {
                viewDoc.innerHTML = `<iframe src="/api/note-raw?file=${encodeURIComponent(filename)}" class="w-full h-[380px] border-0 rounded-xl bg-white"></iframe>`;
                viewRaw.innerText = "[Visualização de arquivo PDF ativa]";
                rawContentBuffer = "[Arquivo Binário PDF]";
                document.getElementById("circle-progress").setAttribute("stroke-dasharray", "100, 100");
                document.getElementById("circle-text").innerText = "100%";
                document.getElementById("analysis-status-desc").innerText = "Pronto para análise visual.";
                return;
            }

            try {
                const res = await fetch(`/api/note-content?file=${encodeURIComponent(filename)}`);
                if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                const data = await res.json();
                
                if (data.error) throw new Error(data.error);
                
                const fileContent = (data && data.content !== undefined) ? data.content : "";
                rawContentBuffer = fileContent;
                viewRaw.innerText = fileContent || "[Arquivo de texto vazio]";
                
                viewDoc.innerHTML = `
                    <div class="border border-slate-200 dark:border-slate-700 rounded-lg p-5 bg-white dark:bg-slate-800 shadow-xs max-w-xl mx-auto font-serif leading-relaxed">
                        <div class="text-center border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
                            <h3 class="font-bold text-sm tracking-wide uppercase text-slate-800 dark:text-white">BMS SERVICE - PARECER JURÍDICO</h3>
                            <p class="text-[10px] text-slate-400 mt-0.5">Identificador de Volume: Cofre/${filename}</p>
                        </div>
                        <div class="space-y-3 text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">${fileContent || 'Este documento não possui registros textuais.'}</div>
                    </div>
                `;

                document.getElementById("meta-summary").innerText = "Peça arquivada mapeada de forma íntegra no cofre local corporativo.";
                document.getElementById("circle-progress").setAttribute("stroke-dasharray", "100, 100");
                document.getElementById("circle-text").innerText = "100%";
                document.getElementById("analysis-status-desc").innerText = "Análise documental ok.";
            } catch (err) {
                console.error(err);
                viewDoc.innerHTML = `<div class="text-center text-red-500 my-20 font-bold">Erro ao abrir visualização: ${err.message}</div>`;
                viewRaw.innerText = `Falha: ${err.message}`;
            }
        }

        btnVaultUpload.onclick = () => globalVaultUpload.click();
        globalVaultUpload.onchange = async (e) => {
            const file = e.target.files[0]; if (!file) return;
            let folder = "";
            if (selectedFileId && selectedFileId.endsWith("/")) folder = selectedFileId;
            else if (selectedFileId && selectedFileId.includes("/")) folder = selectedFileId.substring(0, selectedFileId.lastIndexOf("/")) + "/";

            const finalPath = folder + file.name;
            try {
                const res = await fetch(`/api/upload-vault?file=${encodeURIComponent(finalPath)}`, { method: "POST", body: file });
                if(res.ok) {
                    await buildNotesTree(); 
                    await reloadGlobalGraph();
                    loadNoteContent(finalPath);
                }
            } catch(err){}
        };

        btnChatAttach.onclick = () => chatContextUpload.click();
        chatContextUpload.onchange = (e) => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                pendingChatAttachment = { name: file.name, content: event.target.result };
                chatAttachmentName.innerText = file.name;
                chatAttachmentArea.classList.remove("hidden");
            };
            reader.readAsText(file);
        };

        btnRemoveAttachment.onclick = () => {
            pendingChatAttachment = null;
            chatAttachmentArea.classList.add("hidden");
            chatContextUpload.value = "";
        };

        async function sendChatMessage() {
            let query = chatInput.value.trim();
            if (!query) return;

            renderMessageBlock("user", query);
            chatInput.value = "";
            chatHistory.push({ role: "user", content: query });

            const tempId = renderMessageBlock("assistant", "Analisando conformidade e gerando parecer...");

            try {
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-app-password": appPassword.value },
                    body: JSON.stringify({ messages: chatHistory })
                });
                const data = await res.json();
                
                const loaderBlock = document.getElementById(tempId);
                if (loaderBlock) loaderBlock.remove();

                if (data.reply) {
                    renderMessageBlock("assistant", data.reply);
                    chatHistory.push({ role: "assistant", content: data.reply });
                }
            } catch (err) {
                const loaderBlock = document.getElementById(tempId);
                if (loaderBlock) loaderBlock.remove();
                renderMessageBlock("assistant", "❌ Falha crítica de conexão com o servidor local.");
            }
        }

        function renderMessageBlock(role, text) {
            const id = "msg-" + Date.now();
            const wrapper = document.createElement("div");
            wrapper.className = `w-full flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;
            wrapper.id = id;
            
            const bubble = document.createElement("div");
            if (role === "user") {
                bubble.className = "bg-blue-600 text-white rounded-2xl rounded-tr-none p-3 text-xs max-w-[85%] font-semibold leading-relaxed whitespace-pre-wrap shadow-xs select-text text-left";
            } else {
                bubble.className = "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl rounded-tl-none p-3 text-xs max-w-[85%] shadow-xs leading-relaxed whitespace-pre-wrap select-text text-left";
            }
            bubble.innerText = text;
            wrapper.appendChild(bubble);
            messagesContainer.appendChild(wrapper);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            return id;
        }

        btnSend.onclick = sendChatMessage;
        chatInput.onkeydown = (e) => { if (e.key === "Enter") sendChatMessage(); };

        buildNotesTree();
        reloadGlobalGraph();
    </script>
</body>
</html>
