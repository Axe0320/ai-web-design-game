import { DEFAULTS, SOFT_COLORS, SIZE_MAP, TITLE_SIZE_MAP, CARD_TITLE_SIZE_MAP, LINE_MAP, PADDING_MAP, IMG_WIDTH_MAP, IMG_HEIGHT_MAP, LABEL_MAP } from './config.js';
import { getContrastScore, initRadarChart, generateAIInsight } from './evaluator.js';

document.addEventListener('DOMContentLoaded', async () => {
    const state = {
        designParams: { ...DEFAULTS },
        radarChart: null,
        scores: { visibility: 0, layout: 0, cognitive: 0 }
    };

    // ページの読み込み
    async function loadPages() {
        const pages = ['title', 'how-to', 'game', 'evaluation', 'explanation'];
        const container = document.getElementById('page-container');
        
        let combinedHtml = '';
        for (const page of pages) {
            const response = await fetch(`static/pages/${page}.html?v=${Date.now()}`);
            if (response.ok) {
                combinedHtml += await response.text();
            }
        }
        container.innerHTML = combinedHtml;
    }

    async function initApp() {
        await loadPages();
        
        // ランダム設定で初期化
        randomizeDesign();
        
        // UI初期化
        initAPIStatus();
        setupColorOptions();
        setupSliders();
        setupEventListeners();
        
        // 初期プレビューのスタイルを適用
        updatePreview();
        
        // 最初のページを表示
        navigateTo('page-title');
    }

    function initAPIStatus() {
        const btnEval = document.getElementById('btn-evaluate');
        if (btnEval) {
            btnEval.disabled = false;
            btnEval.textContent = 'AI診断を開始！';
        }
        const badge = document.getElementById('model-status-container');
        if (badge) {
            badge.classList.remove('loading');
            badge.classList.add('ready');
            document.getElementById('status-icon').textContent = '⚡';
            document.getElementById('model-status').textContent = 'Gemma / Multi-Model 接続準備完了';
        }
    }

    function setupColorOptions() {
        const groups = [
            { id: 'options-bg', param: 'bgColor' },
            { id: 'options-text', param: 'textColor' },
            { id: 'options-title-color', param: 'titleColor' },
            { id: 'options-card-color', param: 'cardColor' },
            { id: 'options-card-title-color', param: 'cardTitleColor' },
            { id: 'options-card-text-color', param: 'cardTextColor' }
        ];

        groups.forEach(group => {
            const container = document.getElementById(group.id);
            if (!container) return;
            container.innerHTML = '';
            SOFT_COLORS.forEach(c => {
                const btn = document.createElement('button');
                btn.className = 'color-btn';
                btn.style.background = c.value;
                btn.dataset.value = c.value;
                if (state.designParams[group.param] === c.value) btn.classList.add('active');
                
                btn.onclick = () => {
                    container.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    state.designParams[group.param] = c.value;
                    updatePreview();
                };
                container.appendChild(btn);
            });
        });
    }

    function setupSliders() {
        const sliderDefs = [
            { id: 'range-title-size', param: 'titleSize', map: TITLE_SIZE_MAP, label: 'val-titleSize' },
            { id: 'range-font-size', param: 'fontSize', map: SIZE_MAP, label: 'val-fontSize' },
            { id: 'range-line-height', param: 'lineHeight', map: LINE_MAP, label: 'val-lineHeight' },
            { id: 'range-padding', param: 'padding', map: PADDING_MAP, label: 'val-padding' },
            { id: 'range-img-width', param: 'imgWidth', map: IMG_WIDTH_MAP, label: 'val-imgWidth' },
            { id: 'range-img-height', param: 'imgHeight', map: IMG_HEIGHT_MAP, label: 'val-imgHeight' },
            { id: 'range-card-title-size', param: 'cardTitleSize', map: CARD_TITLE_SIZE_MAP, label: 'val-cardTitleSize' },
            { id: 'range-card-text-size', param: 'cardFontSize', map: SIZE_MAP, label: 'val-cardFontSize' }
        ];

        sliderDefs.forEach(s => {
            const el = document.getElementById(s.id);
            if (el) {
                const initialVal = Object.keys(s.map).find(k => s.map[k] === state.designParams[s.param]) || 3;
                el.value = initialVal;
                const labelEl = document.getElementById(s.label);
                if (labelEl) labelEl.textContent = LABEL_MAP[initialVal] || s.map[initialVal];

                el.oninput = (e) => {
                    state.designParams[s.param] = s.map[e.target.value];
                    const labelEl = document.getElementById(s.label);
                    if (labelEl) labelEl.textContent = LABEL_MAP[e.target.value] || s.map[e.target.value];
                    updatePreview();
                };
            }
        });
    }

    function setupEventListeners() {
        // レイアウトボタン
        document.querySelectorAll('.layout-btn').forEach(btn => {
            if (btn.dataset.value === state.designParams.layout) btn.classList.add('active');
            else btn.classList.remove('active');

            btn.onclick = () => {
                document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.designParams.layout = btn.dataset.value;
                updatePreview();
            };
        });

        // ナビゲーションボタンの安全な登録
        const setClick = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.onclick = fn;
        };

        setClick('btn-start', () => { resetDesign(); navigateTo('page-how-to'); });
        setClick('btn-go-game', () => navigateTo('page-game'));
        setClick('btn-back-to-title', () => navigateTo('page-title'));
        setClick('btn-back-to-title-side', () => navigateTo('page-title'));
        setClick('btn-back-to-title-from-eval', () => navigateTo('page-title'));
        setClick('btn-back-to-eval', () => navigateTo('page-evaluation'));
        setClick('btn-go-explanation', () => { navigateTo('page-explanation'); updateExp('design'); });
        
        // 評価ボタン
        const btnEval = document.getElementById('btn-evaluate');
        if (btnEval) btnEval.addEventListener('click', startEvaluation);

        // 解説ページ用ナビゲーション
        setupExpNav();
    }

    async function startEvaluation() {
        // プレビューの内容を評価画面のミニプレビューにコピー
        syncPreviewToEvaluation();
        
        navigateTo('page-evaluation');
        
        const btnExp = document.getElementById('btn-go-explanation');
        btnExp.disabled = true;
        btnExp.textContent = "AI分析が完了するまでお待ちください...";

        state.scores = { visibility: 0, layout: 0, cognitive: 0 };
        state.radarChart = initRadarChart(state.scores, state.radarChart);

        const rankColors = { 'S': '#eab308', 'A': '#ef4444', 'B': '#3b82f6', 'C': '#10b981', 'D': '#94a3b8' };
        const categories = ['visibility', 'layout', 'cognitive'];

        const evaluationPromises = categories.map(async (id) => {
            const card = document.getElementById(`ai-${id}`);
            card.querySelector('.rank').textContent = "...";
            card.querySelector('.comment').innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; color: #64748b; font-weight: 700;">
                    <div class="loading-spinner-small"></div> AIが多角的に分析中...
                </div>`;
            
            try {
                const result = await generateAIInsight(null, id, 0, state.designParams);
                
                const scoreValue = parseInt(result.score) || 0;
                const gradeValue = result.grade || 'C';
                const modelName = result.model || 'AI';

                state.scores[id] = scoreValue;
                state.radarChart = initRadarChart(state.scores, state.radarChart);
                card.querySelector('.rank').textContent = gradeValue;
                card.querySelector('.rank').style.color = rankColors[gradeValue] || '#94a3b8';

                const reasonsHtml = (result.reasons || []).map(r => `
                    <li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                        <span style="color: #8b5cf6;">●</span>
                        <span style="color: #475569; font-weight: 500;">${r}</span>
                    </li>
                `).join('');

                card.querySelector('.comment').innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        <div>
                            <span class="eval-section-title bg-reasons">AIの評価ポイント</span>
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                ${reasonsHtml}
                            </ul>
                        </div>
                        <div style="background: #f0fdf4; padding: 1rem; border-radius: 12px; border-left: 4px solid #10b981;">
                            <span class="eval-section-title bg-advice">プロの改善アドバイス</span>
                            <p style="margin: 0.5rem 0 0 0; color: #166534; font-weight: 700; line-height: 1.6;">
                                ${result.advice || 'さらにブラッシュアップする余地があります。'}
                            </p>
                        </div>
                        <div style="font-size: 0.7rem; color: #94a3b8; text-align: right;">Analyzed by ${modelName}</div>
                    </div>
                `;
            } catch (err) {
                card.querySelector('.comment').textContent = "通信エラーが発生しました。";
            }
        });

        await Promise.all(evaluationPromises);
        
        btnExp.disabled = false;
        btnExp.textContent = "用語・技術の解説";

        const finalTotal = Math.round((state.scores.visibility + state.scores.layout + state.scores.cognitive) / 3);
        document.getElementById('span-total-score').textContent = finalTotal;
    }

    function randomizeDesign() {
        const rand = (map) => {
            const keys = Object.keys(map);
            return map[keys[Math.floor(Math.random() * keys.length)]];
        };
        const randColor = () => SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)].value;

        state.designParams = {
            bgColor: randColor(),
            textColor: randColor(),
            titleColor: randColor(),
            cardColor: randColor(),
            cardTitleColor: randColor(),
            cardTextColor: randColor(),
            titleSize: rand(TITLE_SIZE_MAP),
            fontSize: rand(SIZE_MAP),
            lineHeight: rand(LINE_MAP),
            imgWidth: rand(IMG_WIDTH_MAP),
            imgHeight: rand(IMG_HEIGHT_MAP),
            cardTitleSize: rand(CARD_TITLE_SIZE_MAP),
            cardFontSize: rand(SIZE_MAP),
            layout: ['left', 'center', 'right'][Math.floor(Math.random() * 3)],
            padding: rand(PADDING_MAP)
        };
    }

    function resetDesign() {
        randomizeDesign();
        setupColorOptions();
        setupSliders();
        
        // レイアウトボタンの状態更新
        document.querySelectorAll('.layout-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === state.designParams.layout);
        });

        updatePreview();
    }

    function updatePreview() {
        const p = state.designParams;

        const previewEl = document.getElementById('web-preview');
        if (!previewEl) return;
        
        applyDesignToElement(previewEl, p);
    }

    function applyDesignToElement(el, p) {
        el.style.backgroundColor = p.bgColor;
        el.style.padding = p.padding;
        el.style.textAlign = p.layout;

        const titleEl = el.querySelector('#preview-title') || el.querySelector('h2');
        if (titleEl) {
            titleEl.style.color = p.titleColor;
            titleEl.style.fontSize = p.titleSize;
        }

        const textEl = el.querySelector('#preview-text') || el.querySelector('p');
        if (textEl) {
            textEl.style.color = p.textColor;
            textEl.style.fontSize = p.fontSize;
            textEl.style.lineHeight = p.lineHeight;
        }

        const imgBox = el.querySelector('.preview-img-box');
        if (imgBox) {
            imgBox.style.width = p.imgWidth;
            imgBox.style.height = p.imgHeight;
            imgBox.style.marginLeft = 'auto';
            imgBox.style.marginRight = 'auto';
        }

        el.querySelectorAll('.preview-card').forEach(card => {
            card.style.background = p.cardColor;
            // カードの余白とレイアウトを全体設定に合わせる
            card.style.padding = p.padding; 
            card.style.textAlign = p.layout;

            const cardTitle = card.querySelector('.card-title');
            if (cardTitle) {
                cardTitle.style.color = p.cardTitleColor;
                cardTitle.style.fontSize = p.cardTitleSize;
            }
            const cardText = card.querySelector('.card-text');
            if (cardText) {
                cardText.style.color = p.cardTextColor;
                cardText.style.fontSize = p.cardFontSize;
            }
        });
    }

    function syncPreviewToEvaluation() {
        const source = document.getElementById('web-preview');
        const target = document.getElementById('eval-web-preview');
        if (!source || !target) return;

        // 内容をコピー
        target.innerHTML = source.innerHTML;
        // スタイルをコピー
        applyDesignToElement(target, state.designParams);
    }

    function updateExp(k) { 
        const target = document.getElementById(`sec-${k}`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // ボタンの状態更新
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.target === `sec-${k}`);
        });
    }

    // 解説ページのナビゲーションボタン用イベント登録
    function setupExpNav() {
        const container = document.getElementById('scroll-container');
        const sections = ['design', 'ai', 'prompt', 'hint'];
        const navBtns = document.querySelectorAll('.nav-btn');

        navBtns.forEach(btn => {
            btn.onclick = (e) => {
                const targetId = e.currentTarget.dataset.target.replace('sec-', '');
                updateExp(targetId);
            };
        });

        // スクロールに合わせた目次の更新
        if (container) {
            container.addEventListener('scroll', () => {
                let current = "";
                sections.forEach(id => {
                    const section = document.getElementById(`sec-${id}`);
                    if (section) {
                        const top = section.offsetTop - container.offsetTop;
                        if (container.scrollTop >= top - 100) {
                            current = id;
                        }
                    }
                });

                navBtns.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.target === `sec-${current}`);
                });
            });
        }

        // サイドバーのタイトル戻りボタン
        setClick('btn-back-to-title-side', () => navigateTo('page-title'));
    }

    function navigateTo(id) { 
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); 
        const target = document.getElementById(id);
        if (target) {
            target.classList.add('active'); 
            setTimeout(() => { target.scrollTop = 0; }, 50); 
        }
    }

    // アプリの起動
    initApp();
});
