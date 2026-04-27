import { DEFAULTS, SOFT_COLORS, SIZE_MAP, TITLE_SIZE_MAP, CARD_TITLE_SIZE_MAP, LINE_MAP, PADDING_MAP, IMG_SIZE_MAP, LABEL_MAP } from './config.js';
import { getContrastScore, initRadarChart, generateAIInsight } from './evaluator.js';

document.addEventListener('DOMContentLoaded', async () => {
    const state = {
        designParams: { ...DEFAULTS },
        radarChart: null,
        texts: {
            preview: {},
            explanation: {}
        },
        scores: { visibility: 0, layout: 0, cognitive: 0 }
    };

    async function initAPI() {
        document.getElementById('btn-evaluate').disabled = false;
        document.getElementById('btn-evaluate').textContent = 'AI診断を開始！';
        const badge = document.getElementById('model-status-container');
        badge.classList.remove('loading');
        badge.classList.add('ready');
        document.getElementById('status-icon').textContent = '⚡';
        document.getElementById('model-status').textContent = 'Gemma / Multi-Model 接続準備完了';
    }

    async function loadAllTexts() {
        const fetchTxt = async (path) => {
            const r = await fetch(`static/content/${path}.txt?v=${Date.now()}`);
            return r.ok ? await r.text() : "";
        };

        const paths = [
            'preview/title', 'preview/body', 
            'preview/feature01_title', 'preview/feature01_body',
            'preview/feature02_title', 'preview/feature02_body',
            'explanation/tech_title', 'explanation/tech_content',
            'explanation/design_title', 'explanation/design_content'
        ];

        for (const p of paths) {
            const [folder, key] = p.split('/');
            state.texts[folder][key] = (await fetchTxt(p)).trim();
        }
        updatePreview();
    }

    initAPI();
    loadAllTexts();
    setupColorOptions();

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

    function resetDesign() {
        state.designParams = { ...DEFAULTS };
        const sliders = [
            { id: 'range-title-size', val: 3 },
            { id: 'range-font-size', val: 3 },
            { id: 'range-line-height', val: 3 },
            { id: 'range-padding', val: 3 },
            { id: 'range-img-size', val: 3 },
            { id: 'range-card-title-size', val: 3 },
            { id: 'range-card-text-size', val: 3 }
        ];
        sliders.forEach(s => {
            const el = document.getElementById(s.id);
            if (el) el.value = s.val;
        });
        document.querySelectorAll('.val-label').forEach(el => el.textContent = '標準');
        document.querySelectorAll('.layout-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === 'center');
        });
        setupColorOptions();
        updatePreview();
    }

    function updatePreview() {
        const p = state.designParams;
        const t = state.texts.preview;
        if (!t.title) return;

        const previewEl = document.getElementById('web-preview');
        previewEl.style.backgroundColor = p.bgColor;
        previewEl.style.padding = p.padding;
        previewEl.style.textAlign = p.layout;

        const titleEl = document.getElementById('preview-title');
        titleEl.textContent = t.title;
        titleEl.style.color = p.titleColor;
        titleEl.style.fontSize = p.titleSize;

        const textEl = document.getElementById('preview-text');
        textEl.textContent = t.body;
        textEl.style.color = p.textColor;
        textEl.style.fontSize = p.fontSize;
        textEl.style.lineHeight = p.lineHeight;

        const container = document.getElementById('preview-blocks-container');
        container.innerHTML = '';
        
        const imgDiv = document.createElement('div');
        imgDiv.className = 'preview-img-box';
        imgDiv.textContent = "PRODUCT PHOTO";
        imgDiv.style.height = p.imgSize;
        container.appendChild(imgDiv);

        container.appendChild(createCard(t.feature01_title, t.feature01_body, p));
        container.appendChild(createCard(t.feature02_title, t.feature02_body, p));
    }

    function createCard(title, body, p) {
        const div = document.createElement('div');
        div.className = 'preview-card';
        div.style.background = p.cardColor;
        
        const cardTitle = document.createElement('div');
        cardTitle.textContent = title;
        cardTitle.style.color = p.cardTitleColor;
        cardTitle.style.fontSize = p.cardTitleSize;
        cardTitle.style.fontWeight = '900';
        cardTitle.style.marginBottom = '0.5rem';
        
        const cardText = document.createElement('div');
        cardText.textContent = body;
        cardText.style.color = p.cardTextColor;
        cardText.style.fontSize = p.cardFontSize;
        cardText.style.lineHeight = '1.5';
        
        div.appendChild(cardTitle);
        div.appendChild(cardText);
        return div;
    }

    const sliderDefs = [
        { id: 'range-title-size', param: 'titleSize', map: TITLE_SIZE_MAP, label: 'val-titleSize' },
        { id: 'range-font-size', param: 'fontSize', map: SIZE_MAP, label: 'val-fontSize' },
        { id: 'range-line-height', param: 'lineHeight', map: LINE_MAP, label: 'val-lineHeight' },
        { id: 'range-padding', param: 'padding', map: PADDING_MAP, label: 'val-padding' },
        { id: 'range-img-size', param: 'imgSize', map: IMG_SIZE_MAP, label: 'val-imgSize' },
        { id: 'range-card-title-size', param: 'cardTitleSize', map: CARD_TITLE_SIZE_MAP, label: 'val-cardTitleSize' },
        { id: 'range-card-text-size', param: 'cardFontSize', map: SIZE_MAP, label: 'val-cardFontSize' }
    ];

    sliderDefs.forEach(s => {
        const el = document.getElementById(s.id);
        if (el) {
            el.oninput = (e) => {
                state.designParams[s.param] = s.map[e.target.value];
                const labelEl = document.getElementById(s.label);
                if (labelEl) labelEl.textContent = LABEL_MAP[e.target.value];
                updatePreview();
            };
        }
    });

    document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.designParams.layout = btn.dataset.value;
            updatePreview();
        };
    });

    document.getElementById('btn-evaluate').addEventListener('click', async () => {
        navigateTo('page-evaluation');
        
        // 解析完了まで「解説を見る」ボタンを無効化
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
                        <!-- AIの評価ポイント -->
                        <div>
                            <span class="eval-section-title bg-reasons">AIの評価ポイント</span>
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                ${reasonsHtml}
                            </ul>
                        </div>
                        <!-- 改善のアドバイス -->
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
        
        // 全分析完了後にボタンを有効化
        btnExp.disabled = false;
        btnExp.textContent = "詳しく解説を見る";

        const finalTotal = Math.round((state.scores.visibility + state.scores.layout + state.scores.cognitive) / 3);
        document.getElementById('span-total-score').textContent = finalTotal;
    });

    document.getElementById('btn-start').onclick = () => { resetDesign(); navigateTo('page-how-to'); };
    document.getElementById('btn-go-game').onclick = () => navigateTo('page-game');
    document.getElementById('btn-back-to-title').onclick = () => navigateTo('page-title');
    document.getElementById('btn-go-explanation').onclick = () => { navigateTo('page-explanation'); updateExp('tech'); };
    document.querySelectorAll('.tab-btn').forEach(btn => { btn.onclick = (e) => { document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); e.currentTarget.classList.add('active'); updateExp(e.currentTarget.dataset.tab); }; });
    function updateExp(k) { const t = state.texts.explanation; const d = { title: t[`${k}_title`], content: t[`${k}_content`] }; document.getElementById('exp-title').textContent = d.title; document.getElementById('exp-text').textContent = d.content; }
    function navigateTo(id) { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); document.getElementById(id).classList.add('active'); setTimeout(() => { const pageEl = document.getElementById(id); if (pageEl) pageEl.scrollTop = 0; }, 50); }
});
