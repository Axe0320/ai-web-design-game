import { DEFAULTS, SOFT_COLORS, SIZE_MAP, TITLE_SIZE_MAP, CARD_TITLE_SIZE_MAP, LINE_MAP, PADDING_MAP, IMG_WIDTH_MAP, IMG_HEIGHT_MAP, LABEL_MAP, SETTINGS_PASSWORD_HASH } from './config.js';
import { getContrastScore, initRadarChart, generateAIInsight } from './evaluator.js';

const DEFAULT_MODELS = ['gemma-4-26b-a4b-it', 'gemma-4-31b-it', 'gemini-3.1-flash-lite'];

const _COMMON_COMMENTS = [
    '千葉工業大学にはチバニーという公式キャラクターがいるよ！🐰',
    '認知情報科学科のチバニーの色はカーディナルレッド！かっこいい🎨',
    'チバニーはWikipediaに記事があるらしい…すごい！🐰',
    '千葉工業大学は1942年創立！現在は新習志野・津田沼にキャンパスがあるよ🏫',
    'スカイツリーキャンパスには某有名ロボットアニメの機体があるらしい...！🤖',
    '認知情報科学科は2024年設立！「認知科学」と「情報科学」の両方が学べるよ🎓',
    '認知情報科学科には公式ホームページもあるよ！ぜひ確認してみてね🌐',
    '良いデザインは気づかれない。悪いデザインはすぐ気づかれる...これが奥深いところ😏',
    '情報を詰め込みすぎたページは、開いた瞬間に閉じられます！シンプルが最強⚡',
    '実はこのゲーム、千葉工業大学の研究室の学生が開発しました！すごくない？👨‍💻',
];

const LOADING_COMMENTS = {
    visibility: [
        ..._COMMON_COMMENTS,
        '明るい背景には暗い文字、暗い背景には明るい文字！たったそれだけで視認性は大きく変わります✨',
        'このゲームの10色はすべてソフトカラー！組み合わせ次第で視認性が大きく変わるよ🎨',
        'あなたの配色を吟味中...！色のプロとして正直にジャッジするよ🔍',
        '色相・彩度・明度の3要素で配色を分析中...！プロの目線でしっかりチェックしてるよ👁️',
        'その文字色、薄暗い画面でも読めそう？コントラスト、大事！💡',
        '白と黒の文字、どっちが読みやすかった？背景色との相性が決め手だよ！✍️',
    ],
    layout: [
        ..._COMMON_COMMENTS,
        '余白はこのゲームで5段階設定できるよ！適切な余白はWebサイトへの「信頼感」にも影響するんだ✨',
        '余白をゼロにするとテキストが端に張り付いて、圧迫感が出てしまいます！注意⚠️',
        'レイアウトの均衡を確認中...！余白と要素の配置が整っているかチェック中📐',
        '画面の重心バランスを測定中...！左右・上下の視覚的な重さを比べてるよ⚖️',
        '左揃え・中央・右揃え、どれが一番スッキリ見えた？👀',
        '余白を広げると情報が少なく見えるけど、実は理解しやすくなるんだよ！試してみた？😊',
    ],
    cognitive: [
        ..._COMMON_COMMENTS,
        '行間は文字サイズの1.5〜2倍が読みやすいとされています！少しの差で大きく変わるよ📖',
        '画像サイズが崩れると無意識にストレスを感じるんです！縦横比もAIの評価に影響するよ🖼️',
        '脳への負担を計算中...！文字の大きさや密度が読者に優しいかチェックしてるよ🧠',
        '視線の流れを追跡中...！読み始めから読み終わりまでスムーズか確認してるよ👀',
        'フォントサイズ、小さすぎない？読者は疲れると読むのをやめてしまいます！😅',
        '行間が狭すぎると目が疲れてしまいます！ゆとりのある行間にしたかな？😌',
    ],
};

document.addEventListener('DOMContentLoaded', async () => {
    const state = {
        designParams: { ...DEFAULTS },
        radarChart: null,
        scores: { visibility: 0, layout: 0, cognitive: 0 }
    };

    // ページの読み込み
    async function loadPages() {
        const pages = ['title', 'how-to', 'game', 'evaluation', 'explanation', 'settings'];
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
        try {
            await loadPages();
            
            // ページ読み込み後、まずAPI状態を表示（ボタンを有効化）
            initAPIStatus();

            // その他の初期化
            randomizeDesign();
            setupColorOptions();
            setupSliders();
            setupEventListeners();
            updatePreview();
            
            // 最初のページを表示
            navigateTo('page-title');
            updateKeyStatusBadge(); // 全初期化が終わった後に呼ぶ（initAPIStatus上書きを防ぐ）
            updateTestModeUI();
            console.log("App initialized successfully");
        } catch (error) {
            console.error("Initialization failed:", error);
            // 致命的なエラーでもAPIステータスだけは試みる
            initAPIStatus();
        }
    }

    function initAPIStatus() {
        const btnEval = document.getElementById('btn-evaluate');
        if (btnEval) {
            btnEval.disabled = false;
            btnEval.textContent = 'AI診断を開始！';
        }
        // テストモード中はモデルバッジをテスト表示に固定
        if (localStorage.getItem('testMode') === 'on') {
            updateModelStatusBadge('test');
        } else {
            const lastName = localStorage.getItem('lastModelName');
            updateModelStatusBadge('pending', lastName || null);
        }
    }

    function updateModelStatusBadge(status, modelName) {
        const container = document.getElementById('model-status-container');
        const icon = document.getElementById('status-icon');
        const text = document.getElementById('model-status');
        if (!container || !icon || !text) return;

        container.classList.remove('ready', 'status-badge--ok', 'status-badge--limited', 'status-badge--error', 'status-badge--test');

        if (status === 'test') {
            icon.textContent = '🔧';
            text.textContent = 'テストモード中';
            container.classList.add('status-badge--test');
        } else if (status === 'ok') {
            icon.textContent = '⚡';
            text.textContent = `${modelName} — 接続OK`;
            container.classList.add('status-badge--ok');
            localStorage.setItem('lastModelName', modelName);
        } else if (status === 'limited') {
            icon.textContent = '⚠';
            text.textContent = `${modelName || '全モデル'} — 制限中`;
            container.classList.add('status-badge--limited');
            if (modelName) localStorage.setItem('lastModelName', modelName);
        } else if (status === 'error') {
            icon.textContent = '❌';
            text.textContent = '接続エラー';
            container.classList.add('status-badge--error');
        } else {
            // pending: 前回のモデル名があれば参考表示
            icon.textContent = '⏳';
            text.textContent = modelName ? `前回: ${modelName}` : '未確認';
        }
    }

    function toggleTestMode() {
        const isOn = localStorage.getItem('testMode') === 'on';
        localStorage.setItem('testMode', isOn ? 'off' : 'on');
        updateTestModeUI();
        updateModelStatusBadge(isOn ? 'pending' : 'test', localStorage.getItem('lastModelName') || null);
    }

    function updateTestModeUI() {
        const isOn = localStorage.getItem('testMode') === 'on';

        // 設定画面: トグルボタン
        const toggleBtn = document.getElementById('btn-toggle-test-mode');
        if (toggleBtn) {
            toggleBtn.textContent = isOn ? 'テストモード OFF にする' : 'テストモード ON にする';
            toggleBtn.className = isOn
                ? 'settings-action-btn settings-action-btn--test-on'
                : 'settings-action-btn';
        }

        // 設定画面: ステータスラベル
        const statusEl = document.getElementById('test-mode-status');
        if (statusEl) {
            statusEl.textContent = isOn ? '🔧 テストモード中 — APIは呼び出されません' : '';
            statusEl.className = isOn ? 'test-mode-status-label active' : 'test-mode-status-label';
        }

        // 全画面共通バナー
        const banner = document.getElementById('test-mode-banner');
        if (banner) banner.style.display = isOn ? 'block' : 'none';

        // タイトル: スタートボタン
        const btnStart = document.getElementById('btn-start');
        if (btnStart) {
            btnStart.textContent = isOn ? '🔧 テスト診断を開始' : 'スタート！';
            btnStart.classList.toggle('btn-test-mode', isOn);
        }

        // ゲーム画面: 診断ボタン
        const btnEval = document.getElementById('btn-evaluate');
        if (btnEval && btnEval.textContent !== 'AI診断中...') {
            btnEval.textContent = isOn ? '🔧 テスト診断を開始！' : 'AI診断を開始！';
            btnEval.classList.toggle('btn-test-mode', isOn);
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
        setClick('btn-back-from-settings', () => navigateTo('page-title'));

        // 設定画面ボタン
        setClick('btn-open-settings', showPasswordModal);
        setClick('btn-modal-cancel', hidePasswordModal);
        setClick('btn-modal-confirm', handlePasswordConfirm);
        const pwInput = document.getElementById('password-input');
        if (pwInput) pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') handlePasswordConfirm(); });

        // デバッグ操作ボタン
        setClick('btn-test-api', testApiConnection);
        setClick('btn-clear-storage', clearLocalStorage);
        setClick('btn-toggle-test-mode', toggleTestMode);

        // カスタムキー保存
        setClick('btn-save-custom-key', saveCustomKey);
        const ckInput = document.getElementById('custom-key-input');
        if (ckInput) ckInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveCustomKey(); });
        
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

        const totalEl = document.getElementById('span-total-score');
        if (totalEl) totalEl.textContent = '--';

        const btnExp = document.getElementById('btn-go-explanation');
        btnExp.disabled = true;
        btnExp.textContent = "AI分析が完了するまでお待ちください...";

        state.scores = { visibility: 0, layout: 0, cognitive: 0 };
        state.radarChart = initRadarChart(state.scores, state.radarChart);

        const rankColors = { 'S': '#eab308', 'A': '#ef4444', 'B': '#3b82f6', 'C': '#10b981', 'D': '#94a3b8', 'TEST': '#7e22ce' };
        const categories = ['visibility', 'layout', 'cognitive'];

        const keyParams = getKeyParams();
        const modelStatus = { model: null, rateLimited: false, hasError: false };
        const commentIntervals = {};

        const evaluationPromises = categories.map(async (id, index) => {
            await new Promise(r => setTimeout(r, index * 400));
            const card = document.getElementById(`ai-${id}`);
            const rankEl = card.querySelector('.rank');
            rankEl.textContent = "...";
            rankEl.style.color = '#94a3b8';
            card.querySelector('.comment').innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; color: #64748b; font-weight: 700;">
                    <div class="loading-spinner-small"></div> AIが多角的に分析中...
                </div>
                <p class="loading-comment" style="opacity:1; transition:opacity 0.5s ease; font-size:0.82rem; color:#94a3b8; font-weight:600; line-height:1.6; margin:0.75rem 0 0; min-height:2.5em; text-align:center;"></p>`;

            const comments = LOADING_COMMENTS[id] || LOADING_COMMENTS.visibility;
            const commentEl = card.querySelector('.loading-comment');
            let lastComment = '';
            const pickComment = () => {
                if (comments.length <= 1) return comments[0] || '';
                let c;
                do { c = comments[Math.floor(Math.random() * comments.length)]; } while (c === lastComment);
                lastComment = c;
                return c;
            };
            commentEl.textContent = pickComment();
            commentIntervals[id] = setInterval(() => {
                commentEl.style.opacity = '0';
                setTimeout(() => {
                    commentEl.textContent = pickComment();
                    commentEl.style.opacity = '1';
                }, 500);
            }, 6000);

            try {
                const result = await generateAIInsight(null, id, 0, state.designParams, keyParams);
                clearInterval(commentIntervals[id]);
                if (result.rate_limited) modelStatus.rateLimited = true;
                if (result.model) modelStatus.model = result.model;
                if (result.grade === 'Error') modelStatus.hasError = true;

                const scoreValue = parseInt(result.score) || 0;
                const gradeValue = result.grade || 'C';
                const modelName = result.model || 'AI';

                state.scores[id] = scoreValue;
                state.radarChart = initRadarChart(state.scores, state.radarChart);
                rankEl.textContent = gradeValue;
                rankEl.style.color = rankColors[gradeValue] || '#94a3b8';

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
                clearInterval(commentIntervals[id]);
                modelStatus.hasError = true;
                card.querySelector('.comment').textContent = "通信エラーが発生しました。";
            }
        });

        await Promise.all(evaluationPromises);

        if (modelStatus.rateLimited) {
            updateModelStatusBadge('limited', modelStatus.model);
        } else if (modelStatus.model && !modelStatus.hasError) {
            updateModelStatusBadge('ok', modelStatus.model);
        } else if (modelStatus.hasError) {
            updateModelStatusBadge('error', null);
        }

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

        // サイドバーのタイトル戻りボタン（setClickはsetupEventListeners内スコープのため直接登録）
        const sideBackBtn = document.getElementById('btn-back-to-title-side');
        if (sideBackBtn) sideBackBtn.onclick = () => navigateTo('page-title');
    }

    // --- パスワード認証 ---

    async function hashString(str) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function showPasswordModal() {
        const modal = document.getElementById('password-modal');
        if (!modal) return;
        document.getElementById('password-input').value = '';
        document.getElementById('password-error').textContent = '';
        modal.classList.add('active');
        setTimeout(() => document.getElementById('password-input').focus(), 50);
    }

    function hidePasswordModal() {
        const modal = document.getElementById('password-modal');
        if (modal) modal.classList.remove('active');
    }

    async function handlePasswordConfirm() {
        const input = document.getElementById('password-input').value;
        const hash = await hashString(input);
        if (hash === SETTINGS_PASSWORD_HASH) {
            hidePasswordModal();
            navigateTo('page-settings');
            initSettingsPage();
        } else {
            document.getElementById('password-error').textContent = 'パスワードが違います';
            document.getElementById('password-input').value = '';
            document.getElementById('password-input').focus();
        }
    }

    // --- 設定ページ ---

    async function initSettingsPage() {
        const log = document.getElementById('settings-debug-log');
        if (log) log.textContent = '';
        const statusEl = document.getElementById('settings-api-status');
        if (statusEl) statusEl.textContent = '未確認';
        await loadEnvKeys();
        loadCustomKeyStatus();
        updateCurrentKeyDisplay();
        updateTestModeUI();
        renderModelOrderUI();
    }

    // --- APIキー管理 ---

    function loadModelOrder() {
        try {
            const saved = localStorage.getItem('modelOrder');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch {}
        return [...DEFAULT_MODELS];
    }

    function saveModelOrder(order) {
        localStorage.setItem('modelOrder', JSON.stringify(order));
    }

    function renderModelOrderUI() {
        const container = document.getElementById('model-order-container');
        if (!container) return;
        const models = loadModelOrder();
        const isDefault = JSON.stringify(models) === JSON.stringify(DEFAULT_MODELS);

        let html = `<table class="model-order-table">
            <thead><tr><th>優先</th><th>モデル名</th><th></th></tr></thead>
            <tbody>`;
        models.forEach((m, i) => {
            html += `<tr>
                <td>${i + 1}</td>
                <td>${m}</td>
                <td>
                    <button class="model-move-btn" data-index="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''}>↑</button>
                    <button class="model-move-btn" data-index="${i}" data-dir="1" ${i === models.length - 1 ? 'disabled' : ''}>↓</button>
                </td>
            </tr>`;
        });
        html += `</tbody></table>`;
        if (!isDefault) {
            html += `<button class="model-order-reset-btn" id="btn-reset-model-order">デフォルトに戻す</button>`;
        }
        container.innerHTML = html;

        container.querySelectorAll('.model-move-btn').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.index);
                const dir = parseInt(btn.dataset.dir);
                const order = loadModelOrder();
                const newIdx = idx + dir;
                if (newIdx < 0 || newIdx >= order.length) return;
                [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
                saveModelOrder(order);
                renderModelOrderUI();
            };
        });

        const resetBtn = document.getElementById('btn-reset-model-order');
        if (resetBtn) {
            resetBtn.onclick = () => {
                localStorage.removeItem('modelOrder');
                renderModelOrderUI();
            };
        }
    }

    function getKeyParams() {
        const params = {};
        const mode = localStorage.getItem('keyMode');
        if (mode === 'custom') {
            const key = localStorage.getItem('customKey');
            if (key) params.customKey = key;
        } else if (mode === 'env') {
            const idx = localStorage.getItem('keyIndex');
            if (idx) params.keyIndex = parseInt(idx);
        }
        params.modelOrder = loadModelOrder();
        return params;
    }

    function updateKeyStatusBadge() {
        const keyContainer = document.getElementById('key-status-container');
        if (!keyContainer) return;

        const mode = localStorage.getItem('keyMode');
        const idx  = localStorage.getItem('keyIndex');

        if (mode === 'env' && idx) {
            keyContainer.className = 'key-status-badge key-status-badge--ready';
            document.getElementById('key-status-icon').textContent = '🔑';
            document.getElementById('key-status-text').textContent = `APIキー ${idx} 選択中`;
        } else if (mode === 'custom') {
            keyContainer.className = 'key-status-badge key-status-badge--custom';
            document.getElementById('key-status-icon').textContent = '🔑';
            document.getElementById('key-status-text').textContent = 'カスタムキー 使用中';
        } else {
            keyContainer.className = 'key-status-badge key-status-badge--danger';
            document.getElementById('key-status-icon').textContent = '⚠';
            document.getElementById('key-status-text').textContent = 'APIキー未設定 — 設定画面で選択してください';
        }
    }

    async function loadEnvKeys() {
        const container = document.getElementById('env-key-list');
        if (!container) return;
        container.innerHTML = '<span class="key-loading">読み込み中...</span>';
        try {
            const res  = await fetch('/api/keys');
            const data = await res.json();
            if (!data.keys || data.keys.length === 0) {
                container.innerHTML = '<span class="key-loading">環境変数にキーが設定されていません</span>';
                return;
            }
            const savedMode = localStorage.getItem('keyMode');
            const savedIdx  = parseInt(localStorage.getItem('keyIndex'));
            container.innerHTML = '';
            data.keys.forEach(k => {
                const btn = document.createElement('button');
                btn.className = 'key-btn' + (savedMode === 'env' && savedIdx === k.index ? ' active' : '');
                btn.textContent = k.label;
                btn.onclick = () => selectEnvKey(k.index, k.label);
                container.appendChild(btn);
            });
        } catch {
            container.innerHTML = '<span class="key-loading key-loading--error">読み込みエラー</span>';
        }
    }

    function selectEnvKey(index, label) {
        localStorage.setItem('keyMode', 'env');
        localStorage.setItem('keyIndex', index);
        localStorage.removeItem('customKey');
        document.querySelectorAll('#env-key-list .key-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === label);
        });
        const cs = document.getElementById('custom-key-saved-status');
        if (cs) { cs.textContent = ''; cs.className = 'key-saved-status'; }
        updateCurrentKeyDisplay();
        updateKeyStatusBadge();
    }

    function loadCustomKeyStatus() {
        const mode = localStorage.getItem('keyMode');
        const key  = localStorage.getItem('customKey');
        const el   = document.getElementById('custom-key-saved-status');
        if (!el) return;
        if (mode === 'custom' && key) {
            el.textContent = `保存済み: ${'•'.repeat(Math.max(0, key.length - 4))}${key.slice(-4)}`;
            el.className = 'key-saved-status key-saved-status--ok';
        } else {
            el.textContent = '';
            el.className = 'key-saved-status';
        }
    }

    function saveCustomKey() {
        const input = document.getElementById('custom-key-input');
        if (!input || !input.value.trim()) return;
        const key = input.value.trim();
        localStorage.setItem('keyMode', 'custom');
        localStorage.setItem('customKey', key);
        localStorage.removeItem('keyIndex');
        document.querySelectorAll('#env-key-list .key-btn').forEach(b => b.classList.remove('active'));
        const el = document.getElementById('custom-key-saved-status');
        if (el) {
            el.textContent = `保存済み: ${'•'.repeat(Math.max(0, key.length - 4))}${key.slice(-4)}`;
            el.className = 'key-saved-status key-saved-status--ok';
        }
        input.value = '';
        updateCurrentKeyDisplay();
        updateKeyStatusBadge();
    }

    function updateCurrentKeyDisplay() {
        const el = document.getElementById('current-key-label');
        if (!el) return;
        const mode = localStorage.getItem('keyMode');
        const idx  = localStorage.getItem('keyIndex');
        if (mode === 'env' && idx) {
            el.textContent = `APIキー ${idx}（環境変数）`;
            el.className = 'current-key-value current-key-value--ok';
        } else if (mode === 'custom') {
            el.textContent = 'カスタムキー（直接入力）';
            el.className = 'current-key-value current-key-value--custom';
        } else {
            el.textContent = '未設定（デフォルト使用中）';
            el.className = 'current-key-value current-key-value--warn';
        }
    }

    function appendLog(msg, type = 'info') {
        const log = document.getElementById('settings-debug-log');
        if (!log) return;
        const span = document.createElement('span');
        span.className = `log-${type}`;
        span.textContent = `[${new Date().toLocaleTimeString('ja-JP')}] ${msg}\n`;
        log.appendChild(span);
        log.scrollTop = log.scrollHeight;
    }

    async function testApiConnection() {
        appendLog('API接続テストを送信中...', 'info');
        const statusEl = document.getElementById('settings-api-status');
        const btn = document.getElementById('btn-test-api');
        if (btn) { btn.disabled = true; btn.textContent = 'テスト中...'; }
        try {
            const res = await fetch('/api/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(getKeyParams())
            });
            const data = await res.json();
            if (data.ok) {
                appendLog(`接続成功 [${data.model}]`, 'ok');
                appendLog(`返答: ${data.message}`, 'info');
                if (statusEl) statusEl.textContent = `接続成功 (${data.model})`;
                updateModelStatusBadge('ok', data.model);
            } else {
                const isRateLimited = data.rate_limited;
                appendLog(`接続失敗 — ${data.message}`, 'err');
                if (data.error_code) {
                    appendLog(`エラーコード: ${data.error_code} ${data.error_kind}`, 'err');
                    appendLog(`原因: ${data.error_cause}`, 'info');
                }
                if (data.model_errors && data.model_errors.length > 0) {
                    data.model_errors.forEach(me => {
                        appendLog(`  ${me.model}: ${me.code} ${me.kind}`, 'info');
                    });
                }
                if (statusEl) statusEl.textContent = data.error_code ? `失敗 (${data.error_code})` : '接続失敗';
                updateModelStatusBadge(isRateLimited ? 'limited' : 'error', null);
            }
        } catch (e) {
            appendLog(`通信エラー — ${e.message}`, 'err');
            if (statusEl) statusEl.textContent = '通信エラー';
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'API接続テスト'; }
        }
    }

    function clearLocalStorage() {
        localStorage.clear();
        appendLog('localStorage をクリアしました', 'ok');
        updateKeyStatusBadge();
        updateModelStatusBadge('pending');
        updateTestModeUI();
    }

    // -------------------------

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
